"use client";

import * as React from "react";
import { Camera } from "lucide-react";
import type {
  Annotation,
  ImageAnnotation,
  PageRect,
  PdfOffset,
  PdfScroll,
} from "../types";
import { clamp01 } from "../utils/geometry";

type Props = {
  annotations: ImageAnnotation[];
  pageRects: PageRect[];
  pdfContentOffset: PdfOffset | { x: number; y: number };
  pdfScroll: PdfScroll | { x: number; y: number };
  domRef: React.RefObject<HTMLDivElement>;
  clientToCanvasPoint: (
    e: any,
    canvasEl: HTMLElement | null
  ) => { xCanvasPx: number; yCanvasPx: number };
  exportMode?: boolean;
  onOpen: (id: string) => void;
  onUpdate: (updater: (prev: Annotation[]) => Annotation[]) => void;
  onCommit: (updater: (prev: Annotation[]) => Annotation[], updatedId: string) => void;
};

const MARKER_PX = 28;
const DRAG_THRESHOLD_PX = 4;

function getLeftTop(v: any) {
  const left = typeof v?.left === "number" ? v.left : typeof v?.x === "number" ? v.x : 0;
  const top = typeof v?.top === "number" ? v.top : typeof v?.y === "number" ? v.y : 0;
  return { left, top };
}

function getNormPosition(
  a: ImageAnnotation,
  pageRect: PageRect,
  contentLeft: number,
  contentTop: number,
  scrollLeft: number,
  scrollTop: number
) {
  let normX = typeof a.normX === "number" ? a.normX : a.rect?.x;
  let normY = typeof a.normY === "number" ? a.normY : a.rect?.y;

  const hasAbs = typeof a.x === "number" && typeof a.y === "number";
  const shouldFallbackFromAbs =
    hasAbs &&
    (typeof normX !== "number" ||
      typeof normY !== "number" ||
      (normX === 0 &&
        normY === 0 &&
        typeof a.normX !== "number" &&
        typeof a.normY !== "number" &&
        typeof a.rect?.x !== "number" &&
        typeof a.rect?.y !== "number"));

  if (shouldFallbackFromAbs) {
    const pageLeftPdf = pageRect.left - contentLeft + scrollLeft;
    const pageTopPdf = pageRect.top - contentTop + scrollTop;
    normX = (Number(a.x) - pageLeftPdf) / Math.max(1, pageRect.width);
    normY = (Number(a.y) - pageTopPdf) / Math.max(1, pageRect.height);
  }

  return {
    normX: clamp01(typeof normX === "number" ? normX : 0),
    normY: clamp01(typeof normY === "number" ? normY : 0),
  };
}

