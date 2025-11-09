import React, { useState } from 'react';
import { Plus, Trash2, Pencil, Save } from 'lucide-react';

type Props = {
  item: {
    id: string;
    question: string;
    answer: string;
    isExpanded: boolean;
  };
  isExpanded: boolean;
  onToggle: () => void;
  onSave: (patch: { question?: string; answer?: string; isExpanded?: boolean }) => void;
  onDelete: () => void;
  canEdit: boolean;
};

const FAQItem: React.FC<Props> = ({ item, isExpanded, onToggle, onSave, onDelete, canEdit }) => {
  const [editing, setEditing] = useState(false);
  const [q, setQ] = useState(item.question);
  const [a, setA] = useState(item.answer);

  const startEdit = () => { setQ(item.question); setA(item.answer); setEditing(true); };
  const commit = () => { onSave({ question: q.trim(), answer: a.trim() }); setEditing(false); };

  return (
    <div className="border-b border-border-gray last:border-b-0 bg-white rounded-xl">
      <button
        onClick={onToggle}
        className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        {!editing ? (
          <span className="text-sm font-medium text-black flex-1">{item.question}</span>
        ) : (
          <input
            className="text-sm font-medium text-black flex-1 border rounded px-2 py-1 mr-3"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        )}
        <div className="ml-3 flex items-center gap-2">
          {canEdit && !editing && (
            <button onClick={(e) => { e.stopPropagation(); startEdit(); }} className="p-1 text-black rounded hover:bg-gray-200" title="Edit">
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {canEdit && editing && (
            <button onClick={(e) => { e.stopPropagation(); commit(); }} className="p-1 text-black rounded hover:bg-gray-200" title="Save">
              <Save className="w-4 h-4" />
            </button>
          )}
          {canEdit && !editing && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 text-red-500 rounded hover:bg-gray-200" title="Delete">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <Plus className={`w-4 h-4 text-text-gray transition-transform ${isExpanded ? 'rotate-45' : ''}`} />
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4">
          {!editing ? (
            <p className="text-sm text-text-gray leading-relaxed">{item.answer}</p>
          ) : (
            <textarea
              className="w-full text-sm text-text-gray border rounded px-2 py-2"
              rows={4}
              value={a}
              onChange={(e) => setA(e.target.value)}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default FAQItem;
