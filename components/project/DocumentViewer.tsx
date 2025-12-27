import React, { forwardRef, useState, useRef, useCallback, useEffect } from 'react';
import ProjectNotesSection from './ProjectNotesSection';
import SiteInspectionReportTemplate from './SiteInspectionReportTemplate';
import AddPicturesWithNotesModal from '@/components/modals/AddPicturesWithNotesModal';
import { CameraIcon } from 'lucide-react';
import PdfInlineViewer from '@/components/project/PdfInlineViewer';
import { useProjectFileUrl } from '@/hooks/useProjectFileUrl';
import { useProjectFiles } from '@/hooks/useProjectFiles';
import {
  PdfArtifactService,
  type PdfArtifactsByPage,
  type CameraPinInput,
  type StrokeInput,
  type PdfNoteInput,
  colorIntToHex,
} from '@/services/pdfArtifacts';
import { db } from '@/lib/firebase-client';
import { doc, getDoc } from 'firebase/firestore';

type StoredProject = {
  id: string;
  name: string;
  clientName?: string;
  status: 'in-progress' | 'completed' | 'cancelled';
  location: string;
  projectOwner?: string;
  deadline?: string;
  members?: number;
  raw?: any;
};

type Annotation = {
  id: string;
  type: 'text' | 'image' | 'note' | 'highlight' | 'shape' | 'draw';
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  imageUrl?: string;
  images?: { url: string; note?: string }[];
  currentImageIndex?: number;
  color?: string;
  pathData?: { x: number; y: number }[];
  // Normalized coordinates (relative to PDF page), optional for backward compatibility
  page?: number; // 1-based page number
  normX?: number; // 0..1 relative to page width
  normY?: number; // 0..1 relative to page height
  normW?: number; // 0..1 of page width
  normH?: number; // 0..1 of page height
  pathDataNorm?: { nx: number; ny: number }[]; // For drawings normalized to page
  penSize?: 'small' | 'medium' | 'large';
  // Mark brand‑new text nodes so we can remove empty ones on blur
  isNew?: boolean;
  // For image annotations: note position relative to image (0..1)
  noteRelX?: number;
  noteRelY?: number;
  // Absolute note position in PDF space (optional, for export/persistence)
  noteAbsX?: number;
  noteAbsY?: number;
};

type ReportAnnotation = {
  id: string;
  refId: string;
  page: number;
  location: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Closed';
  assignedTo: string;
  dateLogged: string;
  dueDate: string;
  category: 'Structural' | 'Architectural' | 'MEP';
};

interface DocumentViewerProps {
  project: StoredProject;
  selectedFile?: { id: string; name: string; category?: string } | null;
  notes: string[];
  selectedTool: 'text' | 'shape' | 'image' | 'note' | 'highlight' | 'draw' | 'eraser' | null;
  activeTab: 'view' | 'annotate';
  onAddNote: () => void;
  onAddImageNote: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSelectFile?: (file: { id: string; name: string; category?: string }) => void;
  penColor?: 'black' | 'red' | 'blue' | 'green' | 'yellow';
  penSize?: 'small' | 'medium' | 'large';
}

type DocumentViewerHandle = {
  undo: () => void;
  redo: () => void;
  addImageAnnotation: (imageUrl: string, note: string) => void;
  addMultipleImages: (imageUrls: string[], note: string) => void;
  addImagesWithUpload?: (files: File[], note: string) => void;
  addNoteAnnotation?: (text: string, x?: number, y?: number) => void;
  openCategory?: (name: string) => void;
  domRef: HTMLDivElement | null;
  exportPagesAsImages: () => Promise<{ width: number; height: number; dataUrl: string }[]>;
};

