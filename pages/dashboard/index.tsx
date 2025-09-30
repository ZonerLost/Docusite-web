import DashboardHeader from '@/components/dashboard/DashboardHeader';
import KanbanBoard from '@/components/dashboard/KanbanBoard';
import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import LazyWrapper from '@/components/ui/LazyWrapper';

// Lazy load the modal for better performance
const ProjectDetailsModal = lazy(() => import('@/components/modals/ProjectDetailsModal'));

interface ProjectCard {
  id: string;
  name: string;
  location: string;
  team: string[];
  lastUpdatedTime: string;
  assignedTo: string;
  deadlineDate?: string;
  progress?: number;
  status: 'all' | 'in-progress' | 'completed' | 'cancelled';
  clientName?: string;
  projectOwner?: string;
  deadline?: string;
  members?: number;
}

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<ProjectCard | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState('ascending');
  
  // Memoized initial project data to prevent recreation on every render
  const initialProjects: ProjectCard[] = useMemo(() => [
    {
      id: '1',
      name: 'Luxury Resort Development',
      location: 'Malibu, California',
      team: ['/avatar.png', '/avatar.png', '/avatar.png'],
      lastUpdatedTime: '5 mins ago',
      assignedTo: 'Sarah Johnson',
      deadlineDate: 'Dec 15, 2024',
      progress: 78,
      status: 'in-progress',
      clientName: 'Oceanview Properties LLC',
      projectOwner: 'Sarah Johnson',
      deadline: 'Dec 15, 2024',
      members: 3
    },
    {
      id: '2',
      name: 'Office Complex Renovation',
      location: 'Downtown Manhattan, NY',
      team: ['/avatar.png', '/avatar.png'],
      lastUpdatedTime: '1 hour ago',
      assignedTo: 'Michael Chen',
      deadlineDate: 'Jan 30, 2025',
      progress: 45,
      status: 'in-progress',
      clientName: 'Manhattan Real Estate Group',
      projectOwner: 'Michael Chen',
      deadline: 'Jan 30, 2025',
      members: 2
    },
    {
      id: '3',
      name: 'Shopping Mall Expansion',
      location: 'Austin, Texas',
      team: ['/avatar.png', '/avatar.png', '/avatar.png', '/avatar.png'],
      lastUpdatedTime: '2 hours ago',
      assignedTo: 'Emily Rodriguez',
      deadlineDate: 'Nov 20, 2024',
      progress: 100,
      status: 'completed',
      clientName: 'Texas Retail Holdings',
      projectOwner: 'Emily Rodriguez',
      deadline: 'Nov 20, 2024',
      members: 4
    },
    {
      id: '4',
      name: 'Residential Tower',
      location: 'Miami, Florida',
      team: ['/avatar.png', '/avatar.png'],
      lastUpdatedTime: '3 hours ago',
      assignedTo: 'David Kim',
      deadlineDate: 'Oct 10, 2024',
      progress: 100,
      status: 'completed',
      clientName: 'Miami Beach Developers',
      projectOwner: 'David Kim',
      deadline: 'Oct 10, 2024',
      members: 2
    },
    {
      id: '5',
      name: 'Tech Campus Construction',
      location: 'Seattle, Washington',
      team: ['/avatar.png', '/avatar.png', '/avatar.png'],
      lastUpdatedTime: '1 day ago',
      assignedTo: 'Lisa Wang',
      deadlineDate: 'Sep 5, 2024',
      progress: 100,
      status: 'completed',
      clientName: 'TechCorp Industries',
      projectOwner: 'Lisa Wang',
      deadline: 'Sep 5, 2024',
      members: 3
    },
    {
      id: '6',
      name: 'Hospital Wing Addition',
      location: 'Boston, Massachusetts',
      team: ['/avatar.png', '/avatar.png'],
      lastUpdatedTime: '2 days ago',
      assignedTo: 'Robert Taylor',
      deadlineDate: 'Aug 15, 2024',
      progress: 25,
      status: 'cancelled',
      clientName: 'Boston Medical Center',
      projectOwner: 'Robert Taylor',
      deadline: 'Aug 15, 2024',
      members: 2
    },
    {
      id: '7',
      name: 'Sports Complex',
      location: 'Denver, Colorado',
      team: ['/avatar.png', '/avatar.png', '/avatar.png'],
      lastUpdatedTime: '3 days ago',
      assignedTo: 'Jennifer Lee',
      deadlineDate: 'Jul 30, 2024',
      progress: 15,
      status: 'cancelled',
      clientName: 'Denver Sports Authority',
      projectOwner: 'Jennifer Lee',
      deadline: 'Jul 30, 2024',
      members: 3
    },
    {
      id: '8',
      name: 'University Library',
      location: 'Chicago, Illinois',
      team: ['/avatar.png', '/avatar.png'],
      lastUpdatedTime: '1 week ago',
      assignedTo: 'Mark Thompson',
      deadlineDate: 'Jun 20, 2024',
      progress: 8,
      status: 'cancelled',
      clientName: 'University of Chicago',
      projectOwner: 'Mark Thompson',
      deadline: 'Jun 20, 2024',
      members: 2
    }
  ], []);

  // State for managing projects
  const [projects, setProjects] = useState<ProjectCard[]>(initialProjects);

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
    
    switch (sortBy) {
      case 'ascending':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'descending':
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'date':
        return sorted.sort((a, b) => {
          // Sort by lastUpdatedTime (most recent first)
          const dateA = new Date(a.lastUpdatedTime);
          const dateB = new Date(b.lastUpdatedTime);
          return dateB.getTime() - dateA.getTime();
        });
      case 'status':
        return sorted.sort((a, b) => {
          const statusOrder: Record<string, number> = { 'in-progress': 1, 'completed': 2, 'cancelled': 3 };
          return (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
        });
      default:
        return sorted;
    }
  }, [projects, sortBy, searchQuery]);

  const handleProjectClick = useCallback((project: ProjectCard) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedProject(null);
  }, []);

  const handleCreateProject = useCallback((projectData: any) => {
    const newProject: ProjectCard = {
      id: Date.now().toString(), // Simple ID generation
      name: projectData.title,
      location: projectData.location,
      team: projectData.members && projectData.members.length > 0 
        ? projectData.members.map((member: string) => '/avatar.png') 
        : [], // Handle empty members array
      lastUpdatedTime: 'Just now',
      assignedTo: 'You',
      deadlineDate: projectData.deadline,
      progress: 0,
      status: 'in-progress',
      clientName: projectData.clientName,
      projectOwner: 'You',
      deadline: projectData.deadline,
      members: projectData.members ? projectData.members.length : 0
    };
    
    setProjects(prevProjects => [...prevProjects, newProject]);
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
