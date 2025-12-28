import { db } from "@/lib/firebase-client";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  QueryConstraint,
  QueryDocumentSnapshot,
  documentId,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { getAuthedEmailKey } from "./authed";

function itemsCol(emailKey: string) {
  return collection(doc(db, "notifications", emailKey), "items");
}

export async function markNotificationRead(email: string, id: string) {
  let key: string;
  try {
    key = getAuthedEmailKey();
  } catch {
    return;
  }
  if (!id) return;

  const ref = doc(itemsCol(key), id);
  await updateDoc(ref, { unread: false, readAt: serverTimestamp() as any });
}

export async function markAllNotificationsRead(email: string) {
  let key: string;
  try {
    key = getAuthedEmailKey();
  } catch {
    return;
  }

  let cursor: QueryDocumentSnapshot | null = null;
  while (true) {
    const constraints: QueryConstraint[] = [
      where("unread", "==", true),
      orderBy(documentId()),
      limit(450),
    ];
    if (cursor) constraints.push(startAfter(cursor));

    const snap = await getDocs(query(itemsCol(key), ...constraints));
    if (snap.empty) break;

    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.update(d.ref, { unread: false, readAt: serverTimestamp() as any });
    });
    await batch.commit();

    if (snap.size < 450) break;
    cursor = snap.docs[snap.docs.length - 1];
  }
}

export async function deleteNotification(email: string, id: string) {
  let key: string;
  try {
    key = getAuthedEmailKey();
  } catch {
    return;
  }
  if (!id) return;

  await deleteDoc(doc(itemsCol(key), id));
}
