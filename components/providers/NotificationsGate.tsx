"use client";

import React, { useEffect, useRef } from 'react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { useUser } from '@/context/UserContext';

declare global {
  interface Window {
    __NOTIFICATIONS_ENABLED__?: boolean;
    __ORIGINAL_ALERT__?: typeof window.alert;
  }
}

export default function NotificationsGate() {
  const { notificationsEnabled } = useUser();
  const installed = useRef(false);

  useEffect(() => {
    // Expose a global flag for libraries to consult
    try { window.__NOTIFICATIONS_ENABLED__ = !!notificationsEnabled; } catch {}

    // Patch window.alert once and route through the flag
    if (!installed.current) {
      try {
        if (!window.__ORIGINAL_ALERT__) window.__ORIGINAL_ALERT__ = window.alert.bind(window);
        // eslint-disable-next-line no-restricted-globals
        window.alert = ((...args: Parameters<typeof window.alert>) => {
          if (window.__NOTIFICATIONS_ENABLED__) {
            try { window.__ORIGINAL_ALERT__?.(...args); } catch {}
          }
        }) as any;
      } catch { /* ignore */ }
      installed.current = true;
    }

    // Best-effort push unsubscribe when disabled
    const maybeUnsubscribePush = async () => {
      try {
        if (typeof window === 'undefined') return;
        if (!('serviceWorker' in navigator)) return;
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          try {
            const url = (reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || '');
            if (url.includes('firebase-messaging-sw.js') || url.endsWith('/sw.js')) {
              try { const sub = await reg.pushManager.getSubscription(); await sub?.unsubscribe(); } catch {}
            }
          } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
    };
    if (!notificationsEnabled) { void maybeUnsubscribePush(); try { toast.dismiss(); } catch {} }
  }, [notificationsEnabled]);

  // Only render the toaster when enabled; this suppresses all toast UIs
  return notificationsEnabled ? (
    <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
  ) : null;
}
