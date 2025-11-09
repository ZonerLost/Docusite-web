"use client";

import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { ensureSignedIn } from '@/lib/auth.init';

type FileEntry = {
  category?: string;
  fileName: string;
  fileUrl: string;
  lastUpdated?: unknown;
};

export type UseProjectFileUrlState = {
  url: string | null;
  isLoading: boolean;
  error: string | null;
};

/**
 * Subscribe to project doc and resolve the fileUrl for a given fileName.
 * Falls back to the most recently updated file if the named file is not found.
 */
export function useProjectFileUrl(projectId?: string | null, fileName?: string | null): UseProjectFileUrlState {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    let cancelled = false;

    async function run() {
      setIsLoading(true);
      setError(null);
      setUrl(null);
      if (!projectId) {
        setIsLoading(false);
        return;
      }

      try { await ensureSignedIn(); } catch {}

      try {
        const ref = doc(db, 'projects', projectId);
        unsub = onSnapshot(
          ref,
          (snap) => {
            if (cancelled) return;
            try {
              if (!snap.exists()) {
                setUrl(null);
                setIsLoading(false);
                return;
              }
              const data = snap.data() as any;
              const arr: FileEntry[] = Array.isArray(data?.files) ? data.files : [];
              let found: FileEntry | null = null;
              if (fileName) {
                found = arr.find((f) => String(f?.fileName || '').trim() === String(fileName).trim()) || null;
              }
              if (!found) {
                // Fallback: pick the last entry (assumed most recent)
                found = arr.length ? arr[arr.length - 1] : null;
              }
              setUrl(found?.fileUrl || null);
              setIsLoading(false);
            } catch (e: any) {
              setError(e?.message || 'Failed to parse project file');
              setUrl(null);
              setIsLoading(false);
            }
          },
          (err) => {
            if (cancelled) return;
            setError(err?.message || 'Failed to subscribe to project');
            setUrl(null);
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
      try { unsub?.(); } catch {}
    };
  }, [projectId, fileName]);

  return useMemo(() => ({ url, isLoading, error }), [url, isLoading, error]);
}

