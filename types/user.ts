// export type AppUser = {
//   uid: string;
//   email: string;
//   displayName: string;
//   fullName: string;
//   photoUrl: string;
//   status: "active" | "suspended";
//   fcmToken: string;
//   createdAt: any; // Firestore timestamp
//   role: "admin" | "user";
// };


// src/types/user.ts
// import type { Timestamp } from 'firebase/firestore';
// import { serverTimestamp } from 'firebase/firestore';

// export type ServerTimestamp = ReturnType<typeof serverTimestamp>;

// export type UserRole = 'user' | 'admin';
// export type UserStatus = 'active' | 'suspended';

// export type AppUser = {
//   uid: string;
//   email: string;
//   displayName: string;
//   fullName: string;
//   photoUrl: string | null;
//   status: UserStatus;
//   fcmToken: string | null;
//   createdAt: Timestamp;
//   role: UserRole;
// };

// export type NewUser = Omit<AppUser, 'createdAt' | 'role' | 'photoUrl' | 'fcmToken'> & {
//   createdAt: ServerTimestamp;
//   role: 'user';
//   photoUrl: string | null;
//   fcmToken: string | null;
// };

import type { Timestamp } from 'firebase/firestore';
import { serverTimestamp } from 'firebase/firestore';

export type ServerTimestamp = ReturnType<typeof serverTimestamp>;
export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'suspended';

export type AppUser = {
  uid: string;
  email: string;
  displayName: string;
  fullName: string;
  photoUrl: string | null;
  status: UserStatus;
  fcmToken: string | null;
  createdAt: Timestamp;
  role: UserRole;
  // User preference: whether in-app notifications are enabled
  notificationsEnabled?: boolean;
};

export type NewUser = Omit<AppUser, 'createdAt' | 'role'> & {
  createdAt: ServerTimestamp;
  role: 'user';
};

