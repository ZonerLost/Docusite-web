export type ProjectFileUi = {
  id: string;
  name: string;
  lastUpdated: string;
  type: 'pdf';
  category?: string;
};

export type ProjectFilesByCategory = Record<string, ProjectFileUi[]>;
