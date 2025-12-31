"use client";

import React from "react";
import type { Annotation } from "../types";

export function useAnnotationHistory(opts: { onUndo?: () => void; onRedo?: () => void }) {
  const { onUndo, onRedo } = opts;

  const [annotations, setAnnotations] = React.useState<Annotation[]>([]);
  const annotationsRef = React.useRef<Annotation[]>([]);
  React.useEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);

  const historyRef = React.useRef<Annotation[][]>([[]]);
  const historyIndexRef = React.useRef(0);

  const pushHistory = React.useCallback((next: Annotation[]) => {
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push([...next]);
    historyRef.current = newHistory.slice(-50);
    historyIndexRef.current = Math.min(historyIndexRef.current + 1, 49);
  }, []);

  const apply = React.useCallback(
    (next: Annotation[], withHistory = true) => {
      setAnnotations(next);
      if (withHistory) pushHistory(next);
    },
    [pushHistory],
  );

  const replaceAll = React.useCallback((next: Annotation[]) => {
    setAnnotations(next);
    historyRef.current = [next];
    historyIndexRef.current = 0;
  }, []);

  const undo = React.useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      setAnnotations([...historyRef.current[historyIndexRef.current]]);
      onUndo?.();
    }
  }, [onUndo]);

  const redo = React.useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      setAnnotations([...historyRef.current[historyIndexRef.current]]);
      onRedo?.();
    }
  }, [onRedo]);

  return {
    annotations,
    annotationsRef,
    apply,
    replaceAll,
    pushHistory,
    undo,
    redo,
    historyRef,
    historyIndexRef,
  };
}
