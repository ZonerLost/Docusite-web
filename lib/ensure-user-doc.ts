import { auth, db } from '@/lib/firebase-client';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { normalizeEmail } from '@/lib/notifications';

/**
 * Ensures a lowercase email is present on /users/{uid} and
 * a root notifications doc exists at /notifications/{email}.
 * Safe to call repeatedly. No-ops when not authenticated.
 */
export async function ensureUserDoc(): Promise<void> {
  try {
    const u = auth.currentUser;
    if (!u) return;

    const email = normalizeEmail(u.email) || '';

    // /users/{uid} -> { email }
    await setDoc(
      doc(db, 'users', u.uid),
      { email },
      { merge: true }
    );

    // /notifications/{email} -> ownership proof for rules
    if (email) {
      await setDoc(
        doc(db, 'notifications', email),
        {
          ownerEmail: email,
          ownerUid: u.uid,
          lastUpdated: serverTimestamp() as any,
        },
        { merge: true }
      );
    }
  } catch (e) {
    try { console.warn('[ensureUserDoc] failed', e); } catch {}
  }
}


