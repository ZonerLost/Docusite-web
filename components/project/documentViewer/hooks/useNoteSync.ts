// "use client";

// import React from "react";
// import type { DebouncedFn } from "@/utils/debounce";
// import { debounce } from "@/utils/debounce";
// import type { Annotation } from "../types";
// import type { PdfArtifactService, PdfNoteInput } from "@/services/pdfArtifacts";

// type PendingNoteSave = {
//   page: number;
//   input: PdfNoteInput;
//   svc: PdfArtifactService;
//   contextId: number;
// };

// type NoteSaveQueue = {
//   inFlight: Promise<void> | null;
//   pending: PendingNoteSave | null;
// };

// export function useNoteSync(args: {
//   artifactServiceRef: React.RefObject<PdfArtifactService | null>;
//   annotationsRef: React.RefObject<Annotation[]>;
//   contextKey: string;
// }) {
//   const { artifactServiceRef, annotationsRef, contextKey } = args;

//   const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);

//   const mountedRef = React.useRef(true);
//   const dirtyRef = React.useRef(false);
//   const saveContextIdRef = React.useRef(0);
//   const saveContextKeyRef = React.useRef<string>("");

//   const noteDraftTextRef = React.useRef<Map<string, string>>(new Map());
//   const dirtyNoteIdsRef = React.useRef<Set<string>>(new Set());
//   const noteSaveQueuesRef = React.useRef<Map<string, NoteSaveQueue>>(new Map());
//   const noteDebouncersRef = React.useRef<Map<string, DebouncedFn<(save: PendingNoteSave) => void>>>(new Map());

//   const setDirtyFlag = React.useCallback((next: boolean) => {
//     if (dirtyRef.current === next) return;
//     dirtyRef.current = next;
//     if (mountedRef.current) setHasUnsavedChanges(next);
//   }, []);

//   const syncDirtyFromRefs = React.useCallback(() => {
//     setDirtyFlag(dirtyNoteIdsRef.current.size > 0);
//   }, [setDirtyFlag]);

//   const startSavingNote = React.useCallback(
//     (noteId: string) => {
//       const q = noteSaveQueuesRef.current.get(noteId);
//       if (!q || q.inFlight) return;

//       q.inFlight = (async () => {
//         while (q.pending) {
//           const next = q.pending;
//           q.pending = null;

//           try {
//             await next.svc.updateNote(next.page, next.input);
//           } catch {
//             if (next.contextId !== saveContextIdRef.current) return;
//             dirtyNoteIdsRef.current.add(noteId);
//             syncDirtyFromRefs();
//             continue;
//           }

//           if (next.contextId !== saveContextIdRef.current) return;

//           const latestDraft = noteDraftTextRef.current.get(noteId);
//           if (!q.pending && (typeof latestDraft === "undefined" || latestDraft === next.input.text)) {
//             noteDraftTextRef.current.delete(noteId);
//             dirtyNoteIdsRef.current.delete(noteId);
//             syncDirtyFromRefs();
//           }
//         }
//       })().finally(() => {
//         q.inFlight = null;
//         if (q.pending) startSavingNote(noteId);
//       });
//     },
//     [syncDirtyFromRefs],
//   );

//   const enqueueNoteSave = React.useCallback(
//     (save: PendingNoteSave) => {
//       const noteId = save.input.id;
//       let q = noteSaveQueuesRef.current.get(noteId);
//       if (!q) {
//         q = { inFlight: null, pending: null };
//         noteSaveQueuesRef.current.set(noteId, q);
//       }
//       q.pending = save;

//       dirtyNoteIdsRef.current.add(noteId);
//       syncDirtyFromRefs();
//       startSavingNote(noteId);
//     },
//     [startSavingNote, syncDirtyFromRefs],
//   );

//   const getDebouncedNoteSave = React.useCallback(
//     (noteId: string) => {
//       const existing = noteDebouncersRef.current.get(noteId);
//       if (existing) return existing;

//       const debounced = debounce((save: PendingNoteSave) => enqueueNoteSave(save), 800);
//       noteDebouncersRef.current.set(noteId, debounced);
//       return debounced;
//     },
//     [enqueueNoteSave],
//   );

//   const scheduleNoteSaveDebounced = React.useCallback(
//     (annotation: Annotation, nextText: string) => {
//       const svc = artifactServiceRef.current;
//       if (!svc || !annotation.page || (annotation.type !== "text" && annotation.type !== "note")) return;

