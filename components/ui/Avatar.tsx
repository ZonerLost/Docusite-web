import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showInitials?: boolean;
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'Avatar',
  name,
  size = 'md',
  className,
  showInitials = false
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'xs':
        return 'w-6 h-6 text-xs';
      case 'sm':
        return 'w-8 h-8 text-sm';
      case 'md':
        return 'w-10 h-10 text-base';
      case 'lg':
        return 'w-12 h-12 text-lg';
      case 'xl':
        return 'w-16 h-16 text-xl';
      default:
        return 'w-10 h-10 text-base';
    }
  };

  const getInitials = () => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const sizeClasses = getSizeClasses();

  return (
    <div className={cn(
      'rounded-full overflow-hidden flex items-center justify-center bg-avatar-bg',
      sizeClasses,
      className
    )}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          width={size === 'xs' ? 24 : size === 'sm' ? 32 : size === 'md' ? 40 : size === 'lg' ? 48 : 64}
          height={size === 'xs' ? 24 : size === 'sm' ? 32 : size === 'md' ? 40 : size === 'lg' ? 48 : 64}
          className="w-full h-full object-cover"
        />
      ) : showInitials ? (
        <span className="font-bold text-action">
          {getInitials()}
        </span>
      ) : (
        <div className="w-full h-full bg-avatar-bg flex items-center justify-center">
          <span className="font-bold text-action">
            {getInitials()}
          </span>
        </div>
      )}
    </div>
  );
};

export default Avatar;
