// "use client";

// import React from "react";
// import Link from "next/link";
// import { Formik, Form, Field } from "formik";
// import Button from "@/components/ui/Button";
// import Input from "@/components/ui/Input";
// import Checkbox from "@/components/ui/Checkbox";
// import { DocIcon } from "@/components/ui/Icons";
// import { User, Mail, Eye, Check } from "lucide-react";
// import { signupSchema, SignupFormValues } from "@/lib/validation";
// import { useRouter } from "next/router";
// import { signupAdmin, niceError } from "@/services/authService";


// const SignupForm: React.FC = () => {
//   const router = useRouter();

//   const initialValues: SignupFormValues = {
//     fullName: "",
//     email: "",
//     password: "",
//     agreeToTerms: false,
//     photo: null,
//   };

//   const handleSubmit = async (
//     values: SignupFormValues,
//     { setSubmitting, setStatus }: any
//   ) => {
//     setStatus?.(null);
//     try {
//       await signupAdmin({
//         fullName: values.fullName,
//         email: values.email,
//         password: values.password,
//         file: values.photo ?? undefined,
//       });

//       // Redirect to dashboard after successful signup
//       router.push(`/dashboard`);
//     } catch (e) {
//       setStatus?.({ error: niceError(e, "Failed to create your account.") });
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   return (
//     <div className="w-full max-w-md mx-auto">
//       {/* Logo */}
//       <div className="flex justify-start mb-4 sm:mb-6">
//         <div className="w-12 h-12 bg-light-blue rounded-full flex items-center justify-center">
//           <DocIcon />
//         </div>
//       </div>

//       {/* Header */}
//       <div className="text-left mb-4 sm:mb-6">
//         <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
//           Register Now
//         </h1>
//         <p className="text-sm text-gray-600">
//           Please enter the Information to get started
//         </p>
//       </div>

//       {/* Form */}
//       <Formik<SignupFormValues>
//         initialValues={initialValues}
//         validationSchema={signupSchema}
//         onSubmit={handleSubmit}
//       >
//         {({ values, errors, touched, isSubmitting, setFieldValue, status }) => (
//           <Form noValidate>
//             <div className="mb-2">
//               <Field name="fullName">
//                 {({ field }: any) => (
//                   <Input
//                     {...field}
//                     id="fullName"
//                     type="text"
//                     placeholder="Full name"
//                     autoComplete="name"
//                     icon={<User className="text-black h-5 w-5" />}
//                     successIcon={
//                       <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
//                         <Check className="text-white h-3 w-3" />
//                       </div>
//                     }
//                     error={
//                       touched.fullName && errors.fullName
//                         ? (errors.fullName as string)
//                         : undefined
//                     }
//                   />
//                 )}
//               </Field>
//             </div>

//             {/* Optional profile photo */}
//             <div className="mb-2">
//               <label htmlFor="photo" className="block text-sm font-medium text-gray-700 mb-1">
//                 Profile photo (optional)
//               </label>
//               <input
//                 id="photo"
//                 name="photo"
//                 type="file"
//                 accept="image/*"
//                 onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
//                   const file = e.currentTarget.files?.[0] || null;
//                   setFieldValue("photo", file);
//                 }}
//                 className="block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
//               />
//               {values.photo && (
//                 <div className="mt-2">
//                   {/* Preview */}
//                   <img
//                     src={URL.createObjectURL(values.photo)}
//                     alt="Profile preview"
//                     className="h-16 w-16 rounded-full object-cover border"
//                   />
//                 </div>
//               )}
//             </div>

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
//                     placeholder="Create password"
//                     autoComplete="new-password"
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

//             {/* Terms */}
//             <div className="flex items-center mb-2">
//               <Checkbox
//                 id="agreeToTerms"
//                 name="agreeToTerms"
//                 checked={values.agreeToTerms}
//                 onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
//                   setFieldValue("agreeToTerms", e.target.checked)
//                 }
//               />
//               <div className="ml-2 text-sm text-gray-600">
//                 <span>I agree to the </span>
//                 <Link
//                   href="/privacy-policy"
//                   className="font-medium text-action hover:text-action/80"
//                 >
//                   Privacy Policy
//                 </Link>
//               </div>
//             </div>
//             {touched.agreeToTerms && errors.agreeToTerms && (
//               <p className="mb-2 text-sm text-error">
//                 {errors.agreeToTerms as string}
//               </p>
//             )}

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
//               {isSubmitting ? "Creating account..." : "Continue"}
//             </Button>
//           </Form>
//         )}
//       </Formik>

//       {/* Divider */}
//       <div className="mt-4">
//         <div className="relative">
//           <div className="absolute inset-0 flex items-center">
//             <div className="w-full border-t border-gray-300" />
//           </div>
//           <div className="relative flex justify-center text-sm">
//             <span className="px-2 bg-gray-50 text-gray-500">or sign in</span>
//           </div>
//         </div>
//       </div>

//       {/* Login Link */}
//       <div className="mt-4 text-center">
//         <p className="text-sm text-gray-600">
//           Already have an Account?{" "}
//           <Link
//             href="/login"
//             className="font-medium text-action hover:text-action/80"
//           >
//             Login
//           </Link>
//         </p>
//       </div>
//     </div>
//   );
// };

// export default SignupForm;






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

const SignupForm: React.FC = () => {
  const router = useRouter();

  const initialValues: SignupFormValues = {
    fullName: "",
    email: "",
    password: "",
    agreeToTerms: false,
    photo: null,
  };

  const handleSubmit = async (
    values: SignupFormValues,
    { setSubmitting, setStatus }: any
  ) => {
    setStatus?.(null);
    try {
      await signupAdmin({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        file: values.photo ?? undefined,
      });
      router.push(`/dashboard`);
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

      {/* Form */}
      <Formik<SignupFormValues>
        initialValues={initialValues}
        validationSchema={signupSchema}
        onSubmit={handleSubmit}
      >
        {({ values, errors, touched, isSubmitting, setFieldValue, status }) => (
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

            {/* Optional profile photo */}
            <div className="mb-2">
              <label htmlFor="photo" className="block text-sm font-medium text-gray-700 mb-1">
                Profile photo (optional)
              </label>
              <input
                id="photo"
                name="photo"
                type="file"
                accept="image/*"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const file = e.currentTarget.files?.[0] || null;
                  setFieldValue("photo", file);
                }}
                className="block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
              />
              {values.photo && (
                <div className="mt-2">
                  <img
                    src={URL.createObjectURL(values.photo)}
                    alt="Profile preview"
                    className="h-16 w-16 rounded-full object-cover border"
                  />
                </div>
              )}
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
              <p className="mb-2 text-sm text-error">
                {errors.agreeToTerms as string}
              </p>
            )}

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
              {isSubmitting ? "Creating account..." : "Continue"}
            </Button>
          </Form>
        )}
      </Formik>

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

      {/* Login Link */}
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          Already have an Account?{" "}
          <Link
            href="/login"
            className="font-medium text-action hover:text-action/80"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignupForm;
