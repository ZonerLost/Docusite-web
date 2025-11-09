"use client";

import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { ensureSignedIn } from '@/lib/auth.init';
import type { ProjectFileUi } from '@/types/project-files';
import { formatRelativeTime, normalizeCategory, toDate } from '@/utils/projectFiles';

// Shape saved by upload flow (do not change field names here)
type ProjectFileEntry = {
  category?: string;
  fileName: string;
  fileUrl: string;
  lastUpdated?: unknown; // ISO string or Firestore Timestamp
  newCommentsCount?: number;
  newImagesCount?: number;
  uploadedBy?: string;
};

export type UseProjectFilesState = {
  files: ProjectFileUi[];
  isLoading: boolean;
  error: string | null;
};

/**
 * Subscribe to a project's files array in Firestore with real-time updates.
 * - Works with ISO string or Firestore Timestamp for `lastUpdated`.
 * - Normalizes category to known UI buckets to ensure items appear.
 */
export function useProjectFiles(projectId: string | undefined | null): UseProjectFilesState {
  const [files, setFiles] = useState<ProjectFileUi[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    let cancelled = false;

    async function run() {
      setIsLoading(true);
      setError(null);
      setFiles([]);
      if (!projectId) {
        setIsLoading(false);
        return;
      }

      try {
        await ensureSignedIn();
      } catch {
        // Proceed even if anonymous sign-in fails; Firestore rules may still allow read
      }

      try {
        const ref = doc(db, 'projects', projectId);
        unsub = onSnapshot(
          ref,
          (snap) => {
            if (cancelled) return;
            try {
              if (!snap.exists()) {
                setFiles([]);
                setIsLoading(false);
                return;
              }

              const data = snap.data() as Record<string, unknown>;
              const arr = (Array.isArray((data as any)?.files) ? (data as any).files : []) as ProjectFileEntry[];

              const normalized = arr.map((f, idx) => {
                const date = toDate(f.lastUpdated);
                return {
                  item: {
                    id: `${idx + 1}`,
                    name: String(f.fileName || ''),
                    lastUpdated: formatRelativeTime(date),
                    type: 'pdf' as const,
                    category: normalizeCategory(f.category),
                  },
                  timestamp: date?.getTime() ?? 0,
                  originalIndex: idx,
                };
              });

              const sorted = normalized
                .sort((a, b) => {
                  if (b.timestamp !== a.timestamp) return b.timestamp - a.timestamp;
                  return a.originalIndex - b.originalIndex;
                })
                .map((entry) => entry.item);

              setFiles(sorted);
              setIsLoading(false);
            } catch (e: any) {
              setError(e?.message || 'Failed to parse project files');
              setFiles([]);
              setIsLoading(false);
            }
          },
          (err) => {
            if (cancelled) return;
            setError(err?.message || 'Failed to subscribe to project files');
            setFiles([]);
            setIsLoading(false);
          }
        );
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || 'Failed to fetch project');
        setIsLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
      try {
        unsub?.();
      } catch {}
    };
  }, [projectId]);

  // Return stable reference to aid memoization in callers if needed
  return useMemo(() => ({ files, isLoading, error }), [files, isLoading, error]);
}

/** One-off fetch (non-realtime) helper if needed elsewhere. */
export async function fetchProjectFilesOnce(projectId: string): Promise<ProjectFileUi[]> {
  await ensureSignedIn().catch(() => undefined);
  const ref = doc(db, 'projects', projectId);
  const snap = await (await import('firebase/firestore')).getDoc(ref);
  if (!snap.exists()) return [];
  const data = snap.data() as any;
  const arr: ProjectFileEntry[] = Array.isArray(data?.files) ? data.files : [];
  return arr.map((f, idx) => ({
    id: `${idx + 1}`,
    name: String(f.fileName || ''),
    lastUpdated: formatRelativeTime(toDate(f.lastUpdated)),
    type: 'pdf',
    category: normalizeCategory(f.category),
  }));
}
