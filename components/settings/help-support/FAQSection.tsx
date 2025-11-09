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

  /* ================= TEMP DISABLED: edit handlers =================
  const debouncedSave = useDebouncedCallback((id: string, patch: Partial<FAQ>) => {
    updateFAQ(id, patch).catch(() => {});
  }, 500);

  const onSave = (id: string, patch: { question?: string; answer?: string }) => {
    setFaqs((prev) => prev.map((f) => (f.id === id ? ({ ...f, ...patch } as FAQ) : f)));
    debouncedSave(id, patch as Partial<FAQ>);
  };

  const onDeleteOne = async (id: string) => {
    const cur = faqs;
    setFaqs((prev) => prev.filter((f) => f.id !== id));
    try {
      await deleteFAQ(id);
    } catch {
      setFaqs(cur);
    }
  };

  const addNew = async () => {
    const question = 'New question';
    const answer = 'New answer';
    const tempId = 'temp-' + Math.random().toString(36).slice(2);
    const lastOrder = faqs.length ? faqs[faqs.length - 1].orderIndex : 0;
    const optimistic: FAQ = {
      id: tempId,
      question,
      answer,
      isExpanded: true,
      orderIndex: lastOrder + 1,
    };
    setFaqs((prev) => [...prev, optimistic]);
    try {
      const ref = await createFAQ({ question, answer });
      setFaqs((prev) => prev.map((f) => (f.id === tempId ? { ...f, id: ref.id } : f)));
      setExpandedId(ref.id);
    } catch {
      setFaqs((prev) => prev.filter((f) => f.id !== tempId));
    }
  };

  const move = (id: string, dir: -1 | 1) => {
    const idx = faqs.findIndex((f) => f.id === id);
    if (idx < 0) return;
    const j = idx + dir;
    if (j < 0 || j >= faqs.length) return;
    const next = [...faqs];
    const [a, b] = [next[idx], next[j]];
    next[idx] = { ...b, orderIndex: a.orderIndex };
    next[j] = { ...a, orderIndex: b.orderIndex };
    setFaqs(next);
    reorderFAQs(next.map((f) => f.id)).catch(() => setFaqs(faqs));
  };
  ================= /TEMP DISABLED ================= */

  const content = useMemo(() => {
    if (loading) return <div className="p-4 text-sm text-text-gray">Loading FAQs…</div>;
    if (!faqs.length) return <div className="p-4 text-sm text-text-gray">No FAQs yet.</div>;

    return faqs.map((item) => (
      <div key={item.id} className="relative">
        {/* ============== TEMP DISABLED: move up/down UI ==============
        {canEdit && (
          <div className="absolute left-0 -ml-8 h-full flex items-center gap-1">
            <button className="p-1 rounded hover:bg-gray-100" onClick={() => move(item.id, -1)} title="Move up">
              <GripVertical className="w-4 h-4 rotate-90" />
            </button>
            <button className="p-1 rounded hover:bg-gray-100" onClick={() => move(item.id, +1)} title="Move down">
              <GripVertical className="w-4 h-4 -rotate-90" />
            </button>
          </div>
        )}
        ============== /TEMP DISABLED ================= */}

        {/* View-only FAQ item (active) */}
        <FAQItem
          item={{ id: item.id, question: item.question, answer: item.answer, isExpanded: item.isExpanded }}
          isExpanded={expandedId === item.id || item.isExpanded}
          onToggle={() => toggle(item.id)}
          onSave={() => {}}
          onDelete={() => {}}
          canEdit={false}
        />

        {/* ============== Editable FAQ item (keep commented) ============
        <FAQItem
          item={{ id: item.id, question: item.question, answer: item.answer, isExpanded: item.isExpanded }}
          isExpanded={expandedId === item.id || item.isExpanded}
          onToggle={() => toggle(item.id)}
          onSave={(patch) => canEdit && onSave(item.id, patch)}
          onDelete={() => canEdit && onDeleteOne(item.id)}
          canEdit={canEdit}
        />
        ============== /Editable variant ============================== */}
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

        {/* ============== TEMP DISABLED: Add FAQ button =================
        {canEdit && (
          <button
            onClick={addNew}
            className="inline-flex items-center gap-1 text-black text-sm px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50"
          >
            <Plus className="w-4 h-4" /> Add FAQ
          </button>
        )}
        ============== /TEMP DISABLED ================================ */}
      </div>

      <div className="flex-1 flex flex-col gap-1 overflow-y-auto">{content}</div>
    </div>
  );
};

export default FAQSection;
