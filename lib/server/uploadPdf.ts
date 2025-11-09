// import { getAdminBucket, getAdminDb } from './firebaseAdmin';
// import type { FieldValue, Timestamp } from 'firebase-admin/firestore';
// import admin from './firebaseAdmin';
// import nodeCrypto from 'node:crypto';

// export type PdfRecord = {
//   pdfTitle: string;
//   pdfUrl: string;
//   uploadedBy: string;
//   projectId: string;
//   createdAt: FieldValue; // serverTimestamp()
//   requestId?: string;
// };

// // Optional: mirror record in a dedicated projectFiles collection
// export type ProjectFileRecord = {
//   projectId: string;
//   fileName: string;
//   fileUrl: string;
//   uploadedBy: string; // uid
//   uploadedAt: FieldValue; // serverTimestamp()
//   category?: string;
//   requestId?: string;
// };

// export type PdfResponse = {
//   success: true;
//   pdfId: string;
//   pdfUrl: string;
//   createdAt: number; // epoch ms
//   requestId?: string;
// };

// // App notifications follow existing UI shape in this repo
// export type NotificationRecord = {
//   // Existing UI fields (do not remove)
//   title: string; // e.g. "New PDF uploaded"
//   subTitle: string; // pdf title
//   type: string; // e.g. 'pdf_upload'
//   unread: boolean; // true by default
//   time: FieldValue; // serverTimestamp()
//   projectId: string;
//   pdfUrl?: string;
//   // Spec fields for compatibility
//   userId?: string; // recipient identifier (email)
//   message?: string; // e.g. "New PDF uploaded"
//   read?: boolean; // mirrors 'unread' inverted
//   requestId?: string;
// };

// export type IdempotencyDoc = {
//   status: 'reserved' | 'completed';
//   createdAt: FieldValue;
//   completedAt?: FieldValue;
//   pdfId?: string;
//   pdfUrl?: string;
// };

// export interface FileLike {
//   name?: string;
//   type?: string;
//   size: number;
//   arrayBuffer: () => Promise<ArrayBuffer>;
// }

// /** Max upload size in bytes (20 MB) */
// export const MAX_UPLOAD_SIZE = 20 * 1024 * 1024;

// /** Base folder for stored project files */
// export const BASE_FOLDER = 'project_files';

// function base62(len = 16): string {
//   const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
//   const arr = new Uint8Array(len);
//   try {
//     // Prefer Web Crypto API when available (Node 18+)
//     // @ts-ignore
//     globalThis.crypto?.getRandomValues?.(arr);
//   } catch {
//     // Fallback to Node crypto
//     nodeCrypto.randomFillSync(arr);
//   }
//   let out = '';
//   for (let i = 0; i < len; i++) out += alphabet[arr[i] % alphabet.length];
//   return out;
// }

// function isoTimestamp(): string {
//   return new Date().toISOString().replace(/[:.]/g, '-');
// }

// export function generateUniquePdfFileName(): string {
//   return `${isoTimestamp()}-${base62(16)}.pdf`;
// }

// export function splitIntoBatches<T>(items: T[], size: number): T[][] {
//   const out: T[][] = [];
//   for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
//   return out;
// }

// export type ValidatedUpload = {
//   pdfFile: FileLike;
//   pdfTitle: string;
//   projectId: string;
//   uploadedBy: string;
//   requestId?: string;
//   category?: string;
//   originalFileName?: string;
// };

// /**
//  * Validate multipart/form-data fields from Next App Router (Request.formData()).
//  */
// export async function validateUploadInput(formData: FormData): Promise<ValidatedUpload> {
//   const pdf = formData.get('pdfFile');
//   const pdfTitle = (formData.get('pdfTitle') || '').toString().trim();
//   const projectId = (formData.get('projectId') || '').toString().trim();
//   const uploadedBy = (formData.get('uploadedBy') || '').toString().trim();
//   const requestIdRaw = formData.get('requestId');
//   const requestId = requestIdRaw ? requestIdRaw.toString().trim() : undefined;
//   const categoryRaw = formData.get('category');
//   const category = categoryRaw ? categoryRaw.toString().trim() : undefined;
//   const originalFileNameRaw = formData.get('originalFileName');
//   const originalFileName = originalFileNameRaw ? originalFileNameRaw.toString().trim() : undefined;

