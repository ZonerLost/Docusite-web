export type StoredProject = {
  id: string;
  name: string;
  clientName?: string;
  status: "in-progress" | "completed" | "cancelled";
  location: string;
  projectOwner?: string;
  deadline?: string;
  members?: number;
  raw?: any;
};

export type AnnotationType = "text" | "image" | "note" | "draw" | "highlight";

export type ImageAttachment = { url: string; storageKey: string; contentType?: string };

export type ImageAnnotation = {
  id: string;
  type: "image";
  page: number; // 1-based
  rect: { x: number; y: number; w: number; h: number }; // normalized 0..1
  images: ImageAttachment[];
  description?: string;
  createdAt?: number;
  updatedAt?: number;

  // Legacy compatibility fields (for migration + geometry helpers)
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  normX?: number;
  normY?: number;
  normW?: number;
  normH?: number;
  xNorm?: number;
  yNorm?: number;
  content?: string;
  noteRelX?: number;
  noteRelY?: number;
  noteAbsX?: number;
  noteAbsY?: number;
  imageId?: string;
  storagePath?: string;
  refCode?: string;
  currentImageIndex?: number;
};

export type Annotation = {
  id: string;
  type: Exclude<AnnotationType, "image">;

  // Absolute PDF-space (scroll content) position (legacy + export)
  x: number;
  y: number;
  width?: number;
  height?: number;

  content?: string;

  // Image pins
  images?: { url: string; note?: string }[];
  currentImageIndex?: number;

  // Styling
  color?: string;

  // Draw strokes
  pathData?: { x: number; y: number }[];
  pathDataNorm?: { nx: number; ny: number }[];
  penSize?: "small" | "medium" | "large";

  // Normalized positioning (preferred)
  page?: number; // 1-based
  normX?: number; // 0..1 relative to page width
  normY?: number; // 0..1 relative to page height
  normW?: number; // 0..1
  normH?: number; // 0..1

  // New text/note markers
  isNew?: boolean;

  // Image note bubble positioning
  noteRelX?: number;
  noteRelY?: number;

  // Optional absolute note position (export/persistence)
  noteAbsX?: number;
  noteAbsY?: number;
  
} | ImageAnnotation;

export type ReportAnnotation = {
  id: string;
  refId: string;
  page: number;
  location: string;
  description: string;
  status: "Open" | "In Progress" | "Closed";
  assignedTo: string;
  dateLogged: string;
  dueDate: string;
  category: "Structural" | "Architectural" | "MEP";
};

export type DocumentViewerProps = {
  project: StoredProject;
  selectedFile?: { id: string; name: string; category?: string } | null;
  notes: string[];
  selectedTool: AnnotationTool | null;
  activeTab: "view" | "annotate";
  onAddNote: () => void;
  onAddImageNote: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSelectFile?: (file: { id: string; name: string; category?: string }) => void;
  penColor?: "black" | "red" | "blue" | "green" | "yellow";
  penSize?: "small" | "medium" | "large";
};

export type DocumentViewerHandle = {
  undo: () => void;
  redo: () => void;
  addImageAnnotation?: (imageUrl: string, note: string) => void;
  addMultipleImages?: (imageUrls: string[], note: string) => void;
  addImagesWithUpload?: (files: File[], description: string) => Promise<void> | void;
  addNoteAnnotation?: (text: string, x?: number, y?: number) => void;
  openCategory?: (name: string) => void;
  domRef: HTMLDivElement | null;
  exportPagesAsImages: () => Promise<{ width: number; height: number; dataUrl: string }[]>;
};

export type PageRect = { left: number; top: number; width: number; height: number };
export type PdfScroll = { left: number; top: number };
export type PdfOffset = { left: number; top: number };

export type DragNoteState = {
  id: string;
  offsetX: number;
  offsetY: number;
  rect: DOMRect;
} | null;

import type { LucideIcon } from "lucide-react";

export type ActiveTab = "view" | "annotate";

export type PenSize = "small" | "medium" | "large";
export type PenColor = "black" | "red" | "blue" | "green" | "yellow";

export type AnnotationTool = "select" | "draw" | "eraser" | "text" | "rect" | "circle" | "note" | "image" | "highlight";

export type SearchResults = { count: number; currentIndex: number };

export type CategoryChip = { name: string; count: number };

export type ToolItem = {
  id: AnnotationTool;
  label: string;
  icon: LucideIcon;
  // optional grouping/behavior
  kind?: "action" | "tool";
};

export type ProjectFilePhoto = {
  id: string;
  url: string;
  storagePath: string;
  projectId: string;
  pdfId: string;
  description: string;
  refNo: string;
  createdAt?: any;
  createdAtMs?: number;
  mimeType?: string;
  sizeBytes?: number;
  originalName?: string;
  annotationId?: string | null;
  storageKey?: string;
  contentType?: string;
};

