import React from 'react';
import { CheckIcon } from '@/components/ui/Icons';
import Avatar from '@/components/ui/Avatar';

interface Chat {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  isRead: boolean;
  hasUnread: boolean;
}

interface ChatEntryProps {
  chat: Chat;
  isSelected: boolean;
  onClick: () => void;
}

const ChatEntry: React.FC<ChatEntryProps> = ({ chat, isSelected, onClick }) => {
  return (
    <div
      className={`p-3 border-b-2 border-border-gray cursor-pointer hover:bg-light-gray transition-colors relative ${
        isSelected ? 'bg-light-gray' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center space-x-3">
        {/* Avatar */}
        <Avatar
          name={chat.avatar}
          size="md"
          className="flex-shrink-0"
        />
        
        {/* Chat Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-black text-sm truncate">{chat.name}</h3>
            <span className="text-xs text-placeholder-gray">{chat.timestamp}</span>
          </div>
          
          {/* User Avatar and Message */}
          <div className="flex items-center space-x-2">
            <Avatar
              src="/avatar.png"
              alt="User"
              size="xs"
            />
            <div className="flex items-center space-x-1 flex-1 min-w-0">
              <span className="text-sm text-text-gray truncate">{chat.lastMessage}</span>
              <CheckIcon className="w-4 h-4 text-action flex-shrink-0" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Unread Indicator - Bottom Right Corner */}
      {chat.hasUnread && (
        <div className="absolute bottom-2 right-2 w-2 h-2 bg-action rounded-full"></div>
      )}
    </div>
  );
};

export default ChatEntry;
