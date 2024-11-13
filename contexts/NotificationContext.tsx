"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  subscribeToNotifications, 
  getNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  getCurrentUser,
  togglePushNotifications,
  getPushNotificationStatus
} from '@/lib/actions/supabaseActions';
import { useToast } from '@/hooks/use-toast';
import { sendPushNotification } from '@/app/actions/pushNotifications';
import { MoveUp } from 'lucide-react';
import { registerServiceWorker, subscribeToPushNotifications, unsubscribeFromPushNotifications } from '@/lib/pushNotifications';

interface Notification {
  id: string;
  type: string;
  message: string;
  created_at: string;
  read_by: string[];
  metadata: {
    batchId: string;
    meterType: string;
    batchAmount: number;
    destination: string;
    recipient: string;
    totalPrice: number;
    unitPrice: number;
    customerType: string;
    customerCounty: string;
    customerContact: string;
  };
  created_by: string;
  is_read: boolean;
}

interface NotificationCache {
  notifications: Notification[];
  hasMore: boolean;
  lastFetched: number;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string, userId: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  refreshNotifications: (userId: string) => Promise<void>;
  subscribeToPushNotifications: () => Promise<void>;
  unsubscribeFromPushNotifications: () => Promise<void>;
  pushNotificationSupported: boolean;
  pushNotificationSubscribed: boolean;
  pushSubscription: PushSubscription | null;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  scrollToTop: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Add this interface for the subscription JSON
interface PushSubscriptionJSON {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null);
  const { toast } = useToast();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastFetchedId, setLastFetchedId] = useState<string | null>(null);
  const NOTIFICATIONS_PER_PAGE = 10;
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize service worker
  useEffect(() => {
    if (isClient && 'serviceWorker' in navigator) {
      registerServiceWorker()
        .then(registration => {
          setSwRegistration(registration);
          // Check for existing subscription
          return registration.pushManager.getSubscription();
        })
        .then(existingSubscription => {
          if (existingSubscription) {
            setPushSubscription(existingSubscription);
          }
        })
        .catch(console.error);
    }
  }, [isClient]);

  const getCachedNotifications = (): NotificationCache | null => {
    const cached = localStorage.getItem('notificationsCache');
    if (!cached) return null;
    
    const parsedCache = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is still valid
    if (now - parsedCache.lastFetched > CACHE_DURATION) {
      localStorage.removeItem('notificationsCache');
      return null;
    }
    
    return parsedCache;
  };

  const updateCache = (newData: NotificationCache) => {
    localStorage.setItem('notificationsCache', JSON.stringify({
      ...newData,
      lastFetched: Date.now()
    }));
  };

  const refreshNotifications = async (userId: string) => {
    try {
      // First check cache
      const cache = getCachedNotifications();
      if (cache) {
        setNotifications(cache.notifications);
        setHasMore(cache.hasMore);
        return;
      }

      const data = await getNotifications(userId, NOTIFICATIONS_PER_PAGE);
      const processedData = data.map(notification => ({
        ...notification,
        is_read: notification.read_by?.includes(userId) || false
      }));

      setNotifications(processedData);
      setHasMore(data.length === NOTIFICATIONS_PER_PAGE);
      setLastFetchedId(data[data.length - 1]?.id || null);

      // Update cache
      updateCache({
        notifications: processedData,
        hasMore: data.length === NOTIFICATIONS_PER_PAGE,
        lastFetched: Date.now()
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
        if (user) {
          await refreshNotifications(user.id);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

  const markAsRead = async (notificationId: string, userId: string) => {
    try {
      await markNotificationAsRead(notificationId, userId);
      await refreshNotifications(userId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    }
  };

  const markAllAsRead = async (userId: string) => {
    try {
      await markAllNotificationsAsRead(userId);
      await refreshNotifications(userId);
      toast({
        title: "Success",
        description: "All notifications marked as read",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!currentUser || !isClient) return;

    const subscription = subscribeToNotifications((notification) => {
      setNotifications(prev => {
        const exists = prev.some(n => n.id === notification.id);
        if (exists) return prev;
        return [notification, ...prev];
      });
      
      toast({
        title: notification.type,
        description: notification.message,
        duration: 5000,
      });

      if (pushEnabled && pushSubscription && isClient) {
        // Convert PushSubscription to the correct format
        const subscriptionJSON: PushSubscriptionJSON = {
          endpoint: pushSubscription.endpoint,
          expirationTime: pushSubscription.expirationTime,
          keys: {
            p256dh: btoa(String.fromCharCode.apply(null, 
              new Uint8Array(pushSubscription.getKey('p256dh')!) as any)),
            auth: btoa(String.fromCharCode.apply(null, 
              new Uint8Array(pushSubscription.getKey('auth')!) as any))
          }
        };
        
        sendPushNotification(subscriptionJSON, {
          title: notification.type,
          body: notification.message,
          icon: '/favi.png'
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [currentUser, pushEnabled, pushSubscription, toast, isClient]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Load initial push notification status
  useEffect(() => {
    const loadPushStatus = async () => {
      if (currentUser) {
        try {
          const status = await getPushNotificationStatus(currentUser.id);
          setPushEnabled(status);
          
          // Also check for existing subscription
          const registration = await navigator.serviceWorker.ready;
          const existingSubscription = await registration.pushManager.getSubscription();
          setPushSubscription(existingSubscription);
        } catch (error) {
          console.error('Error loading push notification status:', error);
        }
      }
    };
    
    if (isClient && currentUser) {
      loadPushStatus();
    }
  }, [currentUser, isClient]);

  const subscribeToPushNotificationsHandler = async () => {
    if (!isClient || !swRegistration) return;
    try {
      if (!currentUser) throw new Error('No user logged in');

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      });

      setPushSubscription(subscription);
      await togglePushNotifications(currentUser.id, true);
      setPushEnabled(true);

      toast({
        title: "Success",
        description: "Push notifications enabled",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      toast({
        title: "Error",
        description: `Failed to enable push notifications: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const unsubscribeFromPushNotificationsHandler = async () => {
    if (!isClient || !swRegistration) return;
    try {
      if (!currentUser) throw new Error('No user logged in');

      await unsubscribeFromPushNotifications(swRegistration);
      await togglePushNotifications(currentUser.id, false);
      setPushEnabled(false);
      setPushSubscription(null);

      toast({
        title: "Success",
        description: "Push notifications disabled",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      toast({
        title: "Error",
        description: "Failed to disable push notifications",
        variant: "destructive",
      });
    }
  };

  const pushNotificationSupported = isClient && 'serviceWorker' in window && 'PushManager' in window;

  const loadMore = useCallback(async () => {
    if (!currentUser || !lastFetchedId) return;

    try {
      const data = await getNotifications(
        currentUser.id,
        NOTIFICATIONS_PER_PAGE,
        lastFetchedId
      );

      const processedData = data.map(notification => ({
        ...notification,
        is_read: notification.read_by?.includes(currentUser.id) || false
      }));

      setNotifications(prev => [...prev, ...processedData]);
      setHasMore(data.length === NOTIFICATIONS_PER_PAGE);
      if (data.length > 0) {
        setLastFetchedId(data[data.length - 1]?.id);
      }

      // Update cache with combined notifications
      updateCache({
        notifications: [...notifications, ...processedData],
        hasMore: data.length === NOTIFICATIONS_PER_PAGE,
        lastFetched: Date.now()
      });
    } catch (error) {
      console.error('Error loading more notifications:', error);
    }
  }, [currentUser, lastFetchedId]);

  const scrollToTop = () => {
    const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollArea) {
      scrollArea.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      refreshNotifications,
      subscribeToPushNotifications: subscribeToPushNotificationsHandler,
      unsubscribeFromPushNotifications: unsubscribeFromPushNotificationsHandler,
      pushNotificationSupported,
      pushNotificationSubscribed: pushEnabled,
      pushSubscription,
      loadMore,
      hasMore,
      scrollToTop,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
} 