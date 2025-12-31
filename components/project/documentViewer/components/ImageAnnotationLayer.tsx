"use client";
import * as React from "react";
import { Camera } from "lucide-react";
import type { ImageAnnotation } from "../types";
import { clamp01 } from "../utils/geometry";

type Props = {
  annotations: ImageAnnotation[];
  pageRects: { left: number; top: number; width: number; height: number }[];
  pdfContentOffset: { x: number; y: number } | { left: number; top: number };
  pdfScroll: { x: number; y: number } | { left: number; top: number };
  exportMode?: boolean; // when exporting: hide camera icon, keep images
  onOpen: (id: string) => void;
};

export default function ImageAnnotationLayer({
  annotations,
  pageRects,
  pdfContentOffset,
  pdfScroll,
  exportMode = false,
  onOpen,
}: Props) {
  const contentOffsetLeft = "x" in pdfContentOffset ? pdfContentOffset.x : pdfContentOffset.left;
  const contentOffsetTop = "y" in pdfContentOffset ? pdfContentOffset.y : pdfContentOffset.top;
  const scrollLeft = "x" in pdfScroll ? pdfScroll.x : pdfScroll.left;
  const scrollTop = "y" in pdfScroll ? pdfScroll.y : pdfScroll.top;

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {annotations.map((a) => {
        const pageRect = pageRects[(a.page || 1) - 1];
        if (!pageRect) return null;

        const hasRect = !!a.rect && typeof a.rect.w === "number" && typeof a.rect.h === "number";
        const rect = hasRect ? a.rect! : { x: 0, y: 0, w: 0.12, h: 0.1 };
        const normW = typeof rect.w === "number" ? rect.w : typeof a.normW === "number" ? a.normW! : 0.12;
        const normH = typeof rect.h === "number" ? rect.h : typeof a.normH === "number" ? a.normH! : 0.1;

        let normX = typeof rect.x === "number" ? rect.x : typeof a.normX === "number" ? a.normX : undefined;
        let normY = typeof rect.y === "number" ? rect.y : typeof a.normY === "number" ? a.normY : undefined;

        const hasAbs = typeof a.x === "number" && typeof a.y === "number";
        const shouldFallbackFromAbs =
          hasAbs &&
          (typeof normX !== "number" ||
            typeof normY !== "number" ||
            (normX === 0 && normY === 0 && typeof a.normX !== "number" && typeof a.normY !== "number"));

        // Fallback: derive normalized coords from absolute pdf-space values
        if (shouldFallbackFromAbs && hasAbs) {
          const absX = a.x as number;
          const absY = a.y as number;
          const pageLeftPdf = pageRect.left - contentOffsetLeft + scrollLeft;
          const pageTopPdf = pageRect.top - contentOffsetTop + scrollTop;
          normX = (absX - pageLeftPdf) / Math.max(1, pageRect.width);
          normY = (absY - pageTopPdf) / Math.max(1, pageRect.height);
        }

        normX = typeof normX === "number" ? normX : 0;
        normY = typeof normY === "number" ? normY : 0;

        // Clamp within page bounds
        const maxX = 1 - normW;
        const maxY = 1 - normH;
        normX = Math.max(0, Math.min(maxX, clamp01(normX)));
        normY = Math.max(0, Math.min(maxY, clamp01(normY)));

        const left = contentOffsetLeft + pageRect.left + normX * pageRect.width - scrollLeft;
        const top = contentOffsetTop + pageRect.top + normY * pageRect.height - scrollTop;
        const w = normW * pageRect.width;
        const h = normH * pageRect.height;

        const hasImage = (a.images?.length || 0) > 0;
        const first = hasImage ? a.images[0] : null;

        return (
          <button
            key={a.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(a.id);
            }}
            className="pointer-events-auto absolute rounded-md"
            style={{ left, top, width: w, height: h }}
            title={hasImage ? "View image" : "Upload image"}
          >
            {/* During export: show image only, no icon */}
            {first ? (
              <img
                src={first.url}
                alt=""
                className="h-full w-full rounded-md object-cover border border-black/10"
                draggable={false}
              />
            ) : null}

            {!exportMode && (
              <span
                className={[
                  "absolute right-1 top-1 inline-flex items-center justify-center rounded-full",
                  "bg-white shadow border border-black/10",
                  "h-7 w-7 pdf-camera-ui",
                ].join(" ")}
              >
                <Camera className="h-4 w-4 text-black" />
              </span>
            )}

            {/* empty slot visual */}
            {!first && !exportMode && (
              <span className="absolute inset-0 rounded-md border-2 border-dashed border-gray-300 bg-white/40" />
            )}
          </button>
        );
      })}

      <style jsx global>{`
        @media print {
          .pdf-camera-ui {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
