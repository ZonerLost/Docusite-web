export type UserDoc = {
  uid: string;
  fullName: string;
  displayName: string;
  email: string;
  photoUrl: string;
  fcmToken: string;
  status: "active" | "suspended" | string;
  createdAt: any; // Firestore serverTimestamp
};

