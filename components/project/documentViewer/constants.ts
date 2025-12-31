import {
  TypeIcon,
  PencilIcon,
  EraserIcon,
  CameraIcon,
  StickyNoteIcon,
  SquareIcon,
  CircleIcon,
  MousePointer2,
  Highlighter,
} from "lucide-react";
import type { PenColor, PenSize, ToolItem } from "./types";

export const PEN_SIZES: Record<PenSize, { label: string; brushWidth: number }> = {
  small: { label: "Small", brushWidth: 2 },
  medium: { label: "Medium", brushWidth: 4 },
  large: { label: "Large", brushWidth: 6 },
};

export const PEN_COLORS: Record<PenColor, { label: string; hex: string }> = {
  black: { label: "Black", hex: "#000000" },
  red: { label: "Red", hex: "#ff0000" },
  blue: { label: "Blue", hex: "#0000ff" },
  green: { label: "Green", hex: "#00ff00" },
  yellow: { label: "Yellow", hex: "#ffff00" },
};

export const ANNOTATE_TOOLS: ToolItem[] = [
  { id: "select", label: "Select", icon: MousePointer2, kind: "tool" },
  { id: "text", label: "Text", icon: TypeIcon, kind: "tool" },
  { id: "draw", label: "Draw", icon: PencilIcon, kind: "tool" },
  { id: "highlight", label: "Highlight", icon: Highlighter, kind: "tool" },
  { id: "eraser", label: "Eraser", icon: EraserIcon, kind: "tool" },
  { id: "rect", label: "Rectangle", icon: SquareIcon, kind: "tool" },
  { id: "circle", label: "Circle", icon: CircleIcon, kind: "tool" },
  { id: "image", label: "Photos", icon: CameraIcon, kind: "action" },
  { id: "note", label: "Note", icon: StickyNoteIcon, kind: "action" },
];
