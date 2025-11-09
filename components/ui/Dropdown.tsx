import React, { useState, useRef } from 'react';
import { ChevronDownSmall } from './Icons';
import { cn } from '@/lib/utils';
import { useClickOutside } from '@/hooks/useClickOutside';

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  className,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(option => option.value === value);

  useClickOutside(dropdownRef, () => setIsOpen(false), { enabled: isOpen });

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'flex items-center justify-between w-[140px] px-3 py-2 h-10 sm:h-12 border border-border-gray rounded-xl text-sm sm:text-base text-black bg-white focus:outline-none transition-colors',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <span className="text-left">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDownSmall 
          className={cn(
            'w-6 h-6 text-black transition-transform',
            isOpen && 'rotate-180'
          )} 
        />
      </button>

       {isOpen && (
         <div className="absolute z-50 w-[140px] mt-1 bg-white border border-border-gray rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleOptionClick(option.value)}
              className={cn(
                'w-full px-3 py-2 text-left text-sm sm:text-base text-black hover:bg-light-gray transition-colors first:rounded-t-xl last:rounded-b-xl',
                value === option.value && 'bg-light-blue text-action'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
