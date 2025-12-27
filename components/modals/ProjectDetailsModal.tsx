import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { X } from 'lucide-react';
import ProjectHeader from './project-details/ProjectHeader';
import FilesList from './project-details/FilesList';
import ProjectInfo from './project-details/ProjectInfo';
import ProjectTabs from './project-details/ProjectTabs';
import MembersList from './project-details/MembersList';
import AddMemberModal from './AddMemberModal';
import CreateProjectModal from './CreateProjectModal';
import { updateProject, deleteProject, Collaborator, ProjectDoc } from '@/lib/projects';
import { toast } from 'react-hot-toast';
import ConfirmDeleteModal from './ConfirmDeleteModal';
// Firestore direct imports no longer needed here after invite switch
// Keep UI and other logic unchanged
import { sendProjectInvite } from '@/lib/invitations';
import { checkProjectPermission, checkProjectEditPermission } from '@/lib/permissions';

interface Project {
  id: string;
  name: string;
  clientName?: string;
  status: 'in-progress' | 'completed' | 'cancelled';
  location: string;
  projectOwner?: string;
  deadline?: string;
  members?: number;
  raw?: ProjectDoc;
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
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // Local copy for optimistic updates (e.g., adding members)
  const [localProject, setLocalProject] = useState<Project | null>(project);

  // Keep localProject in sync if parent prop changes while modal is open
  React.useEffect(() => {
    if (isOpen) setLocalProject(project);
  }, [isOpen, project]);

  if (!isOpen || !project) return null;

  const handleEditProject = () => {
    setIsEditModalOpen(true);
  };

