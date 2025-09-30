import React from 'react';
import { Plus } from 'lucide-react';

interface FAQItemData {
  id: string;
  question: string;
  answer: string;
  isExpanded: boolean;
}

interface FAQItemProps {
  item: FAQItemData;
  isExpanded: boolean;
  onToggle: () => void;
}

const FAQItem: React.FC<FAQItemProps> = ({ item, isExpanded, onToggle }) => {
  return (
    <div className="border-b border-border-gray last:border-b-0 bg-white rounded-xl">
      <button
        onClick={onToggle}
        className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-medium text-black flex-1">
          {item.question}
        </span>
        <div className="ml-3 flex-shrink-0">
          <Plus
            className={`w-4 h-4 text-text-gray transition-transform ${
              isExpanded ? 'rotate-45' : ''
            }`}
          />
        </div>
      </button>
      {isExpanded && (
        <div className="px-4 pb-4">
          <p className="text-sm text-text-gray leading-relaxed">
            {item.answer}
          </p>
        </div>
      )}
    </div>
  );
};

export default FAQItem;
