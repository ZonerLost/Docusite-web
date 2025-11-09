import { auth, db } from '@/lib/firebase-client';
import { ensureCanModifyProject } from '@/lib/permissions';
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  addDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

export type Collaborator = {
  uid: string;
  email: string;
  name: string;
  photoUrl: string;
  role: string;
  canEdit: boolean;
};

export type ProjectFile = {
  category: string;
  fileName: string;
  fileUrl: string;
  lastUpdated: Timestamp;
  newCommentsCount?: number;
  newImagesCount?: number;
  uploadedBy?: string;
};

export type ProjectDoc = {
  title: string;
  clientName: string;
  location: string;
  ownerId: string;
  collaborators: Collaborator[];
  files?: ProjectFile[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deadline?: Timestamp;
  status: string; // e.g. "In progress" | "Completed" | "Cancelled"
  progress?: number; // could be 0..1 or 0..100
  collaboratorUids?: string[]; // optional index helper for queries
};

// UI card shape used across dashboard
export type ProjectCardUI = {
  id: string;
  name: string;
  location: string;
  team: string[];
  lastUpdatedTime: string;
  lastUpdatedTs?: number;
  assignedTo: string;
  deadlineDate?: string;
  progress?: number; // 0..100
  status: 'all' | 'in-progress' | 'completed' | 'cancelled';
  // for details modal enrichment
  clientName?: string;
  projectOwner?: string;
  deadline?: string;
  members?: number;
  raw?: ProjectDoc;
};

export function mapStatus(input?: string): 'in-progress' | 'completed' | 'cancelled' {
  const s = (input || '').toLowerCase().replace(/\s+/g, '-');
  if (s.includes('complete')) return 'completed';
  if (s.includes('cancel')) return 'cancelled';
  return 'in-progress';
}

// Map UI status id to Firestore document status value
export function toDocStatus(status: 'in-progress' | 'completed' | 'cancelled'): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'In progress';
  }
}

function fmtDate(ts?: Timestamp): string | undefined {
  if (!ts) return undefined;
  try {
    const d = ts.toDate();
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return undefined;
  }
}

function fmtAgo(ts?: Timestamp): string {
  if (!ts) return '—';
  try {
    const d = ts.toDate().getTime();
    const diff = Date.now() - d;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} mins ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } catch {
    return '—';
  }
}

function toPercent(progress?: number): number | undefined {
  if (progress == null) return undefined;
  if (progress <= 1) return Math.round(progress * 100);
  if (progress > 100) return 100;
  return Math.round(progress);
}

export function mapDocToCard(id: string, data: ProjectDoc): ProjectCardUI {
  const owner = data.collaborators?.find((c) => (c.role || '').toLowerCase().includes('owner'));
  const updatedMs = (data.updatedAt || data.createdAt)?.toDate?.()?.getTime?.() || undefined;
  return {
    id,
    name: data.title,
    location: data.location,
    team: (data.collaborators || []).map((c) => {
      const url = (c?.photoUrl || '').trim();
      if (url) return url;
      const nm = (c?.name || '').trim();
      return nm ? nm.charAt(0).toUpperCase() : '';
    }),
    lastUpdatedTime: fmtAgo(data.updatedAt || data.createdAt),
    lastUpdatedTs: updatedMs,
    assignedTo: owner?.name || 'Owner',
    deadlineDate: fmtDate(data.deadline),
    progress: toPercent(data.progress),
    status: mapStatus(data.status),
    clientName: data.clientName,
    projectOwner: owner?.name,
    deadline: fmtDate(data.deadline),
    members: data.collaborators?.length || 0,
    raw: data,
  };
}

