import React from 'react';
import SignupForm from '@/components/auth/SignupForm';
import DashboardPreview from '@/components/dashboard/DashboardPreview';

const Signup: React.FC = () => {
  return (
    <div className="min-h-screen bg-light-gray flex flex-col lg:flex-row overflow-hidden">
      {/* Left Side - Signup Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-4 sm:py-4 lg:py-6">
        <SignupForm />
      </div>

      {/* Right Side - Dashboard Preview */}
      <DashboardPreview />
    </div>
  );
};

export default Signup;
