import { CONFIG } from './config.js';
import { showToast, showLoading, hideLoading } from './uiManager.js';

class SpotifyAPI {
    constructor() {
        this.accessToken = null;
        this.tokenExpiry = null;
    }

    // Autenticación
    login() {
        const authUrl = `https://accounts.spotify.com/authorize?client_id=${CONFIG.spotify.clientId}&response_type=token&redirect_uri=${encodeURIComponent(CONFIG.spotify.redirectUri)}&scope=${encodeURIComponent(CONFIG.spotify.scopes)}`;
        window.location.href = authUrl;
    }

    checkToken() {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        this.accessToken = params.get('access_token');
        const expiresIn = params.get('expires_in');
        
        if (this.accessToken) {
            this.tokenExpiry = Date.now() + (parseInt(expiresIn) * 1000);
            window.location.hash = '';
            localStorage.setItem('spotify_token', this.accessToken);
            localStorage.setItem('spotify_token_expiry', this.tokenExpiry);
            return true;
        }
        
        // Check localStorage
        const storedToken = localStorage.getItem('spotify_token');
        const storedExpiry = localStorage.getItem('spotify_token_expiry');
        
        if (storedToken && storedExpiry && Date.now() < parseInt(storedExpiry)) {
            this.accessToken = storedToken;
            this.tokenExpiry = parseInt(storedExpiry);
            return true;
        }
        
        return false;
    }

    isTokenValid() {
        return this.accessToken && Date.now() < this.tokenExpiry;
    }

    async makeRequest(endpoint, options = {}) {
        if (!this.isTokenValid()) {
            showToast('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.', 'error');
            this.logout();
            return null;
        }

        try {
            const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
                ...options,
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            if (response.status === 401) {
                showToast('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.', 'error');
                this.logout();
                return null;
            }

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Error en la solicitud');
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            showToast(`Error: ${error.message}`, 'error');
            return null;
        }
    }

    logout() {
        this.accessToken = null;
        this.tokenExpiry = null;
        localStorage.removeItem('spotify_token');
        localStorage.removeItem('spotify_token_expiry');
        window.location.reload();
    }

    // Obtener playlists del usuario
    async getUserPlaylists(limit = 50) {
        showLoading('Cargando tus playlists...');
        let allPlaylists = [];
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
            const data = await this.makeRequest(`/me/playlists?limit=${limit}&offset=${offset}`);
            if (!data) break;
            
            allPlaylists = allPlaylists.concat(data.items);
            hasMore = data.next !== null;
            offset += limit;
        }

        hideLoading();
        return allPlaylists;
    }

    // Obtener tracks de una playlist
    async getPlaylistTracks(playlistId) {
        showLoading('Obteniendo canciones de la playlist...');
        let allTracks = [];
        let offset = 0;
        const limit = 100;
        let hasMore = true;

        while (hasMore) {
            const data = await this.makeRequest(`/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`);
            if (!data) break;
            
            allTracks = allTracks.concat(data.items);
            hasMore = data.next !== null;
            offset += limit;
        }

        hideLoading();
        return allTracks.filter(item => item.track).map(item => ({
            id: item.track.id,
            name: item.track.name,
            artist: item.track.artists[0].name,
            artists: item.track.artists,
            album: item.track.album.name,
            image: item.track.album.images[0]?.url,
            uri: item.track.uri,
            preview_url: item.track.preview_url,
            external_url: item.track.external_urls.spotify
        }));
    }

    // Buscar tracks en Spotify
    async searchTracks(tracks) {
        const results = [];
        
        for (const track of tracks.slice(0, 5)) {
            try {
                const query = encodeURIComponent(`${track.name} ${track.artist}`);
                const data = await this.makeRequest(`/search?q=${query}&type=track&limit=1`);
                
                if (data && data.tracks.items.length > 0) {
                    results.push(data.tracks.items[0]);
                }
            } catch (error) {
                console.error('Error searching track:', error);
            }
        }
        
        return results;
    }

    // Obtener recomendaciones
    async getRecommendations(seedTracks, filters, limit = 20) {
        showLoading('Generando recomendaciones mágicas...');
        
        const trackIds = seedTracks.map(t => t.id).slice(0, 5).join(',');
        let endpoint = `/recommendations?seed_tracks=${trackIds}&limit=${limit}`;
        
        // Añadir filtros
        if (filters.energy !== undefined) endpoint += `&target_energy=${filters.energy}`;
        if (filters.danceability !== undefined) endpoint += `&target_danceability=${filters.danceability}`;
        if (filters.popularity !== undefined) endpoint += `&target_popularity=${filters.popularity}`;
        if (filters.instrumentalness !== undefined) endpoint += `&target_instrumentalness=${filters.instrumentalness}`;
        
        const data = await this.makeRequest(endpoint);
        hideLoading();
        
        if (!data) return [];
        
        return data.tracks.map(track => ({
            id: track.id,
            name: track.name,
            artist: track.artists[0].name,
            artists: track.artists,
            album: track.album.name,
            image: track.album.images[0]?.url,
            uri: track.uri,
            preview_url: track.preview_url,
            external_url: track.external_urls.spotify
        }));
    }

    // Crear playlist
    async createPlaylist(name, tracks) {
        showLoading('Creando tu playlist...');
        
        // Obtener ID del usuario
        const userData = await this.makeRequest('/me');
        if (!userData) {
            hideLoading();
            return null;
        }
        
        // Crear playlist
        const playlist = await this.makeRequest(`/users/${userData.id}/playlists`, {
            method: 'POST',
            body: JSON.stringify({
                name: name,
                description: 'Generada por Music Recommender Pro PWA',
                public: false
            })
        });
        
        if (!playlist) {
            hideLoading();
            return null;
        }
        
        // Añadir tracks
        const trackUris = tracks.map(t => t.uri);
        const chunkSize = 100;
        
        for (let i = 0; i < trackUris.length; i += chunkSize) {
            const chunk = trackUris.slice(i, i + chunkSize);
            await this.makeRequest(`/playlists/${playlist.id}/tracks`, {
                method: 'POST',
                body: JSON.stringify({ uris: chunk })
            });
        }
        
        hideLoading();
        return playlist;
    }
}

export default new SpotifyAPI();
