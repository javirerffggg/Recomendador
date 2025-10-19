export const CONFIG = {
    spotify: {
        clientId: 'TU_SPOTIFY_CLIENT_ID',
        redirectUri: window.location.origin + window.location.pathname,
        scopes: [
            'user-read-private',
            'user-read-email',
            'playlist-read-private',
            'playlist-read-collaborative',
            'playlist-modify-public',
            'playlist-modify-private'
        ].join(' ')
    },
    tidal: {
        clientId: 'TU_TIDAL_CLIENT_ID',
        clientSecret: 'TU_TIDAL_CLIENT_SECRET',
        redirectUri: window.location.origin + window.location.pathname
    },
    vapidPublicKey: 'TU_VAPID_PUBLIC_KEY', // Para push notifications
    shareBaseUrl: window.location.origin + window.location.pathname + '?share='
};
