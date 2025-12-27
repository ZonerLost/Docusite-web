"use client";

import React from "react";
import { useRouter } from "next/router";
import { applyActionCode } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import Button from "@/components/ui/Button";
import { niceError } from "@/services/authService";

const VerifyEmailPage: React.FC = () => {
  const router = useRouter();
  const { mode, oobCode, continueUrl } = router.query;

  const [state, setState] = React.useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = React.useState<string>("Verifying your email...");

  React.useEffect(() => {
    const run = async () => {
      try {
        const m = typeof mode === "string" ? mode : "";
        const code = typeof oobCode === "string" ? oobCode : "";

        if (m !== "verifyEmail" || !code) {
          setState("error");
          setMessage("Invalid verification link.");
          return;
        }

        await applyActionCode(auth, code);

        setState("success");
        setMessage("Your email has been verified successfully.");
      } catch (e) {
        setState("error");
        setMessage(niceError(e, "Unable to verify email. The link may be expired."));
      }
    };

    // Run only when query is ready
    if (!router.isReady) return;
    run();
  }, [router.isReady, mode, oobCode]);

  const goNext = () => {
    // If Firebase gives continueUrl, you can respect it — but keep it safe
    if (typeof continueUrl === "string" && continueUrl.startsWith("http")) {
      window.location.href = continueUrl;
      return;
    }
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-light-gray flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-xl p-6 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          {state === "loading" ? "Verifying..." : state === "success" ? "Verified" : "Error"}
        </h1>
        <p className="text-sm text-gray-600 mb-6">{message}</p>

        {state !== "loading" && (
          <Button className="w-full bg-action text-white" onClick={goNext}>
            Continue
          </Button>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;
