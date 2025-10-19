// Configuración de Spotify
const CLIENT_ID = 'TU_CLIENT_ID_AQUI';
const REDIRECT_URI = window.location.origin + window.location.pathname;
const SCOPES = 'user-read-private playlist-modify-public playlist-modify-private';

let accessToken = null;
let playlistTracks = [];
let recommendations = [];

// Elementos del DOM
const loginBtn = document.getElementById('login-btn');
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const authSection = document.getElementById('auth-section');
const uploadSection = document.getElementById('upload-section');
const resultsSection = document.getElementById('results-section');
const playlistInfo = document.getElementById('playlist-info');
const trackCount = document.getElementById('track-count');
const recommendationsGrid = document.getElementById('recommendations-grid');
const createPlaylistBtn = document.getElementById('create-playlist-btn');
const loading = document.getElementById('loading');

// Registrar Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(() => console.log('Service Worker registrado'))
        .catch(err => console.error('Error al registrar SW:', err));
}

// Autenticación con Spotify
loginBtn.addEventListener('click', () => {
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}`;
    window.location.href = authUrl;
});

// Verificar token en la URL
function checkForToken() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    accessToken = params.get('access_token');
    
    if (accessToken) {
        window.location.hash = '';
        authSection.classList.add('hidden');
        uploadSection.classList.remove('hidden');
    }
}

// Manejo de archivos
uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    handleFile(e.dataTransfer.files[0]);
});

fileInput.addEventListener('change', (e) => {
    handleFile(e.target.files[0]);
});

function handleFile(file) {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        parsePlaylist(e.target.result, file.name);
    };
    reader.readAsText(file);
}

function parsePlaylist(content, filename) {
    playlistTracks = [];
    
    if (filename.endsWith('.json')) {
        try {
            const data = JSON.parse(content);
            playlistTracks = extractSpotifyJSON(data);
        } catch (e) {
            alert('Error al parsear JSON');
        }
    } else if (filename.endsWith('.csv')) {
        playlistTracks = parseCSV(content);
    } else if (filename.endsWith('.m3u')) {
        playlistTracks = parseM3U(content);
    } else {
        playlistTracks = parseTXT(content);
    }
    
    if (playlistTracks.length > 0) {
        trackCount.textContent = playlistTracks.length;
        playlistInfo.classList.remove('hidden');
        getRecommendations();
    } else {
        alert('No se encontraron canciones en el archivo');
    }
}

function extractSpotifyJSON(data) {
    const tracks = [];
    if (data.tracks && Array.isArray(data.tracks)) {
        data.tracks.forEach(item => {
            if (item.track) {
                tracks.push({
                    name: item.track.name,
                    artist: item.track.artists[0].name
                });
            }
        });
    }
    return tracks;
}

function parseCSV(content) {
    const lines = content.split('\n').slice(1);
    return lines.map(line => {
        const [name, artist] = line.split(',');
        return { name: name?.trim(), artist: artist?.trim() };
    }).filter(t => t.name && t.artist);
}

function parseM3U(content) {
    const lines = content.split('\n');
    const tracks = [];
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('#EXTINF:')) {
            const info = lines[i].split(',')[1];
            if (info) {
                const [artist, name] = info.split(' - ');
                tracks.push({ name: name?.trim(), artist: artist?.trim() });
            }
        }
    }
    return tracks.filter(t => t.name && t.artist);
}

function parseTXT(content) {
    const lines = content.split('\n');
    return lines.map(line => {
        const [artist, name] = line.split(' - ');
        return { name: name?.trim(), artist: artist?.trim() };
    }).filter(t => t.name && t.artist);
}

async function getRecommendations() {
    loading.classList.remove('hidden');
    
    try {
        const seedTracks = await searchTracksOnSpotify(playlistTracks.slice(0, 5));
        const trackIds = seedTracks.map(t => t.id).join(',');
        
        const response = await fetch(`https://api.spotify.com/v1/recommendations?seed_tracks=${trackIds}&limit=20`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        const data = await response.json();
        recommendations = data.tracks || [];
        displayRecommendations();
    } catch (error) {
        console.error('Error:', error);
        alert('Error al obtener recomendaciones');
    } finally {
        loading.classList.add('hidden');
    }
}

async function searchTracksOnSpotify(tracks) {
    const results = [];
    
    for (const track of tracks) {
        try {
            const query = encodeURIComponent(`${track.name} ${track.artist}`);
            const response = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const data = await response.json();
            if (data.tracks.items.length > 0) {
                results.push(data.tracks.items[0]);
            }
        } catch (error) {
            console.error('Error buscando canción:', error);
        }
    }
    
    return results;
}

function displayRecommendations() {
    recommendationsGrid.innerHTML = '';
    
    recommendations.forEach(track => {
        const card = document.createElement('div');
        card.className = 'track-card';
        card.innerHTML = `
            <img src="${track.album.images[0]?.url || 'placeholder.png'}" alt="${track.name}">
            <h3>${track.name}</h3>
            <p>${track.artists[0].name}</p>
        `;
        card.addEventListener('click', () => {
            window.open(track.external_urls.spotify, '_blank');
        });
        recommendationsGrid.appendChild(card);
    });
    
    resultsSection.classList.remove('hidden');
}

createPlaylistBtn.addEventListener('click', async () => {
    loading.classList.remove('hidden');
    
    try {
        const userResponse = await fetch('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const userData = await userResponse.json();
        
        const playlistResponse = await fetch(`https://api.spotify.com/v1/users/${userData.id}/playlists`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: `Recomendaciones ${new Date().toLocaleDateString()}`,
                description: 'Generado por Music Recommender PWA',
                public: false
            })
        });
        const playlist = await playlistResponse.json();
        
        const trackUris = recommendations.map(t => t.uri);
        await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ uris: trackUris })
        });
        
        alert('¡Playlist creada exitosamente en Spotify!');
        window.open(playlist.external_urls.spotify, '_blank');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al crear la playlist');
    } finally {
        loading.classList.add('hidden');
    }
});

checkForToken();
