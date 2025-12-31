"use client";

import React from "react";
import { PdfArtifactService } from "@/services/pdfArtifacts";
import { artifactsToAnnotations } from "../utils/artifactsToAnnotations";
import type { Annotation } from "../types";

export function usePdfArtifactsSync(args: {
  projectId?: string;
  fileUrl?: string | null;
  fileName?: string | null;
  enabled: boolean;
  onLoaded: (anns: Annotation[]) => void;
  onError?: (msg: string) => void;
}) {
  const { projectId, fileUrl, fileName, enabled, onLoaded, onError } = args;

  const artifactServiceRef = React.useRef<PdfArtifactService | null>(null);
  const [artifactsLoaded, setArtifactsLoaded] = React.useState(false);
  const [artifactsError, setArtifactsError] = React.useState<string | null>(null);

  const onLoadedRef = React.useRef(onLoaded);
  const onErrorRef = React.useRef(onError);

  React.useEffect(() => {
    onLoadedRef.current = onLoaded;
  }, [onLoaded]);

  React.useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const contextKey = React.useMemo(() => {
    if (!enabled || !projectId || !fileUrl || !fileName) return null;
    return `${projectId}|${fileUrl}|${fileName}`;
  }, [enabled, projectId, fileUrl, fileName]);

  React.useEffect(() => {
    if (!contextKey) {
      artifactServiceRef.current = null;
      setArtifactsLoaded(false);
      setArtifactsError(null);
      return;
    }

    let cancelled = false;
    let svc: PdfArtifactService | null = null;

    const [pid, furl, fname] = contextKey.split("|");
    svc = new PdfArtifactService({ projectId: pid, fileUrl: furl, fileName: fname });
    artifactServiceRef.current = svc;

    setArtifactsLoaded(false);
    setArtifactsError(null);

    (async () => {
      try {
        await svc.init();
        const data = await svc.loadAll();
        if (cancelled) return;

        const fromArtifacts = artifactsToAnnotations(data);
        onLoadedRef.current?.(fromArtifacts);

        setArtifactsLoaded(true);
      } catch (e: any) {
        if (cancelled) return;
        const msg = e?.message || "Failed to load annotations";
        setArtifactsError(msg);
        setArtifactsLoaded(true);
        onErrorRef.current?.(msg);
      }
    })();

    return () => {
      cancelled = true;
      artifactServiceRef.current = null;
    };
  }, [contextKey]);

  return { artifactServiceRef, artifactsLoaded, artifactsError };
}
