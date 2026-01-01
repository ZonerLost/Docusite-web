"use client";

import type { Timestamp } from "firebase/firestore";

/* ---------------------------------------------
 * Firestore-ish raw annotation model (optional)
 * -------------------------------------------- */
export type AnnotationKind = "draw" | "highlight" | "text" | "note" | "image_pin";

export type PdfAnnotationPoint = { x: number; y: number };

export type PdfAnnotation = {
  id: string;
  projectId: string;
  fileId: string;
  page: number;
  kind: AnnotationKind;

  x: number;
  y: number;
  w?: number;
  h?: number;

  color?: string;
  thickness?: number;

  text?: string;
  note?: string;

  refNo?: string;
  imagePath?: string;

  path?: PdfAnnotationPoint[];

  createdAt?: Timestamp | number | Date;
  updatedAt?: Timestamp | number | Date;

  createdBy?: string;
  deleted?: boolean;
};

export type ExportReportArgs = {
  projectId: string;
  project?: {
    id: string;
    name?: string;
    clientName?: string;
    projectOwner?: string;
    description?: string;
    conclusion?: string;
    raw?: Record<string, unknown>;
  };
  fileId: string;
  fileName?: string;
  fileUrl: string;
};

export type {
  ActiveTab,
  Annotation,
  AnnotationTool,
  BaseAnnotation,
  CategoryChip,
  DocumentViewerHandle,
  DocumentViewerProps,
  DragNoteState,
  DrawAnnotation,
  HighlightAnnotation,
  ImageAnnotation,
  ImageAttachment,
  NormalizedRect,
  NoteAnnotation,
  PageRect,
  PdfOffset,
  PdfScroll,
  PenColor,
  PenSize,
  ProjectFilePhoto,
  ReportAnnotation,
  SearchResults,
  SelectedTool,
  ShapeAnnotation,
  TextAnnotation,
  ToolItem,
} from "@/components/project/documentViewer/types";
