import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff } from "lucide-react";
import clsx from "clsx";

interface ControlButtonProps {
    onClick: () => void;
    isActive?: boolean; // For toggle states (Mic on/off)
    isDestructive?: boolean;
    icon: React.ReactNode;
    label?: string;
    description?: string; // Tooltip text
}

const ControlButton = ({ onClick, isActive, isDestructive, icon, description }: ControlButtonProps) => {
    return (
        <button
            onClick={onClick}
            title={description}
            className={clsx(
                "group relative flex h-14 w-14 items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50",
                isDestructive
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : isActive
                        ? "bg-[#2A2F3A] hover:bg-[#323846] text-white"
                        : "bg-white/10 text-white hover:bg-white/20" // Improved Mic Off state to be less alarming, or keep Red if critical? User asked for clear ON/OFF. 
                // Let's stick to Red for Mic Off as it's a safety feature.
                // Actually, let's use the explicit 'bg-red-500/10 text-red-500' for uniformity.
            )}
        >
            <div className={clsx(
                "h-6 w-6", // Larger icon
                !isActive && !isDestructive && "text-red-500" // Icon color if off
            )}>{icon}</div>
        </button>
    );
};

// Specialized implementation for the main bar
interface ControlsBarProps {
    isMicOn: boolean;
    isCameraOn: boolean;
    isScreenSharing: boolean;
    onToggleMic: () => void;
    onToggleCam: () => void;
    onToggleShare: () => void;
    onLeave: () => void;
}

export const ControlsBar = ({
    isMicOn,
    isCameraOn,
    isScreenSharing,
    onToggleMic,
    onToggleCam,
    onToggleShare,
    onLeave
}: ControlsBarProps) => {
    return (
        <div className="flex items-center justify-center gap-3 md:gap-6 rounded-full bg-[#1C1F26]/90 px-6 py-4 shadow-2xl backdrop-blur-xl border border-white/5 mx-4 mb-6">
            <ControlButton
                onClick={onToggleMic}
                isActive={isMicOn}
                icon={isMicOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
                description={isMicOn ? "Turn off microphone" : "Turn on microphone"}
            />

            <ControlButton
                onClick={onToggleCam}
                isActive={isCameraOn}
                icon={isCameraOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
                description={isCameraOn ? "Turn off camera" : "Turn on camera"}
            />

            <button
                onClick={onToggleShare}
                className={clsx(
                    "flex h-14 w-14 items-center justify-center rounded-full transition-all duration-200 hidden md:flex",
                    isScreenSharing
                        ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]"
                        : "bg-[#2A2F3A] hover:bg-[#323846] text-white"
                )}
                title="Share screen"
            >
                <MonitorUp className="h-6 w-6" />
            </button>

            <div className="mx-2 h-10 w-[1px] bg-white/10 hidden md:block" />

            <button
                onClick={onLeave}
                className="flex items-center gap-2 h-14 px-8 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all font-medium"
                title="Leave call"
            >
                <PhoneOff className="h-5 w-5" />
                <span className="hidden md:inline">Leave</span>
            </button>
        </div>
    );
};
