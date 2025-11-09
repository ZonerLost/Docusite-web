'use client';

import { auth, db, storage } from '@/lib/firebase-client';
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  deleteDoc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  runTransaction,
  deleteField,
} from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytesResumable, deleteObject } from 'firebase/storage';

export type MessageType = 'text' | 'image' | 'file';

export type ChatMessageDoc = {
  message?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  messageType: MessageType;
  sentAt: any; // Firestore Timestamp
  sentBy: string; // email
  userId: string; // uid
  photoUrl?: string | null;
  status?: 'sent' | 'failed' | 'pending';
  readBy?: string[];
  replyTo?: string | null;
  replyText?: string | null;
  replySender?: string | null;
  reactions?: Record<string, string[]>; // emoji -> list of emails
};

function chatMetaRef(projectId: string) {
  return doc(db, 'projects', projectId, 'group_chat', 'metadata');
}

function messagesCol(projectId: string) {
  return collection(db, 'projects', projectId, 'group_chat', 'metadata', 'messages');
}

export async function ensureChatMetadata(
  projectId: string,
  seed?: { members?: string[]; memberEmails?: string[]; creatorId?: string }
) {
  if (!projectId) return;
  const ref = chatMetaRef(projectId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      createdAt: serverTimestamp(),
      creatorId: seed?.creatorId || auth.currentUser?.uid || '',
      members: seed?.members || (auth.currentUser?.uid ? [auth.currentUser.uid] : []),
      memberEmails: seed?.memberEmails || (auth.currentUser?.email ? [auth.currentUser.email] : []),
    } as any);
  } else if (seed?.members || seed?.memberEmails) {
    const payload: any = {};
    if (seed.members && seed.members.length) payload.members = arrayUnion(...seed.members);
    if (seed.memberEmails && seed.memberEmails.length) payload.memberEmails = arrayUnion(...seed.memberEmails);
    if (Object.keys(payload).length) await updateDoc(ref, payload);
  }
}

export async function addMembersToChat(projectId: string, input: { uids?: string[]; emails?: string[] }) {
  const ref = chatMetaRef(projectId);
  await ensureChatMetadata(projectId);
  const payload: any = {};
  if (input.uids && input.uids.length) payload.members = arrayUnion(...input.uids);
  if (input.emails && input.emails.length) payload.memberEmails = arrayUnion(...input.emails);
  if (Object.keys(payload).length) await updateDoc(ref, payload);
}

export function subscribeProjectMessages(projectId: string, cb: (docs: { id: string; data: ChatMessageDoc }[]) => void) {
  const q = query(messagesCol(projectId), orderBy('sentAt', 'asc'));
  const unsub = onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, data: d.data() as ChatMessageDoc }));
    cb(items);
  });
  return () => unsub();
}

export type UploadProgressHandler = (p: { progress: number; state: 'running' | 'paused' | 'success' | 'error' }) => void;

export async function sendTextMessage(
  projectId: string,
  content: string,
  options?: { replyTo?: string | null; replyText?: string | null; replySender?: string | null }
): Promise<{ id: string }> {
  const u = auth.currentUser;
  if (!u) throw new Error('Not authenticated');
  await ensureChatMetadata(projectId);
  const payload: ChatMessageDoc = {
    message: content,
    fileUrl: null,
    fileName: null,
    messageType: 'text',
    sentAt: serverTimestamp() as any,
    sentBy: u.email || '',
    userId: u.uid,
    photoUrl: u.photoURL || null,
    status: 'sent',
    readBy: [u.uid],
    replyTo: options?.replyTo ?? null,
    replyText: options?.replyText ?? null,
    replySender: options?.replySender ?? null,
  };
  const ref = await addDoc(messagesCol(projectId), payload as any);
  return { id: ref.id };
}

