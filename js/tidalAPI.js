import { CONFIG } from './config.js';
import { showToast, showLoading, hideLoading } from './uiManager.js';

class TidalAPI {
    constructor() {
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
    }

    // Autenticación OAuth2
    login() {
        const authUrl = `https://login.tidal.com/authorize?response_type=code&client_id=${CONFIG.tidal.clientId}&redirect_uri=${encodeURIComponent(CONFIG.tidal.redirectUri)}&scope=r_usr+w_usr+w_sub`;
        window.location.href = authUrl;
    }

    async checkToken() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (code) {
            await this.exchangeCodeForToken(code);
            window.history.replaceState({}, document.title, window.location.pathname);
            return true;
        }
        
        // Check localStorage
        const storedToken = localStorage.getItem('tidal_token');
        const storedExpiry = localStorage.getItem('tidal_token_expiry');
        const storedRefresh = localStorage.getItem('tidal_refresh_token');
        
        if (storedToken && storedExpiry && Date.now() < parseInt(storedExpiry)) {
            this.accessToken = storedToken;
            this.tokenExpiry = parseInt(storedExpiry);
            this.refreshToken = storedRefresh;
            return true;
        } else if (storedRefresh) {
            return await this.refreshAccessToken();
        }
        
        return false;
    }

    async exchangeCodeForToken(code) {
        try {
            const response = await fetch('https://auth.tidal.com/v1/oauth2/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: CONFIG.tidal.redirectUri,
                    client_id: CONFIG.tidal.clientId,
                    client_secret: CONFIG.tidal.clientSecret
                })
            });

            const data = await response.json();
            this.accessToken = data.access_token;
            this.refreshToken = data.refresh_token;
            this.tokenExpiry = Date.now() + (data.expires_in * 1000);
            
            localStorage.setItem('tidal_token', this.accessToken);
            localStorage.setItem('tidal_refresh_token', this.refreshToken);
            localStorage.setItem('tidal_token_expiry', this.tokenExpiry);
        } catch (error) {
            console.error('Error exchanging code:', error);
            showToast('Error al autenticar con Tidal', 'error');
        }
    }

    async refreshAccessToken() {
        try {
            const response = await fetch('https://auth.tidal.com/v1/oauth2/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: this.refreshToken,
                    client_id: CONFIG.tidal.clientId,
                    client_secret: CONFIG.tidal.clientSecret
                })
            });

            const data = await response.json();
            this.accessToken = data.access_token;
            this.tokenExpiry = Date.now() + (data.expires_in * 1000);
            
            localStorage.setItem('tidal_token', this.accessToken);
            localStorage.setItem('tidal_token_expiry', this.tokenExpiry);
            
            return true;
        } catch (error) {
            console.error('Error refreshing token:', error);
            this.logout();
            return false;
        }
    }

    async makeRequest(endpoint, options = {}) {
        if (Date.now() >= this.tokenExpiry) {
            const refreshed = await this.refreshAccessToken();
            if (!refreshed) return null;
        }

        try {
            const response = await fetch(`https://openapi.tidal.com/v2${endpoint}`, {
                ...options,
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/vnd.tidal.v1+json',
                    ...options.headers
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Tidal API Error:', error);
            showToast(`Error: ${error.message}`, 'error');
            return null;
        }
    }

    logout() {
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
        localStorage.removeItem('tidal_token');
        localStorage.removeItem('tidal_refresh_token');
        localStorage.removeItem('tidal_token_expiry');
        window.location.reload();
    }

    // Obtener playlists del usuario
    async getUserPlaylists() {
        showLoading('Cargando tus playlists de Tidal...');
        const data = await this.makeRequest('/playlists');
        hideLoading();
        
        if (!data || !data.data) return [];
        
        return data.data.map(playlist => ({
            id: playlist.id,
            name: playlist.name,
            description: playlist.description || '',
            image: playlist.image ? `https://resources.tidal.com/images/${playlist.image.replace(/-/g, '/')}/750x750.jpg` : null,
            tracks_count: playlist.numberOfTracks || 0
        }));
    }

    // Obtener tracks de una playlist
    async getPlaylistTracks(playlistId) {
        showLoading('Obteniendo canciones de la playlist...');
        const data = await this.makeRequest(`/playlists/${playlistId}/items`);
        hideLoading();
        
        if (!data || !data.data) return [];
        
        return data.data.filter(item => item.item && item.item.resource).map(item => {
            const track = item.item.resource;
            return {
                id: track.id,
                name: track.title,
                artist: track.artists[0]?.name || 'Unknown Artist',
                artists: track.artists,
                album: track.album?.title || '',
                image: track.album?.imageCover ? 
                    `https://resources.tidal.com/images/${track.album.imageCover.replace(/-/g, '/')}/750x750.jpg` : null,
                external_url: `https://listen.tidal.com/track/${track.id}`
            };
        });
    }

    // Buscar tracks (para parseo de archivos)
    async searchTracks(tracks) {
        const results = [];
        
        for (const track of tracks.slice(0, 5)) {
            try {
                const query = encodeURIComponent(`${track.name} ${track.artist}`);
                const data = await this.makeRequest(`/search?query=${query}&type=TRACKS&limit=1`);
                
                if (data && data.tracks && data.tracks.length > 0) {
                    const t = data.tracks[0].resource;
                    results.push({
                        id: t.id,
                        name: t.title,
                        artist: t.artists[0]?.name
                    });
                }
            } catch (error) {
                console.error('Error searching track:', error);
            }
        }
        
        return results;
    }

    // Nota: Tidal no tiene API pública de recomendaciones
    // Simulamos recomendaciones básicas basadas en artistas
    async getRecommendations(seedTracks, filters, limit = 20) {
        showLoading('Generando recomendaciones...');
        showToast('Tidal tiene funcionalidad limitada de recomendaciones', 'info');
        
        const recommendations = [];
        
        // Buscar tracks similares por artista
        for (const seed of seedTracks.slice(0, 2)) {
            try {
                const artistId = seed.artists?.[0]?.id;
                if (artistId) {
                    const data = await this.makeRequest(`/artists/${artistId}/tracks?limit=10`);
                    if (data && data.data) {
                        recommendations.push(...data.data);
                    }
                }
            } catch (error) {
                console.error('Error getting recommendations:', error);
            }
        }
        
        hideLoading();
        
        // Filtrar y formatear
        return recommendations.slice(0, limit).map(track => ({
            id: track.id,
            name: track.title,
            artist: track.artists[0]?.name || 'Unknown Artist',
            artists: track.artists,
            album: track.album?.title || '',
            image: track.album?.imageCover ? 
                `https://resources.tidal.com/images/${track.album.imageCover.replace(/-/g, '/')}/750x750.jpg` : null,
            external_url: `https://listen.tidal.com/track/${track.id}`
        }));
    }

    // Crear playlist
    async createPlaylist(name, tracks) {
        showLoading('Creando tu playlist en Tidal...');
        
        try {
            const response = await fetch('https://openapi.tidal.com/v2/playlists', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/vnd.tidal.v1+json'
                },
                body: JSON.stringify({
                    name: name,
                    description: 'Generada por Music Recommender Pro PWA'
                })
            });

            const playlist = await response.json();
            
            // Añadir tracks
            const trackIds = tracks.map(t => t.id);
            await fetch(`https://openapi.tidal.com/v2/playlists/${playlist.data.id}/items`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/vnd.tidal.v1+json'
                },
                body: JSON.stringify({
                    trackIds: trackIds
                })
            });
            
            hideLoading();
            return playlist.data;
        } catch (error) {
            console.error('Error creating playlist:', error);
            hideLoading();
            return null;
        }
    }
}

export default new TidalAPI();
