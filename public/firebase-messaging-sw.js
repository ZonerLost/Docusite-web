/* eslint-disable no-undef */
/*
  Firebase Cloud Messaging Service Worker
  - Handles background push notifications
  - Shows a notification with title/body/icon and opens link on click

  Notes:
  - This file must live at the site root (Next.js public/).
  - Uses Firebase v10 compat scripts via importScripts.
*/

// Load Firebase compat libraries for SW context
importScripts('https://www.gstatic.com/firebasejs/10.12.3/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.3/firebase-messaging-compat.js');

// Initialize Firebase app in the SW. It's fine to expose public config.
firebase.initializeApp({
  apiKey: 'AIzaSyCfOyb24kP58XR6MrdGiu8w9co2UPgCxpg',
  authDomain: 'docusite-app.firebaseapp.com',
  projectId: 'docusite-app',
  storageBucket: 'docusite-app.firebasestorage.app',
  messagingSenderId: '1072828557755',
  appId: '1:1072828557755:web:8d318f5beba35f0f523c9e',
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const data = payload?.data || {};
  const title = payload?.notification?.title || data.title || 'New Notification';
  const body = payload?.notification?.body || data.body || 'You have a new message.';
  const icon = data.icon || '/docusite.svg';
  const badge = data.badge || undefined;
  const url = data.url || '/';

  self.registration.showNotification(title, {
    body,
    icon,
    badge,
    data: { url },
    vibrate: [100, 50, 100],
    actions: [{ action: 'open', title: 'Open' }],
  });
});

// Click-through to the target URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification && event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(self.clients.openWindow(url));
});

