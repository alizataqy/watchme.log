import { useState, useEffect, useCallback } from 'react';
import { Notification } from '@/types/show';
import {
    detectUpcomingEpisodes,
    detectUnwatchedEpisodes,
    detectInactiveSeries,
    mergeNotifications,
} from '@/services/notification';
import {
    requestNotificationPermission,
    showBrowserNotification,
} from '@/services/browserNotification';
import { checkNotificationExists, saveNotification } from '@/services/notificationDb';
import { useShowStorage } from './useShowStorage';
import { useAuth } from '@/hooks/useAuth';

const STORAGE_KEY = 'show-tracker-notifications';
const CHECK_INTERVAL = 20 * 60 * 1000; // 20 menit
const LAST_CHECK_KEY = 'last-notification-check';

export function useNotifications() {
    const { user } = useAuth();
    const { getShows, lastWatchedDates } = useShowStorage();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [permissionGranted, setPermissionGranted] = useState(false);

    // Request permission saat pertama kali load
    useEffect(() => {
        requestNotificationPermission().then(setPermissionGranted);
    }, []);

    // Load dari localStorage saat mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setNotifications(parsed);
            } catch (error) {
                console.error('Error loading notifications:', error);
            }
        }
    }, []);

    // Save ke localStorage setiap kali berubah
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
        setUnreadCount(notifications.filter((n) => !n.read).length);
    }, [notifications]);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;

        try {
            const trackedShows = await getShows();

            // Deteksi upcoming episodes
            const upcomingNotifs = detectUpcomingEpisodes(trackedShows);

            // Deteksi unwatched episodes
            const unwatchedNotifs = detectUnwatchedEpisodes(trackedShows);

            // Deteksi inactive series (15+ hari tidak menonton)
            const lastWatchedMap = new Map<number, Date>(
                Object.entries(lastWatchedDates).map(([showId, date]) => [Number(showId), date])
            );
            const inactiveNotifs = detectInactiveSeries(trackedShows, lastWatchedMap);

            // Merge semua notifikasi
            const allNotifs = [...upcomingNotifs, ...unwatchedNotifs, ...inactiveNotifs];

            // Filter notifikasi: cek database untuk prevent duplicate
            const newNotifs: Notification[] = [];
            for (const notif of allNotifs) {
                // Check di database apakah sudah pernah dikirim
                const exists = await checkNotificationExists(user.id, notif.uniqueKey);
                if (!exists) {
                    newNotifs.push(notif);
                }
            }

            // Show browser notification untuk notifikasi baru
            if (permissionGranted && newNotifs.length > 0) {
                for (const notif of newNotifs) {
                    const title = notif.showName;
                    const body = notif.episodeInfo
                        ? `S${notif.episodeInfo.season}E${notif.episodeInfo.episode} - ${notif.message}`
                        : notif.message;

                    showBrowserNotification(title, {
                        body,
                        tag: notif.uniqueKey,
                        requireInteraction: false,
                        data: { notificationId: notif.id, showId: notif.showId },
                    });

                    // Save ke database setelah berhasil kirim
                    await saveNotification(user.id, {
                        ...notif,
                        sentAt: new Date().toISOString(),
                    });
                }
            }

            // Merge dengan localStorage (untuk quick access)
            setNotifications((prev) => mergeNotifications(prev, newNotifs));

            // Update last check time
            localStorage.setItem(LAST_CHECK_KEY, new Date().toISOString());
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    }, [getShows, lastWatchedDates, notifications, permissionGranted, user]);

    const markAsRead = useCallback((notificationId: string) => {
        setNotifications((prev) =>
            prev.map((notif) =>
                notif.id === notificationId ? { ...notif, read: true } : notif
            )
        );
    }, []);

    const markAllAsRead = useCallback(() => {
        setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
    }, []);

    const clearNotification = useCallback((notificationId: string) => {
        setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
    }, []);

    const clearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    // Auto-fetch saat mount dan set interval
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, CHECK_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    return {
        notifications,
        unreadCount,
        permissionGranted,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAll,
        refresh: fetchNotifications,
        requestPermission: () => requestNotificationPermission().then(setPermissionGranted),
    };
}