"use client";

import React from "react";
import { useRouter } from "next/router";
import { FirebaseError } from "firebase/app";

import Button from "@/components/ui/Button";
import { loginWithGoogle } from "@/services/googleAuthService";
import { setAuthPersistence } from "@/lib/firebase-client";
import { niceError } from "@/services/authService";

type GoogleAuthButtonProps = {
  redirectTo: string;
  /**
   * For your setup: you used rememberMe to control persistence.
   * Signup doesn't have rememberMe, so we default to true (persist user).
   */
  rememberMe?: boolean;
  disabled?: boolean;
  className?: string;
  onError?: (message: string) => void;
  /**
   * If you want replace instead of push (login usually uses replace).
   */
  navigation?: "push" | "replace";
};

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" {...props}>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.651 32.658 29.197 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.047 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 16.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.047 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.197l-6.19-5.238C29.16 35.142 26.715 36 24 36c-5.176 0-9.617-3.318-11.279-7.946l-6.52 5.023C9.518 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.084 5.565l.003-.002 6.19 5.238C36.97 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  redirectTo,
  rememberMe = true,
  disabled,
  className,
  onError,
  navigation = "push",
}) => {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const go = (path: string) =>
    navigation === "replace" ? router.replace(path) : router.push(path);

  const handleGoogle = async () => {
    if (loading || disabled) return;
    setLoading(true);

    try {
      await setAuthPersistence(rememberMe);
      await loginWithGoogle();
      go(redirectTo);
    } catch (e: unknown) {
      if (e instanceof FirebaseError) {
        console.error("Google auth error:", { code: e.code, message: e.message });
      } else {
        console.error("Google auth error:", e);
      }
      const msg = niceError(e, "Unable to continue with Google.");
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      className={
        className ??
        "w-full bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-2"
      }
      disabled={disabled || loading}
      onClick={handleGoogle}
    >
      {loading ? (
        "Connecting..."
      ) : (
        <>
          <GoogleIcon className="h-5 w-5" />
          Continue with Google
        </>
      )}
    </Button>
  );
};

export default GoogleAuthButton;