//   if (!pdf || typeof (pdf as any).arrayBuffer !== 'function') {
//     throw badRequest('Missing required file field "pdfFile".');
//   }

//   const file = pdf as unknown as FileLike & { type?: string; size: number };
//   const type = (file as any)?.type || '';
//   if (!type || !/^application\/pdf$/i.test(type)) {
//     throw badRequest('Only application/pdf is allowed.');
//   }
//   if (typeof file.size !== 'number' || file.size <= 0 || file.size > MAX_UPLOAD_SIZE) {
//     throw badRequest('File size must be >0 and <= 20MB.');
//   }
//   if (!pdfTitle) throw badRequest('Missing required field: pdfTitle');
//   if (!projectId) throw badRequest('Missing required field: projectId');
//   if (!uploadedBy) throw badRequest('Missing required field: uploadedBy');

//   return { pdfFile: file, pdfTitle, projectId, uploadedBy, requestId, category, originalFileName };
// }

// export function badRequest(message: string) {
//   const err = new Error(message) as Error & { status?: number };
//   err.status = 400;
//   return err;
// }

// function logError(step: string, ctx: Record<string, unknown>) {
//   // eslint-disable-next-line no-console
//   console.error('[upload-pdf:error]', { step, ...ctx });
// }

// /** Upload the PDF to Firebase Storage and return storage path and download URL */
// function sanitizeFileName(name: string): string {
//   // Keep common safe chars; replace others with underscore
//   const cleaned = name
//     .replace(/[\\/:*?"<>|\u0000-\u001F]/g, '_')
//     .replace(/\s+/g, ' ')
//     .trim();
//   return cleaned || 'file.pdf';
// }

// export async function uploadPdfToStorage(
//   projectId: string,
//   file: FileLike,
//   requestId?: string,
//   originalFileName?: string
// ): Promise<{ storagePath: string; pdfUrl: string; token: string }> {
//   const buf = Buffer.from(await file.arrayBuffer());
//   if (!buf || buf.length === 0) throw badRequest('Empty file');

//   let uniqueName: string;
//   if (originalFileName) {
//     const base = sanitizeFileName(originalFileName);
//     const hasPdf = /\.pdf$/i.test(base);
//     uniqueName = `${Date.now()}_${hasPdf ? base : `${base}.pdf`}`;
//   } else {
//     uniqueName = generateUniquePdfFileName();
//   }
//   const storagePath = `${BASE_FOLDER}/${projectId}/${uniqueName}`;
//   const token = nodeCrypto.randomUUID();

//   const fileRef = getAdminBucket().file(storagePath);
//   await fileRef.save(buf, {
//     contentType: 'application/pdf',
//     resumable: false,
//     metadata: {
//       contentType: 'application/pdf',
//       metadata: {
//         firebaseStorageDownloadTokens: token,
//         requestId: requestId || '',
//       },
//       cacheControl: 'public, max-age=3600',
//     },
//     validation: 'crc32c',
//   });

//   const bucket =
//     process.env.FIREBASE_STORAGE_BUCKET ||
//     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
//     (process.env.FIREBASE_PROJECT_ID ? `${process.env.FIREBASE_PROJECT_ID}.appspot.com` : 'docusite-app.appspot.com');
//   const pdfUrl = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(
//     bucket
//   )}/o/${encodeURIComponent(storagePath)}?alt=media&token=${encodeURIComponent(token)}`;

//   return { storagePath, pdfUrl, token };
// }

