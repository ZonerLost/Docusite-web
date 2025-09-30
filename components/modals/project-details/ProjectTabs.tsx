import React from 'react';

interface ProjectTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  memberCount?: number;
}

const ProjectTabs: React.FC<ProjectTabsProps> = ({ activeTab, onTabChange, memberCount = 0 }) => {
  const tabs = [
    { id: 'files', label: 'Files & Documents' },
    { id: 'members', label: 'Members' }
  ];

  return (
    <div className="mb-6">
      <div className="flex w-full border-b border-border-gray">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 px-4 py-1 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
              activeTab === tab.id
                ? 'border-action text-action'
                : 'border-transparent text-text-gray hover:text-black'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProjectTabs;
