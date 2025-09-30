import React from "react";
import Button from "@/components/ui/Button";
import { DeleteIcon, EditIcon } from "@/components/ui/Icons";
import { ExternalLink, UserPlus } from "lucide-react";

interface ProjectHeaderProps {
  projectName: string;
  onEdit: () => void;
  onDelete: () => void;
  onGroupChat: () => void;
  onRedirect: () => void;
  isMembersTabActive?: boolean;
  onInviteMembers?: () => void;
}

const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  projectName,
  onEdit,
  onDelete,
  onGroupChat,
  onRedirect,
  isMembersTabActive,
  onInviteMembers,
}) => {
  return (
    <div className="mb-6">
      {/* Action Buttons */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={onEdit}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors group relative"
          title="Edit Project"
        >
          <EditIcon className="w-4 h-4 text-black" />
          <div className="absolute top-full left-0 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[60]">
            Edit Project
          </div>
        </button>

        {isMembersTabActive && (
          <button
            onClick={onInviteMembers}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors group relative"
            title="Invite Members"
          >
            <UserPlus className="w-4 h-4 text-black" />
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[60]">
              Invite Members
            </div>
          </button>
        )}

        <button
          onClick={onDelete}
          className="p-2 hover:bg-red-50 rounded-lg transition-colors group relative"
          title="Delete Project"
        >
          <DeleteIcon className="w-4 h-4" />
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[60]">
            Delete Project
          </div>
        </button>
        <button
          onClick={onRedirect}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors group relative"
          title="View Project Details"
        >
          <ExternalLink className="w-4 h-4 text-black" />
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[60]">
            View Project Details
          </div>
        </button>
      </div>

      {/* Project Title */}
      <h1 className="text-2xl font-semibold text-black mb-4">{projectName}</h1>

      {/* Group Chat Button */}
      <Button
        variant="outline"
        size="md"
        onClick={onGroupChat}
        className="flex w-full items-center gap-2 border-dashed border-action text-action bg-light-blue hover:bg-light-blue/80"
      >
        <span>Group Chat</span>
      </Button>
    </div>
  );
};

export default ProjectHeader;
