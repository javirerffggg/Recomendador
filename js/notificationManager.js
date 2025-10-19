import { CONFIG } from './config.js';
import { showToast } from './uiManager.js';

class NotificationManager {
    constructor() {
        this.permission = Notification.permission;
        this.registration = null;
    }

    async init() {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            try {
                this.registration = await navigator.serviceWorker.ready;
            } catch (error) {
                console.error('Service Worker not ready:', error);
            }
        }
    }

    async requestPermission() {
        if (!('Notification' in window)) {
            showToast('Tu navegador no soporta notificaciones', 'warning');
            return false;
        }

        if (this.permission === 'granted') {
            showToast('Las notificaciones ya están activadas', 'info');
            return true;
        }

        if (this.permission === 'denied') {
            showToast('Has bloqueado las notificaciones. Actívalas en la configuración del navegador', 'warning');
            return false;
        }

        try {
            this.permission = await Notification.requestPermission();
            
            if (this.permission === 'granted') {
                showToast('¡Notificaciones activadas!', 'success');
                await this.subscribeToPush();
                return true;
            } else {
                showToast('Notificaciones denegadas', 'info');
                return false;
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return false;
        }
    }

    async subscribeToPush() {
        if (!this.registration) {
            await this.init();
        }

        try {
            const subscription = await this.registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(CONFIG.vapidPublicKey)
            });

            // Aquí enviarías la suscripción a tu servidor
            console.log('Push subscription:', subscription);
            localStorage.setItem('push_subscription', JSON.stringify(subscription));
            
            return subscription;
        } catch (error) {
            console.error('Error subscribing to push:', error);
        }
    }

    async showNotification(title, options = {}) {
        if (this.permission !== 'granted') {
            console.log('Notification permission not granted');
            return;
        }

        const defaultOptions = {
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            vibrate: [200, 100, 200],
            ...options
        };

        if (this.registration) {
            await this.registration.showNotification(title, defaultOptions);
        } else {
            new Notification(title, defaultOptions);
        }
    }

    async notifyPlaylistCreated(playlistName, playlistUrl) {
        await this.showNotification('🎉 ¡Playlist Creada!', {
            body: `Tu playlist "${playlistName}" está lista`,
            tag: 'playlist-created',
            data: { url: playlistUrl },
            actions: [
                { action: 'open', title: 'Abrir Playlist' },
                { action: 'close', title: 'Cerrar' }
            ]
        });
    }

    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
}

export default new NotificationManager();
