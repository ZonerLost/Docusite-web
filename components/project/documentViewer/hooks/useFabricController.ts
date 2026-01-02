"use client";

import * as React from "react";
import { PEN_COLORS, PEN_SIZES } from "../constants";
import type { AnnotationTool, PenColor, PenSize } from "../types";
import type { Canvas } from "fabric";

type FabricCanvas = Canvas & {
  // Fabric ships getPointer at runtime but the type defs may omit it; keep the cast local.
  getPointer?: (event: any) => { x: number; y: number };
};

type FabricModule = typeof import("fabric");

let fabricPromise: Promise<FabricModule> | null = null;

async function loadFabric(): Promise<FabricModule> {
  if (!fabricPromise) {
    fabricPromise = import("fabric").then((mod: any) => {
      const resolved = mod.fabric ?? mod.default?.fabric ?? mod.default ?? mod;
      return resolved as FabricModule;
    });
  }

  return fabricPromise;
}

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
    let cancelled = false;

    const brushWidth = PEN_SIZES[penSize].brushWidth;
    const brushColor = PEN_COLORS[penColor].hex;

    // default
    c.isDrawingMode = false;
    c.selection = false;
    c.forEachObject((o) => (o.selectable = false));

    const applyTool = async () => {
      if (!tool) {
        c.requestRenderAll();
        return;
      }

      if (tool === "draw") {
        const fabric = await loadFabric();
        if (cancelled) return;
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
        const fabric = await loadFabric();
        if (cancelled) return;
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

      if (!cancelled) {
        c.requestRenderAll();
      }
    };

    void applyTool();

    // cleanup listeners when tool changes
    return () => {
      cancelled = true;
      c.off("mouse:down");
    };
  }, [tool, penColor, penSize]);

  return { bindCanvas, getCanvas: () => canvasRef.current };
}


