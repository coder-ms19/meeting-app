import { useEffect, useState } from "react";
import { useMediaStream } from "./features/video-call/hooks/useMediaStream";
import { useWebRTC } from "./features/video-call/hooks/useWebRTC";
import { PreJoinScreen } from "./features/video-call/components/PreJoinScreen";
import { VideoTile } from "./features/video-call/components/VideoTile";
import { VideoGrid } from "./features/video-call/components/VideoGrid";
import { ControlsBar } from "./features/video-call/components/ControlsBar";
import { motion } from "framer-motion";
import { useIdle } from "react-use";
import { useToast } from "./components/ui/Toast";

interface VideoCallProps {
  roomId: string;
  userName: string;
}

export default function VideoCall({ roomId, userName }: VideoCallProps) {
  const [hasJoined, setHasJoined] = useState(false);
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  // UI States for Controls
  const isIdle = useIdle(3000); // Hide after 3 seconds of inactivity
  const [isHoveringControls, setIsHoveringControls] = useState(false);


  // Custom hooks
  const {
    stream,
    isMicOn,
    isCameraOn,
    isScreenSharing,
    initializeMedia,
    toggleMic,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    setStream
  } = useMediaStream();

  // We only initialize WebRTC AFTER joining the room to prevent early signaling
  const {
    participants,
    replaceTrack,
    connectionStatus,
    pendingRequests,
    admitUser,
    rejectUser,
    toggleMediaStatus,
    activeSpeakerId,
  } = useWebRTC({
    roomId,
    userName,
    localStream: hasJoined ? stream : null
  });

  useEffect(() => {
    initializeMedia();
  }, [initializeMedia]);

  const handleMicToggle = () => {
    toggleMic();
    toggleMediaStatus('audio', !isMicOn);
  };

  const handleCamToggle = () => {
    toggleCamera();
    toggleMediaStatus('video', !isCameraOn);
  };

  // Handle Screen Share toggling
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop sharing
      await stopScreenShare();
      // Re-acquire camera stream
      const cameraStream = await initializeMedia();
      // Replace track in peer connections
      const videoTrack = cameraStream.getVideoTracks()[0];
      if (videoTrack) replaceTrack(videoTrack);
      toggleMediaStatus('video', true);

    } else {
      // Start sharing
      const screenStream = await startScreenShare();
      if (screenStream) {
        setStream(screenStream);
        const screenTrack = screenStream.getVideoTracks()[0];
        replaceTrack(screenTrack);
        // Screen share is technically video, so we keep it as "on"
        toggleMediaStatus('video', true);

        // Handle native stop button on browser bar
        screenTrack.onended = async () => {
          await stopScreenShare();
          const camStream = await initializeMedia();
          const camTrack = camStream.getVideoTracks()[0];
          replaceTrack(camTrack);
          toggleMediaStatus('video', true);
        };
      }
    }
  };

  const { showToast } = useToast();

  const handlePin = (id: string) => {
    setPinnedId(prev => prev === id ? null : id);
  };

  const handleLeave = () => {
    window.location.href = "/";
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}?room=${roomId}`;
    navigator.clipboard.writeText(link);
    showToast('Meeting link copied to clipboard!', 'success');
  };

  // Pre-join Room State
  if (!hasJoined) {
    return (
      <PreJoinScreen
        stream={stream}
        isMicOn={isMicOn}
        isCameraOn={isCameraOn}
        userName={userName}
        roomId={roomId}
        onToggleMic={handleMicToggle}
        onToggleCam={handleCamToggle}
        onJoin={() => setHasJoined(true)} // Transition to main room
      />
    );
  }

  // Waiting Room State
  if (connectionStatus === 'waiting') {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#0F1115] text-white p-4">
        {/* Waiting Room Content */}
        <div className="flex flex-col items-center w-full max-w-md space-y-8 animate-in fade-in duration-700">

          {/* Self View Preview */}
          <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden ring-4 ring-white/5 shadow-2xl">
            <VideoTile
              stream={stream}
              userName=""
              isLocal={true}
              isMuted={true}
              isCameraOff={!isCameraOn}
              onPin={() => { }}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 rounded-full border border-white/10 pointer-events-none" />
          </div>

          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
              </span>
              <h2 className="text-2xl font-semibold">Waiting for host</h2>
            </div>
            <p className="text-gray-400 max-w-xs mx-auto">
              We've let the host know you're here. You'll join automatically once admitted.
            </p>
          </div>

          <button
            onClick={handleLeave}
            className="px-8 py-3 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all text-sm font-medium"
          >
            Leave Waiting Room
          </button>
        </div>
      </div>
    );
  }

  if (connectionStatus === 'rejected') {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#0F1115] text-white">
        <h2 className="text-3xl font-bold text-red-500 mb-4">Access Denied</h2>
        <p className="text-gray-400 mb-8">The host has denied your request to join.</p>
        <button onClick={handleLeave} className="px-6 py-3 bg-white/10 rounded-lg hover:bg-white/20">
          Return to Home
        </button>
      </div>
    );
  }

  // Active Meeting Room State
  return (
    <div className="relative h-screen w-full bg-[#0F1115] overflow-hidden text-white">

      {/* Host Notifications for Admit/Reject */}
      {pendingRequests.length > 0 && (
        <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 w-80">
          {pendingRequests.map((req) => (
            <div key={req.userId} className="flex flex-col bg-[#202124] p-4 rounded-xl shadow-2xl border border-white/10 animate-in slide-in-from-right">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-sm">{req.userName}</span>
                <span className="text-xs text-blue-400 font-medium">Wants to join</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => rejectUser(req.userId)}
                  className="flex-1 py-1.5 text-sm font-medium text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition"
                >
                  Deny
                </button>
                <button
                  onClick={() => admitUser(req.userId)}
                  className="flex-1 py-1.5 text-sm font-medium text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition"
                >
                  Admit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Header Info */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
        <div className="flex flex-col pointer-events-auto">
          <h1 className="text-lg font-semibold text-white/90 flex items-center gap-2">
            {roomId}
            <button
              onClick={copyInviteLink}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
              title="Copy joining info"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </h1>
        </div>
        <div className="px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2 pointer-events-auto">
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span className="text-sm font-medium">{participants.length + 1}</span>
        </div>
      </div>

      {/* Main Grid Area */}
      <div className="h-full w-full pb-0 md:pb-0">
        <VideoGrid
          participants={participants}
          localStream={stream}
          localUserName={userName}
          isMicOn={isMicOn}
          isCameraOn={isCameraOn}
          pinnedId={pinnedId}
          onPin={handlePin}
          activeSpeakerId={activeSpeakerId}
        />
      </div>

      {/* Floating Controls */}
      <div
        className="absolute bottom-0 left-0 w-full h-32 z-20 flex items-end justify-center pb-8 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-500 hover:opacity-100"
        style={{ opacity: isIdle && !isHoveringControls ? 0 : 1 }}
        onMouseEnter={() => setIsHoveringControls(true)}
        onMouseLeave={() => setIsHoveringControls(false)}
      >
        <motion.div
          initial={{ y: 0 }}
          animate={{ y: isIdle && !isHoveringControls ? 100 : 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          <ControlsBar
            isMicOn={isMicOn}
            isCameraOn={isCameraOn}
            isScreenSharing={isScreenSharing}
            onToggleMic={handleMicToggle}
            onToggleCam={handleCamToggle}
            onToggleShare={handleToggleScreenShare}
            onLeave={handleLeave}
          />
        </motion.div>
      </div>
    </div>
  );
}
