"use client";

import React from "react";
import type {
  AnnotationTool,
  DragNoteState,
  PageRect,
  Annotation,
  ImageAnnotation,
} from "../types";
import {
  clamp01,
  isPointNearLine,
  getAnnotationScreenBox,
} from "../utils/geometry";
import type {
  PdfArtifactService,
  CameraPinInput,
  StrokeInput,
  PdfNoteInput,
} from "@/services/pdfArtifacts";

type DragStart = {
  pageIdx: number;
  offsetX: number; // px inside page
  offsetY: number; // px inside page
};

type ResizeStart = {
  pageIdx: number;
  startLocalX: number; // px inside page
  startLocalY: number; // px inside page
  baseNormX: number; // annotation normX at start
  baseNormY: number; // annotation normY at start
  baseNormW: number; // annotation normW at start
  baseNormH: number; // annotation normH at start
};

function makeId() {
  // better than Date.now collisions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = typeof crypto !== "undefined" ? crypto : null;
  return c?.randomUUID
    ? c.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function ensurePageIdx(page: number | undefined | null) {
  if (!page || !Number.isFinite(page)) return 0;
  return Math.max(0, page - 1);
}

function isImageAnnotation(a: Annotation): a is ImageAnnotation {
  return a.type === "image";
}

const INACTIVE_TOUCH_ACTION = "pan-y";
const ACTIVE_TOUCH_ACTION = "none";

function isCancelable(e: Event | any) {
  return !!(e && (e.cancelable === true || e?.nativeEvent?.cancelable === true));
}

function safePreventDefault(e: Event | any) {
  if (isCancelable(e)) e.preventDefault();
}

export function useAnnotationController(args: {
  activeTab: "view" | "annotate";
  selectedTool: AnnotationTool | null;
  penColor?: "black" | "red" | "blue" | "green" | "yellow";
  penSize?: "small" | "medium" | "large";

  domRef: React.RefObject<HTMLDivElement>;
  artifactServiceRef: React.RefObject<PdfArtifactService | null>;

  annotations: Annotation[];
  setAnnotations: (next: Annotation[]) => void;
  commit: (next: Annotation[]) => void;

  // overlay metrics
  pdfScrollEl: HTMLDivElement | null;
  pdfScroll: { left: number; top: number };
  pdfContentOffset: { left: number; top: number };
  pageRects: PageRect[];

  getFirstVisiblePageIndex: () => number;
  getPageIndexFromClientPoint: (x: number, y: number) => number;
  getPageIndexFromCanvasPoint: (xCanvasPx: number, yCanvasPx: number) => number;
  getPageAtClientPoint: (
    xClient: number,
    yClient: number
  ) => { pageIndex: number; pageEl: HTMLDivElement | null; pageRect: DOMRect } | null;
  clientToCanvasPoint: (
    e: any,
    canvasEl: HTMLElement | null
  ) => { xCanvasPx: number; yCanvasPx: number };
  canvasToPageNormalized: (
    pageIndex: number,
    xCanvasPx: number,
    yCanvasPx: number
  ) => { x: number; y: number };
  clientToPageNormalized: (
    pageIndex: number,
    xClient: number,
    yClient: number
  ) => { x: number; y: number };
  getPointInPdfSpace: (x: number, y: number) => { x: number; y: number };
  getPointInPageSpace: (
    x: number,
    y: number,
    pageIndex: number
  ) => { x: number; y: number };

  scheduleNoteSaveDebounced: (a: Annotation, text: string) => void;
  saveNoteImmediate: (a: Annotation, forcedText?: string) => void;

  onRequestOpenImageModal?: (annotationId: string) => void;
}) {
  const {
    activeTab,
    selectedTool,
    penColor,
    penSize,
    domRef,
    artifactServiceRef,
    annotations,
    setAnnotations,
    commit,

    pdfScrollEl,
    pdfScroll,
    pdfContentOffset,
    pageRects,

    getFirstVisiblePageIndex,
    getPageIndexFromClientPoint,
    getPageIndexFromCanvasPoint,
    getPageAtClientPoint,
    clientToCanvasPoint,
    canvasToPageNormalized,
    clientToPageNormalized,
    getPointInPdfSpace,
    getPointInPageSpace,

    scheduleNoteSaveDebounced,
    saveNoteImmediate,

    onRequestOpenImageModal,
  } = args;

  const [isDrawing, setIsDrawing] = React.useState(false);
  const [drawingPath, setDrawingPath] = React.useState<
    { x: number; y: number }[]
  >([]);
  const drawingPageIdxRef = React.useRef<number | null>(null);
  const shapeDrawRef = React.useRef<{
    id: string;
    pageIdx: number;
    startNormX: number;
    startNormY: number;
    tool: "rect" | "circle";
    hasDrag: boolean;
  } | null>(null);

  const [editingAnnotationId, setEditingAnnotationId] = React.useState<
    string | null
  >(null);

  const [resizingAnnotationId, setResizingAnnotationId] = React.useState<
    string | null
  >(null);
  const resizeStartRef = React.useRef<ResizeStart | null>(null);

  const [draggingAnnotationId, setDraggingAnnotationId] = React.useState<
    string | null
  >(null);
  const dragStartRef = React.useRef<DragStart | null>(null);

  const [draggingNote, setDraggingNote] = React.useState<DragNoteState>(null);
  const prevTouchActionRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const el = domRef.current;
    if (!el) return;

    if (prevTouchActionRef.current === null) {
      prevTouchActionRef.current = el.style.touchAction;
    }

    el.style.touchAction =
      activeTab !== "view" ? ACTIVE_TOUCH_ACTION : INACTIVE_TOUCH_ACTION;

    return () => {
      const node = domRef.current;
      if (!node || prevTouchActionRef.current === null) return;
      node.style.touchAction = prevTouchActionRef.current;
    };
  }, [activeTab, domRef]);

  const getPagePointFromEvent = React.useCallback(
    (e: any, pageIdxOverride?: number) => {
      const root = domRef.current;
      if (!root) return null;

      const { xCanvasPx, yCanvasPx } = clientToCanvasPoint(e, root);
      const pageIdx =
        typeof pageIdxOverride === "number"
          ? pageIdxOverride
          : getPageIndexFromCanvasPoint(xCanvasPx, yCanvasPx);

      if (pageIdx < 0 || !pageRects[pageIdx]) return null;

      const pr = pageRects[pageIdx];
      const norm = canvasToPageNormalized(pageIdx, xCanvasPx, yCanvasPx);
      return {
        pageIdx,
        pr,
        normX: norm.x,
        normY: norm.y,
        localX: xCanvasPx - pr.left,
        localY: yCanvasPx - pr.top,
      };
    },
    [
      domRef,
      clientToCanvasPoint,
      getPageIndexFromCanvasPoint,
      canvasToPageNormalized,
      pageRects,
    ]
  );

  const toPdfSpace = React.useCallback(
    (pageIdx: number, normX: number, normY: number) => {
      const pr = pageRects[pageIdx];
      if (!pr) return { absX: 0, absY: 0 };

      const pageLeftPdf = pr.left - pdfContentOffset.left + pdfScroll.left;
      const pageTopPdf = pr.top - pdfContentOffset.top + pdfScroll.top;

      return {
        absX: pageLeftPdf + normX * pr.width,
        absY: pageTopPdf + normY * pr.height,
      };
    },
    [pageRects, pdfContentOffset, pdfScroll]
  );

  // Persist image marker metadata (pin) - single write
  const persistImageAnnotation = React.useCallback(
    (ann?: Annotation) => {
      if (!ann || ann.type !== "image" || !ann.page) return;
      const svc = artifactServiceRef.current;
      if (!svc) return;

      const normX =
        typeof ann.normX === "number" ? ann.normX : ann.rect?.x;
      const normY =
        typeof ann.normY === "number" ? ann.normY : ann.rect?.y;
      const normW =
        typeof ann.normW === "number" ? ann.normW : ann.rect?.w;
      const normH =
        typeof ann.normH === "number" ? ann.normH : ann.rect?.h;

      let absX =
        typeof ann.x === "number" && Number.isFinite(ann.x) ? ann.x : undefined;
      let absY =
        typeof ann.y === "number" && Number.isFinite(ann.y) ? ann.y : undefined;

      if (
        (!Number.isFinite(absX) || !Number.isFinite(absY)) &&
        typeof normX === "number" &&
        typeof normY === "number"
      ) {
        const calc = toPdfSpace(ann.page - 1, normX, normY);
        absX = calc.absX;
        absY = calc.absY;
      }

      const imagePath = ann.images?.[0]?.url || "";
      const input: CameraPinInput = {
        id: ann.id,
        position: { x: absX || 0, y: absY || 0 },
        imagePath,
        createdAt: new Date(),
        note: ann.description || ann.content || "",
      };
      if (ann.displayMode === "expanded" || ann.displayMode === "icon") {
        input.displayMode = ann.displayMode;
      }

      if (typeof normX === "number") input.normX = normX;
      if (typeof normY === "number") input.normY = normY;
      if (typeof normW === "number") input.normW = normW;
      if (typeof normH === "number") input.normH = normH;
      if (ann.rect) input.rect = ann.rect;

      svc.saveCameraPin(ann.page, input).catch(() => undefined);
    },
    [artifactServiceRef, toPdfSpace]
  );

  const deleteAnnotation = React.useCallback(
    (id: string) => {
      const target = annotations.find((a) => a.id === id);
      const next = annotations.filter((a) => a.id !== id);
      commit(next);

      const svc = artifactServiceRef.current;
      if (!svc || !target?.page) return;

      if (target.type === "text" || target.type === "note") {
        svc.deleteNote(target.page, target.id).catch(() => undefined);
      } else if (target.type === "image") {
        svc.deleteCameraPin(target.page, target.id).catch(() => undefined);
      }
    },
    [annotations, commit, artifactServiceRef]
  );

  // NOTE: keep these legacy APIs if your ref expects them
  const addImageAnnotation = React.useCallback(
    (imageUrl: string, note: string) => {
      const trimmed = (note || "").trim();
      const pageIdx = getFirstVisiblePageIndex();
      const pr = pageRects[pageIdx] || ({} as any);
      const pWidth = pr.width || 900;
      const pHeight = pr.height || 600;

      const normW = 300 / Math.max(1, pWidth);
      const normH = 200 / Math.max(1, pHeight);
      const normX = 0.5 - 300 / 2 / Math.max(1, pWidth);
      const normY = 0.5 - 200 / 2 / Math.max(1, pHeight);

      const pageLeftPdf = pr.left - pdfContentOffset.left + pdfScroll.left;
      const pageTopPdf = pr.top - pdfContentOffset.top + pdfScroll.top;

      const absX = pageLeftPdf + normX * pWidth;
      const absY = pageTopPdf + normY * pHeight;

      const newAnnotation: ImageAnnotation = {
        id: makeId(),
        type: "image",
        x: absX,
        y: absY,
        width: 300,
        height: 200,
        images: [{ url: imageUrl, storageKey: imageUrl }],
        currentImageIndex: 0,
        content: trimmed,
        description: trimmed,
        noteRelX: 0.5,
        noteRelY: 0.5,
        page: pageIdx + 1,
        rect: { x: normX, y: normY, w: normW, h: normH },
        normX,
        normY,
        normW,
        normH,
        displayMode: "icon",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      commit([...annotations, newAnnotation]);
      persistImageAnnotation(newAnnotation);
    },
    [
      annotations,
      commit,
      getFirstVisiblePageIndex,
      pageRects,
      pdfContentOffset,
      pdfScroll,
      persistImageAnnotation,
    ]
  );

  const addMultipleImages = React.useCallback(
    (imageUrls: string[], note: string) => {
      const trimmed = (note || "").trim();
      if (!imageUrls?.length) return;

      const pageIdx = getFirstVisiblePageIndex();
      const pr = pageRects[pageIdx] || ({} as any);
      const pWidth = pr.width || 900;
      const pHeight = pr.height || 600;

      const baseNormX = 0.5 - 300 / 2 / Math.max(1, pWidth);
      const baseNormY = 0.5 - 200 / 2 / Math.max(1, pHeight);
      const baseNormW = 300 / Math.max(1, pWidth);
      const baseNormH = 200 / Math.max(1, pHeight);

      const pageLeftPdf = pr.left - pdfContentOffset.left + pdfScroll.left;
      const pageTopPdf = pr.top - pdfContentOffset.top + pdfScroll.top;

      const list: ImageAnnotation[] = imageUrls.map((url) => {
        const absX = pageLeftPdf + baseNormX * pWidth;
        const absY = pageTopPdf + baseNormY * pHeight;

        return {
          id: makeId(),
          type: "image",
          x: absX,
          y: absY,
          width: 300,
          height: 200,
          images: [{ url, storageKey: url }],
          currentImageIndex: 0,
          content: trimmed,
          description: trimmed,
          noteRelX: 0.5,
          noteRelY: 0.5,
          page: pageIdx + 1,
          rect: { x: baseNormX, y: baseNormY, w: baseNormW, h: baseNormH },
          normX: baseNormX,
          normY: baseNormY,
          normW: baseNormW,
          normH: baseNormH,
          displayMode: "icon",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
      });

      commit([...annotations, ...list]);
      list.forEach((img) => persistImageAnnotation(img));
    },
    [
      annotations,
      commit,
      getFirstVisiblePageIndex,
      pageRects,
      pdfContentOffset,
      pdfScroll,
      persistImageAnnotation,
    ]
  );

  const addImagesWithUpload = React.useCallback(
    async (files: File[], note: string) => {
      if (!files?.length) return;
      const svc = artifactServiceRef.current;
      if (!svc) return;

      const trimmed = (note || "").trim();
      const pageIdx = getFirstVisiblePageIndex();
      const pr =
        pageRects[pageIdx] ||
        ({ width: 900, height: 600, left: 0, top: 0 } as any);

      const pWidth = pr.width || 900;
      const pHeight = pr.height || 600;

      const normW = 300 / Math.max(1, pWidth);
      const normH = 200 / Math.max(1, pHeight);
      const normX = 0.5 - 300 / 2 / Math.max(1, pWidth);
      const normY = 0.5 - 200 / 2 / Math.max(1, pHeight);

      const pageLeftPdf = pr.left - pdfContentOffset.left + pdfScroll.left;
      const pageTopPdf = pr.top - pdfContentOffset.top + pdfScroll.top;

      const baseAbsX = pageLeftPdf + normX * pWidth;
      const baseAbsY = pageTopPdf + normY * pHeight;

      const next = [...annotations];

      for (const file of files) {
        const pinId = makeId();
        let remoteUrl = "";
        try {
          remoteUrl = await svc.uploadCameraImage(pageIdx + 1, pinId, file);
        } catch {
          continue;
        }

        const img: ImageAnnotation = {
          id: pinId,
          type: "image",
          x: baseAbsX,
          y: baseAbsY,
          width: 300,
          height: 200,
          images: [{ url: remoteUrl, storageKey: remoteUrl }],
          currentImageIndex: 0,
          content: trimmed,
          description: trimmed,
          noteRelX: 0.5,
          noteRelY: 0.5,
          page: pageIdx + 1,
          rect: { x: normX, y: normY, w: normW, h: normH },
          normX,
          normY,
          normW,
          normH,
          displayMode: "icon",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        next.push(img);

        // persist pin once
        const pin: CameraPinInput = {
          id: pinId,
          position: { x: normX, y: normY }, // normalized
          imagePath: remoteUrl,
          createdAt: new Date(),
          note: trimmed,
        };

        svc.saveCameraPin(pageIdx + 1, pin).catch(() => undefined);
      }

      commit(next);
    },
    [
      annotations,
      commit,
      artifactServiceRef,
      getFirstVisiblePageIndex,
      pageRects,
      pdfContentOffset,
      pdfScroll,
    ]
  );

  const addNoteAnnotation = React.useCallback(
    (text: string, x?: number, y?: number) => {
      const pageIdx = getFirstVisiblePageIndex();
      const pr = pageRects[pageIdx] || ({} as any);

      const pWidth = pr.width || 800;
      const pHeight = pr.height || 1000;

      const marginX = 60;
      const marginY = 100;

      const nxNorm = clamp01(
        (typeof x === "number" ? x : marginX) / Math.max(1, pWidth)
      );
      const nyNorm = clamp01(
        (typeof y === "number" ? y : marginY) / Math.max(1, pHeight)
      );

      const pageLeftPdf = pr.left - pdfContentOffset.left + pdfScroll.left;
      const pageTopPdf = pr.top - pdfContentOffset.top + pdfScroll.top;

      const absX = pageLeftPdf + nxNorm * pWidth;
      const absY = pageTopPdf + nyNorm * pHeight;

      const noteAnn: Annotation = {
        id: makeId(),
        type: "note",
        x: absX,
        y: absY,
        width: 200,
        height: 60,
        content: text || "",
        color: "#000000",
        isNew: !(text && text.trim().length > 0),
        page: pageIdx + 1,
        normX: nxNorm,
        normY: nyNorm,
        normW: 200 / Math.max(1, pWidth),
        normH: 60 / Math.max(1, pHeight),
      };

      commit([...annotations, noteAnn]);

      const svc = artifactServiceRef.current;
      if (svc) {
        const input: PdfNoteInput = {
          id: noteAnn.id,
          annType: 1,
          // keep as absolute for now (matches your current service usage)
          position: { x: noteAnn.x, y: noteAnn.y },
          text: noteAnn.content || "",
          color: noteAnn.color || "#000000",
          width: noteAnn.width || 200,
          height: noteAnn.height || 60,
        };
        svc.createNote(pageIdx + 1, input).catch(() => undefined);
      }
    },
    [
      annotations,
      commit,
      artifactServiceRef,
      getFirstVisiblePageIndex,
      pageRects,
      pdfContentOffset,
      pdfScroll,
    ]
  );

  const handleCanvasClick = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (activeTab === "view") return;
      if (isDrawing) return;
      if (!selectedTool) return;

      const target = e.target as Element | null;
      if (target?.closest?.('[data-annotation-root="true"]')) return;

      if (pdfScrollEl) {
        const r = pdfScrollEl.getBoundingClientRect();
        if (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        )
          return;
      }

      const hit = getPagePointFromEvent(e);

      // IMAGE MARKER (camera pin)
      if (selectedTool === "image") {
        // Resolve the actual page under the pointer (elementFromPoint -> page wrapper).
        const pageHit = getPageAtClientPoint(e.clientX, e.clientY);
        if (!pageHit) return;

        const pr = pageRects[pageHit.pageIndex];
        if (!pr) return;

        const normalized = clientToPageNormalized(
          pageHit.pageIndex,
          e.clientX,
          e.clientY
        );

        const markerSizePx = 32;
        const iconNormW = markerSizePx / Math.max(1, pr.width);
        const iconNormH = markerSizePx / Math.max(1, pr.height);

        const normW = 0.25;
        const normH = 0.2;

        const clampedX = Math.max(
          0,
          Math.min(1 - iconNormW, normalized.x - iconNormW / 2)
        );
        const clampedY = Math.max(
          0,
          Math.min(1 - iconNormH, normalized.y - iconNormH / 2)
        );

        const { absX, absY } = toPdfSpace(pageHit.pageIndex, clampedX, clampedY);

        const marker: ImageAnnotation = {
          id: makeId(),
          type: "image",
          page: pageHit.pageIndex + 1,
          images: [],
          description: "",
          content: "",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          x: absX,
          y: absY,
          width: normW * pr.width,
          height: normH * pr.height,
          normX: clampedX,
          normY: clampedY,
          normW,
          normH,
          rect: { x: clampedX, y: clampedY, w: normW, h: normH },
          displayMode: "icon",
        };

        if (process.env.NEXT_PUBLIC_DEBUG_PDF === "1") {
          const overlayRect =
            pageHit.pageEl?.querySelector("canvas")?.getBoundingClientRect() ??
            null;
          console.log({
            tool: selectedTool,
            clientX: e.clientX,
            clientY: e.clientY,
            pageIndex: pageHit.pageIndex,
            normalized,
            overlayRect,
            pageRect: pageHit.pageRect,
          });
        }

        commit([...annotations, marker]);
        persistImageAnnotation(marker);
        onRequestOpenImageModal?.(marker.id);
        return;
      }

      // TEXT
      if (selectedTool === "text") {
        const pageIdx =
          hit?.pageIdx ?? getFirstVisiblePageIndex();
        const resolved = hit ?? getPagePointFromEvent(e, pageIdx);
        if (!resolved) return;

        const { absX, absY } = toPdfSpace(
          resolved.pageIdx,
          resolved.normX,
          resolved.normY
        );

        const a: Annotation = {
          id: makeId(),
          type: "text",
          x: absX,
          y: absY,
          width: 120,
          height: 32,
          content: "",
          color: "#000000",
          isNew: true,
          page: resolved.pageIdx + 1,
          normX: resolved.normX,
          normY: resolved.normY,
          normW: 120 / Math.max(1, resolved.pr.width),
          normH: 32 / Math.max(1, resolved.pr.height),
        };

        commit([...annotations, a]);
        setEditingAnnotationId(a.id);

        const svc = artifactServiceRef.current;
        if (svc) {
          const input: PdfNoteInput = {
            id: a.id,
            annType: 0,
            position: { x: a.x, y: a.y },
            text: "",
            color: a.color || "#000000",
            width: a.width || 120,
            height: a.height || 32,
          };
          svc.createNote(a.page || 1, input).catch(() => undefined);
        }
        return;
      }

      // HIGHLIGHT
      if (selectedTool === "highlight") {
        const pageIdx =
          hit?.pageIdx ?? getFirstVisiblePageIndex();
        const resolved = hit ?? getPagePointFromEvent(e, pageIdx);
        if (!resolved) return;

        const { absX, absY } = toPdfSpace(
          resolved.pageIdx,
          resolved.normX,
          resolved.normY
        );

        commit([
          ...annotations,
          {
            id: makeId(),
            type: "highlight",
            x: absX,
            y: absY,
            width: 100,
            height: 20,
            color: "#4D91DB",
            page: resolved.pageIdx + 1,
            normX: resolved.normX,
            normY: resolved.normY,
            normW: 100 / Math.max(1, resolved.pr.width),
            normH: 20 / Math.max(1, resolved.pr.height),
          },
        ]);
        return;
      }

      // ERASER on draw paths (line hit)
      if (selectedTool === "eraser") {
        const { x, y } = getPointInPdfSpace(e.clientX, e.clientY);
        const hitIndex = annotations.findIndex(
          (a) => a.type === "draw" && isPointNearLine({ x, y }, a)
        );
        if (hitIndex !== -1) {
          const next = annotations.filter((_, idx) => idx !== hitIndex);
          commit(next);
        }
      }
    },
    [
      activeTab,
      isDrawing,
      selectedTool,
      annotations,
      commit,
      pdfScrollEl,
      getPointInPdfSpace,
      getPageIndexFromClientPoint,
      getPageAtClientPoint,
      getPagePointFromEvent,
      clientToPageNormalized,
      toPdfSpace,
      getFirstVisiblePageIndex,
      getPointInPageSpace,
      pageRects,
      artifactServiceRef,
      pdfContentOffset,
      pdfScroll,
      onRequestOpenImageModal,
      persistImageAnnotation,
    ]
  );

  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activeTab === "view") return;

      if (pdfScrollEl) {
        const r = pdfScrollEl.getBoundingClientRect();
        if (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        )
          return;
      }

      const rr = domRef.current?.getBoundingClientRect();
      if (!rr) return;

      const hitX = e.clientX - rr.left;
      const hitY = e.clientY - rr.top;

      const { x, y } = getPointInPdfSpace(e.clientX, e.clientY);

      if (selectedTool === "draw") {
        safePreventDefault(e);
        e.stopPropagation();
        try {
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
        } catch {}
        drawingPageIdxRef.current = getPageIndexFromClientPoint(
          e.clientX,
          e.clientY
        );
        setIsDrawing(true);
        setDrawingPath([{ x, y }]);
        return;
      }

      // SHAPE (rect/circle tools) - drag to size
      if (selectedTool === "rect" || selectedTool === "circle") {
        safePreventDefault(e);
        e.stopPropagation();
        try {
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
        } catch {}

        const hit = getPagePointFromEvent(e);
        if (!hit) return;

        const id = makeId();
        shapeDrawRef.current = {
          id,
          pageIdx: hit.pageIdx,
          startNormX: hit.normX,
          startNormY: hit.normY,
          tool: selectedTool,
          hasDrag: false,
        };

        const { absX, absY } = toPdfSpace(hit.pageIdx, hit.normX, hit.normY);

        setAnnotations([
          ...annotations,
          {
            id,
            type: "shape",
            shape: selectedTool,
            x: absX,
            y: absY,
            width: 1,
            height: 1,
            color: "#ff0000",
            page: hit.pageIdx + 1,
            normX: hit.normX,
            normY: hit.normY,
            normW: 0,
            normH: 0,
          },
        ]);

        return;
      }

      // Eraser deletes text/note/image (box hit)
      if (selectedTool === "eraser") {
        const clicked = annotations.find((a) => {
          if (!(a.type === "text" || a.type === "image" || a.type === "note"))
            return false;
          const box = getAnnotationScreenBox({
            a,
            pageRects,
            pdfContentOffset,
            pdfScroll,
          });
          return (
            hitX >= box.left &&
            hitX <= box.left + box.width &&
            hitY >= box.top &&
            hitY <= box.top + box.height
          );
        });

        if (clicked) {
          deleteAnnotation(clicked.id);
        }
        return;
      }

      // Resize handle
      const clickedResize = annotations.find((a) => {
        if (!(a.type === "text" || a.type === "note"))
          return false;
        const box = getAnnotationScreenBox({
          a,
          pageRects,
          pdfContentOffset,
          pdfScroll,
        });
        return (
          hitX >= box.left + box.width - 10 &&
          hitX <= box.left + box.width + 10 &&
          hitY >= box.top + box.height - 10 &&
          hitY <= box.top + box.height + 10
        );
      });

      if (clickedResize) {
        safePreventDefault(e);
        e.stopPropagation();
        try {
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
        } catch {}

        const pageIdx = ensurePageIdx(clickedResize.page);
        const pr = pageRects[pageIdx];
        if (!pr) return;

        const local = getPointInPageSpace(e.clientX, e.clientY, pageIdx);

        // compute base norm from existing data
        const baseNormX =
          typeof clickedResize.normX === "number"
            ? clickedResize.normX
            : isImageAnnotation(clickedResize) && clickedResize.rect
            ? clamp01(clickedResize.rect.x)
            : 0;

        const baseNormY =
          typeof clickedResize.normY === "number"
            ? clickedResize.normY
            : isImageAnnotation(clickedResize) && clickedResize.rect
            ? clamp01(clickedResize.rect.y)
            : 0;

        const baseNormW =
          typeof clickedResize.normW === "number"
            ? clickedResize.normW
            : isImageAnnotation(clickedResize) && clickedResize.rect
            ? clamp01(clickedResize.rect.w)
            : 0.12;

        const baseNormH =
          typeof clickedResize.normH === "number"
            ? clickedResize.normH
            : isImageAnnotation(clickedResize) && clickedResize.rect
            ? clamp01(clickedResize.rect.h)
            : 0.1;

        resizeStartRef.current = {
          pageIdx,
          startLocalX: local.x,
          startLocalY: local.y,
          baseNormX,
          baseNormY,
          baseNormW,
          baseNormH,
        };

        setResizingAnnotationId(clickedResize.id);
        return;
      }

      // Drag hit
      const clickedDrag = annotations.find((a) => {
        if (!(a.type === "text" || a.type === "note"))
          return false;
        const box = getAnnotationScreenBox({
          a,
          pageRects,
          pdfContentOffset,
          pdfScroll,
        });
        return (
          hitX >= box.left &&
          hitX <= box.left + box.width &&
          hitY >= box.top &&
          hitY <= box.top + box.height
        );
      });

      if (clickedDrag) {
        // If Text tool active, let inner area focus editing
        if (
          (clickedDrag.type === "text" || clickedDrag.type === "note") &&
          selectedTool === "text"
        ) {
          const box = getAnnotationScreenBox({
            a: clickedDrag,
            pageRects,
            pdfContentOffset,
            pdfScroll,
          });
          const inset = 12;
          const inEditArea =
            hitX >= box.left + inset &&
            hitX <= box.left + box.width - inset &&
            hitY >= box.top + inset &&
            hitY <= box.top + box.height - inset;
          if (inEditArea) return;
        }

        safePreventDefault(e);
        e.stopPropagation();
        try {
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
        } catch {}

        const pageIdx = ensurePageIdx(clickedDrag.page);
        const pr = pageRects[pageIdx];
        if (!pr) return;

        const local = getPointInPageSpace(e.clientX, e.clientY, pageIdx);

        // compute current left/top in px in page
        const normX = typeof clickedDrag.normX === "number" ? clickedDrag.normX : 0;
        const normY = typeof clickedDrag.normY === "number" ? clickedDrag.normY : 0;

        const annLeftPx = normX * Math.max(1, pr.width);
        const annTopPx = normY * Math.max(1, pr.height);

        dragStartRef.current = {
          pageIdx,
          offsetX: local.x - annLeftPx,
          offsetY: local.y - annTopPx,
        };

        setDraggingAnnotationId(clickedDrag.id);

        try {
          document.body.style.userSelect = "none";
        } catch {}
      }
    },
    [
      activeTab,
      selectedTool,
      annotations,
      pdfScrollEl,
      getPointInPdfSpace,
      domRef,
      getPageIndexFromClientPoint,
      pageRects,
      pdfContentOffset,
      pdfScroll,
      getPointInPageSpace,
      deleteAnnotation,
      getPagePointFromEvent,
      toPdfSpace,
    ]
  );

  const handlePointerMove = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // drawing
      if (isDrawing) {
        safePreventDefault(e);
        const { x, y } = getPointInPdfSpace(e.clientX, e.clientY);
        setDrawingPath((prev) => [...prev, { x, y }]);
        return;
      }

      // shape drawing in progress
      if (shapeDrawRef.current) {
        safePreventDefault(e);
        const shapeState = shapeDrawRef.current;
        const hit = getPagePointFromEvent(e, shapeState.pageIdx);
        if (!hit) return;

        const minX = Math.min(shapeState.startNormX, hit.normX);
        const minY = Math.min(shapeState.startNormY, hit.normY);
        const normW = Math.abs(hit.normX - shapeState.startNormX);
        const normH = Math.abs(hit.normY - shapeState.startNormY);

        if (normW > 0.002 || normH > 0.002) {
          shapeState.hasDrag = true;
        }

        const clampedX = clamp01(minX);
        const clampedY = clamp01(minY);
        const clampedW = clamp01(normW);
        const clampedH = clamp01(normH);

        const { absX, absY } = toPdfSpace(
          shapeState.pageIdx,
          clampedX,
          clampedY
        );

        setAnnotations(
          annotations.map((a) =>
            a.id === shapeState.id
              ? {
                  ...a,
                  x: absX,
                  y: absY,
                  width: clampedW * hit.pr.width,
                  height: clampedH * hit.pr.height,
                  page: shapeState.pageIdx + 1,
                  normX: clampedX,
                  normY: clampedY,
                  normW: clampedW,
                  normH: clampedH,
                }
              : a
          )
        );
        return;
      }

      // resizing
      if (resizingAnnotationId && resizeStartRef.current) {
        safePreventDefault(e);
        const rs = resizeStartRef.current;

        const pr = pageRects[rs.pageIdx];
        if (!pr) return;

        const local = getPointInPageSpace(e.clientX, e.clientY, rs.pageIdx);

        const minPxW = 80;
        const minPxH = 50;

        const newPxW = Math.max(
          local.x - rs.startLocalX + rs.baseNormW * pr.width,
          minPxW
        );
        const newPxH = Math.max(
          local.y - rs.startLocalY + rs.baseNormH * pr.height,
          minPxH
        );

        const nextNormW = clamp01(newPxW / Math.max(1, pr.width));
        const nextNormH = clamp01(newPxH / Math.max(1, pr.height));

        const pageLeftPdf = pr.left - pdfContentOffset.left + pdfScroll.left;
        const pageTopPdf = pr.top - pdfContentOffset.top + pdfScroll.top;

        const nextAbsX = pageLeftPdf + rs.baseNormX * pr.width;
        const nextAbsY = pageTopPdf + rs.baseNormY * pr.height;

        const updated = annotations.map((a) => {
          if (a.id !== resizingAnnotationId) return a;

          const result: any = {
            ...a,
            width: newPxW,
            height: newPxH,
            normW: nextNormW,
            normH: nextNormH,
            // keep stable top-left
            normX: rs.baseNormX,
            normY: rs.baseNormY,
            x: nextAbsX,
            y: nextAbsY,
          };

          if (a.type === "image") {
            result.rect = {
              ...(a.rect || {
                x: rs.baseNormX,
                y: rs.baseNormY,
                w: nextNormW,
                h: nextNormH,
              }),
              w: nextNormW,
              h: nextNormH,
            };
          }

          return result;
        });

        setAnnotations(updated);
        return;
      }

      // dragging annotation
      if (draggingAnnotationId && dragStartRef.current) {
        safePreventDefault(e);
        const ds = dragStartRef.current;

        const current = annotations.find((a) => a.id === draggingAnnotationId);
        if (!current) return;

        const pr = pageRects[ds.pageIdx] || pageRects[0];
        if (!pr) return;

        const local = getPointInPageSpace(e.clientX, e.clientY, ds.pageIdx);

        const pageWidth = Math.max(1, pr.width);
        const pageHeight = Math.max(1, pr.height);

        const normW =
          typeof current.normW === "number"
            ? current.normW
            : current.type === "image"
            ? current.rect?.w ?? 0.12
            : 0;

        const normH =
          typeof current.normH === "number"
            ? current.normH
            : current.type === "image"
            ? current.rect?.h ?? 0.1
            : 0;

        const rawLeft = local.x - ds.offsetX;
        const rawTop = local.y - ds.offsetY;

        let newNormX = clamp01(rawLeft / pageWidth);
        let newNormY = clamp01(rawTop / pageHeight);

        // keep inside page for images
        if (current.type === "image") {
          newNormX = Math.max(0, Math.min(1 - normW, newNormX));
          newNormY = Math.max(0, Math.min(1 - normH, newNormY));
        }

        const pageLeftPdf = pr.left - pdfContentOffset.left + pdfScroll.left;
        const pageTopPdf = pr.top - pdfContentOffset.top + pdfScroll.top;

        const absX = pageLeftPdf + newNormX * pageWidth;
        const absY = pageTopPdf + newNormY * pageHeight;
        


        const updated = annotations.map((a) =>
          a.id === current.id
            ? {
                ...a,
                page: ds.pageIdx + 1,
                normX: newNormX,
                normY: newNormY,
                x: absX,
                y: absY,
                ...(a.type === "image"
                  ? {
                      rect: {
                        ...(a.rect || {
                          x: newNormX,
                          y: newNormY,
                          w: normW,
                          h: normH,
                        }),
                        x: newNormX,
                        y: newNormY,
                        w: normW,
                        h: normH,
                      },
                    }
                  : {}),
              }
            : a
        );

        setAnnotations(updated);
        return;
      }

      // dragging note pin
      if (draggingNote) {
        safePreventDefault(e);

        const { rect, offsetX, offsetY, id } = draggingNote;
        const cx = e.clientX - rect.left - offsetX;
        const cy = e.clientY - rect.top - offsetY;

        const relX = clamp01(cx / Math.max(1, rect.width));
        const relY = clamp01(cy / Math.max(1, rect.height));

        const updated = annotations.map((a) => {
          if (a.id !== id) return a;

          const pageIndex = a.page ? a.page - 1 : 0;
          const pr = pageRects[pageIndex];
          if (!pr) return { ...a, noteRelX: relX, noteRelY: relY };

          const pageLeftPdf = pr.left - pdfContentOffset.left + pdfScroll.left;
          const pageTopPdf = pr.top - pdfContentOffset.top + pdfScroll.top;

          const absNoteX = pageLeftPdf + relX * Math.max(1, pr.width);
          const absNoteY = pageTopPdf + relY * Math.max(1, pr.height);

          return {
            ...a,
            noteRelX: relX,
            noteRelY: relY,
            noteAbsX: absNoteX,
            noteAbsY: absNoteY,
          };
        });

        setAnnotations(updated);
      }
    },
    [
      isDrawing,
      getPointInPdfSpace,
      getPagePointFromEvent,
      toPdfSpace,
      resizingAnnotationId,
      annotations,
      setAnnotations,
      draggingAnnotationId,
      pageRects,
      getPointInPageSpace,
      pdfContentOffset,
      pdfScroll,
      draggingNote,
    ]
  );

  const handlePointerUp = React.useCallback(() => {
    // finish shape drawing
    if (shapeDrawRef.current) {
      const shapeState = shapeDrawRef.current;
      const pr = pageRects[shapeState.pageIdx];
      if (pr) {
        const defaultPx = 50;
        const defaultNormW = defaultPx / Math.max(1, pr.width);
        const defaultNormH = defaultPx / Math.max(1, pr.height);

        const resolvedNormW = shapeState.hasDrag
          ? undefined
          : defaultNormW;
        const resolvedNormH = shapeState.hasDrag
          ? undefined
          : defaultNormH;

        const next = annotations.map((a) => {
          if (a.id !== shapeState.id) return a;

          if (shapeState.hasDrag) return a;

          const normX = Math.max(
            0,
            Math.min(1 - defaultNormW, shapeState.startNormX - defaultNormW / 2)
          );
          const normY = Math.max(
            0,
            Math.min(1 - defaultNormH, shapeState.startNormY - defaultNormH / 2)
          );

          const { absX, absY } = toPdfSpace(
            shapeState.pageIdx,
            normX,
            normY
          );

          return {
            ...a,
            x: absX,
            y: absY,
            width: defaultPx,
            height: defaultPx,
            page: shapeState.pageIdx + 1,
            normX,
            normY,
            normW: resolvedNormW,
            normH: resolvedNormH,
          };
        });

        commit(next);
      }

      shapeDrawRef.current = null;
      return;
    }

    // finish drawing -> commit + persist stroke ONCE
    if (isDrawing && drawingPath.length > 1) {
      const newAnnotation: Annotation = {
        id: makeId(),
        type: "draw",
        x: Math.min(...drawingPath.map((p) => p.x)),
        y: Math.min(...drawingPath.map((p) => p.y)),
        width:
          Math.max(...drawingPath.map((p) => p.x)) -
          Math.min(...drawingPath.map((p) => p.x)),
        height:
          Math.max(...drawingPath.map((p) => p.y)) -
          Math.min(...drawingPath.map((p) => p.y)),
        color:
          (penColor || "black") === "black" ? "#000000" : (penColor as any),
        pathData: drawingPath,
        penSize: penSize || "medium",
      };

      let pageIdx = drawingPageIdxRef.current ?? 0;
      if (pageIdx < 0 || pageIdx >= pageRects.length) pageIdx = 0;

      const pr = pageRects[pageIdx];
      if (pr) {
        const pageLeftPdf = pr.left - pdfContentOffset.left + pdfScroll.left;
        const pageTopPdf = pr.top - pdfContentOffset.top + pdfScroll.top;

        newAnnotation.page = pageIdx + 1;
        newAnnotation.pathDataNorm = drawingPath.map((p) => ({
          nx: (p.x - pageLeftPdf) / Math.max(1, pr.width),
          ny: (p.y - pageTopPdf) / Math.max(1, pr.height),
        }));

        const svc = artifactServiceRef.current;
        if (svc) {
          const strokeWidth =
            newAnnotation.penSize === "small"
              ? 2
              : newAnnotation.penSize === "large"
              ? 6
              : 4;
          const stroke: StrokeInput = {
            color: newAnnotation.color || "#000000",
            width: strokeWidth,
            toolType: 0,
            isEraser: false,
            points: drawingPath.map((p) => ({ x: p.x, y: p.y })),
            pressureValues: [],
          };
          svc.saveStroke(pageIdx + 1, stroke).catch(() => undefined);
        }
      }

      commit([...annotations, newAnnotation]);
      setDrawingPath([]);
      setIsDrawing(false);
      drawingPageIdxRef.current = null;
      return;
    }

    // resize end -> commit once + persist once
    if (resizingAnnotationId) {
      const resizedId = resizingAnnotationId;
      setResizingAnnotationId(null);
      resizeStartRef.current = null;
      commit(annotations);

      const updated = annotations.find((a) => a.id === resizedId);
      if (updated) {
        if (updated.type === "text" || updated.type === "note")
          saveNoteImmediate(updated);
        if (updated.type === "image") persistImageAnnotation(updated);
      }
    }

    // drag end -> commit once + persist once
    if (draggingAnnotationId) {
      const draggedId = draggingAnnotationId;
      setDraggingAnnotationId(null);
      dragStartRef.current = null;
      commit(annotations);

      try {
        document.body.style.userSelect = "";
      } catch {}

      const updated = annotations.find((a) => a.id === draggedId);
      if (updated) {
        if (updated.type === "text" || updated.type === "note")
          saveNoteImmediate(updated);
        if (updated.type === "image") persistImageAnnotation(updated);
      }
    }

    // note pin drag end
    if (draggingNote) {
      setDraggingNote(null);
      commit(annotations);
    }

    setIsDrawing(false);
  }, [
    isDrawing,
    drawingPath,
    annotations,
    commit,
    resizingAnnotationId,
    draggingAnnotationId,
    draggingNote,
    pageRects,
    pdfContentOffset,
    pdfScroll,
    penColor,
    penSize,
    saveNoteImmediate,
    persistImageAnnotation,
    artifactServiceRef,
    toPdfSpace,
  ]);

  return {
    // state
    isDrawing,
    drawingPath,
    editingAnnotationId,
    setEditingAnnotationId,
    resizingAnnotationId,
    draggingAnnotationId,
    draggingNote,
    setDraggingNote,

    // actions
    deleteAnnotation,
    addImageAnnotation,
    addMultipleImages,
    addImagesWithUpload,
    addNoteAnnotation,

    // handlers
    handleCanvasClick,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,

    // persistence helpers
    persistImageAnnotation,

    // note scheduling passthrough
    scheduleNoteSaveDebounced,
  };
}
