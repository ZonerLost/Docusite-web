"use client";

import React from "react";
import { useClickOutside } from "@/hooks/useClickOutside";
import { NotificationIcon } from "../ui/Icons";

import NotificationDropdown from "./topbar/notifications/NotificationDropdown";
import InvitePreviewModal from "./topbar/notifications/InvitePreviewModal";
import { useTopBarNotifications } from "@/hooks/useTopBarNotifications";

export type TopBarNotificationsHandle = {
  open: () => void;
  close: () => void;
  toggle: () => void;
};

type Props = {
  onOpen?: () => void;
};

const TopBarNotifications = React.forwardRef<TopBarNotificationsHandle, Props>(
  ({ onOpen }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const rootRef = React.useRef<HTMLDivElement>(null);

    const {
      notifications,
      unreadCount,
      invitePreview,
      acceptingInvite,
      markAllRead,
      onClickNotification,
      removeNotification,
      acceptInvite,
      declineInvite,
      closeInviteModal,
    } = useTopBarNotifications();

    React.useImperativeHandle(
      ref,
      () => ({
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        toggle: () => setIsOpen((s) => !s),
      }),
      []
    );

    useClickOutside(rootRef, () => setIsOpen(false), { enabled: isOpen });

    const toggleOpen = () => {
      setIsOpen((prev) => {
        const next = !prev;
        if (next) onOpen?.();
        return next;
      });
    };

    const handleItemClick = async (id: string) => {
      setIsOpen(false);
      await onClickNotification(id);
    };

    return (
      <>
        <div className="relative" ref={rootRef}>
          <button
            onClick={toggleOpen}
            className="h-12 w-12 bg-light-gray border border-border-gray rounded-full text-gray-600 transition-colors flex items-center justify-center"
          >
            <NotificationIcon className="sm:w-5 sm:h-5" />

            {/* Red dot/indicator */}
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-bold">{unreadCount}</span>
              </div>
            )}
          </button>

          <NotificationDropdown
            isOpen={isOpen}
            notifications={notifications.map((n) => ({
              id: n.id,
              title: n.title,
              description: n.description,
              time: n.timeText,
              isUnread: n.isUnread,
              type: n.type,
              inviteId: n.inviteId,
              projectId: n.projectId,
            }))}
            onClose={() => setIsOpen(false)}
            onNotificationClick={handleItemClick}
            onMarkAllRead={markAllRead}
            onDeleteNotification={removeNotification}
          />
        </div>

        <InvitePreviewModal
          open={invitePreview.open}
          loading={invitePreview.loading}
          summary={invitePreview.summary}
          accepting={acceptingInvite}
          onClose={closeInviteModal}
          onAccept={acceptInvite}
          onDecline={declineInvite}
        />
      </>
    );
  }
);

TopBarNotifications.displayName = "TopBarNotifications";
export default TopBarNotifications;
