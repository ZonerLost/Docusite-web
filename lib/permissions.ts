import { auth, db } from '@/lib/firebase-client';
import { collection, doc, getDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

/**
 * Checks whether the current user can modify a given project.
 * A user can modify if:
 *  - They are the creator/owner (createdBy/ownerId === uid)
 *  - OR a membership doc exists at: projects/{projectId}/members/{uid}
 *  - Fallback: listed under collaborators (by uid/email)
 *
 * If not allowed, this function shows a toast and returns false.
 */
export async function checkProjectPermission(projectId: string): Promise<boolean> {
  try {
    const user = auth.currentUser;
    if (!user) {
      toast.error('You must be logged in.');
      return false;
    }

    const ref = doc(db, 'projects', projectId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      // Let callers handle not-found explicitly (avoid misleading membership toast)
      return false;
    }

    const data = snap.data() as any;
    const uid = user.uid;
    const email = (user.email || '').toLowerCase();

    // Owner check: support both createdBy and ownerId
    if (data?.createdBy === uid || data?.ownerId === uid) return true;

    // Membership subcollection check: /projects/{projectId}/members/{uid}
    try {
      const memberRef = doc(collection(ref, 'members'), uid);
      const memberSnap = await getDoc(memberRef);
      if (memberSnap.exists()) return true;
    } catch {}

    // Fallback to collaborators array in project doc (if present in current schema)
    try {
      const list: Array<any> = Array.isArray(data?.collaborators) ? data.collaborators : [];
      const ok = list.some((c) => c?.uid === uid || (c?.email || '').toLowerCase() === email);
      if (ok) return true;
    } catch {}

    toast.error('You are not a member of this project.');
    return false;
  } catch {
    // On unexpected errors, block modification by default
    toast.error('You are not a member of this project.');
    return false;
  }
}

/**
 * Checks whether the current user can edit/manage a given project.
 * A user can edit if:
 *  - They are the owner (createdBy/ownerId === uid)
 *  - OR collaborator entry has canEdit === true OR role includes 'edit'
 *  - OR membership subdoc has canEdit === true OR role includes 'edit'
 * Shows a toast and returns false if the user only has view access.
 */
export async function checkProjectEditPermission(projectId: string): Promise<boolean> {
  try {
    const user = auth.currentUser;
    if (!user) {
      toast.error('You must be logged in.');
      return false;
    }

    const ref = doc(db, 'projects', projectId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;

    const data = snap.data() as any;
    const uid = user.uid;
    const email = (user.email || '').toLowerCase();

    // Owner always has edit rights
    if (data?.createdBy === uid || data?.ownerId === uid) return true;

    // Subcollection membership: /projects/{id}/members/{uid}
    try {
      const memberRef = doc(collection(ref, 'members'), uid);
      const memberSnap = await getDoc(memberRef);
      if (memberSnap.exists()) {
        const m = (memberSnap.data() as any) || {};
        const role = String(m.role || '').toLowerCase();
        if (m.canEdit === true || role.includes('edit')) return true;
      }
    } catch {}

    // Collaborators array check
    try {
      const list: Array<any> = Array.isArray(data?.collaborators) ? data.collaborators : [];
      const me = list.find((c) => c?.uid === uid || (c?.email || '').toLowerCase() === email);
      if (me) {
        const role = String(me.role || '').toLowerCase();
        if (me.canEdit === true || role.includes('edit')) return true;
      }
    } catch {}

    toast.error('You have view-only access to this project.');
    return false;
  } catch {
    toast.error('You have view-only access to this project.');
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
    const err: any = new Error('permission-denied');
    err.code = 'permission-denied';
    throw err;
  }
}
