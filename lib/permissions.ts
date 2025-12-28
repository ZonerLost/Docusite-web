import { auth, db } from "@/lib/firebase-client";
import { collection, doc, getDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";

/**
 * Checks whether the current user can modify a given project.
 * A user can modify if:
 *  - They are the creator/owner (createdBy/ownerId === uid)
 *  - OR a membership doc exists at: projects/{projectId}/members/{uid}
 *  - Fallback: listed under collaborators (by uid/email)
 *
 * If not allowed, this function shows a toast and returns false.
 */
type ProjectPermissionAction = "view" | "invite";

function strSafe(v: unknown) {
  return (typeof v === "string" ? v : "").trim();
}

const DEBUG_PERMS =
  typeof window !== "undefined" && process.env.NEXT_PUBLIC_DEBUG_PERMS === "1";

function dlog(...args: any[]) {
  if (DEBUG_PERMS) console.log(...args);
}

function toLowerSafe(v: unknown) {
  return (typeof v === "string" ? v : "").trim().toLowerCase();
}

function getOwnerDebug(
  projectData: any,
  uid: string,
  emailLower: string,
  displayNameLower: string
) {
  const candidates: unknown[] = [
    projectData?.ownerUid,
    projectData?.ownerId,
    projectData?.createdByUid,
    projectData?.createdById,
    projectData?.creatorUid,
    projectData?.creatorId,

    projectData?.userId,
    projectData?.userUid,
    projectData?.createdByUserId,
    projectData?.createdByUserUid,

    projectData?.createdBy,

    projectData?.createdBy?.uid,
    projectData?.createdBy?.id,
    projectData?.createdBy?.userId,
    projectData?.createdBy?.userUid,
    projectData?.createdBy?.ownerUid,

    projectData?.owner?.uid,
    projectData?.owner?.id,
    projectData?.owner?.userId,

    projectData?.ownerEmail,
    projectData?.createdByEmail,
    projectData?.createdBy?.email,
    projectData?.owner?.email,

    projectData?.ownerName,
    projectData?.createdByName,
    projectData?.createdBy?.name,
    projectData?.owner?.name,
  ];

  const rows = candidates
    .filter((c) => c !== undefined && c !== null && `${c}`.trim() !== "")
    .map((c) => ({
      value: c,
      norm: toLowerSafe(c),
      match: isCurrentUserMatch(c, uid, emailLower, displayNameLower),
    }));

  const matched = rows.find((r) => r.match);
  return { isOwner: !!matched, matched, rows };
}

function isCurrentUserMatch(
  candidate: unknown,
  uid: string,
  emailLower: string,
  displayNameLower: string
) {
  const s = toLowerSafe(candidate);
  if (!s) return false;

  // uid match
  if (s === uid.toLowerCase()) return true;

  // email match
  if (emailLower && s === emailLower) return true;

  // (dev fallback) display name match — ONLY for dev
  if (displayNameLower && s === displayNameLower) return true;

  return false;
}

function isOwnerOfProjectDoc(
  projectData: any,
  uid: string,
  emailLower: string,
  displayNameLower: string
) {
  const candidates: unknown[] = [
    // most common
    projectData?.ownerUid,
    projectData?.ownerId,
    projectData?.createdByUid,
    projectData?.createdById,
    projectData?.creatorUid,
    projectData?.creatorId,

    // also very common in apps
    projectData?.userId,
    projectData?.userUid,
    projectData?.createdByUserId,
    projectData?.createdByUserUid,

    // createdBy can be string (uid/email/name)
    projectData?.createdBy,

    // nested creator/owner objects
    projectData?.createdBy?.uid,
    projectData?.createdBy?.id,
    projectData?.createdBy?.userId,
    projectData?.createdBy?.ownerUid,
    projectData?.owner?.uid,
    projectData?.owner?.id,
    projectData?.owner?.userId,

    // email-based fields
    projectData?.ownerEmail,
    projectData?.createdByEmail,
    projectData?.createdBy?.email,
    projectData?.owner?.email,

    // (dev) name-based
    projectData?.ownerName,
    projectData?.createdByName,
    projectData?.createdBy?.name,
    projectData?.owner?.name,
  ];

  return candidates.some((c) =>
    isCurrentUserMatch(c, uid, emailLower, displayNameLower)
  );
}

export async function checkProjectPermission(
  projectId: string,
  action: ProjectPermissionAction = "view"
): Promise<boolean> {
  try {
    const user = auth.currentUser;
    if (!user) {
      if (action === "view") toast.error("You must be logged in.");
      return false;
    }

    const ref = doc(db, "projects", projectId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return false;
    }

    const data = snap.data() as any;
    const uid = user.uid;
    const emailLower = toLowerSafe(user.email);
    const displayNameLower = toLowerSafe(user.displayName);

    console.log("[perm] checkProjectPermission()", {
      action,
      projectId,
      uid,
      email: user.email,
      displayName: user.displayName,
      projectKeys: Object.keys(data || {}),
    });

    const ownerDbg = getOwnerDebug(data, uid, emailLower, displayNameLower);
    console.log("[perm] owner candidates", ownerDbg);

    const isOwner = ownerDbg.isOwner;
    if (isOwner) return true;

    // Membership subcollection: /projects/{projectId}/members/{uid}
    let isMember = false;
    let memberCanEdit = false;
    try {
      const memberRef = doc(collection(ref, "members"), uid);
      const memberSnap = await getDoc(memberRef);
      if (memberSnap.exists()) {
        isMember = true;
        const m = (memberSnap.data() as any) || {};
        const accessLevel = toLowerSafe(m.accessLevel);
        const role = toLowerSafe(m.role);
        memberCanEdit =
          m.canEdit === true || accessLevel === "edit" || role.includes("edit");
      }
    } catch {}

    // Collaborators array fallback
    let isCollaborator = false;
    let collaboratorCanEdit = false;
    try {
      const list: Array<any> = Array.isArray(data?.collaborators)
        ? data.collaborators
        : [];
      const me = list.find((c) => {
        if (!c) return false;
        if (typeof c === "string") return toLowerSafe(c) === emailLower;
        const cEmail = toLowerSafe(c?.email);
        return c?.uid === uid || (!!emailLower && cEmail === emailLower);
      });

      if (me) {
        isCollaborator = true;
        const accessLevel = toLowerSafe(me?.accessLevel);
        const role = toLowerSafe(me?.role);
        collaboratorCanEdit =
          me?.canEdit === true ||
          accessLevel === "edit" ||
          role.includes("edit");
      }
    } catch {}

    if (action === "invite") {
      // ✅ owner OR edit-capable member/collab can invite
      if (collaboratorCanEdit || memberCanEdit) return true;

      const err: any = new Error(
        "Permission denied. Only the project owner can invite."
      );
      err.code = "permission-denied";
      throw err;
    }

    if (isMember || isCollaborator) return true;

    toast.error("You are not a member of this project.");
    return false;
  } catch (e: any) {
    if (action === "invite") throw e;
    toast.error("You are not a member of this project.");
    return false;
  }
}

/**
 * Checks whether the current user can edit/manage a given project.
 * A user can edit if:
 *  - They are the owner
 *  - OR collaborator/member indicates edit access
 */
export async function checkProjectEditPermission(
  projectId: string
): Promise<boolean> {
  try {
    const user = auth.currentUser;
    if (!user) {
      toast.error("You must be logged in.");
      return false;
    }

    const ref = doc(db, "projects", projectId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;

    const data = snap.data() as any;
    const uid = user.uid;
    const emailLower = toLowerSafe(user.email);

    // ✅ FIX: owner detection supports UID + EMAIL across multiple keys/shapes
    const displayNameLower = toLowerSafe(user.displayName);

    if (isOwnerOfProjectDoc(data, uid, emailLower, displayNameLower))
      return true;

    // Subcollection membership: /projects/{id}/members/{uid}
    try {
      const memberRef = doc(collection(ref, "members"), uid);
      const memberSnap = await getDoc(memberRef);
      if (memberSnap.exists()) {
        const m = (memberSnap.data() as any) || {};
        const accessLevel = toLowerSafe(m.accessLevel);
        const role = toLowerSafe(m.role);
        if (
          m.canEdit === true ||
          accessLevel === "edit" ||
          role.includes("edit")
        )
          return true;
      }
    } catch {}

    // Collaborators array check
    try {
      const list: Array<any> = Array.isArray(data?.collaborators)
        ? data.collaborators
        : [];
      const me = list.find(
        (c) => c?.uid === uid || toLowerSafe(c?.email) === emailLower
      );
      if (me) {
        const accessLevel = toLowerSafe(me?.accessLevel);
        const role = toLowerSafe(me?.role);
        if (
          me.canEdit === true ||
          accessLevel === "edit" ||
          role.includes("edit")
        )
          return true;
      }
    } catch {}

    toast.error("You have view-only access to this project.");
    return false;
  } catch {
    toast.error("You have view-only access to this project.");
    return false;
  }
}

/**
 * Ensures the current user can modify the project.
 * Throws an error with code 'permission-denied' if not allowed.
 */
export async function ensureCanModifyProject(projectId: string): Promise<void> {
  const ok = await checkProjectEditPermission(projectId);
  if (!ok) {
    const err: any = new Error("permission-denied");
    err.code = "permission-denied";
    throw err;
  }
}
