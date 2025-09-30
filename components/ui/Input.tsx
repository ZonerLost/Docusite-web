import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';
import { EyeIcon, EyeSlashIcon } from './Icons';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  successIcon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  successIcon,
  className,
  placeholder,
  type = 'text',
  value: controlledValue,
  onChange: controlledOnChange,
  ...props
}) => {
  const [internalValue, setInternalValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Use controlled value if provided, otherwise use internal state
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const onChange = controlledOnChange || ((e: React.ChangeEvent<HTMLInputElement>) => setInternalValue(e.target.value));
  
  const hasValue = String(value).length > 0;
  const showFloatingLabel = isFocused || hasValue;
  const showSuccessIcon = hasValue && successIcon && !error;
  const isPasswordField = type === 'password';
  const inputType = isPasswordField ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          className={cn(
            'w-full px-3 sm:px-4 pt-5 sm:pt-6 pb-2 rounded-lg focus:outline-none bg-white text-black placeholder-transparent text-sm sm:text-base',
            error && 'border border-error focus:ring-error text-error',
            className
          )}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        
        {/* Floating Label */}
        {placeholder && (
            <label
              className={cn(
                'absolute left-3 sm:left-4 transition-all duration-200 pointer-events-none',
                showFloatingLabel
                  ? 'top-1.5 sm:top-2 text-xs text-gray-500'
                  : 'top-3 sm:top-4 text-sm sm:text-base text-black'
              )}
            >
            {placeholder}
          </label>
        )}
        
        {/* Icon */}
        {(icon || showSuccessIcon || isPasswordField) && (
          <div className="absolute inset-y-0 right-0 pr-2 sm:pr-3 flex items-center">
            {isPasswordField ? (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-black hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? (
                  <EyeSlashIcon className="text-text-gray" />
                ) : (
                  <EyeIcon className="text-text-gray" />
                )}
              </button>
            ) : showSuccessIcon ? (
              successIcon
            ) : (
              <div className="pointer-events-none">{icon}</div>
            )}
          </div>
        )}
      </div>
      {error && (
        <div className="flex items-center space-x-2">
          <AlertCircle className="text-error h-4 w-4" />
          <p className="text-sm text-error">{error}</p>
        </div>
      )}
    </div>
  );
};

export default Input;
