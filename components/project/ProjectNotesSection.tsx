import React from 'react';
import { FileTextIcon } from 'lucide-react';

interface ProjectNotesSectionProps {
  notes: string[];
}

const ProjectNotesSection: React.FC<ProjectNotesSectionProps> = ({ notes }) => {
  if (notes.length === 0) return null;

  return (
    <div className="mt-6 pt-4 border-t-2 border-dashed border-gray-200 -mx-4 px-4 pb-4 rounded-b-lg sm:-mx-6 sm:px-6 sm:pb-6 sm:rounded-b-xl">
      <h3 className="m-0 mb-4 text-base sm:text-lg text-gray-800 font-semibold flex items-center gap-2">
        <FileTextIcon className="w-4 h-4 sm:w-5 sm:h-5" /> 
        <span>Project Notes</span>
      </h3>
      <div className="formatted-notes space-y-3">
        {notes.map((note, idx) => (
          <div key={idx} className="text-xs sm:text-sm leading-relaxed p-3 sm:p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div dangerouslySetInnerHTML={{ __html: note }} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectNotesSection;
