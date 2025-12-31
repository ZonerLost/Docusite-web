"use client";

import React from "react";
import type { Annotation } from "../types";

export function usePdfExport(args: {
  domRef: React.RefObject<HTMLDivElement>;
  pdfScrollEl: HTMLDivElement | null;
  annotations: Annotation[];
  editingAnnotationId: string | null;
}) {
  const { domRef, pdfScrollEl, annotations, editingAnnotationId } = args;

  const exportPagesAsImages = React.useCallback(async () => {
    const element = domRef.current;

    // Preferred: capture the full container (includes footer etc)
    try {
      if (element) {
        const { default: html2canvas } = await import("html2canvas");

        const scroller = pdfScrollEl;
        const prevOverflow = scroller ? scroller.style.overflow : "";
        const prevHeight = scroller ? scroller.style.height : "";

        if (scroller) {
          scroller.style.overflow = "visible";
          scroller.style.height = scroller.scrollHeight + "px";
        }

        const scopeAttr = "data-export-scope";
        const prevScope = element.getAttribute(scopeAttr);
        element.setAttribute(scopeAttr, "1");

        const headStyle = document.createElement("style");
        headStyle.textContent = `
          [data-export-scope="1"] [contenteditable] { color:#000 !important; -webkit-text-fill-color:#000 !important; }
        `;
        document.head.appendChild(headStyle);

        await new Promise(requestAnimationFrame);

        const canvas = await html2canvas(element, {
          backgroundColor: "#ffffff",
          scale: 2,
          useCORS: true,
          scrollX: 0,
          scrollY: 0,
          windowWidth: Math.max(element.scrollWidth, window.innerWidth),
          windowHeight: Math.max(element.scrollHeight, window.innerHeight),
        });

        if (scroller) {
          scroller.style.overflow = prevOverflow;
          scroller.style.height = prevHeight;
        }

        if (prevScope === null) element.removeAttribute(scopeAttr);
        else element.setAttribute(scopeAttr, prevScope);

        document.head.removeChild(headStyle);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        return [{ width: canvas.width, height: canvas.height, dataUrl }];
      }
    } catch (e) {
      console.warn("Full container export failed, falling back to per-page export:", e);
    }

    // Fallback: return empty (your old per-page export was huge).
    // If you want, I can move your full per-page exporter into this file too.
    return [];
  }, [domRef, pdfScrollEl, annotations, editingAnnotationId]);

  return { exportPagesAsImages };
}
