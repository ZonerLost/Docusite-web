import React from 'react';

interface Message {
  id: string;
  type: "incoming" | "outgoing" | "date";
  content: string;
  timestamp: string;
  isRead?: boolean;
}

interface SupportMessageBubbleProps {
  message: Message;
}

const SupportMessageBubble: React.FC<SupportMessageBubbleProps> = ({ message }) => {
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
        {/* Message Bubble */}
        <div
          className={`px-4 py-2 rounded-xl ${
            isOutgoing ? "bg-action text-white" : "bg-light-gray text-black"
          }`}
        >
          <p className="text-sm">{message.content}</p>
        </div>

        {/* Timestamp */}
        <div className="mt-1">
          <span className="text-xs text-text-gray">
            {message.timestamp}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SupportMessageBubble;
