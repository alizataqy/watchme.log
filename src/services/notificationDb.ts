import { supabase } from '@/integrations/supabase/client';
import { Notification } from '@/types/show';

export interface NotificationLogRow {
    id: string;
    user_id: string;
    notification_type: 'upcoming' | 'unwatched' | 'inactive';
    show_id: number;
    show_name: string;
    message: string;
    episode_info: {
        season: number;
        episode: number;
        episodeName: string;
        airdate: string;
    } | null;
    sent_at: string;
    read_at: string | null;
    dismissed_at: string | null;
    unique_key: string;
    created_at: string;
}

/**
 * Check if notification already exists in database (for duplicate prevention)
 */
export async function checkNotificationExists(
    userId: string,
    uniqueKey: string
): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from('notification_logs')
            .select('id')
            .eq('user_id', userId)
            .eq('unique_key', uniqueKey)
            .maybeSingle();

        if (error) throw error;
        return !!data;
    } catch (error) {
        console.error('Error checking notification existence:', error);
        return false; // Assume not exists if error
    }
}

/**
 * Save notification to database
 */
export async function saveNotification(
    userId: string,
    notification: Notification
): Promise<void> {
    try {
        const { error } = await supabase.from('notification_logs').upsert({
            user_id: userId,
            notification_type: notification.type,
            show_id: notification.showId,
            show_name: notification.showName,
            message: notification.message,
            episode_info: notification.episodeInfo || null,
            sent_at: notification.sentAt || new Date().toISOString(),
            unique_key: notification.uniqueKey,
        }, {
            onConflict: 'user_id,unique_key',
            ignoreDuplicates: true
        });

        if (error) throw error;
    } catch (error) {
        console.error('Error saving notification:', error);
    }
}

/**
 * Get recent notifications from database (last 7 days)
 */
export async function getRecentNotifications(
    userId: string
): Promise<Notification[]> {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data, error } = await supabase
            .from('notification_logs')
            .select('*')
            .eq('user_id', userId)
            .gte('sent_at', sevenDaysAgo.toISOString())
            .is('dismissed_at', null) // Only get non-dismissed notifications
            .order('sent_at', { ascending: false });

        if (error) throw error;

        return (
            data?.map((row: NotificationLogRow) => ({
                id: row.id,
                type: row.notification_type,
                showId: row.show_id,
                showName: row.show_name,
                message: row.message,
                timestamp: row.created_at,
                read: !!row.read_at,
                uniqueKey: row.unique_key,
                sentAt: row.sent_at,
                episodeInfo: row.episode_info || undefined,
            })) || []
        );
    } catch (error) {
        console.error('Error getting recent notifications:', error);
        return [];
    }
}

/**
 * Mark notification as read in database
 */
export async function markNotificationAsRead(
    userId: string,
    uniqueKey: string
): Promise<void> {
    try {
        const { error } = await supabase
            .from('notification_logs')
            .update({ read_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('unique_key', uniqueKey);

        if (error) throw error;
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

/**
 * Dismiss notification (mark as dismissed) in database
 */
export async function dismissNotification(
    userId: string,
    uniqueKey: string
): Promise<void> {
    try {
        const { error } = await supabase
            .from('notification_logs')
            .update({ dismissed_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('unique_key', uniqueKey);

        if (error) throw error;
    } catch (error) {
        console.error('Error dismissing notification:', error);
    }
}

/**
 * Delete old notifications (older than 30 days) from database
 */
export async function cleanupOldNotifications(userId: string): Promise<void> {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { error } = await supabase
            .from('notification_logs')
            .delete()
            .eq('user_id', userId)
            .lt('sent_at', thirtyDaysAgo.toISOString());

        if (error) throw error;
    } catch (error) {
        console.error('Error cleaning up old notifications:', error);
    }
}

