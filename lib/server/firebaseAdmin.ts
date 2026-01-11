/**
 * Firebase Admin singleton init for server-side use only.
 *
 * Env vars (do NOT commit secrets):
 * - FIREBASE_PROJECT_ID
 * - FIREBASE_CLIENT_EMAIL
 * - FIREBASE_PRIVATE_KEY (use \n for newlines or a file-based secret)
 * - FIREBASE_STORAGE_BUCKET (bucket name only, no "gs://" prefix)
 */
import type { ServiceAccount } from 'firebase-admin';
import type { Bucket } from '@google-cloud/storage';
import fs from 'node:fs';
import path from 'node:path';
import admin from 'firebase-admin';

declare global {
  // eslint-disable-next-line no-var
  var __FIREBASE_ADMIN_APP__: admin.app.App | undefined;
  // eslint-disable-next-line no-var
  var __FIREBASE_ADMIN_APP_NAME__: string | undefined;
}

function getPrivateKey(): string | undefined {
  const raw = process.env.FIREBASE_PRIVATE_KEY;
  if (!raw) return undefined;
  // Support both plain multiline and escaped "\n" env formats by always unescaping
  return raw.replace(/\\n/g, '\n');
}

function readServiceAccountFromFile(): ServiceAccount | undefined {
  const candidates: Array<string | undefined> = [
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    path.join(process.cwd(), 'config', 'serviceAccountKey.json'),
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const filePath = path.isAbsolute(candidate) ? candidate : path.join(process.cwd(), candidate);
      if (!fs.existsSync(filePath)) continue;
      const raw = fs.readFileSync(filePath, 'utf8');
      const json = JSON.parse(raw) as any;
      const clientEmail = typeof json?.client_email === 'string' ? json.client_email : undefined;
      const privateKey = typeof json?.private_key === 'string' ? json.private_key : undefined;
      const projectId = typeof json?.project_id === 'string' ? json.project_id : undefined;
      if (!clientEmail || !privateKey) continue;
      return {
        projectId,
        clientEmail,
        privateKey,
      } as ServiceAccount;
    } catch {}
  }
  return undefined;
}

export function getStorageBucketName(): string {
  const raw =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    '';
  const bucketName = raw.replace(/^gs:\/\//, '').trim();
  if (!bucketName) {
    throw new Error(
      'Missing FIREBASE_STORAGE_BUCKET. Add FIREBASE_STORAGE_BUCKET=docusite-app.firebasestorage.app to .env.local and restart.'
    );
  }
  return bucketName;
}

type AdminConfig = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  storageBucket: string;
};

function getAdminConfig(): AdminConfig {
  const fileAccount = readServiceAccountFromFile();
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    fileAccount?.projectId;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || fileAccount?.clientEmail;
  const privateKey = getPrivateKey() || fileAccount?.privateKey;
  const storageBucket = getStorageBucketName();

  const missing: string[] = [];
  if (!projectId) missing.push('FIREBASE_PROJECT_ID');
  if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
  if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY');
  if (missing.length) {
    throw new Error(
      `[firebaseAdmin] Missing ${missing.join(', ')}. Check .env.local and restart.`
    );
  }

  return {
    projectId: projectId!,
    clientEmail: clientEmail!,
    privateKey: privateKey!,
    storageBucket,
  };
}

function initAdmin(): admin.app.App {
  const { projectId, clientEmail, privateKey, storageBucket } = getAdminConfig();
  const appName = 'docusite-server-cert';
  if (global.__FIREBASE_ADMIN_APP__ && global.__FIREBASE_ADMIN_APP_NAME__ === appName) {
    return global.__FIREBASE_ADMIN_APP__;
  }

  // Prefer returning an existing app instance if already initialized (e.g. HMR).
  try {
    const existing = admin.app(appName);
    global.__FIREBASE_ADMIN_APP__ = existing;
    global.__FIREBASE_ADMIN_APP_NAME__ = appName;
    return existing;
  } catch {}

  const credential = admin.credential.cert({
    projectId,
    clientEmail,
    privateKey,
  } as ServiceAccount);

  const app = admin.initializeApp({
    credential,
    storageBucket,
  }, appName);
  global.__FIREBASE_ADMIN_APP__ = app;
  global.__FIREBASE_ADMIN_APP_NAME__ = appName;
  return app;
}

export function getAdminApp(): admin.app.App {
  return initAdmin();
}

export function getAdminDb(): admin.firestore.Firestore {
  return getAdminApp().firestore();
}

export function getAdminBucket(bucketName?: string): Bucket {
  return getAdminApp().storage().bucket(bucketName || getStorageBucketName());
}

export default admin;
