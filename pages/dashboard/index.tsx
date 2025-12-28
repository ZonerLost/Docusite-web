import DashboardHeader from '@/components/dashboard/DashboardHeader';
import KanbanBoard from '@/components/dashboard/KanbanBoard';
import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import LazyWrapper from '@/components/ui/LazyWrapper';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';
import { createProject, subscribeAllProjects, subscribeProjectsForUser, ProjectCardUI } from '@/lib/projects';
import { toast } from 'react-hot-toast';

// Lazy load the modal for better performance
const ProjectDetailsModal = lazy(() => import('@/components/modals/ProjectDetailsModal'));

interface ProjectCard extends ProjectCardUI {}

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<ProjectCard | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState('ascending');
  
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);

  // State for managing projects
  const [projects, setProjects] = useState<ProjectCard[]>([]);

  // Subscribe to user's projects (owner + optional collaborator index)
  useEffect(() => {
    let stopProjects: null | (() => void) = null;
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setCurrentUid(u?.uid ?? null);
      setCurrentEmail(u?.email ?? null);

      // reset any existing subscription
      if (stopProjects) {
        try { stopProjects(); } catch {}
        stopProjects = null;
      }

      // Admin panel view: show all projects for any authenticated user
      stopProjects = subscribeAllProjects((items) => setProjects(items));
    });
    return () => {
      unsubAuth();
      if (stopProjects) try { stopProjects(); } catch {}
    };
  }, []);

  const isInvolved = (p: ProjectCardUI, uid: string | null, email: string | null) => {
    if (!uid && !email) return false;
    const e = (email || "").toLowerCase();

    // Prefer raw doc if available
    const raw = (p as any).raw;
    if (raw) {
      if (raw.ownerId === uid) return true;
      if (Array.isArray(raw.collaboratorUids) && uid && raw.collaboratorUids.includes(uid)) return true;
      if (Array.isArray(raw.collaborators)) {
        return raw.collaborators.some((c: any) => {
          if (uid && c?.uid && c.uid === uid) return true;
          if (e && c?.email && String(c.email).toLowerCase() === e) return true;
          return false;
        });
      }
    }

    // Fallback if raw is missing: use safe fields
    const ownerName = ((p as any).projectOwner || "").trim().toLowerCase();
    const assignedTo = (p.assignedTo || "").trim().toLowerCase();
    const emailKey = e ? e.split("@")[0] : "";
    return !!emailKey && (ownerName.includes(emailKey) || assignedTo.includes(emailKey));
  };

  // Filter and sort projects based on search query and sortBy value
  const filteredAndSortedProjects = React.useMemo(() => {
    // First filter by search query
    let filtered = projects;
    if (searchQuery.trim()) {
      filtered = projects.filter(project => 
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.assignedTo.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Then sort the filtered results
    const sorted = [...filtered];

    const mineFirst = (a: ProjectCardUI, b: ProjectCardUI) => {
      const aMine = isInvolved(a, currentUid, currentEmail) ? 1 : 0;
      const bMine = isInvolved(b, currentUid, currentEmail) ? 1 : 0;
      return bMine - aMine; // mine first
    };
    
    switch (sortBy) {
      case 'ascending':
        return sorted.sort((a, b) => {
          const primary = mineFirst(a, b);
          if (primary !== 0) return primary;
          return a.name.localeCompare(b.name);
        });
      case 'descending':
        return sorted.sort((a, b) => {
          const primary = mineFirst(a, b);
          if (primary !== 0) return primary;
          return b.name.localeCompare(a.name);
        });
      case 'name':
        return sorted.sort((a, b) => {
          const primary = mineFirst(a, b);
          if (primary !== 0) return primary;
          return a.name.localeCompare(b.name);
        });
      case 'date':
        return sorted.sort((a, b) => {
          const primary = mineFirst(a, b);
          if (primary !== 0) return primary;
          const aTs = a.lastUpdatedTs || 0;
          const bTs = b.lastUpdatedTs || 0;
          return bTs - aTs;
        });
      case 'status':
        return sorted.sort((a, b) => {
          const primary = mineFirst(a, b);
          if (primary !== 0) return primary;
          const statusOrder: Record<string, number> = { 'in-progress': 1, 'completed': 2, 'cancelled': 3 };
          return (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
        });
      default:
        return sorted.sort((a, b) => {
          const primary = mineFirst(a, b);
          if (primary !== 0) return primary;
          return 0;
        });
    }
  }, [projects, sortBy, searchQuery, currentUid, currentEmail]);

  const handleProjectClick = useCallback(async (project: ProjectCard) => {
    try {
      const { checkProjectPermission } = await import('@/lib/permissions');
      const ok = await checkProjectPermission(project.id);
      if (!ok) return; // toast already shown
    } catch {
      // If the permission check fails unexpectedly, do not open
      return;
    }
    setSelectedProject(project);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedProject(null);
  }, []);

  const handleCreateProject = useCallback(async (projectData: any) => {
    try {
      await createProject({
        title: projectData.title,
        clientName: projectData.clientName,
        location: projectData.location,
        deadline: projectData.deadline,
        // Treat provided emails as invite targets only; they are
        // not added to the project until the invite is accepted.
        members: projectData.members,
        viewAccess: projectData.viewAccess,
        editAccess: projectData.editAccess,
      });
      toast.success('Project created');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to create project:', e);
      toast.error('Failed to create project');
    }
  }, []);

  return (
    <>
      <DashboardHeader 
        searchQuery={searchQuery} 
        onSearchChange={setSearchQuery}
        onCreateProject={handleCreateProject}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />
      {filteredAndSortedProjects.length === 0 && searchQuery.trim() ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-2">No projects found</div>
          <div className="text-gray-400 text-sm">
            Try searching with different keywords or clear the search to see all projects
          </div>
        </div>
      ) : (
        <KanbanBoard projects={filteredAndSortedProjects} onProjectClick={handleProjectClick} />
      )}
      
      {/* Project Details Modal */}
      {isModalOpen && (
        <LazyWrapper>
          <ProjectDetailsModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            project={selectedProject as any}
          />
        </LazyWrapper>
      )}
    </>
  );
}

