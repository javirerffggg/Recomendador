class UIManager {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'dark';
        this.audioPlayer = document.getElementById('audio-player');
        this.currentPlayingBtn = null;
        this.lazyLoadObserver = null;
        this.initLazyLoading();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.setupThemeToggle();
        this.setupAudioPlayer();
    }

    // Theme Management
    setupThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        themeToggle.addEventListener('click', () => {
            this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
            this.applyTheme(this.currentTheme);
            localStorage.setItem('theme', this.currentTheme);
        });
    }

    applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        const themeToggle = document.getElementById('theme-toggle');
        themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    }

    // Toast Notifications
    showToast(message, type = 'info', duration = 4000) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        toast.innerHTML = `
            <span class="toast-icon">${icons[type]}</span>
            <div class="toast-content">
                <p>${message}</p>
            </div>
            <button class="toast-close">×</button>
        `;
        
        container.appendChild(toast);
        
        // Auto remove
        const timeout = setTimeout(() => {
            this.removeToast(toast);
        }, duration);
        
        // Manual close
        toast.querySelector('.toast-close').addEventListener('click', () => {
            clearTimeout(timeout);
            this.removeToast(toast);
        });
    }

    removeToast(toast) {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }

    // Loading Overlay
    showLoading(message = 'Cargando...') {
        const loading = document.getElementById('loading');
        const loadingText = document.getElementById('loading-text');
        loadingText.textContent = message;
        loading.classList.remove('hidden');
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        loading.classList.add('hidden');
    }

    // Section Management
    showSection(sectionId) {
        document.querySelectorAll('.card').forEach(section => {
            if (section.id === sectionId) {
                section.classList.remove('hidden');
            }
        });
    }

    hideSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) section.classList.add('hidden');
    }

    hideAllSections() {
        document.querySelectorAll('.card').forEach(section => {
            section.classList.add('hidden');
        });
    }

    // Platform Display
    displayPlaylists(playlists, onSelect) {
        const grid = document.getElementById('playlists-grid');
        grid.innerHTML = '';
        
        if (playlists.length === 0) {
            grid.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">No se encontraron playlists</p>';
            return;
        }
        
        playlists.forEach(playlist => {
            const card = document.createElement('div');
            card.className = 'playlist-card';
            card.innerHTML = `
                <img src="${playlist.image || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23333" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999" font-family="sans-serif" font-size="40"%3E♪%3C/text%3E%3C/svg%3E'}" alt="${playlist.name}">
                <h3>${playlist.name}</h3>
                <p>${playlist.tracks_count || playlist.description || ''} canciones</p>
            `;
            
            card.addEventListener('click', () => onSelect(playlist));
            grid.appendChild(card);
        });
    }

    // Tracks Selection (Seeds)
    displayTracksForSelection(tracks, onConfirm) {
        const tracksList = document.getElementById('tracks-list');
        const confirmBtn = document.getElementById('confirm-seeds-btn');
        const seedsCount = document.getElementById('seeds-count');
        
        tracksList.innerHTML = '';
        const selectedSeeds = new Set();
        
        tracks.forEach(track => {
            const item = document.createElement('div');
            item.className = 'track-item';
            item.dataset.trackId = track.id;
            
            item.innerHTML = `
                <img src="${track.image || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50"%3E%3Crect fill="%23333" width="50" height="50"/%3E%3C/svg%3E'}" alt="${track.name}">
                <div class="track-info">
                    <h4>${track.name}</h4>
                    <p>${track.artist}</p>
                </div>
                <div class="track-checkbox"></div>
            `;
            
            item.addEventListener('click', () => {
                if (selectedSeeds.has(track.id)) {
                    selectedSeeds.delete(track.id);
                    item.classList.remove('selected');
                } else if (selectedSeeds.size < 5) {
                    selectedSeeds.add(track.id);
                    item.classList.add('selected');
                } else {
                    this.showToast('Máximo 5 canciones', 'warning');
                }
                
                seedsCount.textContent = selectedSeeds.size;
                confirmBtn.disabled = selectedSeeds.size === 0;
            });
            
            tracksList.appendChild(item);
        });
        
        confirmBtn.onclick = () => {
            const selected = tracks.filter(t => selectedSeeds.has(t.id));
            onConfirm(selected);
        };
    }

    // Filters Setup
    setupFilters(onGenerate) {
        const sliders = {
            energy: document.getElementById('energy-slider'),
            danceability: document.getElementById('danceability-slider'),
            popularity: document.getElementById('popularity-slider'),
            instrumentalness: document.getElementById('instrumentalness-slider'),
            limit: document.getElementById('limit-slider')
        };
        
        // Update values
        Object.entries(sliders).forEach(([key, slider]) => {
            const valueSpan = document.getElementById(`${key}-value`);
            slider.addEventListener('input', () => {
                valueSpan.textContent = slider.value;
            });
        });
        
        // Generate button
        const generateBtn = document.getElementById('generate-btn');
        generateBtn.onclick = () => {
            const filters = {
                energy: parseFloat(sliders.energy.value),
                danceability: parseFloat(sliders.danceability.value),
                popularity: parseInt(sliders.popularity.value),
                instrumentalness: parseFloat(sliders.instrumentalness.value),
                limit: parseInt(sliders.limit.value)
            };
            onGenerate(filters);
        };
    }

    // Display Recommendations
    displayRecommendations(recommendations, platform) {
        const grid = document.getElementById('recommendations-grid');
        grid.innerHTML = '';
        
        recommendations.forEach((track, index) => {
            const card = document.createElement('div');
            card.className = 'track-card';
            card.style.animationDelay = `${index * 0.05}s`;
            
            card.innerHTML = `
                <img data-src="${track.image}" alt="${track.name}" class="lazy-load">
                <h3>${track.name}</h3>
                <p>${track.artist}</p>
                <div class="track-actions">
                    ${track.preview_url ? `<button class="play-btn" data-preview="${track.preview_url}">▶</button>` : ''}
                    <button class="link-btn" data-url="${track.external_url}">🔗</button>
                </div>
            `;
            
            // Play button
            const playBtn = card.querySelector('.play-btn');
            if (playBtn) {
                playBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleAudio(playBtn, track.preview_url);
                });
            }
            
            // Link button
            const linkBtn = card.querySelector('.link-btn');
            linkBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.open(track.external_url, '_blank');
            });
            
            grid.appendChild(card);
        });
        
        // Trigger lazy loading
        this.observeLazyImages();
    }

    // Audio Player
    setupAudioPlayer() {
        this.audioPlayer.addEventListener('ended', () => {
            if (this.currentPlayingBtn) {
                this.currentPlayingBtn.textContent = '▶';
                this.currentPlayingBtn.classList.remove('playing');
                this.currentPlayingBtn = null;
            }
        });
    }

    toggleAudio(button, url) {
        if (this.currentPlayingBtn === button) {
            // Pause current
            this.audioPlayer.pause();
            button.textContent = '▶';
            button.classList.remove('playing');
            this.currentPlayingBtn = null;
        } else {
            // Stop previous
            if (this.currentPlayingBtn) {
                this.currentPlayingBtn.textContent = '▶';
                this.currentPlayingBtn.classList.remove('playing');
            }
            
            // Play new
            this.audioPlayer.src = url;
            this.audioPlayer.play().catch(err => {
                console.error('Error playing audio:', err);
                this.showToast('No se pudo reproducir la vista previa', 'error');
            });
            
            button.textContent = '⏸';
            button.classList.add('playing');
            this.currentPlayingBtn = button;
        }
    }

    // Lazy Loading Images
    initLazyLoading() {
        if ('IntersectionObserver' in window) {
            this.lazyLoadObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.add('loaded');
                        this.lazyLoadObserver.unobserve(img);
                    }
                });
            }, {
                rootMargin: '50px'
            });
        }
    }

    observeLazyImages() {
        if (this.lazyLoadObserver) {
            document.querySelectorAll('img.lazy-load').forEach(img => {
                this.lazyLoadObserver.observe(img);
            });
        } else {
            // Fallback for browsers without IntersectionObserver
            document.querySelectorAll('img.lazy-load').forEach(img => {
                img.src = img.dataset.src;
                img.classList.add('loaded');
            });
        }
    }

    // History Display
    displayHistory(historyItems, onLoad, onDelete) {
        const historyList = document.getElementById('history-list');
        historyList.innerHTML = '';
        
        if (historyItems.length === 0) {
            historyList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No hay historial aún</p>';
            return;
        }
        
        historyItems.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            
            const date = new Date(item.timestamp);
            const formattedDate = date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            historyItem.innerHTML = `
                <div class="history-info">
                    <h3>${item.playlistName}</h3>
                    <p>${formattedDate} • ${item.recommendations.length} canciones • ${item.platform}</p>
                </div>
                <div class="history-actions">
                    <button class="btn-icon-text load-history" data-id="${item.id}">
                        <span>📂</span>
                        <span>Cargar</span>
                    </button>
                    <button class="btn-icon-text delete-history" data-id="${item.id}">
                        <span>🗑️</span>
                        <span>Eliminar</span>
                    </button>
                </div>
            `;
            
            historyItem.querySelector('.load-history').addEventListener('click', () => onLoad(item));
            historyItem.querySelector('.delete-history').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('¿Eliminar este historial?')) {
                    onDelete(item.id);
                }
            });
            
            historyList.appendChild(historyItem);
        });
    }

    // Button Loading State
    setButtonLoading(button, loading) {
        if (loading) {
            button.disabled = true;
            button.classList.add('loading');
            button.dataset.originalText = button.textContent;
            button.innerHTML = `<span class="btn-icon">⏳</span><span>${button.dataset.originalText}...</span>`;
        } else {
            button.disabled = false;
            button.classList.remove('loading');
            button.textContent = button.dataset.originalText;
        }
    }
}

// Export functions for external use
export const uiManager = new UIManager();
export const showToast = (msg, type, duration) => uiManager.showToast(msg, type, duration);
export const showLoading = (msg) => uiManager.showLoading(msg);
export const hideLoading = () => uiManager.hideLoading();
export default uiManager;