// /** Save the PDF record in Firestore and return doc id + timestamp */
// export async function savePdfRecord(
//   data: Omit<PdfRecord, 'createdAt'>
// ): Promise<{ pdfId: string; createdAt: number }> {
//   const payload: PdfRecord = {
//     ...data,
//     createdAt: admin.firestore.FieldValue.serverTimestamp() as unknown as FieldValue,
//   };
//   const col = getAdminDb().collection('pdfs');
//   const ref = await col.add(payload as any);
//   const snap = await ref.get();
//   const createdAt = (snap.get('createdAt') as Timestamp | undefined)?.toMillis?.() || Date.now();
//   return { pdfId: ref.id, createdAt };
// }

// /** Save a simplified project file record for listing and auditing */
// export async function saveProjectFileRecord(data: Omit<ProjectFileRecord, 'uploadedAt'>): Promise<string> {
//   const payload: ProjectFileRecord = {
//     ...data,
//     uploadedAt: admin.firestore.FieldValue.serverTimestamp() as unknown as FieldValue,
//   };
//   const col = getAdminDb().collection('projectFiles');
//   const ref = await col.add(payload as any);
//   return ref.id;
// }

// /**
//  * Create notifications for all project members (by email) using write batches
//  * and the repo's existing notifications structure: notifications/{email}/items/{id}
//  */
// export async function createNotificationsForProjectMembers(
//   projectId: string,
//   pdfData: { pdfTitle: string; pdfUrl: string },
//   requestId?: string
// ): Promise<void> {
//   const { collectProjectMemberEmails } = await import('@/lib/server/fcm');
//   const uniq = await collectProjectMemberEmails(projectId);

//   if (!uniq.length) return; // nothing to notify

//   const records: { rootId: string; data: NotificationRecord }[] = uniq.map((email) => ({
//     rootId: email,
//     data: {
//       title: 'New PDF uploaded',
//       subTitle: `${pdfData.pdfTitle}. Tap to view.`,
//       type: 'pdf_upload',
//       unread: true,
//       time: admin.firestore.FieldValue.serverTimestamp() as unknown as FieldValue,
//       projectId,
//       pdfUrl: pdfData.pdfUrl,
//       // Spec-compliant fields while preserving UI shape
//       userId: email,
//       message: 'New PDF uploaded',
//       read: false,
//       requestId,
//     },
//   }));

//   const batches = splitIntoBatches(records, 450); // stay below 500 limit
//   for (const chunk of batches) {
//     const batch = getAdminDb().batch();
//     for (const rec of chunk) {
//       const root = getAdminDb().collection('notifications').doc(rec.rootId);
//       const items = root.collection('items');
//       const docRef = items.doc();
//       batch.set(docRef, rec.data as any);
//     }
//     await batch.commit();
//   }
// }

// /** Attempt to delete an uploaded object to avoid orphan files */
// export async function safeDeleteUploadedObject(storagePath: string) {
//   try {
//     await getAdminBucket().file(storagePath).delete({ ignoreNotFound: true });
//   } catch (e) {
//     logError('storage.delete_failed', { storagePath, error: (e as any)?.message || e });
//   }
// }

// /**
//  * Append a project file entry to projects/{id}.files array so the current UI can display it.
//  */
// export async function appendPdfToProjectFiles(
//   projectId: string,
//   entry: { category?: string; fileName: string; fileUrl: string; uploadedBy?: string }
// ) {
//   const ref = getAdminDb().collection('projects').doc(projectId);
//   await getAdminDb().runTransaction(async (tx) => {
//     const snap = await tx.get(ref);
//     if (!snap.exists) {
//       const err = new Error('Project not found') as Error & { status?: number };
//       err.status = 404;
//       throw err;
//     }
//     const current = (snap.get('files') as any[]) || [];
//     const newEntry = {
//       category: entry.category || 'Others',
//       fileName: entry.fileName,
//       fileUrl: entry.fileUrl,
//       lastUpdated: admin.firestore.FieldValue.serverTimestamp() as unknown as FieldValue,
//       newCommentsCount: 0,
//       newImagesCount: 0,
//       ...(entry.uploadedBy ? { uploadedBy: entry.uploadedBy } : {}),
//     };
//     tx.update(ref, { files: [...current, newEntry] });
//   });
// }

