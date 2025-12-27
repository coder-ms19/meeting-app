import { VideoTile } from "./VideoTile";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import clsx from "clsx";

interface PreJoinScreenProps {
    stream: MediaStream | null;
    isMicOn: boolean;
    isCameraOn: boolean;
    userName: string;
    onToggleMic: () => void;
    onToggleCam: () => void;
    onJoin: () => void;
}

export const PreJoinScreen = ({
    stream,
    isMicOn,
    isCameraOn,
    userName,
    onToggleMic,
    onToggleCam,
    onJoin
}: PreJoinScreenProps) => {
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#0F1115] p-4 text-white">
            <div className="flex w-full max-w-4xl flex-col gap-8 md:flex-row md:items-center md:justify-between">

                {/* Left Side: Preview */}
                <div className="flex flex-1 flex-col items-center">
                    <div className="relative aspect-video w-full max-w-[600px] overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10">
                        <VideoTile
                            stream={stream}
                            userName={userName}
                            isLocal={true}
                            isMuted={!isMicOn} // Visual indication only
                            isCameraOff={!isCameraOn}
                            onPin={() => { }}
                            className="h-full w-full"
                        />

                        {/* Overlay Controls for Quick Toggles */}
                        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-4 rounded-xl bg-black/60 p-2 backdrop-blur-md">
                            <button
                                onClick={onToggleMic}
                                className={clsx(
                                    "rounded-lg p-3 transition-colors",
                                    isMicOn ? "bg-white/10 hover:bg-white/20" : "bg-red-500 hover:bg-red-600"
                                )}
                            >
                                {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                            </button>
                            <button
                                onClick={onToggleCam}
                                className={clsx(
                                    "rounded-lg p-3 transition-colors",
                                    isCameraOn ? "bg-white/10 hover:bg-white/20" : "bg-red-500 hover:bg-red-600"
                                )}
                            >
                                {isCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Side: Join Actions */}
                <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center md:items-start md:text-left">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Ready to join?</h1>
                        <p className="mt-2 text-[#9CA3AF]">
                            Confirm your audio and video settings before entering the meeting.
                        </p>
                    </div>

                    <div className="flex flex-col w-full gap-3 sm:flex-row">
                        <button
                            onClick={onJoin}
                            className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-blue-600 px-8 font-medium text-white transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        >
                            Join Meeting
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
