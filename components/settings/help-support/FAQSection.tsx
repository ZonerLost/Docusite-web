import React, { useEffect, useMemo, useState } from 'react';
import FAQItem from './FAQItem';
import type { FAQItem as FAQ } from '@/types/faq';
import { fetchFAQs, updateFAQ /* , createFAQ, deleteFAQ, reorderFAQs */ } from '@/lib/faq.repository';
// import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
// import { GripVertical, Plus } from 'lucide-react';

type Props = {
  canEdit?: boolean;
};

const FAQSection: React.FC<Props> = ({ canEdit = false }) => {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const list = await fetchFAQs();
      setFaqs(list);
      setLoading(false);
    })();
  }, []);

  const toggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
    const idx = faqs.findIndex((f) => f.id === id);
    if (idx >= 0) {
      const next = [...faqs];
      next[idx] = { ...next[idx], isExpanded: !next[idx].isExpanded };
      setFaqs(next);
      updateFAQ(id, { isExpanded: next[idx].isExpanded }).catch(() => {});
    }
  };
  const content = useMemo(() => {
    if (loading) return <div className="p-4 text-sm text-text-gray">Loading FAQs…</div>;
    if (!faqs.length) return <div className="p-4 text-sm text-text-gray">No FAQs yet.</div>;

    return faqs.map((item) => (
      <div key={item.id} className="relative">
        {/* View-only FAQ item (active) */}
        <FAQItem
          item={{ id: item.id, question: item.question, answer: item.answer, isExpanded: item.isExpanded }}
          isExpanded={expandedId === item.id || item.isExpanded}
          onToggle={() => toggle(item.id)}
          onSave={() => {}}
          onDelete={() => {}}
          canEdit={false}
        />
      
      </div>
    ));
  }, [faqs, loading, expandedId]); // no canEdit here while disabled

  return (
    <div className="w-full lg:w-2/3 flex flex-col">
      <div className="p-4 border-b border-border-gray flex-shrink-0 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-black mb-1">Frequently Asked Questions</h3>
          <p className="text-sm text-text-gray">Find quick answers to common questions</p>
        </div>

       
      </div>

      <div className="flex-1 flex flex-col gap-1 overflow-y-auto">{content}</div>
    </div>
  );
};

export default FAQSection;
