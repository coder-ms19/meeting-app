// Environment configuration
export const config = {
    // Backend API URL
    backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',

    // App Name
    appName: import.meta.env.VITE_APP_NAME || 'VidMeet',

    // WebRTC Configuration
    iceServers: [
        {
            urls: import.meta.env.VITE_STUN_SERVER_1 || 'stun:stun.l.google.com:19302',
        },
        {
            urls: import.meta.env.VITE_STUN_SERVER_2 || 'stun:stun1.l.google.com:19302',
        },
        // TURN server (if configured)
        ...(import.meta.env.VITE_TURN_SERVER
            ? [
                {
                    urls: import.meta.env.VITE_TURN_SERVER,
                    username: import.meta.env.VITE_TURN_USERNAME,
                    credential: import.meta.env.VITE_TURN_CREDENTIAL,
                },
            ]
            : []),
    ],

    // Feature flags
    features: {
        screenSharing: true,
        recording: false, // Future feature
        chat: false, // Future feature
    },
};

// Type-safe config
export type AppConfig = typeof config;
