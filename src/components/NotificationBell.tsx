import { Bell, BellRing, BellOff } from 'lucide-react';
import { Button } from './ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from './ui/popover';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationItem } from './NotificationItem';
import { ScrollArea } from './ui/scroll-area';

export function NotificationBell() {
    const {
        notifications,
        unreadCount,
        markAllAsRead,
        clearAll,
        permissionGranted,
        requestPermission
    } = useNotifications();

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    {!permissionGranted ? (
                        <BellOff className="h-5 w-5 text-muted-foreground" />
                    ) : unreadCount > 0 ? (
                        <BellRing className="h-5 w-5 animate-pulse" />
                    ) : (
                        <Bell className="h-5 w-5" />
                    )}
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-semibold">Notifications</h3>
                    <div className="flex gap-2">
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={markAllAsRead}
                                className="text-xs"
                            >
                                Mark all read
                            </Button>
                        )}
                        {notifications.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearAll}
                                className="text-xs"
                            >
                                Clear all
                            </Button>
                        )}
                    </div>
                </div>

                {!permissionGranted && (
                    <div className="p-4 bg-muted/50 border-b">
                        <p className="text-sm text-muted-foreground mb-2">
                            Aktifkan notifikasi untuk mendapatkan pengingat episode baru
                        </p>
                        <Button
                            variant="default"
                            size="sm"
                            onClick={requestPermission}
                            className="w-full"
                        >
                            Aktifkan Notifikasi
                        </Button>
                    </div>
                )}

                <ScrollArea className="h-[400px]">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
                            <p>No notifications</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((notification) => (
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