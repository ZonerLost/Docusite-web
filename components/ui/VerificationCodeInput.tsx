import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface VerificationCodeInputProps {
  length?: number;
  onComplete: (code: string) => void;
  error?: string;
  className?: string;
  value?: string;
  onChange?: (code: string) => void;
}

const VerificationCodeInput: React.FC<VerificationCodeInputProps> = ({
  length = 5,
  onComplete,
  error,
  className,
  value = '',
  onChange
}) => {
  const [code, setCode] = useState<string[]>(() => {
    if (value) {
      return value.split('').slice(0, length).concat(new Array(length - value.length).fill(''));
    }
    return new Array(length).fill('');
  });
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const completeCode = code.join('');
    if (completeCode.length === length && !completeCode.includes('')) {
      onComplete(completeCode);
    }
  }, [code, length, onComplete]);

  // Sync external value prop with internal state
  useEffect(() => {
    if (value !== undefined) {
      const newCode = value.split('').slice(0, length).concat(new Array(length - value.length).fill(''));
      setCode(newCode);
    }
  }, [value, length]);

  const handleChange = (index: number, inputValue: string) => {
    if (inputValue.length > 1) return; // Prevent multiple characters
    
    const newCode = [...code];
    newCode[index] = inputValue;
    setCode(newCode);

    // Call onChange with the complete code string
    const completeCode = newCode.join('');
    if (onChange) {
      onChange(completeCode);
    }

    // Move to next input if value is entered
    if (inputValue && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!code[index] && index > 0) {
        // Move to previous input if current is empty
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current input
        const newCode = [...code];
        newCode[index] = '';
        setCode(newCode);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, length);
    const newCode = [...code];
    
    for (let i = 0; i < pastedData.length && i < length; i++) {
      if (/^\d$/.test(pastedData[i])) {
        newCode[i] = pastedData[i];
      }
    }
    
    setCode(newCode);
    
    // Call onChange with the complete code string
    const completeCode = newCode.join('');
    if (onChange) {
      onChange(completeCode);
    }
    
    // Focus the next empty input or the last input
    const nextEmptyIndex = newCode.findIndex(digit => !digit);
    const focusIndex = nextEmptyIndex === -1 ? length - 1 : nextEmptyIndex;
    inputRefs.current[focusIndex]?.focus();
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex justify-center space-x-3">
        {code.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            className={cn(
              'w-12 h-12 sm:w-14 sm:h-14 text-center text-lg sm:text-xl font-semibold border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-action transition-colors',
              error 
                ? 'border-error focus:border-error focus:ring-error' 
                : digit 
                  ? 'border-light-blue bg-light-blue text-action' 
                  : 'border-gray-300 focus:border-action'
            )}
          />
        ))}
      </div>
      {error && (
        <p className="text-sm text-error text-center">{error}</p>
      )}
    </div>
  );
};

export default VerificationCodeInput;
