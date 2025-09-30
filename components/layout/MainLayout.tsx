import React, { useState, Suspense, lazy } from 'react';
import { useRouter } from 'next/router';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import DashboardLayout from './DashboardLayout';
import { useUser } from '@/contexts/UserContext';
import LazyWrapper from '../ui/LazyWrapper';

// Lazy load heavy components
const ProjectDetailsModal = lazy(() => import('../modals/ProjectDetailsModal'));

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const router = useRouter();
  const { profilePicture, userName } = useUser();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Check if current route is dashboard-related
  const isDashboardRoute = router.pathname === '/dashboard' || 
                          router.pathname === '/dashboard/messages' || 
                          router.pathname === '/dashboard/settings' ||
                          router.pathname === '/';

  return (
    <div className="flex h-screen bg-light-gray">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={handleMobileMenuToggle}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar 
          isCollapsed={sidebarCollapsed} 
          onToggle={handleSidebarToggle}
          onMobileClose={handleMobileMenuToggle}
        />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Top Bar */}
        <TopBar 
          onMobileMenuToggle={handleMobileMenuToggle}
          userProfile={{
            name: userName,
            avatar: profilePicture
          }}
        />
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-light-gray">
          {isDashboardRoute ? (
            <DashboardLayout>
              {children}
            </DashboardLayout>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
