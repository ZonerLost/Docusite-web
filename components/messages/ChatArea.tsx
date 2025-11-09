import React, { useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import MessageBubble from '@/components/messages/MessageBubble';
import MessageInput from '@/components/messages/MessageInput';

interface Message {
  id: string;
  type: 'incoming' | 'outgoing' | 'date';
  content: string;
  timestamp: string;
  avatar?: string;
  isRead?: boolean;
  messageType?: 'text' | 'image' | 'file';
  fileUrl?: string | null;
  fileName?: string | null;
  replyTo?: string | null;
  replyText?: string | null;
  replySender?: string | null;
  reactions?: Record<string, string[]>;
}

interface ChatAreaProps {
  selectedChat: string;
  messages: Message[];
  onSendMessage: (payload: { type: 'text'; content: string; replyTo?: string | null; replyText?: string | null; replySender?: string | null } | { type: 'image' | 'file'; file: File }) => Promise<void> | void;
  onBackToChats?: () => void;
  disabled?: boolean;
  projectName?: string;
  onDeleteMessage?: (messageId: string) => Promise<void> | void;
  onReplyMessage?: (message: { id: string; text: string; sender: string }) => void;
  replyContext?: { id: string; text: string; sender: string } | null;
  onCancelReply?: () => void;
  onReactMessage?: (messageId: string, emoji: string) => Promise<void> | void;
}

const ChatArea: React.FC<ChatAreaProps> = ({ selectedChat, messages, onSendMessage, onBackToChats, disabled, projectName, onDeleteMessage, onReplyMessage, replyContext, onCancelReply, onReactMessage }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="p-4 border-b border-border-gray">
        <div className="flex items-center space-x-3">
          {/* Back Button - Only visible on mobile */}
          {onBackToChats && (
            <button
              onClick={onBackToChats}
              className="lg:hidden p-1 hover:bg-light-gray rounded-md transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <h2 className="text-lg font-bold text-black">{projectName || 'Select a Project Chat'}</h2>
        </div>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onDelete={onDeleteMessage}
            onReply={(m) => onReplyMessage?.(m)}
            onReact={(id, emoji) => onReactMessage?.(id, emoji)}
          />
        ))}
        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message Input */}
      <div className="p-3 sm:p-4 border-t border-border-gray">
        <MessageInput
          onSendMessage={onSendMessage}
          disabled={disabled}
          replyContext={replyContext}
          onCancelReply={onCancelReply}
        />
      </div>
    </div>
  );
};

export default ChatArea;
