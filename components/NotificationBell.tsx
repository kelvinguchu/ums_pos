"use client";

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNotifications } from '@/contexts/NotificationContext';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getCurrentUser } from '@/lib/actions/supabaseActions';
import { useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import localFont from 'next/font/local';

const geistMono = localFont({
  src: '../public/fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, refreshNotifications } = useNotifications();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
      if (user) {
        refreshNotifications(user.id);
      }
    };
    fetchUser();
  }, []);

  if (!currentUser) return null;

  const NotificationList = () => (
    <ScrollArea className={`${isMobile ? "h-[calc(100vh-8rem)]" : "h-[300px]"} ${geistMono.className}`}>
      {notifications.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          No notifications
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border ${
                notification.is_read ? 'bg-background' : 'bg-muted'
              }`}
              onClick={() => !notification.is_read && markAsRead(notification.id, currentUser.id)}
            >
              <div className="font-medium">{notification.message}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {format(new Date(notification.created_at), 'PPp')}
              </div>
            </div>
          ))}
        </div>
      )}
    </ScrollArea>
  );

  const HeaderContent = () => (
    <div className={`${geistMono.className} flex items-center justify-between`}>
      <div>Notifications</div>
      {unreadCount > 0 && (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => markAllAsRead(currentUser.id)}
        >
          Mark all as read
        </Button>
      )}
    </div>
  );

  // Use Sheet for mobile, Popover for desktop
  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" className="relative w-full justify-start">
            <Bell className="h-5 w-5 mr-2" />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute top-1 right-1 h-5 w-5 flex items-center justify-center p-0"
              >
                {unreadCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              <HeaderContent />
            </SheetTitle>
          </SheetHeader>
          <NotificationList />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <HeaderContent />
        <div className="mt-4">
          <NotificationList />
        </div>
      </PopoverContent>
    </Popover>
  );
} 