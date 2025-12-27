'use client';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut as fbSignOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

import { auth, db, storage } from '@/lib/firebase-client';
import type { AppUser, NewUser } from '@/types/user';

/* ---------------- Friendly error mapping (UI uses this ONCE) ---------------- */
export function niceError(err: unknown, fallback = 'Something went wrong.') {
  const code = (typeof err === 'object' && err && (err as any).code) || undefined;

  switch (code) {
    case 'permission-denied':
      return 'Permission denied. Check Firestore security rules for users collection.';
    case 'auth/invalid-api-key':
      return 'Invalid Firebase API key. Check your environment configuration.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for Firebase Auth. Add it in Firebase Console.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not enabled in Firebase.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/email-already-in-use':
      return 'This email is already registered. Try logging in instead.';
    case 'auth/weak-password':
      return 'Your password is too weak. Use at least 6–8 characters.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Incorrect email or password.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/network-request-failed':
      return 'Network error. Check your internet connection or ad blockers.';
    default:
      return fallback;
  }
}

/* ---------------- Helpers ---------------- */
async function uploadProfilePhoto(uid: string, file?: File | null) {
  if (!file) return null;
  const path = `users/${uid}/profile_${Date.now()}`;
  const ref = storageRef(storage, path);
  try {
    await uploadBytes(ref, file);
    return await getDownloadURL(ref);
  } catch (err) {
    // Storage permissions may block unauthenticated uploads in some setups.
    // Don’t fail signup if photo upload is blocked; proceed without a photo.
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('uploadProfilePhoto failed, continuing without photo:', err);
    }
    return null;
  }
}

async function ensureUserDocument(uid: string, base: Partial<AppUser>) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  const payload: NewUser = {
    uid,
    email: base.email!,
    fullName: (base.fullName || base.displayName || '').trim(),
    displayName: (base.displayName || base.fullName || '').trim(),
    photoUrl: base.photoUrl ?? null,
    fcmToken: base.fcmToken ?? null,
    status: 'active',
    role: 'user',
    createdAt: serverTimestamp(),
  };

  await setDoc(ref, payload);
}

/* ---------------- Signup ---------------- */
type SignupInput = {
  fullName: string;
  email: string;
  password: string;
  file?: File;
};

export async function signupAdmin(input: SignupInput) {
  const email = input.email.trim();
  const password = input.password; // do not trim passwords
  const fullName = input.fullName.trim();

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const fbUser = cred.user;

    const photoUrl = await uploadProfilePhoto(fbUser.uid, input.file);
    try {
      await updateProfile(fbUser, { displayName: fullName, photoURL: photoUrl || undefined });
    } catch { /* non-fatal */ }

    await ensureUserDocument(fbUser.uid, {
      uid: fbUser.uid,
      email: fbUser.email || email,
      fullName,
      displayName: fullName,
      photoUrl: photoUrl ?? null,
      fcmToken: null,
      status: 'active',
    });

    return fbUser;
  } catch (err) {
    // If Auth succeeded but Firestore failed, you could try cleanup:
    try { if (auth.currentUser) await auth.currentUser.delete(); } catch {}
    // Rethrow RAW so UI logs exact code
    throw err;
  }
}

/* ---------------- Login ---------------- */
export async function loginWithEmail(emailRaw: string, password: string) {
  const email = emailRaw.trim();

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const fbUser = cred.user;

    await ensureUserDocument(fbUser.uid, {
      uid: fbUser.uid,
      email: fbUser.email || email,
      fullName: fbUser.displayName || '',
      displayName: fbUser.displayName || '',
      photoUrl: fbUser.photoURL || null,
      fcmToken: null,
      status: 'active',
    });

    return fbUser;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('loginWithEmail error (raw):', err);
    throw err;
  }
}

/* ---------------- Optional helpers ---------------- */
export async function signOut() {
  await fbSignOut(auth);
}

export async function forgotPassword(email: string) {
  await sendPasswordResetEmail(auth, email.trim());
}

