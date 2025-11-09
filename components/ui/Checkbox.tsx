import React, { useId, useState } from 'react';
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
  // Support controlled and uncontrolled usage
  const isControlled = typeof checked !== 'undefined';
  const [uncontrolledChecked, setUncontrolledChecked] = useState<boolean>(!!checked);
  const { id: providedId, ...inputProps } = props;

  const currentChecked = isControlled ? !!checked : uncontrolledChecked;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isControlled) {
      setUncontrolledChecked(e.target.checked);
    }
    onChange?.(e);
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

  const generatedId = useId();
  const inputId = providedId || `checkbox-${generatedId}`;

  return (
    <div className="flex items-center">
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={currentChecked}
          onChange={handleChange}
          id={inputId}
          {...inputProps}
        />
        <div
          className={cn(
            `${sizeClasses.checkbox} ${sizeClasses.borderWidth} border-gray-300 ${sizeClasses.borderRadius} flex items-center justify-center cursor-pointer transition-all duration-200 bg-light-gray`,
            currentChecked && 'bg-action border-action',
            className
          )}
          onClick={() => {
            const newChecked = !currentChecked;
            if (!isControlled) {
              setUncontrolledChecked(newChecked);
            }
            const syntheticEvent = {
              target: { checked: newChecked }
            } as React.ChangeEvent<HTMLInputElement>;
            onChange?.(syntheticEvent);
          }}
        >
          {currentChecked && (
            <Check className={`${sizeClasses.icon} text-white`} />
          )}
        </div>
      </div>
      {label && (
        <label 
          htmlFor={inputId} 
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
