import { useRef, useEffect, useState } from "react";
import { Mic, MicOff, Pin } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from "framer-motion";

interface VideoTileProps {
    stream: MediaStream | null;
    userName: string;
    isLocal?: boolean;
    isMuted?: boolean;
    isCameraOff?: boolean;
    isPinned?: boolean;
    isActiveSpeaker?: boolean;
    onPin: () => void;
    className?: string;
}

export const VideoTile = ({
    stream,
    userName,
    isLocal,
    isMuted,
    isCameraOff,
    isPinned,
    isActiveSpeaker,
    onPin,
    className,
}: VideoTileProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isVideoReady, setIsVideoReady] = useState(false);
    const [showConnectionSkeleton, setShowConnectionSkeleton] = useState(true);

    // Reset video ready state when stream changes or camera is toggled
    useEffect(() => {
        if (stream && !isCameraOff) {
            setShowConnectionSkeleton(true);
            setIsVideoReady(false);
        } else {
            setShowConnectionSkeleton(false);
        }
    }, [stream, isCameraOff]);

    useEffect(() => {
        if (videoRef.current && stream && !isCameraOff) {
            videoRef.current.srcObject = stream;
        }
    }, [stream, isCameraOff]);

    const handleVideoLoaded = () => {
        setIsVideoReady(true);
        setShowConnectionSkeleton(false);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{
                opacity: 1,
                scale: isActiveSpeaker && !isPinned ? 1.02 : 1,
                borderColor: isActiveSpeaker ? "rgba(59, 130, 246, 0.5)" : "rgba(255, 255, 255, 0.05)",
                boxShadow: isActiveSpeaker ? "0 0 30px rgba(59, 130, 246, 0.15)" : "none"
            }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, type: "spring", stiffness: 200, damping: 25 }}
            className={clsx(
                "relative rounded-2xl overflow-hidden bg-[#1C1F26] group border-2 transition-all duration-300",
                className
            )}
        >
            {/* 1. Connecting Skeleton / Loading State */}
            <AnimatePresence>
                {showConnectionSkeleton && !isCameraOff && (
                    <motion.div
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-20 flex bg-[#1C1F26] animate-pulse"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 animate-shimmer" />
                        <div className="flex h-full w-full items-center justify-center">
                            <span className="text-sm font-medium text-white/40">Connecting...</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 2. Main Video Layer */}
            {stream && !isCameraOff ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isLocal}
                    onLoadedData={handleVideoLoaded}
                    className={clsx(
                        "w-full h-full transition-opacity duration-500",
                        isVideoReady ? "opacity-100" : "opacity-0",
                        isPinned ? "object-contain bg-black" : "object-cover",
                        isLocal && "transform -scale-x-100"
                    )}
                />
            ) : (
                // 3. Camera Off Placeholder (Premium Glassmorphism)
                <div className="flex w-full h-full items-center justify-center bg-[#181a20]">
                    <div className="relative">
                        <div className={clsx(
                            "flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl border border-white/10 shadow-2xl transition-transform duration-300",
                            isActiveSpeaker && "scale-110 ring-2 ring-blue-500/50"
                        )}>
                            <span className="text-3xl font-semibold text-white/90">
                                {userName.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        {/* Audio Wave Visual for placeholder */}
                        {isActiveSpeaker && (
                            <div className="absolute -inset-4 -z-10 rounded-full bg-blue-500/20 blur-xl animate-pulse" />
                        )}
                    </div>
                </div>
            )}

            {/* 4. Info Overlay */}
            <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 max-w-[80%]">
                <div className="flex items-center gap-2 rounded-lg bg-black/40 px-3 py-1.5 backdrop-blur-md border border-white/5">
                    <span className="text-sm font-medium text-white truncate">
                        {userName} {isLocal && "(You)"}
                    </span>
                    {/* Mic Status Indicator */}
                    {isMuted ? (
                        <MicOff className="h-3.5 w-3.5 text-red-500" />
                    ) : (
                        <Mic className={clsx(
                            "h-3.5 w-3.5 transition-colors",
                            isActiveSpeaker ? "text-blue-400" : "text-white/50"
                        )} />
                    )}
                </div>
            </div>

            {/* 5. Hover Controls */}
            <div className="absolute top-4 right-4 z-10 flex gap-2 opacity-0 transform translate-y-[-10px] transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                <button
                    onClick={onPin}
                    className={clsx(
                        "rounded-full p-2 backdrop-blur-md border border-white/10 transition-colors",
                        isPinned ? "bg-blue-500 text-white" : "bg-black/40 text-white hover:bg-white/10"
                    )}
                    title={isPinned ? "Unpin" : "Pin"}
                >
                    <Pin className="h-4 w-4" />
                </button>
            </div>

            {/* Active Speaker Gradient overlay (Subtle inner glow) */}
            {isActiveSpeaker && (
                <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-blue-500/30 pointer-events-none" />
            )}

        </motion.div>
    );
};
