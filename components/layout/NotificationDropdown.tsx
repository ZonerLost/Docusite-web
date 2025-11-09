import React from 'react';
import DropdownPanel from '@/components/ui/DropdownPanel';

export type NotificationItem = {
  id: string;
  title: string;
  description: string;
  time: string;
  isUnread: boolean;
  type?: string;
  inviteId?: string;
  projectId?: string;
};

interface NotificationDropdownProps {
  isOpen: boolean;
  notifications: NotificationItem[];
  onClose: () => void;
  onNotificationClick: (notificationId: string) => void;
  onMarkAllRead?: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  notifications,
  onClose,
  onNotificationClick,
  onMarkAllRead,
}) => {
  return (
    <DropdownPanel
      isOpen={isOpen}
      baseClassName="absolute left-1/2 top-full mt-2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0"
      widthClassName="w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:w-[22rem]"
    >
      <div className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-black">Notifications</span>
          {onMarkAllRead && notifications.some((n) => n.isUnread) && (
            <button className="text-xs text-action hover:text-action/80" onClick={onMarkAllRead}>
              Mark all as read
            </button>
          )}
        </div>

        <div className="space-y-1.5 max-h-72 overflow-y-auto overflow-x-hidden">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="flex items-start space-x-3 py-2 px-2 border-b border-border-gray last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => onNotificationClick(n.id)}
            >
              {/* Icon */}
              <div className="flex-shrink-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-avatar-bg rounded-full flex items-center justify-center">
                  <span className="text-md font-semibold text-action">N</span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between relative">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-black whitespace-normal break-words">{n.title}</p>
                    <p className="text-sm text-text-gray mt-0.5 whitespace-normal break-words">{n.description}</p>
                  </div>
                  <div className="flex flex-col items-end space-y-1 flex-shrink-0">
                    <span className="text-xs text-placeholder-gray">{n.time}</span>
                    {n.isUnread && <div className="absolute top-0 right-0 w-2 h-2 bg-action rounded-full" />}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {notifications.length === 0 && (
            <div className="text-center text-xs text-placeholder-gray py-4">No notifications</div>
          )}
        </div>
      </div>
    </DropdownPanel>
  );
};

export default NotificationDropdown;
