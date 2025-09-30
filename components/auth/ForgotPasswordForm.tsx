import React from 'react';
import { Formik, Form, Field } from 'formik';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { DocIcon } from '@/components/ui/Icons';
import { Mail, Check } from 'lucide-react';
import Link from 'next/link';
import { forgotPasswordSchema, ForgotPasswordFormValues } from '@/lib/validation';

const ForgotPasswordForm: React.FC = () => {
  const initialValues: ForgotPasswordFormValues = {
    email: ''
  };

  const handleSubmit = (values: ForgotPasswordFormValues, { setSubmitting }: any) => {
    console.log('Forgot password form submitted:', values);
    // Handle forgot password logic here
    setSubmitting(false);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Logo */}
      <div className="flex justify-start mb-8 sm:mb-12">
        <div className="w-16 h-16 bg-light-blue rounded-full flex items-center justify-center">
          <DocIcon />
        </div>
      </div>

      {/* Header */}
      <div className="text-left mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Forgot Password
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          No Worries! Please enter the email address that starts with k******@gmail.com
        </p>
      </div>

      {/* Forgot Password Form */}
      <Formik
        initialValues={initialValues}
        validationSchema={forgotPasswordSchema}
        onSubmit={handleSubmit}
      >
        {({ errors, touched, isSubmitting }) => (
          <Form>
            <div className="mb-6">
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

            <Button type="submit" className="w-full bg-action text-white" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Verification Link'}
            </Button>
          </Form>
        )}
      </Formik>

      {/* Back to Login Link */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-600">
          Back to{' '}
          <Link href="/login" className="font-medium text-action hover:text-action/80">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;
