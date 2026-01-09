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
import { useShowStorage } from './useShowStorage';

const STORAGE_KEY = 'show-tracker-notifications';
const CHECK_INTERVAL = 20 * 60 * 1000; // 20 menit
const LAST_CHECK_KEY = 'last-notification-check';

export function useNotifications() {
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

            // Merge dengan notifikasi yang sudah ada
            const allNotifs = [...upcomingNotifs, ...unwatchedNotifs, ...inactiveNotifs];

            // Cek notifikasi baru yang belum pernah ditampilkan
            const existingIds = new Set(notifications.map((n) => n.id));
            const newNotifs = allNotifs.filter((n) => !existingIds.has(n.id));

            // Show browser notification untuk notifikasi baru
            if (permissionGranted && newNotifs.length > 0) {
                newNotifs.forEach((notif) => {
                    const title = notif.showName;
                    const body = notif.episodeInfo
                        ? `S${notif.episodeInfo.season}E${notif.episodeInfo.episode} - ${notif.message}`
                        : notif.message;

                    showBrowserNotification(title, {
                        body,
                        tag: notif.id, // Prevent duplicate notifications
                        requireInteraction: false, // Auto dismiss after beberapa detik
                        data: { notificationId: notif.id, showId: notif.showId },
                    });
                });
            }

            setNotifications((prev) => mergeNotifications(prev, allNotifs));

            // Update last check time
            localStorage.setItem(LAST_CHECK_KEY, new Date().toISOString());
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    }, [getShows, lastWatchedDates, notifications, permissionGranted]);

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