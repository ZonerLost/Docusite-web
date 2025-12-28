import { auth, db } from "@/lib/firebase-client";
import { checkProjectPermission } from "@/lib/permissions";
import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { normalizeEmail } from "@/lib/notifications";

// In-memory idempotency guards for duplicate front-end calls
// - INFLIGHT prevents concurrent duplicates during the same tick/action
// - RECENT prevents immediate re-triggers right after completion (e.g., double clicks, rapid re-renders)
const INFLIGHT_INVITES = new Map<string, Promise<{ id: string }>>();
const RECENT_INVITES = new Map<
  string,
  { result: { id: string }; timer: ReturnType<typeof setTimeout> }
>();

type SendInviteInput = {
  projectId: string;
  projectTitle: string;
  invitedEmail: string;
  invitedUserName?: string;
  role: string;
  accessLevel?: "view" | "edit";
};

const DEBUG_INVITES = true;

function emailKey(email: string) {
  return (email || "").trim().toLowerCase();
}

function logFail(step: string, path: string, payload: any, e: any) {
  const code = e?.code;
  const message = e?.message;
  console.warn(`[invite:${step}] failed`, {
    path,
    keys: Object.keys(payload || {}),
    code,
    message,
  });

  if (code === "permission-denied") {
    console.warn("Invite write blocked by rules. See logged path above.");
  }
}

export async function sendProjectInvite(input: {
  projectId: string;
  projectTitle: string;
  invitedEmail: string;
  invitedUserName?: string;
  role: string;
  accessLevel: "view" | "edit";
}) {
  const me = auth.currentUser;



  if (!me?.email) throw new Error("Not authenticated");

  if (DEBUG_INVITES) {
    try {
      const token = await me.getIdTokenResult(true);
      const tokenEmail = (token?.claims as any)?.email || null;
      console.debug("[invite] auth token", {
        uid: me.uid,
        authEmail: me.email,
        tokenEmail,
        signInProvider: token?.signInProvider || null,
      });
    } catch (e: any) {
      console.warn("[invite] failed to read auth token", e?.code, e?.message);
    }
  }

  const invitedKey = emailKey(input.invitedEmail);
  if (!invitedKey) throw new Error("Invalid invited email");

  const projectId = (input.projectId || "").trim();
  if (!projectId) throw new Error("Missing projectId");

  const projectTitle = (input.projectTitle || "").trim();
  if (!projectTitle) throw new Error("Missing projectTitle");

  // App-level permission check (owner or edit-capable collaborator/member)
  await checkProjectPermission(projectId, "invite");

  const inviteId = `inv_${crypto.randomUUID().replace(/-/g, "")}`;
  const inviteRef = doc(
    collection(doc(db, "pending_requests", invitedKey), "requests"),
    inviteId
  );

  const notifItemRef = doc(
    collection(doc(db, "notifications", invitedKey), "items"),
    inviteId
  );

  // ✅ IMPORTANT: invitedEmail MUST match path email (your rules compare these)
  const invitePayload = {
    invitedEmail: invitedKey,
    invitedUserName: (input.invitedUserName || "").trim(),
    projectId,
    projectTitle,
    status: "pending",
    invitedAt: serverTimestamp(),
    accessLevel: input.accessLevel,
    role: input.role,
    invitedByEmail: me.email.toLowerCase(),
    invitedBy: me.uid,
    invitedByName: me.displayName || "",
  };

  const notifPayload = {
    type: "project_invite",
    title: "New Project Invitation",
    subTitle: `${
      me.displayName || me.email
    } invited you to collaborate in "${projectTitle}". Tap to view.`,
    time: serverTimestamp(),
    unread: true,
    inviteId,
    projectId,
    dedupeKey: `${input.projectId}::${invitedKey}`,
  };

  const invitePath = inviteRef.path;
  const notifPath = notifItemRef.path;

  if (DEBUG_INVITES) {
    console.debug("[invite:api] request", {
      invitePath,
      notifPath,
      inviteId,
      projectId,
      invitedKey,
    });
  }

  try {
    const idToken = await me.getIdToken();
    const resp = await fetch("/api/invites/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        projectId,
        projectTitle,
        invitedEmail: invitedKey,
        invitedUserName: (input.invitedUserName || "").trim(),
        role: input.role,
        accessLevel: input.accessLevel,
        inviteId,
        inviterDisplayName: me.displayName || "",
        debug: DEBUG_INVITES,
      }),
    });

    let data: any = null;
    try {
      data = await resp.json();
    } catch {}

    if (!resp.ok) {
      const errorMessage =
        (data && (data.error || data.message)) ||
        `Invite request failed (${resp.status})`;
      const err: any = new Error(errorMessage);
      err.code =
        data?.code ||
        (resp.status === 401
          ? "unauthenticated"
          : resp.status === 403
            ? "permission-denied"
            : undefined);

      logFail("api", invitePath, { inviteId, projectId, invitedKey, notifPath }, err);
      throw err;
    }

    return { id: data?.id || inviteId };
  } catch (e: any) {
    if (e?.code === "permission-denied") {
      console.warn("Invite write blocked by rules. See logged path above.");
    }
    throw e;
  }
}

export async function acceptProjectInvite(
  invitedEmail: string,
  inviteId: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const emailKey = normalizeEmail(invitedEmail);
  if (!emailKey) throw new Error("Invalid invite email");
  const metaRef = doc(db, "pending_requests", emailKey);
  const inviteRef = doc(collection(metaRef, "requests"), inviteId);

  const snap = await getDoc(inviteRef);
  if (!snap.exists()) throw new Error("Invite not found");
  const data = snap.data() as any;

  const projectId: string = (data?.projectId || "").trim();
  if (!projectId) throw new Error("Invalid invite: missing projectId");

  // Add user to project members subcollection using members collection structure
  const memberRef = doc(db, "projects", projectId, "members", user.uid);

  const memberDoc = {
    userId: user.uid,
    userName:
      user.displayName ||
      data?.invitedUserName ||
      (emailKey.includes("@") ? emailKey.split("@")[0] : emailKey),
    userEmail: user.email || emailKey,
    role: (data?.role || "Member").toString(),
    accessLevel: (data?.accessLevel || "view").toString(),
    joinedAt: serverTimestamp() as any,
  } as const;

  const batch = writeBatch(db);
  batch.set(memberRef, memberDoc);
  batch.update(inviteRef, {
    status: "accepted",
    respondedAt: serverTimestamp() as any,
  });
  batch.set(
    metaRef,
    { lastUpdated: serverTimestamp() as any },
    { merge: true }
  );
  await batch.commit();
}

export async function declineProjectInvite(
  invitedEmail: string,
  inviteId: string
): Promise<void> {
  const emailKey = normalizeEmail(invitedEmail);
  if (!emailKey) throw new Error("Invalid invite email");
  const metaRef = doc(db, "pending_requests", emailKey);
  const inviteRef = doc(collection(metaRef, "requests"), inviteId);

  const snap = await getDoc(inviteRef);
  if (!snap.exists()) throw new Error("Invite not found");

  const batch = writeBatch(db);
  batch.update(inviteRef, {
    status: "declined",
    respondedAt: serverTimestamp() as any,
  });
  batch.set(
    metaRef,
    { lastUpdated: serverTimestamp() as any },
    { merge: true }
  );
  await batch.commit();
}
