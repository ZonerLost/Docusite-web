import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import FormInput from '@/components/ui/FormInput';
import { PDFIcon, SearchIcon, EyeIcon } from '@/components/ui/Icons';
import AddPicturesWithNotesModal from '@/components/modals/AddPicturesWithNotesModal';
import { 
  FileTextIcon, 
  PencilIcon, 
  TypeIcon, 
  CameraIcon, 
  StickyNoteIcon,
  UndoIcon,
  RedoIcon,
  EraserIcon
} from 'lucide-react';

type AnnotationTool = 'text' | 'shape' | 'image' | 'note' | 'highlight' | 'draw' | 'eraser';

interface DocumentViewerHeaderProps {
  projectName: string;
  selectedFile?: { id: string; name: string; category?: string } | null;
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportPdf: () => void;
  activeTab: 'view' | 'annotate';
  onTabChange: (tab: 'view' | 'annotate') => void;
  onAddNote: () => void;
  onAddImageNote: () => void;
  searchResults: { count: number; currentIndex: number };
  onNavigateSearch: (direction: 'next' | 'prev') => void;
  selectedTool: AnnotationTool | null;
  onToolSelect: (tool: AnnotationTool | null) => void;
  onUndo: () => void;
  onRedo: () => void;
}

const DocumentViewerHeader: React.FC<DocumentViewerHeaderProps> = ({
  projectName,
  selectedFile,
  searchQuery,
  onSearchChange,
  onExportPdf,
  activeTab,
  onTabChange,
  onAddNote,
  onAddImageNote,
  searchResults,
  onNavigateSearch,
  selectedTool,
  onToolSelect,
  onUndo,
  onRedo,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const renderAnnotationTools = () => {
    if (activeTab !== 'annotate') return null;

    return (
      <div className="flex items-center gap-2 px-4 sm:px-6 py-3 bg-gray-100 rounded-lg mx-4 sm:mx-6 overflow-x-auto">
        <button
          onClick={() => onToolSelect(selectedTool === 'text' ? null : 'text')}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
            selectedTool === 'text' 
              ? 'bg-action text-white shadow-lg' 
              : 'bg-white text-action hover:bg-action/10 hover:shadow-md'
          }`}
          title="Add Text"
        >
          <TypeIcon className="w-5 h-5" />
        </button>
        <button
          onClick={() => onToolSelect(selectedTool === 'draw' ? null : 'draw')}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
            selectedTool === 'draw' 
              ? 'bg-action text-white shadow-lg' 
              : 'bg-white text-action hover:bg-action/10 hover:shadow-md'
          }`}
          title="Draw"
        >
          <PencilIcon className="w-5 h-5" />
        </button>
        <button
          onClick={() => onToolSelect(selectedTool === 'eraser' ? null : 'eraser')}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
            selectedTool === 'eraser' 
              ? 'bg-action text-white shadow-lg' 
              : 'bg-white text-action hover:bg-action/10 hover:shadow-md'
          }`}
          title="Eraser"
        >
          <EraserIcon className="w-5 h-5" />
        </button>
        {/* Camera button - opens modal */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 bg-white text-action hover:bg-action/10 hover:shadow-md cursor-pointer"
          title="Add Pictures with Notes"
        >
          <CameraIcon className="w-5 h-5" />
        </button>
        <button
          onClick={() => {
            onToolSelect('note');
            onAddNote();
          }}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
            selectedTool === 'note' 
              ? 'bg-action text-white shadow-lg' 
              : 'bg-white text-action hover:bg-action/10 hover:shadow-md'
          }`}
          title="Add Note"
        >
          <StickyNoteIcon className="w-5 h-5" />
        </button>
        <div className="w-px h-8 bg-gray-300 mx-2" />
        <button
          onClick={onUndo}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 bg-white text-action hover:bg-action/10 hover:shadow-md"
          title="Undo"
        >
          <UndoIcon className="w-5 h-5" />
        </button>
        <button
          onClick={onRedo}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 bg-white text-action hover:bg-action/10 hover:shadow-md"
          title="Redo"
        >
          <RedoIcon className="w-5 h-5" />
        </button>
      </div>
    );
  };

  return (
    <div className="bg-white border-b border-border-gray rounded-t-xl sticky top-0 z-40">
      {/* Top Row - Document Info and Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between px-4 sm:px-6 py-4 gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-cancelled-color/15 rounded flex items-center justify-center">
              <PDFIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-semibold text-black truncate max-w-[200px] sm:max-w-none">
                {selectedFile?.name || `${projectName}.pdf`}
              </h1>
            </div>
          </div>
          {/* Category Heading */}
          {selectedFile?.category && (
            <div className="flex items-center gap-2 ml-11">
              <span className="text-xs text-text-gray">Category:</span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-action/10 text-action border border-action/20">
                {selectedFile.category}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <SearchIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-placeholder-gray pointer-events-none" />
            <FormInput
              label=""
              placeholder="Search here..."
              className="w-full sm:w-64 bg-light-gray border-none focus:ring-0"
              value={searchQuery}
              onChange={onSearchChange}
            />
            {searchResults.count > 0 && (
              <div className="absolute -bottom-8 left-0 right-0 flex items-center justify-between text-xs text-text-gray bg-white border border-border-gray rounded px-2 py-1 z-10">
                <span className="truncate">{searchResults.currentIndex} of {searchResults.count} results</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onNavigateSearch('prev')}
                    className="p-1 hover:bg-light-gray rounded"
                    title="Previous result"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => onNavigateSearch('next')}
                    className="p-1 hover:bg-light-gray rounded"
                    title="Next result"
                  >
                    ↓
                  </button>
                </div>
              </div>
            )}
          </div>
          <Button onClick={onExportPdf} variant="primary" className="w-full sm:w-auto">
            <span className="hidden sm:inline">Save & Export</span>
            <span className="sm:hidden">Export</span>
          </Button>
        </div>
      </div>
      
      {/* Main Toolbar */}
      <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 px-2 sm:px-4 lg:px-6 py-3 bg-white border-t border-border-gray overflow-x-auto">
        <button 
          onClick={() => onTabChange('view')}
          className={`flex items-center gap-1 sm:gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'view' 
              ? 'text-action border-b-2 border-action pb-1' 
              : 'text-text-gray hover:text-action pb-1'
          }`}
        >
          <EyeIcon className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
          <span className="text-xs sm:text-sm font-medium">View File</span>
        </button>
        <button 
          onClick={() => onTabChange('annotate')}
          className={`flex items-center gap-1 sm:gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'annotate' 
              ? 'text-action border-b-2 border-action pb-1' 
              : 'text-text-gray hover:text-action pb-1'
          }`}
        >
          <FileTextIcon className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
          <span className="text-xs sm:text-sm font-medium">Annotate</span>
        </button>
      </div>

      {/* Annotation Tools Sub-toolbar */}
      {renderAnnotationTools()}
      
      {/* Add Pictures with Notes Modal */}
      <AddPicturesWithNotesModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={(pictures, note) => {
          // Handle the uploaded pictures and notes
          console.log('Pictures uploaded from header:', pictures);
          console.log('Note added from header:', note);
          // Close modal after handling
          setIsModalOpen(false);
        }}
      />
    </div>
  );
};

export default DocumentViewerHeader;
