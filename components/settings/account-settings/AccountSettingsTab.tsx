import React from 'react';
import { Formik, Form } from 'formik';
import ProfilePictureSection from './ProfilePictureSection';
import PersonalInfoSection from './PersonalInfoSection';
import NotificationsSection from './NotificationsSection';
import PasswordSection from './PasswordSection';
import SettingsActionButtons from './SettingsActionButtons';
import { personalInfoSchema, passwordChangeSchema, PersonalInfoFormValues, PasswordChangeFormValues } from '@/lib/validation';
import { useUser } from '@/contexts/UserContext';

interface PersonalInfoData {
  fullName: string;
  email: string;
}

interface AccountSettingsTabProps {
  formData: {
    fullName: string;
    email: string;
    password: string;
  };
  notificationsEnabled: boolean;
  profilePicture: string;
  onInputChange: (field: string, value: string) => void;
  onToggleNotifications: (enabled: boolean) => void;
  onUpdateInformation: (values: any) => void;
  onResetChanges: () => void;
  onUploadPhoto: () => void;
  onDeletePhoto: () => void;
}

const AccountSettingsTab: React.FC<AccountSettingsTabProps> = ({
  formData,
  notificationsEnabled,
  profilePicture,
  onInputChange,
  onToggleNotifications,
  onUpdateInformation,
  onResetChanges,
  onUploadPhoto,
  onDeletePhoto
}) => {
  const { userName } = useUser();
  const initialValues = {
    fullName: formData.fullName,
    email: formData.email,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    notificationsEnabled
  };

  const handleSubmit = (values: any, { setSubmitting, resetForm }: any) => {
    console.log('Settings form submitted:', values);
    
    // Call the parent's update handler with the form values
    onUpdateInformation(values);
    setSubmitting(false);
    
    // Clear password fields after successful submission
    resetForm({
      values: {
        fullName: values.fullName, // Keep the updated name
        email: values.email, // Keep the updated email
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        notificationsEnabled
      }
    });
  };

  const handleReset = (resetForm: any) => {
    console.log('Resetting form to initial values');
    resetForm({
      values: {
        fullName: formData.fullName,
        email: formData.email,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        notificationsEnabled
      }
    });
    onResetChanges();
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={personalInfoSchema}
      onSubmit={handleSubmit}
      enableReinitialize
      validateOnChange={true}
      validateOnBlur={true}
    >
      {({ values, errors, touched, isSubmitting, resetForm, submitForm }) => (
        <Form className="space-y-4 w-full lg:w-3/4">
          <ProfilePictureSection
            avatarSrc={profilePicture}
            userName={userName}
            onUploadPhoto={onUploadPhoto}
            onDeletePhoto={onDeletePhoto}
          />

          <PersonalInfoSection
            data={{
              fullName: values.fullName,
              email: values.email
            }}
            onDataChange={onInputChange}
          />

          <NotificationsSection
            notificationsEnabled={values.notificationsEnabled}
            onToggleNotifications={onToggleNotifications}
          />

          <PasswordSection
            password={formData.password}
            onPasswordChange={(password) => onInputChange('password', password)}
          />

          <SettingsActionButtons
            onUpdateInformation={submitForm} // Use Formik's submitForm
            onResetChanges={() => handleReset(resetForm)}
            isSubmitting={isSubmitting}
          />
        </Form>
      )}
    </Formik>
  );
};

export default AccountSettingsTab;
