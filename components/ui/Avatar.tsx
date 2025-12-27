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
  // Normalize and validate src once so all callers get consistent behavior
  const normalizedSrc = React.useMemo(() => {
    const s = (src || '').trim();
    if (!s) return '';
    // Treat app's default placeholder as "no custom image"
    if (s.endsWith('/avatar.png') || s === '/avatar.png') return '';
    return s;
  }, [src]);

  const [loadError, setLoadError] = React.useState(false);

  // Reset error state whenever the image URL changes
  React.useEffect(() => {
    setLoadError(false);
  }, [normalizedSrc]);

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

  const getInitial = () => {
    const base = (name || alt || '').trim();
    if (!base) return 'U';
    return base.charAt(0).toUpperCase();
  };

  const isValidSrc = !!normalizedSrc && !loadError;

  const sizeClasses = getSizeClasses();

  return (
    <div className={cn(
      'rounded-full overflow-hidden flex items-center justify-center bg-avatar-bg',
      sizeClasses,
      className
    )}>
      {isValidSrc ? (
        <Image
          src={normalizedSrc}
          alt={alt}
          width={size === 'xs' ? 24 : size === 'sm' ? 32 : size === 'md' ? 40 : size === 'lg' ? 48 : 64}
          height={size === 'xs' ? 24 : size === 'sm' ? 32 : size === 'md' ? 40 : size === 'lg' ? 48 : 64}
          className="w-full h-full object-cover"
          onError={() => setLoadError(true)}
        />
      ) : showInitials ? (
        <span className="font-bold text-action">
          {getInitial()}
        </span>
      ) : (
        <div className="w-full h-full bg-avatar-bg flex items-center justify-center">
          <span className="font-bold text-action">
            {getInitial()}
          </span>
        </div>
      )}
    </div>
  );
};

export default Avatar;
