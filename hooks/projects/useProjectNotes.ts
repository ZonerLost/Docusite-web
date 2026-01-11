"use client";

import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

type ProjectNotesState = {
  notes: string[];
  addNote: (note: string) => void;
  setNotes: Dispatch<SetStateAction<string[]>>;
};

export function useProjectNotes(projectId?: string): ProjectNotesState {
  const [notes, setNotes] = useState<string[]>([]);
  const notesKey = projectId ? `project:${projectId}:notes` : undefined;

  const addNote = useCallback(
    (note: string) => {
      setNotes((prev) => {
        const updated = [...prev, note];
        try {
          if (notesKey) localStorage.setItem(notesKey, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    },
    [notesKey]
  );

  useEffect(() => {
    if (!notesKey) return;
    const existing = localStorage.getItem(notesKey);
    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        if (Array.isArray(parsed)) setNotes(parsed);
      } catch {
        if (existing) setNotes(existing ? [existing] : []);
      }
    }
  }, [notesKey]);

  return { notes, addNote, setNotes };
}
