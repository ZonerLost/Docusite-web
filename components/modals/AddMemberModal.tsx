import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import FormInput from '@/components/ui/FormInput';
// Dropdown removed; role becomes free-text input
import Button from '../ui/Button';
import { addMemberSchema, AddMemberFormValues } from '@/lib/validation';
import { db } from '@/lib/firebase-client';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { useClickOutside } from '@/hooks/useClickOutside';

// Lightweight in-module cache for user emails
let USER_EMAIL_CACHE: string[] | null = null;
let USER_EMAILS_FETCHING: Promise<string[]> | null = null;

// Cache resolved names by email to avoid repeated lookups
const EMAIL_NAME_CACHE = new Map<string, string>();
const EMAIL_NAME_FETCHING = new Map<string, Promise<string | null>>();

async function loadUserEmails(): Promise<string[]> {
  if (USER_EMAIL_CACHE) return USER_EMAIL_CACHE;
  if (USER_EMAILS_FETCHING) return USER_EMAILS_FETCHING;

  USER_EMAILS_FETCHING = (async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list: string[] = [];
      snap.forEach((doc) => {
        const data = doc.data() as { email?: unknown };
        const email = typeof data.email === 'string' ? data.email.trim() : '';
        if (email) list.push(email);
      });
      USER_EMAIL_CACHE = Array.from(new Set(list.map((e) => e.toLowerCase())));
      return USER_EMAIL_CACHE;
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('[AddMemberModal] failed to load user emails', e);
      throw e;
    } finally {
      USER_EMAILS_FETCHING = null;
    }
  })();

  return USER_EMAILS_FETCHING;
}

