import { useRef, useEffect } from "react";
import { MicOff, Pin } from 'lucide-react';
import clsx from 'clsx';
import { motion } from "framer-motion";

interface VideoTileProps {
    stream: MediaStream | null;
    userName: string;
    isLocal?: boolean;
    isMuted?: boolean;
    isCameraOff?: boolean;
    isPinned?: boolean;
    onPin: () => void;
    className?: string; // For Grid Layout adjustments
}

export const VideoTile = ({
    stream,
    userName,
    isLocal,
    isMuted,
    isCameraOff,
    isPinned,
    onPin,
    className,
}: VideoTileProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className={clsx(
                "relative rounded-2xl overflow-hidden bg-[#1C1F26] group shadow-lg border border-white/5",
                className
            )}
        >
            {/* Video Element */}
            {stream && !isCameraOff ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isLocal} // Local video should always be muted to avoid feedback
                    className={clsx(
                        "w-full h-full object-cover",
                        isLocal && "transform -scale-x-100" // Mirror local video
                    )}
                />
            ) : (
                // Camera Off Placeholder
                <div className="flex w-full h-full items-center justify-center bg-[#1C1F26]">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-3xl font-bold text-white shadow-xl">
                        {userName.charAt(0).toUpperCase()}
                    </div>
                </div>
            )}

            {/* Info Overlay (Name) */}
            <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-lg bg-black/40 px-3 py-1.5 backdrop-blur-md">
                <span className="text-sm font-medium text-white max-w-[150px] truncate">
                    {userName} {isLocal && "(You)"}
                </span>
                {isMuted && <MicOff className="h-3.5 w-3.5 text-red-500" />}
            </div>

            {/* Connection / Status Indicators (Top Right) */}
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                    onClick={onPin}
                    className={clsx(
                        "rounded-full p-2 backdrop-blur-md transition-colors",
                        isPinned ? "bg-blue-500 text-white" : "bg-black/40 text-white hover:bg-black/60"
                    )}
                >
                    <Pin className="h-4 w-4" />
                </button>
            </div>

            {/* Active Speaker Border (Optional - can be controlled by parent via className) */}

        </motion.div>
    );
};
