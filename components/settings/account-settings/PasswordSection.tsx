import React from 'react';
import { Field, useFormikContext } from 'formik';
import Input from '@/components/ui/Input';

interface PasswordSectionProps {
  password: string;
  onPasswordChange: (password: string) => void;
}

const PasswordSection: React.FC<PasswordSectionProps> = ({
  password,
  onPasswordChange
}) => {
  const { values, errors, touched, setFieldTouched } = useFormikContext<any>();

  return (
    <div className="">
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        <div className="w-full lg:w-1/2 lg:pr-6">
          <h2 className="text-lg font-semibold text-black mb-2">Change Password</h2>
          <p className="text-text-gray text-sm">You can edit, update your account password</p>
        </div>
        <div className="w-full lg:w-1/2 space-y-4">
          <div>
            <Field name="currentPassword">
              {({ field }: any) => (
                <Input
                  {...field}
                  label="Current Password"
                  placeholder="Current Password"
                  type="password"
                  error={touched.currentPassword && errors.currentPassword ? errors.currentPassword : undefined}
                  className="w-full"
                  onBlur={(e: any) => {
                    field.onBlur(e);
                    setFieldTouched('currentPassword', true);
                  }}
                />
              )}
            </Field>
          </div>
          <div>
            <Field name="newPassword">
              {({ field }: any) => (
                <Input
                  {...field}
                  label="New Password"
                  placeholder="New Password"
                  type="password"
                  error={touched.newPassword && errors.newPassword ? errors.newPassword : undefined}
                  className="w-full"
                  onBlur={(e: any) => {
                    field.onBlur(e);
                    setFieldTouched('newPassword', true);
                  }}
                />
              )}
            </Field>
          </div>
          <div>
            <Field name="confirmPassword">
              {({ field }: any) => (
                <Input
                  {...field}
                  label="Confirm New Password"
                  placeholder="Confirm New Password"
                  type="password"
                  error={touched.confirmPassword && errors.confirmPassword ? errors.confirmPassword : undefined}
                  className="w-full"
                  onBlur={(e: any) => {
                    field.onBlur(e);
                    setFieldTouched('confirmPassword', true);
                  }}
                />
              )}
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordSection;