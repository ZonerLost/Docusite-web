'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// Optional: App Check (prevents storage/unauthorized when enforcement is ON)
// Only initializes when NEXT_PUBLIC_RECAPTCHA_SITE_KEY is provided.
let initAppCheck: (() => void) | null = null;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Avoid initializing Firebase Auth during SSR/SSG build where envs may be absent.
// This prevents build failures like "FirebaseError: auth/invalid-api-key" when
// NEXT_PUBLIC_FIREBASE_API_KEY isn't configured in the build environment.
export const auth: Auth = (typeof window !== 'undefined'
  ? getAuth(app)
  // Cast only for SSR import time; code paths that use auth run in the browser.
  : (null as unknown as Auth));
export const db = getFirestore(app);
// Ensure we point to the exact bucket used in console.
export const storage = getStorage(
  app,
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'gs://docusite-app.firebasestorage.app'
);

// Optional multi-tenancy (Identity Platform). Leave as 'default' if you don't use tenants.
export const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || 'default';
if (TENANT_ID && TENANT_ID !== 'default') {
  // Set only when you really use tenants; otherwise leave it unset.
  (auth as any).tenantId = TENANT_ID;
}

// Initialize App Check if configured (recommended for production when enforced)
if (typeof window !== 'undefined' && !initAppCheck) {
  initAppCheck = () => {
    try {
      const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
      if (!siteKey) return; // not configured
      // Optionally enable debug token in dev
      if (process.env.NODE_ENV !== 'production' && (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN === undefined) {
        (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      }
      // Dynamically import to avoid SSR issues
      import('firebase/app-check').then(({ initializeAppCheck, ReCaptchaV3Provider }) => {
        initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(siteKey),
          isTokenAutoRefreshEnabled: true,
        });
      }).catch(() => {/* ignore */});
    } catch {/* ignore */}
  };
  // Defer to next tick to ensure window is ready
  setTimeout(() => initAppCheck && initAppCheck(), 0);
}

export async function setAuthPersistence(rememberMe: boolean) {
  try {
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
  } catch {
    try {
      await setPersistence(auth, browserSessionPersistence);
    } catch {
      await setPersistence(auth, inMemoryPersistence);
    }
  }
}

// Debug helper (use only in dev)
export function debugFirebaseConfig() {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log('[firebase] options:', getApp().options);
    // eslint-disable-next-line no-console
    console.log('[firebase] storage bucket:', (storage as any)?._bucket?.bucket || (getApp().options as any)?.storageBucket);
  }
}

