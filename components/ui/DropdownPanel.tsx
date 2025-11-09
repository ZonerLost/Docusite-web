import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

type DropdownAlign = 'left' | 'right' | 'center';

interface DropdownPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  align?: DropdownAlign;
  widthClassName?: string;
  mobileFullWidth?: boolean;
  baseClassName?: string;
}

const alignClassMap: Record<DropdownAlign, string> = {
  left: 'left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0',
  right: 'left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0',
  center: 'left-1/2 -translate-x-1/2 sm:left-1/2 sm:-translate-x-1/2',
};

const DropdownPanel = forwardRef<HTMLDivElement, DropdownPanelProps>(
  (
    {
      isOpen,
      align = 'right',
      widthClassName,
      mobileFullWidth = false,
      baseClassName,
      className,
      children,
      ...rest
    },
    ref,
  ) => {
    if (!isOpen) return null;

    const positionClasses = baseClassName ?? 'absolute top-full mt-2';
    const responsiveAlign = baseClassName ? '' : alignClassMap[align];
    const widthClasses =
      widthClassName ||
      (mobileFullWidth
        ? 'w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:w-64 sm:max-w-none'
        : 'w-[min(16rem,calc(100vw-1.5rem))] sm:w-64');

    return (
      <div
        ref={ref}
        className={cn(
          'z-50 rounded-xl border border-border-gray bg-white shadow-lg',
          positionClasses,
          responsiveAlign,
          widthClasses,
          className,
        )}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

DropdownPanel.displayName = 'DropdownPanel';

export default DropdownPanel;

