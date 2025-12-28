import { performance } from 'node:perf_hooks';
import { NextResponse } from 'next/server';
import { admin, adminAuth, adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

const DEBUG_TIMINGS = process.env.NEXT_PUBLIC_DEBUG_INVITES === '1';

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

function toString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalizeEmailKey(value: unknown): string {
  return toString(value).trim().toLowerCase();
}

function readBearerToken(req: Request): string | null {
  const header =
    req.headers.get('authorization') ||
    req.headers.get('Authorization') ||
    req.headers.get('x-firebase-auth') ||
    req.headers.get('x-id-token') ||
    req.headers.get('x-auth-token');
  if (!header) return null;
  const trimmed = header.trim();
  const match = /^Bearer\s+(.+)$/i.exec(trimmed);
  return (match ? match[1] : trimmed) || null;
}

function getOwnerUid(data: any): string {
  const value =
    data?.ownerUid ||
    data?.ownerId ||
    data?.createdByUid ||
    (typeof data?.createdBy === 'string' ? data.createdBy : data?.createdBy?.uid) ||
    data?.owner?.uid ||
    '';
  return typeof value === 'string' ? value : '';
}

function isEditAccessRow(row: any): boolean {
  if (!row) return false;
  if (row?.canEdit === true) return true;
  const accessLevel = toString(row?.accessLevel).toLowerCase();
  if (accessLevel === 'edit') return true;
  const role = toString(row?.role).toLowerCase();
  return role.includes('edit');
}

async function canInviteToProject(
  projectRef: FirebaseFirestore.DocumentReference,
  data: FirebaseFirestore.DocumentData,
  uid: string,
  emailLower: string
): Promise<boolean> {
  const ownerUid = getOwnerUid(data);
  const isOwner = !!ownerUid && ownerUid === uid;
  if (isOwner) return true;

  // Collaborators array fallback (no extra reads)
  try {
    const list: Array<any> = Array.isArray(data?.collaborators) ? data.collaborators : [];
    const me = list.find((c) => {
      if (!c) return false;
      if (typeof c === 'string') return c.trim().toLowerCase() === emailLower;
      const cEmail = toString(c?.email).trim().toLowerCase();
      return c?.uid === uid || (!!emailLower && cEmail === emailLower);
    });
    if (me && isEditAccessRow(me)) return true;
  } catch {}

  // Membership subcollection: /projects/{projectId}/members/{uid}
  try {
    const memberSnap = await projectRef.collection('members').doc(uid).get();
    if (memberSnap.exists) {
      const m = (memberSnap.data() as any) || {};
      if (isEditAccessRow(m)) return true;
    }
  } catch {}

  return false;
}

export async function POST(req: Request) {
  const ctx: Record<string, unknown> = { step: 'start' };
  const totalStart = DEBUG_TIMINGS ? performance.now() : 0;
  let verifyTokenMs = 0;
  let projectReadMs = 0;
  let batchCommitMs = 0;
  try {
    ctx.step = 'auth';
    const token = readBearerToken(req);
    if (!token) return json({ error: 'Unauthenticated' }, 401);

    ctx.step = 'verify_token';
    const verifyStart = DEBUG_TIMINGS ? performance.now() : 0;
    const verifyPromise = adminAuth.verifyIdToken(token).then((d) => {
      if (DEBUG_TIMINGS) verifyTokenMs = performance.now() - verifyStart;
      return d;
    });

    ctx.step = 'parse_body';
    const body = (await req.json()) as {
      projectId?: unknown;
      projectTitle?: unknown;
      invitedEmail?: unknown;
      invitedUserName?: unknown;
      role?: unknown;
      accessLevel?: unknown;
      inviteId?: unknown;
      inviterDisplayName?: unknown;
      debug?: unknown;
    };

    const projectId = toString(body.projectId).trim();
    const projectTitle = toString(body.projectTitle).trim();
    const invitedKey = normalizeEmailKey(body.invitedEmail);
    const invitedUserName = toString(body.invitedUserName).trim();
    const role = toString(body.role).trim();
    const accessLevelRaw = toString(body.accessLevel).trim().toLowerCase();
    const accessLevel = accessLevelRaw === 'edit' ? 'edit' : 'view';
    const requestInviteId = toString(body.inviteId).trim();
    const debug = body.debug === true;

    if (!projectId) {
      await verifyPromise;
      return json({ error: 'Missing projectId' }, 400);
    }
    if (!projectTitle) {
      await verifyPromise;
      return json({ error: 'Missing projectTitle' }, 400);
    }
    if (!invitedKey) {
      await verifyPromise;
      return json({ error: 'Invalid invited email' }, 400);
    }
    if (!role) {
      await verifyPromise;
      return json({ error: 'Missing role' }, 400);
    }

    ctx.projectId = projectId;
    ctx.invitedKey = invitedKey;

    ctx.step = 'check_project';
    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectReadStart = DEBUG_TIMINGS ? performance.now() : 0;
    const projectPromise = projectRef.get().then((snap) => {
      if (DEBUG_TIMINGS) projectReadMs = performance.now() - projectReadStart;
      return snap;
    });

    const [decoded, projectSnap] = await Promise.all([verifyPromise, projectPromise]);

    const uid = decoded.uid;
    const inviterEmail = normalizeEmailKey(decoded.email || '');
    const inviterName = toString((decoded as any)?.name).trim();
    ctx.uid = uid;
    ctx.inviterEmail = inviterEmail;

    if (!uid) return json({ error: 'Unauthenticated' }, 401);
    if (!projectSnap.exists) return json({ error: 'Project not found' }, 404);

    ctx.step = 'check_permission';
    const ok = await canInviteToProject(projectRef, projectSnap.data() || {}, uid, inviterEmail);
    if (!ok) {
      return json({ error: 'permission-denied: only owner can invite' }, 403);
    }

    const inviteId =
      requestInviteId && /^inv_[a-z0-9]+$/i.test(requestInviteId)
        ? requestInviteId
        : `inv_${crypto.randomUUID().replace(/-/g, '')}`;

    const inviteRef = adminDb
      .collection('pending_requests')
      .doc(invitedKey)
      .collection('requests')
      .doc(inviteId);
    const notifItemRef = adminDb
      .collection('notifications')
      .doc(invitedKey)
      .collection('items')
      .doc(inviteId);

    const invitePayload = {
      invitedEmail: invitedKey,
      invitedUserName,
      projectId,
      projectTitle,
      status: 'pending',
      invitedAt: admin.firestore.FieldValue.serverTimestamp(),
      accessLevel,
      role,
      invitedByEmail: inviterEmail,
      invitedBy: uid,
      invitedByName:
        toString(body.inviterDisplayName).trim() || inviterName || inviterEmail || '',
    } as const;

    const inviterLabel =
      toString(body.inviterDisplayName).trim() || inviterName || inviterEmail || 'Someone';
    const notifPayload = {
      type: 'project_invite',
      title: 'New Project Invitation',
      subTitle: `${inviterLabel} invited you to collaborate in "${projectTitle}". Tap to view.`,
      time: admin.firestore.FieldValue.serverTimestamp(),
      unread: true,
      inviteId,
      projectId,
      dedupeKey: `${projectId}::${invitedKey}`,
    } as const;

    ctx.step = 'write_batch';
    const batchStart = DEBUG_TIMINGS ? performance.now() : 0;
    const batch = adminDb.batch();
    batch.set(inviteRef, invitePayload, { merge: false });
    batch.set(notifItemRef, notifPayload, { merge: false });
    await batch.commit();
    if (DEBUG_TIMINGS) batchCommitMs = performance.now() - batchStart;

    // Optional notifications root touch (ONLY harmless fields). Best-effort (non-blocking).
    if (debug) {
      const notifRootRef = adminDb.collection('notifications').doc(invitedKey);
      const notifRootPayload = {
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      } as const;
      void notifRootRef.set(notifRootPayload, { merge: true }).catch((e) => {
        if (!DEBUG_TIMINGS) return;
        console.warn('[api/invites:create] notif-root best-effort write failed', {
          path: notifRootRef.path,
          code: e?.code,
          message: e?.message,
        });
      });
    }

    ctx.step = 'done';
    if (DEBUG_TIMINGS) {
      const totalMs = performance.now() - totalStart;
      console.debug('[api/invites:create] timings', {
        verifyToken: Math.round(verifyTokenMs),
        projectRead: Math.round(projectReadMs),
        batchCommit: Math.round(batchCommitMs),
        total: Math.round(totalMs),
      });
    }
    return json({ id: inviteId }, 200);
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('[api/invites:create]', {
      error: e?.message || 'Unknown error',
      step: ctx.step,
      uid: ctx.uid,
      projectId: ctx.projectId,
      invitedKey: ctx.invitedKey,
    });
    return json(
      { error: process.env.NODE_ENV !== 'production' ? e?.message || 'Internal Server Error' : 'Internal Server Error' },
      500
    );
  }
}
