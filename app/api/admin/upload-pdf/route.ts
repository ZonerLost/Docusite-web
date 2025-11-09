import { NextResponse } from 'next/server';
import {
  validateUploadInput,
  uploadPdfToStorage,
  savePdfRecord,
  saveProjectFileRecord,
  createNotificationsForProjectMembers,
  withIdempotency,
  safeDeleteUploadedObject,
} from '@/lib/server/uploadPdf';
import { getAdminDb } from '@/lib/server/firebaseAdmin';
// Notifications are optional and disabled by default during development.
const ENABLE_NOTIFICATIONS = process.env.ENABLE_NOTIFICATIONS === '1';

export const runtime = 'nodejs';

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

export async function POST(req: Request) {
  const ctx: Record<string, unknown> = { step: 'start' };
  try {
    // No auth required: accept uploads in dev and trusted environments.

    // Parse form-data
    ctx.step = 'parse_form';
    const formData = await req.formData();
    const input = await validateUploadInput(formData);
    ctx.projectId = input.projectId;
    ctx.requestId = input.requestId;

    // Verify project exists before upload to avoid orphan files
    ctx.step = 'check_project';
    const projectRef = getAdminDb().collection('projects').doc(input.projectId);
    const projectSnap = await projectRef.get();
    if (!projectSnap.exists) return json({ error: 'Project not found' }, 404);

    const result = await withIdempotency(input.requestId, async () => {
      let storagePath: string | undefined;
      try {
        ctx.step = 'upload_storage';
        const uploaded = await uploadPdfToStorage(
          input.projectId,
          input.pdfFile,
          input.requestId,
          input.originalFileName
        );
        storagePath = uploaded.storagePath;

        ctx.step = 'save_pdf_record';
        const { pdfId, createdAt } = await savePdfRecord({
          pdfTitle: input.pdfTitle,
          pdfUrl: uploaded.pdfUrl,
          uploadedBy: input.uploadedBy,
          projectId: input.projectId,
          requestId: input.requestId,
        });

        // Mirror entry in a dedicated collection for audit/listing purposes
        ctx.step = 'save_project_file_record';
        try {
          await saveProjectFileRecord({
            projectId: input.projectId,
            fileName: input.originalFileName || input.pdfTitle,
            fileUrl: uploaded.pdfUrl,
            uploadedBy: input.uploadedBy,
            category: input.category,
            requestId: input.requestId,
          });
        } catch (e) {
          // Treat as fatal to keep semantics: if DB write fails, do not leave orphan storage
          throw e;
        }

        // Update project files array so the UI sees the new file
        ctx.step = 'append_project_file';
        const fileName = input.originalFileName || input.pdfTitle;
        const { appendPdfToProjectFiles } = await import('@/lib/server/uploadPdf');
        await appendPdfToProjectFiles(input.projectId, {
          category: input.category,
          fileName,
          fileUrl: uploaded.pdfUrl,
          uploadedBy: input.uploadedBy,
        });

        if (ENABLE_NOTIFICATIONS) {
          ctx.step = 'fanout_notifications';
          await createNotificationsForProjectMembers(
            input.projectId,
            { pdfTitle: input.pdfTitle, pdfUrl: uploaded.pdfUrl },
            input.requestId
          );

          // Post a system message into project chat (best-effort)
          try {
            ctx.step = 'append_chat_message';
            const actor = await getAdminDb().collection('users').doc(input.uploadedBy).get();
            const actorEmail = (actor.get('email') as string | undefined) || '';
            const actorName = (actor.get('displayName') as string | undefined) || '';
            const { appendProjectChatSystemMessage } = await import('@/lib/server/uploadPdf');
            await appendProjectChatSystemMessage({
              projectId: input.projectId,
              actorEmail,
              actorName,
              fileName: input.originalFileName || input.pdfTitle,
              fileUrl: uploaded.pdfUrl,
              category: input.category,
            });
          } catch {}

          // Fan out FCM push notifications to project members (best-effort)
          try {
            const { sendPdfUploadPushToProjectMembers } = await import('@/lib/server/fcm');
            await sendPdfUploadPushToProjectMembers({
              projectId: input.projectId,
              title: 'New PDF uploaded',
              body: `${input.pdfTitle}. Tap to view.`,
              url: uploaded.pdfUrl,
              icon: '/docusite.svg',
            });
          } catch {}
        }

        return { pdfId, pdfUrl: uploaded.pdfUrl, createdAt };
      } catch (e) {
        if (storagePath) {
          ctx.step = 'cleanup_orphan_file';
          await safeDeleteUploadedObject(storagePath);
        }
        throw e;
      }
    });

    const body = {
      success: true as const,
      pdfId: result.pdfId,
      pdfUrl: result.pdfUrl,
      createdAt: new Date(result.createdAt).toISOString(),
      ...(input.requestId ? { requestId: input.requestId } : {}),
    };
    ctx.step = 'done';
    return json(body, 200);
  } catch (e: any) {
    const status = typeof e?.status === 'number' ? e.status : 500;
    // eslint-disable-next-line no-console
    console.error('[api/upload-pdf:app]', {
      error: e?.message || 'Unknown error',
      requestId: ctx.requestId,
      projectId: ctx.projectId,
      step: ctx.step,
    });
    if (status === 400) return json({ error: e.message || 'Bad Request', ...(process.env.NODE_ENV !== 'production' ? { step: ctx.step } : {}) }, 400);
    if (status === 401) return json({ error: 'Unauthenticated', ...(process.env.NODE_ENV !== 'production' ? { step: ctx.step } : {}) }, 401);
    if (status === 404) return json({ error: 'Not Found', ...(process.env.NODE_ENV !== 'production' ? { step: ctx.step } : {}) }, 404);
    if (status === 409) return json({ error: 'Duplicate request in progress', ...(process.env.NODE_ENV !== 'production' ? { step: ctx.step } : {}) }, 409);
    return json({
      error: process.env.NODE_ENV !== 'production' ? (e?.message || 'Internal Server Error') : 'Internal Server Error',
      ...(process.env.NODE_ENV !== 'production' ? { step: ctx.step } : {}),
    }, 500);
  }
}