export default function ImageAnnotationLayer({
  annotations,
  pageRects,
  pdfContentOffset,
  pdfScroll,
  domRef,
  clientToCanvasPoint,
  exportMode = false,
  onOpen,
  onUpdate,
  onCommit,
}: Props) {
  const { left: contentLeft, top: contentTop } = getLeftTop(pdfContentOffset);
  const { left: scrollLeft, top: scrollTop } = getLeftTop(pdfScroll);

  const dragRef = React.useRef<{
    id: string;
    pageIdx: number;
    pointerId: number;
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
    hasMoved: boolean;
  } | null>(null);

  const buildUpdater = React.useCallback(
    (id: string, pageIdx: number, normX: number, normY: number, pageRect: PageRect) => {
      const pageLeftPdf = pageRect.left - contentLeft + scrollLeft;
      const pageTopPdf = pageRect.top - contentTop + scrollTop;
      const absX = pageLeftPdf + normX * Math.max(1, pageRect.width);
      const absY = pageTopPdf + normY * Math.max(1, pageRect.height);

      return (prev: Annotation[]) =>
        prev.map((a) => {
          if (a.type !== "image" || a.id !== id) return a;
          const next: ImageAnnotation = {
            ...a,
            page: pageIdx + 1,
            normX,
            normY,
            x: absX,
            y: absY,
            updatedAt: Date.now(),
          };
          if (a.rect) {
            next.rect = { ...a.rect, x: normX, y: normY };
          }
          return next;
        });
    },
    [contentLeft, contentTop, scrollLeft, scrollTop]
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {annotations.map((a) => {
        const pageIdx = (a.page || 1) - 1;
        const pageRect = pageRects[pageIdx];
        if (!pageRect) return null;

        const { normX, normY } = getNormPosition(
          a,
          pageRect,
          contentLeft,
          contentTop,
          scrollLeft,
          scrollTop
        );

        const markerNormW = MARKER_PX / Math.max(1, pageRect.width);
        const markerNormH = MARKER_PX / Math.max(1, pageRect.height);

        const clampedX = Math.max(0, Math.min(1 - markerNormW, normX));
        const clampedY = Math.max(0, Math.min(1 - markerNormH, normY));

        const left =
          contentLeft + pageRect.left + clampedX * pageRect.width - scrollLeft;
        const top =
          contentTop + pageRect.top + clampedY * pageRect.height - scrollTop;

        const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
          if (exportMode) return;
          if (e.pointerType === "mouse" && e.button !== 0) return;
          e.preventDefault();
          e.stopPropagation();

          const root = domRef.current;
          if (!root) return;

          const { xCanvasPx, yCanvasPx } = clientToCanvasPoint(e, root);
          const localX = xCanvasPx - pageRect.left;
          const localY = yCanvasPx - pageRect.top;

          const annLeftPx = clampedX * pageRect.width;
          const annTopPx = clampedY * pageRect.height;

          dragRef.current = {
            id: a.id,
            pageIdx,
            pointerId: e.pointerId,
            offsetX: localX - annLeftPx,
            offsetY: localY - annTopPx,
            startX: localX,
            startY: localY,
            hasMoved: false,
          };

          try {
            (e.currentTarget as Element).setPointerCapture(e.pointerId);
          } catch {}
        };

        const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
          const drag = dragRef.current;
          if (!drag || drag.id !== a.id || drag.pointerId !== e.pointerId) return;

          e.preventDefault();
          e.stopPropagation();

          const root = domRef.current;
          if (!root) return;

          const { xCanvasPx, yCanvasPx } = clientToCanvasPoint(e, root);
          const localX = xCanvasPx - pageRect.left;
          const localY = yCanvasPx - pageRect.top;

          const dx = localX - drag.startX;
          const dy = localY - drag.startY;
          if (!drag.hasMoved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) {
            return;
          }
          drag.hasMoved = true;

          let nextNormX = (localX - drag.offsetX) / Math.max(1, pageRect.width);
          let nextNormY = (localY - drag.offsetY) / Math.max(1, pageRect.height);

          nextNormX = Math.max(0, Math.min(1 - markerNormW, nextNormX));
          nextNormY = Math.max(0, Math.min(1 - markerNormH, nextNormY));

          onUpdate(buildUpdater(a.id, pageIdx, nextNormX, nextNormY, pageRect));
        };

        const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
          const drag = dragRef.current;
          if (!drag || drag.id !== a.id || drag.pointerId !== e.pointerId) return;

          e.preventDefault();
          e.stopPropagation();

          const root = domRef.current;
          if (!root) return;

          dragRef.current = null;

          if (!drag.hasMoved) {
            onOpen(a.id);
            return;
          }

          const { xCanvasPx, yCanvasPx } = clientToCanvasPoint(e, root);
          const localX = xCanvasPx - pageRect.left;
          const localY = yCanvasPx - pageRect.top;

          let nextNormX = (localX - drag.offsetX) / Math.max(1, pageRect.width);
          let nextNormY = (localY - drag.offsetY) / Math.max(1, pageRect.height);

          nextNormX = Math.max(0, Math.min(1 - markerNormW, nextNormX));
          nextNormY = Math.max(0, Math.min(1 - markerNormH, nextNormY));

          onCommit(
            buildUpdater(a.id, pageIdx, nextNormX, nextNormY, pageRect),
            a.id
          );
        };

        const hasImage = (a.images?.length || 0) > 0;

        return (
          <button
            key={a.id}
            type="button"
            data-no-export="1"
            className="pointer-events-auto absolute flex items-center justify-center rounded-full border border-black/10 bg-white/90 shadow"
            style={{ left, top, width: MARKER_PX, height: MARKER_PX }}
            title={hasImage ? "View image" : "Upload image"}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <span className="pdf-camera-ui inline-flex h-6 w-6 items-center justify-center rounded-full">
              <Camera className={hasImage ? "h-4 w-4 text-black" : "h-4 w-4 text-gray-500"} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
