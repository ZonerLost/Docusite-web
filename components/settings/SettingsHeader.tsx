import React from 'react';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { LogoutIcon } from '@/components/ui/Icons';

interface SettingsHeaderProps {
  userName: string;
  memberSince: string;
  avatarSrc?: string;
  onLogout: () => void;
}

const SettingsHeader: React.FC<SettingsHeaderProps> = ({
  userName,
  memberSince,
  avatarSrc = '/avatar.png',
  onLogout
}) => {
  return (
    <div className="bg-white border-b border-border-gray p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Avatar 
            src={avatarSrc} 
            alt={userName} 
            size="lg"
            className="w-12 h-12 flex-shrink-0"
          />
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-black">{userName}</h1>
            <p className="text-text-gray text-sm">{memberSince}</p>
          </div>
        </div>
        <Button 
          variant="primary" 
          size="sm"
          onClick={onLogout}
          className="flex items-center space-x-2 px-4 py-2 w-full sm:w-auto"
        >
          <LogoutIcon className="w-4 h-4 text-white" />
          <span>Logout</span>
        </Button>
      </div>
    </div>
  );
};

export default SettingsHeader;
