"use client";

import { Bell, BellRing, BellOff } from 'lucide-react';
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
import { useEffect, useState, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import localFont from 'next/font/local';
import { useToast } from '@/hooks/use-toast';

const geistMono = localFont({
  src: '../public/fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export function NotificationBell() {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    refreshNotifications,
    pushNotificationSupported,
    pushNotificationSubscribed,
    subscribeToPushNotifications,
    unsubscribeFromPushNotifications,
    pushSubscription,
    loadMore,
    hasMore,
  } = useNotifications();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
    <ScrollArea 
      ref={scrollContainerRef}
      className={`${isMobile ? "h-[calc(100vh-8rem)]" : "h-[300px]"} ${geistMono.className}`}
    >
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
              {notification.metadata && (
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {notification.type === "METER_SALE" && (
                    <>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="bg-blue-100">
                          Type: {notification.metadata.customerType}
                        </Badge>
                        <Badge variant="outline" className="bg-green-100">
                          County: {notification.metadata.customerCounty}
                        </Badge>
                        <Badge variant="outline" className="bg-yellow-100">
                          Contact: {notification.metadata.customerContact}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>Total Price: KES {notification.metadata.totalPrice.toLocaleString()}</span>
                        <span>•</span>
                        <span>Unit Price: KES {notification.metadata.unitPrice.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-2">
                {format(new Date(notification.created_at), 'PPp')}
              </div>
            </div>
          ))}
          
          {hasMore && (
            <div className="p-2 text-center">
              <Button 
                variant="ghost" 
                onClick={async () => {
                  const currentScroll = scrollContainerRef.current?.scrollTop || 0;
                  
                  await loadMore();
                  
                  setTimeout(() => {
                    if (scrollContainerRef.current) {
                      scrollContainerRef.current.scrollTop = currentScroll;
                    }
                  }, 100);
                }}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                Load More
              </Button>
            </div>
          )}
        </div>
      )}
    </ScrollArea>
  );

  const HeaderContent = () => (
    <div className={`${geistMono.className} flex items-center justify-between`}>
      <div className="flex items-center gap-2">
        <span>Notifications</span>
        {pushNotificationSupported && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={pushNotificationSubscribed ? unsubscribeFromPushNotifications : subscribeToPushNotifications}
            title={pushNotificationSubscribed ? 'Disable Push Notifications' : 'Enable Push Notifications'}
          >
            {pushNotificationSubscribed ? (
              <BellRing className="h-4 w-4 text-green-500" />
            ) : (
              <BellOff className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        )}
      </div>
      {unreadCount > 0 && (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => markAllAsRead(currentUser.id)}
          className="text-xs"
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
        <Button variant="ghost" size="icon" className="relative">
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
      <PopoverContent 
        className="w-[380px] p-0" 
        align="end"
        sideOffset={8}
      >
        <div className="p-4 border-b">
          <HeaderContent />
        </div>
        <div className="p-2">
          <NotificationList />
        </div>
      </PopoverContent>
    </Popover>
  );
} 