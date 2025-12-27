import type { Timestamp } from "firebase/firestore";

export type NotificationDoc = {
  inviteId?: string;
  projectId?: string;
  uploaderId?: string;
  senderId?: string;
  chatId?: string;
  messageId?: string;

  subTitle: string;
  time: Timestamp;
  title: string;
  type: string; // e.g. 'project_invite'
  unread: boolean;

  // optional (nice to have)
  status?: "pending" | "accepted" | "declined" | "expired";
  readAt?: Timestamp;
  respondedAt?: Timestamp;
};

export type NotificationUI = {
  id: string;
  title: string;
  description: string;
  timeText: string;
  isUnread: boolean;
  type: string;

  inviteId?: string;
  projectId?: string;
  senderId?: string;
  chatId?: string;
  messageId?: string;

  status?: NotificationDoc["status"];
  respondedAt?: Timestamp;
};

export type InviteSummary = {
  projectTitle?: string;
  invitedByName?: string;
  invitedByEmail?: string;
  projectId?: string;

  status?: "pending" | "accepted" | "declined" | "expired";
  invitedAt?: Timestamp;
  respondedAt?: Timestamp;
  accessLevel?: string;
  role?: string;
};

export type NotificationTarget =
  | { pathname: string; query?: Record<string, string> }
  | null;
