"use client";

import React from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import SuccessModal from "@/components/ui/SuccessModal";
import { DocIcon } from "@/components/ui/Icons";
import { useRouter } from "next/router";
import { auth } from "@/lib/firebase-client";
import { niceError } from "@/services/authService";
import {
  isCurrentUserEmailVerified,
  sendVerificationEmailLink,
} from "@/services/emailVerificationService";

interface VerificationFormProps {
  email?: string;
  nextPath?: string;
}

const VerificationForm: React.FC<VerificationFormProps> = ({ email, nextPath = "/dashboard" }) => {
  const router = useRouter();

  const [isSuccessModalOpen, setIsSuccessModalOpen] = React.useState(false);
  const [timeLeft, setTimeLeft] = React.useState(60);
  const [canResend, setCanResend] = React.useState(false);

  const [status, setStatus] = React.useState<{ error?: string; info?: string } | null>(
    null
  );
  const [checking, setChecking] = React.useState(false);
  const [resending, setResending] = React.useState(false);

  React.useEffect(() => {
    // countdown
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const maskEmail = (val?: string) => {
    if (!val) return "your email address";
    const [localPart, domain] = val.split("@");
    if (!domain) return val;
    if (localPart.length <= 2) return `${localPart[0]}******@${domain}`;
    return `${localPart[0]}${"*".repeat(localPart.length - 2)}${localPart[localPart.length - 1]}@${domain}`;
  };

  const handleResend = async () => {
    setStatus(null);
    setResending(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        setStatus({ error: "Please login again to resend the verification email." });
        return;
      }

      await sendVerificationEmailLink(user, { redirectPath: "/verify-email" });
      setTimeLeft(60);
      setCanResend(false);
      setStatus({ info: "Verification email sent again. Please check your inbox." });
    } catch (e) {
      setStatus({ error: niceError(e, "Unable to resend verification email.") });
    } finally {
      setResending(false);
    }
  };

  const handleIveVerified = async () => {
    setStatus(null);
    setChecking(true);
    try {
      const verified = await isCurrentUserEmailVerified();
      if (!verified) {
        setStatus({
          error: "Not verified yet. Please click the verification link in your email, then try again.",
        });
        return;
      }
      setIsSuccessModalOpen(true);
    } catch (e) {
      setStatus({ error: niceError(e, "Unable to verify status. Please try again.") });
    } finally {
      setChecking(false);
    }
  };

  const handleGoToHome = () => {
    setIsSuccessModalOpen(false);
    router.push(nextPath);
  };

  return (
    <>
      <div className="w-full max-w-md mx-auto">
        {/* Logo */}
        <div className="flex justify-start mb-4 sm:mb-6">
          <div className="w-12 h-12 bg-light-blue rounded-full flex items-center justify-center">
            <DocIcon />
          </div>
        </div>

        {/* Header */}
        <div className="text-left mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
            Verify your email
          </h1>
          <p className="text-sm text-gray-600">
            We sent a verification link to <b>{maskEmail(email)}</b>. Please open your inbox and click the link.
          </p>
        </div>

        {/* Info / Error */}
        {status?.info && (
          <p className="mb-3 text-sm text-green-600" role="status" aria-live="polite">
            {status.info}
          </p>
        )}
        {status?.error && (
          <p className="mb-3 text-sm text-error" role="alert" aria-live="polite">
            {status.error}
          </p>
        )}

        {/* Actions */}
        <Button
          type="button"
          className="w-full bg-action text-white"
          disabled={checking}
          onClick={handleIveVerified}
        >
          {checking ? "Checking..." : "I’ve verified — Continue"}
        </Button>

        {/* Resend */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Didn’t receive email?{" "}
            {canResend ? (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="font-medium text-action hover:text-action/80 disabled:opacity-60"
              >
                {resending ? "Sending..." : "Resend"}
              </button>
            ) : (
              <span className="font-medium text-action">{formatTime(timeLeft)}</span>
            )}
          </p>
        </div>

        {/* Back */}
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Wrong email?{" "}
            <Link href="/signup" className="font-medium text-action hover:text-action/80">
              Go back
            </Link>
          </p>
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        title="Email verified"
        message="Your email has been verified successfully."
        buttonText="Go to dashboard"
        onButtonClick={handleGoToHome}
      />
    </>
  );
};

export default VerificationForm;
