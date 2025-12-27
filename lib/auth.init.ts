'use client';

import { auth } from '@/lib/firebase-client';
import {
  onAuthStateChanged,
  signInAnonymously,
  setPersistence,
  browserLocalPersistence,
  User,
} from 'firebase/auth';

let inflight: Promise<User | null> | null = null;

/**
 * Ensure there is a signed-in Firebase user (anonymous is fine).
 * - Uses local persistence so session survives refreshes.
 * - Resolves only after a user exists (or null if anonymous sign-in fails).
 * - Debounces concurrent calls.
 */
export async function ensureSignedIn(): Promise<User | null> {
  // Already signed in
  if (auth.currentUser) return auth.currentUser;

  // Return in-flight promise if one exists
  if (inflight) return inflight;

  inflight = new Promise<User | null>(async (resolve) => {
    // Try to set persistent session; ignore failure (falls back to default)
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch {
      /* noop */
    }

    let startedAnon = false;

    const unsub = onAuthStateChanged(auth, async (u) => {
      // Got a user -> resolve and cleanup
      if (u) {
        unsub();
        inflight = null;
        resolve(u);
        return;
      }

      // No user yet; start anonymous sign-in once
      if (!startedAnon) {
        startedAnon = true;
        try {
          await signInAnonymously(auth);
          // Wait for the next onAuthStateChanged event to resolve
        } catch {
          // Anonymous disabled or failed: resolve null, cleanup
          unsub();
          inflight = null;
          resolve(null);
        }
      }
    });

    // Safety net in case no auth event fires (rare)
    setTimeout(() => {
      if (inflight) {
        unsub();
        const u = auth.currentUser ?? null;
        inflight = null;
        resolve(u);
      }
    }, 10000); // 10s timeout
  });

  return inflight;
}
