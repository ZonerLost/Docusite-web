import React from 'react';
import Link from 'next/link';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Checkbox from '@/components/ui/Checkbox';
import { DocIcon, GoogleIcon, AppleIcon } from '@/components/ui/Icons';
import { User, Mail, Eye, Check } from 'lucide-react';
import { signupSchema, SignupFormValues } from '@/lib/validation';
import { useRouter } from 'next/navigation';

const SignupForm: React.FC = () => {
  const router = useRouter();
  const initialValues: SignupFormValues = {
    fullName: '',
    email: '',
    password: '',
    agreeToTerms: false
  };

  const handleSubmit = (values: SignupFormValues, { setSubmitting }: any) => {
    console.log('Signup form submitted:', values);
    // Handle signup logic here
    setSubmitting(false);
    // Pass email to verification page
    router.push(`/verification?email=${encodeURIComponent(values.email)}`);
  };

  const handleGoogleSignIn = () => {
    // Open Google OAuth popup
    const googleAuthUrl = 'https://accounts.google.com/oauth/authorize?client_id=your-client-id&redirect_uri=http://localhost:3000/auth/google/callback&response_type=code&scope=email profile';
    window.open(googleAuthUrl, 'google-auth', 'width=500,height=600,scrollbars=yes,resizable=yes');
  };

  const handleAppleSignIn = () => {
    // Open Apple OAuth popup
    const appleAuthUrl = 'https://appleid.apple.com/auth/authorize?client_id=your-apple-client-id&redirect_uri=http://localhost:3000/auth/apple/callback&response_type=code&scope=name email';
    window.open(appleAuthUrl, 'apple-auth', 'width=500,height=600,scrollbars=yes,resizable=yes');
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

      {/* Signup Form */}
      <Formik
        initialValues={initialValues}
        validationSchema={signupSchema}
        onSubmit={handleSubmit}
      >
        {({ values, errors, touched, isSubmitting, setFieldValue }) => (
          <Form>
            <div className="mb-2">
              <Field name="fullName">
                {({ field }: any) => (
                  <Input
                    {...field}
                    id="fullName"
                    type="text"
                    placeholder="Full name"
                    icon={<User className="text-black h-5 w-5" />}
                    successIcon={<div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"><Check className="text-white h-3 w-3" /></div>}
                    error={touched.fullName && errors.fullName ? errors.fullName : undefined}
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
                    icon={<Mail className="text-black h-5 w-5" />}
                    successIcon={<div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"><Check className="text-white h-3 w-3" /></div>}
                    error={touched.email && errors.email ? errors.email : undefined}
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
                    icon={<Eye className="text-black h-5 w-5" />}
                    successIcon={<div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"><Check className="text-white h-3 w-3" /></div>}
                    error={touched.password && errors.password ? errors.password : undefined}
                  />
                )}
              </Field>
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-center mb-4">
              <Checkbox
                id="agreeToTerms"
                name="agreeToTerms"
                checked={values.agreeToTerms}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFieldValue('agreeToTerms', e.target.checked)}
              />
              <div className="ml-2 text-sm text-gray-600">
                <span>I agree to the </span>
                <Link href="/privacy-policy" className="font-medium text-action hover:text-action/80">
                  Privacy Policy
                </Link>
              </div>
            </div>
            {touched.agreeToTerms && errors.agreeToTerms && (
              <div className="mb-4">
                <p className="text-sm text-error">{errors.agreeToTerms}</p>
              </div>
            )}

            <Button type="submit" className="w-full bg-action text-white" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account...' : 'Continue'}
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

      {/* Social Login Buttons */}
      <div className="mt-3 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
        <Button variant="outline" className="flex-1" onClick={handleGoogleSignIn}>
          <GoogleIcon />
          Google
        </Button>
        
        <Button variant="outline" className="flex-1" onClick={handleAppleSignIn}>
          <AppleIcon />
          Apple
        </Button>
      </div>

      {/* Login Link */}
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          Already have an Account?{' '}
          <Link href="/login" className="font-medium text-action hover:text-action/80">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignupForm;
