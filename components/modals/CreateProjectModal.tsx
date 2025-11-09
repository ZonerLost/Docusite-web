import React, { useMemo, useRef, useState, useEffect } from 'react';
import { XIcon, SearchIcon } from 'lucide-react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import FormInput from '../ui/FormInput';
import Checkbox from '../ui/Checkbox';
import Button from '../ui/Button';
import { createProjectSchema, CreateProjectFormValues } from '@/lib/validation';
import { db } from '@/lib/firebase-client';
import { collection, getDocs } from 'firebase/firestore';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Allow async submit so Formik can await and avoid double triggers
  onSubmit: (projectData: ProjectData) => void | Promise<void>;
  mode?: 'create' | 'edit';
  initialData?: Partial<ProjectData>;
}

interface ProjectData {
  title: string;
  clientName: string;
  location: string;
  deadline: string;
  members: string[];
  viewAccess: boolean;
  editAccess: boolean;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  mode = 'create',
  initialData 
}) => {
  const [memberInput, setMemberInput] = useState('');
  const [allUsers, setAllUsers] = useState<Array<{ email: string; name: string }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const fetchedRef = useRef(false);

  // Module-level simple cache to prevent repeated user fetches during session
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usersCache = (globalThis as any).__ALL_USERS_CACHE__ as Array<{ email: string; name: string }> | undefined;

  useEffect(() => {
    if (!isOpen) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true; // guard against double fetch while open
    const fromCache = Array.isArray(usersCache) ? usersCache : null;
    if (fromCache) {
      setAllUsers(fromCache);
      return;
    }
    setLoadingUsers(true);
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const items: Array<{ email: string; name: string }> = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          const email = (data?.email || '').toString();
          const name = (data?.fullName || data?.displayName || email.split('@')[0] || '').toString();
          if (email) items.push({ email, name });
        });
        setAllUsers(items);
        try { (globalThis as any).__ALL_USERS_CACHE__ = items; } catch {}
      } catch {
        // non-fatal: suggestions won't be available
      } finally {
        setLoadingUsers(false);
      }
    })();
  }, [isOpen]);

  // Debounce query input to avoid filtering on each keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(memberInput.trim()), 300);
    return () => clearTimeout(t);
  }, [memberInput]);

  const normalizedQuery = debouncedQuery.toLowerCase();

  // Normalize any existing deadline to an input[type="date"]-friendly value (YYYY-MM-DD)
  const normalizeDateForInput = (value?: string): string => {
    if (!value) return '';
    // If already in YYYY-MM-DD, use as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    // Convert to YYYY-MM-DD
    const iso = d.toISOString();
    return iso.slice(0, 10);
  };

  const handleSubmit = async (values: CreateProjectFormValues, { setSubmitting }: any) => {
    try {
      await Promise.resolve(onSubmit(values));
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const normalizeMember = (value: string | undefined | null) => (value || '').trim().toLowerCase();

  const existingMembers = useMemo(
    () => new Set((initialData?.members || []).map((m) => normalizeMember(m))),
    [initialData?.members]
  );

  const knownMembers = useMemo(() => {
    const set = new Set<string>();
    existingMembers.forEach((m) => set.add(m));
    allUsers.forEach((user) => {
      const key = normalizeMember(user.email);
      if (key) set.add(key);
    });
    return set;
  }, [existingMembers, allUsers]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl w-full max-w-md shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 pb-2">
          <h2 className="text-xl font-medium text-black">
            {mode === 'edit' ? 'Edit project' : 'Create new project'}
          </h2>
          <p className="text-sm text-placeholder-gray mt-1">
            {mode === 'edit' 
              ? 'Please update the project information as needed' 
              : 'Please enter the correct information to add a new project'
            }
          </p>
        </div>

        {/* Form */}
        <Formik<CreateProjectFormValues>
          initialValues={{
            title: initialData?.title || '',
            clientName: initialData?.clientName || '',
            location: initialData?.location || '',
            deadline: normalizeDateForInput(initialData?.deadline) || '',
            // Do not pre-render existing members in the input chips; start empty
            members: [] as string[],
            viewAccess: initialData?.viewAccess || false,
            editAccess: initialData?.editAccess || false
          }}
          validationSchema={createProjectSchema}
          onSubmit={handleSubmit}
          validateOnChange={true}
          validateOnBlur={true}
        >
          {({ values, errors, touched, isSubmitting, setFieldValue }) => {
            const hasNewInvites = (values.members || []).some((m) => !existingMembers.has(normalizeMember(m)));
            const hasNewMembers = (values.members || []).some((m) => !knownMembers.has(normalizeMember(m)));
            const createLabel = hasNewMembers ? 'Create & Invite' : 'Create Project';
            const updateLabel = hasNewInvites ? 'Update & Invite' : 'Update';
            return (
              <Form className="px-4 pb-4 space-y-2">
              {/* Project Title */}
              <div>
                <Field name="title">
                  {({ field }: any) => (
                    <FormInput
                      {...field}
                      label="Project Title"
                      error={touched.title && errors.title ? errors.title : undefined}
                    />
                  )}
                </Field>
              </div>

              {/* Client Name */}
              <div>
                <Field name="clientName">
                  {({ field }: any) => (
                    <FormInput
                      {...field}
                      label="Client name"
                      error={touched.clientName && errors.clientName ? errors.clientName : undefined}
                    />
                  )}
                </Field>
              </div>

              {/* Project Location */}
              <div>
                <Field name="location">
                  {({ field }: any) => (
                    <FormInput
                      {...field}
                      label="Project location"
                      error={touched.location && errors.location ? errors.location : undefined}
                    />
                  )}
                </Field>
              </div>

              {/* Project Deadline */}
              <div>
                <Field name="deadline">
                  {({ field }: any) => (
                    <FormInput
                      {...field}
                      type="date"
                      label="Project Deadline"
                      error={touched.deadline && errors.deadline ? errors.deadline : undefined}
                    />
                  )}
                </Field>
              </div>

              {/* Assign Members */}
              <div>
                <label className="block text-sm font-normal text-text-gray mb-1">Assign Members</label>
                <div className="relative">
                  <div className="flex flex-wrap gap-2 p-2 bg-light-gray border border-border-gray rounded-lg min-h-[40px]">
                    {values.members.map((member, index) => (
                      <div
                        key={index}
                        className="flex items-center bg-light-blue text-action px-3 py-1 rounded-full text-sm"
                      >
                        <span>{member}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newMembers = values.members.filter(m => m !== member);
                            setFieldValue('members', newMembers);
                          }}
                          className="ml-2 hover:bg-action/20 rounded-full p-0.5"
                        >
                          <XIcon className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <input
                      type="text"
                      value={memberInput}
                      onChange={(e) => setMemberInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (memberInput.trim() && !values.members.includes(memberInput.trim())) {
                            setFieldValue('members', [...values.members, memberInput.trim()]);
                            setMemberInput('');
                          }
                        }
                      }}
                      className="flex-1 min-w-[100px] outline-none bg-transparent text-black text-sm"
                      placeholder="Add member..."
                    />
                  </div>
                  <div 
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 cursor-pointer"
                    onClick={() => {
                      if (memberInput.trim() && !values.members.includes(memberInput.trim())) {
                        setFieldValue('members', [...values.members, memberInput.trim()]);
                        setMemberInput('');
                      }
                    }}
                  >
                    <SearchIcon className="w-5 h-5 text-placeholder-gray" />
                  </div>
                  {/* Suggestions dropdown */}
                  {normalizedQuery && allUsers.length > 0 && (
                    (() => {
                      const items = allUsers.filter((u) => {
                        const inList = values.members.includes(u.email);
                        const alreadyMember = existingMembers.has((u.email || '').toLowerCase());
                        if (inList || alreadyMember) return false; // hide if already selected or existing member
                        const name = (u.name || '').toLowerCase();
                        const email = (u.email || '').toLowerCase();
                        return name.includes(normalizedQuery) || email.includes(normalizedQuery);
                      }).slice(0, 8);
                      if (items.length === 0) return null;
                      return (
                        <div className="absolute left-0 right-0 mt-1 z-50 bg-white border border-border-gray rounded-xl shadow-lg overflow-hidden">
                          {items.map((u) => (
                            <button
                              key={u.email}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm text-black hover:bg-light-gray flex items-center justify-between"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                if (!values.members.includes(u.email)) {
                                  setFieldValue('members', [...values.members, u.email]);
                                }
                                setMemberInput('');
                              }}
                            >
                              <span className="truncate pr-2">{u.name}</span>
                              <span className="text-text-gray text-xs truncate">{u.email}</span>
                            </button>
                          ))}
                        </div>
                      );
                    })()
                  )}
                </div>
                {touched.members && errors.members && (
                  <div className="text-red-500 text-xs mt-1">{errors.members}</div>
                )}
              </div>

              {/* Access Control */}
              <div className="flex space-x-4">
                <Field name="viewAccess">
                  {({ field, form }: any) => (
                    <Checkbox
                      {...field}
                      id="viewAccess"
                      checked={field.value}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        if (checked) {
                          setFieldValue('viewAccess', true);
                          setFieldValue('editAccess', false);
                        } else {
                          // keep one active at all times
                          setFieldValue('viewAccess', false);
                          if (!form.values.editAccess) setFieldValue('editAccess', true);
                        }
                      }}
                      label="View Access"
                      size="small"
                      labelClassName="text-black text-sm font-medium"
                    />
                  )}
                </Field>
                <Field name="editAccess">
                  {({ field, form }: any) => (
                    <Checkbox
                      {...field}
                      id="editAccess"
                      checked={field.value}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        if (checked) {
                          setFieldValue('editAccess', true);
                          setFieldValue('viewAccess', false);
                        } else {
                          // keep one active at all times
                          setFieldValue('editAccess', false);
                          if (!form.values.viewAccess) setFieldValue('viewAccess', true);
                        }
                      }}
                      label="Edit Access"
                      size="small"
                      labelClassName="text-black text-sm font-medium"
                    />
                  )}
                </Field>
              </div>

              {/* Submit Button */}
              <div className="pt-1">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? (mode === 'edit' ? 'Updating...' : 'Creating...')
                    : (mode === 'edit' ? updateLabel : createLabel)}
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

export default CreateProjectModal;