//       noteDraftTextRef.current.set(annotation.id, nextText);
//       dirtyNoteIdsRef.current.add(annotation.id);
//       syncDirtyFromRefs();

//       const input: PdfNoteInput = {
//         id: annotation.id,
//         annType: annotation.type === "note" ? 1 : 0,
//         position: { x: annotation.x, y: annotation.y },
//         text: nextText || "",
//         color: annotation.color || "#000000",
//         width: annotation.width || (annotation.type === "note" ? 200 : 120),
//         height: annotation.height || (annotation.type === "note" ? 60 : 32),
//       };

//       getDebouncedNoteSave(annotation.id)({
//         page: annotation.page || 1,
//         input,
//         svc,
//         contextId: saveContextIdRef.current,
//       });
//     },
//     [artifactServiceRef, getDebouncedNoteSave, syncDirtyFromRefs],
//   );

//   const saveNoteImmediate = React.useCallback(
//     (annotation: Annotation, forcedText?: string) => {
//       const svc = artifactServiceRef.current;
//       if (!svc || !annotation.page || (annotation.type !== "text" && annotation.type !== "note")) return;

//       const noteId = annotation.id;
//       const nextText =
//         typeof forcedText === "string" ? forcedText : noteDraftTextRef.current.get(noteId) ?? annotation.content ?? "";

//       if (typeof forcedText === "string") noteDraftTextRef.current.set(noteId, forcedText);

//       noteDebouncersRef.current.get(noteId)?.cancel();

//       const input: PdfNoteInput = {
//         id: annotation.id,
//         annType: annotation.type === "note" ? 1 : 0,
//         position: { x: annotation.x, y: annotation.y },
//         text: nextText || "",
//         color: annotation.color || "#000000",
//         width: annotation.width || (annotation.type === "note" ? 200 : 120),
//         height: annotation.height || (annotation.type === "note" ? 60 : 32),
//       };

//       enqueueNoteSave({
//         page: annotation.page || 1,
//         input,
//         svc,
//         contextId: saveContextIdRef.current,
//       });
//     },
//     [artifactServiceRef, enqueueNoteSave],
//   );

//   const forceSaveAll = React.useCallback(() => {
//     noteDebouncersRef.current.forEach((d) => d.flush());

//     const svc = artifactServiceRef.current;
//     if (!svc) return;

//     const contextId = saveContextIdRef.current;

//     const annotations = annotationsRef.current;
//     if (!annotations) return;

//     for (const noteId of Array.from(dirtyNoteIdsRef.current)) {
//       const q = noteSaveQueuesRef.current.get(noteId);
//       if (q?.pending || q?.inFlight) continue;

//       const a = annotations.find((x) => x.id === noteId);
//       if (!a || !a.page || (a.type !== "text" && a.type !== "note")) continue;

//       const draft = noteDraftTextRef.current.get(noteId);
//       const text = typeof draft === "string" ? draft : a.content || "";

//       const input: PdfNoteInput = {
//         id: a.id,
//         annType: a.type === "note" ? 1 : 0,
//         position: { x: a.x, y: a.y },
//         text: text || "",
//         color: a.color || "#000000",
//         width: a.width || (a.type === "note" ? 200 : 120),
//         height: a.height || (a.type === "note" ? 60 : 32),
//       };

//       enqueueNoteSave({ page: a.page || 1, input, svc, contextId });
//     }
//   }, [artifactServiceRef, annotationsRef, enqueueNoteSave]);

//   // Context switching: flush + reset queues
//   React.useEffect(() => {
//     const prev = saveContextKeyRef.current;
//     if (prev === contextKey) return;

//     if (prev) forceSaveAll();

//     noteDebouncersRef.current.forEach((d) => d.cancel());
//     noteDebouncersRef.current.clear();
//     noteDraftTextRef.current.clear();
//     dirtyNoteIdsRef.current.clear();
//     noteSaveQueuesRef.current.clear();

//     setDirtyFlag(false);
//     saveContextIdRef.current += 1;
//     saveContextKeyRef.current = contextKey;
//   }, [contextKey, forceSaveAll, setDirtyFlag]);

