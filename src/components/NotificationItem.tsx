import { formatDistanceToNow } from 'date-fns';
import { Calendar, Clock, X, TrendingDown, Sparkles, Check } from 'lucide-react';
import { Notification } from '../types/show';
import { Button } from './ui/button';
import { useNotifications } from '../hooks/useNotifications';
import { cn } from '../lib/utils';
import { Badge } from './ui/badge';

interface NotificationItemProps {
    notification: Notification;
}

export function NotificationItem({ notification }: NotificationItemProps) {
    const { markAsRead, clearNotification } = useNotifications();

    const handleMarkAsRead = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!notification.read) {
            markAsRead(notification.id);
        }
    };

    const handleDismiss = (e: React.MouseEvent) => {
        e.stopPropagation();
        clearNotification(notification.id);
    };

    const getNotificationStyle = () => {
        switch (notification.type) {
            case 'upcoming':
                return {
                    icon: Calendar,
                    iconColor: 'text-blue-500',
                    bgColor: 'bg-blue-500/10',
                    badgeVariant: 'default' as const,
                    label: 'Upcoming'
                };
            case 'unwatched':
                return {
                    icon: Clock,
                    iconColor: 'text-orange-500',
                    bgColor: 'bg-orange-500/10',
                    badgeVariant: 'secondary' as const,
                    label: 'Unwatched'
                };
            case 'inactive':
                return {
                    icon: TrendingDown,
                    iconColor: 'text-purple-500',
                    bgColor: 'bg-purple-500/10',
                    badgeVariant: 'outline' as const,
                    label: 'Inactive'
                };
            default:
                return {
                    icon: Sparkles,
                    iconColor: 'text-gray-500',
                    bgColor: 'bg-gray-500/10',
                    badgeVariant: 'outline' as const,
                    label: 'Update'
                };
        }
    };

    const style = getNotificationStyle();
    const Icon = style.icon;

    return (
        <div
            className={cn(
                'p-4 hover:bg-accent/50 transition-all duration-200 relative group border-l-2',
                !notification.read
                    ? 'bg-accent/30 border-l-primary'
                    : 'border-l-transparent hover:border-l-muted-foreground/20'
            )}
        >
            <div className="flex gap-3">
                <div className={cn('p-2 rounded-lg h-fit', style.bgColor)}>
                    <Icon className={cn('h-4 w-4', style.iconColor)} />
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm leading-tight">
                            {notification.showName}
                        </p>
                        <Badge
                            variant={style.badgeVariant}
                            className="text-[10px] px-1.5 py-0 h-5 shrink-0"
                        >
                            {style.label}
                        </Badge>
                    </div>

                    {notification.episodeInfo && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                                S{notification.episodeInfo.season}E{notification.episodeInfo.episode}
                            </span>
                            <span className="truncate">
                                {notification.episodeInfo.episodeName}
                            </span>
                        </div>
                    )}

                    <p className="text-sm text-foreground/90 leading-snug">
                        {notification.message}
                    </p>

                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(notification.timestamp), {
                            addSuffix: true,
                        })}
                    </p>

                    {/* Action buttons - always visible on mobile, hover on desktop */}
                    <div className="flex gap-1.5 pt-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        {!notification.read && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs flex items-center gap-1.5 hover:bg-primary/10"
                                onClick={handleMarkAsRead}
                                title="Mark as read"
                            >
                                <Check className="h-3 w-3" />
                                Mark as Read
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs flex items-center gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={handleDismiss}
                            title="Dismiss notification"
                        >
                            <X className="h-3 w-3" />
                            Dismiss
                        </Button>
                    </div>
                </div>
            </div>

            {!notification.read && (
                <div className="absolute right-4 top-4 w-2 h-2 bg-primary rounded-full shadow-sm shadow-primary/50" />
            )}
        </div>
    );
}