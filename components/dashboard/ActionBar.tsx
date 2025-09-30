import React, { useState } from 'react';
import { SearchIcon, FilterIcon } from '@/components/ui/Icons';
import { PlusIcon } from 'lucide-react';
import CreateProjectModal from '../modals/CreateProjectModal';
import Button from '../ui/Button';
import Dropdown from '../ui/Dropdown';

interface ActionBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCreateProject: (projectData: any) => void;
  sortBy: string;
  onSortChange: (sortBy: string) => void;
}

const ActionBar: React.FC<ActionBarProps> = ({ searchQuery, onSearchChange, onCreateProject, sortBy, onSortChange }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const sortOptions = [
    { value: 'ascending', label: 'Ascending' },
    { value: 'descending', label: 'Descending' },
    { value: 'name', label: 'Name' },
    { value: 'date', label: 'Date' },
    { value: 'status', label: 'Status' }
  ];

  const handleCreateProject = (projectData: any) => {
    onCreateProject(projectData);
    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-0 mb-6 sm:mb-8">
      {/* Project Search */}
      <div className="relative flex-1 max-w-full lg:max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <SearchIcon className="text-text-gray" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search project..."
          className="block w-full pl-10 pr-3 h-10 sm:h-12 border bg-white border-border-gray rounded-xl text-sm sm:text-base text-black placeholder-placeholder-gray placeholder:font-medium focus:outline-none focus:ring-2 focus:ring-action focus:border-transparent"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        {/* Sort Dropdown */}
        <Dropdown
          options={sortOptions}
          value={sortBy}
          onChange={onSortChange}
          className="w-full sm:w-auto"
        />

        {/* Filters Button */}
        <Button
          variant="outline"
          size="md"
          className="w-full sm:w-auto justify-center sm:justify-start bg-light-blue border-action text-action hover:bg-light-blue/80"
        >
          <FilterIcon className="w-4 h-4 mr-2" />
          <span className="text-sm sm:text-base">Filters</span>
        </Button>

        {/* Create New Project Button */}
        <Button
          onClick={() => setIsModalOpen(true)}
          variant="primary"
          size="md"
          className="w-full sm:w-auto justify-center sm:justify-start"
        >
          <PlusIcon className="w-4 h-4 mr-1" />
          <span className="text-sm sm:text-base">Create new Project</span>
        </Button>
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateProject}
      />
    </div>
  );
};

export default ActionBar;
