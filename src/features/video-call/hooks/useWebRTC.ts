import { useRef, useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { config } from '../../../config';

const socket: Socket = io(config.backendUrl);

export interface Participant {
    id: string;
    name: string;
    stream: MediaStream | null;
    isMicOn?: boolean;
    isCameraOn?: boolean;
}

interface UseWebRTCProps {
    roomId: string;
    userName: string;
    localStream: MediaStream | null;
}

export const useWebRTC = ({ roomId, userName, localStream }: UseWebRTCProps) => {
    const [participants, setParticipants] = useState<Participant[]>([]);
    const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());


    const [pendingRequests, setPendingRequests] = useState<{ userId: string; userName: string }[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'waiting' | 'joined' | 'rejected'>('connecting');

    // Helper to safely get the current state of participants in callbacks
    const participantsRef = useRef<Participant[]>([]);
    useEffect(() => { participantsRef.current = participants; }, [participants]);

    const playNotificationSound = () => {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
    };

    const createPeerConnection = useCallback(async (userId: string, userName: string, isInitiator: boolean, stream: MediaStream) => {
        if (peersRef.current.has(userId)) return;

        const pc = new RTCPeerConnection({
            iceServers: config.iceServers,
        });

        peersRef.current.set(userId, pc);

        // Add local tracks
        stream.getTracks().forEach((track) => {
            pc.addTrack(track, stream);
        });

        // Handle remote tracks
        pc.ontrack = (event) => {
            console.log(`Received track from ${userName}:`, event.streams[0].id);
            setParticipants((prev) =>
                prev.map((p) =>
                    p.id === userId ? { ...p, stream: event.streams[0] } : p
                )
            );
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("ice-candidate", {
                    roomId,
                    to: userId,
                    candidate: event.candidate,
                });
            }
        };

        pc.onconnectionstatechange = () => {
            console.log(`Connection state with ${userName}: ${pc.connectionState}`);
            if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
                // Optional: Attempt reconnect or strict cleanup
            }
        };

        if (isInitiator) {
            try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.emit("offer", {
                    roomId,
                    to: userId,
                    offer,
                    userName: userName, // Sending my name
                });
            } catch (err) {
                console.error("Error creating offer:", err);
            }
        }
    }, [roomId]);

    const replaceTrack = useCallback((newTrack: MediaStreamTrack) => {
        peersRef.current.forEach((pc) => {
            const sender = pc.getSenders().find((s) => s.track?.kind === newTrack.kind);
            if (sender) {
                sender.replaceTrack(newTrack);
            }
        });
    }, []);

    const admitUser = useCallback((userId: string) => {
        socket.emit("admit-user", { userId, roomId });
        setPendingRequests(prev => prev.filter(req => req.userId !== userId));
    }, [roomId]);

    const rejectUser = useCallback((userId: string) => {
        socket.emit("reject-user", { userId, roomId });
        setPendingRequests(prev => prev.filter(req => req.userId !== userId));
    }, [roomId]);

    const toggleMediaStatus = useCallback((kind: 'audio' | 'video', isOn: boolean) => {
        socket.emit('toggle-media', { roomId, kind, isOn });
    }, [roomId]);

    const [activeSpeakerId] = useState<string | null>(null);

    // Audio Level Detection (Placeholder for future implementation)
    useEffect(() => {
        // Future logic to detect active speaker using AudioContext
    }, []);


    useEffect(() => {
        if (!localStream) return;
        // ... (existing join logic)
        socket.connect();
        socket.emit("join-room", { roomId, userName });

        // Handling Waiting Room Logic
        socket.on("waiting-for-approval", () => {
            setConnectionStatus('waiting');
        });

        socket.on("join-approved", () => {
            setConnectionStatus('joined');
            playNotificationSound();
        });

        socket.on("join-rejected", () => {
            setConnectionStatus('rejected');
            socket.disconnect();
        });

        socket.on("join-request", (data: { userId: string; userName: string }) => {
            setPendingRequests(prev => [...prev, data]);
            playNotificationSound(); // Notify host
        });

        socket.on("user-joined", async (data: { userId: string; userName: string }) => {
            console.log("User joined:", data);
            playNotificationSound();
            setParticipants((prev) => {
                if (prev.some(p => p.id === data.userId)) return prev;
                // Default to true for new users, they will send updates if different
                return [...prev, { id: data.userId, name: data.userName, stream: null, isMicOn: true, isCameraOn: true }];
            });
            await createPeerConnection(data.userId, data.userName, true, localStream);
        });

        socket.on("media-status-update", (data: { userId: string; kind: 'audio' | 'video'; isOn: boolean }) => {
            setParticipants((prev) => prev.map(p => {
                if (p.id === data.userId) {
                    return {
                        ...p,
                        [data.kind === 'audio' ? 'isMicOn' : 'isCameraOn']: data.isOn
                    };
                }
                return p;
            }));
        });

        socket.on("offer", async (data: { from: string; offer: RTCSessionDescriptionInit; userName: string }) => {
            console.log("Received offer from:", data.userName);

            // Ensure participant exists in state
            setParticipants((prev) => {
                if (prev.some(p => p.id === data.from)) return prev;
                return [...prev, { id: data.from, name: data.userName, stream: null, isMicOn: true, isCameraOn: true }];
            });

            let pc = peersRef.current.get(data.from);
            if (!pc) {
                // If we received an offer, we are NOT the initiator.
                // Pass empty string for userName as we might not know it yet if we are the joiner, 
                // but 'data.userName' tells us who THEY are.
                // We pass OUR local stream to the connection.
                await createPeerConnection(data.from, data.userName, false, localStream);
                pc = peersRef.current.get(data.from);
            }

            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit("answer", {
                    roomId,
                    to: data.from,
                    answer,
                });
            }
        });

        socket.on("answer", async (data: { from: string; answer: RTCSessionDescriptionInit }) => {
            const pc = peersRef.current.get(data.from);
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            }
        });

        socket.on("ice-candidate", async (data: { from: string; candidate: RTCIceCandidateInit }) => {
            const pc = peersRef.current.get(data.from);
            if (pc) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                } catch (e) {
                    console.error("Error adding ice candidate", e);
                }
            }
        });

        socket.on("user-left", (data: { userId: string; userName: string }) => {
            const pc = peersRef.current.get(data.userId);
            if (pc) {
                pc.close();
                peersRef.current.delete(data.userId);
            }
            setParticipants((prev) => prev.filter((p) => p.id !== data.userId));
        });

        socket.on("existing-users", (users: Array<{ userId: string; userName: string }>) => {
            const uniqueUsers = users.filter((user, index, self) =>
                index === self.findIndex(u => u.userId === user.userId)
            );
            setParticipants(uniqueUsers.map(u => ({ id: u.userId, name: u.userName, stream: null, isMicOn: true, isCameraOn: true })));
            setConnectionStatus('joined'); // Existing users means we are in
        });

        return () => {
            socket.off("user-joined");
            socket.off("offer");
            socket.off("answer");
            socket.off("ice-candidate");
            socket.off("user-left");
            socket.off("existing-users");
            socket.off("waiting-for-approval");
            socket.off("join-approved");
            socket.off("join-rejected");
            socket.off("join-request");
            socket.off("media-status-update");

            socket.emit("leave-room", roomId);
            socket.disconnect();

            peersRef.current.forEach((pc) => pc.close());
            peersRef.current.clear();
        };
    }, [roomId, userName, localStream, createPeerConnection]);

    return {
        participants,
        replaceTrack,
        pendingRequests,
        admitUser,
        rejectUser,
        connectionStatus,
        toggleMediaStatus,
        activeSpeakerId // Return this
    };
};
