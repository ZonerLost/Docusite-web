import React from 'react';
import { useRouter } from 'next/router';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const router = useRouter();

  // Show different content based on the current route
  const renderContent = () => {
    const path = router.pathname;
    
    // For the main dashboard route, render children directly (no wrapper)
    if (path === '/dashboard') {
      return children;
    }
    
    // For sub-routes, render the children with rounded border
    return (
      <div className="bg-white rounded-xl shadow-sm border border-border-gray overflow-hidden h-full">
        {children}
      </div>
    );
  };

  return (
    <div className="h-full max-w-7xl mx-auto p-3 sm:p-4 lg:p-6">
      {renderContent()}
    </div>
  );
};

export default DashboardLayout;
