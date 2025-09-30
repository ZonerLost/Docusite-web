import React from "react";
import { CheckIcon } from "@/components/ui/Icons";
import Avatar from "@/components/ui/Avatar";

interface Message {
  id: string;
  type: "incoming" | "outgoing" | "date";
  content: string;
  timestamp: string;
  avatar?: string;
  isRead?: boolean;
  senderName?: string;
}

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  if (message.type === "date") {
    return (
      <div className="flex justify-center">
        <div className="bg-light-gray text-text-gray px-3 py-1 rounded-lg text-[12px]">
          {message.content}
        </div>
      </div>
    );
  }

  const isOutgoing = message.type === "outgoing";

  return (
    <div className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`}>
      <div className={`flex flex-col ${isOutgoing ? "items-end" : "items-start"} max-w-xs lg:max-w-md`}>
        {/* Sender Name for incoming messages */}
        {!isOutgoing && message.senderName && (
          <span className="text-xs text-text-gray mb-1 font-medium">{message.senderName}</span>
        )}
        
        {/* Message Bubble */}
        <div
          className={`px-4 py-2 rounded-xl ${
            isOutgoing ? "bg-action text-white" : "bg-light-gray text-black"
          }`}
        >
          <p className="text-sm">{message.content}</p>
        </div>

        {/* Timestamp, Check Icon, and Avatar */}
        <div className={`flex items-center space-x-1 mt-1 gap-1 ${isOutgoing ? " space-x-reverse" : "flex-row-reverse"}`}>
          <div className="flex items-center space-x-1">
          <span className="text-xs text-placeholder-gray">
            {message.timestamp}
          </span>
            {isOutgoing && <CheckIcon className="w-4 h-4 text-action" />}
          </div>
          <Avatar
            src={message.avatar}
            alt="User"
            size="xs"
            className="flex-shrink-0"
          />
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
