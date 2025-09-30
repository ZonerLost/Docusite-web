import React from 'react';
import Toggle from '@/components/ui/Toggle';

interface NotificationsSectionProps {
  notificationsEnabled: boolean;
  onToggleNotifications: (enabled: boolean) => void;
}

const NotificationsSection: React.FC<NotificationsSectionProps> = ({
  notificationsEnabled,
  onToggleNotifications
}) => {
  return (
    <div className="">
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        <div className="w-full lg:w-1/2 lg:pr-6">
          <h2 className="text-lg font-semibold text-black mb-2">Enable Notifications</h2>
          <p className="text-text-gray text-sm">You can turn off on-app notifications anytime.</p>
        </div>
        <div className="w-full lg:w-1/2 flex items-center">
          <Toggle
            checked={notificationsEnabled}
            onChange={onToggleNotifications}
            label="Enable Notifications"
          />
        </div>
      </div>
    </div>
  );
};

export default NotificationsSection;