"use client";
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import KanbanColumn from './KanbanColumn';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { updateProjectStatus } from '@/lib/projects';
import { checkProjectEditPermission } from '@/lib/permissions';
import { toast } from 'react-hot-toast';

interface Project {
  id: string;
  name: string;
  location: string;
  team: string[];
  lastUpdatedTime: string;
  assignedTo: string;
  deadlineDate?: string;
  progress?: number;
  status: 'all' | 'in-progress' | 'completed' | 'cancelled';
}

interface KanbanBoardProps {
  projects: Project[];
  onProjectClick: (project: Project) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = React.memo(({ projects, onProjectClick }) => {
  const initialColumns = useMemo(() => {
    // Filter out any projects with invalid statuses
    const validProjects = projects.filter((p: Project) => 
      ['in-progress', 'completed', 'cancelled'].includes(p.status)
    );
    
    return {
      'all': validProjects, // Show all valid projects in the "All Projects" column
      'in-progress': validProjects.filter((p: Project) => p.status === 'in-progress'),
      'completed': validProjects.filter((p: Project) => p.status === 'completed'),
      'cancelled': validProjects.filter((p: Project) => p.status === 'cancelled')
    };
  }, [projects]);

  const [columnProjects, setColumnProjects] = useState<Record<string, Project[]>>(initialColumns);

  // Update columnProjects when projects prop changes
  React.useEffect(() => {
    setColumnProjects(initialColumns);
  }, [initialColumns]);

  const onDragEnd = useCallback(async (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;

    const sourceColId = source.droppableId;
    const destColId = destination.droppableId;

    if (sourceColId === destColId && source.index === destination.index) return;

    // Keep a snapshot for rollback on failure
    let prevSnapshot: Record<string, Project[]> | null = null;
    let movedProjectId: string | null = null;

    setColumnProjects((prev) => {
      prevSnapshot = prev;
      const sourceItems = Array.from(prev[sourceColId] || []);
      const [moved] = sourceItems.splice(source.index, 1);
      movedProjectId = moved?.id || null;

      const destItems = sourceColId === destColId ? sourceItems : Array.from(prev[destColId] || []);

      // Only update status if not dropping into "All Projects" column
      let updatedMoved: Project = { ...moved };
      if (destColId !== 'all') {
        updatedMoved = { ...moved, status: destColId as Project['status'] };
      }
      destItems.splice(destination.index, 0, updatedMoved);

      return {
        ...prev,
        [sourceColId]: sourceColId === destColId ? destItems : sourceItems,
        [destColId]: destItems,
      };
    });

    // Persist status change to Firestore when moved into a status column
    if (destColId !== 'all' && movedProjectId && sourceColId !== destColId) {
      const ok = await checkProjectEditPermission(movedProjectId);
      if (!ok) {
        if (prevSnapshot) setColumnProjects(prevSnapshot);
        return;
      }
      updateProjectStatus(movedProjectId, destColId as 'in-progress' | 'completed' | 'cancelled')
        .catch((err) => {
          // Roll back optimistic update
          if (prevSnapshot) setColumnProjects(prevSnapshot);
          // Inform the user
          toast.error('Failed to update project status.');
          // eslint-disable-next-line no-console
          console.error('updateProjectStatus failed:', err);
        });
    }
  }, []);

  const columns = [
    { id: 'all', title: 'All Projects', projects: columnProjects['all'] || [] },
    { id: 'in-progress', title: 'In Progress', projects: columnProjects['in-progress'] || [] },
    { id: 'completed', title: 'Completed', projects: columnProjects['completed'] || [] },
    { id: 'cancelled', title: 'Cancelled', projects: columnProjects['cancelled'] || [] }
  ];


  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            count={column.projects.length}
            projects={column.projects}
            onProjectClick={onProjectClick}
          />
        ))}
      </div>
    </DragDropContext>
  );
});

KanbanBoard.displayName = 'KanbanBoard';

export default KanbanBoard;
