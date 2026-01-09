// Request permission dari user
export async function requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
        console.log('Browser tidak support notifications');
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
export function showBrowserNotification(
    title: string,
    options?: {
        body?: string;
        icon?: string;
        badge?: string;
        tag?: string;
        data?: unknown;
        requireInteraction?: boolean;
    }
): Notification | null {
    if (Notification.permission !== 'granted') {
        console.log('Notification permission belum diberikan');
        return null;
    }

    try {
        const notification = new Notification(title, {
            icon: '/icon-192x192.png',
            badge: '/icon-72x72.png',
            ...options,
        });

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
