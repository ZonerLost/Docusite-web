// "use client";

// import React from "react";
// import type { Annotation } from "../types";

// export function usePdfExport(args: {
//   domRef: React.RefObject<HTMLDivElement>;
//   pdfScrollEl: HTMLDivElement | null;
//   annotations: Annotation[];
//   editingAnnotationId: string | null;
// }) {
//   const { domRef, pdfScrollEl, annotations, editingAnnotationId } = args;

//   const exportPagesAsImages = React.useCallback(async () => {
//     const element = domRef.current;

//     // Preferred: capture the full container (includes footer etc)
//     try {
//       if (element) {
//         const { default: html2canvas } = await import("html2canvas");

//         const scroller = pdfScrollEl;
//         const prevOverflow = scroller ? scroller.style.overflow : "";
//         const prevHeight = scroller ? scroller.style.height : "";

//         if (scroller) {
//           scroller.style.overflow = "visible";
//           scroller.style.height = scroller.scrollHeight + "px";
//         }

//         const scopeAttr = "data-export-scope";
//         const prevScope = element.getAttribute(scopeAttr);
//         element.setAttribute(scopeAttr, "1");

//         const headStyle = document.createElement("style");
//         headStyle.textContent = `
//           [data-export-scope="1"] [contenteditable] { color:#000 !important; -webkit-text-fill-color:#000 !important; }
//         `;
//         document.head.appendChild(headStyle);

//         await new Promise(requestAnimationFrame);

//         const canvas = await html2canvas(element, {
//           backgroundColor: "#ffffff",
//           scale: 2,
//           useCORS: true,
//           scrollX: 0,
//           scrollY: 0,
//           windowWidth: Math.max(element.scrollWidth, window.innerWidth),
//           windowHeight: Math.max(element.scrollHeight, window.innerHeight),
//         });

//         if (scroller) {
//           scroller.style.overflow = prevOverflow;
//           scroller.style.height = prevHeight;
//         }

//         if (prevScope === null) element.removeAttribute(scopeAttr);
//         else element.setAttribute(scopeAttr, prevScope);

//         document.head.removeChild(headStyle);

//         const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
//         return [{ width: canvas.width, height: canvas.height, dataUrl }];
//       }
//     } catch (e) {
//       console.warn("Full container export failed, falling back to per-page export:", e);
//     }

//     // Fallback: return empty (your old per-page export was huge).
//     // If you want, I can move your full per-page exporter into this file too.
//     return [];
//   }, [domRef, pdfScrollEl, annotations, editingAnnotationId]);

//   return { exportPagesAsImages };
// }



"use client";

import React from "react";
import type { Annotation } from "../types";

type ExportedImage = { width: number; height: number; dataUrl: string };

function raf() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

function uniqInDomOrder(nodes: HTMLElement[]): HTMLElement[] {
  const seen = new Set<HTMLElement>();
  const out: HTMLElement[] = [];
  for (const n of nodes) {
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

function findPdfPageElements(container: Element): HTMLElement[] {
  const selectors = [
    '[data-pdf-page="true"]', // ✅ your new wrapper in PdfInlineViewer
    "[data-page-number]",
    "[data-page-index]",
    ".react-pdf__Page",
    ".pdf-page",
    ".page",
  ];

  let candidates: HTMLElement[] = [];
  for (const sel of selectors) {
    const list = Array.from(container.querySelectorAll(sel)) as HTMLElement[];
    if (list.length) {
      candidates = list;
      break;
    }
  }

  if (!candidates.length) {
    const canvases = Array.from(container.querySelectorAll("canvas")) as HTMLCanvasElement[];
    candidates = canvases
      .map(
        (c) =>
          (c.closest(".react-pdf__Page") as HTMLElement | null) ||
          (c.parentElement as HTMLElement | null),
      )
      .filter(Boolean) as HTMLElement[];
  }

  candidates = candidates.filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 200 && r.height > 200;
  });

  return uniqInDomOrder(candidates);
}

