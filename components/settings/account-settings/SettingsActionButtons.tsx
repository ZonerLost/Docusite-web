import React from 'react';
import { useFormikContext } from 'formik';
import Button from '@/components/ui/Button';

interface SettingsActionButtonsProps {
  onUpdateInformation: () => void;
  onResetChanges: () => void;
  isSubmitting?: boolean;
}

const SettingsActionButtons: React.FC<SettingsActionButtonsProps> = ({
  onUpdateInformation,
  onResetChanges,
  isSubmitting = false
}) => {
  const { submitForm } = useFormikContext();

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
      <div className="w-full lg:w-1/2 lg:pr-6">
        {/* Empty space to align with other sections */}
      </div>
      <div className="w-full lg:w-1/2">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            type="submit"
            variant="primary" 
            size="sm"
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? 'Updating...' : 'Update Information'}
          </Button>
          <Button 
            type="button"
            variant="secondary" 
            size="sm"
            onClick={onResetChanges}
            className="w-full sm:w-auto"
          >
            Reset Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsActionButtons;