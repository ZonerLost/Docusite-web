import React from 'react';
import Image from 'next/image';

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    location: string;
    team: string[];
    lastUpdatedTime: string;
    assignedTo: string;
    deadlineDate?: string;
    progress?: number;
    status: 'all' | 'in-progress' | 'completed' | 'cancelled';
  };
  onClick?: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = React.memo(({ project, onClick }) => {
  return (
    <div 
      className="bg-card-bg rounded-lg min p-2 sm:p-3 mb-3 sm:mb-4 shadow-sm border border-border-gray cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <h3 className="font-medium text-black text-base sm:text-lg mb-2 line-clamp-2">{project.name}</h3>
      <p className="text-text-gray text-xs sm:text-sm mb-3 line-clamp-2">{project.location}</p>
      
      {/* Team avatars - overlapping */}
      <div className="flex items-center mb-3">
        {project.team.map((avatar, index) => (
          <div 
            key={index} 
            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-2 border-white"
            style={{ marginLeft: index > 0 ? '-6px' : '0' }}
          >
            <Image
              src={avatar}
              alt={`Team member ${index + 1}`}
              width={32}
              height={32}
              className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover"
            />
          </div>
        ))}
      </div>
      
      {/* Metadata pills */}
      <div className="space-y-2 mb-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="inline-block bg-white text-black text-[10px] sm:text-[12px] px-1 py-1 rounded-md font-medium border border-border-gray">
            <span className="font-normal">Last updated:</span> {project.lastUpdatedTime}
          </div>
          <div className="inline-block bg-white text-black text-[10px] sm:text-[12px] px-1 py-1 rounded-md font-medium border border-border-gray">
            {project.assignedTo}
          </div>
        </div>
        {project.deadlineDate && (
          <div className="block">
            <div className="inline-block bg-white text-black text-[10px] sm:text-[12px] px-1 py-1 rounded-md font-medium border border-border-gray">
              <span className="font-normal">Deadline:</span> {project.deadlineDate}
            </div>
          </div>
        )}
      </div>
      
        {project.progress !== undefined && (
          <div className="mt-3 bg-white p-2 rounded-lg">
            <div className="text-xs sm:text-sm font-medium text-black mb-1">
              <span>Progress</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-action h-2 rounded-full" 
                  style={{ width: `${project.progress}%` }}
                ></div>
              </div>
              <span className="text-xs sm:text-sm font-medium text-black">{project.progress}%</span>
            </div>
          </div>
        )}
    </div>
  );
});

ProjectCard.displayName = 'ProjectCard';

export default ProjectCard;