  const handleRedirectToProjectDetails = async () => {
    if (!project) return;
    try {
      const { checkProjectPermission } = await import('@/lib/permissions');
      const ok = await checkProjectPermission(project.id);
      if (!ok) return;
    } catch {
      // Block navigation on unexpected errors
      return;
    }
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('currentProject', JSON.stringify(project));
      }
    } catch {}
    router.push({ pathname: '/dashboard/project-details', query: { projectId: project.id } });
    onClose();
  };

  const handleDeleteProject = () => {
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!project) return;
    setIsDeleting(true);
    try {
      const ok = await checkProjectEditPermission(project.id);
      if (!ok) { setIsDeleteOpen(false); return; }
      await deleteProject(project.id);
      toast.success('Project deleted');
      setIsDeleteOpen(false);
      onClose();
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete project:', e);
      const code = e?.code || e?.message || '';
      const msg = code === 'permission-denied'
        ? 'Permission denied. Only the project owner can delete.'
        : 'Failed to delete project';
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGroupChat = () => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('currentProject', JSON.stringify(project));
      }
    } catch {}
    onClose();
    router.push({ pathname: '/dashboard/messages', query: { projectId: project.id } });
  };

  const handleInviteMembers = () => {
    setAddMemberMode('invite');
    setIsAddMemberOpen(true);
  };

  const handleAddMemberClickFromList = () => {
    setAddMemberMode('add');
    setIsAddMemberOpen(true);
  };

  const handleAddMember = async (memberData: { name: string; email: string; role: string }) => {
    if (!project) return;
    const pid = project.id;
    try {
      const ok = await checkProjectEditPermission(pid);
      if (!ok) return;
      await sendProjectInvite({
        projectId: pid,
        projectTitle: project.name,
        invitedEmail: (memberData.email || '').trim(),
        invitedUserName: (memberData.name || '').trim(),
        role: (memberData.role || '').trim() || 'Member',
        accessLevel: 'view',
      });
      toast.success('Invite sent');
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to send invite:', e);
      const msg = e?.code === 'permission-denied'
        ? 'Permission denied. Only the project owner can invite.'
        : 'Failed to send invite';
      toast.error(msg);
    } finally {
      setIsAddMemberOpen(false);
    }
  };

  const handleUpdateProject = async (projectData: any) => {
    try {
      const ok = await checkProjectEditPermission(project.id);
      if (!ok) return;
      await updateProject(project.id, {
        title: projectData.title,
        clientName: projectData.clientName,
        location: projectData.location,
        deadline: projectData.deadline,
        // Do not auto-add new emails as collaborators here;
        // they should only become members after accepting the invite.
        viewAccess: projectData.viewAccess,
        editAccess: projectData.editAccess,
      });
      // After updating fields, trigger invites for any new emails not already collaborators
      try {
        const existingEmails = new Set(
          ((localProject || project).raw?.collaborators || [])
            .map((c: any) => (c?.email || '').toString().trim().toLowerCase())
            .filter(Boolean)
        );
        const requested: string[] = Array.isArray(projectData.members) ? projectData.members : [];
        const newEmails = Array.from(
          new Set(
            requested
              .map((e) => (e || '').toString().trim().toLowerCase())
              .filter((e) => !!e && !existingEmails.has(e))
          )
        );
        if (newEmails.length > 0) {
          await Promise.allSettled(
            newEmails.map((email) =>
              sendProjectInvite({
                projectId: project.id,
                projectTitle: project.name,
                invitedEmail: email,
                role: 'Member',
                accessLevel: projectData.editAccess ? 'edit' : 'view',
              })
            )
          );
        }
      } catch {
        // Swallow invite errors to avoid blocking update flow
      }
      toast.success('Project updated');
      setIsEditModalOpen(false);
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to update project:', e);
      const msg = e?.code === 'permission-denied'
        ? 'Permission denied. Only the project owner can update.'
        : 'Failed to update project';
      toast.error(msg);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
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
            projectName={(localProject || project).name}
            onEdit={handleEditProject}
            onDelete={handleDeleteProject}
            onGroupChat={handleGroupChat}
            onRedirect={handleRedirectToProjectDetails}
            isMembersTabActive={activeTab === 'members'}
            onInviteMembers={handleInviteMembers}
          />

          <ProjectInfo
            clientName={(localProject || project).clientName || 'Not specified'}
            status={(localProject || project).status}
            location={(localProject || project).location}
            projectOwner={(localProject || project).projectOwner || 'Not specified'}
            deadline={(localProject || project).deadline || 'Not specified'}
            members={(localProject || project).members || 0}
          />

          <ProjectTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            memberCount={(localProject || project).members || 0}
          />

          {activeTab === 'files' && <FilesList projectId={project.id} project={(localProject || project)} />}
          {activeTab === 'members' && (
            <MembersList 
              projectId={project.id}
              memberCount={(localProject || project).members || 0}
              collaborators={(localProject || project).raw?.collaborators as any}
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
            members: Array.from(
              new Set(
                ((localProject || project).raw?.collaborators || [])
                  .map((c: any) => (c?.email || '').toString().trim().toLowerCase())
                  .filter(Boolean)
              )
            ),
            // Load previously saved access: if any non-owner collaborator has edit, prefer edit; else view
            viewAccess: (() => {
              try {
                const collabs = (((localProject || project).raw?.collaborators || []) as any[]) || [];
                const ownerId = (localProject || project).raw?.ownerId || '';
                const anyEdit = collabs.some((c) => {
                  if (!c) return false;
                  const isOwner = (c?.uid && c.uid === ownerId) || String(c?.role || '').toLowerCase().includes('owner');
                  if (isOwner) return false;
                  const role = String(c?.role || '').toLowerCase();
                  return c?.canEdit === true || role.includes('edit');
                });
                return !anyEdit;
              } catch { return true; }
            })(),
            editAccess: (() => {
              try {
                const collabs = (((localProject || project).raw?.collaborators || []) as any[]) || [];
                const ownerId = (localProject || project).raw?.ownerId || '';
                const anyEdit = collabs.some((c) => {
                  if (!c) return false;
                  const isOwner = (c?.uid && c.uid === ownerId) || String(c?.role || '').toLowerCase().includes('owner');
                  if (isOwner) return false;
                  const role = String(c?.role || '').toLowerCase();
                  return c?.canEdit === true || role.includes('edit');
                });
                return anyEdit;
              } catch { return false; }
            })(),
          }}
        />
      </div>
    </div>
    <ConfirmDeleteModal
      isOpen={isDeleteOpen}
      onCancel={() => setIsDeleteOpen(false)}
      onConfirm={handleConfirmDelete}
      loading={isDeleting}
      title="Delete project?"
      message={`Are you sure you want to delete "${project.name}"? This action cannot be undone.`}
      confirmText="Delete"
      cancelText="Cancel"
    />
    </>
  );
};

export default ProjectDetailsModal;
