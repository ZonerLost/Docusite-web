import { db } from "@/lib/firebase-client";
import { collection, doc, limit, onSnapshot, orderBy, query } from "firebase/firestore";

import type { NotificationDoc, NotificationUI } from "./types";
import { normalizeEmail } from "./keys";
import { timeAgo } from "./time";

const DEBUG_NOTIF = process.env.NEXT_PUBLIC_DEBUG_NOTIFICATIONS === "1";

function d(tag: string, payload?: unknown) {
  if (!DEBUG_NOTIF) return;
  try {
    console.debug(`[notifications] ${tag}`, payload ?? "");
  } catch {}
}

function itemsCol(emailKey: string) {
  return collection(doc(db, "notifications", emailKey), "items");
}

type SubscribeOptions = {
  dedupeProjectInvites?: boolean;
};

export function subscribeUserNotifications(
  email: string,
  cb: (items: NotificationUI[]) => void,
  opts: SubscribeOptions = {}
) {
  const key = normalizeEmail(email);
  if (!key) return () => {};

  const dedupeInvites = opts.dedupeProjectInvites === true;
  const q = query(itemsCol(key), orderBy("time", "desc"), limit(50));

  d("subscribe:start", { key, path: `notifications/${key}/items` });

  const unsub = onSnapshot(
    q,
    (snap) => {
      const out: NotificationUI[] = [];
      const seenInviteIds = new Set<string>();

      snap.forEach((docSnap) => {
        const data = docSnap.data() as NotificationDoc;

        if (dedupeInvites && data?.type === "project_invite") {
          const inviteKey =
            typeof data.inviteId === "string" && data.inviteId.trim()
              ? data.inviteId.trim()
              : docSnap.id;
          if (seenInviteIds.has(inviteKey)) return;
          seenInviteIds.add(inviteKey);
        }

        out.push({
          id: docSnap.id,
          title: data.title,
          description: data.subTitle,
          timeText: timeAgo(data.time),
          isUnread: !!data.unread,
          type: data.type,
          inviteId: data.inviteId,
          projectId: data.projectId,
          senderId: data.senderId,
          chatId: data.chatId,
          messageId: data.messageId,
          status: data.status,
          respondedAt: data.respondedAt,
        });
      });

      d("subscribe:snapshot", {
        key,
        size: snap.size,
        first: out.slice(0, 3).map((n) => ({ id: n.id, type: n.type })),
      });
      cb(out);
    },
    (error) => {
      console.error("[notifications:subscribe] onSnapshot error", { key }, error);
    }
  );

  return unsub;
}
