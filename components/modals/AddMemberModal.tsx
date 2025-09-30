import React from 'react';
import { X } from 'lucide-react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import FormInput from '@/components/ui/FormInput';
import Dropdown from '@/components/ui/Dropdown';
import Button from '../ui/Button';
import { addMemberSchema, AddMemberFormValues } from '@/lib/validation';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMember: (memberData: { name: string; email: string; role: string }) => void;
  title?: string;
  description?: string;
  submitText?: string;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({ isOpen, onClose, onAddMember, title, description, submitText }) => {
  const roleOptions = [
    { value: 'Contractor', label: 'Contractor' },
    { value: 'Manager', label: 'Manager' },
    { value: 'Developer', label: 'Developer' },
    { value: 'Designer', label: 'Designer' },
    { value: 'Client', label: 'Client' }
  ];

  const initialValues: AddMemberFormValues = {
    name: '',
    email: '',
    role: 'Contractor'
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = (values: AddMemberFormValues, { setSubmitting, resetForm }: any) => {
    console.log('Add member form submitted:', values);
    onAddMember({
      name: values.name.trim(),
      email: values.email.trim(),
      role: values.role
    });
    setSubmitting(false);
    resetForm();
    onClose();
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
          {({ errors, touched, isSubmitting, setFieldValue }) => (
            <Form className="space-y-2">
              {/* Member Name */}
              <div>
                <Field name="name">
                  {({ field }: any) => (
                    <FormInput
                      {...field}
                      label="Member name"
                      placeholder="Enter member name"
                      error={touched.name && errors.name ? errors.name : undefined}
                    />
                  )}
                </Field>
              </div>

              {/* Member Email */}
              <div>
                <Field name="email">
                  {({ field }: any) => (
                    <FormInput
                      {...field}
                      label="Email address"
                      placeholder="Enter email address"
                      type="email"
                      error={touched.email && errors.email ? errors.email : undefined}
                    />
                  )}
                </Field>
              </div>

              {/* Member Role */}
              <div>
                <label className="block text-text-gray text-xs font-normal mb-2">
                  Member role
                </label>
                <Field name="role">
                  {({ field }: any) => (
                    <Dropdown
                      options={roleOptions}
                      value={field.value}
                      onChange={(value) => setFieldValue('role', value)}
                      className="w-full [&>button]:w-full [&>button]:bg-light-gray [&>button]:border-border-gray [&>div]:w-full"
                    />
                  )}
                </Field>
                {touched.role && errors.role && (
                  <div className="text-red-500 text-xs mt-1">{errors.role}</div>
                )}
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
          )}
        </Formik>
      </div>
    </div>
  );
};

export default AddMemberModal;
