"use client";
import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import ProjectCard from './ProjectCard';

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

interface KanbanColumnProps {
  id: string;
  title: string;
  count: number;
  projects: Project[];
  onProjectClick: (project: Project) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ id, title, count, projects, onProjectClick }) => {
  return (
    <div className="rounded-lg">
      {/* Column Header - Separate div */}
      <div className="bg-white py-2 px-3 sm:px-4 flex items-center mb-4 sm:mb-6 pb-2 rounded-lg gap-1">
        <h2 className="text-sm sm:text-md font-semibold text-black truncate">{title}</h2>
        <span className={`p-1 rounded-full text-xs font-normal flex-shrink-0 ${
          id === 'all' ? 'bg-all-bg text-all-color' :
          id === 'in-progress' ? 'bg-in-progress-bg text-in-progress-color' :
          id === 'completed' ? 'bg-completed-bg text-completed-color' :
          'bg-cancelled-bg text-cancelled-color'
        }`}>
          {count}
        </span>
      </div>
      
      {/* Project Cards - Separate div */}
      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="space-y-3 sm:space-y-4 bg-white rounded-xl p-2 min-h-[200px]"
          >
            {projects.map((project, index) => (
              <Draggable draggableId={project.id} index={index} key={project.id}>
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                  >
                    <ProjectCard 
                      project={project} 
                      onClick={() => onProjectClick(project)}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default KanbanColumn;
