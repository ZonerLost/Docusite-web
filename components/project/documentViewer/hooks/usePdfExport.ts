"use client";

import React from "react";
import type { Annotation } from "../types";

type ExportedImage = { width: number; height: number; dataUrl: string };
const EXPORT_IMAGE_TYPE = "image/jpeg";
const EXPORT_IMAGE_QUALITY = 0.85;
const DEBUG = process.env.NEXT_PUBLIC_DEBUG_PDF === "1";

function raf() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(blob);
  });
}

function isDataUrl(src: string) {
  return src.startsWith("data:");
}

function getUrl(src: string) {
  try {
    return new URL(src, window.location.href);
  } catch {
    return null;
  }
}

async function inlineExportImages(root: Element) {
  const imgs = Array.from(root.querySelectorAll("img")) as HTMLImageElement[];
  const inlined: Array<{ el: HTMLImageElement; src: string; srcset: string | null }> = [];

  for (const img of imgs) {
    const rawSrc = (img.getAttribute("src") || "").trim();
    if (!rawSrc) continue;
    if (isDataUrl(rawSrc)) continue;

    const url = getUrl(rawSrc);
    const isSameOrigin = !!url && url.origin === window.location.origin;
    const isApi = !!url && isSameOrigin && url.pathname.startsWith("/api/");
    // Requirement: inline if same-origin protected (/api/...) OR not a data: URL.
    if (!isApi && isDataUrl(rawSrc)) continue;

    try {
      const resp = await fetch(url ? url.toString() : rawSrc, {
        credentials: isSameOrigin ? "include" : "omit",
      });
      if (!resp.ok) {
        if (DEBUG) {
          console.warn("[export] image inline failed", {
            src: rawSrc,
            status: resp.status,
          });
        }
        continue;
      }
      const blob = await resp.blob();
      const dataUrl = await blobToDataUrl(blob);

      const origSrcset = img.getAttribute("srcset");
      img.setAttribute("data-orig-src", rawSrc);
      if (origSrcset) img.setAttribute("data-orig-srcset", origSrcset);
      img.src = dataUrl;
      if (origSrcset) img.removeAttribute("srcset");

      inlined.push({ el: img, src: rawSrc, srcset: origSrcset });
      if (DEBUG) {
        console.log("[export] inlined image", { src: rawSrc, bytes: blob.size });
      }
      if (typeof img.decode === "function") {
        try {
          await img.decode();
        } catch {}
      }
    } catch (err: any) {
      if (DEBUG) {
        console.warn("[export] image inline failed", {
          src: rawSrc,
          error: err?.message || String(err),
        });
      }
    }
  }

  return inlined;
}

function restoreInlinedImages(inlined: Array<{ el: HTMLImageElement; src: string; srcset: string | null }>) {
  for (const item of inlined) {
    const { el, src, srcset } = item;
    try {
      el.src = src;
      if (srcset) el.setAttribute("srcset", srcset);
      else el.removeAttribute("srcset");
      el.removeAttribute("data-orig-src");
      el.removeAttribute("data-orig-srcset");
    } catch {}
  }
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
  exportRootRef?: React.RefObject<HTMLDivElement>;
  exportScrollEl?: HTMLDivElement | null;
  annotations: Annotation[];
  editingAnnotationId: string | null;
}) {
  const { domRef, pdfScrollEl, exportRootRef, exportScrollEl, annotations } = args;

  const exportPagesAsImages = React.useCallback(async (): Promise<ExportedImage[]> => {
    const root = exportRootRef?.current || domRef.current;
    if (!root) return [];

    const { default: html2canvas } = await import("html2canvas");

    const scroller = exportRootRef?.current ? exportScrollEl : pdfScrollEl;

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

    let inlined: Array<{ el: HTMLImageElement; src: string; srcset: string | null }> = [];
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

      // Inline protected or non-data images to avoid auth/CORS failures during html2canvas capture
      inlined = await inlineExportImages(root);

      // Let DocumentViewer exportMode + layout settle
      await raf();
      await raf();

      const exportPages = Array.from(
        root.querySelectorAll('[data-export-page="true"]')
      ) as HTMLElement[];
      const containerForPages: Element = scroller || root;
      const pageEls = exportPages.length
        ? uniqInDomOrder(exportPages)
        : findPdfPageElements(containerForPages);
      if (!pageEls.length) {
        console.warn("[export] no PDF page wrappers found for capture");
      }

      // scale for sharp printing (but keep safe)
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const scale = Math.min(3, Math.max(2, dpr));

      // capture each page wrapper
      if (pageEls.length) {
        const out: ExportedImage[] = [];

        for (let index = 0; index < pageEls.length; index++) {
          const pageEl = pageEls[index];
          await raf();

          const canvas = await html2canvas(pageEl, {
            backgroundColor: "#ffffff",
            scale,
            useCORS: true,
            allowTaint: false,
            scrollX: 0,
            scrollY: 0,
            ignoreElements,
          });

          // JPEG keeps payload smaller while remaining crisp enough for export.
          const dataUrl = canvas.toDataURL(EXPORT_IMAGE_TYPE, EXPORT_IMAGE_QUALITY);
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

      return [
        {
          width: canvas.width,
          height: canvas.height,
          dataUrl: canvas.toDataURL(EXPORT_IMAGE_TYPE, EXPORT_IMAGE_QUALITY),
        },
      ];
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

      // restore inlined images
      if (inlined.length) restoreInlinedImages(inlined);

      // cleanup style
      if (headStyle.parentNode) headStyle.parentNode.removeChild(headStyle);
    }
  }, [domRef, pdfScrollEl, exportRootRef, exportScrollEl, annotations]);

  return { exportPagesAsImages };
}
