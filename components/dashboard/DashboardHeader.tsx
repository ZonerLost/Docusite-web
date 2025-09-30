import React from 'react';
import ActionBar from './ActionBar';

interface DashboardHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCreateProject: (projectData: any) => void;
  sortBy: string;
  onSortChange: (sortBy: string) => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ searchQuery, onSearchChange, onCreateProject, sortBy, onSortChange }) => {
  return (
    <div className="mb-6 sm:mb-8">
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-black mb-4 sm:mb-6">The Site. Simplified.</h1>
      <ActionBar searchQuery={searchQuery} onSearchChange={onSearchChange} onCreateProject={onCreateProject} sortBy={sortBy} onSortChange={onSortChange} />
    </div>
  );
};

export default DashboardHeader;
