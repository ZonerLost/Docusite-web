"use client";

import React from "react";
import type { PageRect, PdfOffset, PdfScroll } from "../types";

type ClientPoint = { xClient: number; yClient: number };

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function getClientPoint(e: any): ClientPoint {
  const touch = e?.touches?.[0] || e?.changedTouches?.[0];
  if (touch) {
    return { xClient: Number(touch.clientX || 0), yClient: Number(touch.clientY || 0) };
  }
  return { xClient: Number(e?.clientX || 0), yClient: Number(e?.clientY || 0) };
}

export function usePdfOverlayMetrics(domRef: React.RefObject<HTMLDivElement>) {
  const [pdfScrollEl, setPdfScrollEl] = React.useState<HTMLDivElement | null>(null);
  const [pdfScroll, setPdfScroll] = React.useState<PdfScroll>({ left: 0, top: 0 });
  const [pdfContentOffset, setPdfContentOffset] = React.useState<PdfOffset>({ left: 0, top: 0 });
  const [pageRects, setPageRects] = React.useState<PageRect[]>([]);
  const pageRefs = React.useRef<Record<number, HTMLDivElement | null>>({});
  const overlayRefs = React.useRef<Record<number, HTMLCanvasElement | null>>({});

  const updatePageRects = React.useCallback(() => {
    const scroller = pdfScrollEl;
    const rootRect = domRef.current?.getBoundingClientRect();
    if (!scroller || !rootRect) {
      setPageRects([]);
      pageRefs.current = {};
      overlayRefs.current = {};
      return;
    }

    // Map each page wrapper to its canvas rect so hit-testing stays page-accurate while scrolling.
    const wrappers = Array.from(scroller.querySelectorAll("[data-page-index]")) as HTMLDivElement[];
    const nextPageRefs: Record<number, HTMLDivElement | null> = {};
    const nextOverlayRefs: Record<number, HTMLCanvasElement | null> = {};
    const rects: PageRect[] = [];

    wrappers.forEach((wrapper, fallbackIdx) => {
      const rawIdx = wrapper.dataset.pageIndex;
      const pageIndex = rawIdx ? Number(rawIdx) : fallbackIdx;
      if (!Number.isFinite(pageIndex) || pageIndex < 0) return;

      nextPageRefs[pageIndex] = wrapper;

      const pageEl = wrapper.querySelector(".react-pdf__Page") as HTMLElement | null;
      const canvasEl = wrapper.querySelector("canvas") as HTMLCanvasElement | null;
      const rectSource = canvasEl || pageEl || wrapper;
      const r = rectSource.getBoundingClientRect();

      rects[pageIndex] = { left: r.left - rootRect.left, top: r.top - rootRect.top, width: r.width, height: r.height };

      if (canvasEl) nextOverlayRefs[pageIndex] = canvasEl;
    });

    pageRefs.current = nextPageRefs;
    overlayRefs.current = nextOverlayRefs;
    setPageRects(rects);
  }, [pdfScrollEl, domRef]);

  React.useEffect(() => {
    if (!pdfScrollEl) return;

    const update = () => {
      const dr = domRef.current?.getBoundingClientRect();
      const firstWrapper = pdfScrollEl.querySelector('[data-page-index="0"]') as HTMLElement | null;
      const firstPage =
        (firstWrapper?.querySelector(".react-pdf__Page") as HTMLElement | null) ||
        (pdfScrollEl.querySelector(".react-pdf__Page") as HTMLElement | null);
      const firstCanvas = firstWrapper?.querySelector("canvas") as HTMLElement | null;
      const rectSource = firstCanvas || firstPage || firstWrapper;
      const pr = rectSource?.getBoundingClientRect();

      if (dr && pr) setPdfContentOffset({ left: pr.left - dr.left, top: pr.top - dr.top });

      setPdfScroll({ left: pdfScrollEl.scrollLeft, top: pdfScrollEl.scrollTop });
      updatePageRects();
    };

    update();

    pdfScrollEl.addEventListener("scroll", update, { passive: true } as any);
    window.addEventListener("resize", update);

    const mo = new MutationObserver(() => updatePageRects());
    mo.observe(pdfScrollEl, { childList: true, subtree: true });

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => update()) : null;
    ro?.observe(pdfScrollEl);

    return () => {
      pdfScrollEl.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      mo.disconnect();
      ro?.disconnect();
    };
  }, [pdfScrollEl, domRef, updatePageRects]);

  // Coordinate reference: domRef (overlay container that receives pointer events).
  // Scroll container: pdfScrollEl (react-pdf scroller) via pageRects + pdfScroll offsets.
  const clientToCanvasPoint = React.useCallback(
    (e: any, canvasEl: HTMLElement | null) => {
      const { xClient, yClient } = getClientPoint(e);
      if (!canvasEl) return { xCanvasPx: xClient, yCanvasPx: yClient };

      const rect = canvasEl.getBoundingClientRect();
      let x = xClient - rect.left;
      let y = yClient - rect.top;

      if (canvasEl instanceof HTMLCanvasElement) {
        const scaleX = rect.width ? canvasEl.width / rect.width : 1;
        const scaleY = rect.height ? canvasEl.height / rect.height : 1;
        x *= scaleX;
        y *= scaleY;
      }

      return { xCanvasPx: x, yCanvasPx: y };
    },
    [],
  );

  const getPageIndexFromCanvasPoint = React.useCallback(
    (xCanvasPx: number, yCanvasPx: number): number => {
      for (let i = 0; i < pageRects.length; i++) {
        const pr = pageRects[i];
        if (!pr) continue;
        if (
          xCanvasPx >= pr.left &&
          xCanvasPx <= pr.left + pr.width &&
          yCanvasPx >= pr.top &&
          yCanvasPx <= pr.top + pr.height
        ) {
          return i;
        }
      }
      return -1;
    },
    [pageRects],
  );

  const canvasToPageNormalized = React.useCallback(
    (pageIndex: number, xCanvasPx: number, yCanvasPx: number) => {
      const pr = pageRects[pageIndex];
      if (!pr || pr.width <= 0 || pr.height <= 0) return { x: 0, y: 0 };

      const localX = xCanvasPx - pr.left;
      const localY = yCanvasPx - pr.top;

      return {
        x: clamp01(localX / Math.max(1, pr.width)),
        y: clamp01(localY / Math.max(1, pr.height)),
      };
    },
    [pageRects],
  );

  const getFirstVisiblePageIndex = React.useCallback((): number => {
    const scroller = pdfScrollEl;
    const rootRect = domRef.current?.getBoundingClientRect();
    if (!scroller || !rootRect || pageRects.length === 0) return 0;

    const sR = scroller.getBoundingClientRect();
    for (let i = 0; i < pageRects.length; i++) {
      const pr = pageRects[i];
      if (!pr) continue;
      const top = rootRect.top + pr.top;
      const bottom = top + pr.height;
      if (bottom > sR.top && top < sR.bottom) return i;
    }
    return 0;
  }, [pdfScrollEl, pageRects, domRef]);

  const getPointInPdfSpace = React.useCallback(
    (clientX: number, clientY: number) => {
      const scroller = pdfScrollEl;
      if (scroller) {
        const firstPage = scroller.querySelector(".react-pdf__Page") as HTMLElement | null;
        const pr = firstPage?.getBoundingClientRect();
        const sr = scroller.getBoundingClientRect();

        if (pr) {
          return { x: scroller.scrollLeft + (clientX - pr.left), y: scroller.scrollTop + (clientY - pr.top) };
        }
        return { x: scroller.scrollLeft + (clientX - sr.left), y: scroller.scrollTop + (clientY - sr.top) };
      }

      const rect = domRef.current?.getBoundingClientRect();
      return { x: clientX - (rect?.left || 0), y: clientY - (rect?.top || 0) };
    },
    [pdfScrollEl, domRef],
  );

  const getPointInPageSpace = React.useCallback(
    (clientX: number, clientY: number, pageIndex: number) => {
      const root = domRef.current;
      if (!root || !pageRects[pageIndex]) return { x: 0, y: 0 };
      const { xCanvasPx, yCanvasPx } = clientToCanvasPoint({ clientX, clientY }, root);
      const pr = pageRects[pageIndex];
      return { x: xCanvasPx - pr.left, y: yCanvasPx - pr.top };
    },
    [pageRects, domRef, clientToCanvasPoint],
  );

  const getPageAtClientPoint = React.useCallback(
    (xClient: number, yClient: number) => {
      const root = domRef.current;
      if (!root || typeof document === "undefined") return null;

      // Prefer the actual page wrapper under the pointer; fall back to rect math for overlay clicks.
      const hit = document.elementFromPoint(xClient, yClient);
      const pageEl = (hit?.closest?.("[data-page-index]") as HTMLDivElement | null) ?? null;
      if (pageEl) {
        const rawIdx = pageEl.dataset.pageIndex;
        const pageIndex = rawIdx ? Number(rawIdx) : -1;
        if (Number.isFinite(pageIndex) && pageIndex >= 0) {
          return { pageIndex, pageEl, pageRect: pageEl.getBoundingClientRect() };
        }
      }

      const { xCanvasPx, yCanvasPx } = clientToCanvasPoint({ clientX: xClient, clientY: yClient }, root);
      const pageIndex = getPageIndexFromCanvasPoint(xCanvasPx, yCanvasPx);
      if (pageIndex < 0) return null;

      const fallbackEl = pageRefs.current[pageIndex] ?? null;
      const rootRect = root.getBoundingClientRect();
      const pr = pageRects[pageIndex];
      const pageRect =
        pr
          ? new DOMRect(rootRect.left + pr.left, rootRect.top + pr.top, pr.width, pr.height)
          : fallbackEl
            ? fallbackEl.getBoundingClientRect()
            : new DOMRect(rootRect.left, rootRect.top, 0, 0);

      return { pageIndex, pageEl: fallbackEl, pageRect };
    },
    [domRef, clientToCanvasPoint, getPageIndexFromCanvasPoint, pageRects],
  );

  const clientToPageNormalized = React.useCallback(
    (pageIndex: number, xClient: number, yClient: number) => {
      const pageEl = pageRefs.current[pageIndex] ?? null;
      const canvasEl =
        overlayRefs.current[pageIndex] ??
        (pageEl?.querySelector("canvas") as HTMLCanvasElement | null);

      if (canvasEl) {
        const rect = canvasEl.getBoundingClientRect();
        const localX = xClient - rect.left;
        const localY = yClient - rect.top;
        return {
          x: clamp01(localX / Math.max(1, rect.width)),
          y: clamp01(localY / Math.max(1, rect.height)),
        };
      }

      if (pageEl) {
        const rect = pageEl.getBoundingClientRect();
        const localX = xClient - rect.left;
        const localY = yClient - rect.top;
        return {
          x: clamp01(localX / Math.max(1, rect.width)),
          y: clamp01(localY / Math.max(1, rect.height)),
        };
      }

      const root = domRef.current;
      if (!root) return { x: 0, y: 0 };
      const { xCanvasPx, yCanvasPx } = clientToCanvasPoint(
        { clientX: xClient, clientY: yClient },
        root
      );
      return canvasToPageNormalized(pageIndex, xCanvasPx, yCanvasPx);
    },
    [domRef, clientToCanvasPoint, canvasToPageNormalized],
  );

  const getPageIndexFromClientPoint = React.useCallback(
    (clientX: number, clientY: number): number => {
      const root = domRef.current;
      if (!root) return -1;
      const pageHit = getPageAtClientPoint(clientX, clientY);
      if (pageHit) return pageHit.pageIndex;
      const { xCanvasPx, yCanvasPx } = clientToCanvasPoint(
        { clientX, clientY },
        root
      );
      return getPageIndexFromCanvasPoint(xCanvasPx, yCanvasPx);
    },
    [domRef, clientToCanvasPoint, getPageIndexFromCanvasPoint, getPageAtClientPoint],
  );

  return {
    pdfScrollEl,
    setPdfScrollEl,
    pdfScroll,
    pdfContentOffset,
    pageRects,
    updatePageRects,

    getClientPoint,
    clientToCanvasPoint,
    getPageIndexFromCanvasPoint,
    canvasToPageNormalized,
    getPageIndexFromClientPoint,
    getPageAtClientPoint,
    clientToPageNormalized,
    getFirstVisiblePageIndex,
    getPointInPdfSpace,
    getPointInPageSpace,
  };
}
