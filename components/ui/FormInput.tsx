import React from 'react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
}

const FormInput: React.FC<FormInputProps> = ({
  label,
  value,
  onChange,
  error,
  className = '',
  ...props
}) => {
  return (
    <div>
      <label className="block text-sm font-normal text-text-gray mb-1">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={onChange}
        className={`w-full px-3 py-2 bg-light-gray border rounded-lg text-black focus:outline-none ${
          error ? 'border-red-500' : 'border-border-gray'
        } ${className}`}
        {...props}
      />
      {error && (
        <div className="text-red-500 text-xs mt-1">{error}</div>
      )}
    </div>
  );
};

export default FormInput;
