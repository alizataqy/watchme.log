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
import { checkNotificationExists, saveNotification, getRecentNotifications, markNotificationAsRead, dismissNotification } from '@/services/notificationDb';
import { useShowStorage } from './useShowStorage';
import { useAuth } from '@/hooks/useAuth';
import { getShowDetails } from '@/services/tvmaze';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'show-tracker-notifications';
const CHECK_INTERVAL = 20 * 60 * 1000; // 20 menit
const LAST_CHECK_KEY = 'last-notification-check';

export function useNotifications() {
    const { user } = useAuth();
    const { getShows, lastWatchedDates, watchedEpisodes } = useShowStorage();
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

    const loadNotificationsFromDb = useCallback(async () => {
        if (!user) return;

        try {
            // Get recent notifications from database (last 7 days)
            const dbNotifications = await getRecentNotifications(user.id);

            // Set notifications from DB (DB is source of truth for persistence)
            setNotifications(dbNotifications);
        } catch (error) {
            console.error('Error loading notifications from database:', error);
        }
    }, [user]);

    // Load from database on mount
    useEffect(() => {
        if (user) {
            loadNotificationsFromDb();
        }
    }, [user, loadNotificationsFromDb]);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;

        // console.log('🔔 Starting notification check...');
        try {
            const trackedShows = await getShows();
            // console.log(`📋 Tracked shows found: ${trackedShows.length}`);

            // Enrich watching shows with fresh data from TVMaze to get latest episode info
            const watchingShows = trackedShows.filter(s => s.trackStatus === 'watching');
            // console.log(`👀 Watching shows to check: ${watchingShows.length}`);

            // Parallel fetch (browser limits concurrency automatically)
            const enrichedShows = await Promise.all(
                trackedShows.map(async (show) => {
                    if (show.trackStatus === 'watching' && (show.source === 'tvmaze' || !show.source)) {
                        try {
                            const details = await getShowDetails(show.id, false);
                            if (details) {
                                // console.log(`✅ Refreshed data for: ${show.name}`, details._embedded?.nextepisode);
                                return { ...show, ...details };
                            }
                        } catch (e) {
                            console.error(`Failed to refresh show ${show.name}`, e);
                        }
                    }
                    return show;
                })
            );

            // Deteksi upcoming episodes
            const upcomingNotifs = detectUpcomingEpisodes(enrichedShows, user.id);
            // console.log(`📅 Upcoming notifications found: ${upcomingNotifs.length}`);

            // Deteksi unwatched episodes
            // Transform watchedEpisodes (Record<string, ...>) to Map<number, Set<string>> for the service
            const watchedMap = new Map<number, Set<string>>();
            Object.entries(watchedEpisodes).forEach(([key, episodes]) => {
                // key is likely dbId, we need showId. But detectUnwatchedEpisodes expects map by showId.
                // Wait, useShowStorage returns watchedEpisodes as Record<tracked_show_id (dbId), ...>
                // But detectUnwatchedEpisodes typically needs show.id (api id).
                // Let's check how detectUnwatchedEpisodes uses it.
                // It uses watchedEpisodes.get(show.id).
                // So we need to map from DB ID to Show ID.
                // However, we can also iterate enrichedShows to build the map.
                const show = enrichedShows.find(s => s.dbId === key);
                if (show) {
                    const epSet = new Set(episodes.map(e => `S${e.season}E${e.episode}`));
                    watchedMap.set(show.id, epSet);
                }
            });

            const unwatchedNotifs = detectUnwatchedEpisodes(enrichedShows, user.id, watchedMap);
            // console.log(`📺 Unwatched notifications found: ${unwatchedNotifs.length}`);

            // Deteksi inactive series (15+ hari tidak menonton)
            const lastWatchedMap = new Map<number, Date>(
                Object.entries(lastWatchedDates).map(([showId, date]) => [Number(showId), date])
            );
            const inactiveNotifs = detectInactiveSeries(trackedShows, user.id, lastWatchedMap);

            // Merge semua notifikasi
            const allNotifs = [...upcomingNotifs, ...unwatchedNotifs, ...inactiveNotifs];
            // console.log(`🔔 Total notifications detected: ${allNotifs.length}`);

            // Filter notifikasi: cek database untuk prevent duplicate
            const newNotifs: Notification[] = [];
            for (const notif of allNotifs) {
                // Check di database apakah sudah pernah dikirim
                const exists = await checkNotificationExists(user.id, notif.uniqueKey);
                // console.log(`🔍 Checking DB for ${notif.uniqueKey}: ${exists ? 'Exists' : 'New'}`);
                if (!exists) {
                    newNotifs.push(notif);

                    // Always save to DB regardless of browser permission
                    await saveNotification(user.id, {
                        ...notif,
                        sentAt: new Date().toISOString(),
                    });
                }
            }

            // Show browser notification untuk notifikasi baru (jika diizinkan)
            if (permissionGranted && newNotifs.length > 0) {
                for (const notif of newNotifs) {
                    const title = notif.showName;
                    const body = notif.episodeInfo
                        ? `S${notif.episodeInfo.season}E${notif.episodeInfo.episode} - ${notif.message}`
                        : notif.message;

                    // Don't await this to speed up processing? 
                    // Better await to ensure sequential appearing if many.
                    await showBrowserNotification(title, {
                        body,
                        tag: notif.uniqueKey,
                        requireInteraction: false,
                        data: { notificationId: notif.id, showId: notif.showId },
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
    }, [getShows, lastWatchedDates, permissionGranted, user, watchedEpisodes]);

    const markAsRead = useCallback(async (notificationId: string) => {
        // Find the notification in our state to get the uniqueKey
        const notification = notifications.find(n => n.id === notificationId);
        if (notification && user) {
            // Update in database
            await markNotificationAsRead(user.id, notification.uniqueKey);
            // Reload from database to sync state
            await loadNotificationsFromDb();
        }
    }, [notifications, user, loadNotificationsFromDb]);

    const markAllAsRead = useCallback(async () => {
        if (!user) return;
        // Mark all notifications as read in the database
        for (const notif of notifications.filter(n => !n.read)) {
            await markNotificationAsRead(user.id, notif.uniqueKey);
        }
        // Reload from database to sync state
        await loadNotificationsFromDb();
    }, [notifications, user, loadNotificationsFromDb]);

    const clearNotification = useCallback(async (notificationId: string) => {
        const notification = notifications.find(n => n.id === notificationId);
        if (notification && user) {
            // Mark as dismissed in database
            await dismissNotification(user.id, notification.uniqueKey);
            // Reload from database to sync state
            await loadNotificationsFromDb();
        }
    }, [notifications, user, loadNotificationsFromDb]);

    const clearAll = useCallback(async () => {
        if (!user) return;
        // Mark all notifications as dismissed in the database
        for (const notif of notifications) {
            await dismissNotification(user.id, notif.uniqueKey);
        }
        // Reload from database to sync state
        await loadNotificationsFromDb();
    }, [notifications, user, loadNotificationsFromDb]);

    // Auto-fetch saat mount dan set interval
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, CHECK_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    // Realtime subscription for notification_logs changes
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel(`notification-changes-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notification_logs',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    // console.log('🔔 Realtime notification change:', payload);
                    // Reload notifications from database whenever there's any change
                    loadNotificationsFromDb();
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    // console.log('✅ Notification realtime connected');
                } else if (status === 'CHANNEL_ERROR') {
                    // console.error('❌ Notification realtime connection error');
                } else if (status === 'TIMED_OUT') {
                    // console.warn('⏰ Notification realtime subscription timed out');
                }
            });

        return () => {
            // console.log('Cleaning up notification realtime subscription');
            supabase.removeChannel(channel);
        };
    }, [user?.id, loadNotificationsFromDb]);

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