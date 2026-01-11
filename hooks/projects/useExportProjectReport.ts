"use client";

import { useCallback, useState } from "react";
import type { RefObject } from "react";
import toast from "react-hot-toast";
import { doc, getDoc } from "firebase/firestore";
import { ensureSignedIn } from "@/lib/auth.init";
import { auth, db } from "@/lib/firebase-client";
import { exportProjectReport } from "@/services/projectReportApi";
import { downloadBlob } from "@/utils/downloadBlob";
import type { DocumentViewerHandle } from "@/types/documentViewer";
import type { SelectedFile, StoredProject } from "@/types/project";
import type { ProjectFilePhoto } from "@/components/project/documentViewer/types";
import type { PhotoMarkerExport, ReportProjectMeta } from "@/types/report";

type ExportProjectReportInput = {
  project: StoredProject | null;
  selectedFile: SelectedFile | null;
  fileUrl: string | null | undefined;
  photos: ProjectFilePhoto[];
  exportRef: RefObject<DocumentViewerHandle>;
};

type ExportProjectReportState = {
  isExporting: boolean;
  exportPdf: () => Promise<void>;
};

export function useExportProjectReport(
  input: ExportProjectReportInput
): ExportProjectReportState {
  const { project, selectedFile, fileUrl, photos, exportRef } = input;
  const [isExporting, setIsExporting] = useState(false);

  const getSafeFileName = useCallback((value: string) => {
    const cleaned = value
      .replace(/[\\/:*?"<>|\u0000-\u001F]/g, "_")
      .replace(/\s+/g, " ")
      .trim();
    if (!cleaned) return "Project Report.pdf";
    return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
  }, []);

  const exportPdf = useCallback(async () => {
    if (isExporting) return;
    if (!exportRef.current) return;
    if (!project?.id) {
      toast.error("Missing project details.");
      return;
    }
    if (!selectedFile?.name) {
      toast.error("Select a PDF to export.");
      return;
    }
    if (!fileUrl) {
      toast.error("Unable to resolve the PDF file URL.");
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading("Generating report...");
    try {
      await ensureSignedIn();
      const pages = await exportRef.current.exportPagesAsImages();
      if (!pages?.length) {
        throw new Error("No pages available to export.");
      }

      let projectMeta: ReportProjectMeta = {
        id: project.id,
        name: project.name,
        clientName: project.clientName,
        projectOwner: project.projectOwner,
        description: "",
        conclusion: "",
        ownerName: "",
        ownerEmail: "",
      };

      try {
        const snap = await getDoc(doc(db, "projects", project.id));
        if (snap.exists()) {
          const data = snap.data() as any;
          projectMeta = {
            ...projectMeta,
            name: data.title || projectMeta.name,
            clientName: data.clientName || projectMeta.clientName,
            projectOwner: data.projectOwner || projectMeta.projectOwner,
            description: data.description || "",
            conclusion: data.conclusion || "",
            ownerName: data.ownerName || "",
            ownerEmail: data.ownerEmail || "",
          };
        }
      } catch (err) {
        console.warn("Failed to fetch report metadata:", err);
      }

      const photoMarkers: PhotoMarkerExport[] = photos.map((photo) => ({
        id: photo.id,
        page: typeof photo.page === "number" ? photo.page : 1,
        refNo: photo.refNo || photo.id,
        createdAt:
          typeof photo.createdAtMs === "number" ? photo.createdAtMs : undefined,
        note: photo.description || undefined,
        imageUrls: photo.url ? [photo.url] : [],
      }));

      const token = await auth.currentUser?.getIdToken();
      const result = await exportProjectReport(
        {
          projectId: project.id,
          pdfId: selectedFile.id,
          fileName: selectedFile.name,
          fileUrl,
          project: projectMeta,
          drawingPages: pages,
          photoMarkers,
        },
        token
      );

      toast.success("Report exported.", { id: toastId });
      const fallbackName = getSafeFileName(
        projectMeta.name || selectedFile.name || "Project Report"
      );
      downloadBlob(result.blob, result.fileName || fallbackName);
    } catch (err: any) {
      console.error("Export failed:", err);
      toast.error(err?.message || "Export failed.", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  }, [
    isExporting,
    exportRef,
    project?.id,
    project?.name,
    project?.clientName,
    project?.projectOwner,
    selectedFile?.name,
    selectedFile?.id,
    fileUrl,
    photos,
    getSafeFileName,
  ]);

  return { isExporting, exportPdf };
}
