/**
 * Firebase Admin singleton init for server-side use only.
 *
 * Env vars (do NOT commit secrets):
 * - FIREBASE_PROJECT_ID
 * - FIREBASE_CLIENT_EMAIL
 * - FIREBASE_PRIVATE_KEY (use \n for newlines or a file-based secret)
 * - FIREBASE_STORAGE_BUCKET (defaults to docusite-app.firebasestorage.app)
 */
import type { ServiceAccount } from 'firebase-admin';
import type { Bucket } from '@google-cloud/storage';
import admin from 'firebase-admin';

declare global {
  // eslint-disable-next-line no-var
  var __FIREBASE_ADMIN_APP__: admin.app.App | undefined;
}

function getPrivateKey(): string | undefined {
  const raw = process.env.FIREBASE_PRIVATE_KEY;
  if (!raw) return undefined;
  // Support both plain multiline and escaped "\n" env formats by always unescaping
  return raw.replace(/\\n/g, '\n');
}

function normalizeBucketName(input: string | undefined, projectId?: string): string | undefined {
  if (!input || !input.trim()) return projectId ? `${projectId}.appspot.com` : undefined;
  const name = input.trim();
  if (/\.firebasestorage\.app$/i.test(name)) {
    return name.replace(/\.firebasestorage\.app$/i, '.appspot.com');
  }
  return name;
}

function initAdmin(): admin.app.App {
  if (global.__FIREBASE_ADMIN_APP__) return global.__FIREBASE_ADMIN_APP__;

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getPrivateKey();
  // Prefer bucket derived from project id; normalize firebasestorage.app to appspot.com for Admin SDK
  const inferredBucket = projectId ? `${projectId}.appspot.com` : undefined;
  const storageBucket = normalizeBucketName(process.env.FIREBASE_STORAGE_BUCKET, projectId) || inferredBucket || (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com` : 'docusite-app.appspot.com');

  if (!projectId || !clientEmail || !privateKey) {
    // Attempt fallback init using ADC and provided projectId/bucket for contexts
    // where explicit service account vars are not configured (dev).
    try {
      const app = admin.initializeApp({ projectId: projectId || undefined, storageBucket });
      global.__FIREBASE_ADMIN_APP__ = app;
      return app;
    } catch {
      throw new Error('[firebaseAdmin] Missing Firebase Admin env configuration');
    }
  }

  const credential = admin.credential.cert({
    projectId,
    clientEmail,
    privateKey,
  } as ServiceAccount);

  const app = admin.initializeApp({
    credential,
    storageBucket,
  });
  global.__FIREBASE_ADMIN_APP__ = app;
  return app;
}

export function getAdminApp(): admin.app.App {
  return initAdmin();
}

export function getAdminDb(): admin.firestore.Firestore {
  return getAdminApp().firestore();
}

export function getAdminBucket(): Bucket {
  return getAdminApp().storage().bucket();
}

export default admin;
