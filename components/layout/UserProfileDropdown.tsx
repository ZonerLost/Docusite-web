import React, { useRef } from 'react';
import Avatar from '@/components/ui/Avatar';
import { useRouter } from 'next/router';
import { UserIcon, LogOutIcon, HelpCircleIcon, BellIcon } from 'lucide-react';
import { useClickOutside } from '@/hooks/useClickOutside';
import DropdownPanel from '@/components/ui/DropdownPanel';
import { getUserAvatar } from '@/lib/user-profile';

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

  useClickOutside(dropdownRef, () => onClose(), { enabled: isOpen });

  const handleProfileClick = () => {
    if (router.pathname === '/dashboard/settings') {
      window.location.hash = '#account';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      window.dispatchEvent(new CustomEvent('hashUpdated'));
    } else {
      router.push('/dashboard/settings');
    }
    onClose();
  };

  const handleNotificationsClick = () => {
    onNotificationClick?.();
    onClose();
  };

  const handleHelpClick = () => {
    if (router.pathname === '/dashboard/settings') {
      window.location.hash = '#help';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      window.dispatchEvent(new CustomEvent('hashUpdated'));
    } else {
      router.push('/dashboard/settings#help');
    }
    onClose();
  };

  const handleLogoutClick = () => {
    router.push('/login');
    onClose();
  };

  return (
    <DropdownPanel
      ref={dropdownRef}
      isOpen={isOpen}
      align="right"
      className="overflow-hidden animate-scale-in"
      style={{ animation: 'scaleIn 0.2s ease-out' }}
    >
      {/* User Info Header */}
      <div className="p-4 border-b border-border-gray">
        <div className="flex items-center space-x-3">
          {(() => {
            const avatar = getUserAvatar({ profileImage: userAvatar || '', name: userName });
            return (
              <Avatar
                src={avatar.src}
                alt={userName}
                name={userName}
                size="md"
                className="w-10 h-10"
              />
            );
          })()}
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
    </DropdownPanel>
  );
};

export default UserProfileDropdown;
