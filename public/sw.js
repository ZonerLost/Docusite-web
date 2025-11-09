/* public/sw.js */

// Listen for push events
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}

  const title = data.title || 'New Notification';
  const body = data.body || 'You have a message.';
  // Use existing asset to avoid missing icon during setup
  const icon = data.icon || '/docusite.svg';
  const url  = data.url  || '/';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      data: { url },
      // Optional badge; fallback to same icon if not provided
      badge: data.badge || icon,
      timestamp: Date.now(),
      vibrate: [100, 50, 100],
      actions: [{ action: 'open', title: 'Open' }],
    })
  );
});

// Click through
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification && event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(self.clients.openWindow(url));
});

