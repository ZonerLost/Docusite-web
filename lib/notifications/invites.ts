import { auth, db } from "@/lib/firebase-client";
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

import { getAuthedEmailKey } from "./authed";
import type { InviteSummary } from "./types";

function notifItemRef(emailKey: string, notificationId: string) {
  return doc(collection(doc(db, "notifications", emailKey), "items"), notificationId);
}

export async function getInviteSummary(
  invitedEmail: string,
  inviteId: string,
  opts: { pendingOnly?: boolean } = { pendingOnly: true }
): Promise<InviteSummary | null> {
  let key: string;
  try {
    key = getAuthedEmailKey();
  } catch (e) {
    console.warn(
      "[notifications:getInviteSummary] failed",
      { authEmail: auth.currentUser?.email, inviteId, path: null },
      e
    );
    return null;
  }
  if (!inviteId) return null;

  const path = `pending_requests/${key}/requests/${inviteId}`;

  try {
    const ref = doc(collection(doc(db, "pending_requests", key), "requests"), inviteId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const data = snap.data() as any;
    const status = String(data?.status || "pending").toLowerCase() as InviteSummary["status"];

    if (opts.pendingOnly && status !== "pending") return null;

    return {
      projectTitle: data?.projectTitle,
      invitedByName: data?.invitedByName || data?.invitedBy,
      invitedByEmail: data?.invitedByEmail,
      projectId: data?.projectId,
      status,
      invitedAt: data?.invitedAt,
      respondedAt: data?.respondedAt,
      accessLevel: data?.accessLevel,
      role: data?.role,
    };
  } catch (e) {
    console.warn(
      "[notifications:getInviteSummary] failed",
      { authEmail: auth.currentUser?.email, usedKey: key, inviteId, path },
      e
    );
    return null;
  }
}

const ACCEPTING_INVITES = new Map<string, Promise<"accepted" | "already-member">>();
const RECENT_ACCEPTS = new Map<
  string,
  { result: "accepted" | "already-member"; timer: ReturnType<typeof setTimeout> }
>();

export async function acceptInviteFromNotification(params: {
  email: string;
  notificationId: string;
}): Promise<"accepted" | "already-member"> {
  const { email, notificationId } = params;
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const key = getAuthedEmailKey();
  if (!notificationId) throw new Error("Invalid or expired invitation.");

  const lockKey = `${key}::${notificationId}`;
  const recent = RECENT_ACCEPTS.get(lockKey);
  if (recent) return Promise.resolve(recent.result);
  const inflight = ACCEPTING_INVITES.get(lockKey);
  if (inflight) return inflight;

  const run = async (): Promise<"accepted" | "already-member"> => {
    const notifRef = notifItemRef(key, notificationId);
    const notifSnap = await getDoc(notifRef);

    const ndata = notifSnap.exists() ? (notifSnap.data() as any) : null;
    let inviteId: string | undefined =
      typeof ndata?.inviteId === "string" && ndata.inviteId.trim()
        ? ndata.inviteId.trim()
        : undefined;

    // in your system sometimes notificationId is inviteId
    if (!inviteId) inviteId = notificationId;

    let projectId: string | undefined = (ndata?.projectId || "").toString().trim() || undefined;

    // fallback: from invite doc
    let invSnap: any | null = null;
    if (!projectId && inviteId) {
      const invRef = doc(collection(doc(db, "pending_requests", key), "requests"), inviteId);
      invSnap = await getDoc(invRef);
      if (invSnap.exists()) {
        const inv = invSnap.data() as any;
        const pid = (inv?.projectId || "").toString().trim();
        if (pid) projectId = pid;
      }
    }
    if (!projectId) throw new Error("Invalid or expired invitation.");

    const projectRef = doc(db, "projects", projectId);
    const projectSnap = await getDoc(projectRef);
    if (!projectSnap.exists()) throw new Error("Invalid or expired invitation.");

    const pdata = projectSnap.data() as any;
    const collaboratorsArr: any[] = Array.isArray(pdata?.collaborators) ? pdata.collaborators : [];
    const alreadyMember = collaboratorsArr.some(
      (c) =>
        c &&
        (c.uid === user.uid ||
          (c.email || "").toLowerCase() === (user.email || "").toLowerCase())
    );

    // derive role/access
    let role = "Member";
    let accessLevel: "view" | "edit" = "view";
    let canEdit = false;

    if (!invSnap && inviteId) {
      const invRef = doc(collection(doc(db, "pending_requests", key), "requests"), inviteId);
      invSnap = await getDoc(invRef);
    }
    if (invSnap?.exists?.()) {
      const inv = invSnap.data() as any;
      if (typeof inv?.role === "string" && inv.role.trim()) role = inv.role.trim();
      const lvl = (inv?.accessLevel || "").toString().toLowerCase();
      accessLevel = lvl === "edit" ? "edit" : "view";
      canEdit = lvl === "edit";
    }

    const displayName =
      user.displayName ||
      (user.email ? user.email.split("@")[0] : key.split("@")[0] || "Member");

    const batch = writeBatch(db);

    // ✅ update notification (DO NOT DELETE)
    if (notifSnap.exists()) {
      batch.update(notifRef, {
        status: "accepted",
        unread: false,
        readAt: serverTimestamp() as any,
        respondedAt: serverTimestamp() as any,
      });
    }

    // ✅ update invite status
    if (inviteId) {
      const inviteRef = doc(collection(doc(db, "pending_requests", key), "requests"), inviteId);
      batch.update(inviteRef, { status: "accepted", respondedAt: serverTimestamp() as any });
    }

    // ✅ ensure membership doc
    const memberRef = doc(db, "projects", projectId, "members", user.uid);
    batch.set(
      memberRef,
      {
        userId: user.uid,
        userName: displayName,
        userEmail: user.email || key,
        role,
        accessLevel,
        joinedAt: serverTimestamp() as any,
      },
      { merge: true }
    );

    // ✅ add to collaborators if needed
    if (!alreadyMember) {
      const newCollab = {
        uid: user.uid,
        email: user.email || key,
        name: displayName,
        photoUrl: user.photoURL || "",
        role,
        canEdit,
      } as const;

      batch.update(projectRef, {
        collaborators: arrayUnion(newCollab),
        collaboratorUids: arrayUnion(user.uid),
        updatedAt: serverTimestamp() as any,
      });
    }

    await batch.commit();
    return alreadyMember ? "already-member" : "accepted";
  };

  const p = (async () => {
    try {
      return await run();
    } finally {
      ACCEPTING_INVITES.delete(lockKey);
    }
  })();

  ACCEPTING_INVITES.set(lockKey, p);

  p.then((res) => {
    try {
      const t = setTimeout(() => {
        try {
          RECENT_ACCEPTS.delete(lockKey);
        } catch {}
      }, 1500);
      RECENT_ACCEPTS.set(lockKey, { result: res, timer: t });
    } catch {}
  }).catch((err) => {
    void err;
  });

  return p;
}

export async function declineInviteNotification(
  invitedEmail: string,
  inviteId: string,
  notificationId?: string
) {
  // Keep your existing declineProjectInvite if you want,
  // but do NOT delete notification; just mark it read + status.
  const key = getAuthedEmailKey();
  if (!inviteId) return;

  const batch = writeBatch(db);

  if (notificationId) {
    const notifRef = notifItemRef(key, notificationId);
    batch.update(notifRef, {
      status: "declined",
      unread: false,
      readAt: serverTimestamp() as any,
      respondedAt: serverTimestamp() as any,
    });
  }

  const inviteRef = doc(collection(doc(db, "pending_requests", key), "requests"), inviteId);
  batch.update(inviteRef, { status: "declined", respondedAt: serverTimestamp() as any });

  await batch.commit();
}
