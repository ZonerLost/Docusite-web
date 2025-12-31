"use client";

import React from "react";

export default function DrawingOverlay(props: {
  drawingPath: { x: number; y: number }[];
  visible: boolean;
}) {
  const { drawingPath, visible } = props;
  if (!visible || drawingPath.length < 2) return null;

  const pathData = drawingPath.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    return `${path} L ${point.x} ${point.y}`;
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
