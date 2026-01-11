import type { LucideIcon } from "lucide-react";

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

export type ActiveTab = "view" | "annotate";

export type PenSize = "small" | "medium" | "large";
export type PenColor = "black" | "red" | "blue" | "green" | "yellow";

export type SelectedTool =
  | "select"
  | "draw"
  | "eraser"
  | "text"
  | "rect"
  | "circle"
  | "note"
  | "image"
  | "highlight";

export type AnnotationTool = SelectedTool;

export type SearchResults = { count: number; currentIndex: number };
export type CategoryChip = { name: string; count: number };

export type ToolItem = {
  id: AnnotationTool;
  label: string;
  icon: LucideIcon;
  kind?: "action" | "tool";
};

export type NormalizedRect = { x: number; y: number; w: number; h: number };

export type ImageAttachment = {
  url: string;
  storageKey: string;
  contentType?: string;
};

export type PhotoMarkerMode = "icon" | "expanded";

export type PhotoMarker = {
  id: string;
  page: number;
  normX: number;
  normY: number;
  normW?: number;
  normH?: number;
  createdAt?: string;
  refNo?: string;
  note?: string;
  imageUrls: string[];
  mode?: PhotoMarkerMode;
};

// Normalized image marker artifact (0..1 coords on page)
export type ImageArtifact = {
  id: string;
  type: "image";
  page: number;
  x: number;
  y: number;
  w?: number;
  h?: number;
  photoId: string;
  url?: string;
  note?: string;
  createdAt?: number;
};

export type BaseAnnotation = {
  id: string;
  page?: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
  content?: string;
  normX?: number;
  normY?: number;
  normW?: number;
  normH?: number;
  noteRelX?: number;
  noteRelY?: number;
  noteAbsX?: number;
  noteAbsY?: number;
  createdAt?: number;
  updatedAt?: number;
  isNew?: boolean;
};

export type DrawAnnotation = BaseAnnotation & {
  type: "draw";
  pathData: { x: number; y: number }[];
  pathDataNorm?: { nx: number; ny: number }[];
  penSize?: PenSize;
};

export type TextAnnotation = BaseAnnotation & { type: "text" };
export type NoteAnnotation = BaseAnnotation & { type: "note" };
export type HighlightAnnotation = BaseAnnotation & { type: "highlight" };

export type ShapeAnnotation = BaseAnnotation & {
  type: "shape";
  shape: "rect" | "circle";
};

export type ImageAnnotation = BaseAnnotation & {
  type: "image";
  images: ImageAttachment[];
  rect?: NormalizedRect;
  description?: string;
  currentImageIndex?: number;
  displayMode?: PhotoMarkerMode;
  refNo?: string;
};

export type Annotation =
  | DrawAnnotation
  | TextAnnotation
  | NoteAnnotation
  | HighlightAnnotation
  | ShapeAnnotation
  | ImageAnnotation;

export type AnnotationType = Annotation["type"];

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
  selectedTool: SelectedTool | null;
  activeTab: ActiveTab;
  onAddNote: () => void;
  onAddImageNote: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSelectFile?: (file: { id: string; name: string; category?: string }) => void;
  penColor?: PenColor;
  penSize?: PenSize;
};

export type { DocumentViewerHandle } from "@/types/documentViewer";

export type PageRect = { left: number; top: number; width: number; height: number };
export type PdfScroll = { left: number; top: number };
export type PdfOffset = { left: number; top: number };

export type DragNoteState = {
  id: string;
  offsetX: number;
  offsetY: number;
  rect: DOMRect;
} | null;

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
  page?: number;
  normX?: number;
  normY?: number;
  normW?: number;
  normH?: number;
};
