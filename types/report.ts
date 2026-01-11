export type ExportedImage = {
  width: number;
  height: number;
  dataUrl: string;
};

export type ReportProjectMeta = {
  id: string;
  name?: string;
  clientName?: string;
  projectOwner?: string;
  ownerName?: string;
  ownerEmail?: string;
  description?: string;
  conclusion?: string;
};

export type PhotoMarkerExport = {
  id: string;
  page: number;
  refNo?: string;
  createdAt?: string | number;
  note?: string;
  imageUrls: string[];
};

export type ExportProjectReportPayload = {
  projectId: string;
  pdfId?: string;
  fileName?: string;
  fileUrl?: string;
  project: ReportProjectMeta;
  drawingPages: ExportedImage[];
  photoMarkers: PhotoMarkerExport[];
};
