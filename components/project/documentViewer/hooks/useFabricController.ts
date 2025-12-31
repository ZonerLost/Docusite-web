"use client";

import * as React from "react";
import { PEN_COLORS, PEN_SIZES } from "../constants";
import type { AnnotationTool, PenColor, PenSize } from "../types";

// Keep Fabric import inside client hook
import fabric from "fabric";

type FabricCanvas = fabric.Canvas & {
  // Fabric ships getPointer at runtime but the type defs may omit it; keep the cast local.
  getPointer?: (event: any) => { x: number; y: number };
};

export function useFabricController(opts: {
  tool: AnnotationTool | null;
  penColor: PenColor;
  penSize: PenSize;
}) {
  const { tool, penColor, penSize } = opts;
  const canvasRef = React.useRef<FabricCanvas | null>(null);

  const bindCanvas = React.useCallback((c: FabricCanvas | null) => {
    canvasRef.current = c;
  }, []);

  // apply tool + brush config without causing React re-renders
  React.useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;

    const brushWidth = PEN_SIZES[penSize].brushWidth;
    const brushColor = PEN_COLORS[penColor].hex;

    // default
    c.isDrawingMode = false;
    c.selection = false;
    c.forEachObject((o) => (o.selectable = false));

    if (!tool) {
      c.requestRenderAll();
      return;
    }

    if (tool === "draw") {
      c.isDrawingMode = true;
      c.freeDrawingBrush = new fabric.PencilBrush(c);
      c.freeDrawingBrush.width = brushWidth;
      c.freeDrawingBrush.color = brushColor;
    }

    if (tool === "eraser") {
      // simplest + reliable eraser: click object to remove (fast + predictable)
      c.selection = false;
      c.forEachObject((o) => (o.selectable = true));
      c.on("mouse:down", (ev) => {
        const target = ev.target;
        if (target) {
          c.remove(target);
          c.requestRenderAll();
        }
      });
    }

    if (tool === "text") {
      c.on("mouse:down", (ev) => {
        const p = (c.getPointer?.(ev.e) as { x: number; y: number } | undefined) ?? { x: 0, y: 0 };
        const t = new fabric.IText("Type…", {
          left: p.x,
          top: p.y,
          fontSize: 16,
          fill: brushColor,
        });
        c.add(t);
        c.setActiveObject(t);
        t.enterEditing();
        c.requestRenderAll();
      });
    }

    c.requestRenderAll();

    // cleanup listeners when tool changes
    return () => {
      c.off("mouse:down");
    };
  }, [tool, penColor, penSize]);

  return { bindCanvas, getCanvas: () => canvasRef.current };
}
