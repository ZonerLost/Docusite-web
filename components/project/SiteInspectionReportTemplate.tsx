import React, { useEffect, useState } from 'react';
import { getReportTemplate, ReportType } from './ReportTemplateConfig';
import { CameraIcon } from 'lucide-react';
import type { ProjectFilePhoto } from '@/components/project/documentViewer/types';

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

type Annotation = {
  id: string;
  refId: string;
  page: number;
  location: string;
  description: string;
  status: string;
  assignedTo: string;
  dateLogged: string;
  dueDate: string;
  category: string;
};

interface SiteInspectionReportTemplateProps {
  project: StoredProject;
  selectedFile?: { id: string; name: string; category?: string } | null;
  annotations: Annotation[];
  photos: ProjectFilePhoto[];
  reportType?: ReportType;
  customData?: Record<string, any>;
}

const SiteInspectionReportTemplate: React.FC<SiteInspectionReportTemplateProps> = ({
  project,
  selectedFile,
  annotations,
  photos,
  reportType = 'site-inspection',
  customData = {}
}) => {
  const template = getReportTemplate(reportType);
  const [dateStrings, setDateStrings] = useState<{ long: string; short: string }>({ long: 'N/A', short: 'N/A' });

  useEffect(() => {
    const now = new Date();
    setDateStrings({
      long: now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      short: now.toLocaleDateString(),
    });
  }, []);
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return '#EF4444';
      case 'In Progress': return '#F59E0B';
      case 'Closed': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Structural': return '#3B82F6';
      case 'Architectural': return '#8B5CF6';
      case 'MEP': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const [photoPreview, setPhotoPreview] = useState<ProjectFilePhoto | null>(null);

  const formatDate = (ms?: number) => {
    if (!ms) return '';
    return new Date(ms).toLocaleString();
  };

  // Calculate summary statistics
  const categoryCounts = annotations.reduce((acc, annotation) => {
    acc[annotation.category] = (acc[annotation.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusCounts = annotations.reduce((acc, annotation) => {
    acc[annotation.status] = (acc[annotation.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const longDate = dateStrings.long;
  const shortDate = dateStrings.short;

  return (
    <div className="w-full max-w-4xl mx-auto bg-white p-8" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-2xl font-bold text-gray-800 mb-2">{project.name}</div>
        <div className="text-lg text-gray-600 mb-2">{template.title}</div>
        {template.subtitle && (
          <div className="text-base text-gray-500 mb-2">{template.subtitle}</div>
        )}
        {/* Category Heading */}
        {selectedFile?.category && (
          <div className="text-base text-gray-500 mb-4">
            Category: {selectedFile.category}
          </div>
        )}
        <div className="text-sm text-gray-500">
          <div>Prepared By: DocuSite - {project.projectOwner || 'Project Team'}</div>
          <div>Date: {longDate}</div>
          {customData.inspector && (
            <div>Inspector: {customData.inspector}</div>
          )}
        </div>
      </div>

      {/* Executive Summary */}
      {template.sections.executiveSummary && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-blue-600 mb-4">Executive Summary</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700 leading-relaxed">
              This report summarizes a {template.title.toLowerCase()} conducted on {longDate} to assess project progress and identify issues. 
              A total of {annotations.length} annotations were logged during this assessment. 
              Key priorities include addressing critical issues, completing pending work, and ensuring quality standards. 
              Project progress is deemed "{project.status === 'completed' ? 'satisfactory' : 'in progress'}", 
              but timely resolution of {statusCounts['Open'] || 0} open and {statusCounts['In Progress'] || 0} in-progress items is critical.
              {customData.weather && (
                <span> Weather conditions during inspection: {customData.weather}.</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Issue Summary */}
      {template.sections.issueSummary && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-blue-600 mb-4">Issue Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category Summary */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">By Category</h3>
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="w-full">
                <thead className="bg-blue-600 text-white">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium">Category</th>
                    <th className="px-3 py-2 text-left text-xs font-medium">Number of Issues</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(categoryCounts).map(([category, count]) => (
                    <tr key={category}>
                      <td className="px-3 py-2 text-xs text-gray-700">{category}</td>
                      <td className="px-3 py-2 text-xs text-gray-700">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Status Summary */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">By Status</h3>
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="w-full">
                <thead className="bg-red-600 text-white">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium">Count</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(statusCounts).map(([status, count]) => (
                    <tr key={status}>
                      <td className="px-3 py-2 text-xs text-gray-700">{status}</td>
                      <td className="px-3 py-2 text-xs text-gray-700">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Annotation Log */}
      {template.sections.annotationLog && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-blue-600 mb-4">Annotation Log</h2>
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-200 rounded-lg">
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium">Ref. ID</th>
                <th className="px-3 py-2 text-left text-xs font-medium">Page</th>
                <th className="px-3 py-2 text-left text-xs font-medium">Location</th>
                <th className="px-3 py-2 text-left text-xs font-medium">Description</th>
                <th className="px-3 py-2 text-left text-xs font-medium">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium">Assigned To</th>
                <th className="px-3 py-2 text-left text-xs font-medium">Date Logged</th>
                <th className="px-3 py-2 text-left text-xs font-medium">Due Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {annotations.map((annotation) => (
                <tr key={annotation.id}>
                  <td className="px-3 py-2 text-xs text-gray-700 font-mono">{annotation.refId}</td>
                  <td className="px-3 py-2 text-xs text-gray-700">{annotation.page}</td>
                  <td className="px-3 py-2 text-xs text-gray-700">{annotation.location}</td>
                  <td className="px-3 py-2 text-xs text-gray-700">{annotation.description}</td>
                  <td className="px-3 py-2 text-xs">
                    <span 
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{ 
                        backgroundColor: getStatusColor(annotation.status) + '20',
                        color: getStatusColor(annotation.status)
                      }}
                    >
                      {annotation.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-700">{annotation.assignedTo}</td>
                  <td className="px-3 py-2 text-xs text-gray-700">{annotation.dateLogged}</td>
                  <td className="px-3 py-2 text-xs text-gray-700">{annotation.dueDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}

      {/* Photo Index */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-blue-600 mb-4">Photo Index</h2>
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full">
            <thead className="bg-indigo-600 text-white">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium">Image</th>
                <th className="px-3 py-2 text-left text-xs font-medium">Description</th>
                <th className="px-3 py-2 text-left text-xs font-medium">Ref No</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {photos.map((photo) => (
                <tr key={photo.id}>
                  <td className="px-3 py-2 text-xs text-gray-700">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50"
                      onClick={() => setPhotoPreview(photo)}
                    >
                      <CameraIcon className="w-4 h-4" />
                      View
                    </button>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-700">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-gray-900">{photo.description || 'No description'}</span>
                      <span className="text-gray-500">
                        {photo.createdAtMs ? `Uploaded - ${formatDate(photo.createdAtMs)}` : 'Uploaded'}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-indigo-700 font-mono">
                    <button
                      type="button"
                      onClick={() => setPhotoPreview(photo)}
                      className="hover:underline"
                    >
                      {photo.refNo || '—'}
                    </button>
                  </td>
                </tr>
              ))}
              {photos.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-xs text-gray-500" colSpan={3}>
                    No photos uploaded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Tracker */}
      {template.sections.actionTracker && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-blue-600 mb-4">Action Tracker</h2>
        <div className="overflow-hidden border border-gray-200 rounded-lg">
          <table className="w-full">
            <thead className="bg-green-600 text-white">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium">Count</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(statusCounts).map(([status, count]) => (
                <tr key={status}>
                  <td className="px-3 py-2 text-xs text-gray-700">{status}</td>
                  <td className="px-3 py-2 text-xs text-gray-700">{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}

      {photoPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-4 relative">
            <button
              type="button"
              className="absolute top-2 right-2 text-gray-500 hover:text-black"
              onClick={() => setPhotoPreview(null)}
              aria-label="Close preview"
            >
              ✕
            </button>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Ref: {photoPreview.refNo}</div>
                  <div className="text-xs text-gray-600">{photoPreview.description || "No description"}</div>
                  {photoPreview.createdAtMs && (
                    <div className="text-[11px] text-gray-500">Uploaded {formatDate(photoPreview.createdAtMs)}</div>
                  )}
                </div>
                <a
                  href={photoPreview.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Open in new tab
                </a>
              </div>
              <div className="w-full border rounded-lg overflow-hidden bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoPreview.url} alt={photoPreview.description || "Photo"} className="w-full object-contain" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
        <p>Generated by DocuSite - Professional Project Documentation System</p>
        <p>Report Version 1.0 - {shortDate}</p>
      </div>
    </div>
  );
};

export default SiteInspectionReportTemplate;