export async function sendFileMessage(
  projectId: string,
  file: File,
  type: Extract<MessageType, 'image' | 'file'>,
  onProgress?: UploadProgressHandler,
  options?: { replyTo?: string | null; replyText?: string | null; replySender?: string | null }
): Promise<{ id: string; fileUrl: string }> {
  const u = auth.currentUser;
  if (!u) throw new Error('Not authenticated');
  await ensureChatMetadata(projectId);

  // Enforce Storage rules limits client-side for better UX
  const MAX = 20 * 1024 * 1024; // 20MB
  if (file.size > MAX) {
    throw new Error('File size must be 20MB or less');
  }

  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  // Store under group_chat/{projectId}/{chatId or uploaderUid}/{filename}
  // Using uploader UID for the middle segment keeps paths unique per user.
  const path = `group_chat/${projectId}/${u.uid}/${Date.now()}_${sanitizedName}`;
  const ref = storageRef(storage, path);
  const task = uploadBytesResumable(ref, file, {
    contentType: file.type || undefined,
    customMetadata: { originalFileName: file.name },
  });

  await new Promise<void>((resolve, reject) => {
    task.on(
      'state_changed',
      (snap) => {
        const progress = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        const state = snap.state === 'paused' ? 'paused' : 'running';
        onProgress?.({ progress, state });
      },
      (err) => {
        onProgress?.({ progress: 0, state: 'error' });
        reject(err);
      },
      () => resolve()
    );
  });

  const url = await getDownloadURL(task.snapshot.ref);

  const payload: ChatMessageDoc = {
    message: type === 'image' ? null : file.name,
    fileUrl: url,
    fileName: file.name,
    messageType: type,
    sentAt: serverTimestamp() as any,
    sentBy: u.email || '',
    userId: u.uid,
    photoUrl: u.photoURL || null,
    status: 'sent',
    readBy: [u.uid],
    replyTo: options?.replyTo ?? null,
    replyText: options?.replyText ?? null,
    replySender: options?.replySender ?? null,
  };
  try {
    const msgRef = await addDoc(messagesCol(projectId), payload as any);
    onProgress?.({ progress: 100, state: 'success' });
    return { id: msgRef.id, fileUrl: url };
  } catch (e) {
    // Firestore write failed — clean up the uploaded file to avoid orphans
    try { await deleteObject(task.snapshot.ref); } catch {}
    throw e;
  }
}

export async function markAllAsRead(projectId: string, uid: string, limitTo: number = 200) {
  // Best-effort: add current UID to readBy on recent messages
  const q = query(messagesCol(projectId), orderBy('sentAt', 'desc'), limit(limitTo));
  const snap = await new Promise<any>((resolve, reject) => {
    const unsub = onSnapshot(
      q,
      (s) => {
        unsub();
        resolve(s);
      },
      (e) => {
        unsub();
        reject(e);
      }
    );
  });
  const batch = writeBatch(db);
  snap.docs.forEach((d: any) => {
    const data = d.data() as ChatMessageDoc;
    const readBy = Array.isArray(data.readBy) ? data.readBy : [];
    if (!readBy.includes(uid)) {
      batch.update(d.ref, { readBy: arrayUnion(uid) } as any);
    }
  });
  try { await batch.commit(); } catch {}
}

/**
 * Delete a single chat message if and only if the current user is the sender.
 * Messages are stored under: projects/{projectId}/group_chat/metadata/messages/{messageId}
 */
export async function deleteProjectMessage(projectId: string, messageId: string): Promise<void> {
  const u = auth.currentUser;
  if (!u) throw new Error('Not authenticated');
  if (!projectId || !messageId) throw new Error('Missing identifiers');

  const ref = doc(db, 'projects', projectId, 'group_chat', 'metadata', 'messages', messageId);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      // eslint-disable-next-line no-console
      console.warn('[chat] delete: message not found', { projectId, messageId });
      return;
    }
    const data = snap.data() as ChatMessageDoc;
    if (data.userId !== u.uid) {
      // eslint-disable-next-line no-console
      console.warn('[chat] delete: permission denied (not owner)', { messageId, owner: data.userId, current: u.uid });
      throw new Error('Permission denied');
    }
    await deleteDoc(ref);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[chat] delete failed', e);
    throw e;
  }
}

/**
 * Toggle a reaction emoji for the current user on a message.
 * Adds user email to `reactions[emoji]` if not present; removes it if present.
 */
export async function toggleMessageReaction(projectId: string, messageId: string, emoji: string): Promise<void> {
  const u = auth.currentUser;
  if (!u) throw new Error('Not authenticated');
  const userEmail = (u.email || '').toLowerCase() || u.uid;
  if (!emoji) throw new Error('Missing emoji');

  const ref = doc(db, 'projects', projectId, 'group_chat', 'metadata', 'messages', messageId);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return; // silently ignore if message removed
      const data = (snap.data() as ChatMessageDoc) || {};
      const current = (data.reactions || {}) as Record<string, string[]>;
      const key = emoji;
      const list = Array.isArray(current[key]) ? [...current[key]] : [];
      const idx = list.findIndex((e) => (e || '').toLowerCase() === userEmail);
      if (idx >= 0) list.splice(idx, 1); else list.push(userEmail);
      if (list.length === 0) {
        tx.update(ref, { [`reactions.${key}`]: deleteField() } as any);
      } else {
        tx.update(ref, { [`reactions.${key}`]: list } as any);
      }
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[chat] toggle reaction failed', e);
    throw e;
  }
}
