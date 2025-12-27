import type { NotificationUI, NotificationTarget } from "./types";

export function getNotificationTarget(n: NotificationUI): NotificationTarget {
  if (!n?.type) return null;
  const type = String(n.type).toLowerCase();

  if (type === "project_invite" && n.projectId) {
    return { pathname: "/dashboard/project-details", query: { projectId: n.projectId } };
  }

  if ((type === "project_upload" || type === "pdf_upload") && n.projectId) {
    return { pathname: "/dashboard/project-details", query: { projectId: n.projectId } };
  }

  const messageLike =
    type.includes("message") ||
    type.includes("chat") ||
    type === "new_message" ||
    type === "project_message";

  if (messageLike) {
    const chatKey = n.chatId || n.projectId || n.senderId;
    if (chatKey) {
      const query: Record<string, string> = { projectId: chatKey };
      if (n.messageId) query.messageId = n.messageId;
      return { pathname: "/dashboard/messages", query };
    }
  }

  return null;
}
