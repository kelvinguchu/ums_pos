'use server'

import webpush, { PushSubscription as WebPushSubscription } from 'web-push';

webpush.setVapidDetails(
  'mailto:kelvinguchu5@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

function convertSubscription(subscription: any): WebPushSubscription {
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth
    }
  };
}

export async function sendPushNotification(subscription: any, notification: any) {
  try {
    const webPushSubscription = convertSubscription(subscription);
    await webpush.sendNotification(
      webPushSubscription,
      JSON.stringify(notification)
    );
    return { success: true };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, error };
  }
} 