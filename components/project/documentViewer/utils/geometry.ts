import type { Annotation, PageRect, PdfOffset, PdfScroll } from "../types";

export function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export function getAnnotationScreenBox(args: {
  a: Annotation;
  pageRects: PageRect[];
  pdfContentOffset: PdfOffset;
  pdfScroll: PdfScroll;
}): { left: number; top: number; width: number; height: number } {
  const { a, pageRects, pdfContentOffset, pdfScroll } = args;

  // Image annotations prefer normalized rect
  if (a.type === "image" && a.page && pageRects[a.page - 1]) {
    const pr = pageRects[a.page - 1];
    const rect = a.rect || {
      x: typeof a.normX === "number" ? a.normX : a.xNorm ?? 0,
      y: typeof a.normY === "number" ? a.normY : a.yNorm ?? 0,
      w: typeof a.normW === "number" ? a.normW : (a.width || 300) / Math.max(1, pr.width),
      h: typeof a.normH === "number" ? a.normH : (a.height || 200) / Math.max(1, pr.height),
    };

    const nx = typeof rect.x === "number" ? rect.x : 0;
    const ny = typeof rect.y === "number" ? rect.y : 0;
    const nw = typeof rect.w === "number" ? rect.w : (a.width || 300) / Math.max(1, pr.width);
    const nh = typeof rect.h === "number" ? rect.h : (a.height || 200) / Math.max(1, pr.height);

    return {
      left: pr.left + nx * pr.width,
      top: pr.top + ny * pr.height,
      width: nw * pr.width,
      height: nh * pr.height,
    };
  }

  // Preferred normalized positioning (stable on resize)
  if (
    a.page &&
    pageRects[a.page - 1] &&
    typeof a.normX === "number" &&
    typeof a.normY === "number"
  ) {
    const pr = pageRects[a.page - 1];
    const left = pr.left + a.normX * pr.width;
    const top = pr.top + a.normY * pr.height;
    const width = typeof a.normW === "number" ? a.normW * pr.width : a.width || 100;
    const height = typeof a.normH === "number" ? a.normH * pr.height : a.height || 30;
    return { left, top, width, height };
  }

  // Fallback (legacy absolute PDF-space)
  return {
    left: pdfContentOffset.left + (a.x || 0) - pdfScroll.left,
    top: pdfContentOffset.top + (a.y || 0) - pdfScroll.top,
    width: a.width || (a.type === "text" ? 100 : 300),
    height: a.height || (a.type === "text" ? 30 : 200),
  };
}

export function isPointNearLine(point: { x: number; y: number }, a: Annotation, threshold = 10) {
  if (a.type !== "draw" || !a.pathData || a.pathData.length < 2) return false;

  for (let i = 0; i < a.pathData.length - 1; i++) {
    const p1 = a.pathData[i];
    const p2 = a.pathData[i + 1];

    const A = point.x - p1.x;
    const B = point.y - p1.y;
    const C = p2.x - p1.x;
    const D = p2.y - p1.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;
    if (param < 0) {
      xx = p1.x;
      yy = p1.y;
    } else if (param > 1) {
      xx = p2.x;
      yy = p2.y;
    } else {
      xx = p1.x + param * C;
      yy = p1.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= threshold) return true;
  }

  return false;
}
