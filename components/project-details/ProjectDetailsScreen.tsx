import { useCallback, useMemo, useRef, useState } from "react";
import NotesModal from "@/components/modals/NotesModal";
import AddNotesModal from "@/components/modals/AddNotesModal";
import AddPicturesWithNotesModal from "@/components/modals/AddPicturesWithNotesModal";
import ReportMetaModal from "@/components/modals/ReportMetaModal";
import DocumentViewerHeader from "@/components/project/DocumentViewerHeader";
import DocumentViewer from "@/components/project/DocumentViewer";
import { useProjectFiles } from "@/hooks/useProjectFiles";
import { useProjectFileUrl } from "@/hooks/useProjectFileUrl";
import useProjectFilePhotos from "@/hooks/useProjectFilePhotos";
import { useProjectSessionState } from "@/hooks/projects/useProjectSessionState";
import { useProjectNotes } from "@/hooks/projects/useProjectNotes";
import { useSearchHighlights } from "@/hooks/projects/useSearchHighlights";
import { useExportProjectReport } from "@/hooks/projects/useExportProjectReport";
import type { DocumentViewerHandle } from "@/types/documentViewer";
import type {
  PenColor,
  PenSize,
  SelectedFile,
  Tool,
} from "@/types/project";

const TOOL_VALUES: Tool[] = [
  "select",
  "text",
  "image",
  "note",
  "highlight",
  "draw",
  "eraser",
  "rect",
  "circle",
  null,
];

const isTool = (tool: unknown): tool is Tool =>
  TOOL_VALUES.some((value) => value === tool);

type Props = {
  projectId: string;
};

export default function ProjectDetailsScreen({ projectId }: Props) {
  const { project, selectedFile, setSelectedFile } =
    useProjectSessionState(projectId);
  const { notes, addNote } = useProjectNotes(project?.id);

  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isAddNotesOpen, setIsAddNotesOpen] = useState(false);
  const [isAddPicturesOpen, setIsAddPicturesOpen] = useState(false);
  const [isReportMetaOpen, setIsReportMetaOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"view" | "annotate">("view");
  const [selectedTool, setSelectedTool] = useState<Tool>(null);
  const [penColor, setPenColor] = useState<PenColor>("black");
  const [penSize, setPenSize] = useState<PenSize>("medium");

  const exportRef = useRef<DocumentViewerHandle | null>(null);

  const { searchQuery, searchResults, onSearchChange, navigate } =
    useSearchHighlights(exportRef);

  const { files: allFiles } = useProjectFiles(project?.id);
  const { url: fileUrl } = useProjectFileUrl(
    project?.id,
    selectedFile?.name || null
  );
  const { photos } = useProjectFilePhotos(
    project?.id || null,
    selectedFile?.id || null
  );

  const { exportPdf } = useExportProjectReport({
    project,
    selectedFile,
    fileUrl,
    photos,
    exportRef,
  });

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    allFiles.forEach((f) => {
      const key = f.category || "Others";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [allFiles]);

  const handleTabChange = useCallback((tab: "view" | "annotate") => {
    setActiveTab(tab);
  }, []);

  const handleOpenReportMeta = useCallback(() => setIsReportMetaOpen(true), []);
  const handleCloseReportMeta = useCallback(
    () => setIsReportMetaOpen(false),
    []
  );
  const handleOpenAddNotes = useCallback(() => setIsAddNotesOpen(true), []);
  const handleCloseAddNotes = useCallback(() => setIsAddNotesOpen(false), []);
  const handleOpenAddPictures = useCallback(
    () => setIsAddPicturesOpen(true),
    []
  );
  const handleCloseAddPictures = useCallback(
    () => setIsAddPicturesOpen(false),
    []
  );
  const handleCloseNotes = useCallback(() => setIsNotesOpen(false), []);

  const handleUndo = useCallback(() => {
    exportRef.current?.undo();
  }, []);

  const handleRedo = useCallback(() => {
    exportRef.current?.redo();
  }, []);

  const handleHeaderCategoryClick = useCallback((name: string) => {
    exportRef.current?.openCategory?.(name);
    setActiveTab("view");
  }, []);

  const handlePenSettingsChange = useCallback(
    (cfg: { color?: PenColor; size?: PenSize }) => {
      if (cfg.color) setPenColor(cfg.color);
      if (cfg.size) setPenSize(cfg.size);
    },
    []
  );

  const handleSelectFile = useCallback(
    (file: SelectedFile) => {
      setSelectedFile(file);
    },
    [setSelectedFile]
  );

  const handleToolSelect = useCallback((tool: Tool) => {
    if (isTool(tool)) {
      setSelectedTool(tool);
    }
  }, []);

  const handleAddPicturesWithNotes = useCallback(
    (pictures: File[], note: string) => {
      if (note.trim()) {
        addNote(note);
      }

      if (exportRef.current?.addImagesWithUpload) {
        exportRef.current.addImagesWithUpload(pictures, note);
      } else if (pictures.length > 0) {
        const picture = pictures[0];
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageUrl = e.target?.result as string;
          exportRef.current?.addImageAnnotation(imageUrl, note);
        };
        reader.readAsDataURL(picture);
      }

      setIsAddPicturesOpen(false);
    },
    [addNote]
  );

  const handleAddSimpleNote = useCallback(
    (note: string) => {
      addNote(note);
      try {
        exportRef.current?.addNoteAnnotation?.(note);
        setActiveTab("annotate");
      } catch {}
      setIsAddNotesOpen(false);
    },
    [addNote]
  );

  if (!project) {
    return (
      <div className="p-4">
        <p className="text-sm text-gray-700">No project selected.</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen min-h-0 flex-col bg-gray-100 p-0">
      <DocumentViewerHeader
        projectName={project.name}
        selectedFile={selectedFile}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onExportPdf={exportPdf}
        onOpenReportMeta={handleOpenReportMeta}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onAddNote={handleOpenAddNotes}
        onAddImageNote={handleOpenAddPictures}
        searchResults={searchResults}
        onNavigateSearch={navigate}
        selectedTool={selectedTool}
        onToolSelect={handleToolSelect}
        onUndo={handleUndo}
        onRedo={handleRedo}
        categories={categories}
        onCategoryClick={handleHeaderCategoryClick}
        penColor={penColor}
        penSize={penSize}
        onPenSettingsChange={handlePenSettingsChange}
        onOpenFullView={() =>
          exportRef.current?.openCompleteView?.() ??
          exportRef.current?.openFullScreen?.()
        }
        disableFullView={!selectedFile || !fileUrl}
      />

      <div className="flex-1 min-h-0 overflow-hidden">
        <DocumentViewer
          ref={exportRef}
          project={project}
          selectedFile={selectedFile}
          notes={notes}
          selectedTool={selectedTool}
          onToolSelect={handleToolSelect}
          activeTab={activeTab}
          onAddNote={handleOpenAddNotes}
        onAddImageNote={handleOpenAddPictures}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onSelectFile={handleSelectFile}
        penColor={penColor}
        penSize={penSize}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        searchResults={searchResults}
        onNavigateSearch={navigate}
      />
    </div>

      <NotesModal
        isOpen={isNotesOpen}
        onClose={handleCloseNotes}
        onAdd={addNote}
      />

      <AddNotesModal
        isOpen={isAddNotesOpen}
        onClose={handleCloseAddNotes}
        onAdd={handleAddSimpleNote}
      />

      <AddPicturesWithNotesModal
        isOpen={isAddPicturesOpen}
        onClose={handleCloseAddPictures}
        onAdd={handleAddPicturesWithNotes}
      />

      <ReportMetaModal
        projectId={project.id}
        isOpen={isReportMetaOpen}
        onClose={handleCloseReportMeta}
      />
    </div>
  );
}
