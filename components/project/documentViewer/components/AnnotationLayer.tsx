"use client";

import React from "react";
import type { Annotation, PageRect, PdfOffset, PdfScroll, DragNoteState } from "../types";
import { getAnnotationScreenBox } from "../utils/geometry";

type LeftTopLike = { left?: number; top?: number; x?: number; y?: number };

function getLeftTop(v: LeftTopLike | null | undefined) {
  const left = typeof v?.left === "number" ? v.left : typeof v?.x === "number" ? v.x : 0;
  const top = typeof v?.top === "number" ? v.top : typeof v?.y === "number" ? v.y : 0;
  return { left, top };
}

export default function AnnotationLayer(props: {
  annotations: Annotation[];
  pageRects: PageRect[];
  pdfContentOffset: PdfOffset;
  pdfScroll: PdfScroll;

  editingAnnotationId: string | null;
  setEditingAnnotationId: (id: string | null) => void;

  draggingAnnotationId: string | null;
  resizingAnnotationId: string | null;

  onDelete: (id: string) => void;
  onUpdate: (updater: (prev: Annotation[]) => Annotation[]) => void;
  onCommit: (next: Annotation[]) => void;

  onSaveImmediate: (a: Annotation, forcedText?: string) => void;
  onScheduleDebounced: (a: Annotation, text: string) => void;

  setDraggingNote: (next: DragNoteState) => void;
}) {
  const {
    annotations,
    pageRects,
    pdfContentOffset,
    pdfScroll,

    editingAnnotationId,
    setEditingAnnotationId,
    draggingAnnotationId,
    resizingAnnotationId,

    onDelete,
    onCommit,

    onSaveImmediate,
    onScheduleDebounced,

    setDraggingNote,
  } = props;

  const { left: contentLeft, top: contentTop } = getLeftTop(pdfContentOffset);
  const { left: scrollLeft, top: scrollTop } = getLeftTop(pdfScroll);

  return (
    <>
      {annotations.map((annotation) => {
        // Draw strokes
        if (annotation.type === "draw" && annotation.pathData?.length) {
          const penSizes = { small: 2, medium: 4, large: 6 } as const;
          const strokeWidth = annotation.penSize ? penSizes[annotation.penSize] : penSizes.medium;

          // Prefer normalized data if present (best alignment across scroll/resize)
          const d =
            annotation.pathDataNorm && annotation.page && pageRects[annotation.page - 1]
              ? (() => {
                  const pr = pageRects[annotation.page - 1];
                  return annotation.pathDataNorm.reduce((acc, p, idx) => {
                    const sx = pr.left + p.nx * pr.width;
                    const sy = pr.top + p.ny * pr.height;
                    return idx === 0 ? `M ${sx} ${sy}` : `${acc} L ${sx} ${sy}`;
                  }, "");
                })()
              : (() => {
                  // Fallback: treat points as "pdf-content space" and convert -> screen
                  return annotation.pathData.reduce((acc, pt, idx) => {
                    const sx = contentLeft + pt.x - scrollLeft;
                    const sy = contentTop + pt.y - scrollTop;
                    return idx === 0 ? `M ${sx} ${sy}` : `${acc} L ${sx} ${sy}`;
                  }, "");
                })();

          return (
            <svg
              key={annotation.id}
              className="pointer-events-none absolute left-0 top-0 h-full w-full"
              style={{ zIndex: 5 }}
            >
              <path
                d={d}
                stroke={annotation.color || "#000000"}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          );
        }

        //  images are NOT rendered here (use ImageAnnotationLayer)
        if (annotation.type === "image") return null;

        const box = getAnnotationScreenBox({ a: annotation, pageRects, pdfContentOffset, pdfScroll });

        return (
          <div
            key={annotation.id}
            data-annotation-root="true"
            data-annotation-id={annotation.id}
            data-annotation-type={annotation.type}
            className={[
              "absolute",
              annotation.type === "text" || annotation.type === "note" ? "pointer-events-auto" : "pointer-events-none",
            ].join(" ")}
            style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
          >
            {/* TEXT */}
            {annotation.type === "text" && (
              <div className="group relative h-full w-full">
                <div
                  className={[
                    "flex h-full w-full cursor-text items-center justify-start overflow-hidden border-2 text-sm transition-all",
                    editingAnnotationId === annotation.id
                      ? "border-blue-500 shadow-lg"
                      : "border-blue-400 hover:border-blue-500 hover:shadow-md",
                  ].join(" ")}
                  style={{
                    minWidth: 50,
                    minHeight: 30,
                    padding: "4px 8px",
                    boxSizing: "border-box",
                    lineHeight: "1.2",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                  }}
                  contentEditable
                  suppressContentEditableWarning
                  ref={(el) => {
                    if (editingAnnotationId === annotation.id && el) {
                      queueMicrotask(() => {
                        try {
                          el.focus();
                          if (!annotation.content) el.textContent = "";
                        } catch {}
                      });
                    }
                  }}
                  onFocus={() => setEditingAnnotationId(annotation.id)}
                  onBlur={(e) => {
                    setEditingAnnotationId(null);
                    const content = e.currentTarget.textContent || "";
                    const trimmed = content.trim();

                    if (!trimmed && annotation.isNew && !draggingAnnotationId && !resizingAnnotationId) {
                      onCommit(annotations.filter((a) => a.id !== annotation.id));
                      return;
                    }

                    const updated = annotations.map((a) =>
                      a.id === annotation.id ? { ...a, content } : a,
                    );
                    onCommit(updated);

                    const latest = updated.find((a) => a.id === annotation.id);
                    if (latest) onSaveImmediate(latest, content);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      (e.currentTarget as HTMLElement).blur();
                      return;
                    }
                    if (e.key === "Enter") {
                      // allow multi-line
                      e.preventDefault();
                      document.execCommand?.("insertText", false, "\n");
                    }
                  }}
                  onInput={(e) => {
                    onScheduleDebounced(annotation, e.currentTarget.textContent || "");
                  }}
                >
                  {annotation.content || (editingAnnotationId === annotation.id ? "" : "Click to edit text")}
                </div>

                {/* resize dot (visual only) */}
                <div
                  className="absolute h-3 w-3 cursor-se-resize bg-blue-500 opacity-0 transition-opacity group-hover:opacity-70"
                  style={{ right: -6, bottom: -6, borderRadius: "50%" }}
                  title="Drag to resize"
                />

                <button
                  type="button"
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(annotation.id);
                  }}
                  title="Delete text box"
                >
                  ×
                </button>
              </div>
            )}

            {/* NOTE */}
            {annotation.type === "note" && (
              <div className="group relative h-full w-full">
                <div
                  className={[
                    "h-full w-full cursor-text overflow-hidden border-2 text-sm transition-all",
                    editingAnnotationId === annotation.id
                      ? "border-blue-500 shadow-lg"
                      : "border-blue-400 hover:border-blue-500 hover:shadow-md",
                  ].join(" ")}
                  style={{
                    minWidth: 120,
                    minHeight: 40,
                    padding: "6px 8px 18px 8px",
                    boxSizing: "border-box",
                    lineHeight: "1.2",
                    background: "rgba(255,255,200,0.9)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                  }}
                  contentEditable
                  suppressContentEditableWarning
                  ref={(el) => {
                    if (editingAnnotationId === annotation.id && el) {
                      queueMicrotask(() => {
                        try {
                          el.focus();
                          if (!annotation.content) el.textContent = "";
                        } catch {}
                      });
                    }
                  }}
                  onFocus={() => setEditingAnnotationId(annotation.id)}
                  onBlur={(e) => {
                    setEditingAnnotationId(null);
                    const content = e.currentTarget.textContent || "";
                    const trimmed = content.trim();

                    if (!trimmed && annotation.isNew && !draggingAnnotationId && !resizingAnnotationId) {
                      onCommit(annotations.filter((a) => a.id !== annotation.id));
                      return;
                    }

                    const updated = annotations.map((a) =>
                      a.id === annotation.id ? { ...a, content } : a,
                    );
                    onCommit(updated);

                    const latest = updated.find((a) => a.id === annotation.id);
                    if (latest) onSaveImmediate(latest, content);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      (e.currentTarget as HTMLElement).blur();
                      return;
                    }
                    if (e.key === "Enter") {
                      // allow multi-line note too
                      e.preventDefault();
                      document.execCommand?.("insertText", false, "\n");
                    }
                  }}
                  onInput={(e) => {
                    onScheduleDebounced(annotation, e.currentTarget.textContent || "");
                  }}
                >
                  {annotation.content || (editingAnnotationId === annotation.id ? "" : "Write a note")}
                </div>

                <div
                  className="absolute h-3 w-3 cursor-se-resize bg-blue-500 opacity-0 transition-opacity group-hover:opacity-70"
                  style={{ right: -6, bottom: -6, borderRadius: "50%" }}
                  title="Drag to resize"
                />

                <button
                  type="button"
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white hover:bg-red-600"
                  title="Remove note"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(annotation.id);
                  }}
                >
                  ×
                </button>
              </div>
            )}

            {/* HIGHLIGHT */}
            {annotation.type === "highlight" && (
              <div className="rounded bg-blue-200 opacity-50" style={{ width: "100%", height: "100%" }} />
            )}

            {/* SHAPE */}
            {annotation.type === "shape" && (
              <div
                className={[
                  "h-full w-full border-2",
                  annotation.shape === "circle" ? "rounded-full" : "rounded-sm",
                ].join(" ")}
                style={{ borderColor: annotation.color || "#ff0000" }}
              />
            )}
          </div>
        );
      })}
    </>
  );
}
