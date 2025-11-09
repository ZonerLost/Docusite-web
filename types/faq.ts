import type { Timestamp } from 'firebase/firestore';

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  isExpanded: boolean;
  orderIndex: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

