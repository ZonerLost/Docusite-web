import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none';
  
  const variants = {
    primary: 'bg-action text-white hover:bg-action/90 focus:ring-action shadow-sm',
    secondary: 'bg-white text-text-gray border border-border-gray hover:bg-gray-50',
    outline: 'border border-border-gray bg-white text-black focus:ring-action shadow-sm',
    ghost: 'text-text-gray hover:text-black hover:bg-light-gray focus:ring-action'
  };
  
  const sizes = {
    sm: 'px-3 py-2 text-sm rounded-lg',
    md: 'px-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-xl',
    lg: 'px-6 py-3 text-base rounded-xl'
  };

  return (
    <button
      className={cn(baseClasses, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
