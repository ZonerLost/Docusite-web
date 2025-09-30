import React from 'react';
import { useRouter } from 'next/router';
import VerificationForm from '@/components/auth/VerificationForm';
import DashboardPreview from '@/components/dashboard/DashboardPreview';

const Verification: React.FC = () => {
  const router = useRouter();
  const { email } = router.query;

  return (
    <div className="min-h-screen bg-light-gray flex flex-col lg:flex-row overflow-hidden">
      {/* Left Side - Verification Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-4 sm:py-4 lg:py-6">
        <VerificationForm email={email as string} />
      </div>

      {/* Right Side - Dashboard Preview */}
      <DashboardPreview />
    </div>
  );
};

export default Verification;
