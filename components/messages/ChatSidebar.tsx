import React from 'react';
import { XIcon } from 'lucide-react';
import ChatEntry from '@/components/messages/ChatEntry';

interface ChatSidebarProps {
  selectedChat: string;
  onChatSelect: (chatId: string) => void;
  onClose?: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ selectedChat, onChatSelect, onClose }) => {
  // Sample chat data with realistic project group chats
  const chats = [
    {
      id: '1',
      name: 'Luxury Resort Development',
      avatar: 'L',
      lastMessage: "Sarah: The foundation work is progressing well. We should have the concrete poured by Friday.",
      timestamp: '5 mins ago',
      isRead: true,
      hasUnread: false
    },
    {
      id: '2',
      name: 'Office Complex Renovation',
      avatar: 'O',
      lastMessage: "Michael: Can we schedule a site visit for next Tuesday?",
      timestamp: '1 hour ago',
      isRead: true,
      hasUnread: true
    },
    {
      id: '3',
      name: 'Shopping Mall Expansion',
      avatar: 'S',
      lastMessage: "Emily: The permits have been approved! 🎉",
      timestamp: '2 hours ago',
      isRead: true,
      hasUnread: false
    },
    {
      id: '4',
      name: 'Residential Tower',
      avatar: 'R',
      lastMessage: "David: I've uploaded the latest blueprints to the project folder.",
      timestamp: '3 hours ago',
      isRead: true,
      hasUnread: false
    },
    {
      id: '5',
      name: 'Tech Campus Construction',
      avatar: 'T',
      lastMessage: "Lisa: The electrical installation is complete. Ready for inspection.",
      timestamp: '1 day ago',
      isRead: true,
      hasUnread: false
    },
    {
      id: '6',
      name: 'Hospital Wing Addition',
      avatar: 'H',
      lastMessage: "Robert: We need to discuss the budget allocation for medical equipment.",
      timestamp: '2 days ago',
      isRead: true,
      hasUnread: true
    },
    {
      id: '7',
      name: 'Sports Complex',
      avatar: 'S',
      lastMessage: "Jennifer: The landscaping design has been finalized.",
      timestamp: '3 days ago',
      isRead: true,
      hasUnread: false
    }
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 sm:px-4 border-b border-border-gray">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-black">Chats</h2>
          {/* Close Button - Only visible on mobile */}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1 hover:bg-light-gray rounded-md transition-colors"
            >
              <XIcon className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>
      </div>
      
      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {chats.map((chat) => (
          <ChatEntry
            key={chat.id}
            chat={chat}
            isSelected={selectedChat === chat.id}
            onClick={() => onChatSelect(chat.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default ChatSidebar;
