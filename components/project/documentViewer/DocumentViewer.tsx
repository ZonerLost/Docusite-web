"use client";

import React, { forwardRef } from "react";

import ProjectNotesSection from "../ProjectNotesSection";
import SiteInspectionReportTemplate from "../SiteInspectionReportTemplate";
import AddPicturesWithNotesModal from "@/components/modals/AddPicturesWithNotesModal";

import PdfViewer from "@/components/project/PdfViewer";
import { useProjectFileUrl } from "@/hooks/useProjectFileUrl";
import { useProjectFiles } from "@/hooks/useProjectFiles";
import useProjectFilePhotos from "@/hooks/useProjectFilePhotos";

import { db } from "@/lib/firebase-client";
import { doc, getDoc } from "firebase/firestore";
import { uploadProjectFilePhoto } from "@/lib/projectFiles/photos";
import toast from "react-hot-toast";

import type {
  Annotation,
  DocumentViewerHandle,
  DocumentViewerProps,
  ProjectFilePhoto,
  ReportAnnotation,
  ImageAnnotation,
} from "./types";
import { usePdfOverlayMetrics } from "./hooks/usePdfOverlayMetrics";
import { useAnnotationHistory } from "./hooks/useAnnotationHistory";
import { usePdfArtifactsSync } from "./hooks/usePdfArtifactsSync";
import { useNoteSync } from "./hooks/useNoteSync";
import { useAnnotationController } from "./hooks/useAnnotationController";
import { usePdfExport } from "./hooks/usePdfExport";

import AnnotationLayer from "./components/AnnotationLayer";
import ImageAnnotationLayer from "./components/ImageAnnotationLayer";
import DrawingOverlay from "./components/DrawingOverlay";
import FileCategoryModal from "./components/FileCategoryModal";

const envDebug = process.env.NEXT_PUBLIC_DEBUG_PDF === "1";
const isDebugEnabled = () => {
  if (envDebug) return true;
  if (typeof window === "undefined") return false;
  try {
    if ((window as any).__DEBUG_PDF === true) return true;
  } catch {}
  try {
    if (window.localStorage?.getItem("DEBUG_PDF") === "1") return true;
  } catch {}
  return false;
};
const dbg = (...args: any[]) => {
  if (isDebugEnabled()) console.log("[PDF-UPLOAD]", ...args);
};

