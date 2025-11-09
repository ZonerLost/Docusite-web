import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type DocumentReference,
} from 'firebase/firestore';
import type { FAQItem } from '@/types/faq';
import { db } from '@/lib/firebase-client';

const col = () => collection(db, 'app_faqs');

export async function fetchFAQs(): Promise<FAQItem[]> {
  const q = query(col(), orderBy('orderIndex', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FAQItem, 'id'>) }));
}

export async function createFAQ(partial: Pick<FAQItem, 'question' | 'answer'>): Promise<DocumentReference> {
  return addDoc(col(), {
    question: partial.question.trim(),
    answer: partial.answer.trim(),
    isExpanded: false,
    orderIndex: Date.now(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as any);
}

export async function updateFAQ(id: string, data: Partial<FAQItem>) {
  const ref = doc(db, 'app_faqs', id);
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  } as any);
}

export async function deleteFAQ(id: string) {
  await deleteDoc(doc(db, 'app_faqs', id));
}

export async function reorderFAQs(idsInOrder: string[]) {
  const batch = writeBatch(db);
  idsInOrder.forEach((id, idx) => {
    batch.update(doc(db, 'app_faqs', id), { orderIndex: idx, updatedAt: serverTimestamp() } as any);
  });
  await batch.commit();
}

