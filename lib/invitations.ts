import { auth, db } from '@/lib/firebase-client';
import { checkProjectPermission } from '@/lib/permissions';
import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { normalizeEmail } from '@/lib/notifications';

// In-memory idempotency guards for duplicate front-end calls
// - INFLIGHT prevents concurrent duplicates during the same tick/action
// - RECENT prevents immediate re-triggers right after completion (e.g., double clicks, rapid re-renders)
const INFLIGHT_INVITES = new Map<string, Promise<{ id: string }>>();
const RECENT_INVITES = new Map<string, { result: { id: string }; timer: ReturnType<typeof setTimeout> }>();

type SendInviteInput = {
  projectId: string;
  projectTitle: string;
  invitedEmail: string;
  invitedUserName?: string;
  role: string;
  accessLevel?: 'view' | 'edit';
};

export async function sendProjectInvite(input: SendInviteInput): Promise<{ id: string }>{
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const projectId = (input.projectId || '').trim();
  const projectTitle = (input.projectTitle || '').trim();
  const invitedEmail = normalizeEmail(input.invitedEmail);
  const invitedUserName = (input.invitedUserName || '').trim() || (invitedEmail.includes('@') ? invitedEmail.split('@')[0] : invitedEmail);
  const role = (input.role || '').trim() || 'Member';
  const accessLevel = input.accessLevel === 'edit' ? 'edit' : 'view';

  if (!projectId) throw new Error('Missing projectId');
  if (!projectTitle) throw new Error('Missing projectTitle');
  if (!invitedEmail) throw new Error('Missing invitedEmail');

  // Permission: inviter must be a member/owner of the project
  const allowed = await checkProjectPermission(projectId);
  if (!allowed) {
    const err: any = new Error('permission-denied');
    err.code = 'permission-denied';
    throw err;
  }

  // Build a stable key for this invite attempt to prevent duplicates
  const lockKey = `${projectId}::${invitedEmail}::${role}::${accessLevel}`;
  // Serve recent result if the same action was just completed
  const recent = RECENT_INVITES.get(lockKey);
  if (recent) {
    try { console.warn('[invitations] Duplicate invite attempt ignored (recent).'); } catch {}
    return Promise.resolve(recent.result);
  }
  const existing = INFLIGHT_INVITES.get(lockKey);
  if (existing) {
    try { console.warn('[invitations] Duplicate invite attempt ignored (in-flight).'); } catch {}
    return existing; // Return the same promise result for idempotency
  }

  const run = async (): Promise<{ id: string }> => {
    // Prepare meta doc for invited email
    const metaRef = doc(db, 'pending_requests', invitedEmail);
    const metaSnap = await getDoc(metaRef);

    // Create invite doc under /pending_requests/{invitedEmail}/requests/{inviteId}
    const requestsCol = collection(metaRef, 'requests');
    const inviteRef = doc(requestsCol);

    const payload = {
      id: inviteRef.id,
      accessLevel,
      invitedAt: serverTimestamp() as any,
      invitedBy: user.uid,
      invitedByEmail: user.email || '',
      invitedByName: user.displayName || '',
      invitedEmail,
      invitedUserName,
      projectId,
      projectTitle,
      role,
      status: 'pending',
    } as const;

    await setDoc(inviteRef, payload);

    // Maintain metadata doc timestamps
    if (!metaSnap.exists()) {
      await setDoc(metaRef, {
        createdAt: serverTimestamp() as any,
        lastUpdated: serverTimestamp() as any,
      });
    } else {
      await updateDoc(metaRef, { lastUpdated: serverTimestamp() as any });
    }

    // ✅ Ensure notifications root exists for recipient (helps rules & listeners)
    try {
      const notifRootRef = doc(db, 'notifications', invitedEmail);
      await setDoc(
        notifRootRef,
        {
          ownerEmail: invitedEmail,
          lastUpdated: serverTimestamp() as any,
        },
        { merge: true }
      );
    } catch (e) {
      try { console.warn('[invitations] failed to ensure notifications root doc', e); } catch {}
    }

    // Create the actual notification item
    try {
      const inviterName = payload.invitedByName || user.displayName || user.email || 'Someone';
      const notifDoc = doc(collection(doc(db, 'notifications', invitedEmail), 'items'), inviteRef.id);
      await setDoc(notifDoc, {
        inviteId: inviteRef.id,
        projectId,
        subTitle: `${inviterName} is inviting you to collaborate in "${projectTitle}" as ${role}. Tap to view.`,
        time: serverTimestamp() as any,
        title: 'New Project Invitation',
        type: 'project_invite',
        unread: true,
      });
    } catch (e) {
      // Do not fail the invite flow on notification failure; log for diagnostics
      try { console.error('[invitations] failed to create notification', e); } catch {}
    }

    const result = { id: inviteRef.id } as const;
    // Cache as recent for a short window to avoid double triggers post-completion
    try {
      const timer = setTimeout(() => {
        try { RECENT_INVITES.delete(lockKey); } catch {}
      }, 1500);
      RECENT_INVITES.set(lockKey, { result, timer });
    } catch { /* noop */ }
    return result;
  };

  const p = (async () => {
    try {
      return await run();
    } finally {
      INFLIGHT_INVITES.delete(lockKey);
    }
  })();
  INFLIGHT_INVITES.set(lockKey, p);
  return p;
}


export async function acceptProjectInvite(invitedEmail: string, inviteId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const emailKey = normalizeEmail(invitedEmail);
  if (!emailKey) throw new Error('Invalid invite email');
  const metaRef = doc(db, 'pending_requests', emailKey);
  const inviteRef = doc(collection(metaRef, 'requests'), inviteId);

  const snap = await getDoc(inviteRef);
  if (!snap.exists()) throw new Error('Invite not found');
  const data = snap.data() as any;

  const projectId: string = (data?.projectId || '').trim();
  if (!projectId) throw new Error('Invalid invite: missing projectId');

  // Add user to project members subcollection using members collection structure
  const memberRef = doc(db, 'projects', projectId, 'members', user.uid);

  const memberDoc = {
    userId: user.uid,
    userName:
      user.displayName ||
      data?.invitedUserName ||
      (emailKey.includes('@') ? emailKey.split('@')[0] : emailKey),
    userEmail: user.email || emailKey,
    role: (data?.role || 'Member').toString(),
    accessLevel: (data?.accessLevel || 'view').toString(),
    joinedAt: serverTimestamp() as any,
  } as const;

  const batch = writeBatch(db);
  batch.set(memberRef, memberDoc);
  batch.update(inviteRef, { status: 'accepted', respondedAt: serverTimestamp() as any });
  batch.set(metaRef, { lastUpdated: serverTimestamp() as any }, { merge: true });
  await batch.commit();
}

export async function declineProjectInvite(invitedEmail: string, inviteId: string): Promise<void> {
  const emailKey = normalizeEmail(invitedEmail);
  if (!emailKey) throw new Error('Invalid invite email');
  const metaRef = doc(db, 'pending_requests', emailKey);
  const inviteRef = doc(collection(metaRef, 'requests'), inviteId);

  const snap = await getDoc(inviteRef);
  if (!snap.exists()) throw new Error('Invite not found');

  const batch = writeBatch(db);
  batch.update(inviteRef, { status: 'declined', respondedAt: serverTimestamp() as any });
  batch.set(metaRef, { lastUpdated: serverTimestamp() as any }, { merge: true });
  await batch.commit();
}
