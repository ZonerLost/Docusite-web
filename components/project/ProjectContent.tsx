import React from 'react';

type StoredProject = {
  id: string;
  name: string;
  clientName?: string;
  status: 'in-progress' | 'completed' | 'cancelled';
  location: string;
  projectOwner?: string;
  deadline?: string;
  members?: number;
};

interface ProjectContentProps {
  project: StoredProject;
}

const buildProjectHtml = (project: StoredProject) => {
  const safe = (v?: string) => v || 'Not specified';
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#2AA96A';
      case 'in-progress': return '#FBBC04';
      case 'cancelled': return '#EA4335';
      default: return '#757575';
    }
  };
  
  return `
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="margin:0 0 8px 0; font-size: 20px; font-weight: 700; color: #1f2937;">${project.name}</h1>
      <div style="display: inline-block; background-color: ${getStatusColor(project.status)}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; margin-bottom: 12px;">
        ${project.status.replace('-', ' ')}
      </div>
      <p style="margin:0; font-size: 12px; color: #6b7280;">Project ID: ${project.id}</p>
    </div>
    
    <div style="display: grid; grid-template-columns: 1fr; gap: 16px; margin-bottom: 24px;">
      <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 16px; border-radius: 8px; border-left: 4px solid #4D91DB;">
        <h3 style="margin:0 0 12px 0; font-size: 14px; font-weight: 600; color: #1f2937;">Project Information</h3>
        <div style="font-size: 12px; color: #374151; line-height: 1.6;">
          <div style="margin-bottom: 6px;"><strong style="color: #1f2937;">Client:</strong> ${safe(project.clientName)}</div>
          <div style="margin-bottom: 6px;"><strong style="color: #1f2937;">Location:</strong> ${safe(project.location)}</div>
          <div style="margin-bottom: 6px;"><strong style="color: #1f2937;">Owner:</strong> ${safe(project.projectOwner)}</div>
        </div>
      </div>
      
      <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 16px; border-radius: 8px; border-left: 4px solid #0ea5e9;">
        <h3 style="margin:0 0 12px 0; font-size: 14px; font-weight: 600; color: #1f2937;">Project Timeline</h3>
        <div style="font-size: 12px; color: #374151; line-height: 1.6;">
          <div style="margin-bottom: 6px;"><strong style="color: #1f2937;">Deadline:</strong> ${safe(project.deadline)}</div>
          <div style="margin-bottom: 6px;"><strong style="color: #1f2937;">Team Size:</strong> ${String(project.members || 0)} members</div>
          <div style="margin-bottom: 6px;"><strong style="color: #1f2937;">Created:</strong> ${new Date().toLocaleDateString()}</div>
        </div>
      </div>
    </div>
    
    <div style="background: linear-gradient(135deg, #fefce8 0%, #fef3c7 100%); padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 20px;">
      <h2 style="margin:0 0 8px 0; font-size: 16px; font-weight: 600; color: #1f2937;">Project Overview</h2>
      <p style="margin:0; line-height: 1.6; color: #374151; font-size: 12px;">This comprehensive project report contains all essential details, documentation, and notes. Use the toolbar above to add annotations and export the complete report as a PDF.</p>
    </div>
  `;
};

const ProjectContent: React.FC<ProjectContentProps> = ({ project }) => {
  const contentHtml = buildProjectHtml(project);

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 pb-4 border-b-2 border-gray-200 bg-gradient-to-br from-slate-50 to-slate-200 -mx-4 -mt-4 px-4 pt-4 rounded-t-lg sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6 sm:rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
            <img src="/auth.png" alt="Logo" className="w-5 h-5 sm:w-6 sm:h-6 rounded" />
          </div>
          <div>
            <div className="font-bold text-sm sm:text-lg tracking-wide text-gray-800">DocuSite Project Report</div>
            <div className="text-xs text-gray-500 mt-0.5">Professional Project Documentation</div>
          </div>
        </div>
        <div className="text-xs text-gray-600 bg-white px-3 py-2 rounded-lg border border-gray-200 font-medium self-start sm:self-auto">
          {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Main Content */}
      <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
    </>
  );
};

export default ProjectContent;
