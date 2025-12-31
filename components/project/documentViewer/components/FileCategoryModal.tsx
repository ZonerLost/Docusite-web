"use client";

import React from "react";

export default function FileCategoryModal(props: {
  open: boolean;
  category: string;
  files: { id: string; name: string }[];
  onClose: () => void;
  onPick: (file: { id: string; name: string }) => void;
}) {
  const { open, category, files, onClose, onPick } = props;
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-80 max-w-[90vw] rounded-lg border border-border-gray bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-border-gray px-4 py-3">
          <h3 className="text-sm font-semibold text-black">{category}</h3>
          <button onClick={onClose} className="text-sm text-action hover:text-action/80">
            Close
          </button>
        </div>

        <div className="max-h-[50vh] overflow-auto p-2">
          {files.map((f) => (
            <button
              key={f.id}
              onClick={() => onPick(f)}
              className="w-full rounded px-3 py-2 text-left text-sm text-black hover:bg-light-gray"
            >
              {f.name}
            </button>
          ))}

          {files.length === 0 && <div className="px-3 py-4 text-xs text-text-gray">No files uploaded yet</div>}
        </div>
      </div>
    </div>
  );
}
