import React from 'react';
import FAQItem from './FAQItem';

interface FAQItemData {
  id: string;
  question: string;
  answer: string;
  isExpanded: boolean;
}

interface FAQSectionProps {
  faqItems: FAQItemData[];
  expandedFAQ: string;
  onToggleFAQ: (id: string) => void;
}

const FAQSection: React.FC<FAQSectionProps> = ({ faqItems, expandedFAQ, onToggleFAQ }) => {
  return (
    <div className="w-full lg:w-2/3 flex flex-col">
      {/* FAQ Header */}
      <div className="p-4 border-b border-border-gray flex-shrink-0">
        <h3 className="text-lg font-semibold text-black mb-1">Frequently Asked Questions</h3>
        <p className="text-sm text-text-gray">Find quick answers to common questions</p>
      </div>

      {/* FAQ Items */}
      <div className="flex-1 flex flex-col gap-1 overflow-y-auto">
        {faqItems.map((item) => (
          <FAQItem
            key={item.id}
            item={item}
            isExpanded={expandedFAQ === item.id}
            onToggle={() => onToggleFAQ(item.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default FAQSection;
