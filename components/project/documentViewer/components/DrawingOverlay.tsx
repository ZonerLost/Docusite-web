"use client";

import React from "react";
import type { PdfOffset, PdfScroll } from "../types";

type LeftTopLike = { left?: number; top?: number; x?: number; y?: number };

function getLeftTop(v: LeftTopLike | null | undefined) {
  const left = typeof v?.left === "number" ? v.left : typeof v?.x === "number" ? v.x : 0;
  const top = typeof v?.top === "number" ? v.top : typeof v?.y === "number" ? v.y : 0;
  return { left, top };
}

export default function DrawingOverlay(props: {
  drawingPath: { x: number; y: number }[];
  visible: boolean;
  pdfContentOffset: PdfOffset | { x?: number; y?: number };
  pdfScroll: PdfScroll | { x?: number; y?: number };
}) {
  const { drawingPath, visible, pdfContentOffset, pdfScroll } = props;
  if (!visible || drawingPath.length < 2) return null;

  const { left: contentLeft, top: contentTop } = getLeftTop(pdfContentOffset);
  const { left: scrollLeft, top: scrollTop } = getLeftTop(pdfScroll);

  const pathData = drawingPath.reduce((path, point, index) => {
    const sx = contentLeft + point.x - scrollLeft;
    const sy = contentTop + point.y - scrollTop;
    if (index === 0) return `M ${sx} ${sy}`;
    return `${path} L ${sx} ${sy}`;
  }, "");

  return (
    <svg className="pointer-events-none absolute left-0 top-0 h-full w-full" style={{ zIndex: 10 }}>
      <path
        d={pathData}
        stroke="#000000"
        strokeWidth={4}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
