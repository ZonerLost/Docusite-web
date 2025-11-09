import type { ProjectFileUi, ProjectFilesByCategory } from '@/types/project-files';

type Nullable<T> = T | null | undefined;

export const CATEGORY_DISPLAY_ORDER = ['STRUCTURAL', 'MEP', 'Architectural', 'Interior/ Finishes', 'Others'] as const;

export function toDate(val: unknown): Date | null {
  try {
    if (!val) return null;
    if (typeof (val as any)?.toDate === 'function') {
      return (val as any).toDate();
    }
    if (typeof val === 'string') {
      const d = new Date(val);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (val instanceof Date) {
      return Number.isNaN(val.getTime()) ? null : val;
    }
  } catch {}
  return null;
}

export function formatRelativeTime(date: Nullable<Date>): string {
  if (!date) return 'Just now';
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return 'Just now';
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function normalizeCategory(raw?: string): string {
  const value = (raw || '').toString();
  if (!value) return 'Others';
  const lower = value.toLowerCase();
  if (lower.includes('struct')) return 'STRUCTURAL';
  if (lower.includes('mep')) return 'MEP';
  if (lower.includes('architect')) return 'Architectural';
  if (lower.includes('interior') || lower.includes('finish')) return 'Interior/ Finishes';
  return 'Others';
}

export function groupFilesByCategory(files: ProjectFileUi[]): ProjectFilesByCategory {
  return files.reduce<ProjectFilesByCategory>((acc, file) => {
    const category = file.category || 'Others';
    if (!acc[category]) acc[category] = [];
    acc[category].push(file);
    return acc;
  }, {});
}

export function sortCategories(categories: ProjectFilesByCategory): string[] {
  const existing = new Set(Object.keys(categories));
  const ordered = CATEGORY_DISPLAY_ORDER.filter((cat) => existing.has(cat));
  // Append any unexpected categories to the end in alphabetical order
  const extras = Array.from(existing).filter((cat) => !ordered.includes(cat)).sort((a, b) => a.localeCompare(b));
  return [...ordered, ...extras];
}
