import React from 'react';
import { cn } from '@/lib/utils';
import Button from './Button';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  buttonText: string;
  onButtonClick: () => void;
  className?: string;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  buttonText,
  onButtonClick,
  className
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center p-4 sm:items-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-60 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={cn(
        'relative w-full max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-xl transform transition-all z-[10000]',
        'animate-slide-up sm:animate-scale-in',
        className
      )}>
        <div className="p-6 sm:p-8 text-center">
          {/* Success Icon */}
          <div className="relative mb-6">
            {/* Outer light circle */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto relative">
              {/* Inner badge */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-action rounded-full flex items-center justify-center relative">
                {/* Main checkmark */}
                <svg 
                  className="w-8 h-8 sm:w-10 sm:h-10 text-white" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  strokeWidth={3}
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    d="M5 13l4 4L19 7" 
                  />
                </svg>
              </div>
              
              {/* Decorative dots */}
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-action rounded-full animate-pulse"></div>
              <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-action rounded-full animate-pulse delay-300"></div>
              <div className="absolute top-2 -left-2 w-2 h-2 bg-action rounded-full animate-pulse delay-150"></div>
              <div className="absolute -top-1 left-2 w-2 h-2 bg-action rounded-full animate-pulse delay-75"></div>
              <div className="absolute -bottom-1 right-2 w-2 h-2 bg-action rounded-full animate-pulse delay-225"></div>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            {title}
          </h2>

          {/* Message */}
          <div className="text-sm sm:text-base text-gray-600 mb-6 leading-relaxed">
            {message.split('. ').map((line, index) => (
              <p key={index} className={index === 0 ? 'mb-1' : ''}>
                {line}{index === 0 ? '.' : ''}
              </p>
            ))}
          </div>

          {/* Button */}
          <Button 
            onClick={onButtonClick}
            className="w-full bg-action text-white"
          >
            {buttonText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;
