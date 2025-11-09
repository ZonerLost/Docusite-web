/**
 * Server auth helper: getUserFromToken(req)
 *
 * Reads a Bearer token from the Authorization header and verifies it with
 * Firebase Admin. Then loads the Firestore user profile to determine admin role.
 */
import type { NextApiRequest } from 'next';
import { getAdminApp, getAdminDb } from './firebaseAdmin';

export type AuthUser = {
  uid: string;
  isAdmin: boolean;
  email?: string | null;
};

function readAuthHeader(req: Request | NextApiRequest): string | undefined {
  try {
    // Next.js App Router Request
    const asWeb = req as Request;
    const h =
      asWeb.headers?.get?.('authorization') ||
      asWeb.headers?.get?.('Authorization') ||
      asWeb.headers?.get?.('x-firebase-auth') ||
      asWeb.headers?.get?.('x-id-token') ||
      asWeb.headers?.get?.('x-auth-token');
    if (h) return h as string;
    // Fallback: parse cookie for token or __session
    const cookie = asWeb.headers?.get?.('cookie') || asWeb.headers?.get?.('Cookie');
    if (cookie) {
      const token = parseCookieForToken(cookie as string);
      if (token) return `Bearer ${token}`;
    }
  } catch {}
  try {
    // Pages Router NextApiRequest
    const asApi = req as NextApiRequest;
    const h =
      ((asApi.headers?.authorization || asApi.headers?.Authorization) as string | undefined) ||
      ((asApi.headers?.['x-firebase-auth'] as string | undefined) ?? undefined) ||
      ((asApi.headers?.['x-id-token'] as string | undefined) ?? undefined) ||
      ((asApi.headers?.['x-auth-token'] as string | undefined) ?? undefined);
    if (h) return h;
    const cookie = (asApi.headers?.cookie || asApi.headers?.Cookie) as string | undefined;
    if (cookie) {
      const token = parseCookieForToken(cookie);
      if (token) return `Bearer ${token}`;
    }
  } catch {}
  return undefined;
}

function parseCookieForToken(cookieHeader: string): string | undefined {
  try {
    const parts = cookieHeader.split(/;\s*/);
    const kv: Record<string, string> = {};
    parts.forEach((p) => {
      const idx = p.indexOf('=');
      if (idx > 0) kv[p.slice(0, idx).trim()] = decodeURIComponent(p.slice(idx + 1));
    });
    return kv['token'] || kv['__session'];
  } catch {
    return undefined;
  }
}

/**
 * Verify the current user and return role flags. Throws on invalid tokens.
 */
export async function getUserFromToken(req: Request | NextApiRequest): Promise<AuthUser | null> {
  // Default to bypass auth in development to avoid 401s before server creds are configured.
  // In production, real token verification is always required.
  const devBypass = process.env.NODE_ENV !== 'production' || process.env.DEV_AUTH_BYPASS === '1';
  try {
    const header = readAuthHeader(req);
    if (!header) {
      if (devBypass) return { uid: 'dev-user', isAdmin: false, email: 'dev@example.com' };
      return null;
    }
    const trimmed = header.trim();
    const match = /^Bearer\s+(.+)$/i.exec(trimmed);
    const token = match ? match[1] : trimmed; // allow raw token without Bearer

    try {
      const auth = getAdminApp().auth();
      const decoded = await auth.verifyIdToken(token);
      const uid = decoded.uid;

      // Determine admin via Firestore user profile or custom claims
      const userRef = getAdminDb().collection('users').doc(uid);
      const snap = await userRef.get();
      const data = snap.exists ? (snap.data() as any) : undefined;

      const role = (data?.role || decoded?.role || '').toString().toLowerCase();
      const isAdmin = role === 'admin' || decoded?.admin === true || data?.isAdmin === true;

      return { uid, isAdmin, email: (data?.email as string | null) ?? (decoded?.email as string | null) ?? null };
    } catch {
      if (devBypass) return { uid: 'dev-user', isAdmin: false, email: 'dev@example.com' };
      return null;
    }
  } catch {
    return devBypass ? { uid: 'dev-user', isAdmin: false, email: 'dev@example.com' } : null;
  }
}

export default getUserFromToken;
