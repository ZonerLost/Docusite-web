import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import NotesModal from '@/components/modals/NotesModal';
import AddNotesModal from '@/components/modals/AddNotesModal';
import AddPicturesWithNotesModal from '@/components/modals/AddPicturesWithNotesModal';
import DocumentViewerHeader from '@/components/project/DocumentViewerHeader';
import DocumentViewer from '@/components/project/DocumentViewer';

type StoredProject = {
  id: string;
  name: string;
  clientName?: string;
  status: 'in-progress' | 'completed' | 'cancelled';
  location: string;
  projectOwner?: string;
  deadline?: string;
  members?: number;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'view' | 'annotate'>('view');
  
  const handleTabChange = (tab: 'view' | 'annotate') => {
    setActiveTab(tab);
  };

  const handleUndo = () => {
    if (exportRef.current && 'undo' in exportRef.current) {
      (exportRef.current as any).undo();
    }
  };

  const handleRedo = () => {
    if (exportRef.current && 'redo' in exportRef.current) {
      (exportRef.current as any).redo();
    }
  };
  const [selectedTool, setSelectedTool] = useState<'text' | 'shape' | 'image' | 'note' | 'highlight' | 'draw' | 'eraser' | null>(null);
  const [searchResults, setSearchResults] = useState<{ count: number; currentIndex: number }>({ count: 0, currentIndex: 0 });
  const exportRef = useRef<{ undo: () => void; redo: () => void; addImageAnnotation: (imageUrl: string, note: string) => void; addMultipleImages: (imageUrls: string[], note: string) => void; domRef: HTMLDivElement | null }>(null);

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
    
    // Convert single file to data URL
    if (pictures.length > 0) {
      const picture = pictures[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        // Add single image annotation
        if (exportRef.current && 'addImageAnnotation' in exportRef.current) {
          (exportRef.current as any).addImageAnnotation(imageUrl, note);
        }
      };
      reader.readAsDataURL(picture);
    }
    
    setIsAddPicturesOpen(false);
  };

  // Handle adding simple notes
  const handleAddSimpleNote = (note: string) => {
    handleAddNote(note);
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
    console.log('Export PDF clicked, exportRef.current:', exportRef.current);
    if (!exportRef.current || !exportRef.current.domRef) {
      console.error('Export ref or domRef is null');
      return;
    }
    
    try {
      console.log('Starting PDF export...');
      // Dynamic import for better performance
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const element = exportRef.current.domRef;
      console.log('Element to export:', element);
      
      const canvas = await html2canvas(element, { 
        scale: 1.5, // Reduced scale for better performance
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true
      });
      console.log('Canvas created:', canvas.width, 'x', canvas.height);
      
      const imgData = canvas.toDataURL('image/jpeg', 0.8); // JPEG with compression for better performance
      console.log('Image data created, length:', imgData.length);

      const pdf = new jsPDF('p', 'pt', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let y = 0;
      let remainingHeight = imgHeight;

      while (remainingHeight > 0) {
        pdf.addImage(imgData, 'JPEG', 0, y, imgWidth, imgHeight);
        remainingHeight -= pageHeight;
        if (remainingHeight > 0) {
          pdf.addPage();
          y = 0 - (imgHeight - remainingHeight);
        }
      }

      console.log('PDF created, saving...');
      pdf.save(`${project?.name || 'project-details'}.pdf`);
      console.log('PDF saved successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
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
    <div className="min-h-screen bg-gray-100 p-6">
      <DocumentViewerHeader
        projectName={project.name}
        selectedFile={selectedFile}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onExportPdf={handleExportPdf}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onAddNote={() => setIsAddNotesOpen(true)}
        onAddImageNote={() => setIsAddPicturesOpen(true)}
        searchResults={searchResults}
        onNavigateSearch={navigateSearchResults}
        selectedTool={selectedTool}
        onToolSelect={setSelectedTool}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      <DocumentViewer
        ref={exportRef}
        project={project}
        selectedFile={selectedFile}
        notes={notes}
        selectedTool={selectedTool}
        activeTab={activeTab}
        onAddNote={() => setIsAddNotesOpen(true)}
        onAddImageNote={() => setIsAddPicturesOpen(true)}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      <NotesModal
        isOpen={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
        onAdd={handleAddNote}
      />

      <AddNotesModal
        isOpen={isAddNotesOpen}
        onClose={() => setIsAddNotesOpen(false)}
        onAdd={handleAddSimpleNote}
      />

      <AddPicturesWithNotesModal
        isOpen={isAddPicturesOpen}
        onClose={() => setIsAddPicturesOpen(false)}
        onAdd={handleAddPicturesWithNotes}
      />
    </div>
  );
};

export default ProjectDetailsDashboardPage;
