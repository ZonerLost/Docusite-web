import React, { memo } from "react";
import { ChevronRight } from "lucide-react";
import { PDFIcon } from "@/components/ui/Icons";
import type { ProjectFileUi } from "@/types/project-files";

interface FileCategorySectionProps {
  category: string;
  files: ProjectFileUi[];
  onSelect: (fileId: string) => void;
}

const FileCategorySectionComponent: React.FC<FileCategorySectionProps> = ({ category, files, onSelect }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-black">{category}</h3>
        <span className="text-xs text-text-gray bg-gray-100 px-2 py-1 rounded-full">
          {files.length} file{files.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="space-y-2">
        {files.map((file) => (
          <button
            key={file.id}
            type="button"
            onClick={() => onSelect(file.id)}
            className="w-full flex items-center justify-between p-4 bg-white border border-border-gray rounded-lg hover:bg-gray-50 transition-colors text-left"
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
          </button>
        ))}
      </div>
    </div>
  );
};

const FileCategorySection = memo(FileCategorySectionComponent);

export default FileCategorySection;
