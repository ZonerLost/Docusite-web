import React from 'react';

interface Tab {
  id: string;
  label: string;
}

interface SettingsNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const SettingsNavigation: React.FC<SettingsNavigationProps> = ({
  tabs,
  activeTab,
  onTabChange
}) => {
  return (
    <div className="">
      <div className="flex overflow-x-auto space-x-4 sm:space-x-8 border-b border-text-gray border-opacity-20">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`py-4 text-sm font-normal border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
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

export default SettingsNavigation;
