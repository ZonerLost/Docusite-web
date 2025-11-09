import admin from './firebaseAdmin';
import { getAdminDb } from './firebaseAdmin';

type MemberIndex = { emails: string[] };

export async function collectProjectMemberEmails(projectId: string): Promise<string[]> {
  const ref = getAdminDb().collection('projects').doc(projectId);
  const snap = await ref.get();
  if (!snap.exists) return [];
  const data = snap.data() as any;

  // 1) Explicit members (emails)
  const membersA: string[] = Array.isArray(data?.members) ? data.members.filter(Boolean) : [];

  // 2) collaborators[].email
  const membersB: string[] = Array.isArray(data?.collaborators)
    ? (data.collaborators as any[])
        .map((c) => (c?.email || '').toString().trim())
        .filter(Boolean)
    : [];

  // 3) group_chat metadata: emails or memberEmails
  let membersC: string[] = [];
  try {
    const meta = await getAdminDb()
      .collection('projects')
      .doc(projectId)
      .collection('group_chat')
      .doc('metadata')
      .get();
    const metaEmails = (meta.data() as MemberIndex | undefined)?.emails ||
      ((meta.get('memberEmails') as string[] | undefined) ?? []);
    if (Array.isArray(metaEmails)) membersC = metaEmails.filter(Boolean);
  } catch {}

  // 4) ownerId -> email
  let ownerEmail = '';
  const ownerId = (data?.ownerId || '').toString().trim();
  if (ownerId) {
    try {
      const owner = await getAdminDb().collection('users').doc(ownerId).get();
      ownerEmail = (owner.get('email') as string | undefined) || '';
    } catch {}
  }

  const out = new Set(
    [...membersA, ...membersB, ...membersC, ownerEmail]
      .map((s) => s?.trim().toLowerCase())
      .filter(Boolean),
  );
  return Array.from(out);
}

async function collectFcmTokensForEmails(emails: string[]): Promise<string[]> {
  if (!emails.length) return [];
  const tokens = new Set<string>();
  // Firestore `in` supports up to 10 values per query
  for (let i = 0; i < emails.length; i += 10) {
    const chunk = emails.slice(i, i + 10);
    const q = await getAdminDb().collection('users').where('email', 'in', chunk).get();
    q.forEach((doc) => {
      const tok = (doc.get('fcmToken') as string | null) || null;
      if (tok && typeof tok === 'string' && tok.length > 0) tokens.add(tok);
    });
  }
  return Array.from(tokens);
}

export async function sendPdfUploadPushToProjectMembers(input: {
  projectId: string;
  title: string;
  body: string;
  url: string;
  icon?: string;
}): Promise<{ success: number; failure: number; total: number }> {
  const emails = await collectProjectMemberEmails(input.projectId);
  const tokens = await collectFcmTokensForEmails(emails);
  if (!tokens.length) return { success: 0, failure: 0, total: 0 };

  // Chunk at 500 per FCM call
  let success = 0;
  let failure = 0;
  for (let i = 0; i < tokens.length; i += 500) {
    const tokChunk = tokens.slice(i, i + 500);
    const msg: admin.messaging.MulticastMessage = {
      tokens: tokChunk,
      notification: {
        title: input.title,
        body: input.body,
      },
      data: {
        url: input.url,
        icon: input.icon || '/docusite.svg',
        title: input.title,
        body: input.body,
      },
      webpush: {
        fcmOptions: { link: input.url },
        notification: {
          icon: input.icon || '/docusite.svg',
          data: { url: input.url },
        },
      },
    };

    const resp = await admin.messaging().sendEachForMulticast(msg);
    success += resp.successCount;
    failure += resp.failureCount;

    // Best-effort cleanup: clear invalid tokens
    await Promise.all(
      resp.responses.map(async (r, idx) => {
        if (r.success) return;
        const code = (r.error as any)?.code || '';
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        ) {
          const bad = tokChunk[idx];
          try {
            const snap = await getAdminDb().collection('users').where('fcmToken', '==', bad).get();
            const batch = getAdminDb().batch();
            snap.forEach((d) => batch.update(d.ref, { fcmToken: '' }));
            await batch.commit();
          } catch {}
        }
      })
    );
  }

  return { success, failure, total: tokens.length };
}