//   // Ctrl/Cmd+S flush
//   React.useEffect(() => {
//     const onKeyDown = (e: KeyboardEvent) => {
//       if (!(e.ctrlKey || e.metaKey)) return;
//       if (e.key !== "s" && e.key !== "S") return;
//       if (!dirtyRef.current) return;
//       e.preventDefault();
//       forceSaveAll();
//     };

//     window.addEventListener("keydown", onKeyDown);
//     return () => window.removeEventListener("keydown", onKeyDown);
//   }, [forceSaveAll]);

//   // Warn before unload if dirty
//   React.useEffect(() => {
//     if (!hasUnsavedChanges) return;

//     const onBeforeUnload = (e: BeforeUnloadEvent) => {
//       e.preventDefault();
//       e.returnValue = "";
//     };

//     window.addEventListener("beforeunload", onBeforeUnload);
//     return () => window.removeEventListener("beforeunload", onBeforeUnload);
//   }, [hasUnsavedChanges]);

//   // Cleanup
//   React.useEffect(() => {
//     return () => {
//       mountedRef.current = false;
//       if (dirtyRef.current) forceSaveAll();
//       noteDebouncersRef.current.forEach((d) => d.cancel());
//       noteDebouncersRef.current.clear();
//     };
//   }, [forceSaveAll]);

//   return {
//     hasUnsavedChanges,
//     saveContextIdRef, // used by artifacts sync/controller
//     scheduleNoteSaveDebounced,
//     saveNoteImmediate,
//     forceSaveAll,
//   };
// }




"use client";

import React from "react";
import type { DebouncedFn } from "@/utils/debounce";
import { debounce } from "@/utils/debounce";
import type { Annotation } from "../types";
import type { PdfArtifactService, PdfNoteInput } from "@/services/pdfArtifacts";

type PendingNoteSave = {
  page: number;
  input: PdfNoteInput;
  svc: PdfArtifactService;
  contextId: number;
};

type NoteSaveQueue = {
  inFlight: Promise<void> | null;
  pending: PendingNoteSave | null;
};

function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}

function makeSaveKey(page: number, input: PdfNoteInput) {
  // If x/y are large floats, round to avoid “micro-changes” spam
  const x = round3(Number(input.position?.x ?? 0));
  const y = round3(Number(input.position?.y ?? 0));
  const w = round3(Number(input.width ?? 0));
  const h = round3(Number(input.height ?? 0));
  const c = String(input.color ?? "");
  const t = String(input.text ?? "");
  const a = Number(input.annType ?? 0);
  return `${page}|${a}|${x},${y}|${w}x${h}|${c}|${t}`;
}

