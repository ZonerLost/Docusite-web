import React, { useRef, useState } from 'react';
import { Plus, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/router';
import { PDFIcon } from '@/components/ui/Icons';
import CategorySelectionModal from '@/components/modals/CategorySelectionModal';

interface File {
  id: string;
  name: string;
  lastUpdated: string;
  type: 'pdf' | 'image' | 'document';
  category?: string;
}

interface FilesListProps {
  projectId: string;
  project?: {
    id: string;
    name: string;
    clientName?: string;
    status: 'in-progress' | 'completed' | 'cancelled';
    location: string;
    projectOwner?: string;
    deadline?: string;
    members?: number;
  };
}

const FilesList: React.FC<FilesListProps> = ({ projectId, project }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  
  const [files, setFiles] = useState<File[]>([
    {
      id: '1',
      name: 'Kitchendrawing.pdf',
      lastUpdated: '2 mins ago',
      type: 'pdf',
      category: 'STRUCTURAL'
    },
    {
      id: '2',
      name: 'Interior/ Finishes Plan.pdf',
      lastUpdated: '5 mins ago',
      type: 'pdf',
      category: 'Interior/ Finishes'
    },
    {
      id: '3',
      name: 'Architecture Design.pdf',
      lastUpdated: '1 hour ago',
      type: 'pdf',
      category: 'Architectural'
    },
    {
      id: '4',
      name: 'MEP Requirements.pdf',
      lastUpdated: '2 hours ago',
      type: 'pdf',
      category: 'MEP'
    }
  ]);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleAddPDF = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      const file = selectedFiles[0];
      
      // Validate file type
      if (file.type !== 'application/pdf') {
        alert('Please select a PDF file');
        return;
      }
      
      // Validate file size (e.g., max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > maxSize) {
        alert('File size must be less than 10MB');
        return;
      }
      
      // Create new file object (without category initially)
      const newFile: File = {
        id: Date.now().toString(), // Simple ID generation
        name: file.name,
        lastUpdated: 'Just now',
        type: 'pdf'
      };
      
      // Store the file temporarily and open category selection modal
      setPendingFile(newFile);
      setIsCategoryModalOpen(true);
      
      // Reset the input value so the same file can be selected again
      event.target.value = '';
    }
  };

  const handleCategorySelect = (category: string) => {
    if (pendingFile) {
      const fileWithCategory: File = {
        ...pendingFile,
        category: category
      };
      
      // Add new file to the files list
      setFiles(prevFiles => [fileWithCategory, ...prevFiles]);
      
      console.log('Added new PDF file:', fileWithCategory.name, 'with category:', category, 'for project:', projectId);
      
      // Clear pending file
      setPendingFile(null);
    }
  };

  const handleFileClick = (fileId: string) => {
    if (!project) return;
    
    // Find the selected file
    const selectedFile = files.find(file => file.id === fileId);
    
    try {
      // Persist selected project and file for the details page to consume
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('currentProject', JSON.stringify(project));
        if (selectedFile) {
          sessionStorage.setItem('selectedFile', JSON.stringify(selectedFile));
        }
      }
    } catch (error) {
      console.error('Error storing project/file in sessionStorage:', error);
    }
    
    // Navigate to project details page
    router.push({ pathname: '/dashboard/project-details', query: { projectId: project.id } });
  };

  return (
    <div>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />
      
      {/* Add PDF Button */}
      <div className="mb-4">
        <button
          onClick={handleAddPDF}
          className="text-action hover:text-action/80 font-medium text-sm flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          <span>Add new PDF</span>
        </button>
      </div>

      {/* New Items Indicators */}
      <div className="flex gap-2 mb-4">
        <span className="bg-cancelled-bg text-cancelled-color px-2 py-1 rounded text-xs font-medium">
          2 new images
        </span>
        <span className="bg-cancelled-bg text-cancelled-color px-2 py-1 rounded text-xs font-medium">
          2 new comments
        </span>
      </div>

      {/* Files List Grouped by Category */}
      <div className="space-y-4">
        {(() => {
          // Group files by category
          const groupedFiles = files.reduce((acc, file) => {
            const category = file.category || 'Others';
            if (!acc[category]) {
              acc[category] = [];
            }
            acc[category].push(file);
            return acc;
          }, {} as Record<string, File[]>);

          // Sort categories
          const categoryOrder = ['STRUCTURAL', 'MEP', 'Architectural', 'Interior/ Finishes', 'Others'];
          const sortedCategories = categoryOrder.filter(cat => groupedFiles[cat]);

          return sortedCategories.map((category) => (
            <div key={category} className="space-y-2">
              {/* Category Header */}
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-black">{category}</h3>
                <span className="text-xs text-text-gray bg-gray-100 px-2 py-1 rounded-full">
                  {groupedFiles[category].length} file{groupedFiles[category].length !== 1 ? 's' : ''}
                </span>
              </div>
              
              {/* Files in this category */}
              <div className="space-y-2">
                {groupedFiles[category].map((file) => (
                  <div
                    key={file.id}
                    onClick={() => handleFileClick(file.id)}
                    className="flex items-center justify-between p-4 bg-white border border-border-gray rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-cancelled-color/25 flex items-center justify-center">
                        <PDFIcon className="w-6 h-6 text-cancelled-color" />
                      </div>
                      <div>
                        <h4 className="text-black font-medium text-sm">{file.name}</h4>
                        <p className="text-text-gray text-xs">Last updated: {file.lastUpdated}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-black" />
                  </div>
                ))}
              </div>
            </div>
          ));
        })()}
      </div>

      {/* Category Selection Modal */}
      <CategorySelectionModal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setPendingFile(null);
        }}
        onCategorySelect={handleCategorySelect}
      />
    </div>
  );
};

export default FilesList;
