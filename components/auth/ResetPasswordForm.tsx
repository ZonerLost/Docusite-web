import React from 'react';
import { Formik, Form, Field } from 'formik';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { DocIcon } from '@/components/ui/Icons';
import { Eye, Check } from 'lucide-react';
import Link from 'next/link';
import { resetPasswordSchema, ResetPasswordFormValues } from '@/lib/validation';

const ResetPasswordForm: React.FC = () => {
  const initialValues: ResetPasswordFormValues = {
    newPassword: '',
    confirmPassword: ''
  };

  const handleSubmit = (values: ResetPasswordFormValues, { setSubmitting }: any) => {
    console.log('Reset password form submitted:', values);
    // Handle reset password logic here
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
          Reset Password
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Please create your new password. Do not share with any of your friends.
        </p>
      </div>

      {/* Reset Password Form */}
      <Formik
        initialValues={initialValues}
        validationSchema={resetPasswordSchema}
        onSubmit={handleSubmit}
      >
        {({ errors, touched, isSubmitting }) => (
          <Form>
            <div className="mb-4">
              <Field name="newPassword">
                {({ field }: any) => (
                  <Input
                    {...field}
                    id="newPassword"
                    type="password"
                    placeholder="Create new password"
                    icon={<Eye className="text-black h-5 w-5" />}
                    successIcon={<div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"><Check className="text-white h-3 w-3" /></div>}
                    error={touched.newPassword && errors.newPassword ? errors.newPassword : undefined}
                  />
                )}
              </Field>
            </div>

            <div className="mb-6">
              <Field name="confirmPassword">
                {({ field }: any) => (
                  <Input
                    {...field}
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    icon={<Eye className="text-black h-5 w-5" />}
                    successIcon={<div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"><Check className="text-white h-3 w-3" /></div>}
                    error={touched.confirmPassword && errors.confirmPassword ? errors.confirmPassword : undefined}
                  />
                )}
              </Field>
            </div>

            <Button type="submit" className="w-full bg-action text-white" disabled={isSubmitting}>
              {isSubmitting ? 'Resetting...' : 'Confirm'}
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

export default ResetPasswordForm;
