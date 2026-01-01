"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import { ensureSignedIn } from "@/lib/auth.init";
import type { ProjectFilePhoto } from "@/components/project/documentViewer/types";

type PhotoDocument = Record<string, unknown>;

export type UseProjectFilePhotosState = {
  photos: ProjectFilePhoto[];
  isLoading: boolean;
  error: string | null;
};

function toProjectFilePhoto(
  id: string,
  projectId: string,
  pdfId: string,
  data: PhotoDocument,
): ProjectFilePhoto {
  const createdAtValue = data.createdAt;
  const createdAtMsFromTimestamp =
    createdAtValue && typeof (createdAtValue as any)?.toMillis === "function"
      ? (createdAtValue as any).toMillis()
      : undefined;
  const createdAtMs =
    typeof data.createdAtMs === "number" ? data.createdAtMs : createdAtMsFromTimestamp;

  const storagePath = typeof data.storagePath === "string" ? data.storagePath : "";
  const storageKey =
    typeof data.storageKey === "string"
      ? data.storageKey
      : storagePath || "";
  const mimeType =
    typeof data.mimeType === "string"
      ? data.mimeType
      : typeof data.contentType === "string"
        ? data.contentType
        : undefined;

  return {
    id,
    projectId: typeof data.projectId === "string" ? data.projectId : projectId,
    pdfId: typeof data.pdfId === "string" ? data.pdfId : pdfId,
    url: typeof data.url === "string" ? data.url : "",
    description: typeof data.description === "string" ? data.description : "",
    storagePath,
    storageKey,
    contentType: typeof data.contentType === "string" ? data.contentType : mimeType || "",
    refNo: typeof data.refNo === "string" ? data.refNo : id,
    createdAt: data.createdAt ?? null,
    createdAtMs,
    mimeType,
    sizeBytes: typeof data.sizeBytes === "number" ? data.sizeBytes : undefined,
    originalName: typeof data.originalName === "string" ? data.originalName : undefined,
    annotationId:
      data.annotationId === null
        ? null
        : typeof data.annotationId === "string"
          ? data.annotationId
          : undefined,
    page: typeof data.page === "number" ? data.page : undefined,
    normX: typeof data.normX === "number" ? data.normX : undefined,
    normY: typeof data.normY === "number" ? data.normY : undefined,
    normW: typeof data.normW === "number" ? data.normW : undefined,
    normH: typeof data.normH === "number" ? data.normH : undefined,
  };
}

export default function useProjectFilePhotos(
  projectId: string | null,
  pdfId: string | null,
): UseProjectFilePhotosState {
  const [photos, setPhotos] = useState<ProjectFilePhoto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    let cancelled = false;

    async function run() {
      setIsLoading(true);
      setError(null);
      setPhotos([]);

      if (!projectId || !pdfId) {
        setIsLoading(false);
        return;
      }

      try {
        await ensureSignedIn();
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || "Failed to ensure authentication");
        setIsLoading(false);
        return;
      }

      try {
        const col = collection(db, "projectFilePhotos");
        const snapshotQuery = query(
          col,
          where("projectId", "==", projectId),
          where("pdfId", "==", pdfId),
        );
        unsub = onSnapshot(
          snapshotQuery,
          (snapshot) => {
            if (cancelled) return;
            const next = snapshot.docs
              .map((doc) => toProjectFilePhoto(doc.id, projectId, pdfId, doc.data()));

            next.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
            setPhotos(next);
            setIsLoading(false);
          },
          (err) => {
            if (cancelled) return;
            setError(err?.message || "Failed to load project photos");
            setPhotos([]);
            setIsLoading(false);
          },
        );
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || "Failed to subscribe to project photos");
        setIsLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
      try {
        unsub?.();
      } catch {
        // ignore
      }
    };
  }, [projectId, pdfId]);

  return useMemo(() => ({ photos, isLoading, error }), [photos, isLoading, error]);
}
