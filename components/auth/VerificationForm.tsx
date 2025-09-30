import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import Button from '@/components/ui/Button';
import VerificationCodeInput from '@/components/ui/VerificationCodeInput';
import SuccessModal from '@/components/ui/SuccessModal';
import { DocIcon } from '@/components/ui/Icons';
import { verificationSchema, VerificationFormValues } from '@/lib/validation';
import { useRouter } from 'next/navigation';

interface VerificationFormProps {
  email?: string;
}

const VerificationForm: React.FC<VerificationFormProps> = ({ email }) => {
  const router = useRouter();
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds countdown
  const [canResend, setCanResend] = useState(false);

  const initialValues: VerificationFormValues = {
    code: ''
  };

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const handleCodeComplete = (code: string) => {
    // Auto-submit when code is complete
    handleSubmit({ code });
  };

  const handleSubmit = (values: VerificationFormValues) => {
    console.log('Verification code submitted:', values);
    // Here you would typically verify the code with your backend
    // For demo purposes, we'll show success modal
    setIsSuccessModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsSuccessModalOpen(false);
    // Clear the form when modal is closed
    window.location.reload();
  };

  const handleResendCode = () => {
    console.log('Resending verification code...');
    setTimeLeft(60);
    setCanResend(false);
    // Here you would call your backend to resend the code
  };

  const handleGoToHome = () => {
    setIsSuccessModalOpen(false);
    router.push('/dashboard');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const maskEmail = (email: string) => {
    if (!email) return 'your email address';
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 2) {
      return `${localPart[0]}******@${domain}`;
    }
    const maskedLocal = localPart[0] + '*'.repeat(localPart.length - 2) + localPart[localPart.length - 1];
    return `${maskedLocal}@${domain}`;
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
            Verification Code
          </h1>
          <p className="text-sm text-gray-600">
            We have sent a verification code on your email address {maskEmail(email || '')}
          </p>
        </div>

        {/* Verification Form */}
        <Formik
          initialValues={initialValues}
          validationSchema={verificationSchema}
          onSubmit={handleSubmit}
        >
          {({ errors, touched, isSubmitting, setFieldValue }) => (
            <Form>
              <div className="mb-6">
                <Field name="code">
                  {({ field }: any) => (
                    <VerificationCodeInput
                      length={5}
                      value={field.value}
                      onChange={(code) => setFieldValue('code', code)}
                      onComplete={handleCodeComplete}
                      error={touched.code && errors.code ? errors.code : undefined}
                    />
                  )}
                </Field>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-action text-white" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Verifying...' : 'Continue'}
              </Button>
            </Form>
          )}
        </Formik>

        {/* Resend Code Section */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Didn't receive code?{' '}
            {canResend ? (
              <button
                onClick={handleResendCode}
                className="font-medium text-action hover:text-action/80"
              >
                Resend
              </button>
            ) : (
              <span className="font-medium text-action">
                {formatTime(timeLeft)}
              </span>
            )}
          </p>
        </div>

        {/* Back to Signup Link */}
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Wrong email?{' '}
            <Link href="/signup" className="font-medium text-action hover:text-action/80">
              Go back
            </Link>
          </p>
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={handleCloseModal}
        title="Registered"
        message="You have successfully created your account. Enjoy the ride"
        buttonText="Go to home page"
        onButtonClick={handleGoToHome}
      />
    </>
  );
};

export default VerificationForm;
