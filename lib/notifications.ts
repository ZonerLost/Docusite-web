import { db, auth, debugFirebaseConfig } from '@/lib/firebase-client';
import {
  Timestamp,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  getDoc,
  getDocs,
  limit,
  writeBatch,
  serverTimestamp,
  setDoc,
  arrayUnion,
  deleteDoc,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { acceptProjectInvite, declineProjectInvite } from '@/lib/invitations';

export type NotificationDoc = {
  inviteId?: string;
  projectId?: string;
  uploaderId?: string;
  subTitle: string;
  time: Timestamp;
  title: string;
  type: string; // e.g. 'project_invite'
  unread: boolean;
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
};

function timeAgo(ts?: Timestamp): string {
  if (!ts) return '';
  try {
    const ms = ts.toDate().getTime();
    const diff = Date.now() - ms;
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m} min${m > 1 ? 's' : ''} ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`;
    const d = Math.floor(h / 24);
    return `${d} day${d > 1 ? 's' : ''} ago`;
  } catch {
    return '';
  }
}

function normalizeEmail(email: string | null | undefined): string | null {
  if (typeof email !== 'string') return null;
  const v = email.trim();
  return v ? v.toLowerCase() : null;
}

const DEBUG_NOTIF = process.env.NEXT_PUBLIC_DEBUG_NOTIFICATIONS === '1';
function d(tag: string, payload?: unknown) {
  if (!DEBUG_NOTIF) return;
  try { console.debug(`[notifications:debug] ${tag}`, payload ?? ''); } catch {}
}

async function probeNotificationsPath(key: string) {
  if (!DEBUG_NOTIF) return;
  try {
    debugFirebaseConfig?.();
  } catch {}
  try {
    const token = await auth.currentUser?.getIdTokenResult?.(true);
    d('auth', {
      uid: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      tokenEmail: (token?.claims as any)?.email,
    });
  } catch (e) {
    console.warn('[notifications:debug] tokenError', e);
  }
  try {
    const rootRef = doc(db, 'notifications', key);
    const rootSnap = await getDoc(rootRef);
    d('probe:rootDoc', { key, exists: rootSnap.exists() });
  } catch (e: any) {
    console.warn('[notifications:debug] probe:rootDoc:error', { key, code: e?.code, message: e?.message });
  }
  try {
    const itemsRef = collection(doc(db, 'notifications', key), 'items');
    const qs = await getDocs(query(itemsRef, orderBy('time', 'desc'), limit(1)));
    d('probe:items', { key, size: qs.size });
  } catch (e: any) {
    console.warn('[notifications:debug] probe:items:error', { key, code: e?.code, message: e?.message });
  }
}

export function subscribeUserNotifications(email: string, cb: (items: NotificationUI[]) => void) {
  let snapUnsub: (() => void) | null = null;
  let authUnsub: (() => void) | null = null;

  const desiredKey = normalizeEmail(email);
  if (!desiredKey) {
    console.warn('[notifications:subscribe] Missing or invalid email', { email });
    return () => {};
  }

  const attach = async () => {
    // Clean up prior snapshot
    if (snapUnsub) { try { snapUnsub(); } catch {} snapUnsub = null; }

    const user = auth.currentUser;
    const claimEmail = normalizeEmail(user?.email);
    // Allow match via token email OR simply presence of uid (fallback uses /users/{uid}.email)
    const okKeyMatch = !!user && (desiredKey === claimEmail || !!user.uid);
    if (!okKeyMatch) return;

    d('subscribe:init', { key: desiredKey });
    // Optional probe for diagnostics only
    probeNotificationsPath(desiredKey);

    try {
      const root = doc(db, 'notifications', desiredKey);
      const itemsCol = collection(root, 'items');
      const q = query(itemsCol, orderBy('time', 'desc'));
      snapUnsub = onSnapshot(
        q,
        (snap) => {
          try {
            d('subscribe:snapshot', { key: desiredKey, size: snap.size });
            const out: NotificationUI[] = [];
            const seenInviteIds = new Set<string>();

            snap.forEach((d) => {
              try {
                const data = d.data() as NotificationDoc;

                // Auto-delete notifications that are unread === false (existing behavior)
                if (data?.unread === false) {
                  deleteDoc(d.ref).catch((e) => {
                    console.warn('[notifications:auto-delete]', { id: d.id, code: (e as any)?.code });
                  });
                  return;
                }

                // De-dupe project_invite notifications by inviteId (fallback to doc id)
                if (data.type === 'project_invite') {
                  const key = (data.inviteId && data.inviteId.trim()) ? data.inviteId.trim() : d.id;
                  if (seenInviteIds.has(key)) return;
                  seenInviteIds.add(key);
                }

                out.push({
                  id: d.id,
                  title: data.title,
                  description: data.subTitle,
                  timeText: timeAgo(data.time),
                  isUnread: !!data.unread,
                  type: data.type,
                  inviteId: data.inviteId,
                  projectId: data.projectId,
                });
              } catch (e) {
                console.error('[notifications:subscribe:parseDoc]', { key: desiredKey, docId: d.id }, e);
              }
            });

            d('subscribe:dispatch', { key: desiredKey, count: out.length });
            cb(out);
          } catch (e) {
            console.error('[notifications:subscribe:parseSnapshot]', { key: desiredKey }, e);
          }
        },
        (error) => {
          console.error('[notifications:subscribe:onSnapshot]', { key: desiredKey }, error);
        }
      );
    } catch (e) {
      console.error('[notifications:subscribe:init]', { key: desiredKey }, e);
    }
  };

  // Attach immediately if auth ready
  if (auth.currentUser) {
    attach();
  }
  // Also listen for auth changes
  authUnsub = onAuthStateChanged(auth, () => { attach(); });

  return () => {
    if (snapUnsub) { try { snapUnsub(); } catch {} }
    if (authUnsub) { try { authUnsub(); } catch {} }
  };
}


// REPLACE your markNotificationRead with this:
export async function markNotificationRead(email: string, id: string) {
  const key = normalizeEmail(email);
  if (!key || !id) {
    console.warn('[notifications:markRead] Missing key or id', { email, id });
    return;
  }
  d('markRead', { key, id });
  const itemRef = doc(collection(doc(db, 'notifications', key), 'items'), id);
  try {
    // Delete the notification document on click/read
    await deleteDoc(itemRef);
  } catch (e) {
    console.error('[notifications:markRead:updateFailed]', { key, id }, e);
    throw e as any;
  }
}

export async function markAllNotificationsRead(email: string) {
  // For efficiency, callers should batch; here we subscribe and update sequentially
  const key = normalizeEmail(email);
  if (!key) {
    console.warn('[notifications:markAllRead] Missing key', { email });
    return;
  }
  const root = doc(db, 'notifications', key);
  const itemsCol = collection(root, 'items');
  return new Promise<void>((resolve) => {
    const unsub = onSnapshot(itemsCol, async (snap) => {
      unsub();
      try {
        d('markAllRead:snapshot', { key, size: snap.size });
        const results = await Promise.allSettled(
          snap.docs.map((d) => updateDoc(d.ref, { unread: false }))
        );
        results.forEach((r, idx) => {
          if (r.status === 'rejected') {
            const d = snap.docs[idx];
            console.error('[notifications:markAllRead:updateFailed]', { key, docId: d.id, reason: r.reason });
          }
        });
      } catch (e) {
        console.error('[notifications:markAllRead:batchFailed]', { key }, e);
      }
      resolve();
    });
  });
}

// export type InviteSummary = {
//   projectTitle?: string;
//   invitedByName?: string;
//   invitedByEmail?: string;
//   projectId?: string;
// };


export type InviteSummary = {
  projectTitle?: string;
  invitedByName?: string;
  invitedByEmail?: string;
  projectId?: string;
  status?: 'pending' | 'accepted' | 'declined' | 'expired';
  invitedAt?: Timestamp;
  respondedAt?: Timestamp;
  accessLevel?: string;
  role?: string;
};

/**
 * Read a pending invite for the given email+inviteId.
 * Source: /pending_requests/{email}/requests/{inviteId}
 */
// export async function getInviteSummary(invitedEmail: string, inviteId: string): Promise<InviteSummary | null> {
//   try {
//     const key = normalizeEmail(invitedEmail);
//     if (!key || !inviteId) return null;
//     const ref = doc(collection(doc(db, 'pending_requests', key), 'requests'), inviteId);
//     const snap = await getDoc(ref);
//     if (!snap.exists()) return null;
//     const data = snap.data() as any;
//     return {
//       projectTitle: data?.projectTitle,
//       invitedByName: data?.invitedByName || data?.invitedBy,
//       invitedByEmail: data?.invitedByEmail,
//       projectId: data?.projectId,
//     };
//   } catch (e) {
//     console.warn('[notifications:getInviteSummary] failed', { invitedEmail, inviteId }, e);
//     return null;
//   }
// } 

export async function getInviteSummary(
  invitedEmail: string,
  inviteId: string,
  opts: { pendingOnly?: boolean } = { pendingOnly: true }
): Promise<InviteSummary | null> {
  try {
    const key = normalizeEmail(invitedEmail);
    if (!key || !inviteId) return null;

    const ref = doc(collection(doc(db, 'pending_requests', key), 'requests'), inviteId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const data = snap.data() as any;
    const status = String(data?.status || 'pending').toLowerCase() as InviteSummary['status'];

    // If you only want "pending" invites in the UI, drop everything else here
    if (opts.pendingOnly && status !== 'pending') return null;

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
    console.warn('[notifications:getInviteSummary] failed', { invitedEmail, inviteId }, e);
    return null;
  }
}


/**
 * Accept an invite from a notification and mark it as read.
 */
export async function acceptInviteNotification(invitedEmail: string, inviteId: string, notificationId?: string) {
  try {
    await acceptProjectInvite(invitedEmail, inviteId);
  } catch (e) {
    console.error('[notifications:acceptInvite] failed', { invitedEmail, inviteId }, e);
    throw e;
  }
  try {
    if (notificationId) await markNotificationRead(invitedEmail, notificationId);
  } catch (e) {
    console.warn('[notifications:acceptInvite] mark read failed', { invitedEmail, notificationId }, e);
  }
}

/**
 * Decline an invite from a notification and mark it as read.
 */
export async function declineInviteNotification(invitedEmail: string, inviteId: string, notificationId?: string) {
  try {
    await declineProjectInvite(invitedEmail, inviteId);
  } catch (e) {
    console.error('[notifications:declineInvite] failed', { invitedEmail, inviteId }, e);
    throw e;
  }
  try {
    if (notificationId) await markNotificationRead(invitedEmail, notificationId);
  } catch (e) {
    console.warn('[notifications:declineInvite] mark read failed', { invitedEmail, notificationId }, e);
  }
}

/**
 * Accept an invite and add current user to project members in a single batch.
 * Steps:
 *  1) Mark the notification as read (if notificationId provided)
 *  2) Update invite status -> accepted + respondedAt
 *  3) Create member doc under projects/{projectId}/members/{uid} if not already exists
 */
export async function acceptInviteAndJoinProject(params: { invitedEmail: string; inviteId: string; notificationId?: string }): Promise<'accepted' | 'already-member'> {
  const { invitedEmail, inviteId, notificationId } = params;
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const key = normalizeEmail(invitedEmail);
  if (!key) throw new Error('Invalid or expired invitation.');

  // Load invite details first
  const inviteRef = doc(collection(doc(db, 'pending_requests', key), 'requests'), inviteId);
  const inviteSnap = await getDoc(inviteRef);
  if (!inviteSnap.exists()) throw new Error('Invalid or expired invitation.');

  const inv = inviteSnap.data() as any;
  const projectId: string = (inv?.projectId || '').trim();
  if (!projectId) throw new Error('Invalid or expired invitation.');

  const memberRef = doc(db, 'projects', projectId, 'members', user.uid);
  const memberSnap = await getDoc(memberRef);
  const alreadyMember = memberSnap.exists();

  const batch = writeBatch(db);

  // 1) Mark notification read
  if (notificationId) {
    const notifRef = doc(collection(doc(db, 'notifications', key), 'items'), notificationId);
    batch.update(notifRef, { unread: false });
  }

  // 2) Update invite status
  batch.update(inviteRef, { status: 'accepted', respondedAt: serverTimestamp() as any });

  // 3) Create member doc if not already
  if (!alreadyMember) {
    const name = user.displayName || inv?.invitedUserName || (key.includes('@') ? key.split('@')[0] : key);
    const role = (inv?.role || 'Member').toString();
    const accessLevel = (inv?.accessLevel || 'view').toString();
    const payload = {
      uid: user.uid,
      email: user.email || key,
      name,
      role,
      accessLevel,
      joinedAt: serverTimestamp() as any,
    } as const;
    batch.set(memberRef, payload);
  }

  await batch.commit();
  return alreadyMember ? 'already-member' : 'accepted';
}

// Idempotency guards for accepting invites from notifications
const ACCEPTING_INVITES = new Map<string, Promise<'accepted' | 'already-member'>>();
const RECENT_ACCEPTS = new Map<string, { result: 'accepted' | 'already-member'; timer: ReturnType<typeof setTimeout> }>();

/**
 * Accept invite directly from a notification by updating:
 *  - projects/{projectId} => members: arrayUnion({ userId, email, role: 'member', joinedAt })
 *  - notifications/{email}/items/{notificationId} => { status: 'accepted', read: true, acceptedAt, unread: false }
 * Does not touch other collections.
//  */


export async function acceptInviteFromNotification(params: { email: string; notificationId: string }): Promise<'accepted' | 'already-member'> {
  const { email, notificationId } = params;
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const key = normalizeEmail(email);
  if (!key || !notificationId) throw new Error('Invalid or expired invitation.');

  const lockKey = `${key}::${notificationId}`;
  const recent = RECENT_ACCEPTS.get(lockKey);
  if (recent) return Promise.resolve(recent.result);
  const inflight = ACCEPTING_INVITES.get(lockKey);
  if (inflight) return inflight;

  const run = async (): Promise<'accepted' | 'already-member'> => {
    // Try to load notification; fall back to invite doc if missing
    const notifRef = doc(collection(doc(db, 'notifications', key), 'items'), notificationId);
    const notifSnap = await getDoc(notifRef);
    const ndata = notifSnap.exists() ? (notifSnap.data() as any) : null;
    let inviteId: string | undefined = typeof ndata?.inviteId === 'string' && ndata.inviteId.trim() ? ndata.inviteId.trim() : undefined;
    if (!inviteId) inviteId = notificationId; // notification id is equal to invite id in our system
    let projectId: string | undefined = (ndata?.projectId || '').toString().trim() || undefined;

    // Fallback: derive projectId from invite doc if missing
    let invSnap: any | null = null;
    if ((!projectId || !projectId.trim()) && inviteId) {
      try {
        const invRef = doc(collection(doc(db, 'pending_requests', key), 'requests'), inviteId);
        invSnap = await getDoc(invRef);
        if (invSnap.exists()) {
          const inv = invSnap.data() as any;
          const pid = (inv?.projectId || '').toString().trim();
          if (pid) projectId = pid;
        }
      } catch { /* ignore */ }
    }

    if (!projectId) throw new Error('Invalid or expired invitation.');

    // Validate project and membership
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);
    if (!projectSnap.exists()) throw new Error('Invalid or expired invitation.');
    const pdata = projectSnap.data() as any;
    const collaboratorsArr: any[] = Array.isArray(pdata?.collaborators) ? pdata.collaborators : [];
    const alreadyMember = collaboratorsArr.some((c) => c && (c.uid === user.uid || (c.email || '').toLowerCase() === (user.email || '').toLowerCase()));

    // Inspect invite status when available
    let inviteStatus: string | undefined;
    if (!invSnap && inviteId) {
      try {
        const ref = doc(collection(doc(db, 'pending_requests', key), 'requests'), inviteId);
        invSnap = await getDoc(ref);
      } catch { /* ignore */ }
    }
    if (invSnap && invSnap.exists?.()) {
      try { inviteStatus = (invSnap.data()?.status || '').toString().toLowerCase(); } catch { /* ignore */ }
      // Declined invites are treated as expired
      if (inviteStatus === 'declined') throw new Error('Invalid or expired invitation.');
    }

    const batch = writeBatch(db);

    // Update notification when present
    if (notifSnap.exists()) {
      batch.update(notifRef, { status: 'accepted', unread: false });
    }

    // Update invite status to accepted if pending
    if (inviteId) {
      try {
        const inviteRef = doc(collection(doc(db, 'pending_requests', key), 'requests'), inviteId);
        if (invSnap && invSnap.exists?.()) {
          if (inviteStatus !== 'accepted') batch.update(inviteRef, { status: 'accepted', respondedAt: serverTimestamp() as any });
        } else {
          // If we couldn't read it earlier, best-effort update
          batch.update(inviteRef, { status: 'accepted', respondedAt: serverTimestamp() as any });
        }
      } catch { /* ignore missing */ }
    }

    let result: 'accepted' | 'already-member' = alreadyMember ? 'already-member' : 'accepted';

    // Add to project collaborators if not yet a member
    if (!alreadyMember) {
      // Try to derive role/canEdit from invite doc if present
      let role = 'Member';
      let canEdit = false;
      if (invSnap && invSnap.exists?.()) {
        try {
          const inv = invSnap.data() as any;
          if (typeof inv?.role === 'string' && inv.role.trim()) role = inv.role.trim();
          canEdit = (inv?.accessLevel || '').toString().toLowerCase() === 'edit';
        } catch { /* ignore */ }
      }

      const newCollab = {
        uid: user.uid,
        email: user.email || key,
        name: user.displayName || (user.email ? user.email.split('@')[0] : (key || '').split('@')[0] || 'Member'),
        photoUrl: user.photoURL || '',
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
    return result;
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
      const t = setTimeout(() => { try { RECENT_ACCEPTS.delete(lockKey); } catch {} }, 1500);
      RECENT_ACCEPTS.set(lockKey, { result: res, timer: t });
    } catch { /* noop */ }
  }).catch(() => { /* ignore */ });
  return p;
}


export async function debugNotificationAccess(email: string) {
  const key = normalizeEmail(email);
  if (!key) return { error: 'Invalid email' } as const;
  try {
    const rootRef = doc(db, 'notifications', key);
    const rootSnap = await getDoc(rootRef);
    const itemsRef = collection(rootRef, 'items');
    const itemsSnap = await getDocs(query(itemsRef, limit(5)));
    return {
      rootExists: rootSnap.exists(),
      itemsCount: itemsSnap.size,
      items: itemsSnap.docs.map(d => ({ id: d.id, data: d.data() })),
    } as const;
  } catch (error: any) {
    return { error: error?.message || 'Unknown error', code: error?.code } as const;
  }
}
