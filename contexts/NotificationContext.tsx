"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  subscribeToNotifications, 
  getNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  getCurrentUser 
} from '@/lib/actions/supabaseActions';
import { useToast } from '@/hooks/use-toast';
import { sendPushNotification } from '@/app/actions/pushNotifications';

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
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { toast } = useToast();
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null);

  const refreshNotifications = async (userId: string) => {
    try {
      const data = await getNotifications(userId);
      const processedData = data.map(notification => ({
        ...notification,
        is_read: notification.read_by?.includes(userId) || false
      }));
      setNotifications(processedData);
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
    if (!currentUser) return;

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

      if (pushSubscription) {
        const subscriptionObject = {
          endpoint: pushSubscription.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode.apply(null, 
              new Uint8Array(pushSubscription.getKey('p256dh')!) as any)),
            auth: btoa(String.fromCharCode.apply(null, 
              new Uint8Array(pushSubscription.getKey('auth')!) as any))
          }
        };

        sendPushNotification(subscriptionObject, {
          icon: '/favi.png',
          body: notification.message
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [currentUser, pushSubscription, toast]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    const checkPushSupport = async () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window;
      console.log('Push supported:', supported);
      setPushSupported(supported);

      if (supported) {
        try {
          const registration = await navigator.serviceWorker.register('/custom-sw.js');
          console.log('Service Worker registered:', registration);
          const subscription = await registration.pushManager.getSubscription();
          console.log('Current subscription:', subscription);
          setPushSubscription(subscription);
        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      }
    };

    checkPushSupport();
  }, []);

  const subscribeToPushNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration('/custom-sw.js');
      if (!registration) {
        throw new Error('Service Worker not found');
      }

      console.log('VAPID key:', process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
      
      if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
        throw new Error('VAPID public key not found');
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      });

      setPushSubscription(subscription);
      
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

  const unsubscribeFromPushNotifications = async () => {
    try {
      await pushSubscription?.unsubscribe();
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

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      refreshNotifications,
      subscribeToPushNotifications,
      unsubscribeFromPushNotifications,
      pushNotificationSupported: pushSupported,
      pushNotificationSubscribed: !!pushSubscription,
      pushSubscription,
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