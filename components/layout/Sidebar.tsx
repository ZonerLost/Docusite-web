import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { DocIcon, DashboardIcon, MessagesIcon, SettingsIcon, LogoutIcon, CollapseIcon } from '../ui/Icons';
import { XIcon } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import Image from 'next/image';

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  onMobileClose?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const Sidebar: React.FC<SidebarProps> = React.memo(({ isCollapsed = false, onToggle, onMobileClose }) => {
  const router = useRouter();
  const { t } = useTranslation();
  const [activeItem, setActiveItem] = useState('dashboard');

  // Update active item based on current route
  useEffect(() => {
    const path = router.pathname;
    if (path === '/dashboard') {
      setActiveItem('dashboard');
    } else if (path === '/dashboard/messages') {
      setActiveItem('messages');
    } else if (path === '/dashboard/settings') {
      setActiveItem('settings');
    } else if (path === '/') {
      setActiveItem('dashboard'); // Root route also shows dashboard as active
    } else {
      setActiveItem('dashboard'); // Default to dashboard
    }
  }, [router.pathname]);

  const navigationSections: NavSection[] = [
    {
      title: t('navigation.overview'),
      items: [
        {
          id: 'dashboard',
          label: t('common.dashboard'),
          icon: <DashboardIcon isActive={activeItem === 'dashboard'} />,
          onClick: () => {
            router.push('/dashboard');
            onMobileClose?.();
          }
        },
        {
          id: 'messages',
          label: t('common.messages'),
          icon: <MessagesIcon isActive={activeItem === 'messages'} />,
          onClick: () => {
            router.push('/dashboard/messages');
            onMobileClose?.();
          }
        }
      ]
    },
    {
      title: t('navigation.support'),
      items: [
        {
          id: 'settings',
          label: t('common.settings'),
          icon: <SettingsIcon isActive={activeItem === 'settings'} />,
          onClick: () => {
            router.push('/dashboard/settings');
            onMobileClose?.();
          }
        }
      ]
    }
  ];

  const handleLogout = () => {
    // Handle logout logic here
    
    onMobileClose?.();
    router.push('/login');
  };

  return (
    <div className={`bg-white border-r border-border-gray h-full flex flex-col transition-all duration-300 ${
      isCollapsed ? 'w-16 pl-6' : 'w-64 pl-6'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between py-4 border-b border-border-gray">
      <div className="w-28 h-8">
      <Image src="/docusite.svg" alt="Docusite" width={32} height={32} className="w-full h-full" />
      </div>
        <div className="flex items-center space-x-2">
          {/* Mobile Close Button */}
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1 hover:bg-light-gray rounded-md transition-colors"
          >
            <XIcon className="w-5 h-5 text-gray-600" />
          </button>
          {/* Desktop Collapse Button */}
          {!isCollapsed && (
            <button
              onClick={onToggle}
              className="hidden lg:block p-1 hover:bg-light-gray rounded-md transition-colors"
            >
              <CollapseIcon />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-4">
        {navigationSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-6">
            {!isCollapsed && (
              <h3 className=" text-md font-light text-placeholder-gray mb-2">
                {section.title}
              </h3>
            )}
            <nav className="space-y-1">
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className={`w-full flex items-center  py-2 text-md font-normal transition-colors ${
                    activeItem === item.id
                      ? 'bg-gradient-sidebar-active text-action border-r-4 border-action'
                      : 'text-text-gray hover:bg-light-gray'
                  }`}
                >
                  {item.icon}
                  {!isCollapsed && (
                    <span className="ml-3">{item.label}</span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        ))}
      </div>

      {/* Logout - Fixed at bottom */}
      <div className="mt-auto border-t border-border-gray py-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center  py-3 text-md font-semibold cursor-pointer text-black transition-colors"
        >
          <LogoutIcon isActive={false} />
          {!isCollapsed && (
            <span className="ml-3">{t('common.logout')}</span>
          )}
        </button>
      </div>
    </div>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
