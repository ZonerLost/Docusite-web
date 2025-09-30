import React from 'react';

interface ProjectInfoProps {
  clientName: string;
  status: 'in-progress' | 'completed' | 'cancelled';
  location: string;
  projectOwner: string;
  deadline: string;
  members: number;
}

const ProjectInfo: React.FC<ProjectInfoProps> = ({
  clientName,
  status,
  location,
  projectOwner,
  deadline,
  members
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-progress':
        return 'bg-orange-100 text-orange-600';
      case 'completed':
        return 'bg-green-100 text-green-600';
      case 'cancelled':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'in-progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  return (
    <div className="mb-6">
      <div className="bg-light-gray rounded-lg border border-border-dark-gray overflow-hidden">
        <table className="w-full">
          <tbody>
            <tr className="border-b border-border-dark-gray">
              <td className="text-text-gray font-normal text-xs py-2 px-2 w-1/3 border-r border-border-dark-gray">Client name:</td>
              <td className="py-2 px-2">
                <div className="bg-white px-3 py-1 rounded-md border border-border-dark-gray inline-block">
                  <span className="text-black font-normal text-xs">{clientName}</span>
                </div>
              </td>
            </tr>
            
            <tr className="border-b border-border-dark-gray">
              <td className="text-text-gray font-normal text-xs py-2 px-2 w-1/3 border-r border-border-dark-gray">Status:</td>
              <td className="py-2 px-2">
                <div className={`px-3 py-1 rounded-md text-xs font-normal inline-block ${getStatusColor(status)}`}>
                  {getStatusText(status)}
                </div>
              </td>
            </tr>
            
            <tr className="border-b border-border-dark-gray">
              <td className="text-text-gray font-normal text-xs py-2 px-2 w-1/3 border-r border-border-dark-gray">Location:</td>
              <td className="py-2 px-2">
                <div className="bg-white px-3 py-1 rounded-md border border-border-dark-gray inline-block">
                  <span className="text-black font-medium text-xs">{location}</span>
                </div>
              </td>
            </tr>
            
            <tr className="border-b border-border-dark-gray">
              <td className="text-text-gray font-normal text-xs py-2 px-2 w-1/3 border-r border-border-dark-gray">Project Owner:</td>
              <td className="py-2 px-2">
                <div className="bg-white px-3 py-1 rounded-md border border-border-dark-gray inline-block">
                  <span className="text-black font-medium text-xs">{projectOwner}</span>
                </div>
              </td>
            </tr>
            
            <tr className="border-b border-border-dark-gray">
              <td className="text-text-gray font-normal text-xs py-2 px-2 w-1/3 border-r border-border-dark-gray">Deadline:</td>
              <td className="py-2 px-2">
                <div className="bg-white px-3 py-1 rounded-md border border-border-dark-gray inline-block">
                  <span className="text-black font-medium text-xs">{deadline}</span>
                </div>
              </td>
            </tr>
            
            <tr>
              <td className="text-text-gray font-normal text-xs py-2 px-2 w-1/3 border-r border-border-dark-gray">Members:</td>
              <td className="py-2 px-2">
                <div className="bg-white px-3 py-1 rounded-md border border-border-dark-gray inline-block">
                  <span className="text-black font-medium text-xs">{members} members</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProjectInfo;
