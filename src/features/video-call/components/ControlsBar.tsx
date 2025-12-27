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
                "group relative flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50",
                isDestructive
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : isActive
                        ? "bg-[#2A2F3A] hover:bg-[#323846] text-white" // Inactive Look (e.g. Mic On is normal) or Active for non-toggles? 
                        : "bg-red-500/10 text-red-500 hover:bg-red-500/20" // Alert Look (e.g. Mic Off)
            )}
        >
            {/* Logic check: usually 'isActive' means 'Mic is On'. So standard gray. 
                If Mic is Off (isActive=false), we want Red.
                Let's simplify: 
                - Normal (Dark Gray): Mic On, Camera On
                - Alert (Red): Mic Off, Camera Off, Leave
                - Active (Blue): Screen Share On
            */}
            <div className="h-5 w-5">{icon}</div>
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
        <div className="flex items-center justify-center gap-4 rounded-2xl bg-[#1C1F26]/90 px-6 py-3 shadow-2xl backdrop-blur-xl border border-white/5">
            <ControlButton
                onClick={onToggleMic}
                isActive={isMicOn} // Pass true if Mic is ON (Gray), False if OFF (Red)
                icon={isMicOn ? <Mic /> : <MicOff />}
                description={isMicOn ? "Turn off microphone" : "Turn on microphone"}
            />

            <ControlButton
                onClick={onToggleCam}
                isActive={isCameraOn}
                icon={isCameraOn ? <Video /> : <VideoOff />}
                description={isCameraOn ? "Turn off camera" : "Turn on camera"}
            />

            <button
                onClick={onToggleShare}
                className={clsx(
                    "flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200",
                    isScreenSharing
                        ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]"
                        : "bg-[#2A2F3A] hover:bg-[#323846] text-white"
                )}
                title="Share screen"
            >
                <MonitorUp className="h-5 w-5" />
            </button>

            <div className="mx-2 h-8 w-[1px] bg-white/10" />

            <ControlButton
                onClick={onLeave}
                isDestructive
                isActive={false}
                icon={<PhoneOff />}
                description="Leave call"
            />
        </div>
    );
};
