import React, { useEffect, useMemo, useState } from 'react';
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
  avatarSrc,
  onLogout
}) => {
  // Loading state: undefined means parent hasn't resolved profile yet
  const isDataLoading = typeof avatarSrc === 'undefined';
  const normalizedSrc = useMemo(() => (avatarSrc ? String(avatarSrc).trim() : ''), [avatarSrc]);
  const hasCustomImage = useMemo(() => normalizedSrc && !normalizedSrc.includes('/avatar.png'), [normalizedSrc]);

  const [isImageLoading, setIsImageLoading] = useState(false);
  useEffect(() => {
    if (hasCustomImage) {
      setIsImageLoading(true);
      const img = new Image();
      const onLoad = () => setIsImageLoading(false);
      const onError = () => setIsImageLoading(false);
      img.addEventListener('load', onLoad);
      img.addEventListener('error', onError);
      img.src = normalizedSrc;
      return () => {
        img.removeEventListener('load', onLoad);
        img.removeEventListener('error', onError);
      };
    } else {
      setIsImageLoading(false);
    }
  }, [hasCustomImage, normalizedSrc]);

  const showSkeleton = isDataLoading || isImageLoading;

  return (
    <div className="bg-white border-b border-border-gray p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          {showSkeleton ? (
            <div className="w-12 h-12 rounded-full bg-avatar-bg animate-pulse flex-shrink-0" />
          ) : (
            <Avatar 
              src={hasCustomImage ? normalizedSrc : undefined}
              alt={userName}
              name={userName}
              size="lg"
              className="w-12 h-12 flex-shrink-0"
            />
          )}
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
