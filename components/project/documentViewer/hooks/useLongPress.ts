"use client";

import * as React from "react";

export function useLongPress(opts: {
  delayMs?: number;
  onLongPress: (pos: { x: number; y: number }) => void;
}) {
  const { delayMs = 550, onLongPress } = opts;
  const timerRef = React.useRef<number | null>(null);
  const posRef = React.useRef<{ x: number; y: number } | null>(null);

  const clear = React.useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    posRef.current = null;
  }, []);

  const onPointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY };
      timerRef.current = window.setTimeout(() => {
        if (posRef.current) onLongPress(posRef.current);
      }, delayMs);
    },
    [delayMs, onLongPress],
  );

  const onPointerUp = clear;
  const onPointerLeave = clear;

  React.useEffect(() => clear, [clear]);

  return { onPointerDown, onPointerUp, onPointerLeave };
}
