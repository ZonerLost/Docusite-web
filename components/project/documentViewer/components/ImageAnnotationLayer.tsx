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
    e: CanvasPointInput,
    canvasEl: HTMLElement | null
  ) => { xCanvasPx: number; yCanvasPx: number };
  exportMode?: boolean;
  onOpen: (id: string) => void;
  onUpdate: (updater: (prev: Annotation[]) => Annotation[]) => void;
  onCommit: (updater: (prev: Annotation[]) => Annotation[], updatedId: string) => void;
};

const MARKER_PX = 28;
const DRAG_THRESHOLD_PX = 4;
const MIN_IMAGE_PX = 48;

type CanvasPointInput = {
  clientX?: number;
  clientY?: number;
  touches?: TouchList;
  changedTouches?: TouchList;
};

type LeftTopLike = { left?: number; top?: number; x?: number; y?: number };

function getLeftTop(v: LeftTopLike | null | undefined) {
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

function getNormSize(a: ImageAnnotation, pageRect: PageRect) {
  const fallbackW = typeof a.width === "number" ? a.width : MARKER_PX;
  const fallbackH = typeof a.height === "number" ? a.height : MARKER_PX;

  const rawW =
    typeof a.rect?.w === "number"
      ? a.rect.w
      : typeof a.normW === "number"
      ? a.normW
      : fallbackW / Math.max(1, pageRect.width);

  const rawH =
    typeof a.rect?.h === "number"
      ? a.rect.h
      : typeof a.normH === "number"
      ? a.normH
      : fallbackH / Math.max(1, pageRect.height);

  const normW = clamp01(typeof rawW === "number" ? rawW : 0);
  const normH = clamp01(typeof rawH === "number" ? rawH : 0);

  return {
    normW: normW > 0 ? normW : MARKER_PX / Math.max(1, pageRect.width),
    normH: normH > 0 ? normH : MARKER_PX / Math.max(1, pageRect.height),
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
    normW: number;
    normH: number;
    hasMoved: boolean;
  } | null>(null);

  const resizeRef = React.useRef<{
    id: string;
    pageIdx: number;
    pointerId: number;
    startX: number;
    startY: number;
    normX: number;
    normY: number;
    normW: number;
    normH: number;
  } | null>(null);

  const buildUpdater = React.useCallback(
    (
      id: string,
      pageIdx: number,
      normX: number,
      normY: number,
      normW: number,
      normH: number,
      pageRect: PageRect
    ) => {
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
            normW,
            normH,
            rect: { x: normX, y: normY, w: normW, h: normH },
            x: absX,
            y: absY,
            width: normW * pageRect.width,
            height: normH * pageRect.height,
            updatedAt: Date.now(),
          };
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
        const { normW, normH } = getNormSize(a, pageRect);

        const clampedX = Math.max(0, Math.min(1 - normW, normX));
        const clampedY = Math.max(0, Math.min(1 - normH, normY));

        const left = pageRect.left + clampedX * pageRect.width;
        const top = pageRect.top + clampedY * pageRect.height;
        const width = normW * pageRect.width;
        const height = normH * pageRect.height;

        const hasImage = (a.images?.length || 0) > 0;

        const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
          if (exportMode) return;
          if (e.pointerType === "mouse" && e.button !== 0) return;
          if ((e.target as HTMLElement | null)?.closest?.("[data-resize-handle=\"1\"]")) {
            return;
          }
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
            normW,
            normH,
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

          nextNormX = Math.max(0, Math.min(1 - drag.normW, nextNormX));
          nextNormY = Math.max(0, Math.min(1 - drag.normH, nextNormY));

          onUpdate(buildUpdater(a.id, pageIdx, nextNormX, nextNormY, drag.normW, drag.normH, pageRect));
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

          nextNormX = Math.max(0, Math.min(1 - drag.normW, nextNormX));
          nextNormY = Math.max(0, Math.min(1 - drag.normH, nextNormY));

          onCommit(buildUpdater(a.id, pageIdx, nextNormX, nextNormY, drag.normW, drag.normH, pageRect), a.id);
        };

        const handleResizeDown = (e: React.PointerEvent<HTMLSpanElement>) => {
          if (exportMode) return;
          if (e.pointerType === "mouse" && e.button !== 0) return;
          e.preventDefault();
          e.stopPropagation();

          resizeRef.current = {
            id: a.id,
            pageIdx,
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            normX: clampedX,
            normY: clampedY,
            normW,
            normH,
          };

          try {
            (e.currentTarget as Element).setPointerCapture(e.pointerId);
          } catch {}
        };

        const handleResizeMove = (e: React.PointerEvent<HTMLSpanElement>) => {
          const resize = resizeRef.current;
          if (!resize || resize.id !== a.id || resize.pointerId !== e.pointerId) return;

          e.preventDefault();
          e.stopPropagation();

          const root = domRef.current;
          if (!root) return;

          const { xCanvasPx, yCanvasPx } = clientToCanvasPoint(e, root);
          const localX = xCanvasPx - pageRect.left;
          const localY = yCanvasPx - pageRect.top;

          const leftPx = resize.normX * pageRect.width;
          const topPx = resize.normY * pageRect.height;

          const nextPxW = Math.max(MIN_IMAGE_PX, localX - leftPx);
          const nextPxH = Math.max(MIN_IMAGE_PX, localY - topPx);

          let nextNormW = clamp01(nextPxW / Math.max(1, pageRect.width));
          let nextNormH = clamp01(nextPxH / Math.max(1, pageRect.height));

          if (resize.normX + nextNormW > 1) nextNormW = Math.max(0.02, 1 - resize.normX);
          if (resize.normY + nextNormH > 1) nextNormH = Math.max(0.02, 1 - resize.normY);

          onUpdate(buildUpdater(a.id, pageIdx, resize.normX, resize.normY, nextNormW, nextNormH, pageRect));
        };

        const handleResizeUp = (e: React.PointerEvent<HTMLSpanElement>) => {
          const resize = resizeRef.current;
          if (!resize || resize.id !== a.id || resize.pointerId !== e.pointerId) return;

          e.preventDefault();
          e.stopPropagation();

          resizeRef.current = null;

          const root = domRef.current;
          if (!root) return;

          const { xCanvasPx, yCanvasPx } = clientToCanvasPoint(e, root);
          const localX = xCanvasPx - pageRect.left;
          const localY = yCanvasPx - pageRect.top;

          const leftPx = resize.normX * pageRect.width;
          const topPx = resize.normY * pageRect.height;

          const nextPxW = Math.max(MIN_IMAGE_PX, localX - leftPx);
          const nextPxH = Math.max(MIN_IMAGE_PX, localY - topPx);

          let nextNormW = clamp01(nextPxW / Math.max(1, pageRect.width));
          let nextNormH = clamp01(nextPxH / Math.max(1, pageRect.height));

          if (resize.normX + nextNormW > 1) nextNormW = Math.max(0.02, 1 - resize.normX);
          if (resize.normY + nextNormH > 1) nextNormH = Math.max(0.02, 1 - resize.normY);

          onCommit(buildUpdater(a.id, pageIdx, resize.normX, resize.normY, nextNormW, nextNormH, pageRect), a.id);
        };

        return (
          <button
            key={a.id}
            type="button"
            data-no-export="1"
            className="pointer-events-auto absolute flex items-center justify-center rounded border border-black/10 bg-white/90 shadow"
            style={{ left, top, width, height }}
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
            {hasImage ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.images?.[0]?.url}
                  alt={a.description || "Annotation image"}
                  className="h-full w-full select-none object-contain"
                  draggable={false}
                />
                <span
                  data-no-export="1"
                  data-resize-handle="1"
                  className="absolute -bottom-2 -right-2 h-3 w-3 cursor-se-resize rounded-full bg-white shadow"
                  onPointerDown={handleResizeDown}
                  onPointerMove={handleResizeMove}
                  onPointerUp={handleResizeUp}
                  onPointerCancel={handleResizeUp}
                  title="Drag to resize"
                />
              </>
            ) : (
              <span className="pdf-camera-ui inline-flex h-6 w-6 items-center justify-center rounded-full">
                <Camera className="h-4 w-4 text-gray-500" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