const DocumentViewer = React.memo(
  forwardRef<DocumentViewerHandle, DocumentViewerProps>(function DocumentViewer(
    {
      project,
      selectedFile,
      notes,
      selectedTool,
      activeTab,
      onAddNote, // (kept for compatibility)
      onAddImageNote, // (kept for compatibility)
      onUndo,
      onRedo,
      onSelectFile,
      penColor,
      penSize,
    },
    ref
  ) {
    const [showPdf, setShowPdf] = React.useState(false);
    const handleClosePdf = React.useCallback(() => setShowPdf(false), []);

    const domRef = React.useRef<HTMLDivElement>(null);
    const [activeImageAnnId, setActiveImageAnnId] = React.useState<
      string | null
    >(null);
    const activeImageAnnIdRef = React.useRef<string | null>(null);
    const modalImageAnnIdRef = React.useRef<string | null>(null);
    const setActiveImageAnnIdSafe = React.useCallback((id: string | null) => {
      activeImageAnnIdRef.current = id;
      setActiveImageAnnId(id);
    }, []);
    const [exportMode, setExportMode] = React.useState(false);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [previewImageAnnId, setPreviewImageAnnId] = React.useState<string | null>(null);

    React.useEffect(() => {
      dbg("debug enabled", { env: process.env.NEXT_PUBLIC_DEBUG_PDF });
    }, []);

    const {
      url: fileUrl,
      isLoading: isFileUrlLoading,
      error: fileUrlError,
    } = useProjectFileUrl(project?.id, selectedFile?.name || null);

    const [isPdfLoaded, setIsPdfLoaded] = React.useState(false);

    React.useEffect(() => {
      if (isFileUrlLoading) {
        setIsPdfLoaded(false);
        return;
      }
      if (fileUrl || fileUrlError) setIsPdfLoaded(true);
    }, [isFileUrlLoading, fileUrl, fileUrlError]);

    // Auto open pdf when switching to View tab + file exists
    React.useEffect(() => {
      if (activeTab === "view" && fileUrl) setShowPdf(true);
    }, [activeTab, fileUrl]);

    const { files: projectFiles } = useProjectFiles(project?.id);

    const groupedByCategory = React.useMemo(() => {
      const map = new Map<string, { id: string; name: string }[]>();
      projectFiles.forEach((f) => {
        const cat = f.category || "Others";
        const arr = map.get(cat) || [];
        arr.push({ id: f.id, name: f.name });
        map.set(cat, arr);
      });
      return map;
    }, [projectFiles]);

    const [fileListOpen, setFileListOpen] = React.useState(false);
    const [fileListCategory, setFileListCategory] = React.useState<{
      category: string;
      files: { id: string; name: string }[];
    } | null>(null);

    const openCategory = React.useCallback(
      (category: string) => {
        const list = groupedByCategory.get(category) || [];
        if (list.length === 0) {
          setFileListOpen(false);
          setFileListCategory(null);
          return;
        }
        if (list.length === 1) {
          const f = list[0];
          onSelectFile?.({ id: f.id, name: f.name, category });
          setShowPdf(true);
          setFileListOpen(false);
          setFileListCategory(null);
          return;
        }
        setFileListCategory({ category, files: list });
        setFileListOpen(true);
      },
      [groupedByCategory, onSelectFile]
    );

    // Overlay metrics for annotations
    const overlay = usePdfOverlayMetrics(domRef);

    // History
    const history = useAnnotationHistory({ onUndo, onRedo });

    // Context key for persistence resets
    const saveContextKey = React.useMemo(() => {
      if (!project?.id || !selectedFile?.name || !fileUrl) return "";
      const baseUrl = fileUrl.split("?")[0].split("#")[0];
      return `${project.id}|${selectedFile.name}|${baseUrl}`;
    }, [fileUrl, project?.id, selectedFile?.name]);

    // ✅ apply artifacts only once per context (prevents re-overwrite)
    const loadedContextRef = React.useRef<string>("");

    React.useEffect(() => {
      loadedContextRef.current = "";
    }, [saveContextKey]);

    // Artifacts sync
    const artifacts = usePdfArtifactsSync({
      projectId: project?.id,
      fileUrl,
      fileName: selectedFile?.name || null,
      enabled: !!(project?.id && fileUrl && selectedFile?.name && isPdfLoaded),
      onLoaded: (anns) => {
        if (!anns.length) return;

        const normalized = anns.map((a) => {
          if (a.type !== "image") return a;

          const img = a as ImageAnnotation;

          const images = Array.isArray(img.images) ? img.images : [];

          const hasRect =
            !!img.rect &&
            typeof img.rect.x === "number" &&
            typeof img.rect.y === "number" &&
            typeof img.rect.w === "number" &&
            typeof img.rect.h === "number";

          const hasNorm =
            typeof img.normX === "number" &&
            typeof img.normY === "number" &&
            typeof img.normW === "number" &&
            typeof img.normH === "number";

          // ✅ only create rect if we truly have normalized values
          const rect = hasRect
            ? img.rect
            : hasNorm
            ? { x: img.normX!, y: img.normY!, w: img.normW!, h: img.normH! }
            : undefined;

          return {
            ...img,
            images,
            ...(rect ? { rect } : {}),
          };
        });

        history.replaceAll(
          history.annotations.length ? history.annotations : normalized
        );
      },
    });

    // Debounced note persistence
    const noteSync = useNoteSync({
      artifactServiceRef: artifacts.artifactServiceRef,
      annotationsRef: history.annotationsRef,
      contextKey: saveContextKey,
    });

    // Controller (mouse/touch interaction)
    const controller = useAnnotationController({
      activeTab,
      selectedTool,
      penColor,
      penSize,

      domRef,
      artifactServiceRef: artifacts.artifactServiceRef,

      annotations: history.annotations,
      setAnnotations: (next: Annotation[]) => history.apply(next, false),
      commit: (next: Annotation[]) => history.apply(next, true),

      pdfScrollEl: overlay.pdfScrollEl,
      pdfScroll: overlay.pdfScroll,
      pdfContentOffset: overlay.pdfContentOffset,
      pageRects: overlay.pageRects,

      getFirstVisiblePageIndex: overlay.getFirstVisiblePageIndex,
      getPageIndexFromClientPoint: overlay.getPageIndexFromClientPoint,
      getPageIndexFromCanvasPoint: overlay.getPageIndexFromCanvasPoint,
      getPageAtClientPoint: overlay.getPageAtClientPoint,
      clientToCanvasPoint: overlay.clientToCanvasPoint,
      canvasToPageNormalized: overlay.canvasToPageNormalized,
      clientToPageNormalized: overlay.clientToPageNormalized,
      getPointInPdfSpace: overlay.getPointInPdfSpace,
      getPointInPageSpace: overlay.getPointInPageSpace,

      scheduleNoteSaveDebounced: noteSync.scheduleNoteSaveDebounced,
      saveNoteImmediate: noteSync.saveNoteImmediate,

      onRequestOpenImageModal: (id) => {
        modalImageAnnIdRef.current = id;
        setActiveImageAnnIdSafe(id);
        setIsModalOpen(true);
        dbg("open modal from controller", {
          id,
          modalRef: modalImageAnnIdRef.current,
          activeRef: activeImageAnnIdRef.current,
        });
      },
    });

    // ✅ only render overlays when PDF is actually visible + measured
    const shouldShowPdfOverlays = React.useMemo(() => {
      const hasPdf =
        !!fileUrl && !!overlay.pdfScrollEl && overlay.pageRects.length > 0;

      if (activeTab !== "view") return hasPdf;
      return hasPdf && showPdf;
    }, [
      activeTab,
      fileUrl,
      overlay.pdfScrollEl,
      overlay.pageRects.length,
      showPdf,
    ]);

    // Report meta (Firestore extraFields)
    const [reportCustomData, setReportCustomData] = React.useState<
      Record<string, any>
    >({});
    React.useEffect(() => {
      let cancelled = false;

      const loadMeta = async () => {
        if (!project?.id) {
          setReportCustomData({});
          return;
        }
        try {
          const ref = doc(db, "projects", project.id);
          const snap = await getDoc(ref);
          if (!snap.exists() || cancelled) {
            if (!snap.exists()) setReportCustomData({});
            return;
          }
          const data = snap.data() as any;
          const extra =
            data && typeof data.extraFields === "object" && data.extraFields
              ? (data.extraFields as Record<string, unknown>)
              : {};
          setReportCustomData({
            inspector: String(extra.inspector || ""),
            weather: String(extra.weather || ""),
          });
        } catch {
          if (!cancelled) setReportCustomData({});
        }
      };

      loadMeta();
      return () => {
        cancelled = true;
      };
    }, [project?.id]);

    // Report mapping
    const reportAnnotations: ReportAnnotation[] = React.useMemo(() => {
      const notesA = history.annotations.filter(
        (a) => a.type === "note" || a.type === "text"
      );
      return notesA.map((a, index) => ({
        id: a.id,
        refId: `ISS-${(index + 1).toString().padStart(3, "0")}`,
        page: a.page || 1,
        location: `Page ${a.page || 1}`,
        description: a.content || "Annotation",
        status: "Open",
        assignedTo: "Unassigned",
        dateLogged: new Date().toLocaleDateString(),
        dueDate: "",
        category: "Structural",
      }));
    }, [history.annotations]);

    const { photos } = useProjectFilePhotos(
      project?.id || null,
      selectedFile?.id || null
    );

    const imageAnnotations = React.useMemo(
      () =>
        history.annotations
          .filter((a): a is ImageAnnotation => a.type === "image")
          .map((img) => {
            const images = Array.isArray(img.images) ? img.images : [];

            const hasRect =
              !!img.rect &&
              typeof img.rect.x === "number" &&
              typeof img.rect.y === "number" &&
              typeof img.rect.w === "number" &&
              typeof img.rect.h === "number";

            const hasNorm =
              typeof img.normX === "number" &&
              typeof img.normY === "number" &&
              typeof img.normW === "number" &&
              typeof img.normH === "number";

            const rect = hasRect
              ? img.rect
              : hasNorm
              ? { x: img.normX!, y: img.normY!, w: img.normW!, h: img.normH! }
              : undefined;

            return {
              ...img,
              images,
              ...(rect ? { rect } : {}),
            };
          }),
      [history.annotations]
    );

    const displayAnnotations = React.useMemo(
      () => history.annotations.filter((a) => a.type !== "image"),
      [history.annotations]
    );

    const previewImage = React.useMemo(() => {
      if (!previewImageAnnId) return null;
      return imageAnnotations.find((a) => a.id === previewImageAnnId) || null;
    }, [imageAnnotations, previewImageAnnId]);

    // Merge remote photo metadata into image annotations (for persistence across reloads)
    React.useEffect(() => {
      const byAnnotation = new Map<string, ProjectFilePhoto[]>();
      photos.forEach((p) => {
        if (!p.annotationId) return;
        const arr = byAnnotation.get(p.annotationId) || [];
        arr.push(p);
        byAnnotation.set(p.annotationId, arr);
      });

      let changed = false;
      const next = history.annotations.map((ann) => {
        if (ann.type !== "image") return ann;
        const items = byAnnotation.get(ann.id) || [];
        const uploads = items.map((p) => ({
          url: p.url,
          storageKey: p.storageKey || p.storagePath || "",
          contentType: p.contentType || p.mimeType,
        }));

        const existingImages = Array.isArray(ann.images) ? ann.images : [];
        const nextImages = uploads.length ? uploads : existingImages;
        const existingDesc = ann.description || ann.content || "";
        const remoteDesc = items[0]?.description || existingDesc;

        const sameLength = nextImages.length === existingImages.length;
        const sameImages =
          sameLength &&
          nextImages.every((img, idx) => {
            const ex = existingImages[idx];
            return (
              ex &&
              ex.url === img.url &&
              ex.storageKey === img.storageKey &&
              ex.contentType === img.contentType
            );
          });
        const sameDesc = remoteDesc === existingDesc;
        if (sameImages && sameDesc) return ann;

        changed = true;
        return {
          ...ann,
          images: nextImages,
          description: remoteDesc,
          content: remoteDesc,
          updatedAt: Date.now(),
        };
      });

      if (changed) history.apply(next, false);
    }, [photos, history.annotations, history.apply]);

    // Export hook (keeps DocumentViewer small)
    const exporter = usePdfExport({
      domRef,
      pdfScrollEl: overlay.pdfScrollEl,
      annotations: history.annotations,
      editingAnnotationId: controller.editingAnnotationId,
    });

    // Imperative handle
    React.useImperativeHandle(ref, () => ({
      undo: history.undo,
      redo: history.redo,

      // legacy APIs kept as no-ops; uploads handled via modal flow
      addImageAnnotation: () => {},
      addMultipleImages: () => {},

      addImagesWithUpload: async (files: File[], description: string) => {
        if (!project?.id || !selectedFile?.id || !files?.length) return;
        const traceId = crypto.randomUUID();
        const targetAnnId =
          modalImageAnnIdRef.current || activeImageAnnIdRef.current;
        dbg("addImagesWithUpload start", {
          traceId,
          targetAnnId,
          modalRef: modalImageAnnIdRef.current,
          activeRef: activeImageAnnIdRef.current,
          activeState: activeImageAnnId,
          projectId: project?.id,
          pdfId: selectedFile?.id,
          pdfName: selectedFile?.name,
          files: files?.length,
          description,
          ts: new Date().toISOString(),
        });
        if (!targetAnnId) {
          dbg("BLOCKED: missing targetAnnId", {
            traceId,
            modalRef: modalImageAnnIdRef.current,
            activeRef: activeImageAnnIdRef.current,
            activeState: activeImageAnnId,
            projectId: project?.id,
            pdfId: selectedFile?.id,
            pdfName: selectedFile?.name,
            files: files?.length,
            description,
            ts: new Date().toISOString(),
          });
          toast.error("Select or create an image marker on the PDF first.");
          return;
        }
        const toastId = toast.loading("Uploading photo(s)...");
        try {
          const targetAnn = history.annotationsRef.current.find(
            (a) => a.type === "image" && a.id === targetAnnId
          ) as ImageAnnotation | undefined;

          const normX =
            typeof targetAnn?.normX === "number"
              ? targetAnn.normX
              : targetAnn?.rect?.x;
          const normY =
            typeof targetAnn?.normY === "number"
              ? targetAnn.normY
              : targetAnn?.rect?.y;
          const normW =
            typeof targetAnn?.normW === "number"
              ? targetAnn.normW
              : targetAnn?.rect?.w;
          const normH =
            typeof targetAnn?.normH === "number"
              ? targetAnn.normH
              : targetAnn?.rect?.h;

          const results = await Promise.allSettled(
            files.map((file) =>
              uploadProjectFilePhoto({
                projectId: project.id,
                pdfId: selectedFile.id,
                file,
                description: description || "",
                annotationId: targetAnnId,
                page: targetAnn?.page,
                normX,
                normY,
                normW,
                normH,
              })
            )
          );
          const ok = results.filter((r) => r.status === "fulfilled").length;
          const total = results.length;
          if (ok === total) {
            toast.success(
              total > 1 ? `${total} photos uploaded.` : "Photo uploaded.",
              { id: toastId }
            );
          } else if (ok > 0) {
            toast.success(`${ok}/${total} uploaded. Some failed.`, {
              id: toastId,
            });
          } else {
            toast.error("Upload failed. Please try again.", { id: toastId });
          }
        } catch (err: any) {
          const code = err?.code || err?.message || "";
          const friendly = code.includes("permission-denied")
            ? "No permission to upload. Contact admin."
            : code.includes("unauthenticated")
            ? "Please login again."
            : code.includes("canceled")
            ? "Upload canceled."
            : code.includes("quota-exceeded")
            ? "Storage quota exceeded."
            : "Upload failed. Please try again.";
          toast.error(friendly, { id: toastId });
        }
      },

      addNoteAnnotation: controller.addNoteAnnotation,

      openCategory,
      domRef: domRef.current,

      exportPagesAsImages: async () => {
        // ✅ close editing + flush note saves before capturing
        controller.setEditingAnnotationId(null);
        noteSync.forceSaveAll();

        setExportMode(true);
        try {
          // give DOM two frames to apply styles + blur
          await new Promise((resolve) =>
            requestAnimationFrame(() => resolve(null))
          );
          await new Promise((resolve) =>
            requestAnimationFrame(() => resolve(null))
          );
          return await exporter.exportPagesAsImages();
        } finally {
          setExportMode(false);
        }
      },
    }));

    if (!isPdfLoaded) return null;

    return (
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
        <div className="flex-1 min-h-0 w-full">
          <div
            ref={domRef}
            data-exporting={exportMode ? "1" : "0"}
            className="relative z-0 flex h-full min-h-0 w-full flex-col overflow-hidden border border-border-gray bg-white shadow-sm"
            style={{
              color: "#000000",
              fontFamily:
                "Inter, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
              lineHeight: 1.6,
              cursor:
                activeTab === "view"
                  ? "default"
                  : selectedTool === "draw"
                  ? "crosshair"
                  : selectedTool === "eraser"
                  ? "crosshair"
                  : selectedTool === "text"
                  ? "crosshair"
                  : selectedTool === "rect" || selectedTool === "circle"
                  ? "crosshair"
                  : controller.draggingAnnotationId
                  ? "grabbing"
                  : "default",
            }}
            onClick={controller.handleCanvasClick}
            onPointerDown={controller.handlePointerDown}
            onPointerMove={controller.handlePointerMove}
            onPointerUp={controller.handlePointerUp}
            onPointerLeave={controller.handlePointerUp}
            onPointerCancel={controller.handlePointerUp}
          >
            {activeTab === "view" ? (
              <div className="flex-1 min-h-0 overflow-hidden">
                {showPdf && fileUrl ? (
                  <PdfViewer
                    fileUrl={fileUrl}
                    height="100%"
                    onClose={handleClosePdf}
                    onContainerRef={overlay.setPdfScrollEl}
                  />
                ) : (
                  <div className="h-full overflow-auto p-4">
                    <SiteInspectionReportTemplate
                      project={project}
                      selectedFile={selectedFile}
                      annotations={reportAnnotations}
                      photos={photos}
                      customData={reportCustomData}
                    />
                    <ProjectNotesSection notes={notes} />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 min-h-0 w-full overflow-hidden">
                {fileUrl ? (
                  <PdfViewer
                    fileUrl={fileUrl}
                    height="100%"
                    onContainerRef={overlay.setPdfScrollEl}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-text-gray">
                    Failed to load PDF.
                  </div>
                )}
              </div>
            )}

            {/* ✅ overlays only when pdf is actually visible */}
            {shouldShowPdfOverlays && (
              <>
                <ImageAnnotationLayer
                  annotations={imageAnnotations}
                  pageRects={overlay.pageRects}
                  pdfContentOffset={{
                    x: overlay.pdfContentOffset.left,
                    y: overlay.pdfContentOffset.top,
                  }}
                  pdfScroll={{
                    x: overlay.pdfScroll.left,
                    y: overlay.pdfScroll.top,
                  }}
                  domRef={domRef}
                  clientToCanvasPoint={overlay.clientToCanvasPoint}
                  exportMode={exportMode}
                  onOpen={(id) => {
                    setActiveImageAnnIdSafe(id);

                    const ann = history.annotationsRef.current.find(
                      (a) => a.type === "image" && a.id === id
                    ) as ImageAnnotation | undefined;

                    if (ann?.images?.length) {
                      setPreviewImageAnnId(id);
                      dbg("open preview from ImageAnnotationLayer", {
                        id,
                        modalRef: modalImageAnnIdRef.current,
                        activeRef: activeImageAnnIdRef.current,
                      });
                      return;
                    }

                    modalImageAnnIdRef.current = id;
                    setIsModalOpen(true);
                    dbg("open modal from ImageAnnotationLayer", {
                      id,
                      modalRef: modalImageAnnIdRef.current,
                      activeRef: activeImageAnnIdRef.current,
                    });
                  }}
                  onUpdate={(updater) =>
                    history.apply(updater(history.annotationsRef.current), false)
                  }
                  onCommit={(updater, updatedId) => {
                    const next = updater(history.annotationsRef.current);
                    history.apply(next, true);
                    const updated = next.find(
                      (a) => a.type === "image" && a.id === updatedId
                    );
                    if (updated) controller.persistImageAnnotation(updated);
                  }}
                />

                <AnnotationLayer
                  annotations={displayAnnotations}
                  pageRects={overlay.pageRects}
                  pdfContentOffset={overlay.pdfContentOffset}
                  pdfScroll={overlay.pdfScroll}
                  editingAnnotationId={controller.editingAnnotationId}
                  setEditingAnnotationId={controller.setEditingAnnotationId}
                  draggingAnnotationId={controller.draggingAnnotationId}
                  resizingAnnotationId={controller.resizingAnnotationId}
                  onDelete={(id) => controller.deleteAnnotation(id)}
                  onUpdate={(updater) =>
                    history.apply(updater(history.annotations), false)
                  }
                  onCommit={(next) => history.apply(next, true)}
                  onSaveImmediate={noteSync.saveNoteImmediate}
                  onScheduleDebounced={noteSync.scheduleNoteSaveDebounced}
                  setDraggingNote={controller.setDraggingNote}
                />

                <DrawingOverlay
                  drawingPath={controller.drawingPath}
                  visible={activeTab !== "view"}
                  pdfContentOffset={overlay.pdfContentOffset}
                  pdfScroll={overlay.pdfScroll}
                />
              </>
            )}

            <div className="absolute bottom-2 left-2 right-2 flex flex-col items-start justify-between gap-1 rounded bg-white/80 p-2 text-[10px] text-gray-500 backdrop-blur-sm sm:bottom-6 sm:left-6 sm:right-6 sm:flex-row sm:items-center sm:gap-0 sm:p-3 sm:text-[11px]">
              <span className="font-medium">Generated by DocuSite</span>
              <span className="font-medium">Report Version 1.0</span>
            </div>

            {/* ✅ hide editor-only UI during export (without touching your AnnotationLayer yet) */}
            <style jsx global>{`
              [data-exporting="1"] button[title="Delete text box"],
              [data-exporting="1"] button[title="Remove note"],
              [data-exporting="1"] [title="Drag to resize"] {
                display: none !important;
              }
            `}</style>
          </div>
        </div>

        <FileCategoryModal
          open={fileListOpen && !!fileListCategory}
          category={fileListCategory?.category || ""}
          files={fileListCategory?.files || []}
          onClose={() => {
            setFileListOpen(false);
            setFileListCategory(null);
          }}
          onPick={(f) => {
            onSelectFile?.({
              id: f.id,
              name: f.name,
              category: fileListCategory?.category,
            });
            setShowPdf(true);
            setFileListOpen(false);
            setFileListCategory(null);
          }}
        />

        {previewImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
            role="dialog"
            data-no-export="1"
          >
            <div className="relative w-full max-w-3xl rounded-lg bg-white p-4 shadow-xl">
              <button
                type="button"
                className="absolute right-3 top-3 text-gray-500 hover:text-black"
                onClick={() => setPreviewImageAnnId(null)}
                aria-label="Close preview"
              >
                X
              </button>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      Image Marker
                    </div>
                    <div className="text-xs text-gray-600">
                      {previewImage.description ||
                        previewImage.content ||
                        "No description"}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded border border-gray-200 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
                      onClick={() => setPreviewImageAnnId(null)}
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      className="rounded bg-action px-3 py-1 text-xs text-white hover:bg-action/90"
                      onClick={() => {
                        modalImageAnnIdRef.current = previewImage.id;
                        setIsModalOpen(true);
                        setPreviewImageAnnId(null);
                      }}
                    >
                      Add/Replace Photos
                    </button>
                  </div>
                </div>

                {previewImage.images?.[0]?.url ? (
                  <div className="w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewImage.images[0].url}
                      alt={previewImage.description || "Photo"}
                      className="w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="rounded border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                    No image available.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <AddPicturesWithNotesModal
          isOpen={isModalOpen}
          onClose={() => {
            dbg("modal onClose clicked", {
              modalRef: modalImageAnnIdRef.current,
              activeRef: activeImageAnnIdRef.current,
            });
            dbg("clearing ids", {
              before: {
                modalRef: modalImageAnnIdRef.current,
                activeRef: activeImageAnnIdRef.current,
              },
            });
            modalImageAnnIdRef.current = null;
            setActiveImageAnnIdSafe(null);
            setIsModalOpen(false);
            dbg("cleared ids", {
              after: {
                modalRef: modalImageAnnIdRef.current,
                activeRef: activeImageAnnIdRef.current,
              },
            });
          }}
          onAdd={async (pictures, description) => {
            const traceId = crypto.randomUUID();
            const targetAnnId =
              modalImageAnnIdRef.current || activeImageAnnIdRef.current;
            dbg("modal onAdd start", {
              traceId,
              targetAnnId,
              modalRef: modalImageAnnIdRef.current,
              activeRef: activeImageAnnIdRef.current,
              activeState: activeImageAnnId,
              projectId: project?.id,
              pdfId: selectedFile?.id,
              pdfName: selectedFile?.name,
              files: pictures?.length,
              ts: new Date().toISOString(),
            });
            if (!project?.id || !selectedFile?.id || !targetAnnId) {
              dbg("BLOCKED: missing targetAnnId", {
                traceId,
                modalRef: modalImageAnnIdRef.current,
                activeRef: activeImageAnnIdRef.current,
                activeState: activeImageAnnId,
                projectId: project?.id,
                pdfId: selectedFile?.id,
                pdfName: selectedFile?.name,
                files: pictures?.length,
                ts: new Date().toISOString(),
              });
              toast.error("Select or create an image marker on the PDF first.");
              setIsModalOpen(false);
              return;
            }

            const toastId = toast.loading("Uploading photo(s)...");
            try {
              const targetAnn = history.annotationsRef.current.find(
                (a) => a.type === "image" && a.id === targetAnnId
              ) as ImageAnnotation | undefined;

              const normX =
                typeof targetAnn?.normX === "number"
                  ? targetAnn.normX
                  : targetAnn?.rect?.x;
              const normY =
                typeof targetAnn?.normY === "number"
                  ? targetAnn.normY
                  : targetAnn?.rect?.y;
              const normW =
                typeof targetAnn?.normW === "number"
                  ? targetAnn.normW
                  : targetAnn?.rect?.w;
              const normH =
                typeof targetAnn?.normH === "number"
                  ? targetAnn.normH
                  : targetAnn?.rect?.h;

              const uploads = await Promise.all(
                pictures.map((file) =>
                  uploadProjectFilePhoto({
                    projectId: project.id,
                    pdfId: selectedFile.id,
                    file,
                    description,
                    annotationId: targetAnnId,
                    page: targetAnn?.page,
                    normX,
                    normY,
                    normW,
                    normH,
                  })
                )
              );

              const merged = history.annotations.map((ann) => {
                if (ann.type !== "image" || ann.id !== targetAnnId)
                  return ann;
                const existing = Array.isArray(ann.images) ? ann.images : [];
                const additions = uploads.map((u) => ({
                  url: u.url,
                  storageKey: u.storageKey || "",
                  contentType: u.contentType || "",
                }));
                const nextDesc =
                  (description || "").trim() ||
                  ann.description ||
                  ann.content ||
                  "";
                return {
                  ...ann,
                  images: [...existing, ...additions],
                  description: nextDesc,
                  content: nextDesc,
                  updatedAt: Date.now(),
                };
              });

              history.apply(merged, true);

              // Persist marker meta (first image + note) for reload
              const ann = merged.find(
                (a) => a.type === "image" && a.id === targetAnnId
              ) as ImageAnnotation | undefined;
              if (ann) {
                controller.persistImageAnnotation(ann);
              }

              toast.success(
                uploads.length > 1
                  ? `${uploads.length} photos uploaded.`
                  : "Photo uploaded.",
                { id: toastId }
              );
            } catch (err: any) {
              const code = err?.code || err?.message || "";
              const friendly = code.includes("permission-denied")
                ? "No permission to upload. Contact admin."
                : code.includes("unauthenticated")
                ? "Please login again."
                : code.includes("canceled")
                ? "Upload canceled."
                : code.includes("quota-exceeded")
                ? "Storage quota exceeded."
                : "Upload failed. Please try again.";
              toast.error(friendly, { id: toastId });
            } finally {
              dbg("clearing ids", {
                traceId,
                before: {
                  modalRef: modalImageAnnIdRef.current,
                  activeRef: activeImageAnnIdRef.current,
                  activeState: activeImageAnnId,
                },
                ts: new Date().toISOString(),
              });
              setIsModalOpen(false);
              modalImageAnnIdRef.current = null;
              setActiveImageAnnIdSafe(null);
              dbg("cleared ids", {
                traceId,
                after: {
                  modalRef: modalImageAnnIdRef.current,
                  activeRef: activeImageAnnIdRef.current,
                  activeState: activeImageAnnId,
                },
                ts: new Date().toISOString(),
              });
            }
          }}
        />
      </div>
    );
  })
);

DocumentViewer.displayName = "DocumentViewer";
export default DocumentViewer;
