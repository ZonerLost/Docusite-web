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

const DocumentViewer = React.memo(
  forwardRef<DocumentViewerHandle, DocumentViewerProps>(function DocumentViewer(
    {
      project,
      selectedFile,
      notes,
      selectedTool,
      activeTab,
      onAddNote,
      onAddImageNote,
      onUndo,
      onRedo,
      onSelectFile,
      penColor,
      penSize,
    },
    ref,
  ) {
    const [showPdf, setShowPdf] = React.useState(false);
    const handleClosePdf = React.useCallback(() => setShowPdf(false), []);

    const domRef = React.useRef<HTMLDivElement>(null);
    const [activeImageAnnId, setActiveImageAnnId] = React.useState<string | null>(null);
    const [exportMode, setExportMode] = React.useState(false);
    const [isModalOpen, setIsModalOpen] = React.useState(false);

    const { url: fileUrl, isLoading: isFileUrlLoading, error: fileUrlError } = useProjectFileUrl(
      project?.id,
      selectedFile?.name || null,
    );

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
      [groupedByCategory, onSelectFile],
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

    // Artifacts sync
    const artifacts = usePdfArtifactsSync({
      projectId: project?.id,
      fileUrl,
      fileName: selectedFile?.name || null,
      enabled: !!(project?.id && fileUrl && selectedFile?.name && isPdfLoaded),
      onLoaded: (anns) => {
        if (anns.length) {
          const normalized = anns.map((a) =>
            a.type === "image"
              ? {
                  ...a,
                  images: Array.isArray(a.images) ? a.images : [],
                  rect:
                    a.rect ||
                    ({
                      x: typeof a.normX === "number" ? a.normX : 0,
                      y: typeof a.normY === "number" ? a.normY : 0,
                      w: typeof a.normW === "number" ? a.normW : 0.12,
                      h: typeof a.normH === "number" ? a.normH : 0.1,
                    } as ImageAnnotation["rect"]),
                }
              : a,
          );
          history.replaceAll(history.annotations.length ? history.annotations : normalized);
        }
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
      getPointInPdfSpace: overlay.getPointInPdfSpace,
      getPointInPageSpace: overlay.getPointInPageSpace,

      scheduleNoteSaveDebounced: noteSync.scheduleNoteSaveDebounced,
      saveNoteImmediate: noteSync.saveNoteImmediate,

      onRequestOpenImageModal: (id) => {
        setActiveImageAnnId(id);
        setIsModalOpen(true);
      },
    });

    // Report meta (Firestore extraFields)
    const [reportCustomData, setReportCustomData] = React.useState<Record<string, any>>({});
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
            data && typeof data.extraFields === "object" && data.extraFields ? (data.extraFields as Record<string, unknown>) : {};
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
      const notesA = history.annotations.filter((a) => a.type === "note" || a.type === "text");
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

    const { photos } = useProjectFilePhotos(project?.id || null, selectedFile?.id || null);

    const imageAnnotations = React.useMemo(
      () =>
        history.annotations
          .filter((a): a is ImageAnnotation => a.type === "image")
          .map((a) => ({
            ...a,
            images: Array.isArray(a.images) ? a.images : [],
            rect:
              a.rect ||
              ({
                x: typeof a.normX === "number" ? a.normX : 0,
                y: typeof a.normY === "number" ? a.normY : 0,
                w: typeof a.normW === "number" ? a.normW : 0.12,
                h: typeof a.normH === "number" ? a.normH : 0.1,
              } as ImageAnnotation["rect"]),
          })),
      [history.annotations],
    );

    const displayAnnotations = React.useMemo(
      () => history.annotations.filter((a) => a.type !== "image"),
      [history.annotations],
    );

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
            return ex && ex.url === img.url && ex.storageKey === img.storageKey && ex.contentType === img.contentType;
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

      // legacy APIs kept as no-ops; uploads handled via addImagesWithUpload below
      addImageAnnotation: () => {},
      addMultipleImages: () => {},
      addImagesWithUpload: async (files: File[], description: string) => {
        if (!project?.id || !selectedFile?.id || !files?.length) return;
        if (!activeImageAnnId) {
          toast.error("Select or create an image marker on the PDF first.");
          return;
        }
        const toastId = toast.loading("Uploading photo(s)...");
        try {
          const results = await Promise.allSettled(
            files.map((file) =>
              uploadProjectFilePhoto({
                projectId: project.id,
                pdfId: selectedFile.id,
                file,
                description: description || "",
                annotationId: activeImageAnnId,
              }),
            ),
          );
          const ok = results.filter((r) => r.status === "fulfilled").length;
          const total = results.length;
          if (ok === total) {
            toast.success(total > 1 ? `${total} photos uploaded.` : "Photo uploaded.", { id: toastId });
          } else if (ok > 0) {
            toast.success(`${ok}/${total} uploaded. Some failed.`, { id: toastId });
          } else {
            toast.error("Upload failed. Please try again.", { id: toastId });
          }
        } catch (err: any) {
          const code = err?.code || err?.message || "";
          const friendly =
            code.includes("permission-denied") ? "No permission to upload. Contact admin." :
            code.includes("unauthenticated") ? "Please login again." :
            code.includes("canceled") ? "Upload canceled." :
            code.includes("quota-exceeded") ? "Storage quota exceeded." :
            "Upload failed. Please try again.";
          toast.error(friendly, { id: toastId });
        }
      },
      addNoteAnnotation: controller.addNoteAnnotation,

      openCategory,
      domRef: domRef.current,

      exportPagesAsImages: async () => {
        setExportMode(true);
        try {
          await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
          return await exporter.exportPagesAsImages();
        } finally {
          setExportMode(false);
        }
      },
    }));

    if (!isPdfLoaded) return null;

    return (
      <div className="flex justify-center">
        <div className="w-full">
          <div
            ref={domRef}
            className="relative mx-auto w-full bg-white shadow-lg sm:!p-6 lg:!p-8 sm:!pb-24 lg:!pb-32"
            style={{
              width: "100%",
              minHeight: "1123px",
              padding: "16px",
              paddingBottom: "80px",
              color: "#000000",
              border: "1px solid #e5e7eb",
              boxShadow: "0 20px 60px rgba(0,0,0,0.1)",
              background: "white",
              fontFamily: "Inter, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
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
                        : controller.draggingAnnotationId
                          ? "grabbing"
                          : "default",
            }}
            onClick={controller.handleCanvasClick}
            onMouseDown={controller.handleMouseDown}
            onMouseMove={controller.handleMouseMove}
            onMouseUp={() => controller.handleMouseUp()}
            onMouseLeave={() => controller.handleMouseUp()}
            onTouchStart={controller.handleTouchStart}
            onTouchMove={controller.handleTouchMove}
            onTouchEnd={controller.handleTouchEnd}
            onTouchCancel={controller.handleTouchEnd}
          >
            {activeTab === "view" ? (
              <>
                {showPdf && fileUrl ? (
                  <div className="mb-6">
                    <PdfViewer fileUrl={fileUrl} onClose={handleClosePdf} onContainerRef={overlay.setPdfScrollEl} />
                  </div>
                ) : null}

                {!showPdf && (
                  <>
                    <SiteInspectionReportTemplate
                      project={project}
                      selectedFile={selectedFile}
                      annotations={reportAnnotations}
                      photos={photos}
                      customData={reportCustomData}
                    />
                    <ProjectNotesSection notes={notes} />
                  </>
                )}
              </>
            ) : (
              <div className="w-full min-h-[800px]">
                {fileUrl ? (
                  <PdfViewer fileUrl={fileUrl} height="85vh" onContainerRef={overlay.setPdfScrollEl} />
                ) : (
                  <div className="flex h-[400px] items-center justify-center text-sm text-text-gray">Failed to load PDF.</div>
                )}
              </div>
            )}

            <ImageAnnotationLayer
              annotations={imageAnnotations}
              pageRects={overlay.pageRects}
              pdfContentOffset={{ x: overlay.pdfContentOffset.left, y: overlay.pdfContentOffset.top }}
              pdfScroll={{ x: overlay.pdfScroll.left, y: overlay.pdfScroll.top }}
              exportMode={exportMode}
              onOpen={(id) => {
                setActiveImageAnnId(id);
                setIsModalOpen(true);
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
              onUpdate={(updater) => history.apply(updater(history.annotations), false)}
              onCommit={(next) => history.apply(next, true)}
              onSaveImmediate={noteSync.saveNoteImmediate}
              onScheduleDebounced={noteSync.scheduleNoteSaveDebounced}
              setDraggingNote={controller.setDraggingNote}
            />

            <DrawingOverlay drawingPath={controller.drawingPath} visible={activeTab !== "view"} />

            <div className="absolute bottom-2 left-2 right-2 flex flex-col items-start justify-between gap-1 rounded bg-white/80 p-2 text-[10px] text-gray-500 backdrop-blur-sm sm:bottom-6 sm:left-6 sm:right-6 sm:flex-row sm:items-center sm:gap-0 sm:p-3 sm:text-[11px]">
              <span className="font-medium">Generated by DocuSite</span>
              <span className="font-medium">Report Version 1.0</span>
            </div>
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
            onSelectFile?.({ id: f.id, name: f.name, category: fileListCategory?.category });
            setShowPdf(true);
            setFileListOpen(false);
            setFileListCategory(null);
          }}
        />

        <AddPicturesWithNotesModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setActiveImageAnnId(null);
          }}
          onAdd={async (pictures, description) => {
            if (!project?.id || !selectedFile?.id || !activeImageAnnId) {
              toast.error("Select or create an image marker on the PDF first.");
              setIsModalOpen(false);
              return;
            }

            const toastId = toast.loading("Uploading photo(s)...");
            try {
              const uploads = await Promise.all(
                pictures.map((file) =>
                  uploadProjectFilePhoto({
                    projectId: project.id,
                    pdfId: selectedFile.id,
                    file,
                    description,
                    annotationId: activeImageAnnId,
                  }),
                ),
              );

              const merged = history.annotations.map((ann) => {
                if (ann.type !== "image" || ann.id !== activeImageAnnId) return ann;
                const existing = Array.isArray(ann.images) ? ann.images : [];
                const additions = uploads.map((u) => ({ url: u.url, storageKey: u.storageKey, contentType: u.contentType }));
                const nextDesc = (description || "").trim() || ann.description || ann.content || "";
                return {
                  ...ann,
                  images: [...existing, ...additions],
                  description: nextDesc,
                  content: nextDesc,
                  updatedAt: Date.now(),
                };
              });

              history.apply(merged, true);

              const svc = artifacts.artifactServiceRef.current;
              if (svc) {
                const ann = merged.find((a) => a.type === "image" && a.id === activeImageAnnId) as ImageAnnotation | undefined;
                if (ann) {
                  const primary = ann.images?.[0]?.url || "";
                  svc
                    .saveCameraPin(ann.page || 1, {
                      id: ann.id,
                      position: { x: ann.x || 0, y: ann.y || 0 },
                      imagePath: primary,
                      createdAt: new Date(),
                      note: ann.description || "",
                    })
                    .catch(() => undefined);
                }
              }

              toast.success(
                uploads.length > 1 ? `${uploads.length} photos uploaded.` : "Photo uploaded.",
                { id: toastId },
              );
            } catch (err: any) {
              const code = err?.code || err?.message || "";
              const friendly =
                code.includes("permission-denied") ? "No permission to upload. Contact admin." :
                code.includes("unauthenticated") ? "Please login again." :
                code.includes("canceled") ? "Upload canceled." :
                code.includes("quota-exceeded") ? "Storage quota exceeded." :
                "Upload failed. Please try again.";
              toast.error(friendly, { id: toastId });
            } finally {
              setIsModalOpen(false);
              setActiveImageAnnId(null);
            }
          }}
        />
      </div>
    );
  }),
);

DocumentViewer.displayName = "DocumentViewer";
export default DocumentViewer;






