import React from 'react';

interface Notification {
    id: number;
    icon: string;
    title: string;
    description: string;
    time: string;
    isUnread: boolean;
    action?: string;
}

interface NotificationDropdownProps {
    isOpen: boolean;
    notifications: Notification[];
    onClose: () => void;
    onNotificationClick: (notificationId: number) => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
    isOpen,
    notifications,
    onClose,
    onNotificationClick
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed left-1/2 transform -translate-x-1/2 top-60 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:transform-none w-96 sm:w-92 bg-white border border-border-gray rounded-xl shadow-md z-50">
            <div className="p-3">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {notifications.map((notification) => (
                        <div 
                            key={notification.id} 
                            className="flex items-start space-x-3 py-3 border-b border-border-gray last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => onNotificationClick(notification.id)}
                        >
                            {/* Icon */}
                            <div className="flex-shrink-0">
                                <div className="w-12 h-12 bg-avatar-bg rounded-full flex items-center justify-center">
                                    <span className="text-md font-semibold text-action">{notification.icon}</span>
                                </div>
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between relative">
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-black">{notification.title}</p>
                                        <p className="text-sm text-text-gray mt-1">
                                            {notification.description}
                                            {notification.action && (
                                                <span className="text-action underline pl-1 cursor-pointer">{notification.action}</span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end space-y-1">
                                        <span className="text-xs text-placeholder-gray">{notification.time}</span>
                                        {notification.isUnread && (
                                            <div className="absolute -bottom-1 right-1 w-2 h-2 bg-action rounded-full"></div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default NotificationDropdown;
