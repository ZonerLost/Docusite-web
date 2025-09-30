import React from 'react';
import LoginForm from '@/components/auth/LoginForm';
import DashboardPreview from '@/components/dashboard/DashboardPreview';

const Login: React.FC = () => {
  return (
    <div className="min-h-screen bg-light-gray flex flex-col lg:flex-row overflow-hidden">
      {/* Left Side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-4 sm:py-4 lg:py-6">
        <LoginForm />
      </div>

      {/* Right Side - Dashboard Preview */}
      <DashboardPreview />
    </div>
  );
};

export default Login;
