"use client";
import toast from 'react-hot-toast';
import { db, storage, auth } from '@/lib/firebase-client';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, runTransaction, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { checkProjectEditPermission } from '@/lib/permissions';
import { normalizeEmail } from '@/lib/notifications/keys';
const DEBUG_NOTIF = process.env.NEXT_PUBLIC_DEBUG_NOTIFICATIONS === '1';

export type UploadPdfInput = {
  file: File;
  pdfTitle: string;
  projectId: string;
  uploadedBy?: string; // default: current uid
  category?: string; // optional, for UI grouping
  requestId?: string; // optional idempotency key
  originalFileName?: string; // default: file.name
};

export type UploadPdfSuccess = {
  success: true;
  pdfId: string;
  pdfUrl: string;
  createdAt: string; // ISO
  requestId?: string;
};

export async function uploadProjectPdf(input: UploadPdfInput): Promise<UploadPdfSuccess> {
  // Permissions: Only project members/owners may upload
  if (!(await checkProjectEditPermission(input.projectId))) {
    // Permission helper already showed the toast. Stop execution.
    throw new Error('permission-denied');
  }
  // 1️⃣ Validate file
  if (!input.file || input.file.type !== "application/pdf") {
    throw new Error("Only PDF files are allowed");
  }
  const MAX = 20 * 1024 * 1024; // 20MB
  if (input.file.size > MAX) throw new Error("File size must be 20MB or less");

  // 2️⃣ Sanitize and prepare filename
  const origNameRaw = input.originalFileName || input.file.name || "file.pdf";
  const sanitized = origNameRaw.replace(/[\\/:*?"<>|\u0000-\u001F]/g, "_");
  const ensuredPdf = /\.pdf$/i.test(sanitized) ? sanitized : `${sanitized}.pdf`;
  const uniqueName = `${Date.now()}_${ensuredPdf}`;
  const path = `project_files/${input.projectId}/${uniqueName}`;

  // 3️⃣ Upload to Firebase Storage
  const sref = storageRef(storage, path);
  await new Promise<void>((resolve, reject) => {
    const task = uploadBytesResumable(sref, input.file, {
      contentType: "application/pdf",
      customMetadata: { originalFileName: ensuredPdf },
    });
    task.on("state_changed", undefined, reject, () => resolve());
  });
  const pdfUrl = await getDownloadURL(sref);

  // 4️⃣ Append file metadata into the project document
  const projRef = doc(db, "projects", input.projectId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(projRef);
    if (!snap.exists()) throw new Error("Project not found");

    const current = (snap.get("files") as any[]) || [];
    const newEntry = {
      category: input.category || "Others",
      fileName: ensuredPdf,
      fileUrl: pdfUrl,
      lastUpdated: new Date().toISOString(), // ✅ safe for arrays
      newCommentsCount: 0,
      newImagesCount: 0,
      uploadedBy: input.uploadedBy || "anonymous",
    };

    tx.update(projRef, { files: [...current, newEntry] });
  });

  // 4.4️⃣ Create Firestore notifications for all project members (client-side)
  try {
    // Fetch project details to get title and collaborators' emails
    const projSnap = await getDoc(doc(db, 'projects', input.projectId));
    if (projSnap.exists()) {
      const pdata = projSnap.data() as any;
      const projectName: string = String(pdata?.title || 'Project');
      const collaborators: any[] = Array.isArray(pdata?.collaborators) ? pdata.collaborators : [];
      const uploaderEmail = normalizeEmail(auth.currentUser?.email) || '';
      const emails = Array.from(
        new Set(
          collaborators
            .map((c) => normalizeEmail(c?.email))
            .filter((e): e is string => !!e && (!uploaderEmail || e !== uploaderEmail))
        )
      );

      if (emails.length > 0) {
        const uploaderId = auth.currentUser?.uid || '';
        const uploaderName =
          input.uploadedBy || auth.currentUser?.displayName || auth.currentUser?.email || 'Someone';
        const subTitle = `${uploaderName} has uploaded a new PDF in "${projectName}". Tap to view.`;

        const createOne = async (email: string) => {
          try {
            const root = doc(db, 'notifications', email);
            const items = collection(root, 'items');
            await addDoc(items, {
              uploaderId,
              projectId: input.projectId,
              subTitle,
              time: serverTimestamp(),
              title: 'New PDF Uploaded',
              type: 'project_upload',
              unread: true,
            } as const);
          } catch (e) {
            if (DEBUG_NOTIF) {
              // eslint-disable-next-line no-console
              console.warn('[notify:create:client] failed', { email, error: (e as any)?.message || e });
            }
          }
        };

        // Best-effort parallel writes (bounded by browser/network)
        await Promise.allSettled(emails.map((e) => createOne(e)));
        if (DEBUG_NOTIF) {
          // eslint-disable-next-line no-console
          console.debug('[notify:create:client] created notifications', { count: emails.length });
        }
      } else if (DEBUG_NOTIF) {
        // eslint-disable-next-line no-console
        console.debug('[notify:create:client] no collaborator emails found');
      }
    } else if (DEBUG_NOTIF) {
      // eslint-disable-next-line no-console
      console.debug('[notify:create:client] project not found when fetching metadata');
    }
  } catch (e) {
    if (DEBUG_NOTIF) {
      // eslint-disable-next-line no-console
      console.warn('[notify:create:client] unexpected error', (e as any)?.message || e);
    }
  }

  // 4.5️⃣ Notify project members (best-effort, does not affect upload flow)
  try {
    const res = await fetch('/api/notify/pdf-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: input.projectId,
        pdfUrl,
        pdfTitle: input.pdfTitle,
        uploaderName: input.uploadedBy || undefined,
        uploaderId: auth.currentUser?.uid || undefined,
      }),
    });
    try {
      const data = await res.json();
      if (!res.ok || data?.success === false) {
        // eslint-disable-next-line no-console
        console.warn('[notify/pdf-upload:client] non-ok response', { status: res.status, body: data });
      } else if (DEBUG_NOTIF) {
        // eslint-disable-next-line no-console
        console.debug('[notify/pdf-upload:client] success', { status: res.status, body: data });
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[notify/pdf-upload:client] failed to parse response', e);
    }
  } catch (e) {
    // Intentionally swallow errors to keep original flow unchanged, but log for diagnosis
    // eslint-disable-next-line no-console
    console.warn('[notify/pdf-upload:client] request failed', (e as any)?.message || e);
  }

  // 5️⃣ Return result
  return {
    success: true,
    pdfId: uniqueName,
    pdfUrl,
    createdAt: new Date().toISOString(),
    ...(input.requestId ? { requestId: input.requestId } : {}),
  };
}


export async function uploadProjectPdfWithToast(input: UploadPdfInput) {
  // Early client-side permission guard to prevent extra error toasts
  if (!(await checkProjectEditPermission(input.projectId))) {
    return; // helper already showed toast; do not proceed
  }
  return toast.promise(uploadProjectPdf(input), {
    loading: 'Uploading PDF...',
    success: 'PDF uploaded successfully',
    error: (e) => (e?.message || 'Failed to upload PDF'),
  });
}
