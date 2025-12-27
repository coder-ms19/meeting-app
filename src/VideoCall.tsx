import { useEffect, useState } from "react";
import { useMediaStream } from "./features/video-call/hooks/useMediaStream";
import { useWebRTC } from "./features/video-call/hooks/useWebRTC";
import { PreJoinScreen } from "./features/video-call/components/PreJoinScreen";
import { VideoGrid } from "./features/video-call/components/VideoGrid";
import { ControlsBar } from "./features/video-call/components/ControlsBar";
import { motion } from "framer-motion";

interface VideoCallProps {
  roomId: string;
  userName: string;
}

export default function VideoCall({ roomId, userName }: VideoCallProps) {
  const [hasJoined, setHasJoined] = useState(false);
  const [pinnedId, setPinnedId] = useState<string | null>(null);

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
  const { participants, replaceTrack } = useWebRTC({
    roomId,
    userName,
    localStream: hasJoined ? stream : null
  });

  useEffect(() => {
    initializeMedia();
  }, [initializeMedia]);

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

    } else {
      // Start sharing
      const screenStream = await startScreenShare();
      if (screenStream) {
        setStream(screenStream);
        const screenTrack = screenStream.getVideoTracks()[0];
        replaceTrack(screenTrack);

        // Handle native stop button on browser bar
        screenTrack.onended = async () => {
          await stopScreenShare();
          const camStream = await initializeMedia();
          const camTrack = camStream.getVideoTracks()[0];
          replaceTrack(camTrack);
        };
      }
    }
  };

  const handlePin = (id: string) => {
    setPinnedId(prev => prev === id ? null : id);
  };

  const handleLeave = () => {
    window.location.href = "/";
  };

  // Pre-join Room State
  if (!hasJoined) {
    return (
      <PreJoinScreen
        stream={stream}
        isMicOn={isMicOn}
        isCameraOn={isCameraOn}
        userName={userName}
        onToggleMic={toggleMic}
        onToggleCam={toggleCamera}
        onJoin={() => setHasJoined(true)} // Transition to main room
      />
    );
  }

  // Active Meeting Room State
  return (
    <div className="relative h-screen w-full bg-[#0F1115] overflow-hidden text-white">

      {/* Header Info - Auto fade out could go here */}
      <div className="absolute top-0 left-0 z-10 p-4">
        <h1 className="text-lg font-semibold text-white/80">{roomId}</h1>
      </div>

      {/* Main Grid Area */}
      <div className="h-full w-full pb-24">
        <VideoGrid
          participants={participants}
          localStream={stream}
          localUserName={userName}
          isMicOn={isMicOn}
          isCameraOn={isCameraOn}
          pinnedId={pinnedId}
          onPin={handlePin}
        />
      </div>

      {/* Floating Controls */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring' }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
      >
        <ControlsBar
          isMicOn={isMicOn}
          isCameraOn={isCameraOn}
          isScreenSharing={isScreenSharing}
          onToggleMic={toggleMic}
          onToggleCam={toggleCamera}
          onToggleShare={handleToggleScreenShare}
          onLeave={handleLeave}
        />
      </motion.div>
    </div>
  );
}
