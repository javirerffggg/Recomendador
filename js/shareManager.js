import { CONFIG } from './config.js';
import { showToast } from './uiManager.js';

class ShareManager {
    async shareRecommendations(recommendations, platform) {
        // Usar Web Share API si está disponible
        if (navigator.share) {
            try {
                const text = this.formatRecommendationsText(recommendations);
                await navigator.share({
                    title: 'Mis Recomendaciones Musicales',
                    text: text,
                    url: window.location.href
                });
                showToast('¡Compartido exitosamente!', 'success');
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Error sharing:', error);
                    this.fallbackShare(recommendations);
                }
            }
        } else {
            this.fallbackShare(recommendations);
        }
    }

    formatRecommendationsText(recommendations) {
        let text = '🎵 Mis Recomendaciones Musicales:\n\n';
        recommendations.slice(0, 10).forEach((track, index) => {
            text += `${index + 1}. ${track.name} - ${track.artist}\n`;
        });
        text += '\n✨ Generado con Music Recommender Pro';
        return text;
    }

    async fallbackShare(recommendations) {
        // Generar ID único y guardar en localStorage
        const shareId = this.generateShareId();
        const shareData = {
            id: shareId,
            recommendations: recommendations,
            timestamp: Date.now(),
            expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 días
        };
        
        localStorage.setItem(`share_${shareId}`, JSON.stringify(shareData));
        
        const shareUrl = `${CONFIG.shareBaseUrl}${shareId}`;
        
        // Copiar al portapapeles
        try {
            await navigator.clipboard.writeText(shareUrl);
            showToast('¡Enlace copiado al portapapeles!', 'success');
            
            // Mostrar modal con el enlace
            this.showShareModal(shareUrl);
        } catch (error) {
            console.error('Error copying to clipboard:', error);
            this.showShareModal(shareUrl);
        }
    }

    generateShareId() {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    }

    showShareModal(url) {
        const modal = document.createElement('div');
        modal.className = 'share-modal';
        modal.innerHTML = `
            <div class="share-modal-content">
                <h3>Compartir Recomendaciones</h3>
                <p>Comparte este enlace con tus amigos:</p>
                <div class="share-url-container">
                    <input type="text" value="${url}" readonly id="share-url-input">
                    <button id="copy-share-url" class="btn-primary">Copiar</button>
                </div>
                <p class="small">Este enlace expirará en 7 días</p>
                <button id="close-share-modal" class="btn-secondary">Cerrar</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add styles dynamically
        const style = document.createElement('style');
        style.textContent = `
            .share-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease;
            }
            .share-modal-content {
                background: var(--card-bg);
                padding: 30px;
                border-radius: 16px;
                max-width: 500px;
                width: 90%;
                text-align: center;
            }
            .share-url-container {
                display: flex;
                gap: 10px;
                margin: 20px 0;
            }
            .share-url-container input {
                flex: 1;
                padding: 12px;
                border: 2px solid var(--text-secondary);
                border-radius: 8px;
                background: var(--bg-color);
                color: var(--text-primary);
                font-family: monospace;
            }
        `;
        document.head.appendChild(style);
        
        // Event listeners
        document.getElementById('copy-share-url').addEventListener('click', async () => {
            const input = document.getElementById('share-url-input');
            input.select();
            await navigator.clipboard.writeText(url);
            showToast('¡Enlace copiado!', 'success');
        });
        
        document.getElementById('close-share-modal').addEventListener('click', () => {
            modal.remove();
            style.remove();
        });
    }

    loadSharedRecommendations() {
        const urlParams = new URLSearchParams(window.location.search);
        const shareId = urlParams.get('share');
        
        if (shareId) {
            const shareData = localStorage.getItem(`share_${shareId}`);
            if (shareData) {
                const data = JSON.parse(shareData);
                
                // Verificar expiración
                if (Date.now() < data.expiresAt) {
                    return data.recommendations;
                } else {
                    localStorage.removeItem(`share_${shareId}`);
                    showToast('Este enlace ha expirado', 'error');
                }
            } else {
                showToast('Enlace no válido', 'error');
            }
        }
        
        return null;
    }
}

export default new ShareManager();
