"use client";

import React from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { toast } from "react-hot-toast";

import { auth } from "@/lib/firebase-client";
import { ensureUserDoc } from "@/lib/ensure-user-doc";

import {
  subscribeUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  acceptInviteFromNotification,
  declineInviteNotification,
  getInviteSummary,
  getNotificationTarget,
  type NotificationUI,
  type InviteSummary,
} from "@/lib/notifications";

type InvitePreviewState = {
  open: boolean;
  loading: boolean;
  notifId?: string;
  inviteId?: string;
  projectId?: string;
  summary?: InviteSummary | null;
};

export function useTopBarNotifications() {
  const router = useRouter();

  const [notifications, setNotifications] = React.useState<NotificationUI[]>([]);
  const [invitePreview, setInvitePreview] = React.useState<InvitePreviewState>({
    open: false,
    loading: false,
  });
  const [acceptingInvite, setAcceptingInvite] = React.useState(false);

  React.useEffect(() => {
    let stop: null | (() => void) = null;
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (stop) {
        try {
          stop();
        } catch {}
        stop = null;
      }

      if (u?.email) {
        try {
          await ensureUserDoc();
        } catch (e) {
          console.warn(
            "[notifications] ensureUserDoc failed; skipping subscribe",
            e
          );
          setNotifications([]);
          return;
        }
        stop = subscribeUserNotifications(u.email, setNotifications);
      } else {
        setNotifications([]);
      }
    });

    return () => {
      unsub();
      if (stop) {
        try {
          stop();
        } catch {}
      }
    };
  }, []);

  const unreadCount = React.useMemo(
    () => notifications.filter((n) => n.isUnread).length,
    [notifications]
  );

  const markAllRead = async () => {
    const user = auth.currentUser;
    if (!user?.email) return;
    await markAllNotificationsRead(user.email);
  };

  const removeNotification = async (id: string) => {
    const user = auth.currentUser;
    if (!user?.email) return;
    await deleteNotification(user.email, id);
    toast.success("Notification deleted");
  };

  const onClickNotification = async (id: string) => {
    const user = auth.currentUser;
    if (!user?.email) return;

    const n = notifications.find((x) => x.id === id);

    // Invite => preview modal
    if (n?.type === "project_invite") {
      const inviteId = n.inviteId || id;
      if (!inviteId) return;

      setInvitePreview({
        open: true,
        loading: true,
        notifId: id,
        inviteId,
        projectId: n.projectId,
      });

      try {
        const s = await getInviteSummary(user.email, inviteId, { pendingOnly: true });

        if (!s) {
          await markNotificationRead(user.email, id);
          setInvitePreview({ open: false, loading: false });
          toast.success("This invite has already been handled.");
          return;
        }

        setInvitePreview((prev) => ({ ...prev, loading: false, summary: s }));
      } catch {
        setInvitePreview((prev) => ({ ...prev, loading: false, summary: null }));
      }

      // mark as read when user opens it
      await markNotificationRead(user.email, id);
      return;
    }

    // Normal notification: mark read then navigate (notification stays)
    await markNotificationRead(user.email, id);

    const target = n ? getNotificationTarget(n) : null;
    if (!target) return;

    router.push({ pathname: target.pathname, query: target.query });
  };

  const closeInviteModal = () => setInvitePreview({ open: false, loading: false });

  const acceptInvite = async () => {
    const user = auth.currentUser;
    if (!user?.email || !invitePreview.notifId) return;
    if (acceptingInvite) return;

    try {
      setAcceptingInvite(true);
      const res = await acceptInviteFromNotification({
        email: user.email,
        notificationId: invitePreview.notifId,
      });

      if (res === "already-member") toast.success("You are already a member of this project.");
      else toast.success("Invitation accepted successfully.");
    } catch (e: any) {
      toast.error(e?.message || "Unable to accept invite");
    } finally {
      setAcceptingInvite(false);
      closeInviteModal();
    }
  };

  const declineInvite = async () => {
    const user = auth.currentUser;
    if (!user?.email || !invitePreview.inviteId) return;

    try {
      await declineInviteNotification(user.email, invitePreview.inviteId, invitePreview.notifId);
      toast.success("Invitation declined");
    } catch (e: any) {
      toast.error(e?.message || "Unable to decline invite");
    } finally {
      closeInviteModal();
    }
  };

  return {
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
  };
}
