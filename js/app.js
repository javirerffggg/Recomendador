import { CONFIG } from './config.js';
import spotifyAPI from './spotifyAPI.js';
import tidalAPI from './tidalAPI.js';
import uiManager, { showToast, showLoading, hideLoading } from './uiManager.js';
import fileParser from './fileParser.js';
import historyManager from './historyManager.js';
import shareManager from './shareManager.js';
import notificationManager from './notificationManager.js';

class MusicRecommenderApp {
    constructor() {
        this.currentPlatform = 'spotify';
        this.currentAPI = spotifyAPI;
        this.selectedSeeds = [];
        this.currentRecommendations = [];
        this.filters = {
            energy: 0.5,
            danceability: 0.5,
            popularity: 50,
            instrumentalness: 0.5,
            limit: 20
        };
    }

    async init() {
        // Initialize UI
        uiManager.init();
        await notificationManager.init();
        
        // Check for shared recommendations
        const sharedRecs = shareManager.loadSharedRecommendations();
        if (sharedRecs) {
            this.currentRecommendations = sharedRecs;
            uiManager.hideAllSections();
            uiManager.showSection('results-section');
            uiManager.displayRecommendations(sharedRecs, 'spotify');
            return;
        }
        
        // Setup event listeners
        this.setupPlatformSelector();
        this.setupAuthButton();
        this.setupMethodSelector();
        this.setupFileUpload();
        this.setupHistoryButton();
        this.setupNotificationsButton();
        this.setupShareButton();
        this.setupCreatePlaylistButton();
        uiManager.setupFilters(this.onGenerateRecommendations.bind(this));
        
        // Check authentication
        await this.checkAuthentication();
    }

