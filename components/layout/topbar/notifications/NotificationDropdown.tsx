"use client";

import React from "react";
import { Trash2 } from "lucide-react";

type NotificationItem = {
  id: string;
  title: string;
  description?: string;
  time?: string;
  isUnread?: boolean;
};

type Props = {
  isOpen: boolean;
  notifications: NotificationItem[];
  onClose: () => void;
  onNotificationClick: (id: string) => void;
  onMarkAllRead?: () => void;
  onDeleteNotification?: (id: string) => void;
};

const NotificationDropdown: React.FC<Props> = ({
  isOpen,
  notifications,
  onClose,
  onNotificationClick,
  onMarkAllRead,
  onDeleteNotification,
}) => {
  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => n.isUnread).length;

  return (
    <div className="absolute right-0 mt-3 z-50">
      <div className="w-[92vw] sm:w-[440px] bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
          <div className="font-semibold text-black">Notifications</div>

          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="text-xs font-medium text-action hover:text-action/80"
              >
                Mark all as read
              </button>
            )}
            <button onClick={onClose} className="text-gray-500 hover:text-black">
              ✕
            </button>
          </div>
        </div>

        <div className="max-h-[440px] overflow-auto">
          {notifications.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">
              No notifications
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => onNotificationClick(n.id)}
                    className={`group w-full text-left px-4 py-3 flex gap-3 hover:bg-gray-50 transition-colors ${
                      n.isUnread ? "bg-blue-50/40" : "bg-white"
                    }`}
                  >
                    <div className="pt-1">
                      <div
                        className={`h-2.5 w-2.5 rounded-full ${
                          n.isUnread ? "bg-action" : "bg-gray-300"
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-black truncate">
                            {n.title}
                          </div>
                          {n.description && (
                            <div className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                              {n.description}
                            </div>
                          )}
                        </div>

                        {onDeleteNotification && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onDeleteNotification(n.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-1 rounded-md"
                            title="Delete"
                            aria-label="Delete notification"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {n.time && (
                        <div className="text-[11px] text-gray-500 mt-1">
                          {n.time}
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-500">
          Hover a notification to delete it.
        </div>
      </div>
    </div>
  );
};

export default NotificationDropdown;
