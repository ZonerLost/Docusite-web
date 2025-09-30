import React, { useState } from 'react';
import { SendIcon } from '@/components/ui/Icons';
import Button from '@/components/ui/Button';
import FormInput from '@/components/ui/FormInput';

interface SupportMessageInputProps {
  onSendMessage: (content: string) => void;
}

const SupportMessageInput: React.FC<SupportMessageInputProps> = ({ onSendMessage }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2 sm:space-x-3">
      {/* Message Input */}
      <div className="flex-1 relative">
        <FormInput
          label=""
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message here..."
          className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-light-gray border border-border-gray rounded-xl text-sm sm:text-base text-black placeholder-placeholder-gray"
        />
      </div>
        
        {/* Send Button */}
        <Button
          type="submit"
          variant="primary"
          size="sm"
          className="p-1.5 sm:p-3 rounded-xl"
        >
          <SendIcon className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>
    </form>
  );
};

export default SupportMessageInput;
