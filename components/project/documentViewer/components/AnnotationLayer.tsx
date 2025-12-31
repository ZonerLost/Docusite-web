"use client";

import React from "react";
import type { Annotation, PageRect, PdfOffset, PdfScroll, DragNoteState } from "../types";
import { getAnnotationScreenBox } from "../utils/geometry";

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
    onUpdate,
    onCommit,

    onSaveImmediate,
    onScheduleDebounced,

    setDraggingNote,
  } = props;

  return (
    <>
      {annotations.map((annotation) => {
        if (annotation.type === "draw" && annotation.pathData) {
          const penSizes = { small: 2, medium: 4, large: 6 } as const;
          const strokeWidth = annotation.penSize ? penSizes[annotation.penSize] : penSizes.medium;

          let pathData: string;
          if (annotation.pathDataNorm && annotation.page && pageRects[annotation.page - 1]) {
            const pr = pageRects[annotation.page - 1];
            const baseLeft = pr.left;
            const baseTop = pr.top;
            pathData = annotation.pathDataNorm.reduce((acc, p, idx) => {
              const sx = baseLeft + p.nx * pr.width;
              const sy = baseTop + p.ny * pr.height;
              return idx === 0 ? `M ${sx} ${sy}` : `${acc} L ${sx} ${sy}`;
            }, "");
          } else {
            pathData = annotation.pathData.reduce((path, point, index) => {
              if (index === 0) return `M ${point.x} ${point.y}`;
              return `${path} L ${point.x} ${point.y}`;
            }, "");
          }

          return (
            <svg
              key={annotation.id}
              className="pointer-events-none absolute left-0 top-0 h-full w-full"
              style={{ zIndex: 5 }}
            >
              <path
                d={pathData}
                stroke={annotation.color || "#000000"}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          );
        }

        const box = getAnnotationScreenBox({ a: annotation, pageRects, pdfContentOffset, pdfScroll });

        return (
          <div
            key={annotation.id}
            data-annotation-root="true"
            data-annotation-id={annotation.id}
            data-annotation-type={annotation.type}
            className={`absolute ${
              annotation.type === "text" || annotation.type === "image" || annotation.type === "note"
                ? "pointer-events-auto"
                : "pointer-events-none"
            }`}
            style={{
              left: box.left,
              top: box.top,
              width: box.width,
              height: box.height,
            }}
          >
            {annotation.type === "text" && (
              <div className="group relative">
                <div
                  className={`flex cursor-text items-center justify-start overflow-hidden border-2 text-sm transition-all duration-200 ${
                    editingAnnotationId === annotation.id
                      ? "border-blue-500 shadow-lg"
                      : "border-blue-400 hover:border-blue-500 hover:shadow-md"
                  }`}
                  style={{
                    width: "100%",
                    height: "100%",
                    minWidth: 50,
                    minHeight: 30,
                    padding: "4px 8px",
                    boxSizing: "border-box",
                    lineHeight: "1.2",
                    verticalAlign: "middle",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                  }}
                  contentEditable
                  suppressContentEditableWarning
                  ref={(el) => {
                    if (editingAnnotationId === annotation.id && el) {
                      setTimeout(() => {
                        el.focus();
                        if (!annotation.content) el.textContent = "";
                      }, 0);
                    }
                  }}
                  onFocus={() => setEditingAnnotationId(annotation.id)}
                  onBlur={(e) => {
                    setEditingAnnotationId(null);
                    const content = e.currentTarget.textContent || "";
                    const trimmed = content.trim();

                    if (!trimmed && annotation.isNew && !draggingAnnotationId && !resizingAnnotationId) {
                      const remaining = annotations.filter((a) => a.id !== annotation.id);
                      onCommit(remaining);
                      return;
                    }

                    const updated = annotations.map((a) =>
                      a.id === annotation.id ? { ...a, content, isNew: trimmed.length > 0 ? false : a.isNew } : a,
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
                      e.preventDefault();
                      try {
                        document.execCommand("insertText", false, "\n");
                      } catch {
                        const selection = window.getSelection();
                        if (!selection || selection.rangeCount === 0) return;
                        const range = selection.getRangeAt(0);
                        range.deleteContents();
                        range.insertNode(document.createTextNode("\n"));
                        range.collapse(false);
                        selection.removeAllRanges();
                        selection.addRange(range);
                      }
                    }
                  }}
                  onInput={(e) => {
                    const element = e.currentTarget;
                    const txt = element.textContent || "";
                    onScheduleDebounced(annotation, txt);
                  }}
                >
                  {annotation.content || (editingAnnotationId === annotation.id ? "" : "Click to edit text")}
                </div>

                <div
                  className="absolute h-3 w-3 cursor-se-resize bg-blue-500 opacity-0 transition-opacity duration-200 group-hover:opacity-70 hover:opacity-100"
                  style={{ right: -6, bottom: -6, borderRadius: "50%" }}
                  title="Drag to resize"
                />

                <button
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 transition-opacity duration-200 hover:bg-red-600 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(annotation.id);
                  }}
                  title="Delete text box"
                >
                  ×
                </button>
              </div>
            )}

            {annotation.type === "note" && (
              <div className="group relative">
                <div
                  className={`cursor-text overflow-hidden border-2 text-sm transition-all duration-200 ${
                    editingAnnotationId === annotation.id
                      ? "border-blue-500 shadow-lg"
                      : "border-blue-400 hover:border-blue-500 hover:shadow-md"
                  }`}
                  style={{
                    width: "100%",
                    height: "100%",
                    minWidth: 120,
                    minHeight: 40,
                    padding: "6px 8px 18px 8px",
                    boxSizing: "border-box",
                    lineHeight: "1.2",
                    background: "rgba(255,255,200,0.9)",
                  }}
                  contentEditable
                  suppressContentEditableWarning
                  ref={(el) => {
                    if (editingAnnotationId === annotation.id && el) {
                      setTimeout(() => {
                        el.focus();
                        if (!annotation.content) el.textContent = "";
                      }, 0);
                    }
                  }}
                  onFocus={() => setEditingAnnotationId(annotation.id)}
                  onBlur={(e) => {
                    setEditingAnnotationId(null);
                    const content = e.currentTarget.textContent || "";
                    const trimmed = content.trim();

                    if (!trimmed && annotation.isNew && !draggingAnnotationId && !resizingAnnotationId) {
                      const remaining = annotations.filter((a) => a.id !== annotation.id);
                      onCommit(remaining);
                      return;
                    }

                    const updated = annotations.map((a) =>
                      a.id === annotation.id ? { ...a, content, isNew: trimmed ? false : a.isNew } : a,
                    );
                    onCommit(updated);

                    const latest = updated.find((a) => a.id === annotation.id);
                    if (latest) onSaveImmediate(latest, content);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      (e.currentTarget as HTMLElement).blur();
                    }
                  }}
                  onInput={(e) => {
                    const txt = e.currentTarget.textContent || "";
                    onScheduleDebounced(annotation, txt);
                  }}
                >
                  {annotation.content || (editingAnnotationId === annotation.id ? "" : "Write a note")}
                </div>

                <button
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white hover:bg-red-600"
                  title="Remove note"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(annotation.id);
                  }}
                >
                  ×
                </button>
              </div>
            )}

            {annotation.type === "highlight" && (
              <div className="rounded bg-blue-200 opacity-50" style={{ width: "100%", height: "100%" }} />
            )}

            {annotation.type === "shape" && (
              <div className="rounded border-2 border-red-500" style={{ width: "100%", height: "100%" }} />
            )}

            {annotation.type === "image" && (
              <div className="annotation-group relative h-full w-full">
                {annotation.images?.[0]?.url && (
                  <img
                    src={annotation.images[0].url}
                    alt="annot"
                    className="annotation-img absolute inset-0 h-full w-full select-none object-contain"
                    draggable={false}
                  />
                )}

                {!!(annotation.content || "").trim() && (
                  <div
                    className="annotation-note absolute cursor-move rounded border border-border-gray bg-white/90 px-2 py-1 text-xs shadow-sm"
                    style={{
                      left: `${Math.round((annotation.noteRelX ?? 0.5) * 100)}%`,
                      top: `${Math.round((annotation.noteRelY ?? 0.5) * 100)}%`,
                      transform: "translate(-50%, -50%)",
                      zIndex: 6,
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      const container = e.currentTarget.parentElement as HTMLDivElement;
                      const rect = container.getBoundingClientRect();
                      const noteRect = e.currentTarget.getBoundingClientRect();
                      const offsetX = e.clientX - noteRect.left;
                      const offsetY = e.clientY - noteRect.top;
                      setDraggingNote({ id: annotation.id, offsetX, offsetY, rect });
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      const touch = e.touches[0] || e.changedTouches[0];
                      if (!touch) return;
                      const container = e.currentTarget.parentElement as HTMLDivElement;
                      const rect = container.getBoundingClientRect();
                      const noteRect = e.currentTarget.getBoundingClientRect();
                      const offsetX = touch.clientX - noteRect.left;
                      const offsetY = touch.clientY - noteRect.top;
                      setDraggingNote({ id: annotation.id, offsetX, offsetY, rect });
                    }}
                  >
                    {(annotation.content || "").trim()}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
