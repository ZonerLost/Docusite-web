import React from 'react';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';
import DashboardPreview from '@/components/dashboard/DashboardPreview';

const ResetPassword: React.FC = () => {
  return (
    <div className="h-screen bg-gray-50 flex flex-col lg:flex-row overflow-hidden">
      {/* Left Side - Reset Password Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <ResetPasswordForm />
      </div>

      {/* Right Side - Dashboard Preview */}
      <DashboardPreview />
    </div>
  );
};

export default ResetPassword;