export function subscribeMyProjects(uid: string, cb: (items: ProjectCardUI[]) => void) {
  const col = collection(db, 'projects');
  const qOwner = query(col, where('ownerId', '==', uid));

  // optional collaborator query if index field exists
  const qCollab = query(col, where('collaboratorUids', 'array-contains', uid));

  const results = new Map<string, ProjectCardUI>();

  const emit = () => cb(Array.from(results.values()));

  const unsubOwner = onSnapshot(qOwner, (snap) => {
    snap.docChanges().forEach((ch) => {
      const id = ch.doc.id;
      if (ch.type === 'removed') {
        results.delete(id);
      } else {
        const data = ch.doc.data() as any as ProjectDoc;
        results.set(id, mapDocToCard(id, data));
      }
    });
    emit();
  });

  const unsubCollab = onSnapshot(qCollab, (snap) => {
    snap.docChanges().forEach((ch) => {
      const id = ch.doc.id;
      if (ch.type === 'removed') {
        results.delete(id);
      } else {
        const data = ch.doc.data() as any as ProjectDoc;
        results.set(id, mapDocToCard(id, data));
      }
    });
    emit();
  });

  return () => {
    unsubOwner();
    unsubCollab();
  };
}

function isVisibleToUser(data: ProjectDoc, uid: string, email?: string | null) {
  if (!data) return false;
  if (data.ownerId === uid) return true;
  const list = Array.isArray(data.collaborators) ? data.collaborators : [];
  return list.some((c) => c?.uid === uid || (!!email && c?.email?.toLowerCase?.() === (email || '').toLowerCase()));
}

// Fallback subscriber that scans all projects and filters by membership
export function subscribeProjectsForUser(uid: string, email: string | null | undefined, cb: (items: ProjectCardUI[]) => void) {
  const col = collection(db, 'projects');
  const unsub = onSnapshot(col, (snap) => {
    const items: ProjectCardUI[] = [];
    snap.forEach((doc) => {
      const data = doc.data() as any as ProjectDoc;
      if (isVisibleToUser(data, uid, email)) {
        items.push(mapDocToCard(doc.id, data));
      }
    });
    cb(items);
  });
  return () => unsub();
}

export function subscribeAllProjects(cb: (items: ProjectCardUI[]) => void) {
  const col = collection(db, 'projects');
  const unsub = onSnapshot(col, (snap) => {
    const items: ProjectCardUI[] = [];
    snap.forEach((doc) => {
      const data = doc.data() as any as ProjectDoc;
      items.push(mapDocToCard(doc.id, data));
    });
    cb(items);
  });
  return () => unsub();
}

export async function getProject(id: string) {
  const ref = doc(db, 'projects', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any as ProjectDoc) };
}

// Update a project's status in Firestore and bump updatedAt
export async function updateProjectStatus(id: string, status: 'in-progress' | 'completed' | 'cancelled') {
  await ensureCanModifyProject(id);
  const ref = doc(db, 'projects', id);
  const payload = {
    status: toDocStatus(status),
    updatedAt: serverTimestamp() as any,
  } as Partial<ProjectDoc> as any;
  await updateDoc(ref, payload);
}

export async function createProject(input: {
  title: string;
  clientName: string;
  location: string;
  deadline?: string;
  members?: string[]; // emails for now
  viewAccess?: boolean;
  editAccess?: boolean;
}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const owner: Collaborator = {
    uid: user.uid,
    email: user.email || '',
    name: user.displayName || 'Owner',
    photoUrl: user.photoURL || '',
    role: 'Project Owner',
    canEdit: true,
  };

  let deadlineTs: Timestamp | undefined;
  try {
    if (input.deadline) {
      const dt = new Date(input.deadline);
      if (!isNaN(dt.getTime())) {
        // Convert JS Date to Firestore Timestamp
        deadlineTs = Timestamp.fromDate(dt);
      }
    }
  } catch {}

  const emails = Array.isArray(input.members) ? input.members : [];
  const normalizedEmails = Array.from(new Set(emails.map((e)=> (e||'').toString().trim().toLowerCase()).filter(Boolean)));
  const canEditFlag = !!input.editAccess;
  const collaboratorEntries: Collaborator[] = normalizedEmails.map((email)=>({ uid:'', email, name: email.includes('@')? email.split('@')[0]: email, photoUrl:'', role: canEditFlag ? 'edit':'view', canEdit: canEditFlag }));

  const payload: Partial<ProjectDoc> & { collaboratorUids: string[] } = {
    title: input.title,
    clientName: input.clientName,
    location: input.location,
    ownerId: user.uid,
    collaborators: [owner, ...collaboratorEntries],
    files: [],
    createdAt: serverTimestamp() as any,
    updatedAt: serverTimestamp() as any,
    deadline: deadlineTs as any,
    status: 'In progress',
    progress: 0,
    collaboratorUids: [user.uid],
  };

  const col = collection(db, 'projects');
  const res = await addDoc(col, payload as any);
  // Initialize group chat metadata with owner
  try {
    const { ensureChatMetadata } = await import('@/lib/chat');
    await ensureChatMetadata(res.id, { members: [user.uid], memberEmails: [user.email || ''], creatorId: user.uid });
  } catch {}
    // Best-effort invites for provided emails
  try {
    const { sendProjectInvite } = await import('@/lib/invitations');
    await Promise.allSettled(
      normalizedEmails.map((email) =>
        sendProjectInvite({
          projectId: res.id,
          projectTitle: input.title,
          invitedEmail: email,
          role: canEditFlag ? 'Editor' : 'Viewer',
          accessLevel: canEditFlag ? 'edit' : 'view',
        })
      )
    );
  } catch {}  return res.id;
}

