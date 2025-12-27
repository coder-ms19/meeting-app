import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { config } from "./config";

const socket: Socket = io(config.backendUrl);

interface VideoCallProps {
  roomId: string;
  userName: string;
}

interface Participant {
  id: string;
  name: string;
  stream: MediaStream | null;
}

type ViewMode = "grid" | "spotlight";

export default function VideoCall({ roomId, userName }: VideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const hasJoinedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showParticipants, setShowParticipants] = useState(false);
  const [meetingLink, setMeetingLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [pinnedParticipant, setPinnedParticipant] = useState<string | null>(null);
  const [showWelcomeTip, setShowWelcomeTip] = useState(true);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  const controlsTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setMeetingLink(`${window.location.origin}?room=${roomId}`);
    initializeMedia();
    setupSocketListeners();

    const timer = setTimeout(() => setShowWelcomeTip(false), 10000);

    return () => {
      cleanup();
      clearTimeout(timer);
    };
  }, []);

  // Improved auto-hide controls - show on ANY mouse movement in container
  useEffect(() => {
    const resetControlsTimer = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = window.setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", resetControlsTimer);
      container.addEventListener("touchstart", resetControlsTimer);
      container.addEventListener("click", resetControlsTimer);
    }

    // Initial show
    resetControlsTimer();

    return () => {
      if (container) {
        container.removeEventListener("mousemove", resetControlsTimer);
        container.removeEventListener("touchstart", resetControlsTimer);
        container.removeEventListener("click", resetControlsTimer);
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  function setupSocketListeners() {
    socket.on("user-joined", async (data: { userId: string; userName: string }) => {
      console.log(`${data.userName} joined`);

      setParticipants(prev => {
        const exists = prev.some(p => p.id === data.userId);
        if (exists) return prev;
        return [...prev, { id: data.userId, name: data.userName, stream: null }];
      });

      await createPeerConnection(data.userId, data.userName, true);
    });

    socket.on("offer", async (data: { from: string; offer: RTCSessionDescriptionInit; userName: string }) => {
      await handleOffer(data.from, data.offer, data.userName);
    });

    socket.on("answer", async (data: { from: string; answer: RTCSessionDescriptionInit }) => {
      await handleAnswer(data.from, data.answer);
    });

    socket.on("ice-candidate", async (data: { from: string; candidate: RTCIceCandidateInit }) => {
      await handleIceCandidate(data.from, data.candidate);
    });

    socket.on("user-left", (data: { userId: string; userName: string }) => {
      console.log(`${data.userName} left`);
      removePeer(data.userId);
      setParticipants(prev => prev.filter(p => p.id !== data.userId));

      if (pinnedParticipant === data.userId) {
        setPinnedParticipant(null);
        setViewMode("grid");
      }
    });

    socket.on("existing-users", async (users: Array<{ userId: string; userName: string }>) => {
      const uniqueUsers = users.filter((user, index, self) =>
        index === self.findIndex(u => u.userId === user.userId)
      );

      setParticipants(uniqueUsers.map(user => ({
        id: user.userId,
        name: user.userName,
        stream: null
      })));
    });
  }

  async function initializeMedia() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      if (!hasJoinedRef.current) {
        hasJoinedRef.current = true;
        socket.emit("join-room", { roomId, userName });
      }
    } catch (error) {
      console.error("Error accessing media:", error);
      alert("Could not access camera/microphone. Please check permissions.");
    }
  }

  async function createPeerConnection(userId: string, userName: string, isInitiator: boolean) {
    if (!localStreamRef.current || peersRef.current.has(userId)) return;

    const pc = new RTCPeerConnection({
      iceServers: config.iceServers,
    });

    peersRef.current.set(userId, pc);

    localStreamRef.current.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current!);
    });

    pc.ontrack = (event: RTCTrackEvent) => {
      setParticipants(prev =>
        prev.map(p => p.id === userId ? { ...p, stream: event.streams[0] } : p)
      );
    };

    pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          roomId,
          to: userId,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        removePeer(userId);
      }
    };

    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("offer", {
        roomId,
        to: userId,
        offer,
        userName,
      });
    }
  }

  async function handleOffer(from: string, offer: RTCSessionDescriptionInit, userName: string) {
    let pc = peersRef.current.get(from);

    if (!pc) {
      await createPeerConnection(from, userName, false);
      pc = peersRef.current.get(from);
    }

    if (!pc) return;

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit("answer", {
      roomId,
      to: from,
      answer,
    });
  }

  async function handleAnswer(from: string, answer: RTCSessionDescriptionInit) {
    const pc = peersRef.current.get(from);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  async function handleIceCandidate(from: string, candidate: RTCIceCandidateInit) {
    const pc = peersRef.current.get(from);
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  function removePeer(userId: string) {
    const pc = peersRef.current.get(userId);
    if (pc) {
      pc.close();
      peersRef.current.delete(userId);
    }
  }

  function toggleMic() {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
      setIsMicOn(track.enabled);
    });
  }

  function toggleCamera() {
    if (!localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
      setIsCamOn(track.enabled);
    });
  }

  async function toggleScreenShare() {
    if (!localStreamRef.current) return;

    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        } as DisplayMediaStreamOptions);

        const screenTrack = screenStream.getVideoTracks()[0];

        peersRef.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        });

        screenTrack.onended = () => {
          stopScreenShare();
        };

        setIsScreenSharing(true);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
      } else {
        await stopScreenShare();
      }
    } catch (error) {
      console.error("Error sharing screen:", error);
    }
  }

  async function stopScreenShare() {
    if (!localStreamRef.current) return;

    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      const cameraTrack = cameraStream.getVideoTracks()[0];

      peersRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          sender.replaceTrack(cameraTrack);
        }
      });

      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      localStreamRef.current = new MediaStream([audioTrack, cameraTrack]);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }

      setIsScreenSharing(false);
    } catch (error) {
      console.error("Error stopping screen share:", error);
    }
  }

  function cleanup() {
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());

    if (hasJoinedRef.current) {
      socket.emit("leave-room", roomId);
      hasJoinedRef.current = false;
    }

    socket.off("user-joined");
    socket.off("offer");
    socket.off("answer");
    socket.off("ice-candidate");
    socket.off("user-left");
    socket.off("existing-users");
  }

  function leaveCall() {
    cleanup();
    window.location.href = "/";
  }

  function copyMeetingLink() {
    navigator.clipboard.writeText(meetingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function togglePinParticipant(participantId: string) {
    if (pinnedParticipant === participantId) {
      setPinnedParticipant(null);
      setViewMode("grid");
    } else {
      setPinnedParticipant(participantId);
      setViewMode("spotlight");
    }
  }

  function toggleViewMode() {
    if (viewMode === "grid") {
      setViewMode("spotlight");
      if (!pinnedParticipant && participants.length > 0) {
        setPinnedParticipant(participants[0].id);
      }
    } else {
      setViewMode("grid");
      setPinnedParticipant(null);
    }
  }

  // Improved grid layout calculation
  const getGridLayout = () => {
    const total = participants.length + 1;
    if (total === 1) return { cols: 'grid-cols-1', rows: 'grid-rows-1', gap: 'gap-0' };
    if (total === 2) return { cols: 'grid-cols-2', rows: 'grid-rows-1', gap: 'gap-3' };
    if (total <= 4) return { cols: 'grid-cols-2', rows: 'grid-rows-2', gap: 'gap-3' };
    if (total <= 6) return { cols: 'grid-cols-3', rows: 'grid-rows-2', gap: 'gap-2' };
    if (total <= 9) return { cols: 'grid-cols-3', rows: 'grid-rows-3', gap: 'gap-2' };
    if (total <= 12) return { cols: 'grid-cols-4', rows: 'grid-rows-3', gap: 'gap-2' };
    return { cols: 'grid-cols-4', rows: 'grid-rows-4', gap: 'gap-1' };
  };

  const gridLayout = getGridLayout();

  return (
    <div ref={containerRef} className="relative min-h-screen bg-[#202124] text-white overflow-hidden cursor-default">
      {/* Welcome Tip */}
      {showWelcomeTip && participants.length === 0 && (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-50 max-w-md px-4">
          <div className="bg-gradient-to-r from-[#1a73e8] to-[#1557b0] rounded-2xl shadow-2xl p-6 animate-bounce-slow">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-2">👋 Welcome!</h3>
                <p className="text-sm text-white/90 mb-3">
                  Share the meeting link to invite others. They'll join automatically!
                </p>
                <button
                  onClick={copyMeetingLink}
                  className="w-full px-4 py-2 bg-white text-[#1a73e8] rounded-lg font-semibold hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Meeting Link
                </button>
              </div>
              <button
                onClick={() => setShowWelcomeTip(false)}
                className="flex-shrink-0 p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className={`absolute top-0 left-0 right-0 z-30 transition-all duration-300 ${showControls ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm px-4 py-4">
          <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <svg className="w-7 h-7 text-[#1a73e8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="font-bold text-lg hidden md:inline">{config.appName}</span>
              </div>
              <div className="h-6 w-px bg-white/20 hidden md:block"></div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/70 font-mono hidden md:block">{roomId}</span>
                {participants.length === 0 && (
                  <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full animate-pulse">
                    Waiting for others...
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={toggleViewMode}
                  onMouseEnter={() => setShowTooltip('view-mode')}
                  onMouseLeave={() => setShowTooltip(null)}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-all flex items-center gap-2 backdrop-blur-sm"
                >
                  {viewMode === "grid" ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                      </svg>
                      <span className="hidden lg:inline">Grid</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span className="hidden lg:inline">Spotlight</span>
                    </>
                  )}
                </button>
                {showTooltip === 'view-mode' && (
                  <Tooltip text={viewMode === "grid" ? "Switch to spotlight view" : "Switch to grid view"} />
                )}
              </div>

              <div className="relative">
                <button
                  onClick={copyMeetingLink}
                  onMouseEnter={() => setShowTooltip('copy-link')}
                  onMouseLeave={() => setShowTooltip(null)}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-all flex items-center gap-2 backdrop-blur-sm"
                >
                  {copied ? (
                    <>
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="hidden md:inline text-green-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span className="hidden md:inline">Share</span>
                    </>
                  )}
                </button>
                {showTooltip === 'copy-link' && !copied && (
                  <Tooltip text="Copy meeting link to invite others" />
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowParticipants(!showParticipants)}
                  onMouseEnter={() => setShowTooltip('participants')}
                  onMouseLeave={() => setShowTooltip(null)}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-all flex items-center gap-2 backdrop-blur-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span className="font-semibold">{participants.length + 1}</span>
                </button>
                {showTooltip === 'participants' && (
                  <Tooltip text="View all participants" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Participants Sidebar */}
      {showParticipants && (
        <div className="absolute top-0 right-0 bottom-0 w-80 bg-[#202124]/95 backdrop-blur-xl border-l border-white/10 z-40 overflow-hidden flex flex-col animate-slide-in-right shadow-2xl">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div>
              <h3 className="text-lg font-semibold">Participants</h3>
              <p className="text-xs text-white/60">{participants.length + 1} in call</p>
            </div>
            <button onClick={() => setShowParticipants(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
              <div className="w-10 h-10 bg-gradient-to-br from-[#1a73e8] to-[#1557b0] rounded-full flex items-center justify-center font-semibold text-lg">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{userName}</div>
                <div className="text-xs text-white/60 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  You (Host)
                </div>
              </div>
              {!isMicOn && (
                <div className="p-1 bg-red-500/20 rounded" title="Microphone off">
                  <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                </div>
              )}
            </div>

            {participants.map((participant) => (
              <div key={participant.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors group">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center font-semibold text-lg">
                  {participant.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{participant.name}</div>
                  <div className="text-xs text-white/60 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    {participant.stream ? "Connected" : "Connecting..."}
                  </div>
                </div>
                <button
                  onClick={() => togglePinParticipant(participant.id)}
                  className={`p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${pinnedParticipant === participant.id ? 'bg-[#1a73e8] text-white' : 'hover:bg-white/10'
                    }`}
                  title={pinnedParticipant === participant.id ? "Unpin" : "Pin to spotlight"}
                >
                  <svg className="w-4 h-4" fill={pinnedParticipant === participant.id ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </button>
              </div>
            ))}

            {participants.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <p className="text-sm text-white/60 mb-2">No one else here yet</p>
                <button
                  onClick={copyMeetingLink}
                  className="text-xs text-[#1a73e8] hover:underline"
                >
                  Share the meeting link
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Video Area - Improved Layouts */}
      <div className="h-screen p-6 pt-24 pb-28">
        {viewMode === "grid" ? (
          // Improved Grid View
          <div className={`h-full grid ${gridLayout.cols} ${gridLayout.rows} ${gridLayout.gap} auto-rows-fr`}>
            <VideoTile
              videoRef={localVideoRef}
              name={`${userName} (You)`}
              isMuted={!isMicOn}
              isCameraOff={!isCamOn}
              isLocal={true}
              isPinned={false}
              onPin={() => { }}
            />

            {participants.map((participant) => (
              <RemoteVideoTile
                key={participant.id}
                participant={participant}
                isPinned={pinnedParticipant === participant.id}
                onPin={() => togglePinParticipant(participant.id)}
              />
            ))}
          </div>
        ) : (
          // Improved Spotlight View
          <div className="h-full flex flex-col gap-3">
            <div className="flex-1 min-h-0">
              {pinnedParticipant ? (
                <RemoteVideoTile
                  participant={participants.find(p => p.id === pinnedParticipant)!}
                  isPinned={true}
                  onPin={() => togglePinParticipant(pinnedParticipant)}
                  isSpotlight={true}
                />
              ) : (
                <VideoTile
                  videoRef={localVideoRef}
                  name={`${userName} (You)`}
                  isMuted={!isMicOn}
                  isCameraOff={!isCamOn}
                  isLocal={true}
                  isPinned={false}
                  onPin={() => { }}
                  isSpotlight={true}
                />
              )}
            </div>

            {participants.length > 0 && (
              <div className="h-36 flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                {pinnedParticipant && (
                  <div className="flex-shrink-0 w-56">
                    <VideoTile
                      videoRef={localVideoRef}
                      name={`${userName} (You)`}
                      isMuted={!isMicOn}
                      isCameraOff={!isCamOn}
                      isLocal={true}
                      isPinned={false}
                      onPin={() => { }}
                    />
                  </div>
                )}

                {participants.filter(p => p.id !== pinnedParticipant).map((participant) => (
                  <div key={participant.id} className="flex-shrink-0 w-56">
                    <RemoteVideoTile
                      participant={participant}
                      isPinned={false}
                      onPin={() => togglePinParticipant(participant.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className={`absolute bottom-0 left-0 right-0 z-30 transition-all duration-300 ${showControls ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
        <div className="bg-gradient-to-t from-black/80 to-transparent backdrop-blur-sm px-4 py-5">
          <div className="flex items-center justify-center gap-4 max-w-screen-2xl mx-auto">
            <ControlButton
              onClick={toggleMic}
              active={isMicOn}
              label={isMicOn ? "Mute" : "Unmute"}
              icon={isMicOn ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              )}
            />

            <ControlButton
              onClick={toggleCamera}
              active={isCamOn}
              label={isCamOn ? "Stop video" : "Start video"}
              icon={isCamOn ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              )}
            />

            <ControlButton
              onClick={toggleScreenShare}
              active={isScreenSharing}
              label={isScreenSharing ? "Stop sharing" : "Present"}
              highlight={isScreenSharing}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
            />

            <ControlButton
              onClick={leaveCall}
              active={false}
              label="Leave"
              danger={true}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                </svg>
              }
            />
          </div>
        </div>
      </div>

      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0) translateX(-50%); }
          50% { transform: translateY(-10px) translateX(-50%); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
        .scrollbar-thin::-webkit-scrollbar {
          height: 6px;
        }
        .scrollbar-thumb-white\/20::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
        .scrollbar-track-transparent::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>
    </div>
  );
}

// Tooltip Component
function Tooltip({ text }: { text: string }) {
  return (
    <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap z-50 shadow-lg">
      {text}
      <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-black rotate-45"></div>
    </div>
  );
}

// Control Button Component
interface ControlButtonProps {
  onClick: () => void;
  active: boolean;
  label: string;
  icon: React.ReactNode;
  danger?: boolean;
  highlight?: boolean;
}

function ControlButton({ onClick, active, label, icon, danger, highlight }: ControlButtonProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={onClick}
        className={`p-4 rounded-full transition-all hover:scale-110 shadow-lg ${danger
            ? "bg-red-600 hover:bg-red-700"
            : highlight
              ? "bg-[#1a73e8] hover:bg-[#1557b0]"
              : active
                ? "bg-white/10 hover:bg-white/20"
                : "bg-red-600/90 hover:bg-red-700"
          }`}
        title={label}
      >
        {icon}
      </button>
      <span className="text-xs text-white/80 font-medium">{label}</span>
    </div>
  );
}

// Video Tile Component
interface VideoTileProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  name: string;
  isMuted?: boolean;
  isCameraOff?: boolean;
  isLocal?: boolean;
  isPinned?: boolean;
  onPin: () => void;
  isSpotlight?: boolean;
}

function VideoTile({ videoRef, name, isMuted, isCameraOff, isLocal, isPinned, onPin, isSpotlight }: VideoTileProps) {
  return (
    <div className={`relative bg-gradient-to-br from-[#2d2e30] to-[#1a1b1e] rounded-2xl overflow-hidden group shadow-xl ${isSpotlight ? 'h-full' : ''}`}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={`w-full h-full object-cover ${isLocal ? 'mirror' : ''}`}
      />
      {isCameraOff && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#2d2e30] to-[#1a1b1e]">
          <div className="text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-[#1a73e8] to-[#1557b0] rounded-full flex items-center justify-center mx-auto mb-3 text-4xl font-bold shadow-lg">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="text-sm text-white/60">Camera is off</div>
          </div>
        </div>
      )}
      <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg">
        {name}
        {isMuted && (
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        )}
      </div>
      {!isLocal && !isSpotlight && (
        <button
          onClick={onPin}
          className={`absolute top-4 right-4 p-2.5 rounded-xl transition-all opacity-0 group-hover:opacity-100 shadow-lg ${isPinned ? 'bg-[#1a73e8]' : 'bg-black/50 hover:bg-black/70'
            }`}
          title={isPinned ? "Unpin from spotlight" : "Pin to spotlight"}
        >
          <svg className="w-5 h-5" fill={isPinned ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
      )}
    </div>
  );
}

// Remote Video Tile Component
interface RemoteVideoTileProps {
  participant: Participant;
  isPinned: boolean;
  onPin: () => void;
  isSpotlight?: boolean;
}

function RemoteVideoTile({ participant, isPinned, onPin, isSpotlight }: RemoteVideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  return (
    <div className={`relative bg-gradient-to-br from-[#2d2e30] to-[#1a1b1e] rounded-2xl overflow-hidden group shadow-xl ${isSpotlight ? 'h-full' : ''}`}>
      {participant.stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-3 text-4xl font-bold animate-pulse shadow-lg">
              {participant.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-sm text-white/60">Connecting...</div>
          </div>
        </div>
      )}
      <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-medium shadow-lg">
        {participant.name}
      </div>
      {!isSpotlight && (
        <button
          onClick={onPin}
          className={`absolute top-4 right-4 p-2.5 rounded-xl transition-all opacity-0 group-hover:opacity-100 shadow-lg ${isPinned ? 'bg-[#1a73e8]' : 'bg-black/50 hover:bg-black/70'
            }`}
          title={isPinned ? "Unpin from spotlight" : "Pin to spotlight"}
        >
          <svg className="w-5 h-5" fill={isPinned ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
      )}
    </div>
  );
}
