// Add version for cache busting
const SW_VERSION = '1.0.0';

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      self.skipWaiting(),
      // Clear old caches if any
      caches.keys().then(keys => 
        Promise.all(
          keys.map(key => caches.delete(key))
        )
      )
    ])
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clear old caches on activation
      caches.keys().then(keys => 
        Promise.all(
          keys.map(key => caches.delete(key))
        )
      )
    ])
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  // Parse the notification data
  const data = JSON.parse(event.data.text());
  
  const options = {
    body: data.body,
    icon: '/favi.png',
    badge: '/logo.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      url: self.location.origin,
      version: SW_VERSION
    },
    requireInteraction: true,
    silent: false,
    tag: 'ums-notification' // Add tag to group notifications
  };

  event.waitUntil(
    self.registration.showNotification("UMS Prepaid", options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Focus on existing window if available, otherwise open new one
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow(event.notification.data.url);
    })
  );
});

// Add fetch event listener to handle offline functionality if needed
self.addEventListener('fetch', (event) => {
  // Add custom fetch handling if needed
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response('Offline content here');
    })
  );
});
