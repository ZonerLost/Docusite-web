"use client";

import React from "react";
import Link from "next/link";
import { Formik, Form, Field } from "formik";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Checkbox from "@/components/ui/Checkbox";
import { DocIcon } from "@/components/ui/Icons";
import { User, Mail, Eye, Check } from "lucide-react";
import { signupSchema, SignupFormValues } from "@/lib/validation";
import { useRouter } from "next/router";
import { signupAdmin, niceError } from "@/services/authService";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";
import { auth } from "@/lib/firebase-client";
import { sendVerificationEmailLink } from "@/services/emailVerificationService";

const SignupForm: React.FC = () => {
  const router = useRouter();

  const initialValues: SignupFormValues = {
    fullName: "",
    email: "",
    password: "",
    agreeToTerms: false,
  };

  const handleSubmit = async (
    values: SignupFormValues,
    { setSubmitting, setStatus }: any
  ) => {
    setStatus?.(null);
    try {
      // Create user (your existing service)
      await signupAdmin({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
      });

      // If Firebase signed in the user, send verification email
      const user = auth.currentUser;
      if (!user) {
        // If your signupAdmin doesn't sign-in user, you must sign-in here or use custom tokens.
        throw new Error("User not authenticated after signup. Ensure signup signs-in the user.");
      }

      // If already verified (rare for email/pass), go dashboard
      if (user.emailVerified) {
        router.push("/dashboard");
        return;
      }

      await sendVerificationEmailLink(user, { redirectPath: "/verify-email" });

      // Go to "check your email" screen
      router.push(`/verification?email=${encodeURIComponent(values.email)}&next=/dashboard`);
    } catch (e) {
      setStatus?.({ error: niceError(e, "Failed to create your account.") });
    } finally {
      setSubmitting(false);
    }
  };

  return (
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
          Register Now
        </h1>
        <p className="text-sm text-gray-600">
          Please enter the Information to get started
        </p>
      </div>

      <Formik<SignupFormValues>
        initialValues={initialValues}
        validationSchema={signupSchema}
        onSubmit={handleSubmit}
      >
        {({ values, errors, touched, isSubmitting, setFieldValue, status, setStatus }) => (
          <Form noValidate>
            <div className="mb-2">
              <Field name="fullName">
                {({ field }: any) => (
                  <Input
                    {...field}
                    id="fullName"
                    type="text"
                    placeholder="Full name"
                    autoComplete="name"
                    icon={<User className="text-black h-5 w-5" />}
                    successIcon={
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <Check className="text-white h-3 w-3" />
                      </div>
                    }
                    error={
                      touched.fullName && errors.fullName
                        ? (errors.fullName as string)
                        : undefined
                    }
                  />
                )}
              </Field>
            </div>

            <div className="mb-2">
              <Field name="email">
                {({ field }: any) => (
                  <Input
                    {...field}
                    id="email"
                    type="email"
                    placeholder="Email address"
                    autoComplete="email"
                    icon={<Mail className="text-black h-5 w-5" />}
                    successIcon={
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <Check className="text-white h-3 w-3" />
                      </div>
                    }
                    error={
                      touched.email && errors.email
                        ? (errors.email as string)
                        : undefined
                    }
                  />
                )}
              </Field>
            </div>

            <div className="mb-2">
              <Field name="password">
                {({ field }: any) => (
                  <Input
                    {...field}
                    id="password"
                    type="password"
                    placeholder="Create password"
                    autoComplete="new-password"
                    icon={<Eye className="text-black h-5 w-5" />}
                    successIcon={
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <Check className="text-white h-3 w-3" />
                      </div>
                    }
                    error={
                      touched.password && errors.password
                        ? (errors.password as string)
                        : undefined
                    }
                  />
                )}
              </Field>
            </div>

            {/* Terms */}
            <div className="flex items-center mb-2">
              <Checkbox
                id="agreeToTerms"
                name="agreeToTerms"
                checked={values.agreeToTerms}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFieldValue("agreeToTerms", e.target.checked)
                }
              />
              <div className="ml-2 text-sm text-gray-600">
                <span>I agree to the </span>
                <Link
                  href="/privacy-policy"
                  className="font-medium text-action hover:text-action/80"
                >
                  Privacy Policy
                </Link>
              </div>
            </div>

            {touched.agreeToTerms && errors.agreeToTerms && (
              <p className="mb-2 text-sm text-error">{errors.agreeToTerms as string}</p>
            )}

            {status?.error && (
              <p className="mb-3 text-sm text-error" role="alert" aria-live="polite">
                {status.error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-action text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating account..." : "Continue"}
            </Button>

            {/* Divider */}
            <div className="mt-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-50 text-gray-500">or sign in</span>
                </div>
              </div>
            </div>

            {/* Google (reuse) */}
            <div className="mt-4">
              <GoogleAuthButton
                redirectTo="/dashboard"
                navigation="push"
                disabled={isSubmitting}
                onError={(msg) => setStatus?.({ error: msg })}
              />
            </div>

            {/* Login link */}
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Already have an Account?{" "}
                <Link href="/login" className="font-medium text-action hover:text-action/80">
                  Login
                </Link>
              </p>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default SignupForm;
