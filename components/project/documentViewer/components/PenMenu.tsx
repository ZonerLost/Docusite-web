"use client";

import * as React from "react";
import { PEN_COLORS, PEN_SIZES } from "../constants";
import type { PenColor, PenSize } from "../types";
import { useClickOutside } from "@/hooks/useClickOutside";

type Props = {
  open: boolean;
  pos: { x: number; y: number };
  penColor: PenColor;
  penSize: PenSize;
  onChange: (cfg: { color?: PenColor; size?: PenSize }) => void;
  onClose: () => void;
};

export default function PenMenu({ open, pos, penColor, penSize, onChange, onClose }: Props) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  useClickOutside(ref, onClose, { enabled: open });

  const [style, setStyle] = React.useState<React.CSSProperties>({});

  React.useEffect(() => {
    if (!open) return;

    const clamp = () => {
      const margin = 8;
      const w = ref.current?.offsetWidth || 180;
      const h = ref.current?.offsetHeight || 140;
      let x = pos.x;
      let y = pos.y;

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (x + w + margin > vw) x = Math.max(margin, vw - w - margin);
      if (y + h + margin > vh) y = Math.max(margin, vh - h - margin);
      if (x < margin) x = margin;
      if (y < margin) y = margin;

      setStyle({ position: "fixed", left: x, top: y });
    };

    const id = window.setTimeout(clamp, 0);
    window.addEventListener("resize", clamp);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", clamp);
    };
  }, [open, pos.x, pos.y]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="fixed z-[100] w-44 rounded-lg border border-border-gray bg-white shadow-lg p-2"
      style={style}
    >
      <div className="mb-1 text-[11px] text-text-gray uppercase tracking-wide px-1">Color</div>
      <div className="flex flex-wrap gap-1 mb-2 px-1">
        {(Object.keys(PEN_COLORS) as PenColor[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange({ color: c })}
            className={[
              "px-2 py-1 rounded text-xs border",
              penColor === c
                ? "bg-action text-white border-action"
                : "bg-white text-black hover:bg-light-gray border-border-gray",
            ].join(" ")}
          >
            {PEN_COLORS[c].label}
          </button>
        ))}
      </div>

      <div className="mb-1 text-[11px] text-text-gray uppercase tracking-wide px-1">Size</div>
      <div className="flex flex-wrap gap-1 px-1">
        {(Object.keys(PEN_SIZES) as PenSize[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange({ size: s })}
            className={[
              "px-2 py-1 rounded text-xs border",
              penSize === s
                ? "bg-action text-white border-action"
                : "bg-white text-black hover:bg-light-gray border-border-gray",
            ].join(" ")}
          >
            {PEN_SIZES[s].label}
          </button>
        ))}
      </div>
    </div>
  );
}
