import admin, { getAdminApp } from '@/lib/server/firebaseAdmin';

// Module-level singletons to avoid re-initializing Admin SDK per request.
export const adminApp = getAdminApp();
export const adminDb = adminApp.firestore();
export const adminAuth = adminApp.auth();

export { admin };
export default admin;

