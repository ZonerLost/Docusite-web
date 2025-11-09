// 'use client';

// import { auth } from '@/lib/firebase-client';
// import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';

// let ready: Promise<void> | null = null;

// /**
//  * Ensure there is a signed-in Firebase user (anonymous is fine).
//  * - Avoids calling unsubscribe before it's initialized
//  * - Catches anonymous disabled errors in dev so the app doesn't hard-fail
//  */
// export function ensureSignedIn(): Promise<void> {
//   if (auth.currentUser) return Promise.resolve();
//   if (ready) return ready;

//   ready = new Promise<void>((resolve) => {
//     let resolved = false;
//     const off = onAuthStateChanged(auth, async (u) => {
//       try {
//         if (!u) {
//           try {
//             await signInAnonymously(auth);
//             // Wait for the next auth state change which will provide the user
//             return;
//           } catch {
//             // Anonymous auth may be disabled; do not block dev flows
//           }
//         }
//       } finally {
//         if (!resolved) {
//           resolved = true;
//           // Defer unsubscribe to avoid "cannot access before initialization" in sync callbacks
//           setTimeout(() => off(), 0);
//           resolve();
//         }
//       }
//     });
//   });
//   return ready;
// }

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
