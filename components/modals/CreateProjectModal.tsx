import React, { useState } from 'react';
import { XIcon, SearchIcon } from 'lucide-react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import FormInput from '../ui/FormInput';
import Checkbox from '../ui/Checkbox';
import Button from '../ui/Button';
import { createProjectSchema, CreateProjectFormValues } from '@/lib/validation';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (projectData: ProjectData) => void;
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

  const handleSubmit = (values: CreateProjectFormValues, { setSubmitting }: any) => {
    console.log('Project form submitted:', values);
    onSubmit(values);
    setSubmitting(false);
    onClose();
  };

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
        <Formik
          initialValues={{
            title: initialData?.title || '',
            clientName: initialData?.clientName || '',
            location: initialData?.location || '',
            deadline: initialData?.deadline || '',
            members: initialData?.members || [],
            viewAccess: initialData?.viewAccess || false,
            editAccess: initialData?.editAccess || false
          }}
          validationSchema={createProjectSchema}
          onSubmit={handleSubmit}
          validateOnChange={true}
          validateOnBlur={true}
        >
          {({ values, errors, touched, isSubmitting, setFieldValue }) => {
            console.log('Form state:', { values, errors, touched, isSubmitting });
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
                </div>
                {touched.members && errors.members && (
                  <div className="text-red-500 text-xs mt-1">{errors.members}</div>
                )}
              </div>

              {/* Access Control */}
              <div className="flex space-x-4">
                <Field name="viewAccess">
                  {({ field }: any) => (
                    <Checkbox
                      {...field}
                      id="viewAccess"
                      checked={field.value}
                      onChange={(e) => setFieldValue('viewAccess', e.target.checked)}
                      label="View Access"
                      size="small"
                      labelClassName="text-black text-sm font-medium"
                    />
                  )}
                </Field>
                <Field name="editAccess">
                  {({ field }: any) => (
                    <Checkbox
                      {...field}
                      id="editAccess"
                      checked={field.value}
                      onChange={(e) => setFieldValue('editAccess', e.target.checked)}
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
                    ? (mode === 'edit' ? 'Updating...' : 'Adding...') 
                    : (mode === 'edit' ? 'Update' : 'Add')
                  }
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
