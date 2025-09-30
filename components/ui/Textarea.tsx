import React from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ label, error, className, ...props }, ref) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-black">{label}</label>
      )}
      <textarea
        ref={ref}
        className={cn(
          'w-full bg-light-gray rounded-2xl border border-border-gray p-4 text-sm text-black focus:outline-none focus:ring-2 focus:ring-action min-h-[140px]',
          error && 'border-error focus:ring-error',
          className
        )}
        {...props}
      />
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export default Textarea;
