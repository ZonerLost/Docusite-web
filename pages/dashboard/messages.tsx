import { useState } from 'react';
import { MenuIcon } from 'lucide-react';
import ChatSidebar from '@/components/messages/ChatSidebar';
import ChatArea from '@/components/messages/ChatArea';

interface Message {
  id: string;
  type: 'incoming' | 'outgoing' | 'date';
  content: string;
  timestamp: string;
  avatar?: string;
  isRead?: boolean;
  senderName?: string;
}

export default function Messages() {
  const [selectedChat, setSelectedChat] = useState('');
  const [showChatSidebar, setShowChatSidebar] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'date',
      content: 'Today',
      timestamp: ''
    },
    {
      id: '2',
      type: 'incoming',
      content: 'Good morning team! The foundation work is progressing well. We should have the concrete poured by Friday.',
      timestamp: '9:15 am',
      avatar: '/avatar.png',
      isRead: true,
      senderName: 'Sarah Johnson'
    },
    {
      id: '3',
      type: 'incoming',
      content: 'The weather forecast looks good for the next few days, so we should be able to stay on schedule.',
      timestamp: '9:16 am',
      avatar: '/avatar.png',
      isRead: true,
      senderName: 'Michael Chen'
    },
    {
      id: '4',
      type: 'outgoing',
      content: "That's great news! I'll make sure the concrete delivery is scheduled for Thursday morning.",
      timestamp: '9:18 am',
      avatar: '/avatar.png',
      isRead: true
    },
    {
      id: '5',
      type: 'incoming',
      content: 'Perfect! I\'ve also uploaded the latest progress photos to the project folder. The structural engineer will be visiting tomorrow.',
      timestamp: '9:20 am',
      avatar: '/avatar.png',
      isRead: true,
      senderName: 'Emily Rodriguez'
    },
    {
      id: '6',
      type: 'outgoing',
      content: 'Thanks for the update. I\'ll review the photos and prepare the inspection checklist.',
      timestamp: '9:22 am',
      avatar: '/avatar.png',
      isRead: true
    }
  ]);

  const handleChatSelect = (chatId: string) => {
    setSelectedChat(chatId);
    setShowChatSidebar(false); // Close sidebar after selecting chat
  };

  // Generate timestamp for new messages
  const getCurrentTimestamp = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  // Generate unique ID for new messages
  const generateMessageId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  // Handle sending new messages
  const handleSendMessage = (content: string) => {
    if (content.trim()) {
      const newMessage: Message = {
        id: generateMessageId(),
        type: 'outgoing',
        content: content.trim(),
        timestamp: getCurrentTimestamp(),
        avatar: '/avatar.png',
        isRead: true
      };
      
      setMessages(prev => [...prev, newMessage]);
      
      // Simulate realistic responses based on project context
      setTimeout(() => {
        const responses = [
          "Got it! I'll update the project timeline accordingly.",
          "Perfect! I've noted that in the project notes.",
          "Thanks for the update. I'll share this with the rest of the team.",
          "Excellent! This will help us stay on track with the deadline.",
          "I'll make sure to follow up on that. Thanks for keeping us informed!",
          "Great point! I'll add this to our next team meeting agenda.",
          "Understood. I'll coordinate with the suppliers on this.",
          "Perfect timing! This aligns with our project milestones."
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        const teamMembers = ['Sarah Johnson', 'Michael Chen', 'Emily Rodriguez', 'David Kim', 'Lisa Wang', 'Robert Taylor', 'Jennifer Lee'];
        const randomMember = teamMembers[Math.floor(Math.random() * teamMembers.length)];
        
        const responseMessage: Message = {
          id: generateMessageId(),
          type: 'incoming',
          content: randomResponse,
          timestamp: getCurrentTimestamp(),
          avatar: '/avatar.png',
          isRead: true,
          senderName: randomMember
        };
        setMessages(prev => [...prev, responseMessage]);
      }, 1500);
    }
  };

  return (
    <div className="h-full overflow-hidden bg-gray-50 relative">
      {/* Floating Sidebar Overlay */}
      {showChatSidebar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setShowChatSidebar(false)} />
      )}
     
      {/* Desktop Layout */}
      <div className="flex h-full">
        {/* Floating Chat Sidebar */}
        <div className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${
          showChatSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}>
          <div className="w-80 bg-white border-r border-border-gray flex flex-col h-full">
            <ChatSidebar 
              selectedChat={selectedChat}
              onChatSelect={handleChatSelect}
              onClose={() => setShowChatSidebar(false)}
            />
          </div>
        </div>
        
        {/* Chat Area - Full height */}
        <div className="flex-1 flex flex-col h-full">
        {selectedChat ? (
          <ChatArea 
            selectedChat={selectedChat} 
            messages={messages}
            onSendMessage={handleSendMessage}
            onBackToChats={() => {
              setSelectedChat('');
              setShowChatSidebar(true); // Show sidebar when going back
            }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white h-full w-full">
            <div className="text-center max-w-md mx-auto px-4">
              <h3 className="text-lg font-semibold text-gray-500 mb-2">Select a chat to start messaging</h3>
              <p className="text-sm text-gray-400 mb-4">Choose a conversation from the sidebar</p>
               {/* Open Sidebar Button - Only visible on mobile when sidebar is closed */}
               {!showChatSidebar && (
                 <button
                   onClick={() => setShowChatSidebar(true)}
                   className="lg:hidden px-4 py-2 bg-action text-white rounded-lg hover:bg-action/90 transition-colors flex items-center space-x-2 mx-auto"
                 >
                   <MenuIcon className="w-4 h-4" />
                   <span>Open Chats</span>
                 </button>
               )}
            </div>
          </div>
         )}
         </div>
       </div>
    </div>
  );
}
