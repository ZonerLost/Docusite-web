import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { X } from 'lucide-react';
import ProjectHeader from './project-details/ProjectHeader';
import FilesList from './project-details/FilesList';
import ProjectInfo from './project-details/ProjectInfo';
import ProjectTabs from './project-details/ProjectTabs';
import MembersList from './project-details/MembersList';
import AddMemberModal from './AddMemberModal';
import CreateProjectModal from './CreateProjectModal';

interface Project {
  id: string;
  name: string;
  clientName?: string;
  status: 'in-progress' | 'completed' | 'cancelled';
  location: string;
  projectOwner?: string;
  deadline?: string;
  members?: number;
}

interface ProjectDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
}

const ProjectDetailsModal: React.FC<ProjectDetailsModalProps> = ({ isOpen, onClose, project }) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('files');
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [addMemberMode, setAddMemberMode] = useState<'invite' | 'add'>('add');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  if (!isOpen || !project) return null;

  const handleEditProject = () => {
    setIsEditModalOpen(true);
  };

  const handleRedirectToProjectDetails = () => {
    if (!project) return;
    try {
      // Persist selected project for the details page to consume
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('currentProject', JSON.stringify(project));
      }
    } catch {}
    router.push({ pathname: '/dashboard/project-details', query: { projectId: project.id } });
    onClose();
  };

  const handleDeleteProject = () => {
    console.log('Delete project:', project.id);
  };

  const handleGroupChat = () => {
    console.log('Open group chat for project:', project.id);
    onClose();
    router.push('/dashboard/messages')
  };

  const handleInviteMembers = () => {
    setAddMemberMode('invite');
    setIsAddMemberOpen(true);
  };

  const handleAddMemberClickFromList = () => {
    setAddMemberMode('add');
    setIsAddMemberOpen(true);
  };

  const handleAddMember = (memberData: { name: string; role: string }) => {
    console.log('Add member to project:', project.id, memberData);
  };

  const handleUpdateProject = (projectData: any) => {
    console.log('Update project:', project.id, projectData);
    setIsEditModalOpen(false);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-light-gray rounded-xl w-full max-w-sm max-h-[90vh] overflow-hidden border border-border-dark-gray">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-text-gray" />
        </button>

        {/* Modal Content */}
        <div className="px-3 py-4 overflow-y-auto max-h-[90vh]">
          <ProjectHeader
            projectName={project.name}
            onEdit={handleEditProject}
            onDelete={handleDeleteProject}
            onGroupChat={handleGroupChat}
            onRedirect={handleRedirectToProjectDetails}
            isMembersTabActive={activeTab === 'members'}
            onInviteMembers={handleInviteMembers}
          />

          <ProjectInfo
            clientName={project.clientName || 'Not specified'}
            status={project.status}
            location={project.location}
            projectOwner={project.projectOwner || 'Not specified'}
            deadline={project.deadline || 'Not specified'}
            members={project.members || 0}
          />

          <ProjectTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            memberCount={project.members || 0}
          />

          {activeTab === 'files' && <FilesList projectId={project.id} project={project} />}
          {activeTab === 'members' && (
            <MembersList 
              projectId={project.id} 
              memberCount={project.members || 0}
              onAddMemberClick={handleAddMemberClickFromList}
            />
          )}
        </div>
        <AddMemberModal
          isOpen={isAddMemberOpen}
          onClose={() => setIsAddMemberOpen(false)}
          onAddMember={handleAddMember}
          title={addMemberMode === 'invite' ? 'Invite new member' : 'Add new member'}
          description={
            addMemberMode === 'invite'
              ? 'Please enter the correct information to invite a new member.'
              : 'Please enter the correct information to add a new member to this project.'
          }
          submitText={addMemberMode === 'invite' ? 'Send invite' : 'Add'}
        />
        
        <CreateProjectModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={handleUpdateProject}
          mode="edit"
          initialData={{
            title: project.name,
            clientName: project.clientName || '',
            location: project.location,
            deadline: project.deadline || '',
            members: [], // You might want to populate this with actual members
            viewAccess: false, // You might want to populate this with actual access settings
            editAccess: false // You might want to populate this with actual access settings
          }}
        />
      </div>
    </div>
  );
};

export default ProjectDetailsModal;
