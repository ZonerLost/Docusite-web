'use client';

import { auth, db } from '@/lib/firebase-client';
import { doc, setDoc } from 'firebase/firestore';
import { getMessaging, getToken, isSupported, onMessage, Messaging } from 'firebase/messaging';

// Cache for messaging instance
let _messaging: Messaging | null = null;

async function getMessagingIfSupported(): Promise<Messaging | null> {
  try {
    if (!(await isSupported())) return null;
    if (!_messaging) _messaging = getMessaging();
    return _messaging;
  } catch {
    return null;
  }
}

export async function registerFcmServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined') return null;
  if ((window as any).__NOTIFICATIONS_ENABLED__ === false) return null;
  if (!('serviceWorker' in navigator)) return null;
  try {
    // Put the SW at the site root
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return reg;
  } catch {
    return null;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined') return 'denied';
  if ((window as any).__NOTIFICATIONS_ENABLED__ === false) return 'denied';
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return await Notification.requestPermission();
}

export async function getFcmTokenAndSync(): Promise<string | null> {
  if (typeof window !== 'undefined' && (window as any).__NOTIFICATIONS_ENABLED__ === false) return null;
  const perm = await requestNotificationPermission();
  if (perm !== 'granted') return null;

  const messaging = await getMessagingIfSupported();
  if (!messaging) return null;

  const reg = await registerFcmServiceWorker();
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) throw new Error('Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY');

  let token: string | null = null;
  try {
    token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: reg || undefined,
    });
  } catch (e) {
    // Best-effort; return null on failure
    return null;
  }

  if (!token) return null;

  // Persist to the current user's profile for server fanout
  const user = auth.currentUser;
  if (user) {
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        { fcmToken: token },
        { merge: true }
      );
    } catch {
      // Ignore client-side persistence errors; server routes can still work without this
    }
  }

  // Cache in localStorage to avoid unnecessary duplicate writes
  try { localStorage.setItem('fcmToken', token); } catch {}
  return token;
}

export function listenForegroundMessages(cb: (payload: any) => void): () => void {
  let unsub = () => {};
  if (typeof window !== 'undefined' && (window as any).__NOTIFICATIONS_ENABLED__ === false) {
    return () => unsub();
  }
  getMessagingIfSupported().then((messaging) => {
    if (!messaging) return;
    unsub = onMessage(messaging, (payload) => cb(payload));
  });
  return () => unsub();
}