const DocumentViewer = forwardRef<DocumentViewerHandle, DocumentViewerProps>(
  ({ project, selectedFile, notes, selectedTool, activeTab, onAddNote, onAddImageNote, onUndo, onRedo, onSelectFile, penColor, penSize }, ref) => {
    const [showPdf, setShowPdf] = useState<boolean>(false);
    const { url: fileUrl, isLoading: isFileUrlLoading, error: fileUrlError } = useProjectFileUrl(project?.id, selectedFile?.name || null);
    const [isPdfLoaded, setIsPdfLoaded] = useState(false);

    useEffect(() => {
      if (isFileUrlLoading) {
        setIsPdfLoaded(false);
        return;
      }
      if (fileUrl || fileUrlError) {
        setIsPdfLoaded(true);
      }
    }, [isFileUrlLoading, fileUrl, fileUrlError]);
    const { files: projectFiles } = useProjectFiles(project?.id);

    // Auto-open viewer when switching to View tab and file exists
    useEffect(() => {
      if (activeTab === 'view' && fileUrl) {
        setShowPdf(true);
      }
    }, [activeTab, fileUrl]);
    const groupedByCategory = React.useMemo(() => {
      const map = new Map<string, { id: string; name: string }[]>();
      projectFiles.forEach((f) => {
        const cat = f.category || 'Others';
        const arr = map.get(cat) || [];
        arr.push({ id: f.id, name: f.name });
        map.set(cat, arr);
      });
      return map;
    }, [projectFiles]);
    const [isFileListOpen, setIsFileListOpen] = useState(false);
    const [fileListForCategory, setFileListForCategory] = useState<{ category: string; files: { id: string; name: string }[] } | null>(null);
    const handleCategoryClick = (category: string) => {
      const list = groupedByCategory.get(category) || [];
      if (list.length === 0) {
        setIsFileListOpen(false);
        setFileListForCategory(null);
        return;
      }
      if (list.length === 1) {
        const f = list[0];
        onSelectFile?.({ id: f.id, name: f.name, category });
        setShowPdf(true);
        setIsFileListOpen(false);
        setFileListForCategory(null);
        return;
      }
      setFileListForCategory({ category, files: list });
      setIsFileListOpen(true);
    };
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawingPath, setDrawingPath] = useState<{ x: number; y: number }[]>([]);
    const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
    const [resizingAnnotationId, setResizingAnnotationId] = useState<string | null>(null);
    const [resizeStart, setResizeStart] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    const [draggingAnnotationId, setDraggingAnnotationId] = useState<string | null>(null);
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const historyRef = useRef<Annotation[][]>([[]]);
    const historyIndexRef = useRef(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const domRef = useRef<HTMLDivElement>(null);
    const artifactServiceRef = useRef<PdfArtifactService | null>(null);
    const [artifactsLoaded, setArtifactsLoaded] = useState(false);
    const [artifactsError, setArtifactsError] = useState<string | null>(null);
    const [reportCustomData, setReportCustomData] = useState<Record<string, any>>({});
  const [draggingNote, setDraggingNote] = useState<{ id: string; offsetX: number; offsetY: number; rect: DOMRect } | null>(null);
  // PDF scroll container and offsets for anchoring annotations to PDF content
  const [pdfScrollEl, setPdfScrollEl] = useState<HTMLDivElement | null>(null);
  const [pdfScroll, setPdfScroll] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  // Offset of the PDF content (top-left of first page canvas) relative to domRef
  const [pdfContentOffset, setPdfContentOffset] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const [pageRects, setPageRects] = useState<Array<{ left: number; top: number; width: number; height: number }>>([]);
  const updatePageRects = useCallback(() => {
    const scroller = pdfScrollEl;
    const rootRect = domRef.current?.getBoundingClientRect();
    if (!scroller || !rootRect) { setPageRects([]); return; }
    const pages = Array.from(scroller.querySelectorAll('.react-pdf__Page')) as HTMLElement[];
    const rects = pages.map((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left - rootRect.left, top: r.top - rootRect.top, width: r.width, height: r.height };
    });
    setPageRects(rects);
  }, [pdfScrollEl]);
  useEffect(() => {
    if (!pdfScrollEl) return;
    const update = () => {
      const dr = domRef.current?.getBoundingClientRect();
      const firstPage = pdfScrollEl.querySelector('.react-pdf__Page') as HTMLElement | null;
      const pr = firstPage?.getBoundingClientRect();
      if (dr && pr) {
        setPdfContentOffset({ left: pr.left - dr.left, top: pr.top - dr.top });
      }
      setPdfScroll({ left: pdfScrollEl.scrollLeft, top: pdfScrollEl.scrollTop });
      updatePageRects();
    };
    // Initialize once
    update();
    pdfScrollEl.addEventListener('scroll', update, { passive: true } as any);
    window.addEventListener('resize', update);
    // Observe DOM changes inside the scroller to recompute page rects when pages render
    const mo = new MutationObserver(() => updatePageRects());
    mo.observe(pdfScrollEl, { childList: true, subtree: true });
    return () => {
      pdfScrollEl.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      mo.disconnect();
    };
  }, [pdfScrollEl, updatePageRects]);

  // Helpers to find the page under a client point and the first visible page
  const getPageIndexFromClientPoint = useCallback((clientX: number, clientY: number): number => {
    const rootRect = domRef.current?.getBoundingClientRect();
    if (!rootRect) return -1;
    for (let i = 0; i < pageRects.length; i++) {
      const pr = pageRects[i];
      const left = rootRect.left + pr.left;
      const top = rootRect.top + pr.top;
      if (clientX >= left && clientX <= left + pr.width && clientY >= top && clientY <= top + pr.height) return i;
    }
    return -1;
  }, [pageRects]);

  const getFirstVisiblePageIndex = useCallback((): number => {
    const scroller = pdfScrollEl;
    const rootRect = domRef.current?.getBoundingClientRect();
    if (!scroller || !rootRect || pageRects.length === 0) return 0;
    const sR = scroller.getBoundingClientRect();
    for (let i = 0; i < pageRects.length; i++) {
      const pr = pageRects[i];
      const top = rootRect.top + pr.top;
      const bottom = top + pr.height;
      if (bottom > sR.top && top < sR.bottom) return i;
    }
    return 0;
  }, [pdfScrollEl, pageRects]);

  // Transform a mouse event into coordinates in the PDF content space (scrollable content)
  const getPointInPdfSpace = useCallback((e: React.MouseEvent<any>) => {
    // Returns coordinates in the top-left origin of the first page (PDF-space)
    const scroller = pdfScrollEl;
    if (scroller) {
      const firstPage = scroller.querySelector('.react-pdf__Page') as HTMLElement | null;
      const pr = firstPage?.getBoundingClientRect();
      const sr = scroller.getBoundingClientRect();
      if (pr) {
        return { x: scroller.scrollLeft + (e.clientX - pr.left), y: scroller.scrollTop + (e.clientY - pr.top) };
      }
      return { x: scroller.scrollLeft + (e.clientX - sr.left), y: scroller.scrollTop + (e.clientY - sr.top) };
    }
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, [pdfScrollEl]);

  const getPointInPageSpace = useCallback((e: React.MouseEvent<any>, pageIndex: number) => {
    const rootRect = domRef.current?.getBoundingClientRect();
    if (!rootRect || !pageRects[pageIndex]) return { x: 0, y: 0 };
    const pr = pageRects[pageIndex];
    const left = rootRect.left + pr.left;
    const top = rootRect.top + pr.top;
    return { x: e.clientX - left, y: e.clientY - top };
  }, [pageRects]);

  const artifactsToAnnotations = useCallback((data: PdfArtifactsByPage): Annotation[] => {
    const result: Annotation[] = [];
    Object.entries(data).forEach(([pageKey, items]) => {
      const page = Number.parseInt(pageKey, 10) || 1;
      items.forEach((item) => {
        if (item.type === 'stroke') {
          const pts = item.points || [];
          if (pts.length < 2) return;
          const xs = pts.map((p) => p.x);
          const ys = pts.map((p) => p.y);
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);
          const width = Math.max(maxX - minX, 1);
          const height = Math.max(maxY - minY, 1);
          let penSize: Annotation['penSize'] = 'medium';
          const w = item.width ?? 3;
          if (w <= 2) penSize = 'small';
          else if (w >= 5) penSize = 'large';
          result.push({
            id: `stroke-${page}-${result.length}`,
            type: 'draw',
            x: minX,
            y: minY,
            width,
            height,
            color: colorIntToHex(item.color ?? 0xff000000),
            pathData: pts.map((p) => ({ x: p.x, y: p.y })),
            penSize,
            page,
          });
        } else if (item.type === 'annotation') {
          const isSticky = item.annType === 1;
          result.push({
            id: item.id,
            type: isSticky ? 'note' : 'text',
            x: item.position.x,
            y: item.position.y,
            width: item.width || (isSticky ? 200 : 120),
            height: item.height || (isSticky ? 60 : 32),
            content: item.text || '',
            color: colorIntToHex(item.color ?? 0xff000000),
            page,
          });
        } else if (item.type === 'cameraPin') {
          result.push({
            id: item.id,
            type: 'image',
            x: item.position.x,
            y: item.position.y,
            width: 300,
            height: 200,
            images: [{ url: item.imagePath, note: item.note }],
            currentImageIndex: 0,
            content: item.note || '',
            page,
          });
        }
      });
    });
    return result;
  }, []);

  useEffect(() => {
    if (!project?.id || !fileUrl || !selectedFile?.name || !isPdfLoaded) {
      artifactServiceRef.current = null;
      setArtifactsLoaded(false);
      setArtifactsError(null);
      return;
    }

    let cancelled = false;
    const svc = new PdfArtifactService({
      projectId: project.id,
      fileUrl,
      fileName: selectedFile.name,
    });
    artifactServiceRef.current = svc;
    setArtifactsLoaded(false);
    setArtifactsError(null);

    (async () => {
      try {
        await svc.init();
        const data = await svc.loadAll();
        if (cancelled) return;
        const fromArtifacts = artifactsToAnnotations(data);
        if (fromArtifacts.length) {
          setAnnotations((prev) => (prev.length ? prev : fromArtifacts));
          historyRef.current = [fromArtifacts];
          historyIndexRef.current = 0;
        }
        setArtifactsLoaded(true);
      } catch (e: any) {
        if (cancelled) return;
        setArtifactsError(e?.message || 'Failed to load annotations');
        setArtifactsLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [artifactsToAnnotations, fileUrl, isPdfLoaded, project?.id, selectedFile?.name]);

  useEffect(() => {
    let cancelled = false;
    const loadMeta = async () => {
      if (!project?.id) {
        setReportCustomData({});
        return;
      }
      try {
        const ref = doc(db, 'projects', project.id);
        const snap = await getDoc(ref);
        if (!snap.exists() || cancelled) {
          if (!snap.exists()) setReportCustomData({});
          return;
        }
        const data = snap.data() as any;
        const extra =
          data && typeof data.extraFields === 'object' && data.extraFields
            ? (data.extraFields as Record<string, unknown>)
            : {};
        setReportCustomData({
          inspector: String(extra.inspector || ''),
          weather: String(extra.weather || ''),
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

    const reportAnnotations: ReportAnnotation[] = React.useMemo(() => {
      const notes = annotations.filter(a => a.type === 'note' || a.type === 'text');
      return notes.map((a, index) => ({
        id: a.id,
        refId: `ISS-${(index + 1).toString().padStart(3, '0')}`,
        page: a.page || 1,
        location: `Page ${a.page || 1}`,
        description: a.content || 'Annotation',
        status: 'Open',
        assignedTo: 'Unassigned',
        dateLogged: new Date().toLocaleDateString(),
        dueDate: '',
        category: 'Structural',
      }));
    }, [annotations]);

    const photos = React.useMemo(
      () =>
        annotations
          .filter(a => a.type === 'image')
          .map((a, index) => ({
            id: a.id,
            refId: `PHOTO-${(index + 1).toString().padStart(3, '0')}`,
            description: a.content || 'Attached photo',
          })),
      [annotations],
    );

    // Save state to history
    const saveToHistory = useCallback((newAnnotations: Annotation[]) => {
      const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
      newHistory.push([...newAnnotations]);
      historyRef.current = newHistory.slice(-50); // Keep only last 50 states
      historyIndexRef.current = Math.min(historyIndexRef.current + 1, 49);
    }, []);

    // Undo function
    const handleUndo = useCallback(() => {
      if (historyIndexRef.current > 0) {
        historyIndexRef.current = historyIndexRef.current - 1;
        setAnnotations([...historyRef.current[historyIndexRef.current]]);
        onUndo();
      }
    }, [onUndo]);

    // Redo function
    const handleRedo = useCallback(() => {
      if (historyIndexRef.current < historyRef.current.length - 1) {
        historyIndexRef.current = historyIndexRef.current + 1;
        setAnnotations([...historyRef.current[historyIndexRef.current]]);
        onRedo();
      }
    }, [onRedo]);

    // Expose undo/redo functions to parent
    const addImageAnnotation = useCallback((imageUrl: string, note: string) => {
      const trimmed = (note || '').trim();

      // Always create a new image annotation so multiple uploads coexist
      const pageIdx = getFirstVisiblePageIndex();
      const pr = pageRects[pageIdx] || ({} as { width: number; height: number });
      const pWidth = pr.width || 900;
      const pHeight = pr.height || 600;

      const normW = 300 / Math.max(1, pWidth);
      const normH = 200 / Math.max(1, pHeight);
      const normX = 0.5 - (300 / 2) / Math.max(1, pWidth);
      const normY = 0.5 - (200 / 2) / Math.max(1, pHeight);

      // Compute initial absolute PDF-space coordinates for the image top-left
      const pageLeftPdf = (pr.left - pdfContentOffset.left) + pdfScroll.left;
      const pageTopPdf = (pr.top - pdfContentOffset.top) + pdfScroll.top;
      const absX = pageLeftPdf + normX * pWidth;
      const absY = pageTopPdf + normY * pHeight;

      const newAnnotation: Annotation = {
        id: Date.now().toString(),
        type: 'image',
        x: absX,
        y: absY,
        width: 300,
        height: 200,
        images: [{ url: imageUrl, note: trimmed }],
        currentImageIndex: 0,
        content: trimmed,
        noteRelX: 0.5,
        noteRelY: 0.5,
        page: pageIdx + 1,
        normX,
        normY,
        normW,
        normH,
      };
      
      const newAnnotations = [...annotations, newAnnotation];
      setAnnotations(newAnnotations);
      saveToHistory(newAnnotations);
    }, [annotations, saveToHistory, getFirstVisiblePageIndex, pageRects]);

    const addMultipleImages = useCallback((imageUrls: string[], note: string) => {
      const trimmed = (note || '').trim();

      if (!imageUrls || imageUrls.length === 0) return;

      const pageIdx = getFirstVisiblePageIndex();
      const pr = pageRects[pageIdx] || ({} as { width: number; height: number });
      const pWidth = pr.width || 900;
      const pHeight = pr.height || 600;

      // Base normalized position roughly centered on the page
      const baseNormX = 0.5 - (300 / 2) / Math.max(1, pWidth);
      const baseNormY = 0.5 - (200 / 2) / Math.max(1, pHeight);
      const baseNormW = 300 / Math.max(1, pWidth);
      const baseNormH = 200 / Math.max(1, pHeight);

      // Base absolute PDF-space position for the first image
      const pageLeftPdf = (pr.left - pdfContentOffset.left) + pdfScroll.left;
      const pageTopPdf = (pr.top - pdfContentOffset.top) + pdfScroll.top;

      // Create one independent image annotation per URL
      const imageAnnotations: Annotation[] = imageUrls.map((url, index) => {
        // Slight offset per image so they don't all stack perfectly; still normalized
        const normX = baseNormX;
        const normY = baseNormY;
        const absX = pageLeftPdf + normX * pWidth;
        const absY = pageTopPdf + normY * pHeight;

        return {
          id: `${Date.now()}-${index}`,
          type: 'image',
          x: absX,
          y: absY,
          width: 300,
          height: 200,
          images: [{ url, note: trimmed }],
          currentImageIndex: 0,
          content: trimmed,
          noteRelX: 0.5,
          noteRelY: 0.5,
          page: pageIdx + 1,
          normX,
          normY,
          normW: baseNormW,
          normH: baseNormH,
        };
      });
      
      const newAnnotations = [...annotations, ...imageAnnotations];
      setAnnotations(newAnnotations);
      saveToHistory(newAnnotations);
    }, [annotations, saveToHistory, getFirstVisiblePageIndex, pageRects, pdfContentOffset.left, pdfContentOffset.top, pdfScroll.left, pdfScroll.top]);

    const addImagesWithUpload = useCallback(
      async (files: File[], note: string) => {
        if (!files || files.length === 0) return;
        const svc = artifactServiceRef.current;
        if (!svc) return;

        const trimmed = (note || '').trim();
        const pageIdx = getFirstVisiblePageIndex();
        const pr = pageRects[pageIdx] || ({} as { width: number; height: number; left: number; top: number });
        const pWidth = pr.width || 900;
        const pHeight = pr.height || 600;

        const normW = 300 / Math.max(1, pWidth);
        const normH = 200 / Math.max(1, pHeight);
        const normX = 0.5 - (300 / 2) / Math.max(1, pWidth);
        const normY = 0.5 - (200 / 2) / Math.max(1, pHeight);

        const pageLeftPdf = (pr.left - pdfContentOffset.left) + pdfScroll.left;
        const pageTopPdf = (pr.top - pdfContentOffset.top) + pdfScroll.top;
        const baseAbsX = pageLeftPdf + normX * pWidth;
        const baseAbsY = pageTopPdf + normY * pHeight;

        const nextAnnotations = [...annotations];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const pinId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          let remoteUrl = '';
          try {
            remoteUrl = await svc.uploadCameraImage(pageIdx + 1, pinId, file);
          } catch {
            continue;
          }

          const annotation: Annotation = {
            id: pinId,
            type: 'image',
            x: baseAbsX,
            y: baseAbsY,
            width: 300,
            height: 200,
            images: [{ url: remoteUrl, note: trimmed }],
            currentImageIndex: 0,
            content: trimmed,
            noteRelX: 0.5,
            noteRelY: 0.5,
            page: pageIdx + 1,
            normX,
            normY,
            normW,
            normH,
          };
          nextAnnotations.push(annotation);

          const pin: CameraPinInput = {
            id: pinId,
            position: { x: baseAbsX, y: baseAbsY },
            imagePath: remoteUrl,
            createdAt: new Date(),
            note: trimmed,
          };

          svc.saveCameraPin(pageIdx + 1, pin).catch(() => undefined);
        }

        setAnnotations(nextAnnotations);
        saveToHistory(nextAnnotations);
      },
      [annotations, getFirstVisiblePageIndex, pageRects, pdfContentOffset.left, pdfScroll.left, pdfScroll.top, saveToHistory],
    );

    React.useImperativeHandle(ref, () => ({
      undo: handleUndo,
      redo: handleRedo,
      addImageAnnotation,
      addMultipleImages,
      addImagesWithUpload,
      domRef: domRef.current,
      openCategory: (category: string) => handleCategoryClick(category),
      addNoteAnnotation: (text: string, x?: number, y?: number) => {
        // Place on first visible page using normalized coordinates
        const pageIdx = getFirstVisiblePageIndex();
        const pr = pageRects[pageIdx] || ({} as { width: number; height: number });
        const pWidth = pr.width || 800;
        const pHeight = pr.height || 1000;
        const marginX = 60, marginY = 100;
        const nxNorm = Math.max(0, Math.min(1, (typeof x === 'number' ? x : marginX) / Math.max(1, pWidth)));
        const nyNorm = Math.max(0, Math.min(1, (typeof y === 'number' ? y : marginY) / Math.max(1, pHeight)));
        const pageLeftPdf = (pr.left - pdfContentOffset.left) + pdfScroll.left;
        const pageTopPdf = (pr.top - pdfContentOffset.top) + pdfScroll.top;
        const absX = pageLeftPdf + nxNorm * pWidth;
        const absY = pageTopPdf + nyNorm * pHeight;
        const note: Annotation = {
          id: `${Date.now()}-note`,
          type: 'note',
          x: absX,
          y: absY,
          width: 200,
          height: 60,
          content: text || '',
          color: '#000000',
          isNew: !(text && text.trim().length > 0),
          page: pageIdx + 1,
          normX: nxNorm,
          normY: nyNorm,
          normW: 200 / Math.max(1, pWidth),
          normH: 60 / Math.max(1, pHeight),
        };
        const next = [...annotations, note];
        setAnnotations(next);
        saveToHistory(next);
        if (artifactServiceRef.current) {
          const input: PdfNoteInput = {
            id: note.id,
            annType: 1,
            position: { x: note.x, y: note.y },
            text: note.content || '',
            color: note.color || '#000000',
            width: note.width || 200,
            height: note.height || 60,
          };
          artifactServiceRef.current
            .createNote(pageIdx + 1, input)
            .catch(() => undefined);
        }
      },
      exportPagesAsImages: async () => {
        // Preferred: capture the full annotation container including footer
        const element = domRef.current;
        try {
          if (element) {
            const { default: html2canvas } = await import('html2canvas');
            // Temporarily expand PDF scroller to show all content and force black text for editable notes
            const scroller = pdfScrollEl;
            const prevOverflow = scroller ? scroller.style.overflow : '';
            const prevHeight = scroller ? scroller.style.height : '';
            if (scroller) {
              scroller.style.overflow = 'visible';
              scroller.style.height = scroller.scrollHeight + 'px';
            }
            // Scope forced black text to the export element only
            const scopeAttr = 'data-export-scope';
            const prevScope = element.getAttribute(scopeAttr);
            element.setAttribute(scopeAttr, '1');
            const headStyle = document.createElement('style');
            headStyle.textContent = `
              [data-export-scope="1"] [contenteditable] { color:#000 !important; -webkit-text-fill-color:#000 !important; }
            `;
            document.head.appendChild(headStyle);
            // Let layout settle
            await new Promise(requestAnimationFrame);
            const canvas = await html2canvas(element, {
              backgroundColor: '#ffffff',
              scale: 2,
              useCORS: true,
              scrollX: 0,
              scrollY: 0,
              windowWidth: Math.max(element.scrollWidth, window.innerWidth),
              windowHeight: Math.max(element.scrollHeight, window.innerHeight),
            });
            // Cleanup temporary changes
            if (scroller) {
              scroller.style.overflow = prevOverflow;
              scroller.style.height = prevHeight;
            }
            if (prevScope === null) {
              element.removeAttribute(scopeAttr);
            } else {
              element.setAttribute(scopeAttr, prevScope);
            }
            document.head.removeChild(headStyle);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
            return [{ width: canvas.width, height: canvas.height, dataUrl }];
          }
        } catch (e) {
          // Fallback to page-by-page export if full container capture fails
          console.warn('Full container export failed, falling back to per-page export:', e);
        }

        const scroller = pdfScrollEl;
        if (!scroller) return [];
        const pages = Array.from(scroller.querySelectorAll('.react-pdf__Page')) as HTMLElement[];
        if (pages.length === 0) return [];
        const { default: html2canvas } = await import('html2canvas');
        const scratchRoot = document.createElement('div');
        scratchRoot.style.position = 'fixed';
        scratchRoot.style.left = '-10000px';
        scratchRoot.style.top = '0';
        scratchRoot.style.width = '0';
        scratchRoot.style.height = '0';
        scratchRoot.style.pointerEvents = 'none';
        document.body.appendChild(scratchRoot);

        const results: { width: number; height: number; dataUrl: string }[] = [];
        // Ensure we can force black text during export without affecting UI
        const styleEl = document.createElement('style');
        styleEl.textContent = `.export-force-black{color:#000 !important;-webkit-text-fill-color:#000 !important;}`;
        scratchRoot.appendChild(styleEl);

        // Helper to compute page origin in PDF space (scrollable content coordinates)
        const scrollerRect = scroller.getBoundingClientRect();

        // Ensure any in‑progress editable content is flushed into the annotations snapshot
        let anns = annotations;
        try {
          if (editingAnnotationId) {
            const active = document.activeElement as HTMLElement | null;
            if (active && (active.isContentEditable || active.tagName === 'TEXTAREA')) {
              const liveText = (active as HTMLElement).textContent || (active as HTMLTextAreaElement).value || '';
              const trimmed = liveText.trim();
              if (trimmed.length >= 0) {
                anns = annotations.map(a => a.id === editingAnnotationId ? { ...a, content: liveText } : a);
              }
            }
          }
        } catch {}

        for (let i = 0; i < pages.length; i++) {
          const pageEl = pages[i] as HTMLElement;
          const pageRect = pageEl.getBoundingClientRect();
          const pageX_pdf = scroller.scrollLeft + (pageRect.left - scrollerRect.left);
          const pageY_pdf = scroller.scrollTop + (pageRect.top - scrollerRect.top);

          const canvasEl = pageEl.querySelector('canvas') as HTMLCanvasElement | null;
          const cssWidth = pageEl.clientWidth || (canvasEl ? canvasEl.width : 900);
          const cssHeight = pageEl.clientHeight || (canvasEl ? canvasEl.height : 1200);

          const wrapper = document.createElement('div');
          wrapper.style.position = 'relative';
          wrapper.style.width = cssWidth + 'px';
          wrapper.style.height = cssHeight + 'px';
          wrapper.style.background = '#ffffff';

          // Background: page raster from existing canvas
          if (canvasEl) {
            const img = new Image();
            try { img.crossOrigin = 'anonymous'; } catch {}
            img.src = canvasEl.toDataURL('image/png');
            img.style.position = 'absolute';
            img.style.left = '0';
            img.style.top = '0';
            img.style.width = '100%';
            img.style.height = '100%';
            wrapper.appendChild(img);
          }

          // Overlay container for annotations
          const overlay = document.createElement('div');
          overlay.style.position = 'absolute';
          overlay.style.left = '0';
          overlay.style.top = '0';
          overlay.style.width = '100%';
          overlay.style.height = '100%';

          // Vector drawing overlay (single svg for all draw paths on this page)
          const svgNS = 'http://www.w3.org/2000/svg';
          const svg = document.createElementNS(svgNS, 'svg');
          svg.setAttribute('width', String(cssWidth));
          svg.setAttribute('height', String(cssHeight));
          svg.style.position = 'absolute';
          svg.style.left = '0';
          svg.style.top = '0';

          const penSizes: Record<string, number> = { small: 2, medium: 4, large: 6 };

          // Place each annotation if it is on this page
          anns.forEach((a) => {
            const hasNorm = typeof a.normX === 'number' && typeof a.normY === 'number' && typeof a.page === 'number';
            const isOnThisPage = hasNorm ? (a.page === (i + 1)) : true;
            if (!isOnThisPage) return;
            const aw = a.width ?? (a.type === 'text' ? 100 : a.type === 'image' ? 300 : 100);
            const ah = a.height ?? (a.type === 'text' ? 30 : a.type === 'image' ? 200 : 30);
            let relLeft: number;
            let relTop: number;
            let outW: number = aw;
            let outH: number = ah;
            // For images we prefer absolute x/y (PDF-space) to match on-screen positions exactly
            const useNormForPosition = hasNorm && a.type !== 'image';

            if (useNormForPosition) {
              relLeft = Math.max(0, (a.normX || 0) * cssWidth);
              relTop = Math.max(0, (a.normY || 0) * cssHeight);
              if (typeof a.normW === 'number') outW = Math.max(1, a.normW * cssWidth);
              if (typeof a.normH === 'number') outH = Math.max(1, a.normH * cssHeight);
            } else {
              const intersects = (a.x + aw > pageX_pdf) && (a.x < pageX_pdf + cssWidth) && (a.y + ah > pageY_pdf) && (a.y < pageY_pdf + cssHeight);
              if (!intersects) return;
              relLeft = Math.max(0, a.x - pageX_pdf);
              relTop = Math.max(0, a.y - pageY_pdf);
            }

            if (a.type === 'draw' && a.pathData && a.pathData.length > 1) {
              const path = document.createElementNS(svgNS, 'path');
              let d: string;
              if (a.pathDataNorm && hasNorm && a.page === (i + 1)) {
                d = a.pathDataNorm.reduce((acc, p, idx) => {
                  const lx = (p.nx || 0) * cssWidth;
                  const ly = (p.ny || 0) * cssHeight;
                  return idx === 0 ? `M ${lx} ${ly}` : `${acc} L ${lx} ${ly}`;
                }, '');
              } else {
                d = a.pathData.reduce((pathStr, p, idx) => {
                  const lx = p.x - pageX_pdf;
                  const ly = p.y - pageY_pdf;
                  return idx === 0 ? `M ${lx} ${ly}` : `${pathStr} L ${lx} ${ly}`;
                }, '');
              }
              path.setAttribute('d', d);
              path.setAttribute('stroke', a.color || '#000000');
              path.setAttribute('stroke-width', String(a.penSize ? penSizes[a.penSize] : penSizes.medium));
              path.setAttribute('fill', 'none');
              path.setAttribute('stroke-linecap', 'round');
              path.setAttribute('stroke-linejoin', 'round');
              svg.appendChild(path);
              return;
            }

            if (a.type === 'image' && a.images && a.images[0]?.url) {
              const img = new Image();
              try { img.crossOrigin = 'anonymous'; } catch {}
              img.src = a.images[0].url;
              img.style.position = 'absolute';
              img.style.left = relLeft + 'px';
              img.style.top = relTop + 'px';
              img.style.width = (typeof a.normW === 'number' ? a.normW * cssWidth : (a.width || 300)) + 'px';
              img.style.height = (typeof a.normH === 'number' ? a.normH * cssHeight : (a.height || 200)) + 'px';
              overlay.appendChild(img);

              // Optional: image note bubble
              const bubbleText = (a.content || '').trim();
              if (bubbleText) {
                const bubble = document.createElement('div');
                bubble.textContent = bubbleText;
                bubble.style.position = 'absolute';
                const bx = (a.noteRelX ?? 0.5) * (a.width || 300);
                const by = (a.noteRelY ?? 0.5) * (a.height || 200);
                bubble.style.left = (relLeft + bx - 20) + 'px';
                bubble.style.top = (relTop + by - 20) + 'px';
                bubble.style.fontSize = '11px';
                bubble.style.background = 'rgba(255,255,255,0.9)';
                bubble.style.padding = '2px 6px';
                bubble.style.border = '1px solid rgba(0,0,0,0.15)';
                bubble.style.borderRadius = '4px';
                bubble.classList.add('export-force-black');
                overlay.appendChild(bubble);
              }
              return;
            }

            if (a.type === 'highlight') {
              const div = document.createElement('div');
              div.style.position = 'absolute';
              div.style.left = relLeft + 'px';
              div.style.top = relTop + 'px';
              div.style.width = (typeof a.normW === 'number' ? a.normW * cssWidth : (a.width || 100)) + 'px';
              div.style.height = (typeof a.normH === 'number' ? a.normH * cssHeight : (a.height || 20)) + 'px';
              div.style.background = 'rgba(77,145,219,0.5)';
              overlay.appendChild(div);
              return;
            }

            if (a.type === 'shape') {
              const div = document.createElement('div');
              div.style.position = 'absolute';
              div.style.left = relLeft + 'px';
              div.style.top = relTop + 'px';
              div.style.width = (typeof a.normW === 'number' ? a.normW * cssWidth : (a.width || 50)) + 'px';
              div.style.height = (typeof a.normH === 'number' ? a.normH * cssHeight : (a.height || 50)) + 'px';
              div.style.border = '2px solid #ff0000';
              div.style.borderRadius = '4px';
              overlay.appendChild(div);
              return;
            }

            if (a.type === 'text' || a.type === 'note') {
              const div = document.createElement('div');
              div.style.position = 'absolute';
              div.style.left = relLeft + 'px';
              div.style.top = relTop + 'px';
              div.style.width = (typeof a.normW === 'number' ? a.normW * cssWidth : (a.width || (a.type === 'text' ? 100 : 200))) + 'px';
              // Height will auto-expand to content; set min height
              div.style.minHeight = (typeof a.normH === 'number' ? a.normH * cssHeight : (a.height || (a.type === 'text' ? 30 : 40))) + 'px';
              div.style.padding = '6px 8px';
              div.style.boxSizing = 'border-box';
              div.style.fontSize = '13px';
              div.style.lineHeight = '1.2';
              div.style.whiteSpace = 'pre-wrap';
              div.classList.add('export-force-black');
              if (a.type === 'note') {
                div.style.background = 'rgba(255,255,200,0.9)';
                div.style.border = '2px solid rgba(59,130,246,0.6)';
              } else {
                div.style.background = 'transparent';
                div.style.border = '2px solid rgba(59,130,246,0.6)';
              }
              div.textContent = a.content || '';
              overlay.appendChild(div);
              return;
            }
          });

          overlay.appendChild(svg);
          wrapper.appendChild(overlay);
          scratchRoot.appendChild(wrapper);

          const canvas = await html2canvas(wrapper, { backgroundColor: '#ffffff', scale: 2, useCORS: true });
          const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
          results.push({ width: cssWidth, height: cssHeight, dataUrl });

          scratchRoot.removeChild(wrapper);
        }

        document.body.removeChild(scratchRoot);
        return results;
      },
    }));

    // Check if point is near a drawn line for eraser
    const isPointNearLine = useCallback((point: { x: number; y: number }, annotation: Annotation) => {
      if (annotation.type !== 'draw' || !annotation.pathData) return false;
      
      const threshold = 10; // Eraser radius
      for (let i = 0; i < annotation.pathData.length - 1; i++) {
        const p1 = annotation.pathData[i];
        const p2 = annotation.pathData[i + 1];
        
        // Distance from point to line segment
        const A = point.x - p1.x;
        const B = point.y - p1.y;
        const C = p2.x - p1.x;
        const D = p2.y - p1.y;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        
        if (lenSq !== 0) {
          param = dot / lenSq;
        }
        
        let xx, yy;
        if (param < 0) {
          xx = p1.x;
          yy = p1.y;
        } else if (param > 1) {
          xx = p2.x;
          yy = p2.y;
        } else {
          xx = p1.x + param * C;
          yy = p1.y + param * D;
        }
        
        const dx = point.x - xx;
        const dy = point.y - yy;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= threshold) {
          return true;
        }
      }
      return false;
    }, []);

    const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      // Don't handle clicks in view mode
      if (activeTab === 'view') return;
      
      // Don't handle clicks if we're drawing
      if (isDrawing) return;

      if (!selectedTool) return;

      // If click isn't inside the PDF scroller area, ignore
      if (pdfScrollEl) {
        const r = pdfScrollEl.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
      }
      const { x, y } = getPointInPdfSpace(e);

      // Only handle specific tools that create annotations on click
      if (selectedTool === 'text') {
        // Create text box on single click
        const pageIdx = getPageIndexFromClientPoint(e.clientX, e.clientY);
        const pr = pageRects[pageIdx] || { width: 1, height: 1, left: 0, top: 0 };
        const local = getPointInPageSpace(e, pageIdx >= 0 ? pageIdx : 0);
        const newAnnotation: Annotation = {
          id: Date.now().toString(),
          type: 'text',
          x,
          y,
          width: 120,
          height: 32,
          content: '',
          color: '#000000',
          isNew: true,
          page: (pageIdx >= 0 ? pageIdx : 0) + 1,
          normX: Math.max(0, Math.min(1, local.x / Math.max(1, pr.width))),
          normY: Math.max(0, Math.min(1, local.y / Math.max(1, pr.height))),
          normW: 120 / Math.max(1, pr.width),
          normH: 32 / Math.max(1, pr.height),
        };
        const newAnnotations = [...annotations, newAnnotation];
        setAnnotations(newAnnotations);
        saveToHistory(newAnnotations);
        setEditingAnnotationId(newAnnotation.id);
        if (artifactServiceRef.current) {
          const input: PdfNoteInput = {
            id: newAnnotation.id,
            annType: 0,
            position: { x: newAnnotation.x, y: newAnnotation.y },
            text: newAnnotation.content || '',
            color: newAnnotation.color || '#000000',
            width: newAnnotation.width || 120,
            height: newAnnotation.height || 32,
          };
          artifactServiceRef.current
            .createNote(newAnnotation.page || 1, input)
            .catch(() => undefined);
        }
      } else if (selectedTool === 'highlight') {
        const pageIdx = getPageIndexFromClientPoint(e.clientX, e.clientY);
        const pr = pageRects[pageIdx] || { width: 1, height: 1, left: 0, top: 0 };
        const local = getPointInPageSpace(e, pageIdx >= 0 ? pageIdx : 0);
        const newAnnotation: Annotation = {
          id: Date.now().toString(),
          type: 'highlight',
          x,
          y,
          width: 100,
          height: 20,
          color: '#4D91DB',
          page: (pageIdx >= 0 ? pageIdx : 0) + 1,
          normX: Math.max(0, Math.min(1, local.x / Math.max(1, pr.width))),
          normY: Math.max(0, Math.min(1, local.y / Math.max(1, pr.height))),
          normW: 100 / Math.max(1, pr.width),
          normH: 20 / Math.max(1, pr.height),
        };
        const newAnnotations = [...annotations, newAnnotation];
        setAnnotations(newAnnotations);
        saveToHistory(newAnnotations);
      } else if (selectedTool === 'shape') {
        const pageIdx = getPageIndexFromClientPoint(e.clientX, e.clientY);
        const pr = pageRects[pageIdx] || { width: 1, height: 1, left: 0, top: 0 };
        const local = getPointInPageSpace(e, pageIdx >= 0 ? pageIdx : 0);
        const newAnnotation: Annotation = {
          id: Date.now().toString(),
          type: 'shape',
          x,
          y,
          width: 50,
          height: 50,
          color: '#ff0000',
          page: (pageIdx >= 0 ? pageIdx : 0) + 1,
          normX: Math.max(0, Math.min(1, local.x / Math.max(1, pr.width))),
          normY: Math.max(0, Math.min(1, local.y / Math.max(1, pr.height))),
          normW: 50 / Math.max(1, pr.width),
          normH: 50 / Math.max(1, pr.height),
        };
        const newAnnotations = [...annotations, newAnnotation];
        setAnnotations(newAnnotations);
        saveToHistory(newAnnotations);
      } else if (selectedTool === 'eraser') {
        // Hit-test draw annotations and remove only the first matching stroke
        const hitIndex = annotations.findIndex(annotation => {
          if (annotation.type !== 'draw' || !annotation.pathData) return false;
          return isPointNearLine({ x, y }, annotation);
        });

        if (hitIndex !== -1) {
          const newAnnotations = annotations.filter((_, index) => index !== hitIndex);
          setAnnotations(newAnnotations);
          saveToHistory(newAnnotations);
        }
      }
    }, [activeTab, selectedTool, isDrawing, annotations, saveToHistory, isPointNearLine]);

    const getAnnotationScreenBox = useCallback((a: Annotation): { left: number; top: number; width: number; height: number } => {
      if (a.page && pageRects[a.page - 1] && typeof a.normX === 'number' && typeof a.normY === 'number') {
        const pr = pageRects[a.page - 1];
        const left = pr.left + (a.normX * pr.width);
        const top = pr.top + (a.normY * pr.height);
        const width = typeof a.normW === 'number' ? a.normW * pr.width : (a.width || 100);
        const height = typeof a.normH === 'number' ? a.normH * pr.height : (a.height || 30);
        return { left, top, width, height };
      }
      return {
        left: pdfContentOffset.left + (a.x || 0) - pdfScroll.left,
        top: pdfContentOffset.top + (a.y || 0) - pdfScroll.top,
        width: a.width || (a.type === 'text' ? 100 : 300),
        height: a.height || (a.type === 'text' ? 30 : 200),
      };
    }, [pageRects, pdfContentOffset.left, pdfContentOffset.top, pdfScroll.left]);

    // Track which page a stroke starts on to normalize correctly
    const drawingPageIdxRef = useRef<number | null>(null);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      // Don't handle drawing in view mode
      if (activeTab === 'view') return;
      
      if (pdfScrollEl) {
        const r = pdfScrollEl.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
      }
      const { x, y } = getPointInPdfSpace(e);

      // Pointer position in the same coordinate space as getAnnotationScreenBox (relative to domRef)
      const rootRect = domRef.current?.getBoundingClientRect();
      const hitX = rootRect ? e.clientX - rootRect.left : x;
      const hitY = rootRect ? e.clientY - rootRect.top : y;
      
      // Check if we should start drawing
      const shouldDraw = selectedTool === 'draw';
      
      if (shouldDraw) {
        e.preventDefault();
        // Remember which page drawing started on (client coordinates)
        drawingPageIdxRef.current = getPageIndexFromClientPoint(e.clientX, e.clientY);
        setIsDrawing(true);
        setDrawingPath([{ x, y }]);
      } else if (selectedTool === 'eraser') {
        // Check if clicking on a text box or image to delete it
        const clickedAnnotation = annotations.find(annotation => {
          if (!(annotation.type === 'text' || annotation.type === 'image' || annotation.type === 'note')) return false;
          const box = getAnnotationScreenBox(annotation);
          return hitX >= box.left && hitX <= box.left + box.width && hitY >= box.top && hitY <= box.top + box.height;
        });
        
        if (clickedAnnotation) {
          const newAnnotations = annotations.filter(a => a.id !== clickedAnnotation.id);
          setAnnotations(newAnnotations);
          saveToHistory(newAnnotations);
          if (artifactServiceRef.current && clickedAnnotation.page) {
            if (clickedAnnotation.type === 'text' || clickedAnnotation.type === 'note') {
              artifactServiceRef.current
                .deleteNote(clickedAnnotation.page, clickedAnnotation.id)
                .catch(() => undefined);
            } else if (clickedAnnotation.type === 'image') {
              artifactServiceRef.current
                .deleteCameraPin(clickedAnnotation.page, clickedAnnotation.id)
                .catch(() => undefined);
            }
          }
        }
      } else {
        // Check if clicking on resize handle of text box or image (works for any tool or no tool)
        const clickedResizeAnnotation = annotations.find(annotation => {
          if (!(annotation.type === 'text' || annotation.type === 'image' || annotation.type === 'note')) return false;
          const box = getAnnotationScreenBox(annotation);
          return (
            hitX >= box.left + box.width - 10 && hitX <= box.left + box.width + 10 &&
            hitY >= box.top + box.height - 10 && hitY <= box.top + box.height + 10
          );
        });
        
        if (clickedResizeAnnotation) {
          e.preventDefault();
          setResizingAnnotationId(clickedResizeAnnotation.id);
          setResizeStart({
            x: x,
            y: y,
            width: getAnnotationScreenBox(clickedResizeAnnotation).width,
            height: getAnnotationScreenBox(clickedResizeAnnotation).height
          });
        } else {
          // Check if clicking on draggable area of text box or image (works for any tool or no tool)
          const clickedDragAnnotation = annotations.find(annotation => {
            if (!(annotation.type === 'text' || annotation.type === 'image' || annotation.type === 'note')) return false;
            const box = getAnnotationScreenBox(annotation);
            return hitX >= box.left && hitX <= box.left + box.width && hitY >= box.top && hitY <= box.top + box.height;
          });
          
          if (clickedDragAnnotation) {
            e.preventDefault();
            e.stopPropagation();
            
            setDraggingAnnotationId(clickedDragAnnotation.id);
            // For images, track pointer offset inside the annotation so dragging is smooth
            if (clickedDragAnnotation.type === 'image' && clickedDragAnnotation.page && typeof clickedDragAnnotation.normX === 'number' && typeof clickedDragAnnotation.normY === 'number') {
              const pageIdx = clickedDragAnnotation.page - 1;
              const pr = pageRects[pageIdx];
              const rootRect = domRef.current?.getBoundingClientRect();
              if (pr && rootRect) {
                const pageLeft = rootRect.left + pr.left;
                const pageTop = rootRect.top + pr.top;
                const pointerLocalX = e.clientX - pageLeft;
                const pointerLocalY = e.clientY - pageTop;
                const annotationLeftLocal = clickedDragAnnotation.normX * pr.width;
                const annotationTopLocal = clickedDragAnnotation.normY * pr.height;
                const offsetX = pointerLocalX - annotationLeftLocal;
                const offsetY = pointerLocalY - annotationTopLocal;
                setDragStart({ x: offsetX, y: offsetY });
              } else {
                setDragStart({ x, y });
              }
            } else {
              // Fallback for non-image annotations: keep previous behavior
              setDragStart({ x, y });
            }
            try { document.body.style.userSelect = 'none'; } catch {}
            return; // Exit early to prevent other handlers
          }
        }
      }
    }, [activeTab, selectedTool, annotations, saveToHistory, getAnnotationScreenBox, getPageIndexFromClientPoint, pageRects]);

    // Note creation is now triggered only via modal Add button using addNoteAnnotation


    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      
      
      if (isDrawing) {
        e.preventDefault();
        const { x, y } = getPointInPdfSpace(e);
        setDrawingPath(prev => [...prev, { x, y }]);
      } else if (resizingAnnotationId && resizeStart) {
        e.preventDefault();
        const { x: currentX, y: currentY } = getPointInPdfSpace(e);
        
        const resizingAnnotation = annotations.find(a => a.id === resizingAnnotationId);
        const minWidth = resizingAnnotation?.type === 'image' ? 100 : 50;
        const minHeight = resizingAnnotation?.type === 'image' ? 100 : 30;
        
        const newWidth = Math.max(currentX - resizeStart.x, minWidth);
        const newHeight = Math.max(currentY - resizeStart.y, minHeight);
        
        const updatedAnnotations = annotations.map(annotation => {
          if (annotation.id !== resizingAnnotationId) return annotation;
          let normW = annotation.normW;
          let normH = annotation.normH;
          if (annotation.page && pageRects[annotation.page - 1]) {
            const pr = pageRects[annotation.page - 1];
            normW = newWidth / Math.max(1, pr.width);
            normH = newHeight / Math.max(1, pr.height);
          }
          return { ...annotation, width: newWidth, height: newHeight, normW, normH };
        });
        setAnnotations(updatedAnnotations);
      } else if (draggingAnnotationId && dragStart) {
        e.preventDefault();
        // Update both absolute and normalized coordinates for the dragged item
        const current = annotations.find(a => a.id === draggingAnnotationId);
        if (current) {
          const pageIdx = (current.page ? current.page - 1 : getPageIndexFromClientPoint(e.clientX, e.clientY));
          const pr = pageRects[pageIdx] || pageRects[0];
          if (pr) {
            const rootRect = domRef.current?.getBoundingClientRect();
            const left = (rootRect?.left || 0) + pr.left;
            const top = (rootRect?.top || 0) + pr.top;
            const localX = e.clientX - left;
            const localY = e.clientY - top;
            let newNormX: number | undefined = current.normX;
            let newNormY: number | undefined = current.normY;

            if (current.type === 'image' && typeof current.normW === 'number' && typeof current.normH === 'number') {
              // Use stored offset so the image follows the pointer smoothly without jumping
              const offsetX = dragStart.x;
              const offsetY = dragStart.y;
              const pageWidth = Math.max(1, pr.width);
              const pageHeight = Math.max(1, pr.height);
              const rawLeft = localX - offsetX;
              const rawTop = localY - offsetY;
              const maxNormX = 1 - current.normW;
              const maxNormY = 1 - current.normH;
              newNormX = Math.max(0, Math.min(maxNormX, rawLeft / pageWidth));
              newNormY = Math.max(0, Math.min(maxNormY, rawTop / pageHeight));
            } else {
              // Preserve existing behavior for non-image annotations
              const pageWidth = Math.max(1, pr.width);
              const pageHeight = Math.max(1, pr.height);
              newNormX = Math.max(0, Math.min(1, localX / pageWidth));
              newNormY = Math.max(0, Math.min(1, localY / pageHeight));
            }

            // Compute absolute PDF-space coordinates for the annotation top-left
            const pageLeftPdf = (pr.left - pdfContentOffset.left) + pdfScroll.left;
            const pageTopPdf = (pr.top - pdfContentOffset.top) + pdfScroll.top;
            const pageWidth = Math.max(1, pr.width);
            const pageHeight = Math.max(1, pr.height);
            const absX = pageLeftPdf + (newNormX || 0) * pageWidth;
            const absY = pageTopPdf + (newNormY || 0) * pageHeight;

            const updatedAnnotations = annotations.map(a =>
              a.id === current.id
                ? {
                    ...a,
                    page: (pageIdx >= 0 ? pageIdx + 1 : a.page),
                    normX: newNormX,
                    normY: newNormY,
                    x: absX,
                    y: absY,
                  }
                : a
            );
            setAnnotations(updatedAnnotations);
          }
        }
      } else if (draggingNote) {
        e.preventDefault();
        const { rect, offsetX, offsetY, id } = draggingNote;
        const cx = e.clientX - rect.left - offsetX;
        const cy = e.clientY - rect.top - offsetY;
        const relX = Math.max(0, Math.min(1, cx / Math.max(1, rect.width)));
        const relY = Math.max(0, Math.min(1, cy / Math.max(1, rect.height)));
        const updated = annotations.map(a => {
          if (a.id !== id) return a;
          // Compute absolute PDF-space coordinates for the note center
          const pageIndex = (a.page ? a.page - 1 : 0);
          const pr = pageRects[pageIndex];
          if (!pr) {
            return { ...a, noteRelX: relX, noteRelY: relY };
          }
          const pageLeftPdf = (pr.left - pdfContentOffset.left) + pdfScroll.left;
          const pageTopPdf = (pr.top - pdfContentOffset.top) + pdfScroll.top;
          const pageWidth = Math.max(1, pr.width);
          const pageHeight = Math.max(1, pr.height);
          const absNoteX = pageLeftPdf + relX * pageWidth;
          const absNoteY = pageTopPdf + relY * pageHeight;
          return { ...a, noteRelX: relX, noteRelY: relY, noteAbsX: absNoteX, noteAbsY: absNoteY };
        });
        setAnnotations(updated);
      }
    }, [isDrawing, resizingAnnotationId, resizeStart, draggingAnnotationId, dragStart, annotations, draggingNote, pageRects, getPageIndexFromClientPoint, pdfContentOffset.left, pdfContentOffset.top, pdfScroll.left, pdfScroll.top]);

    const handleMouseUp = useCallback((e?: React.MouseEvent<HTMLDivElement>) => {
      if (isDrawing && drawingPath.length > 1) {
        // Create a path annotation for freehand drawing
        const newAnnotation: Annotation = {
          id: Date.now().toString(),
          type: 'draw',
          x: Math.min(...drawingPath.map(p => p.x)),
          y: Math.min(...drawingPath.map(p => p.y)),
          width: Math.max(...drawingPath.map(p => p.x)) - Math.min(...drawingPath.map(p => p.x)),
          height: Math.max(...drawingPath.map(p => p.y)) - Math.min(...drawingPath.map(p => p.y)),
          color: (penColor || 'black') === 'black' ? '#000000' : (penColor || 'black'),
          pathData: drawingPath, // Store the actual path data
          penSize: penSize || 'medium'
        };
        // Also store normalized path relative to the page where drawing started
        let pageIdx = drawingPageIdxRef.current ?? 0;
        if (pageIdx < 0 || pageIdx >= pageRects.length) pageIdx = 0;
        const pr = pageRects[pageIdx];
        if (pr) {
          // Convert container-page rect to PDF-space
          const pageLeftPdf = (pr.left - pdfContentOffset.left) + pdfScroll.left;
          const pageTopPdf = (pr.top - pdfContentOffset.top) + pdfScroll.top;
          (newAnnotation as any).page = pageIdx + 1;
          (newAnnotation as any).pathDataNorm = drawingPath.map(p => ({
            nx: (p.x - pageLeftPdf) / Math.max(1, pr.width),
            ny: (p.y - pageTopPdf) / Math.max(1, pr.height)
          }));
          if (artifactServiceRef.current) {
            const strokeWidth =
              newAnnotation.penSize === 'small' ? 2 :
              newAnnotation.penSize === 'large' ? 6 : 4;
            const stroke: StrokeInput = {
              color: newAnnotation.color || '#000000',
              width: strokeWidth,
              toolType: 0,
              isEraser: false,
              points: drawingPath.map(p => ({ x: p.x, y: p.y })),
              pressureValues: [],
            };
            artifactServiceRef.current
              .saveStroke(pageIdx + 1, stroke)
              .catch(() => undefined);
          }
        }
        const newAnnotations = [...annotations, newAnnotation];
        setAnnotations(newAnnotations);
        saveToHistory(newAnnotations);
        setDrawingPath([]);
        setIsDrawing(false);
      } else if (resizingAnnotationId) {
        // Finish resizing
        const resizedId = resizingAnnotationId;
        setResizingAnnotationId(null);
        setResizeStart(null);
        saveToHistory(annotations);
        if (artifactServiceRef.current && resizedId) {
          const updated = annotations.find(a => a.id === resizedId);
          if (updated && (updated.type === 'text' || updated.type === 'note') && updated.page) {
            const input: PdfNoteInput = {
              id: updated.id,
              annType: updated.type === 'note' ? 1 : 0,
              position: { x: updated.x, y: updated.y },
              text: updated.content || '',
              color: updated.color || '#000000',
              width: updated.width || (updated.type === 'note' ? 200 : 120),
              height: updated.height || (updated.type === 'note' ? 60 : 32),
            };
            artifactServiceRef.current
              .updateNote(updated.page || 1, input)
              .catch(() => undefined);
          }
        }
      } else if (draggingAnnotationId) {
        // Finish dragging
        const draggedId = draggingAnnotationId;
        setDraggingAnnotationId(null);
        setDragStart(null);
        saveToHistory(annotations);
        try { document.body.style.userSelect = ''; } catch {}
        if (artifactServiceRef.current && draggedId) {
          const updated = annotations.find(a => a.id === draggedId);
          if (updated && (updated.type === 'text' || updated.type === 'note') && updated.page) {
            const input: PdfNoteInput = {
              id: updated.id,
              annType: updated.type === 'note' ? 1 : 0,
              position: { x: updated.x, y: updated.y },
              text: updated.content || '',
              color: updated.color || '#000000',
              width: updated.width || (updated.type === 'note' ? 200 : 120),
              height: updated.height || (updated.type === 'note' ? 60 : 32),
            };
            artifactServiceRef.current
              .updateNote(updated.page || 1, input)
              .catch(() => undefined);
          }
        }
      } else {
        setIsDrawing(false);
      }
      if (draggingNote) {
        setDraggingNote(null);
        saveToHistory(annotations);
      }
    }, [isDrawing, drawingPath, annotations, saveToHistory, resizingAnnotationId, draggingAnnotationId, draggingNote]);

    // Touch support: delegate to mouse handlers so behavior stays consistent
    const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
      const touch = e.touches[0] || e.changedTouches[0];
      if (!touch) return;
      const syntheticEvent: any = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        currentTarget: e.currentTarget,
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation(),
      };
      handleMouseDown(syntheticEvent);
    }, [handleMouseDown]);

    const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
      const touch = e.touches[0] || e.changedTouches[0];
      if (!touch) return;
      const syntheticEvent: any = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        currentTarget: e.currentTarget,
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation(),
      };
      handleMouseMove(syntheticEvent);
    }, [handleMouseMove]);

    const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
      e.preventDefault();
      handleMouseUp();
    }, [handleMouseUp]);

    const renderAnnotations = () => {
      return annotations.map((annotation) => {
        
        if (annotation.type === 'draw' && annotation.pathData) {
          const penSizes = { small: 2, medium: 4, large: 6 };
          const strokeWidth = annotation.penSize ? penSizes[annotation.penSize] : penSizes.medium;
          // Prefer normalized path for alignment across zoom/resize
          let pathData: string;
          if (annotation.pathDataNorm && annotation.page && pageRects[annotation.page - 1]) {
            const pr = pageRects[annotation.page - 1];
            const baseLeft = pr.left;
            const baseTop = pr.top;
            pathData = annotation.pathDataNorm.reduce((acc, p, idx) => {
              const sx = baseLeft + p.nx * pr.width;
              const sy = baseTop + p.ny * pr.height;
              return idx === 0 ? `M ${sx} ${sy}` : `${acc} L ${sx} ${sy}`;
            }, '');
          } else {
            pathData = annotation.pathData.reduce((path, point, index) => {
              if (index === 0) return `M ${point.x} ${point.y}`;
              return `${path} L ${point.x} ${point.y}`;
            }, '');
          }

          return (
            <svg
              key={annotation.id}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              style={{ zIndex: 5 }}
            >
              <path
                d={pathData}
                stroke={annotation.color || '#000000'}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          );
        }

        return (
          <div
            key={annotation.id}
            className={`absolute ${annotation.type === 'text' || annotation.type === 'image' || annotation.type === 'note' ? 'pointer-events-auto' : 'pointer-events-none'}`}
            style={
              annotation.page && pageRects[annotation.page - 1] != null &&
              typeof annotation.normX === 'number' && typeof annotation.normY === 'number'
                ? (() => {
                    const pr = pageRects[annotation.page! - 1];
                    const left = pr.left + (annotation.normX! * pr.width);
                    const top = pr.top + (annotation.normY! * pr.height);
                    const width = typeof annotation.normW === 'number' ? annotation.normW * pr.width : annotation.width;
                    const height = typeof annotation.normH === 'number' ? annotation.normH * pr.height : annotation.height;
                    return { left, top, width, height } as React.CSSProperties;
                  })()
                : ({
                    left: pdfContentOffset.left + (annotation.x || 0) - pdfScroll.left,
                    top: pdfContentOffset.top + (annotation.y || 0) - pdfScroll.top,
                    width: annotation.width,
                    height: annotation.height,
                  } as React.CSSProperties)
            }
          >
            {annotation.type === 'text' && (
              <div className="relative group">
                <div
                  className={`bg-transparent border-2 text-sm cursor-text overflow-hidden transition-all duration-200 flex items-center justify-start ${
                    editingAnnotationId === annotation.id 
                      ? 'border-blue-500 shadow-lg' 
                      : 'border-blue-400 hover:border-blue-500 hover:shadow-md'
                  }`}
                  style={{
                    width: annotation.width || 100,
                    height: annotation.height || 30,
                    minWidth: 50,
                    minHeight: 30,
                    padding: '4px 8px',
                    boxSizing: 'border-box',
                    lineHeight: '1.2',
                    verticalAlign: 'middle'
                  }}
                  contentEditable
                  suppressContentEditableWarning
                  ref={(el) => {
                    // Auto-focus when this annotation is being edited
                    if (editingAnnotationId === annotation.id && el) {
                      setTimeout(() => {
                        el.focus();
                        if (!annotation.content) {
                          el.textContent = '';
                        }
                      }, 0);
                    }
                  }}
                  onFocus={(e) => {
                    setEditingAnnotationId(annotation.id);
                  }}
                  onBlur={(e) => {
                    setEditingAnnotationId(null);
                    const content = e.currentTarget.textContent || '';
                    const trimmed = content.trim();
                    // If user left a brand-new text box empty and not dragging/resizing, remove it
                    if (!trimmed && annotation.isNew && !draggingAnnotationId && !resizingAnnotationId) {
                      const remaining = annotations.filter(a => a.id !== annotation.id);
                      setAnnotations(remaining);
                      saveToHistory(remaining);
                      return;
                    }
                    const updatedAnnotations = annotations.map(a =>
                      a.id === annotation.id ? { ...a, content: content, isNew: trimmed.length > 0 ? false : a.isNew } : a
                    );
                    setAnnotations(updatedAnnotations);
                    saveToHistory(updatedAnnotations);
                    if (artifactServiceRef.current && (annotation.type === 'text' || annotation.type === 'note') && annotation.page) {
                      const updated = updatedAnnotations.find(a => a.id === annotation.id);
                      if (updated) {
                        const input: PdfNoteInput = {
                          id: updated.id,
                          annType: updated.type === 'note' ? 1 : 0,
                          position: { x: updated.x, y: updated.y },
                          text: updated.content || '',
                          color: updated.color || '#000000',
                          width: updated.width || (updated.type === 'note' ? 200 : 120),
                          height: updated.height || (updated.type === 'note' ? 60 : 32),
                        };
                        artifactServiceRef.current
                          .updateNote(updated.page || 1, input)
                          .catch(() => undefined);
                      }
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.currentTarget.blur();
                    }
                  }}
                  onInput={(e) => {
                    // Auto-resize text box based on content
                    const element = e.currentTarget;
                    element.style.height = 'auto';
                    element.style.height = Math.max(element.scrollHeight, 30) + 'px';
                    // Mark as not new once user types something
                    const txt = element.textContent || '';
                    if (txt.trim().length > 0 && annotation.isNew) {
                      const updated = annotations.map(a => a.id === annotation.id ? { ...a, isNew: false } : a);
                      setAnnotations(updated);
                    }
                  }}
                >
                  {annotation.content || (editingAnnotationId === annotation.id ? '' : 'Click to edit text')}
                </div>
                
                {/* Resize handle - only show on hover */}
                <div
                  className="absolute w-3 h-3 bg-blue-500 cursor-se-resize opacity-0 group-hover:opacity-70 hover:opacity-100 transition-opacity duration-200"
                  style={{
                    right: -6,
                    bottom: -6,
                    borderRadius: '50%'
                  }}
                  title="Drag to resize"
                />
                
                {/* Delete button - only show on hover */}
                <button
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full hover:bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    const newAnnotations = annotations.filter(a => a.id !== annotation.id);
                    setAnnotations(newAnnotations);
                    saveToHistory(newAnnotations);
                  }}
                  title="Delete text box"
                >
                  ×
                </button>
              </div>
            )}
            {annotation.type === 'note' && (
              <div className="relative group">
                <div
                  className={`bg-yellow-50 border-2 text-sm cursor-text overflow-hidden transition-all duration-200 flex items-start justify-start ${
                    editingAnnotationId === annotation.id 
                      ? 'border-blue-500 shadow-lg' 
                      : 'border-blue-400 hover:border-blue-500 hover:shadow-md'
                  }`}
                  style={{
                    width: annotation.width || 200,
                    height: annotation.height || 60,
                    minWidth: 120,
                    minHeight: 40,
                    padding: '6px 8px 18px 8px',
                    boxSizing: 'border-box',
                    lineHeight: '1.2',
                    background: 'rgba(255,255,200,0.9)'
                  }}
                  contentEditable
                  suppressContentEditableWarning
                  ref={(el) => {
                    if (editingAnnotationId === annotation.id && el) {
                      setTimeout(() => {
                        el.focus();
                        if (!annotation.content) el.textContent = '';
                      }, 0);
                    }
                  }}
                  onFocus={() => setEditingAnnotationId(annotation.id)}
                  onBlur={(e) => {
                    setEditingAnnotationId(null);
                    const content = e.currentTarget.textContent || '';
                    const trimmed = content.trim();
                    if (!trimmed && annotation.isNew && !draggingAnnotationId && !resizingAnnotationId) {
                      const remaining = annotations.filter(a => a.id !== annotation.id);
                      setAnnotations(remaining);
                      saveToHistory(remaining);
                      return;
                    }
                    const updated = annotations.map(a => a.id === annotation.id ? { ...a, content, isNew: trimmed ? false : a.isNew } : a);
                    setAnnotations(updated);
                    saveToHistory(updated);
                    if (artifactServiceRef.current && (annotation.type === 'text' || annotation.type === 'note') && annotation.page) {
                      const latest = updated.find(a => a.id === annotation.id);
                      if (latest) {
                        const input: PdfNoteInput = {
                          id: latest.id,
                          annType: latest.type === 'note' ? 1 : 0,
                          position: { x: latest.x, y: latest.y },
                          text: latest.content || '',
                          color: latest.color || '#000000',
                          width: latest.width || (latest.type === 'note' ? 200 : 120),
                          height: latest.height || (latest.type === 'note' ? 60 : 32),
                        };
                        artifactServiceRef.current
                          .updateNote(latest.page || 1, input)
                          .catch(() => undefined);
                      }
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      (e.currentTarget as HTMLElement).blur();
                    }
                  }}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = 'auto';
                    el.style.height = Math.max(el.scrollHeight, 40) + 'px';
                    const txt = el.textContent || '';
                    if (txt.trim().length > 0 && annotation.isNew) {
                      const updated = annotations.map(a => a.id === annotation.id ? { ...a, isNew: false } : a);
                      setAnnotations(updated);
                    }
                  }}
                >
                  {annotation.content || (editingAnnotationId === annotation.id ? '' : 'Write a note')}
                </div>
                {/* Controls */}
                <button
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full hover:bg-red-600 flex items-center justify-center"
                  title="Remove note"
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = annotations.filter(a => a.id !== annotation.id);
                    setAnnotations(next);
                    saveToHistory(next);
                  }}
                >
                  ×
                </button>
                <button
                  className="absolute -top-2 right-6 w-5 h-5 bg-white text-black border border-border-gray rounded-full hover:bg-gray-50 text-[10px] flex items-center justify-center"
                  title="Edit note"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingAnnotationId(annotation.id);
                  }}
                >
                  ✎
                </button>
              </div>
            )}
            {annotation.type === 'highlight' && (
              <div
                className="bg-blue-200 opacity-50 rounded"
                style={{
                  width: annotation.width,
                  height: annotation.height,
                }}
              />
            )}
            {annotation.type === 'shape' && (
              <div
                className="border-2 border-red-500 rounded"
                style={{
                  width: annotation.width,
                  height: annotation.height,
                }}
              />
            )}
            {annotation.type === 'image' && (
              <div className="annotation-group relative w-full h-full">
                {annotation.images && annotation.images[0]?.url && (
                  <img
                    src={annotation.images[0].url}
                    alt="annot"
                    className="annotation-img absolute inset-0 w-full h-full object-contain select-none"
                    draggable={false}
                  />
                )}
                {/* Note bubble overlay inside image (positioned relative to image) */}
                {Boolean((annotation.content || '').trim()) && (
                  <div
                    className="annotation-note absolute text-xs bg-white/90 border border-border-gray rounded px-2 py-1 shadow-sm cursor-move"
                    style={{
                      left: `${Math.round((annotation.noteRelX ?? 0.5) * 100)}%`,
                      top: `${Math.round((annotation.noteRelY ?? 0.5) * 100)}%`,
                      transform: 'translate(-50%, -50%)',
                      zIndex: 6,
                    }}
                    onMouseDown={(e) => {
                      // Drag only the note bubble, not the whole image
                      e.stopPropagation();
                      e.preventDefault();
                      const container = e.currentTarget.parentElement as HTMLDivElement;
                      const rect = container.getBoundingClientRect();
                      const noteRect = e.currentTarget.getBoundingClientRect();
                      const offsetX = e.clientX - noteRect.left;
                      const offsetY = e.clientY - noteRect.top;
                      setDraggingNote({ id: annotation.id, offsetX, offsetY, rect });
                    }}
                    onTouchStart={(e) => {
                      // Touch drag for note bubble
                      e.stopPropagation();
                      e.preventDefault();
                      const touch = e.touches[0] || e.changedTouches[0];
                      if (!touch) return;
                      const container = e.currentTarget.parentElement as HTMLDivElement;
                      const rect = container.getBoundingClientRect();
                      const noteRect = e.currentTarget.getBoundingClientRect();
                      const offsetX = touch.clientX - noteRect.left;
                      const offsetY = touch.clientY - noteRect.top;
                      setDraggingNote({ id: annotation.id, offsetX, offsetY, rect });
                    }}
                  >
                    {(annotation.content || '').trim()}
                  </div>
                )}
              </div>
            )}
            
          </div>
        );
      });
    };

    const renderDrawingPath = () => {
      if (drawingPath.length < 2) return null;
      
      const pathData = drawingPath.reduce((path, point, index) => {
        if (index === 0) return `M ${point.x} ${point.y}`;
        return `${path} L ${point.x} ${point.y}`;
      }, '');

      return (
        <svg
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ zIndex: 10 }}
        >
          <g transform={`translate(${pdfContentOffset.left - pdfScroll.left}, ${pdfContentOffset.top - pdfScroll.top})`}>
            <path
              d={pathData}
              stroke="#000000"
              strokeWidth={4}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      );
    };

    if (!isPdfLoaded) {
      return null;
    }

    return (
      <div className="flex justify-center">
        <div className="w-full">
          <div
            ref={domRef}
            className="bg-white shadow-lg mx-auto w-full sm:!p-6 lg:!p-8 sm:!pb-24 lg:!pb-32 relative"
            style={{
              width: '100%',
              minHeight: '1123px',
              padding: '16px',
              paddingBottom: '80px',
              color: '#000000',
              position: 'relative',
              border: '1px solid #e5e7eb',
              boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
              background: 'white',
              fontFamily: "Inter, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
              lineHeight: 1.6,
              cursor: activeTab === 'view' ? 'default' : 
                     selectedTool === 'draw' ? 'crosshair' :
                     selectedTool === 'eraser' ? 'crosshair' :
                     selectedTool === 'text' ? 'crosshair' :
                     draggingAnnotationId ? 'grabbing' :
                     'default'
            }}
            onClick={handleCanvasClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            {/* Show different content based on active tab */}
            {activeTab === 'view' ? (
              <>
                {/* Category chips moved to header */}
                {showPdf && fileUrl ? (
                  <div className="mb-6">
                    <PdfInlineViewer fileUrl={fileUrl} onClose={() => setShowPdf(false)} onContainerRef={setPdfScrollEl} />
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
              // Annotate mode: render the actual PDF inline so tools can annotate/view
              <div className="w-full min-h-[800px]">
                {fileUrl ? (
                  <PdfInlineViewer fileUrl={fileUrl} height="85vh" onContainerRef={setPdfScrollEl} />
                ) : (
                  <div className="flex items-center justify-center h-[400px] text-sm text-text-gray">
                    Failed to load PDF.
                  </div>
                )}
              </div>
            )}

            {/* Render annotations overlay (persist across tabs) */}
            {renderAnnotations()}

            {/* Render drawing path only in annotate mode */}
            {activeTab !== 'view' && renderDrawingPath()}



            {/* Footer */}
            <div className="absolute bottom-2 sm:bottom-6 left-2 sm:left-6 right-2 sm:right-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-0 text-[10px] sm:text-[11px] text-gray-500 bg-white/80 p-2 sm:p-3 rounded backdrop-blur-sm">
              <span className="font-medium">Generated by DocuSite</span>
              <span className="font-medium">Report Version 1.0</span>
            </div>
          </div>
        </div>

        {/* File list modal for categories with multiple PDFs */}
        {isFileListOpen && fileListForCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-lg shadow-lg w-80 max-w-[90vw] border border-border-gray">
              <div className="px-4 py-3 border-b border-border-gray flex items-center justify-between">
                <h3 className="text-sm font-semibold text-black">{fileListForCategory.category}</h3>
                <button
                  onClick={() => { setIsFileListOpen(false); setFileListForCategory(null); }}
                  className="text-sm text-action hover:text-action/80"
                >
                  Close
                </button>
              </div>
              <div className="p-2 max-h-[50vh] overflow-auto">
                {fileListForCategory.files.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      onSelectFile?.({ id: f.id, name: f.name, category: fileListForCategory.category });
                      setShowPdf(true);
                      setIsFileListOpen(false);
                      setFileListForCategory(null);
                    }}
                    className="w-full text-left px-3 py-2 rounded hover:bg-light-gray text-sm text-black"
                  >
                    {f.name}
                  </button>
                ))}
                {fileListForCategory.files.length === 0 && (
                  <div className="px-3 py-4 text-xs text-text-gray">No files uploaded yet</div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Add Pictures with Notes Modal */}
        <AddPicturesWithNotesModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAdd={(pictures, note) => {
            const urls = pictures.map((f) => URL.createObjectURL(f));
            addMultipleImages(urls, note);
            setIsModalOpen(false);
          }}
        />
      </div>
    );
  }
);

DocumentViewer.displayName = 'DocumentViewer';

export default DocumentViewer;
