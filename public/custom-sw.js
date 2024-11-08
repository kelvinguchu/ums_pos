self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  // Parse the notification data
  const data = JSON.parse(event.data.text());
  
  const options = {
    body: data.body,
    icon: '/favi.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      url: self.location.origin,
    },
    requireInteraction: true,
    silent: false,
    tag: 'ums-pos',
    renotify: true,
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'close',
        title: 'Dismiss'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification("UMS Prepaid", options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Handle action clicks
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});