// Update project fields from edit form
export async function updateProject(
  id: string,
  input: {
    title?: string;
    clientName?: string;
    location?: string;
    deadline?: string; // ISO or readable date string
    members?: string[]; // emails for now
    viewAccess?: boolean;
    editAccess?: boolean;
  }
) {
  await ensureCanModifyProject(id);
  const ref = doc(db, 'projects', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Project not found');

  const data = snap.data() as any as ProjectDoc;

  const payload: Partial<ProjectDoc> = {} as any;
  if (typeof input.title === 'string' && input.title.trim()) payload.title = input.title.trim();
  if (typeof input.clientName === 'string') payload.clientName = input.clientName.trim();
  if (typeof input.location === 'string') payload.location = input.location.trim();

  // Parse deadline if provided
  if (typeof input.deadline === 'string' && input.deadline.trim()) {
    try {
      const d = new Date(input.deadline);
      if (!isNaN(d.getTime())) payload.deadline = Timestamp.fromDate(d) as any;
    } catch {
      // ignore invalid deadline values
    }
  }

  // Merge collaborators if members provided
  if (Array.isArray(input.members) && input.members.length) {
    const existing = Array.isArray(data.collaborators) ? [...data.collaborators] : [];

    const existingEmails = new Set(
      existing.map((c) => (c?.email || '').toLowerCase()).filter(Boolean)
    );

    // Preserve owner
    const owner = existing.find(
      (c) => c?.uid === data.ownerId || (c?.role || '').toLowerCase().includes('owner')
    );

    const canEdit = !!input.editAccess;
    const roleVal = canEdit ? 'edit' : 'view';

    const newEntries = (input.members || [])
      .map((m) => (m || '').trim())
      .filter(Boolean)
      .filter((m, idx, arr) => arr.indexOf(m) === idx)
      .map((email) => ({ email, key: email.toLowerCase() }))
      .filter(({ key }) => !existingEmails.has(key))
      .map(({ email }) => ({
        uid: '',
        email,
        name: email.includes('@') ? email.split('@')[0] : email,
        photoUrl: '',
        role: roleVal,
        canEdit,
      } as Collaborator));

    const merged = [
      // Keep owner at front if present
      ...(owner ? [owner] : []),
      // Include others from existing excluding duplicate owner
      ...existing.filter((c) => (owner ? c !== owner : true)),
      // Append new entries
      ...newEntries,
    ];

    // Optionally update roles for existing (non-owner) collaborators when toggles are set
    payload.collaborators = merged.map((c) => {
      if (c?.uid === data.ownerId || (c?.role || '').toLowerCase().includes('owner')) return c;
      // Keep explicit canEdit/role in sync for consistency
      if (typeof input.editAccess === 'boolean' || typeof input.viewAccess === 'boolean') {
        const nextCanEdit = !!input.editAccess;
        return { ...c, canEdit: nextCanEdit, role: nextCanEdit ? 'edit' : 'view' } as any;
      }
      return c;
    });
  }

  // If no new members provided but access toggles are set, normalize roles for existing collaborators
  if ((!input.members || input.members.length === 0) && (typeof input.editAccess === 'boolean' || typeof input.viewAccess === 'boolean')) {
    const existing = Array.isArray(data.collaborators) ? [...data.collaborators] : [];
    const nextCanEdit = !!input.editAccess;
    const updated = existing.map((c) => {
      if (c?.uid === data.ownerId || (c?.role || '').toLowerCase().includes('owner')) return c as any;
      return { ...c, canEdit: nextCanEdit, role: nextCanEdit ? 'edit' : 'view' } as any;
    });
    (payload as any).collaborators = updated as any;
  }

  (payload as any).updatedAt = serverTimestamp() as any;

  await updateDoc(ref, payload as any);
}

// Delete a project document. Only the owner is allowed per security rules.
export async function deleteProject(id: string) {
  await ensureCanModifyProject(id);
  const ref = doc(db, 'projects', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Project not found');
  await deleteDoc(ref);
}

// Remove a collaborator from a project by uid or email
export async function removeProjectMember(
  projectId: string,
  target: { uid?: string; email?: string }
) {
  if (!projectId) throw new Error('Missing projectId');
  if (!target?.uid && !target?.email) throw new Error('Missing member identifier');

  await ensureCanModifyProject(projectId);
  const ref = doc(db, 'projects', projectId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Project not found');

  const data = snap.data() as any as ProjectDoc;
  const list: Collaborator[] = Array.isArray(data.collaborators) ? [...data.collaborators] : [];

  const keyEmail = (target.email || '').toLowerCase();
  const idx = list.findIndex((c) => {
    if (!c) return false;
    if (target.uid && c.uid && c.uid === target.uid) return true;
    if (keyEmail) return (c.email || '').toLowerCase() === keyEmail;
    return false;
  });

  if (idx < 0) {
    // Nothing to remove; treat as success for idempotency
    return;
  }

  // Prevent removing owner
  const candidate = list[idx];
  const isOwner = candidate?.uid && candidate.uid === data.ownerId;
  const roleIsOwner = (candidate?.role || '').toLowerCase().includes('owner');
  if (isOwner || roleIsOwner) {
    const err: any = new Error('Cannot remove project owner');
    err.code = 'invalid-operation';
    throw err;
  }

  // Remove collaborator and update index field
  const updated = [...list.slice(0, idx), ...list.slice(idx + 1)];
  const uidIndex = updated
    .map((c) => (c?.uid || '').trim())
    .filter((u) => !!u);

  await updateDoc(ref, {
    collaborators: updated as any,
    collaboratorUids: uidIndex as any,
    updatedAt: serverTimestamp() as any,
  } as Partial<ProjectDoc> as any);
}




// Add a single collaborator with access level
export async function addProjectMember(
  projectId: string,
  member: { email: string; name?: string; canEdit?: boolean; role?: string }
): Promise<void> {
  await ensureCanModifyProject(projectId);
  const ref = doc(db, 'projects', projectId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Project not found');

  const data = snap.data() as any as ProjectDoc;
  const list: Collaborator[] = Array.isArray(data.collaborators) ? [...data.collaborators] : [];
  const emailKey = (member.email || '').trim().toLowerCase();
  if (!emailKey) throw new Error('Missing member email');
  const exists = list.some((c) => (c?.email || '').toLowerCase() === emailKey);
  if (exists) return;

  const entry: Collaborator = {
    uid: '',
    email: emailKey,
    name: (member.name || (emailKey.includes('@') ? emailKey.split('@')[0] : emailKey)).trim(),
    photoUrl: '',
    role: member.canEdit ? 'edit' : (member.role || 'view'),
    canEdit: !!member.canEdit,
  };

  const updated = [...list, entry];
  await updateDoc(ref, {
    collaborators: updated as any,
    updatedAt: serverTimestamp() as any,
  } as Partial<ProjectDoc> as any);
}
