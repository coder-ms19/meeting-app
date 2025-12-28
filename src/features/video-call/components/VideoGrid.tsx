import type { Participant } from "../hooks/useWebRTC";
import { VideoTile } from "./VideoTile";
import clsx from "clsx";

interface VideoGridProps {
    participants: Participant[];
    localStream: MediaStream | null;
    localUserName: string;
    isMicOn: boolean;
    isCameraOn: boolean;
    pinnedId: string | null;
    activeSpeakerId: string | null;
    onPin: (id: string) => void;
}

export const VideoGrid = ({
    participants,
    localStream,
    localUserName,
    isMicOn,
    isCameraOn,
    pinnedId,
    activeSpeakerId,
    onPin
}: VideoGridProps) => {

    // Grid Layout Logic
    const totalTiles = participants.length + 1;
    const isSpotlight = !!pinnedId;

    // Helper for grid columns based on count
    const getGridCols = () => {
        // Desktop Grid Logic (All participants)
        if (totalTiles <= 1) return "lg:grid-cols-1";
        if (totalTiles === 2) return "lg:grid-cols-2";
        if (totalTiles <= 4) return "lg:grid-cols-2";
        if (totalTiles <= 9) return "lg:grid-cols-3";
        return "lg:grid-cols-4";
    };

    const getMobileGridCols = () => {
        // Mobile Grid Logic (Remote Only)
        if (participants.length === 0) return "grid-cols-1";
        if (participants.length <= 2) return "grid-cols-1";
        return "grid-cols-2";
    };

    if (isSpotlight) {
        // Spotlight View Management
        const pinnedParticipant = participants.find(p => p.id === pinnedId);
        const isLocalPinned = pinnedId === 'local';

        return (
            <div className="flex flex-col lg:flex-row h-full w-full gap-2 p-2 overflow-hidden">
                {/* Main Spotlight Stage */}
                <div className="flex-1 relative rounded-2xl overflow-hidden bg-[#1C1F26]">
                    {isLocalPinned ? (
                        <VideoTile
                            stream={localStream}
                            userName={localUserName}
                            isLocal={true}
                            isMuted={!isMicOn}
                            isCameraOff={!isCameraOn}
                            isPinned={true}
                            onPin={() => onPin('local')}
                            className="h-full w-full"
                        />
                    ) : pinnedParticipant ? (
                        <VideoTile
                            stream={pinnedParticipant.stream}
                            userName={pinnedParticipant.name}
                            isLocal={false}
                            isMuted={!pinnedParticipant.isMicOn}
                            isCameraOff={!pinnedParticipant.isCameraOn}
                            isPinned={true}
                            isActiveSpeaker={activeSpeakerId === pinnedParticipant.id}
                            onPin={() => onPin(pinnedParticipant.id)}
                            className="h-full w-full"
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center text-white/50">Participant left</div>
                    )}
                </div>

                {/* Sidebar Strip */}
                <div className="flex w-full h-24 lg:w-[300px] lg:h-full lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:overflow-x-hidden flex-shrink-0 custom-scrollbar">
                    {/* Local Video if not pinned */}
                    {!isLocalPinned && (
                        <div className="aspect-video w-full flex-shrink-0">
                            <VideoTile
                                stream={localStream}
                                userName={localUserName}
                                isLocal={true}
                                isMuted={!isMicOn}
                                isCameraOff={!isCameraOn}
                                isPinned={false}
                                onPin={() => onPin('local')}
                                className="h-full w-full"
                            />
                        </div>
                    )}

                    {/* Remote Videos if not pinned */}
                    {participants.map(p => {
                        if (p.id === pinnedId) return null;
                        return (
                            <div key={p.id} className="aspect-video w-full flex-shrink-0">
                                <VideoTile
                                    stream={p.stream}
                                    userName={p.name}
                                    isLocal={false}
                                    isMuted={!p.isMicOn}
                                    isCameraOff={!p.isCameraOn}
                                    isActiveSpeaker={activeSpeakerId === p.id}
                                    onPin={() => onPin(p.id)}
                                    className="h-full w-full"
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    } // End Spotlight View

    // Standard Grid View (Auto Layout)
    return (
        <div className="relative h-full w-full p-2 lg:p-4">
            <div className={clsx(
                "grid w-full h-full gap-2 lg:gap-4 content-center transition-all duration-300",
                getMobileGridCols(), // Mobile columns
                getGridCols()        // Desktop columns override
            )}>

                {/* 1. Remote Participants */}
                {participants.map(p => (
                    <div
                        key={p.id}
                        className={clsx(
                            "relative overflow-hidden rounded-2xl bg-[#1C1F26] shadow-lg transition-all duration-300",
                            "w-full h-full aspect-[3/4] md:aspect-video" // Portrait card on mobile
                        )}
                    >
                        <VideoTile
                            stream={p.stream}
                            userName={p.name}
                            isLocal={false}
                            isMuted={!p.isMicOn}
                            isCameraOff={!p.isCameraOn}
                            isPinned={pinnedId === p.id}
                            isActiveSpeaker={activeSpeakerId === p.id}
                            onPin={() => onPin(p.id)}
                            className="h-full w-full object-cover"
                        />
                    </div>
                ))}

                {/* 2. Local Participant */}
                {/* 
                   Logic: 
                   - If NO remote participants: Show full screen (in grid) on Mobile & Desktop.
                   - If ANY remote participants:
                     - Mobile: Floating PiP (Absolute).
                     - Desktop: In Grid (Static).
                */}
                <div className={clsx(
                    "rounded-xl overflow-hidden shadow-2xl border-white/10 transition-all duration-500 bg-[#1C1F26]",

                    participants.length === 0
                        ? "lg:static w-full h-full lg:shadow-none lg:border-0 lg:z-auto aspect-[3/4] md:aspect-video col-span-full row-span-full" // Alone: Full screen everywhere
                        : clsx(
                            // With others:
                            // Mobile: Floating PiP Bottom-Right
                            "absolute bottom-24 right-4 w-28 h-40 z-50 border-2",
                            // Desktop: Static (In Grid)
                            "lg:static lg:w-full lg:h-full lg:aspect-video lg:shadow-none lg:border-0 lg:z-auto"
                        )
                )}>
                    <VideoTile
                        stream={localStream}
                        userName={localUserName}
                        isLocal={true}
                        isMuted={!isMicOn}
                        isCameraOff={!isCameraOn}
                        isPinned={false}
                        onPin={() => onPin('local')}
                        className="h-full w-full object-cover"
                    />
                </div>
            </div>
        </div>
    );
};
