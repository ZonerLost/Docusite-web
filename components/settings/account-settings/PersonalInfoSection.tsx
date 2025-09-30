import React from 'react';
import { Field, ErrorMessage, useFormikContext } from 'formik';
import Input from '@/components/ui/Input';

interface PersonalInfoData {
  fullName: string;
  email: string;
}

interface PersonalInfoSectionProps {
  data: PersonalInfoData;
  onDataChange: (field: keyof PersonalInfoData, value: string) => void;
}

const PersonalInfoSection: React.FC<PersonalInfoSectionProps> = ({
  data,
  onDataChange
}) => {
  const { values, errors, touched, setFieldTouched, setFieldValue } = useFormikContext<any>();

  return (
    <div className="">
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        <div className="w-full lg:w-1/2 lg:pr-6">
          <h2 className="text-lg font-semibold text-black mb-2">Personal Information</h2>
          <p className="text-text-gray text-sm">You can edit, remove or upload your personal information.</p>
        </div>
        <div className="w-full lg:w-1/2 space-y-4">
           <div>
             <Field name="fullName">
               {({ field }: any) => (
                 <Input
                   {...field}
                   label="Full Name"
                   placeholder="Full Name"
                   error={touched.fullName && errors.fullName ? errors.fullName : undefined}
                   className="w-full"
                   onChange={(e: any) => {
                     field.onChange(e);
                     setFieldValue('fullName', e.target.value);
                     onDataChange('fullName', e.target.value);
                   }}
                   onBlur={(e: any) => {
                     field.onBlur(e);
                     setFieldTouched('fullName', true);
                   }}
                 />
               )}
             </Field>
           </div>
           <div>
             <Field name="email">
               {({ field }: any) => (
                 <Input
                   {...field}
                   label="Email address"
                   placeholder="Email address"
                   type="email"
                   error={touched.email && errors.email ? errors.email : undefined}
                   className="w-full"
                   onChange={(e: any) => {
                     field.onChange(e);
                     setFieldValue('email', e.target.value);
                     onDataChange('email', e.target.value);
                   }}
                   onBlur={(e: any) => {
                     field.onBlur(e);
                     setFieldTouched('email', true);
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

export default PersonalInfoSection;