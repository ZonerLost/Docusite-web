import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import NotesModal from '@/components/modals/NotesModal';
import AddNotesModal from '@/components/modals/AddNotesModal';
import AddPicturesWithNotesModal from '@/components/modals/AddPicturesWithNotesModal';
import ReportMetaModal from '@/components/modals/ReportMetaModal';
import DocumentViewerHeader from '@/components/project/DocumentViewerHeader';
import DocumentViewer from '@/components/project/DocumentViewer';
import { useProjectFiles } from '@/hooks/useProjectFiles';

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


const ProjectDetailsDashboardPage: React.FC = () => {
  const router = useRouter();
  const { projectId } = router.query as { projectId?: string };

  const [project, setProject] = useState<StoredProject | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ id: string; name: string; category?: string } | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isAddNotesOpen, setIsAddNotesOpen] = useState(false);
  const [isAddPicturesOpen, setIsAddPicturesOpen] = useState(false);
  const [isReportMetaOpen, setIsReportMetaOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'view' | 'annotate'>('view');
  
  const handleTabChange = useCallback((tab: 'view' | 'annotate') => {
    setActiveTab(tab);
  }, []);

  const handleOpenReportMeta = useCallback(() => setIsReportMetaOpen(true), []);
  const handleCloseReportMeta = useCallback(() => setIsReportMetaOpen(false), []);
  const handleOpenAddNotes = useCallback(() => setIsAddNotesOpen(true), []);
  const handleCloseAddNotes = useCallback(() => setIsAddNotesOpen(false), []);
  const handleOpenAddPictures = useCallback(() => setIsAddPicturesOpen(true), []);
  const handleCloseAddPictures = useCallback(() => setIsAddPicturesOpen(false), []);
  const handleCloseNotes = useCallback(() => setIsNotesOpen(false), []);

  const handleUndo = useCallback(() => {
    if (exportRef.current && 'undo' in exportRef.current) {
      (exportRef.current as any).undo();
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (exportRef.current && 'redo' in exportRef.current) {
      (exportRef.current as any).redo();
    }
  }, []);
  const [selectedTool, setSelectedTool] = useState<'text' | 'shape' | 'image' | 'note' | 'highlight' | 'draw' | 'eraser' | null>(null);
  const [searchResults, setSearchResults] = useState<{ count: number; currentIndex: number }>({ count: 0, currentIndex: 0 });
  const exportRef = useRef<{ undo: () => void; redo: () => void; addImageAnnotation: (imageUrl: string, note: string) => void; addMultipleImages: (imageUrls: string[], note: string) => void; domRef: HTMLDivElement | null; exportPagesAsImages: () => Promise<{ width: number; height: number; dataUrl: string }[]> }>(null);
  // Extend ref type locally to call openCategory, if available
  const viewerRef = exportRef as React.MutableRefObject<{
    undo: () => void;
    redo: () => void;
    addImageAnnotation: (imageUrl: string, note: string) => void;
    addMultipleImages: (imageUrls: string[], note: string) => void;
    addImagesWithUpload?: (files: File[], note: string) => void;
    domRef: HTMLDivElement | null;
    openCategory?: (name: string) => void;
    addNoteAnnotation?: (text: string, x?: number, y?: number) => void;
  } | null>;
  const { files: allFiles } = useProjectFiles(project?.id);
  const categories = React.useMemo(() => {
    const map = new Map<string, number>();
    allFiles.forEach((f) => {
      const key = f.category || 'Others';
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [allFiles]);
  const handleHeaderCategoryClick = useCallback((name: string) => {
    // Trigger DocumentViewer category open logic via ref
    viewerRef.current?.openCategory?.(name);
    setActiveTab('view');
  }, []);


  // Pen settings shared between header (menu) and viewer
  const [penColor, setPenColor] = useState<'black' | 'red' | 'blue' | 'green' | 'yellow'>('black');
  const [penSize, setPenSize] = useState<'small' | 'medium' | 'large'>('medium');
  const handlePenSettingsChange = useCallback((cfg: { color?: 'black' | 'red' | 'blue' | 'green' | 'yellow'; size?: 'small' | 'medium' | 'large' }) => {
    if (cfg.color) setPenColor(cfg.color);
    if (cfg.size) setPenSize(cfg.size);
  }, []);
  const handleSelectFile = useCallback((file: { id: string; name: string; category?: string }) => {
    setSelectedFile(file);
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('selectedFile', JSON.stringify(file));
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? sessionStorage.getItem('currentProject') : null;
      if (raw) {
        const parsed = JSON.parse(raw) as StoredProject;
        setProject(parsed);
      } else if (projectId) {
        setProject({
          id: projectId,
          name: `Project ${projectId}`,
          status: 'in-progress',
          location: 'Not specified',
        });
      }
    } catch {
      if (projectId) {
        setProject({ id: projectId, name: `Project ${projectId}`, status: 'in-progress', location: 'Not specified' });
      }
    }

    // Load selected file information
    try {
      const fileRaw = typeof window !== 'undefined' ? sessionStorage.getItem('selectedFile') : null;
      if (fileRaw) {
        const fileParsed = JSON.parse(fileRaw) as { id: string; name: string; category?: string };
        setSelectedFile(fileParsed);
      }
    } catch (error) {
      console.error('Error loading selected file:', error);
    }
  }, [projectId]);

  const notesKey = project?.id ? `project:${project.id}:notes` : undefined;

  const handleAddNote = (newNote: string) => {
    setNotes((prev) => {
      const updated = [...prev, newNote];
      try {
        if (notesKey) localStorage.setItem(notesKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  useEffect(() => {
    if (!notesKey) return;
    const existing = localStorage.getItem(notesKey);
    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        if (Array.isArray(parsed)) setNotes(parsed);
      } catch {
        if (existing) setNotes(existing ? [existing] : []);
      }
    }
  }, [notesKey]);


  // Handle adding notes with pictures
  const handleAddPicturesWithNotes = (pictures: File[], note: string) => {
    if (note.trim()) {
      handleAddNote(note);
    }

    if (viewerRef.current?.addImagesWithUpload) {
      viewerRef.current.addImagesWithUpload(pictures, note);
    } else if (pictures.length > 0) {
      // Fallback: previous behavior using a single data-URL image
      const picture = pictures[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        if (viewerRef.current && 'addImageAnnotation' in viewerRef.current) {
          (viewerRef.current as any).addImageAnnotation(imageUrl, note);
        }
      };
      reader.readAsDataURL(picture);
    }

    setIsAddPicturesOpen(false);
  };

  // Handle adding simple notes
  const handleAddSimpleNote = (note: string) => {
    handleAddNote(note);
    try {
      viewerRef.current?.addNoteAnnotation?.(note);
      setActiveTab('annotate');
    } catch {}
    setIsAddNotesOpen(false);
  };

  // Search functionality
  const highlightSearchResults = (query: string) => {
    if (!exportRef.current?.domRef || !query.trim()) {
      // Remove all highlights
      const highlights = exportRef.current?.domRef?.querySelectorAll('.search-highlight');
      highlights?.forEach(highlight => {
        const parent = highlight.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(highlight.textContent || ''), highlight);
          parent.normalize();
        }
      });
      setSearchResults({ count: 0, currentIndex: 0 });
      return;
    }

    const element = exportRef.current.domRef;
    const textContent = element.textContent || '';
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const matches = textContent.match(regex);
    
    if (!matches) {
      setSearchResults({ count: 0, currentIndex: 0 });
      return;
    }

    // Remove existing highlights
    const existingHighlights = element.querySelectorAll('.search-highlight');
    existingHighlights.forEach(highlight => {
      const parent = highlight.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(highlight.textContent || ''), highlight);
        parent.normalize();
      }
    });

    // Add new highlights
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );

    const textNodes: Text[] = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node as Text);
    }

    textNodes.forEach(textNode => {
      const text = textNode.textContent || '';
      if (regex.test(text)) {
        const parent = textNode.parentNode;
        if (parent && parent.nodeName !== 'SCRIPT' && parent.nodeName !== 'STYLE') {
          const highlightedHTML = text.replace(regex, '<span class="search-highlight">$1</span>');
          const wrapper = document.createElement('div');
          wrapper.innerHTML = highlightedHTML;
          
          while (wrapper.firstChild) {
            parent.insertBefore(wrapper.firstChild, textNode);
          }
          parent.removeChild(textNode);
        }
      }
    });

    setSearchResults({ count: matches.length, currentIndex: 1 });
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    highlightSearchResults(query);
  };

  // Navigate between search results
  const navigateSearchResults = (direction: 'next' | 'prev') => {
    if (searchResults.count === 0) return;

    const highlights = exportRef.current?.domRef?.querySelectorAll('.search-highlight');
    if (!highlights) return;

    // Remove current active highlight
    highlights.forEach(highlight => highlight.classList.remove('search-highlight-active'));

    let newIndex = searchResults.currentIndex;
    if (direction === 'next') {
      newIndex = newIndex >= searchResults.count ? 1 : newIndex + 1;
    } else {
      newIndex = newIndex <= 1 ? searchResults.count : newIndex - 1;
    }

    // Add active highlight to current result
    if (highlights[newIndex - 1]) {
      highlights[newIndex - 1].classList.add('search-highlight-active');
      highlights[newIndex - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    setSearchResults(prev => ({ ...prev, currentIndex: newIndex }));
  };

  const handleExportPdf = useCallback(async () => {
    if (!exportRef.current) return;
    try {
      const pages = await exportRef.current.exportPagesAsImages();
      if (!pages || pages.length === 0) return;
      const { jsPDF } = await import('jspdf');
      const first = pages[0];
      const pdf = new jsPDF({ orientation: 'p', unit: 'px', format: [first.width, first.height] });
      pdf.addImage(first.dataUrl, 'JPEG', 0, 0, first.width, first.height);
      for (let i = 1; i < pages.length; i++) {
        const p = pages[i];
        pdf.addPage([p.width, p.height]);
        pdf.addImage(p.dataUrl, 'JPEG', 0, 0, p.width, p.height);
      }
      pdf.save(`${project?.name || 'project-details'}.pdf`);
    } catch (err) {
      console.error('Export failed:', err);
    }
  }, [project?.name]);

  if (!project) {
    return (
      <div className="p-4">
        <p className="text-sm text-gray-700">No project selected.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-0">
      <DocumentViewerHeader
        projectName={project.name}
        selectedFile={selectedFile}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onExportPdf={handleExportPdf}
        onOpenReportMeta={handleOpenReportMeta}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onAddNote={handleOpenAddNotes}
        onAddImageNote={handleOpenAddPictures}
        searchResults={searchResults}
        onNavigateSearch={navigateSearchResults}
        selectedTool={selectedTool}
        onToolSelect={setSelectedTool}
        onUndo={handleUndo}
        onRedo={handleRedo}
        categories={categories}
        onCategoryClick={handleHeaderCategoryClick}

        penColor={penColor}
        penSize={penSize}
        onPenSettingsChange={handlePenSettingsChange}
        onAddPicturesWithNotes={handleAddPicturesWithNotes}
      />

      <DocumentViewer
        ref={exportRef}
        project={project}
        selectedFile={selectedFile}
        notes={notes}
        selectedTool={selectedTool}
        activeTab={activeTab}
        onAddNote={handleOpenAddNotes}
        onAddImageNote={handleOpenAddPictures}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onSelectFile={handleSelectFile}
        penColor={penColor}
        penSize={penSize}
      />

      <NotesModal
        isOpen={isNotesOpen}
        onClose={handleCloseNotes}
        onAdd={handleAddNote}
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
};

export default ProjectDetailsDashboardPage;
