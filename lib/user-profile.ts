import { db } from "./firebase-client";
import { serverTimestamp, doc, setDoc, getDoc } from "firebase/firestore";
import type { AppUser } from "@/types/user";

export async function writeAdminProfile(input: {
  uid: string;
  email: string;
  displayName: string;
  fullName: string;
  photoUrl?: string;
  fcmToken?: string;
}) {
  // Store user profiles at users/{uid}
  const ref = doc(db, "users", input.uid);
  await setDoc(
    ref,
    {
      uid: input.uid,
      email: input.email,
      displayName: input.displayName,
      fullName: input.fullName,
      photoUrl: input.photoUrl ?? "",
      status: "active",
      fcmToken: input.fcmToken ?? "",
      role: "admin", // enforced
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function fetchProfile(uid: string) {
  // Read user profile at users/{uid}
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as AppUser) : null;
}

/**
 * Update selected fields of the user's profile document (users/{uid}).
 * Only merges safe fields; does not change role or createdAt.
 */
export async function updateUserProfile(uid: string, updates: Partial<AppUser>) {
  const ref = doc(db, "users", uid);
  const safe: Partial<AppUser> = {};

  if (typeof updates.displayName === 'string') safe.displayName = updates.displayName;
  if (typeof updates.fullName === 'string') safe.fullName = updates.fullName;
  if (typeof updates.email === 'string') safe.email = updates.email;
  if (typeof updates.photoUrl !== 'undefined') safe.photoUrl = updates.photoUrl;
  if (typeof updates.fcmToken !== 'undefined') safe.fcmToken = updates.fcmToken;
  if (typeof updates.status === 'string') safe.status = updates.status as AppUser['status'];
  if (typeof (updates as any).notificationsEnabled === 'boolean') {
    (safe as any).notificationsEnabled = (updates as any).notificationsEnabled;
  }

  await setDoc(ref, safe, { merge: true });
}
