"use client";

import React from "react";
import type { PageRect, PdfOffset, PdfScroll } from "../types";

export function usePdfOverlayMetrics(domRef: React.RefObject<HTMLDivElement>) {
  const [pdfScrollEl, setPdfScrollEl] = React.useState<HTMLDivElement | null>(null);
  const [pdfScroll, setPdfScroll] = React.useState<PdfScroll>({ left: 0, top: 0 });
  const [pdfContentOffset, setPdfContentOffset] = React.useState<PdfOffset>({ left: 0, top: 0 });
  const [pageRects, setPageRects] = React.useState<PageRect[]>([]);

  const updatePageRects = React.useCallback(() => {
    const scroller = pdfScrollEl;
    const rootRect = domRef.current?.getBoundingClientRect();
    if (!scroller || !rootRect) {
      setPageRects([]);
      return;
    }

    const pages = Array.from(scroller.querySelectorAll(".react-pdf__Page")) as HTMLElement[];
    const rects = pages.map((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left - rootRect.left, top: r.top - rootRect.top, width: r.width, height: r.height };
    });
    setPageRects(rects);
  }, [pdfScrollEl, domRef]);

  React.useEffect(() => {
    if (!pdfScrollEl) return;

    const update = () => {
      const dr = domRef.current?.getBoundingClientRect();
      const firstPage = pdfScrollEl.querySelector(".react-pdf__Page") as HTMLElement | null;
      const pr = firstPage?.getBoundingClientRect();

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

  const getPageIndexFromClientPoint = React.useCallback(
    (clientX: number, clientY: number): number => {
      const rootRect = domRef.current?.getBoundingClientRect();
      if (!rootRect) return -1;

      for (let i = 0; i < pageRects.length; i++) {
        const pr = pageRects[i];
        const left = rootRect.left + pr.left;
        const top = rootRect.top + pr.top;
        if (clientX >= left && clientX <= left + pr.width && clientY >= top && clientY <= top + pr.height) {
          return i;
        }
      }
      return -1;
    },
    [pageRects, domRef],
  );

  const getFirstVisiblePageIndex = React.useCallback((): number => {
    const scroller = pdfScrollEl;
    const rootRect = domRef.current?.getBoundingClientRect();
    if (!scroller || !rootRect || pageRects.length === 0) return 0;

    const sR = scroller.getBoundingClientRect();
    for (let i = 0; i < pageRects.length; i++) {
      const pr = pageRects[i];
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
      const rootRect = domRef.current?.getBoundingClientRect();
      if (!rootRect || !pageRects[pageIndex]) return { x: 0, y: 0 };

      const pr = pageRects[pageIndex];
      const left = rootRect.left + pr.left;
      const top = rootRect.top + pr.top;
      return { x: clientX - left, y: clientY - top };
    },
    [pageRects, domRef],
  );

  return {
    pdfScrollEl,
    setPdfScrollEl,
    pdfScroll,
    pdfContentOffset,
    pageRects,
    updatePageRects,

    getPageIndexFromClientPoint,
    getFirstVisiblePageIndex,
    getPointInPdfSpace,
    getPointInPageSpace,
  };
}
