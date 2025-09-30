import React, { useEffect, useRef } from 'react';
import SupportMessageBubble from './SupportMessageBubble';
import SupportMessageInput from './SupportMessageInput';
import { CustomerSupportIcon } from '@/components/ui/Icons';

interface Message {
  id: string;
  type: "incoming" | "outgoing" | "date";
  content: string;
  timestamp: string;
  isRead?: boolean;
}

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="w-full lg:w-1/3 border-r bg-white rounded-xl border-border-gray flex flex-col max-h-[500px]">
      {/* Chat Header */}
      <div className="p-4 border-b border-text-gray/40 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-action rounded-full flex items-center justify-center">
            <CustomerSupportIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-black">Customer Support</h3>
            <p className="text-xs text-text-gray">We're online and ready to help</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.map((message) => (
          <SupportMessageBubble key={message.id} message={message} />
        ))}
        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-border-gray flex-shrink-0">
        <SupportMessageInput onSendMessage={onSendMessage} />
      </div>
    </div>
  );
};

export default ChatInterface;
