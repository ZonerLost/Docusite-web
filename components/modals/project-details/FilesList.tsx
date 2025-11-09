import React, { useCallback, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/router";
import CategorySelectionModal from "@/components/modals/CategorySelectionModal";
import { auth } from "@/lib/firebase-client";
import { uploadProjectPdfWithToast } from "@/services/pdfUpload";
import { checkProjectPermission, checkProjectEditPermission } from "@/lib/permissions";
import { toast } from "react-hot-toast";
import { openGoogleDrivePicker, downloadDriveFileAsBlob } from "@/lib/googlePicker";
import { useProjectFiles } from "@/hooks/useProjectFiles";
import { useClickOutside } from "@/hooks/useClickOutside";
import FileCategorySection from "@/components/modals/project-details/FileCategorySection";
import FileUploadOptions from "@/components/modals/project-details/FileUploadOptions";
import { groupFilesByCategory, sortCategories } from "@/utils/projectFiles";
import type { ProjectFileUi } from "@/types/project-files";

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
    raw?: {
      files?: {
        category?: string;
        fileName: string;
        fileUrl: string;
        lastUpdated?: unknown;
      }[];
    };
  };
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const logError = (message: string, error: unknown) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error(message, error);
  }
};

const FilesList: React.FC<FilesListProps> = ({ projectId, project }) => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMenuContainerRef = useRef<HTMLDivElement>(null);

  const { files } = useProjectFiles(projectId);

  const [pendingFile, setPendingFile] = useState<ProjectFileUi | null>(null);
  const [selectedBlob, setSelectedBlob] = useState<File | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);

  const closeUploadMenu = useCallback(() => setIsUploadMenuOpen(false), []);
  const toggleUploadMenu = useCallback(() => setIsUploadMenuOpen((prev) => !prev), []);

  useClickOutside(uploadMenuContainerRef, closeUploadMenu, { enabled: isUploadMenuOpen });

  const preparePendingFile = useCallback((file: File) => {
    const nextFile: ProjectFileUi = {
      id: Date.now().toString(),
      name: file.name,
      lastUpdated: 'Just now',
      type: 'pdf',
    };
    setPendingFile(nextFile);
    setSelectedBlob(file);
    setIsCategoryModalOpen(true);
  }, []);

  const handleDeviceUpload = useCallback(() => {
    closeUploadMenu();
    fileInputRef.current?.click();
  }, [closeUploadMenu]);

  const handlePickFromDrive = useCallback(async () => {
    closeUploadMenu();
    try {
      const result = await openGoogleDrivePicker();
      const picked = result?.picked || null;
      const accessToken = result?.accessToken || null;
      if (!picked) return;
      if (!accessToken) {
        throw new Error('Missing access token for Google Drive');
      }

      const blob = await downloadDriveFileAsBlob(picked.id, accessToken);
      const mime = blob.type || picked.mimeType || 'application/pdf';
      if (mime !== 'application/pdf') {
        toast.error('Selected file is not a PDF');
        return;
      }

      if (blob.size > MAX_FILE_SIZE) {
        toast.error('File size must be 20MB or less');
        return;
      }

      const suggestedName = picked.name?.toString().trim() || 'document.pdf';
      const fileName = suggestedName.toLowerCase().endsWith('.pdf') ? suggestedName : `${suggestedName}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });

      preparePendingFile(file);
      toast.success('Loaded from Google Drive');
    } catch (error) {
      logError('[FilesList] Google Drive picker failed', error);
      toast.error(error instanceof Error ? error.message : 'Failed to open Google Drive picker');
    }
  }, [closeUploadMenu, preparePendingFile]);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (!selectedFile) return;

      if (selectedFile.type !== 'application/pdf') {
        toast.error('Please select a PDF file');
        event.target.value = '';
        return;
      }

      if (selectedFile.size > MAX_FILE_SIZE) {
        toast.error('File size must be 20MB or less');
        event.target.value = '';
        return;
      }

      preparePendingFile(selectedFile);
      event.target.value = '';
    },
    [preparePendingFile]
  );

  const handleCategorySelect = useCallback(
    async (category: string) => {
      if (!pendingFile) return;
      try {
        const canEdit = await checkProjectEditPermission(projectId);
        if (!canEdit) return;

        const file = selectedBlob;
        if (!file) throw new Error('No file selected');

        const uploader = auth.currentUser;
        const uploadedBy = uploader?.displayName || uploader?.email || uploader?.uid || 'user';
        await uploadProjectPdfWithToast({
          file,
          pdfTitle: file.name,
          projectId,
          uploadedBy,
          category,
          requestId:
            (globalThis as any).crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          originalFileName: file.name,
        });
      } catch (error) {
        logError('Upload failed', error);
        toast.error(error instanceof Error ? error.message : 'Failed to upload PDF');
      } finally {
        setPendingFile(null);
        setSelectedBlob(null);
        setIsCategoryModalOpen(false);
      }
    },
    [pendingFile, projectId, selectedBlob]
  );

  const handleFileClick = useCallback(
    async (fileId: string) => {
      if (!project) return;
      try {
        const allowed = await checkProjectPermission(project.id);
        if (!allowed) return;
      } catch {
        return;
      }

      const selectedFile = files.find((file) => file.id === fileId);

      try {
        if (typeof window !== 'undefined') {
          const lightweightProject = {
            id: project.id,
            name: project.name,
            status: project.status,
            location: project.location,
          };
          sessionStorage.setItem('currentProject', JSON.stringify(lightweightProject));
          if (selectedFile) {
            const lightweightFile = {
              id: selectedFile.id,
              name: selectedFile.name,
              category: selectedFile.category,
            };
            sessionStorage.setItem('selectedFile', JSON.stringify(lightweightFile));
          }
        }
      } catch (error) {
        logError('Error storing project/file in sessionStorage', error);
      }

      router.push({ pathname: '/dashboard/project-details', query: { projectId: project.id } });
    },
    [files, project, router]
  );

  const { groupedFiles, sortedCategories } = useMemo(() => {
    const grouped = groupFilesByCategory(files);
    return {
      groupedFiles: grouped,
      sortedCategories: sortCategories(grouped),
    };
  }, [files]);

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="mb-4 relative" ref={uploadMenuContainerRef}>
        <button
          onClick={toggleUploadMenu}
          className="text-action hover:text-action/80 font-medium text-sm flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          <span>Add new PDF</span>
        </button>
        <FileUploadOptions
          isOpen={isUploadMenuOpen}
          onSelectDevice={handleDeviceUpload}
          onSelectDrive={handlePickFromDrive}
        />
      </div>

      <div className="space-y-4">
        {sortedCategories.map((category) => (
          <FileCategorySection
            key={category}
            category={category}
            files={groupedFiles[category] || []}
            onSelect={handleFileClick}
          />
        ))}
      </div>

      <CategorySelectionModal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setPendingFile(null);
          setSelectedBlob(null);
        }}
        onCategorySelect={handleCategorySelect}
      />
    </div>
  );
};

export default FilesList;
