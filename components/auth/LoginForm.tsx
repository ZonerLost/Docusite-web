
// "use client";

// import React from "react";
// import Link from "next/link";
// import { Formik, Form, Field } from "formik";
// import Button from "@/components/ui/Button";
// import Input from "@/components/ui/Input";
// import Checkbox from "@/components/ui/Checkbox";
// import { Mail, Eye, Check } from "lucide-react";
// import { loginSchema, LoginFormValues } from "@/lib/validation";
// import { useRouter } from "next/router";
// import Image from "next/image";
// import { loginWithEmail, niceError } from "@/services/authService";
// import { setAuthPersistence } from "@/lib/firebase-client";

// const LoginForm: React.FC = () => {
//   const router = useRouter();
//   const nextPath = (router.query?.next as string) || "/dashboard";

//   const initialValues: LoginFormValues = {
//     email: "",
//     password: "",
//     rememberMe: false,
//   };

//   const handleSubmit = async (
//     values: LoginFormValues,
//     { setSubmitting, setStatus }: any
//   ) => {
//     setStatus?.(null);
//     try {
//       // Simple email+password login
//       await setAuthPersistence(values.rememberMe);
//       await loginWithEmail(values.email, values.password);
//       router.replace(nextPath);
//     } catch (e) {
//       setStatus?.({ error: niceError(e, "Unable to sign in.") });
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   return (
//     <div className="w-full max-w-md mx-auto">
//       {/* Logo */}
//       <div className="flex justify-start mb-4 sm:mb-6">
//         <div className="w-12 h-12 bg-light-blue rounded-full flex items-center justify-center">
//           <Image src="/DocuSiteIcon.svg" alt="Docusite" width={24} height={24} />
//         </div>
//       </div>

//       {/* Header */}
//       <div className="text-left mb-4 sm:mb-6">
//         <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
//           Login to Dashboard
//         </h1>
//         <p className="text-sm text-gray-600">
//           Please enter the credentials to get started
//         </p>
//       </div>

//       {/* Form */}
//       <Formik<LoginFormValues>
//         initialValues={initialValues}
//         validationSchema={loginSchema}
//         onSubmit={handleSubmit}
//       >
//         {({ values, errors, touched, isSubmitting, setFieldValue, status }) => (
//           <Form noValidate>
//             <div className="mb-2">
//               <Field name="email">
//                 {({ field }: any) => (
//                   <Input
//                     {...field}
//                     id="email"
//                     type="email"
//                     placeholder="Email address"
//                     autoComplete="email"
//                     icon={<Mail className="text-black h-5 w-5" />}
//                     successIcon={
//                       <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
//                         <Check className="text-white h-3 w-3" />
//                       </div>
//                     }
//                     error={
//                       touched.email && errors.email
//                         ? (errors.email as string)
//                         : undefined
//                     }
//                   />
//                 )}
//               </Field>
//             </div>

//             <div className="mb-2">
//               <Field name="password">
//                 {({ field }: any) => (
//                   <Input
//                     {...field}
//                     id="password"
//                     type="password"
//                     placeholder="Password"
//                     autoComplete="current-password"
//                     icon={<Eye className="text-black h-5 w-5" />}
//                     successIcon={
//                       <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
//                         <Check className="text-white h-3 w-3" />
//                       </div>
//                     }
//                     error={
//                       touched.password && errors.password
//                         ? (errors.password as string)
//                         : undefined
//                     }
//                   />
//                 )}
//               </Field>
//             </div>

//             {/* Forgot Password */}
//             <div className="text-sm text-right -mt-1 mb-3">
//               <Link
//                 href="/forgot-password"
//                 className="font-medium text-action hover:text-action/80"
//               >
//                 Forgot Password?
//               </Link>
//             </div>

//             {/* Remember Me */}
//             <div className="flex items-center mb-3">
//               <Checkbox
//                 id="rememberMe"
//                 name="rememberMe"
//                 label="Remember me"
//                 checked={values.rememberMe}
//                 onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
//                   setFieldValue("rememberMe", e.target.checked)
//                 }
//               />
//             </div>

//             {/* Server error */}
//             {status?.error && (
//               <p className="mb-3 text-sm text-error" role="alert" aria-live="polite">
//                 {status.error}
//               </p>
//             )}

//             <Button
//               type="submit"
//               className="w-full bg-action text-white"
//               disabled={isSubmitting}
//             >
//               {isSubmitting ? "Signing in..." : "Continue"}
//             </Button>
//           </Form>
//         )}
//       </Formik>

//       {/* Footer */}
//       <div className="mt-4 text-center">
//         <p className="text-sm text-gray-600">
//           Don&apos;t have an account?{" "}
//           <Link
//             href="/signup"
//             className="font-medium text-action hover:text-action/80"
//           >
//             Create account
//           </Link>
//         </p>
//       </div>
//     </div>
//   );
// };

// export default LoginForm;
   

"use client";

import React from "react";
import Link from "next/link";
import { Formik, Form, Field } from "formik";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Checkbox from "@/components/ui/Checkbox";
import { Mail, Eye, Check } from "lucide-react";
import { loginSchema, LoginFormValues } from "@/lib/validation";
import { useRouter } from "next/router";
import Image from "next/image";
import { loginWithEmail, niceError } from "@/services/authService";
import { setAuthPersistence } from "@/lib/firebase-client";
import { FirebaseError } from "firebase/app";

const LoginForm: React.FC = () => {
  const router = useRouter();
  const nextPath = (router.query?.next as string) || "/dashboard";

  const initialValues: LoginFormValues = {
    email: "",
    password: "",
    rememberMe: false,
  };

  const handleSubmit = async (
    values: LoginFormValues,
    { setSubmitting, setStatus }: any
  ) => {
    setStatus?.(null);
    try {
      await setAuthPersistence(values.rememberMe);
      await loginWithEmail(values.email, values.password);
      router.replace(nextPath);
    } catch (e: unknown) {
      if (e instanceof FirebaseError) {
        console.error("Firebase login error:", { code: e.code, message: e.message });
      } else {
        console.error("Login error:", e);
      }
      setStatus?.({ error: niceError(e, "Unable to sign in.") });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Logo */}
      <div className="flex justify-start mb-4 sm:mb-6">
        <div className="w-12 h-12 bg-light-blue rounded-full flex items-center justify-center">
          <Image src="/DocuSiteIcon.svg" alt="Docusite" width={24} height={24} />
        </div>
      </div>

      {/* Header */}
      <div className="text-left mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
          Login to Dashboard
        </h1>
        <p className="text-sm text-gray-600">
          Please enter the credentials to get started
        </p>
      </div>

      {/* Form */}
      <Formik<LoginFormValues>
        initialValues={initialValues}
        validationSchema={loginSchema}
        onSubmit={handleSubmit}
      >
        {({ values, errors, touched, isSubmitting, setFieldValue, status }) => (
          <Form noValidate>
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
                    placeholder="Password"
                    autoComplete="current-password"
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

            {/* Forgot Password */}
            <div className="text-sm text-right -mt-1 mb-3">
              <Link
                href="/forgot-password"
                className="font-medium text-action hover:text-action/80"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Remember Me */}
            <div className="flex items-center mb-3">
              <Checkbox
                id="rememberMe"
                name="rememberMe"
                label="Remember me"
                checked={values.rememberMe}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFieldValue("rememberMe", e.target.checked)
                }
              />
            </div>

            {/* Server error */}
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
              {isSubmitting ? "Signing in..." : "Continue"}
            </Button>
          </Form>
        )}
      </Formik>

      {/* Footer */}
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-action hover:text-action/80"
          >
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;
