export type ExportPagesImage = { width: number; height: number; dataUrl: string };

export type DocumentViewerHandle = {
  undo: () => void;
  redo: () => void;

  domRef: HTMLDivElement | null;

  exportPagesAsImages: () => Promise<ExportPagesImage[]>;

  addImageAnnotation: (imageUrl: string, note: string) => void;
  addMultipleImages: (imageUrls: string[], note: string) => void;

  addImagesWithUpload?: (files: File[], note: string) => Promise<void> | void;
  openCategory?: (name: string) => void;
  addNoteAnnotation?: (text: string, x?: number, y?: number) => void;
  openFullScreen: () => void;
  closeFullScreen: () => void;
  toggleFullScreen?: (next?: boolean) => void;
  openCompleteView?: () => void;
  closeCompleteView?: () => void;
  toggleCompleteView?: (next?: boolean) => void;
};
