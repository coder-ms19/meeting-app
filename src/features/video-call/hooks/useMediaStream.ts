import { useState, useEffect, useCallback } from 'react';

export const useMediaStream = () => {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    const initializeMedia = useCallback(async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
            });
            setStream(mediaStream);
            setIsMicOn(true);
            setIsCameraOn(true);
            return mediaStream;
        } catch (error) {
            console.error("Error accessing media:", error);
            throw error;
        }
    }, []);

    const toggleMic = useCallback(() => {
        if (stream) {
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMicOn(audioTrack.enabled);
            }
        }
    }, [stream]);

    const toggleCamera = useCallback(() => {
        if (stream) {
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsCameraOn(videoTrack.enabled);
            }
        }
    }, [stream]);

    const startScreenShare = useCallback(async () => {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: false,
            });
            const screenTrack = screenStream.getVideoTracks()[0];

            setIsScreenSharing(true);

            screenTrack.onended = () => {
                stopScreenShare();
            };

            return screenStream;
        } catch (error) {
            console.error("Error starting screen share:", error);
            return null;
        }
    }, []);

    const stopScreenShare = useCallback(async () => {
        setIsScreenSharing(false);
        // The caller of this hook is responsible for reverting the stream to the camera
        // because this hook manages local state, but replacing tracks involves more logic
        // We will handle the track replacement in the consumer or extend this hook if needed.
        // For now, let's just update the state.
    }, []);

    useEffect(() => {
        return () => {
            stream?.getTracks().forEach(track => track.stop());
        };
    }, [stream]);

    return {
        stream,
        isMicOn,
        isCameraOn,
        isScreenSharing,
        initializeMedia,
        toggleMic,
        toggleCamera,
        startScreenShare,
        stopScreenShare,
        setStream, // Allow external updates (e.g. when switching back from screen share)
    };
};
