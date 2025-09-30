import React from 'react';

export type ReportType = 'site-inspection' | 'progress-report' | 'quality-check' | 'safety-audit';

export interface ReportTemplateConfig {
  type: ReportType;
  title: string;
  subtitle?: string;
  sections: {
    executiveSummary: boolean;
    issueSummary: boolean;
    annotationLog: boolean;
    photoGallery: boolean;
    actionTracker: boolean;
    projectTimeline?: boolean;
    qualityMetrics?: boolean;
  };
  categories: string[];
  statuses: string[];
  customFields?: {
    [key: string]: {
      label: string;
      type: 'text' | 'number' | 'date' | 'select';
      options?: string[];
    };
  };
}

export const REPORT_TEMPLATES: Record<ReportType, ReportTemplateConfig> = {
  'site-inspection': {
    type: 'site-inspection',
    title: 'Site Inspection Report',
    subtitle: 'Construction Progress Assessment',
    sections: {
      executiveSummary: true,
      issueSummary: true,
      annotationLog: true,
      photoGallery: true,
      actionTracker: true,
      projectTimeline: true
    },
    categories: ['Structural', 'Architectural', 'MEP', 'Safety', 'Quality'],
    statuses: ['Open', 'In Progress', 'Closed', 'Critical'],
    customFields: {
      inspector: {
        label: 'Inspector Name',
        type: 'text'
      },
      weather: {
        label: 'Weather Conditions',
        type: 'select',
        options: ['Clear', 'Cloudy', 'Rainy', 'Windy', 'Extreme']
      }
    }
  },
  'progress-report': {
    type: 'progress-report',
    title: 'Progress Report',
    subtitle: 'Project Status Update',
    sections: {
      executiveSummary: true,
      issueSummary: true,
      annotationLog: true,
      photoGallery: true,
      actionTracker: true,
      projectTimeline: true,
      qualityMetrics: true
    },
    categories: ['Milestones', 'Deliverables', 'Issues', 'Risks'],
    statuses: ['On Track', 'At Risk', 'Delayed', 'Completed'],
    customFields: {
      progressPercentage: {
        label: 'Overall Progress (%)',
        type: 'number'
      },
      nextMilestone: {
        label: 'Next Milestone',
        type: 'text'
      }
    }
  },
  'quality-check': {
    type: 'quality-check',
    title: 'Quality Check Report',
    subtitle: 'Quality Assurance Assessment',
    sections: {
      executiveSummary: true,
      issueSummary: true,
      annotationLog: true,
      photoGallery: true,
      actionTracker: true,
      qualityMetrics: true
    },
    categories: ['Quality', 'Compliance', 'Standards', 'Defects'],
    statuses: ['Pass', 'Fail', 'Conditional', 'Pending Review'],
    customFields: {
      qualityScore: {
        label: 'Quality Score',
        type: 'number'
      },
      standards: {
        label: 'Standards Checked',
        type: 'text'
      }
    }
  },
  'safety-audit': {
    type: 'safety-audit',
    title: 'Safety Audit Report',
    subtitle: 'Safety Compliance Assessment',
    sections: {
      executiveSummary: true,
      issueSummary: true,
      annotationLog: true,
      photoGallery: true,
      actionTracker: true,
      projectTimeline: true
    },
    categories: ['Safety', 'Compliance', 'Hazards', 'Equipment'],
    statuses: ['Safe', 'At Risk', 'Critical', 'Resolved'],
    customFields: {
      safetyOfficer: {
        label: 'Safety Officer',
        type: 'text'
      },
      riskLevel: {
        label: 'Overall Risk Level',
        type: 'select',
        options: ['Low', 'Medium', 'High', 'Critical']
      }
    }
  }
};

export const getReportTemplate = (type: ReportType): ReportTemplateConfig => {
  return REPORT_TEMPLATES[type] || REPORT_TEMPLATES['site-inspection'];
};