function getPageNumberFromElement(el: HTMLElement, fallback: number): number {
  const dataNumber = el.getAttribute("data-page-number");
  if (dataNumber) {
    const parsed = Number.parseInt(dataNumber, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  const dataIndex = el.getAttribute("data-page-index");
  if (dataIndex) {
    const parsed = Number.parseInt(dataIndex, 10);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed + 1;
  }

  return fallback;
}

export function usePdfExport(args: {
  domRef: React.RefObject<HTMLDivElement>;
  pdfScrollEl: HTMLDivElement | null;
  annotations: Annotation[];
  editingAnnotationId: string | null;
}) {
  const { domRef, pdfScrollEl, annotations } = args;

  const exportPagesAsImages = React.useCallback(async (): Promise<ExportedImage[]> => {
    const root = domRef.current;
    if (!root) return [];

    const { default: html2canvas } = await import("html2canvas");

    const scroller = pdfScrollEl;

    const prevOverflow = scroller ? scroller.style.overflow : "";
    const prevHeight = scroller ? scroller.style.height : "";
    const prevScrollTop = scroller ? scroller.scrollTop : 0;
    const prevScrollLeft = scroller ? scroller.scrollLeft : 0;

    const scopeAttr = "data-export-scope";
    const prevScope = root.getAttribute(scopeAttr);

    const headStyle = document.createElement("style");
    headStyle.textContent = `
      [data-export-scope="1"] [data-no-export="1"] { display:none !important; }

      /* editor chrome */
      [data-export-scope="1"] button[title="Delete text box"],
      [data-export-scope="1"] button[title="Remove note"],
      [data-export-scope="1"] [title="Drag to resize"] { display:none !important; }

      /* contenteditable snapshot fix */
      [data-export-scope="1"] [contenteditable] {
        color:#000 !important;
        -webkit-text-fill-color:#000 !important;
        caret-color: transparent !important;
      }
    `;

    const ignoreElements = (el: Element) => {
      const h = el as HTMLElement;
      if (h.getAttribute?.("data-no-export") === "1") return true;
      if (h.getAttribute?.("role") === "dialog") return true;
      return false;
    };

    try {
      // Expand scroller so all pages exist in layout for correct rects
      if (scroller) {
        scroller.style.overflow = "visible";
        scroller.style.height = scroller.scrollHeight + "px";
        scroller.scrollTop = 0;
        scroller.scrollLeft = 0;
      }

      // Mark scope + inject export CSS
      root.setAttribute(scopeAttr, "1");
      document.head.appendChild(headStyle);

      // Let DocumentViewer exportMode + layout settle
      await raf();
      await raf();

      const containerForPages: Element = scroller || root;
      const pageEls = findPdfPageElements(containerForPages);

      // scale for sharp printing (but keep safe)
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const scale = Math.min(3, Math.max(2, dpr)); // ✅ good for printing

      // ✅ BEST: per-page crop from ROOT (captures overlays!)
      if (pageEls.length) {
        const out: ExportedImage[] = [];
        const rootRect = root.getBoundingClientRect();

        for (let index = 0; index < pageEls.length; index++) {
          const pageEl = pageEls[index];
          await raf();

          const pr = pageEl.getBoundingClientRect();

          const cropX = Math.max(0, pr.left - rootRect.left);
          const cropY = Math.max(0, pr.top - rootRect.top);
          const cropW = Math.max(1, pr.width);
          const cropH = Math.max(1, pr.height);

          const canvas = await html2canvas(root, {
            backgroundColor: "#ffffff",
            scale,
            useCORS: true,
            allowTaint: false,
            scrollX: 0,
            scrollY: 0,
            ignoreElements,

            // ✅ crop region
            x: cropX,
            y: cropY,
            width: cropW,
            height: cropH,

            // keep stable sizing even if viewport is smaller
            windowWidth: Math.max(root.scrollWidth, window.innerWidth),
            windowHeight: Math.max(root.scrollHeight, window.innerHeight),
          });

          const dataUrl = canvas.toDataURL("image/png"); // sharper than jpeg
          out.push({ width: canvas.width, height: canvas.height, dataUrl });
        }

        return out;
      }

      // Fallback: full container snapshot
      const canvas = await html2canvas(root, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        allowTaint: false,
        scrollX: 0,
        scrollY: 0,
        ignoreElements,
        windowWidth: Math.max(root.scrollWidth, window.innerWidth),
        windowHeight: Math.max(root.scrollHeight, window.innerHeight),
      });

      return [{ width: canvas.width, height: canvas.height, dataUrl: canvas.toDataURL("image/png") }];
    } catch (e) {
      console.warn("Export failed:", e);
      return [];
    } finally {
      // restore scroller
      if (scroller) {
        scroller.style.overflow = prevOverflow;
        scroller.style.height = prevHeight;
        scroller.scrollTop = prevScrollTop;
        scroller.scrollLeft = prevScrollLeft;
      }

      // restore scope
      if (prevScope === null) root.removeAttribute(scopeAttr);
      else root.setAttribute(scopeAttr, prevScope);

      // cleanup style
      if (headStyle.parentNode) headStyle.parentNode.removeChild(headStyle);
    }
  }, [domRef, pdfScrollEl, annotations]);

  return { exportPagesAsImages };
}