// /**
//  * Append a system message in the project's group chat to indicate a file was added.
//  * Path mirrors client subscription in lib/chat.ts: group_chat/metadata/messages
//  */
// export async function appendProjectChatSystemMessage(input: {
//   projectId: string;
//   actorEmail?: string;
//   actorName?: string;
//   fileName: string;
//   fileUrl: string;
//   category?: string;
// }) {
//   const ref = getAdminDb()
//     .collection('projects')
//     .doc(input.projectId)
//     .collection('group_chat')
//     .doc('metadata')
//     .collection('messages')
//     .doc();

//   const payload = {
//     message: `${input.fileName} was added to the project.`,
//     fileUrl: input.fileUrl,
//     fileName: input.fileName,
//     messageType: 'text',
//     sentAt: admin.firestore.FieldValue.serverTimestamp() as unknown as FieldValue,
//     sentBy: input.actorEmail || 'system',
//     userId: (input.actorEmail && input.actorEmail) || 'system',
//     photoUrl: null,
//     status: 'sent',
//     readBy: [],
//     replyTo: null,
//     category: input.category || 'Others',
//     by: {
//       email: input.actorEmail || '',
//       name: input.actorName || '',
//     },
//     type: 'system_file_added',
//   } as any;

//   await ref.set(payload);
// }

// /**
//  * Idempotency wrapper using Firestore collection idempotency/{requestId}.
//  * If a completed result exists, returns it. Otherwise reserves and executes.
//  */
// export async function withIdempotency(
//   requestId: string | undefined,
//   run: () => Promise<{ pdfId: string; pdfUrl: string; createdAt: number }>
// ): Promise<{ pdfId: string; pdfUrl: string; createdAt: number }> {
//   if (!requestId) return run();

//   const idRef = getAdminDb().collection('idempotency').doc(requestId);
//   const result = await getAdminDb().runTransaction(async (tx) => {
//     const snap = await tx.get(idRef);
//     if (snap.exists) {
//       const data = snap.data() as IdempotencyDoc | undefined;
//       if (data?.status === 'completed' && data?.pdfId && data?.pdfUrl) {
//         return { pdfId: data.pdfId, pdfUrl: data.pdfUrl, createdAt: Date.now() };
//       }
//       // Already reserved and in-progress elsewhere
//       return null;
//     }
//     const payload: IdempotencyDoc = {
//       status: 'reserved',
//       createdAt: admin.firestore.FieldValue.serverTimestamp() as unknown as FieldValue,
//     };
//     tx.set(idRef, payload as any);
//     return { pdfId: '', pdfUrl: '', createdAt: 0 }; // signal that we reserved and should run
//   });

//   if (result && result.pdfId) return result; // previously completed
//   if (result === null) {
//     const err = new Error('Request is already in progress') as Error & { status?: number };
//     err.status = 409;
//     throw err;
//   }

//   // We reserved; now execute and mark completed
//   const out = await run();
//   await idRef.set(
//     {
//       status: 'completed',
//       pdfId: out.pdfId,
//       pdfUrl: out.pdfUrl,
//       completedAt: admin.firestore.FieldValue.serverTimestamp() as unknown as FieldValue,
//     } as Partial<IdempotencyDoc> as any,
//     { merge: true }
//   );
//   return out;
// }
// Temporary stubs to satisfy build when this module is not active.
// These keep the server route compiling without enabling actual server-side upload logic.
export const validateUploadInput: any = undefined as any;
export const uploadPdfToStorage: any = undefined as any;
export const savePdfRecord: any = undefined as any;
export const saveProjectFileRecord: any = undefined as any;
export const createNotificationsForProjectMembers: any = undefined as any;
export const safeDeleteUploadedObject: any = async (_path: string) => {};
export const withIdempotency: any = async (_reqId: any, run: () => Promise<any>) => run();
export const appendPdfToProjectFiles: any = undefined as any;
export const appendProjectChatSystemMessage: any = undefined as any;

export {};
