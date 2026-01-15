// Request permission dari user
export async function requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
        // console.log('Browser tidak support notifications');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
}

// Show browser notification
export async function showBrowserNotification(
    title: string,
    options?: {
        body?: string;
        icon?: string;
        badge?: string;
        tag?: string;
        data?: unknown;
        requireInteraction?: boolean;
    }
): Promise<Notification | null> {
    if (Notification.permission !== 'granted') {
        return null;
    }

    const notificationOptions: NotificationOptions & { vibrate?: number[] } = {
        icon: '/android-chrome-192x192.png',
        badge: '/favicon-32x32.png',
        vibrate: [100, 50, 100],
        ...options,
    };

    try {
        // Coba gunakan Service Worker jika tersedia (Wajib untuk mobile)
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            if (registration) {
                await registration.showNotification(title, notificationOptions);
                return null; // Return null karena tidak menggunakan constructor Notification
            }
        }

        // Fallback untuk desktop browser biasa
        const notification = new Notification(title, notificationOptions);

        // Handle click notification
        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        return notification;
    } catch (error) {
        console.error('Error showing notification:', error);
        return null;
    }
}

// Check permission status
export function getNotificationPermission(): NotificationPermission {
    if (!('Notification' in window)) {
        return 'denied';
    }
    return Notification.permission;
}
