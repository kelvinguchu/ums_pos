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

interface Notification {
  id: string;
  type: string;
  message: string;
  created_at: string;
  read_by: string[];
  metadata: any;
  created_by: string;
  is_read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string, userId: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  refreshNotifications: (userId: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { toast } = useToast();

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
        // Check if notification already exists to prevent duplicates
        const exists = prev.some(n => n.id === notification.id);
        if (exists) return prev;
        return [notification, ...prev];
      });
      
      // Show toast for new notification
      toast({
        title: notification.type,
        description: notification.message,
        duration: 5000,
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [currentUser, toast]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      refreshNotifications,
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