import { NextResponse } from 'next/server';
import admin, { getAdminDb } from '@/lib/server/firebaseAdmin';
import { collectProjectMemberEmails } from '@/lib/server/fcm';

export const runtime = 'nodejs';
const ENABLE_NOTIFICATIONS = process.env.ENABLE_NOTIFICATIONS === '1';
const DEBUG_NOTIFICATIONS = process.env.DEBUG_NOTIFICATIONS === '1';

type Body = {
  projectId: string;
  pdfUrl: string;
  pdfTitle: string;
  uploaderName?: string;
  uploaderId?: string;
};

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

function ensureString(v: unknown): string | null {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;
}

export async function POST(req: Request) {
  const ctx: Record<string, unknown> = { step: 'start' };
  try {
    ctx.step = 'parse_body';
    const body = (await req.json()) as Partial<Body> | null;
    if (!body) return json({ error: 'Invalid JSON' }, 400);

    const projectId = ensureString(body.projectId);
    const pdfUrl = ensureString(body.pdfUrl);
    const pdfTitle = ensureString(body.pdfTitle);
    const uploaderId = ensureString(body.uploaderId) || '';
    const uploaderName = ensureString(body.uploaderName) || 'Someone';

    if (!projectId) return json({ error: 'Missing projectId' }, 400);
    if (!pdfUrl) return json({ error: 'Missing pdfUrl' }, 400);
    if (!pdfTitle) return json({ error: 'Missing pdfTitle' }, 400);

    // In non-production or when notifications are disabled, short-circuit to success
    if (!ENABLE_NOTIFICATIONS) {
      return json({ success: true, notified: 0, skipped: true }, 200);
    }

    ctx.step = 'read_project';
    const projRef = getAdminDb().collection('projects').doc(projectId);
    const projSnap = await projRef.get();
    if (!projSnap.exists) return json({ error: 'Project not found' }, 404);
    const projectName = (projSnap.get('title') as string | undefined) || 'the project';
    if (DEBUG_NOTIFICATIONS) {
      // eslint-disable-next-line no-console
      console.debug('[notify/pdf-upload] project loaded', { projectId, projectName });
    }

    ctx.step = 'collect_members';
    let emails = await collectProjectMemberEmails(projectId);
    // Exclude the uploader from notifications when possible
    if (uploaderId) {
      try {
        const userSnap = await getAdminDb().collection('users').doc(uploaderId).get();
        const uploaderEmail = ((userSnap.get('email') as string | undefined) || '').trim().toLowerCase();
        if (uploaderEmail) {
          emails = emails.filter((e) => (e || '').trim().toLowerCase() !== uploaderEmail);
        }
      } catch {}
    }
    if (DEBUG_NOTIFICATIONS) {
      // eslint-disable-next-line no-console
      console.debug('[notify/pdf-upload] collected members', { count: emails.length, sample: emails.slice(0, 5) });
    }
    if (emails.length === 0) {
      // Nothing to notify; still return success for idempotency
      return json({ success: true, notified: 0 }, 200);
    }

    ctx.step = 'write_notifications';
    const batches: string[][] = [];
    for (let i = 0; i < emails.length; i += 450) batches.push(emails.slice(i, i + 450));

    const subTitle = `${uploaderName} uploaded a new PDF in "${projectName}". Tap to view.`;
    let notified = 0;
    for (const chunk of batches) {
      if (DEBUG_NOTIFICATIONS) {
        // eslint-disable-next-line no-console
        console.debug('[notify/pdf-upload] writing batch', { size: chunk.length });
      }
      try {
        const batch = getAdminDb().batch();
        for (const email of chunk) {
          const key = (email || '').trim().toLowerCase();
          if (!key) continue;
          const root = getAdminDb().collection('notifications').doc(key);
          const items = root.collection('items');
          const ref = items.doc();
          batch.set(ref, {
            uploaderId,
            projectId,
            subTitle,
            time: admin.firestore.FieldValue.serverTimestamp(),
            title: 'New PDF Uploaded',
            type: 'pdf_upload',
            unread: true,
          });
        }
        await batch.commit();
        notified += chunk.length;
      } catch (e) {
        // If a batch fails, continue with remaining chunks
        if (DEBUG_NOTIFICATIONS) {
          // eslint-disable-next-line no-console
          console.warn('[notify/pdf-upload] batch write failed', (e as any)?.message || e);
        }
      }
    }
    ctx.step = 'done';
    return json({ success: true, notified }, 200);
  } catch (e: any) {
    // As a production-friendly fallback, avoid failing the upload UX.
    // Return success=false but 200 to prevent console 500 noise during local/dev.
    // eslint-disable-next-line no-console
    console.error('[notify/pdf-upload:error]', { step: ctx.step, error: e?.message || e });
    return json({ success: false, error: 'Notification dispatch failed', step: ctx.step }, 200);
  }
}
