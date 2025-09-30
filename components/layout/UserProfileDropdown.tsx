import React, { useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { UserIcon, SettingsIcon, LogOutIcon, HelpCircleIcon, BellIcon } from 'lucide-react';

interface UserProfileDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userAvatar?: string;
  onNotificationClick?: () => void;
}

const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({
  isOpen,
  onClose,
  userName,
  userAvatar,
  onNotificationClick
}) => {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleProfileClick = () => {
    // Check if we're already on the settings page
    if (router.pathname === '/dashboard/settings') {
      // If already on settings page, switch to account tab (default tab)
      window.location.hash = '#account';
      // Force both hash change event and custom event
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      window.dispatchEvent(new CustomEvent('hashUpdated'));
    } else {
      // Navigate to settings page (defaults to account tab)
      router.push('/dashboard/settings');
    }
    onClose();
  };

  const handleNotificationsClick = () => {
    // Trigger the notification dropdown in TopBar
    onNotificationClick?.();
    onClose();
  };

  const handleHelpClick = () => {
    // Check if we're already on the settings page
    if (router.pathname === '/dashboard/settings') {
      // If already on settings page, just update the hash and trigger tab change
      window.location.hash = '#help';
      // Force both hash change event and custom event
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      window.dispatchEvent(new CustomEvent('hashUpdated'));
    } else {
      // Navigate to help & support page with hash
      router.push('/dashboard/settings#help');
    }
    onClose();
  };

  const handleLogoutClick = () => {
    router.push('/login');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-border-gray z-50 overflow-hidden animate-scale-in"
      style={{
        animation: 'scaleIn 0.2s ease-out'
      }}
    >
      {/* User Info Header */}
      <div className="p-4 border-b border-border-gray">
        <div className="flex items-center space-x-3">
          <img
            src={userAvatar || "/avatar.png"}
            alt={userName}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <p className="font-semibold text-black">{userName}</p>
            <p className="text-sm text-text-gray">Premium Member</p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="py-2">
        <button
          onClick={handleProfileClick}
          className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-light-gray transition-colors"
        >
          <UserIcon className="w-5 h-5 text-text-gray" />
          <span className="text-black">Profile Settings</span>
          
        </button>

        <button
          onClick={handleNotificationsClick}
          className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-light-gray transition-colors"
        >
          <BellIcon className="w-5 h-5 text-text-gray" />
          <span className="text-black">Notifications</span>
        </button>

        <button
          onClick={handleHelpClick}
          className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-light-gray transition-colors"
        >
          <HelpCircleIcon className="w-5 h-5 text-text-gray" />
          <span className="text-black">Help & Support</span>
        </button>

        {/* Divider */}
        <div className="border-t border-border-gray my-2"></div>

        <button
          onClick={handleLogoutClick}
          className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-light-gray transition-colors"
        >
          <LogOutIcon className="w-5 h-5 text-text-gray" />
          <span className="text-black">Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default UserProfileDropdown;
