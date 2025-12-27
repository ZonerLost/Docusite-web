import { db } from "./firebase-client";
import { serverTimestamp, doc, setDoc, getDoc } from "firebase/firestore";
import type { AppUser } from "@/types/user";

export type AvatarSource = {
  src?: string;
  initial: string;
};

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

// Derive a stable avatar source (image URL or fallback initial) from a user-like object.
// This is the single place that decides between using the profile image or initials.
export function getUserAvatar(user: {
  profileImage?: string | null;
  photoUrl?: string | null;
  avatarUrl?: string | null;
  name?: string | null;
  fullName?: string | null;
  displayName?: string | null;
  email?: string | null;
} | null | undefined): AvatarSource {
  const pickName = (): string => {
    const raw =
      (user?.name as string | undefined) ||
      (user?.fullName as string | undefined) ||
      (user?.displayName as string | undefined) ||
      (user?.email as string | undefined) ||
      "";
    const trimmed = raw.trim();
    if (trimmed) return trimmed;
    return "User";
  };

  const pickInitial = (): string => {
    const base = pickName();
    const ch = base.trim().charAt(0);
    return ch ? ch.toUpperCase() : "U";
  };

  const candidates: Array<string | null | undefined> = [
    user?.profileImage as string | null | undefined,
    user?.photoUrl as string | null | undefined,
    user?.avatarUrl as string | null | undefined,
  ];

  const rawSrc = candidates.find((v) => typeof v === "string" && v.trim().length > 0) as string | undefined;
  const normalizedSrc = rawSrc ? rawSrc.trim() : "";

  const isLikelyValidUrl = (val: string): boolean => {
    if (!val) return false;
    const s = val.trim();
    if (!s) return false;
    // Ignore known placeholder
    if (s === "/avatar.png" || s.endsWith("/avatar.png")) return false;
    // Accept typical URL forms used in the app
    if (/^https?:\/\//i.test(s)) return true;
    if (s.startsWith("/") || s.startsWith("gs://")) return true;
    return false;
  };

  if (normalizedSrc && isLikelyValidUrl(normalizedSrc)) {
    return { src: normalizedSrc, initial: pickInitial() };
  }

  return { src: undefined, initial: pickInitial() };
}
