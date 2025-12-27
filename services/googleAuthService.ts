import { GoogleAuthProvider, signInWithPopup, type UserCredential } from "firebase/auth";
import { auth } from "@/lib/firebase-client";

/**
 * Google sign-in (popup).
 * Make sure Google provider is enabled in Firebase Console:
 * Auth -> Sign-in method -> Google -> Enable
 */
export async function loginWithGoogle(): Promise<UserCredential> {
  const provider = new GoogleAuthProvider();

  // Always let user pick account (good UX if they have multiple)
  provider.setCustomParameters({ prompt: "select_account" });

  return signInWithPopup(auth, provider);
}
