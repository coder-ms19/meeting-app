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


    // Helper to safely get the current state of participants in callbacks
    const participantsRef = useRef<Participant[]>([]);
    useEffect(() => { participantsRef.current = participants; }, [participants]);

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

    useEffect(() => {
        if (!localStream) return;

        socket.connect();


        socket.emit("join-room", { roomId, userName });

        socket.on("user-joined", async (data: { userId: string; userName: string }) => {
            console.log("User joined:", data);
            setParticipants((prev) => {
                if (prev.some(p => p.id === data.userId)) return prev;
                return [...prev, { id: data.userId, name: data.userName, stream: null }];
            });
            await createPeerConnection(data.userId, data.userName, true, localStream);
        });

        socket.on("offer", async (data: { from: string; offer: RTCSessionDescriptionInit; userName: string }) => {
            console.log("Received offer from:", data.userName);

            // Ensure participant exists in state
            setParticipants((prev) => {
                if (prev.some(p => p.id === data.from)) return prev;
                return [...prev, { id: data.from, name: data.userName, stream: null }];
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
            setParticipants(uniqueUsers.map(u => ({ id: u.userId, name: u.userName, stream: null })));
        });

        return () => {
            socket.off("user-joined");
            socket.off("offer");
            socket.off("answer");
            socket.off("ice-candidate");
            socket.off("user-left");
            socket.off("existing-users");
            socket.emit("leave-room", roomId);
            socket.disconnect();

            peersRef.current.forEach((pc) => pc.close());
            peersRef.current.clear();
        };
    }, [roomId, userName, localStream, createPeerConnection]);

    return {
        participants,
        replaceTrack,
    };
};
