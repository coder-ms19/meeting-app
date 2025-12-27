import type { Participant } from "../hooks/useWebRTC";
import { VideoTile } from "./VideoTile";
import clsx from "clsx";
import { useMemo } from "react";

interface VideoGridProps {
    participants: Participant[];
    localStream: MediaStream | null;
    localUserName: string;
    isMicOn: boolean;
    isCameraOn: boolean;
    pinnedId: string | null;
    onPin: (id: string) => void;
}

export const VideoGrid = ({
    participants,
    localStream,
    localUserName,
    isMicOn,
    isCameraOn,
    pinnedId,
    onPin
}: VideoGridProps) => {

    // Grid Layout Logic
    const totalTiles = participants.length + 1;

    const gridClassName = useMemo(() => {
        if (pinnedId) return "flex gap-4 h-full"; // Spotlight layout treated differently

        // Basic Auto Grid
        if (totalTiles === 1) return "grid grid-cols-1 place-items-center h-full p-8";
        if (totalTiles === 2) return "grid grid-cols-1 md:grid-cols-2 gap-4 h-full p-4 items-center";

        // 3+ items
        return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 h-full p-4 content-center";
    }, [totalTiles, pinnedId]);


    if (pinnedId) {
        // Spotlight View Management
        const pinnedParticipant = participants.find(p => p.id === pinnedId);
        // Check if I am pinned (local)
        const isLocalPinned = pinnedId === 'local';

        return (
            <div className="flex h-full w-full gap-4 p-4 overflow-hidden">
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
                            isMuted={false} // Would need remote mute state
                            isCameraOff={false} // Would need remote cam state
                            isPinned={true}
                            onPin={() => onPin(pinnedParticipant.id)}
                            className="h-full w-full"
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center text-white/50">Participant left</div>
                    )}
                </div>

                {/* Sidebar Strip */}
                <div className="hidden w-[300px] flex-col gap-4 overflow-y-auto lg:flex pr-2 custom-scrollbar">
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
                                    onPin={() => onPin(p.id)}
                                    className="h-full w-full"
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className={gridClassName}>
            <div className={clsx(totalTiles === 1 ? "h-[60vh] w-full max-w-4xl" : "h-full w-full")}>
                <VideoTile
                    stream={localStream}
                    userName={localUserName}
                    isLocal={true}
                    isMuted={!isMicOn}
                    isCameraOff={!isCameraOn}
                    isPinned={pinnedId === 'local'}
                    onPin={() => onPin('local')}
                    className="h-full w-full"
                />
            </div>
            {participants.map(p => (
                <div key={p.id} className="h-full w-full">
                    <VideoTile
                        stream={p.stream}
                        userName={p.name}
                        isLocal={false}
                        isPinned={pinnedId === p.id}
                        onPin={() => onPin(p.id)}
                        className="h-full w-full"
                    />
                </div>
            ))}
        </div>
    );
};
