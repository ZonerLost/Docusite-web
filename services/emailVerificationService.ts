// services/emailVerificationService.ts
import { sendEmailVerification, reload, type User } from "firebase/auth";
import { auth } from "@/lib/firebase-client";

type SendVerificationOptions = {
  /** Where Firebase email link should return (must be an authorized domain in Firebase console) */
  redirectPath?: string; // default: "/verify-email"
};

export async function sendVerificationEmailLink(
  user?: User,
  options: SendVerificationOptions = {}
) {
  const u = user ?? auth.currentUser;
  if (!u) throw new Error("No authenticated user found to send verification email.");

  const redirectPath = options.redirectPath ?? "/verify-email";

  // Build full URL in browser only
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "";

  // If origin is available, pass actionCodeSettings so the link returns to your app route
  const actionCodeSettings = origin
    ? { url: `${origin}${redirectPath}` }
    : undefined;

  await sendEmailVerification(u, actionCodeSettings);
}

export async function reloadCurrentUser() {
  if (!auth.currentUser) return null;
  await reload(auth.currentUser);
  return auth.currentUser;
}

export async function isCurrentUserEmailVerified() {
  const u = await reloadCurrentUser();
  return Boolean(u?.emailVerified);
}
