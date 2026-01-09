import { formatDistanceToNow } from 'date-fns';
import { Calendar, Clock, X } from 'lucide-react';
import { Notification } from '../types/show';
import { Button } from './ui/button';
import { useNotifications } from '../hooks/useNotifications';
import { cn } from '../lib/utils';

interface NotificationItemProps {
    notification: Notification;
}

export function NotificationItem({ notification }: NotificationItemProps) {
    const { markAsRead, clearNotification } = useNotifications();

    const handleClick = () => {
        if (!notification.read) {
            markAsRead(notification.id);
        }
    };

    const Icon = notification.type === 'upcoming' ? Calendar : Clock;
    const iconColor =
        notification.type === 'upcoming'
            ? 'text-blue-500'
            : notification.type === 'unwatched'
                ? 'text-orange-500'
                : 'text-purple-500';

    return (
        <div
            className={cn(
                'p-4 hover:bg-accent transition-colors cursor-pointer relative group',
                !notification.read && 'bg-accent/50'
            )}
            onClick={handleClick}
        >
            {!notification.read && (
                <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full" />
            )}

            <div className="flex gap-3 pl-4">
                <Icon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', iconColor)} />

                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                        {notification.showName}
                    </p>

                    {notification.episodeInfo && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                            S{notification.episodeInfo.season}E{notification.episodeInfo.episode} -{' '}
                            {notification.episodeInfo.episodeName}
                        </p>
                    )}

                    <p className="text-sm mt-1">{notification.message}</p>

                    <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(notification.timestamp), {
                            addSuffix: true,
                        })}
                    </p>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    onClick={(e) => {
                        e.stopPropagation();
                        clearNotification(notification.id);
                    }}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}