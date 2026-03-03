import { BellRing, Bell, BellOff, RefreshCw, Check, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from './ui/popover';
import { useNotificationContext } from '@/contexts/NotificationContext';
import { NotificationItem } from './NotificationItem';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';

export function NotificationBell() {
    const {
        notifications,
        unreadCount,
        markAllAsRead,
        clearAll,
        permissionGranted,
        requestPermission,
        refresh
    } = useNotificationContext();

    const sortedNotifications = [...notifications].sort((a, b) => {
        if (a.read !== b.read) return a.read ? 1 : -1;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="link" size="icon" className="relative group">
                    {!permissionGranted ? (
                        <BellOff className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    ) : unreadCount > 0 ? (
                        <BellRing className="h-5 w-5 text-primary animate-pulse" />
                    ) : (
                        <Bell className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    )}
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 bg-gradient-to-br from-red-500 to-red-600 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center shadow-lg animate-in zoom-in-50 duration-200">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] ml-5 p-2 shadow-xl border-border/50" align="end">
                <div className="flex flex-col gap-1 p-4 pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-base flex items-center gap-2">
                                Notifications
                            </h3>
                            {unreadCount > 0 && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
                                </p>
                            )}
                        </div>
                        <Button
                            variant="link"
                            size="icon"
                            className="h-8 w-8"
                            onClick={refresh}
                            title="Refresh notifications"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>

                    {(unreadCount > 0 || notifications.length > 0) && (
                        <div className="flex gap-1.5 mt-2">
                            {unreadCount > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={markAllAsRead}
                                    className="text-xs h-7 px-2.5 flex items-center gap-1.5 flex-1"
                                >
                                    <Check className="h-3 w-3" />
                                    Mark all read
                                </Button>
                            )}
                            {notifications.length > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={clearAll}
                                    className="text-xs h-7 px-2.5 flex items-center gap-1.5 flex-1 text-destructive hover:text-destructive"
                                >
                                    <Trash2 className="h-3 w-3" />
                                    Clear all
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                <Separator />

                {!permissionGranted && (
                    <>
                        <div className="p-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b">
                            <div className="flex gap-3">
                                <div className="p-2 bg-primary/10 rounded-full h-fit">
                                    <Bell className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium mb-1">
                                        Enable Notifications
                                    </p>
                                    <p className="text-xs text-muted-foreground mb-3">
                                        Get notified about upcoming episodes and unwatched shows
                                    </p>
                                    <Button
                                        variant="default"
                                        size="sm"
                                        onClick={requestPermission}
                                        className="w-full h-8"
                                    >
                                        Enable Notifications
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <Separator />
                    </>
                )}

                <ScrollArea className="h-[min(400px,60vh)] rounded-md mt-2">
                    {notifications.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="inline-flex p-4 bg-muted/50 rounded-full mb-3">
                                <BellOff className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                            <p className="font-medium text-sm mb-1">No notifications</p>
                            <p className="text-xs text-muted-foreground max-w-[250px] mx-auto">
                                We'll notify you when there are upcoming episodes or unwatched shows
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/50">
                            {sortedNotifications.map((notification) => (
                                <NotificationItem
                                    key={notification.id}
                                    notification={notification}
                                />
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}