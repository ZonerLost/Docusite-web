'use client';

export async function registerServiceWorker() {
  if (typeof window !== 'undefined' && (window as any).__NOTIFICATIONS_ENABLED__ === false) return null;
  if (!('serviceWorker' in navigator)) return null;
  const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  return reg;
}

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64Safe);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export async function askPermission(): Promise<NotificationPermission> {
  if ((window as any).__NOTIFICATIONS_ENABLED__ === false) return 'denied';
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return await Notification.requestPermission();
}

export async function subscribeToPush() {
  if ((window as any).__NOTIFICATIONS_ENABLED__ === false) throw new Error('Notifications disabled');
  const permission = await askPermission();
  if (permission !== 'granted') throw new Error('Notifications not allowed');

  const reg = await registerServiceWorker();
  if (!reg) throw new Error('SW not supported');

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub),
  });

  return sub;
}
