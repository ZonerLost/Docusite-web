import { auth, db } from '@/lib/firebase-client';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { normalizeEmail } from '@/lib/notifications';

/**
 * Ensures a lowercase email is present on /users/{uid} and
 * a root notifications doc exists at /notifications/{email}.
 * Safe to call repeatedly. No-ops when not authenticated.
 */
export async function ensureUserDoc(): Promise<void> {
  const u = auth.currentUser;
  if (!u) return;

  const email = normalizeEmail(u.email) || '';
  const userRef = doc(db, 'users', u.uid);

  const userSnap = await getDoc(userRef);
  const createdAtMissing = !userSnap.exists() || userSnap.data()?.createdAt == null;

  const base = {
    email,
    displayName: u.displayName || '',
    photoURL: u.photoURL || '',
    updatedAt: serverTimestamp() as any,
  } as const;

  await setDoc(
    userRef,
    createdAtMissing ? { ...base, createdAt: serverTimestamp() as any } : base,
    { merge: true }
  );

  // Best-effort ownership proof for rules; does not block notifications.
  if (email) {
    try {
      await setDoc(
        doc(db, 'notifications', email),
        {
          ownerEmail: email,
          ownerUid: u.uid,
          lastUpdated: serverTimestamp() as any,
        },
        { merge: true }
      );
    } catch (e) {
      try { console.warn('[ensureUserDoc] notifications root write failed', e); } catch {}
    }
  }
}


