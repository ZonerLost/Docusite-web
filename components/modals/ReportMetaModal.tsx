import React, { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import Button from '@/components/ui/Button';
import FormInput from '@/components/ui/FormInput';
import Textarea from '@/components/ui/Textarea';

interface ReportMetaModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_OPTIONS = ['Select status', 'In Progress', 'Completed', 'Pending', 'Cancelled'] as const;

const CATEGORY_KEYS = [
  'Structural',
  'Architectural',
  'MEP (Mechanical, Electrical and Plumbing)',
  'Interior',
  'Others',
] as const;

type IssueSummaryMap = Record<string, number>;

const ReportMetaModal: React.FC<ReportMetaModalProps> = ({ projectId, isOpen, onClose }) => {
  const [companyName, setCompanyName] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<typeof STATUS_OPTIONS[number]>('Select status');
  const [description, setDescription] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [inspector, setInspector] = useState('');
  const [weather, setWeather] = useState('');
  const [issueSummary, setIssueSummary] = useState<IssueSummaryMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const ref = doc(db, 'projects', projectId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          if (!cancelled) setError('Project not found.');
          return;
        }
        const data = snap.data() as any;
        if (cancelled) return;

        setCompanyName(String(data.companyName || ''));
        setLocation(String(data.location || ''));
        const rawStatus = String(data.status || '');
        if (STATUS_OPTIONS.includes(rawStatus as any)) {
          setStatus(rawStatus as typeof STATUS_OPTIONS[number]);
        } else if (rawStatus) {
          setStatus('In Progress');
        } else {
          setStatus('Select status');
        }
        setDescription(String(data.description || ''));
        setConclusion(String(data.conclusion || ''));

        const extra =
          data && typeof data.extraFields === 'object' && data.extraFields
            ? (data.extraFields as Record<string, unknown>)
            : {};
        setInspector(String(extra.inspector || ''));
        setWeather(String(extra.weather || ''));

        const rawIssueSummary = data.issueSummary;
        const map: IssueSummaryMap = {};
        if (rawIssueSummary && typeof rawIssueSummary === 'object') {
          for (const key of Object.keys(rawIssueSummary as Record<string, unknown>)) {
            const val = (rawIssueSummary as Record<string, unknown>)[key];
            const n = typeof val === 'number' ? val : Number.parseInt(String(val), 10);
            if (!Number.isNaN(n) && n >= 0) map[key] = n;
          }
        }
        setIssueSummary(map);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load report metadata.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, projectId]);

  const handleChangeIssue = (key: string, value: string) => {
    setIssueSummary((prev) => {
      const next = { ...prev };
      const trimmed = value.trim();
      if (!trimmed) {
        delete next[key];
        return next;
      }
      const num = Number.parseInt(trimmed, 10);
      if (Number.isNaN(num) || num < 0) return next;
      next[key] = num;
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const ref = doc(db, 'projects', projectId);
      const snap = await getDoc(ref);
      const data = (snap.exists() ? snap.data() : {}) as any;
      const extra =
        data && typeof data.extraFields === 'object' && data.extraFields
          ? (data.extraFields as Record<string, unknown>)
          : {};

      const effectiveStatus =
        status === 'Select status' || !status ? 'In Progress' : status;

      await updateDoc(ref, {
        companyName: companyName.trim(),
        location: location.trim(),
        status: effectiveStatus,
        description: description.trim(),
        conclusion: conclusion.trim(),
        issueSummary,
        extraFields: {
          ...extra,
          inspector: inspector.trim(),
          weather: weather.trim(),
        },
        updatedAt: serverTimestamp(),
      });

      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to save report metadata.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-hidden border border-border-gray">
        <div className="px-4 py-3 border-b border-border-gray flex items-center justify-between">
          <h2 className="text-sm font-semibold text-black">Report Metadata</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-text-gray hover:text-black"
          >
            Close
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[70vh]">
          {isLoading && (
            <p className="text-xs text-text-gray">Loading project info...</p>
          )}
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}

          <FormInput
            label="Company Name"
            placeholder="Enter company name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />

          <FormInput
            label="Project Location"
            placeholder="Enter project location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />

          <div>
            <label className="block text-xs font-medium  text-text-gray mb-1">
              Status
            </label>
            <select
              className="w-full border text-black border-border-gray rounded px-2 py-1.5 text-sm"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as (typeof STATUS_OPTIONS)[number])
              }
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormInput
              label="Inspector"
              placeholder="Inspector name"
              value={inspector}
              onChange={(e) => setInspector(e.target.value)}
            />
            <FormInput
              label="Weather"
              placeholder="Weather conditions"
              value={weather}
              onChange={(e) => setWeather(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-gray mb-1">
              Issue Summary (counts per category)
            </label>
            <div className="space-y-2">
              {CATEGORY_KEYS.map((cat) => (
                <div key={cat} className="flex items-center gap-2">
                  <span className="flex-1 text-xs text-text-gray truncate">
                    {cat}
                  </span>
                  <input
                    type="number"
                    min={0}
                    className="w-20 border border-border-gray rounded px-2 py-1 text-xs text-right"
                    value={issueSummary[cat] ?? ''}
                    onChange={(e) => handleChangeIssue(cat, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          <Textarea
            label="Description"
            placeholder="Short description for this report..."
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Textarea
            label="Conclusion"
            placeholder="Optional conclusion..."
            rows={3}
            value={conclusion}
            onChange={(e) => setConclusion(e.target.value)}
          />
        </div>

        <div className="px-4 py-3 border-t border-border-gray flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReportMetaModal;