async function fetchUserNameByEmail(rawEmail: string): Promise<string | null> {
  const email = (rawEmail || '').trim().toLowerCase();
  if (!email) return null;

  if (EMAIL_NAME_CACHE.has(email)) return EMAIL_NAME_CACHE.get(email) || null;
  const inflight = EMAIL_NAME_FETCHING.get(email);
  if (inflight) return inflight;

  const p = (async () => {
    try {
      const q = query(collection(db, 'users'), where('email', '==', email), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const doc = snap.docs[0];
      const data = doc.data() as { fullName?: unknown; displayName?: unknown; name?: unknown };
      const candidate =
        (typeof data.fullName === 'string' && data.fullName.trim()) ||
        (typeof data.displayName === 'string' && data.displayName.trim()) ||
        (typeof data.name === 'string' && data.name.trim()) ||
        '';
      const name = candidate || null;
      if (name) EMAIL_NAME_CACHE.set(email, name);
      return name;
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('[AddMemberModal] failed to fetch user by email', e);
      return null;
    } finally {
      EMAIL_NAME_FETCHING.delete(email);
    }
  })();
  EMAIL_NAME_FETCHING.set(email, p);
  return p;
}

function isLikelyEmail(str: string): boolean {
  if (!str) return false;
  // Lightweight check; we rely on Firestore for truth
  return /.+@.+\..+/.test(str);
}

function useDebouncedValue<T>(value: T, delayMs = 200): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Allow async handlers so submit can await and avoid double triggers
  onAddMember: (memberData: { name: string; email: string; role: string }) => void | Promise<void>;
  title?: string;
  description?: string;
  submitText?: string;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({ isOpen, onClose, onAddMember, title, description, submitText }) => {

  const initialValues: AddMemberFormValues = {
    name: '',
    email: '',
    role: ''
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = async (
    values: AddMemberFormValues,
    { setSubmitting, resetForm, setFieldValue }: any
  ) => {
    try {
      const email = (values.email || '').trim().toLowerCase();
      // Ensure we have the cache loaded (fetch once)
      try {
        const emails = await loadUserEmails();
        const exists = emails?.includes(email);
        if (!exists) {
          toast.error('No registered user found with that email');
          setSubmitting(false);
          return;
        }
      } catch (e: any) {
        toast.error('Unable to validate email right now');
        setSubmitting(false);
        return;
      }

      // Ensure name is populated from directory if empty or whitespace
      let finalName = values.name?.trim() || '';
      if (!finalName && isLikelyEmail(email)) {
        const lookedUp = await fetchUserNameByEmail(email);
        if (lookedUp) {
          finalName = lookedUp.trim();
          // Update form silently so validation and UI stay consistent
          try { setFieldValue('name', finalName, false); } catch {}
        }
      }

      await onAddMember({
        name: finalName || values.name.trim(),
        email: (values.email || '').trim(),
        role: (values.role || '').trim()
      });
      resetForm();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl w-full max-w-sm p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-black font-medium text-lg">{title || 'Add new member'}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-light-gray rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-text-gray" />
          </button>
        </div>

        {/* Instructions */}
        <p className="text-text-gray text-xs mb-4">{description || 'Please enter the correct information to add a new member to this project.'}</p>

        {/* Form */}
        <Formik
          initialValues={initialValues}
          validationSchema={addMemberSchema}
          onSubmit={handleSubmit}
        >
          {({ errors, touched, isSubmitting, setFieldValue, values }) => {
            const containerRef = useRef<HTMLDivElement | null>(null);
            const [isEmailOpen, setIsEmailOpen] = useState(false);
            const [isLoadingEmails, setIsLoadingEmails] = useState(false);
            const [highlightIdx, setHighlightIdx] = useState(-1);
            const nameAutoFillRef = useRef<string | null>(null);
            const nameManuallyEditedRef = useRef(false);

            const rawQuery = typeof values.email === 'string' ? values.email : '';
            const queryStr = rawQuery.trim();
            const debouncedQuery = useDebouncedValue(queryStr, 180);

            const ensureEmailsLoaded = useCallback(async () => {
              if (USER_EMAIL_CACHE && USER_EMAIL_CACHE.length) return;
              setIsLoadingEmails(true);
              try {
                await loadUserEmails();
              } catch (e: any) {
                toast.error('Unable to load users list');
              } finally {
                setIsLoadingEmails(false);
              }
            }, []);

            const filteredEmails = useMemo(() => {
              const base = USER_EMAIL_CACHE || [];
              if (!debouncedQuery) return [] as string[];
              const q = debouncedQuery.toLowerCase();
              const matches = base.filter((e) => e.includes(q));
              return matches.slice(0, 8);
            }, [debouncedQuery]);

            useClickOutside(containerRef, () => {
              setIsEmailOpen(false);
              setHighlightIdx(-1);
            }, { enabled: isEmailOpen });

            const onEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
              setFieldValue('email', e.target.value);
              if (!isEmailOpen && e.target.value.trim().length > 0) setIsEmailOpen(true);
            };

            const onEmailFocus = async () => {
              if (queryStr.length > 0) setIsEmailOpen(true);
              if (!USER_EMAIL_CACHE) await ensureEmailsLoaded();
            };

            const applyAutoName = async (email: string) => {
              if (!email || !isLikelyEmail(email)) return;
              const requestedEmail = email.toLowerCase();
              const name = await fetchUserNameByEmail(requestedEmail);
              if (!name) return;
              // Do not override if user edited name manually to a different value
              const currentName = (values.name || '').trim();
              if (!nameManuallyEditedRef.current || currentName === '' || currentName === nameAutoFillRef.current) {
                setFieldValue('name', name, false);
                nameAutoFillRef.current = name;
                nameManuallyEditedRef.current = false;
              }
            };

            const selectEmail = (email: string) => {
              setFieldValue('email', email);
              setIsEmailOpen(false);
              setHighlightIdx(-1);
              // Fetch and apply name after selection
              void applyAutoName(email);
            };

            const onEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
              if (!isEmailOpen || filteredEmails.length === 0) return;
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightIdx((idx) => (idx + 1) % filteredEmails.length);
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightIdx((idx) => (idx - 1 + filteredEmails.length) % filteredEmails.length);
              } else if (e.key === 'Enter') {
                if (highlightIdx >= 0 && highlightIdx < filteredEmails.length) {
                  e.preventDefault();
                  selectEmail(filteredEmails[highlightIdx]);
                }
              } else if (e.key === 'Escape') {
                setIsEmailOpen(false);
                setHighlightIdx(-1);
              }
            };

            // When user types an email that looks valid, auto-fetch name (debounced)
            useEffect(() => {
              if (isLikelyEmail(debouncedQuery)) {
                void applyAutoName(debouncedQuery);
              }
              // eslint-disable-next-line react-hooks/exhaustive-deps
            }, [debouncedQuery]);

            return (
            <Form className="space-y-2">
              
              {/* Member Email */}
              <div ref={containerRef} className="relative">
                <Field name="email">
                  {({ field }: any) => (
                    <>
                      <FormInput
                        {...field}
                        onChange={onEmailChange}
                        onFocus={onEmailFocus}
                        onKeyDown={onEmailKeyDown}
                        label="Email address"
                        placeholder="Enter email address"
                        type="email"
                        error={touched.email && errors.email ? errors.email : undefined}
                      />
                      {isLoadingEmails && (
                        <div className="pointer-events-none absolute right-3 top-9">
                          <div className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
                        </div>
                      )}
                    </>
                  )}
                  
                </Field>
                {isEmailOpen && (isLoadingEmails || filteredEmails.length > 0) && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-border-gray rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {isLoadingEmails ? (
                      <div className="px-3 py-2 text-sm text-text-gray flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
                        <span>Loading users…</span>
                      </div>
                    ) : (
                      filteredEmails.map((email, idx) => (
                        <button
                          key={email}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectEmail(email)}
                          className={`w-full px-3 py-2 text-left text-sm text-black hover:bg-light-gray transition-colors first:rounded-t-xl last:rounded-b-xl ${
                            idx === highlightIdx ? 'bg-light-blue text-action' : ''
                          }`}
                        >
                          {email}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
               {/* Member Name */}
              <div>
                <Field name="name">
                  {({ field }: any) => (
                    <FormInput
                      {...field}
                      onChange={(e) => {
                        nameManuallyEditedRef.current = true;
                        field.onChange(e);
                      }}
                      label="Member name"
                      placeholder="Enter member name"
                      error={touched.name && errors.name ? errors.name : undefined}
                    />
                  )}
                </Field>
              </div>

              {/* Member Role */}
              <div>
                <Field name="role">
                  {({ field }: any) => (
                    <FormInput
                      {...field}
                      label="Member role"
                      placeholder="Enter role (e.g., Client, Engineer, Project Manager)"
                      error={touched.role && errors.role ? errors.role : undefined}
                    />
                  )}
                </Field>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Adding...' : (submitText || 'Add')}
                </Button>
              </div>
            </Form>
            );
          }}
        </Formik>
      </div>
    </div>
  );
};

export default AddMemberModal;
