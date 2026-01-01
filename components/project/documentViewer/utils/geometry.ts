import type { Annotation, PageRect, PdfOffset, PdfScroll } from "../types";

export function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function getLeftTop(v: any) {
  const left = typeof v?.left === "number" ? v.left : typeof v?.x === "number" ? v.x : 0;
  const top = typeof v?.top === "number" ? v.top : typeof v?.y === "number" ? v.y : 0;
  return { left, top };
}

export function getAnnotationScreenBox(args: {
  a: Annotation;
  pageRects: PageRect[];
  pdfContentOffset: PdfOffset;
  pdfScroll: PdfScroll;
}): { left: number; top: number; width: number; height: number } {
  const { a, pageRects, pdfContentOffset, pdfScroll } = args;

  const { left: contentLeft, top: contentTop } = getLeftTop(pdfContentOffset);
  const { left: scrollLeft, top: scrollTop } = getLeftTop(pdfScroll);

  // ✅ Image annotations prefer rect/norm coordinates (stable on resize)
  if (a.type === "image" && a.page && pageRects[a.page - 1]) {
    const pr = pageRects[a.page - 1];

    const rect = a.rect ?? ({} as any);

    const normW =
      typeof rect.w === "number"
        ? rect.w
        : typeof a.normW === "number"
        ? a.normW
        : (a.width || 300) / Math.max(1, pr.width);

    const normH =
      typeof rect.h === "number"
        ? rect.h
        : typeof a.normH === "number"
        ? a.normH
        : (a.height || 200) / Math.max(1, pr.height);

    let normX =
      typeof rect.x === "number"
        ? rect.x
        : typeof a.normX === "number"
        ? a.normX
        : (a as any).xNorm;

    let normY =
      typeof rect.y === "number"
        ? rect.y
        : typeof a.normY === "number"
        ? a.normY
        : (a as any).yNorm;

    const hasAbs = typeof a.x === "number" && typeof a.y === "number";

    // ✅ Same fallback you do in ImageAnnotationLayer:
    // If rect/norm are missing OR (0,0 from legacy) and we have abs -> derive normalized
    const shouldFallbackFromAbs =
      hasAbs &&
      (typeof normX !== "number" ||
        typeof normY !== "number" ||
        (normX === 0 &&
          normY === 0 &&
          typeof a.normX !== "number" &&
          typeof a.normY !== "number" &&
          typeof rect.x !== "number" &&
          typeof rect.y !== "number"));

    if (shouldFallbackFromAbs) {
      const pageLeftPdf = pr.left - contentLeft + scrollLeft;
      const pageTopPdf = pr.top - contentTop + scrollTop;

      normX = (Number(a.x) - pageLeftPdf) / Math.max(1, pr.width);
      normY = (Number(a.y) - pageTopPdf) / Math.max(1, pr.height);
    }

    // Clamp inside page bounds
    const maxX = 1 - normW;
    const maxY = 1 - normH;

    const nx = Math.max(0, Math.min(maxX, clamp01(typeof normX === "number" ? normX : 0)));
    const ny = Math.max(0, Math.min(maxY, clamp01(typeof normY === "number" ? normY : 0)));

    const left = contentLeft + pr.left + nx * pr.width - scrollLeft;
    const top = contentTop + pr.top + ny * pr.height - scrollTop;

    return {
      left,
      top,
      width: normW * pr.width,
      height: normH * pr.height,
    };
  }

  // ✅ Normalized positioning for text/note/etc (if present)
  if (a.page && pageRects[a.page - 1] && typeof a.normX === "number" && typeof a.normY === "number") {
    const pr = pageRects[a.page - 1];

    const left = contentLeft + pr.left + a.normX * pr.width - scrollLeft;
    const top = contentTop + pr.top + a.normY * pr.height - scrollTop;

    const width = typeof a.normW === "number" ? a.normW * pr.width : a.width || 100;
    const height = typeof a.normH === "number" ? a.normH * pr.height : a.height || 30;

    return { left, top, width, height };
  }

  // ✅ Fallback (legacy absolute PDF-content space)
  return {
    left: contentLeft + (a.x || 0) - scrollLeft,
    top: contentTop + (a.y || 0) - scrollTop,
    width: a.width || (a.type === "text" ? 100 : 300),
    height: a.height || (a.type === "text" ? 30 : 200),
  };
}

export function isPointNearLine(
  point: { x: number; y: number },
  a: Annotation,
  threshold = 10
) {
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