export function useNoteSync(args: {
  artifactServiceRef: React.RefObject<PdfArtifactService | null>;
  annotationsRef: React.RefObject<Annotation[]>;
  contextKey: string;
}) {
  const { artifactServiceRef, annotationsRef, contextKey } = args;

  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);

  const mountedRef = React.useRef(true);
  const dirtyRef = React.useRef(false);
  const saveContextIdRef = React.useRef(0);
  const saveContextKeyRef = React.useRef<string>("");

  // user draft text (typed but not yet confirmed saved)
  const noteDraftTextRef = React.useRef<Map<string, string>>(new Map());

  // dirty tracking by note id
  const dirtyNoteIdsRef = React.useRef<Set<string>>(new Set());

  // per note save queue
  const noteSaveQueuesRef = React.useRef<Map<string, NoteSaveQueue>>(new Map());

  // per note debouncer
  const noteDebouncersRef = React.useRef<Map<string, DebouncedFn<(save: PendingNoteSave) => void>>>(
    new Map(),
  );

  // ✅ NEW: dedupe
  const lastQueuedKeyRef = React.useRef<Map<string, string>>(new Map());
  const lastSavedKeyRef = React.useRef<Map<string, string>>(new Map());

  const setDirtyFlag = React.useCallback((next: boolean) => {
    if (dirtyRef.current === next) return;
    dirtyRef.current = next;
    if (mountedRef.current) setHasUnsavedChanges(next);
  }, []);

  const syncDirtyFromRefs = React.useCallback(() => {
    setDirtyFlag(dirtyNoteIdsRef.current.size > 0);
  }, [setDirtyFlag]);

  const startSavingNote = React.useCallback(
    (noteId: string) => {
      const q = noteSaveQueuesRef.current.get(noteId);
      if (!q || q.inFlight) return;

      q.inFlight = (async () => {
        while (q.pending) {
          const next = q.pending;
          q.pending = null;

          const key = makeSaveKey(next.page, next.input);

          try {
            await next.svc.updateNote(next.page, next.input);
          } catch {
            // if context changed, stop
            if (next.contextId !== saveContextIdRef.current) return;

            // keep dirty
            dirtyNoteIdsRef.current.add(noteId);
            syncDirtyFromRefs();
            continue;
          }

          if (next.contextId !== saveContextIdRef.current) return;

          // ✅ mark saved
          lastSavedKeyRef.current.set(noteId, key);

          // If no newer pending + the draft text matches what we saved, clear dirty
          const latestDraft = noteDraftTextRef.current.get(noteId);
          const savedText = next.input.text;

          if (!q.pending && (typeof latestDraft === "undefined" || latestDraft === savedText)) {
            noteDraftTextRef.current.delete(noteId);
            dirtyNoteIdsRef.current.delete(noteId);
            syncDirtyFromRefs();
          }
        }
      })().finally(() => {
        q.inFlight = null;
        if (q.pending) startSavingNote(noteId);
      });
    },
    [syncDirtyFromRefs],
  );

  const enqueueNoteSave = React.useCallback(
    (save: PendingNoteSave) => {
      const noteId = save.input.id;
      const key = makeSaveKey(save.page, save.input);

      // ✅ DEDUPE: if same payload already queued OR already saved, skip
      const lastQueued = lastQueuedKeyRef.current.get(noteId);
      const lastSaved = lastSavedKeyRef.current.get(noteId);

      if (lastQueued === key || lastSaved === key) return;

      lastQueuedKeyRef.current.set(noteId, key);

      let q = noteSaveQueuesRef.current.get(noteId);
      if (!q) {
        q = { inFlight: null, pending: null };
        noteSaveQueuesRef.current.set(noteId, q);
      }

      // overwrite pending with latest
      q.pending = save;

      dirtyNoteIdsRef.current.add(noteId);
      syncDirtyFromRefs();
      startSavingNote(noteId);
    },
    [startSavingNote, syncDirtyFromRefs],
  );

  const getDebouncedNoteSave = React.useCallback(
    (noteId: string) => {
      const existing = noteDebouncersRef.current.get(noteId);
      if (existing) return existing;

      const debounced = debounce((save: PendingNoteSave) => enqueueNoteSave(save), 800);
      noteDebouncersRef.current.set(noteId, debounced);
      return debounced;
    },
    [enqueueNoteSave],
  );

  const scheduleNoteSaveDebounced = React.useCallback(
    (annotation: Annotation, nextText: string) => {
      const svc = artifactServiceRef.current;
      if (!svc || !annotation.page || (annotation.type !== "text" && annotation.type !== "note")) return;

      const noteId = annotation.id;

      // Only treat as draft if it actually changed
      const prevDraft = noteDraftTextRef.current.get(noteId);
      if (prevDraft !== nextText) {
        noteDraftTextRef.current.set(noteId, nextText);
      }

      const input: PdfNoteInput = {
        id: noteId,
        annType: annotation.type === "note" ? 1 : 0,
        position: { x: annotation.x, y: annotation.y },
        text: nextText || "",
        color: annotation.color || "#000000",
        width: annotation.width || (annotation.type === "note" ? 200 : 120),
        height: annotation.height || (annotation.type === "note" ? 60 : 32),
      };

      // ✅ DEDUPE BEFORE DEBOUNCE
      const key = makeSaveKey(annotation.page, input);
      const lastQueued = lastQueuedKeyRef.current.get(noteId);
      const lastSaved = lastSavedKeyRef.current.get(noteId);
      if (lastQueued === key || lastSaved === key) return;

      dirtyNoteIdsRef.current.add(noteId);
      syncDirtyFromRefs();

      getDebouncedNoteSave(noteId)({
        page: annotation.page,
        input,
        svc,
        contextId: saveContextIdRef.current,
      });
    },
    [artifactServiceRef, getDebouncedNoteSave, syncDirtyFromRefs],
  );

  const saveNoteImmediate = React.useCallback(
    (annotation: Annotation, forcedText?: string) => {
      const svc = artifactServiceRef.current;
      if (!svc || !annotation.page || (annotation.type !== "text" && annotation.type !== "note")) return;

      const noteId = annotation.id;
      const nextText =
        typeof forcedText === "string"
          ? forcedText
          : noteDraftTextRef.current.get(noteId) ?? annotation.content ?? "";

      if (typeof forcedText === "string") noteDraftTextRef.current.set(noteId, forcedText);

      // cancel any scheduled debounce for this note
      noteDebouncersRef.current.get(noteId)?.cancel();

      const input: PdfNoteInput = {
        id: noteId,
        annType: annotation.type === "note" ? 1 : 0,
        position: { x: annotation.x, y: annotation.y },
        text: nextText || "",
        color: annotation.color || "#000000",
        width: annotation.width || (annotation.type === "note" ? 200 : 120),
        height: annotation.height || (annotation.type === "note" ? 60 : 32),
      };

      // ✅ DEDUPE HERE TOO
      const key = makeSaveKey(annotation.page, input);
      const lastQueued = lastQueuedKeyRef.current.get(noteId);
      const lastSaved = lastSavedKeyRef.current.get(noteId);
      if (lastQueued === key || lastSaved === key) return;

      enqueueNoteSave({
        page: annotation.page,
        input,
        svc,
        contextId: saveContextIdRef.current,
      });
    },
    [artifactServiceRef, enqueueNoteSave],
  );

  const forceSaveAll = React.useCallback(() => {
    // flush all debouncers first
    noteDebouncersRef.current.forEach((d) => d.flush());

    const svc = artifactServiceRef.current;
    if (!svc) return;

    const contextId = saveContextIdRef.current;
    const anns = annotationsRef.current;
    if (!anns) return;

    for (const noteId of Array.from(dirtyNoteIdsRef.current)) {
      const q = noteSaveQueuesRef.current.get(noteId);
      if (q?.pending || q?.inFlight) continue;

      const a = anns.find((x) => x.id === noteId);
      if (!a || !a.page || (a.type !== "text" && a.type !== "note")) continue;

      const draft = noteDraftTextRef.current.get(noteId);
      const text = typeof draft === "string" ? draft : a.content || "";

      const input: PdfNoteInput = {
        id: a.id,
        annType: a.type === "note" ? 1 : 0,
        position: { x: a.x, y: a.y },
        text: text || "",
        color: a.color || "#000000",
        width: a.width || (a.type === "note" ? 200 : 120),
        height: a.height || (a.type === "note" ? 60 : 32),
      };

      // ✅ dedupe
      const key = makeSaveKey(a.page, input);
      const lastQueued = lastQueuedKeyRef.current.get(noteId);
      const lastSaved = lastSavedKeyRef.current.get(noteId);
      if (lastQueued === key || lastSaved === key) continue;

      enqueueNoteSave({ page: a.page, input, svc, contextId });
    }
  }, [artifactServiceRef, annotationsRef, enqueueNoteSave]);

  // Context switching: flush + reset queues
  React.useEffect(() => {
    const prev = saveContextKeyRef.current;
    if (prev === contextKey) return;

    if (prev) forceSaveAll();

    noteDebouncersRef.current.forEach((d) => d.cancel());
    noteDebouncersRef.current.clear();
    noteDraftTextRef.current.clear();
    dirtyNoteIdsRef.current.clear();
    noteSaveQueuesRef.current.clear();

    // ✅ clear dedupe maps per-context
    lastQueuedKeyRef.current.clear();
    lastSavedKeyRef.current.clear();

    setDirtyFlag(false);
    saveContextIdRef.current += 1;
    saveContextKeyRef.current = contextKey;
  }, [contextKey, forceSaveAll, setDirtyFlag]);

  // Ctrl/Cmd+S flush
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key !== "s" && e.key !== "S") return;
      if (!dirtyRef.current) return;
      e.preventDefault();
      forceSaveAll();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [forceSaveAll]);

  // Warn before unload if dirty
  React.useEffect(() => {
    if (!hasUnsavedChanges) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsavedChanges]);

  // Cleanup
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (dirtyRef.current) forceSaveAll();
      noteDebouncersRef.current.forEach((d) => d.cancel());
      noteDebouncersRef.current.clear();
    };
  }, [forceSaveAll]);

  return {
    hasUnsavedChanges,
    saveContextIdRef,
    scheduleNoteSaveDebounced,
    saveNoteImmediate,
    forceSaveAll,
  };
}
