import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
label?: string;
size?: 'small' | 'medium' | 'large';
labelClassName?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({
  label,
  className,
  checked,
  onChange,
  size = 'medium',
  labelClassName,
  ...props
}) => {
  const [isChecked, setIsChecked] = useState(checked || false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsChecked(e.target.checked);
    if (onChange) {
      onChange(e);
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return {
          checkbox: 'h-4 w-4',
          icon: 'h-3 w-3',
          label: 'text-xs',
          borderRadius: 'rounded-md',
          borderWidth: 'border'
        };
      case 'large':
        return {
          checkbox: 'h-8 w-8',
          icon: 'h-5 w-5',
          label: 'text-base',
          borderRadius: 'rounded-xl',
          borderWidth: 'border-4'
        };
      default: // medium
        return {
          checkbox: 'h-6 w-6',
          icon: 'h-4 w-4',
          label: 'text-sm',
          borderRadius: 'rounded-lg',
          borderWidth: 'border-2'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  return (
    <div className="flex items-center">
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={isChecked}
          onChange={handleChange}
          id={props.id || `checkbox-${Math.random().toString(36).substr(2, 9)}`}
          {...props}
        />
        <div
          className={cn(
            `${sizeClasses.checkbox} ${sizeClasses.borderWidth} border-gray-300 ${sizeClasses.borderRadius} flex items-center justify-center cursor-pointer transition-all duration-200 bg-light-gray`,
            isChecked && 'bg-action border-action',
            className
          )}
          onClick={() => {
            const newChecked = !isChecked;
            setIsChecked(newChecked);
            if (onChange) {
              const syntheticEvent = {
                target: { checked: newChecked }
              } as React.ChangeEvent<HTMLInputElement>;
              onChange(syntheticEvent);
            }
          }}
        >
          {isChecked && (
            <Check className={`${sizeClasses.icon} text-white`} />
          )}
        </div>
      </div>
      {label && (
        <label 
          htmlFor={props.id} 
          className={cn(
            `ml-2 block ${sizeClasses.label} text-gray-700 cursor-pointer`,
            labelClassName
          )}
        >
          {label}
        </label>
      )}
    </div>
  );
};

export default Checkbox;