    setupPlatformSelector() {
        const platformBtns = document.querySelectorAll('.platform-btn');
        
        platformBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                platformBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                this.currentPlatform = btn.dataset.platform;
                this.currentAPI = this.currentPlatform === 'spotify' ? spotifyAPI : tidalAPI;
                
                document.getElementById('platform-name').textContent = 
                    this.currentPlatform === 'spotify' ? 'Spotify' : 'Tidal';
                
                // Update theme color
                document.documentElement.style.setProperty(
                    '--primary-color',
                    this.currentPlatform === 'spotify' ? '#1DB954' : '#00FFFF'
                );
            });
        });
    }

    setupAuthButton() {
        const loginBtn = document.getElementById('login-btn');
        loginBtn.addEventListener('click', () => {
            this.currentAPI.login();
        });
    }

    async checkAuthentication() {
        const isAuthenticated = await this.currentAPI.checkToken();
        
        if (isAuthenticated) {
            uiManager.hideSection('auth-section');
            uiManager.hideSection('platform-section');
            uiManager.showSection('method-section');
            showToast(`¡Conectado a ${this.currentPlatform}!`, 'success');
        }
    }

    setupMethodSelector() {
        const importBtn = document.getElementById('method-import');
        const uploadBtn = document.getElementById('method-upload');
        
        importBtn.addEventListener('click', async () => {
            document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
            importBtn.classList.add('active');
            
            uiManager.hideSection('upload-section');
            uiManager.showSection('import-section');
            
            await this.loadUserPlaylists();
        });
        
        uploadBtn.addEventListener('click', () => {
            document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
            uploadBtn.classList.add('active');
            
            uiManager.hideSection('import-section');
            uiManager.showSection('upload-section');
        });
    }

    async loadUserPlaylists() {
        try {
            const playlists = await this.currentAPI.getUserPlaylists();
            
            uiManager.displayPlaylists(playlists, async (playlist) => {
                await this.onPlaylistSelected(playlist);
            });
        } catch (error) {
            console.error('Error loading playlists:', error);
            showToast('Error al cargar las playlists', 'error');
        }
    }

    async onPlaylistSelected(playlist) {
        try {
            const tracks = await this.currentAPI.getPlaylistTracks(playlist.id);
            
            if (tracks.length === 0) {
                showToast('Esta playlist está vacía', 'warning');
                return;
            }
            
            uiManager.hideSection('import-section');
            uiManager.hideSection('method-section');
            uiManager.showSection('seeds-section');
            
            uiManager.displayTracksForSelection(tracks, (selectedSeeds) => {
                this.selectedSeeds = selectedSeeds;
                this.onSeedsConfirmed();
            });
        } catch (error) {
            console.error('Error loading playlist tracks:', error);
            showToast('Error al cargar las canciones', 'error');
        }
    }

    setupFileUpload() {
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('file-input');
        
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
            this.handleFile(e.dataTransfer.files[0]);
        });
        
        fileInput.addEventListener('change', (e) => {
            this.handleFile(e.target.files[0]);
        });
    }

    async handleFile(file) {
        if (!file) return;
        
        showLoading('Procesando archivo...');
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            const parsedTracks = fileParser.parseFile(e.target.result, file.name);
            
            if (parsedTracks.length === 0) {
                hideLoading();
                showToast('No se encontraron canciones en el archivo', 'error');
                return;
            }
            
            // Search tracks on the platform
            const foundTracks = await this.currentAPI.searchTracks(parsedTracks);
            hideLoading();
            
            if (foundTracks.length === 0) {
                showToast('No se encontraron canciones en la plataforma', 'error');
                return;
            }
            
            uiManager.hideSection('upload-section');
            uiManager.hideSection('method-section');
            uiManager.showSection('seeds-section');
            
            uiManager.displayTracksForSelection(foundTracks, (selectedSeeds) => {
                this.selectedSeeds = selectedSeeds;
                this.onSeedsConfirmed();
            });
        };
        
        reader.readAsText(file);
    }

    onSeedsConfirmed() {
        uiManager.hideSection('seeds-section');
        uiManager.showSection('filters-section');
    }

    async onGenerateRecommendations(filters) {
        this.filters = filters;
        
        try {
            this.currentRecommendations = await this.currentAPI.getRecommendations(
                this.selectedSeeds,
                filters,
                filters.limit
            );
            
            if (this.currentRecommendations.length === 0) {
                showToast('No se encontraron recomendaciones', 'warning');
                return;
            }
            
            // Save to history
            await historyManager.saveRecommendations({
                platform: this.currentPlatform,
                seedTracks: this.selectedSeeds,
                filters: filters,
                recommendations: this.currentRecommendations,
                playlistName: `Recomendaciones ${new Date().toLocaleDateString()}`
            });
            
            uiManager.hideSection('filters-section');
            uiManager.showSection('results-section');
            uiManager.displayRecommendations(this.currentRecommendations, this.currentPlatform);
            
            showToast(`¡${this.currentRecommendations.length} recomendaciones generadas!`, 'success');
        } catch (error) {
            console.error('Error generating recommendations:', error);
            showToast('Error al generar recomendaciones', 'error');
        }
    }

    setupHistoryButton() {
        const historyBtn = document.getElementById('history-btn');
        const historySection = document.getElementById('history-section');
        
        historyBtn.addEventListener('click', async () => {
            if (historySection.classList.contains('hidden')) {
                const history = await historyManager.getAllHistory();
                
                uiManager.displayHistory(
                    history,
                    (item) => this.loadHistoryItem(item),
                    async (id) => {
                        await historyManager.deleteHistory(id);
                        historyBtn.click(); // Refresh
                        showToast('Historial eliminado', 'success');
                    }
                );
                
                historySection.classList.remove('hidden');
            } else {
                historySection.classList.add('hidden');
            }
        });
    }

    loadHistoryItem(item) {
        this.selectedSeeds = item.seedTracks;
        this.filters = item.filters;
        this.currentRecommendations = item.recommendations;
        this.currentPlatform = item.platform;
        
        uiManager.hideAllSections();
        uiManager.showSection('results-section');
        uiManager.displayRecommendations(item.recommendations, item.platform);
        
        document.getElementById('history-section').classList.add('hidden');
        showToast('Historial cargado', 'success');
    }

    setupNotificationsButton() {
        const notifBtn = document.getElementById('notifications-btn');
        notifBtn.addEventListener('click', async () => {
            await notificationManager.requestPermission();
        });
    }

    setupShareButton() {
        const shareBtn = document.getElementById('share-btn');
        shareBtn.addEventListener('click', async () => {
            if (this.currentRecommendations.length === 0) {
                showToast('No hay recomendaciones para compartir', 'warning');
                return;
            }
            
            await shareManager.shareRecommendations(
                this.currentRecommendations,
                this.currentPlatform
            );
        });
    }

    setupCreatePlaylistButton() {
        const createBtn = document.getElementById('create-playlist-btn');
        
        createBtn.addEventListener('click', async () => {
            if (this.currentRecommendations.length === 0) {
                showToast('No hay recomendaciones para guardar', 'warning');
                return;
            }
            
            uiManager.setButtonLoading(createBtn, true);
            
            try {
                const playlistName = `Recomendaciones ${new Date().toLocaleDateString()}`;
                const playlist = await this.currentAPI.createPlaylist(
                    playlistName,
                    this.currentRecommendations
                );
                
                if (playlist) {
                    showToast('¡Playlist creada exitosamente!', 'success');
                    
                    // Send notification
                    await notificationManager.notifyPlaylistCreated(
                        playlistName,
                        playlist.external_urls?.spotify || playlist.url
                    );
                    
                    // Open playlist
                    setTimeout(() => {
                        window.open(
                            playlist.external_urls?.spotify || playlist.url,
                            '_blank'
                        );
                    }, 500);
                }
            } catch (error) {
                console.error('Error creating playlist:', error);
                showToast('Error al crear la playlist', 'error');
            } finally {
                uiManager.setButtonLoading(createBtn, false);
            }
        });
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new MusicRecommenderApp();
    app.init();
});

// Register Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(registration => {
            console.log('Service Worker registered:', registration);
            
            // Handle notification clicks
            navigator.serviceWorker.addEventListener('message', event => {
                if (event.data.action === 'notification-click') {
                    window.open(event.data.url, '_blank');
                }
            });
        })
        .catch(error => {
            console.error('Service Worker registration failed:', error);
        });
}
