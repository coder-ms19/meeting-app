import { useEffect, useRef, useState } from "react";
import { VideoTile } from "./VideoTile";
import { Mic, MicOff, Video, VideoOff, Settings, AlertCircle } from "lucide-react";
import clsx from "clsx";

interface PreJoinScreenProps {
    stream: MediaStream | null;
    isMicOn: boolean;
    isCameraOn: boolean;
    userName: string;
    roomId: string;
    onToggleMic: () => void;
    onToggleCam: () => void;
    onJoin: () => void;
}

const AudioMeter = ({ stream, isMicOn }: { stream: MediaStream | null, isMicOn: boolean }) => {
    const [level, setLevel] = useState(0);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const requestRef = useRef<number | null>(null);

    useEffect(() => {
        if (!stream || !isMicOn) {
            setLevel(0);
            return;
        }

        if (!audioContextRef.current) {
            // @ts-ignore - Handle legacy webkit context
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            audioContextRef.current = new AudioContextClass();
        }

        const ctx = audioContextRef.current;
        analyserRef.current = ctx.createAnalyser();
        analyserRef.current.fftSize = 256;

        try {
            sourceRef.current = ctx.createMediaStreamSource(stream);
            sourceRef.current.connect(analyserRef.current);
        } catch (error) {
            console.error("Error creating audio source:", error);
            return;
        }

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

        const updateLevel = () => {
            if (analyserRef.current) {
                analyserRef.current.getByteFrequencyData(dataArray);
                const avg = dataArray.reduce((p, c) => p + c, 0) / dataArray.length;
                // Normalize roughly to 0-100
                setLevel(Math.min(100, avg * 2));
            }
            requestRef.current = requestAnimationFrame(updateLevel);
        };

        updateLevel();

        return () => {
            if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
            if (sourceRef.current) sourceRef.current.disconnect();
            // Don't close context as it might be expensive to recreate rapidly
        };
    }, [stream, isMicOn]);

    return (
        <div className="flex gap-1 items-end h-4 w-12 bg-black/40 rounded-full px-2 py-1 backdrop-blur-sm border border-white/10">
            {[1, 2, 3].map((bar) => (
                <div
                    key={bar}
                    className="w-2 rounded-full transition-all duration-75 bg-green-500"
                    style={{
                        height: `${Math.max(20, Math.min(100, level * (1 + bar * 0.5)))}%`, // Staggered heights
                        opacity: level > 5 ? 1 : 0.3
                    }}
                />
            ))}
        </div>
    );
};

export const PreJoinScreen = ({
    stream,
    isMicOn,
    isCameraOn,
    userName,
    roomId,
    onToggleMic,
    onToggleCam,
    onJoin
}: PreJoinScreenProps) => {
    const [permissionError, setPermissionError] = useState(false);

    useEffect(() => {
        // Simple timeout to show permission help if stream doesn't appear
        const timer = setTimeout(() => {
            if (!stream) setPermissionError(true);
        }, 3000);

        if (stream) setPermissionError(false);

        return () => clearTimeout(timer);
    }, [stream]);

    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#0F1115] p-6 text-white overflow-hidden relative">
            {/* Background Ambiance */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />

            <div className="z-10 w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">

                {/* Left Side: Preview */}
                <div className="flex flex-col items-center animate-in slide-in-from-left duration-700">
                    <div className="relative aspect-video w-full overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10 bg-[#1C1F26]">
                        {stream ? (
                            <VideoTile
                                stream={stream}
                                userName={userName}
                                isLocal={true}
                                isMuted={!isMicOn}
                                isCameraOff={!isCameraOn}
                                onPin={() => { }}
                                className="h-full w-full"
                            />
                        ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center space-y-4 p-8 text-center text-gray-400">
                                {permissionError ? (
                                    <>
                                        <AlertCircle className="h-12 w-12 text-yellow-500 mb-2" />
                                        <p className="font-medium text-white">Camera/Mic access needed</p>
                                        <p className="text-sm">Please allow access in your browser settings to join the call.</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-white/20"></div>
                                        <p>Initializing media...</p>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Overlay Controls */}
                        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-2xl bg-black/60 p-2 pr-4 pl-4 backdrop-blur-xl border border-white/10 shadow-xl">
                            <button
                                onClick={onToggleMic}
                                className={clsx(
                                    "flex items-center justify-center rounded-xl p-3 transition-all duration-200",
                                    isMicOn
                                        ? "bg-white/10 text-white hover:bg-white/20"
                                        : "bg-red-500/90 text-white hover:bg-red-600"
                                )}
                            >
                                {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                            </button>

                            {/* Audio Meter Visualizer */}
                            <AudioMeter stream={stream} isMicOn={isMicOn} />

                            <div className="h-8 w-[1px] bg-white/10 mx-2" />

                            <button
                                onClick={onToggleCam}
                                className={clsx(
                                    "flex items-center justify-center rounded-xl p-3 transition-all duration-200",
                                    isCameraOn
                                        ? "bg-white/10 text-white hover:bg-white/20"
                                        : "bg-red-500/90 text-white hover:bg-red-600"
                                )}
                            >
                                {isCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 flex items-center gap-2 text-sm text-gray-400">
                        <Settings className="h-4 w-4" />
                        <span>System Default Devices Selected</span>
                    </div>
                </div>

                {/* Right Side: Join Actions */}
                <div className="flex flex-col items-center text-center lg:items-start lg:text-left space-y-8 animate-in slide-in-from-right duration-700 delay-100">
                    <div>
                        <div className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400 mb-4">
                            Premium Video Call
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                            Ready to join?
                        </h1>
                        <p className="mt-4 text-lg text-gray-400 max-w-md">
                            You are about to enter the meeting room
                            <span className="text-white font-medium mx-1.5">{roomId}</span>
                            as <span className="text-white font-medium">{userName}</span>.
                        </p>
                    </div>

                    <div className="flex flex-col w-full max-w-sm gap-4">
                        <button
                            onClick={onJoin}
                            className="group relative flex h-14 w-full items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-lg font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-blue-500/25 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                Join Meeting
                                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </span>
                        </button>

                        <button
                            onClick={() => {
                                const link = `${window.location.origin}?room=${roomId}`;
                                navigator.clipboard.writeText(link);
                                alert('Link copied!');
                            }}
                            className="flex h-12 w-full items-center justify-center rounded-full border border-white/10 bg-white/5 font-medium text-gray-300 transition-all hover:bg-white/10 hover:text-white"
                        >
                            Copy Joining Info
                        </button>
                    </div>

                    {/* Branding / Developer Footer */}
                    <div className="mt-8 flex items-center gap-3 rounded-2xl bg-white/5 p-3 pr-6 border border-white/5 backdrop-blur-md">
                        <img
                            src="https://github.com/Manish-keer19.png"
                            alt="Manish Keer"
                            className="h-10 w-10 rounded-full border border-white/10"
                        />
                        <div className="flex flex-col text-left">
                            <span className="text-sm font-medium text-white">Built by Manish Keer</span>
                            <span className="text-xs text-gray-400">Software Engineer</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
