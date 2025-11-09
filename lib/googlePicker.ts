type Nullable<T> = T | null | undefined;

export interface PickedDriveFile {
  id: string;
  name: string;
  url?: string;
  mimeType?: string;
}

// Google libraries
const GOOGLE_API_SRC = 'https://apis.google.com/js/api.js'; // gapi (Picker)
const GOOGLE_GSI_SRC = 'https://accounts.google.com/gsi/client'; // Google Identity Services (OAuth2)

// Env configuration
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

// OAuth scope for read-only Drive access (download file content)
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

declare global {
  interface Window {
    gapi?: any;
    google?: any;
  }
}

// Minimal types for GIS token flow
type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number | string;
  error?: string;
  error_description?: string;
};

type GoogleTokenClient = {
  callback: (resp: GoogleTokenResponse) => void;
  requestAccessToken: (options?: { prompt?: string }) => void;
};

/** Ensure the Google API script (gapi) is loaded. */
async function loadGoogleApiScript(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (window.gapi && window.google) return;

  const existing = document.querySelector(`script[src="${GOOGLE_API_SRC}"]`) as Nullable<HTMLScriptElement>;
  if (existing) {
    await new Promise<void>((resolve, reject) => {
      if ((existing as any).dataset.loaded === 'true') return resolve();
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google API script')));
    });
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = GOOGLE_API_SRC;
    s.async = true;
    (s as any).dataset.loaded = 'false';
    s.onload = () => {
      (s as any).dataset.loaded = 'true';
      resolve();
    };
    s.onerror = () => reject(new Error('Failed to load Google API script'));
    document.head.appendChild(s);
  });
}

/** Ensure the Google Identity Services script is loaded. */
async function loadGsiScript(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (window.google?.accounts?.oauth2) return;

  const existing = document.querySelector(`script[src="${GOOGLE_GSI_SRC}"]`) as Nullable<HTMLScriptElement>;
  if (existing) {
    await new Promise<void>((resolve, reject) => {
      if ((existing as any).dataset.loaded === 'true') return resolve();
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity script')));
    });
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = GOOGLE_GSI_SRC;
    s.async = true;
    (s as any).dataset.loaded = 'false';
    s.onload = () => {
      (s as any).dataset.loaded = 'true';
      resolve();
    };
    s.onerror = () => reject(new Error('Failed to load Google Identity script'));
    document.head.appendChild(s);
  });
}

/** Load the Picker module via gapi. */
async function loadPickerModule(): Promise<void> {
  if (!window.gapi) throw new Error('gapi not available');
  await new Promise<void>((resolve, reject) => {
    try {
      window.gapi.load('picker', { callback: () => resolve() });
    } catch (e) {
      reject(e as Error);
    }
  });
}

// Cached OAuth state (token + expiry) to enable silent refreshes
let tokenClient: GoogleTokenClient | null = null;
let cachedToken: { token: string; expiresAt: number } | null = null;

function ensureEnv(): void {
  if (!GOOGLE_API_KEY) {
    console.warn('[GooglePicker] NEXT_PUBLIC_GOOGLE_API_KEY is not set');
  }
  if (!GOOGLE_CLIENT_ID) {
    console.warn('[GooglePicker] NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set');
  }
}

/** Initialize the GIS token client if needed. */
async function ensureTokenClient(): Promise<void> {
  await loadGsiScript();
  if (tokenClient) return;
  if (!window.google?.accounts?.oauth2) throw new Error('Google Identity Services not available');

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: DRIVE_SCOPE,
    // callback is assigned per-request in getAccessToken to capture the Promise resolve
    callback: () => {},
  });
}

/**
 * Acquire an OAuth access token, prompting the account chooser on the first run.
 * Subsequent calls refresh silently until the token nears expiration.
 */
async function getAccessToken(): Promise<string> {
  if (typeof window === 'undefined') throw new Error('Must run in browser');
  ensureEnv();
  await ensureTokenClient();

  // Reuse token if still valid (60s leeway)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  return await new Promise<string>((resolve, reject) => {
    try {
      if (!tokenClient) return reject(new Error('Token client not initialized'));
      let attemptedSilent = false;
      const handle = (resp: any) => {
        try {
          if (resp?.error) {
            // If silent attempt failed, retry with account chooser
            // if (!attemptedSilent) {
            //   attemptedSilent = true;
            //   try {
            //     tokenClient.requestAccessToken({ prompt: 'select_account' });
            //     return; // wait for next callback
            //   } catch (e) {
            //     return reject(e as Error);
            //   }
            // }
            return reject(new Error(resp.error_description || resp.error));
          }
          const token = String(resp.access_token || '');
          const expiresIn = Number(resp.expires_in || 3600); // seconds
          if (!token) return reject(new Error('No access_token received'));
          cachedToken = {
            token,
            expiresAt: Date.now() + Math.max(1, expiresIn - 30) * 1000,
          };
          resolve(token);
        } catch (err) {
          reject(err as Error);
        }
      };
      tokenClient.callback = handle;
      // First time: show account chooser; later: try silent (no prompt)
      const shouldPrompt = !cachedToken;
      if (shouldPrompt) {
        tokenClient.requestAccessToken({ prompt: 'select_account' });
      } else {
        attemptedSilent = true;
        tokenClient.requestAccessToken({});
      }
    } catch (e) {
      reject(e as Error);
    }
  });
}

/**
 * Opens the Google Drive Picker restricted to PDFs and resolves the selected file + access token.
 * Returns { picked: null, accessToken } if the user cancels.
 */
export async function openGoogleDrivePicker(): Promise<{ picked: PickedDriveFile | null; accessToken: string | null }> {
  if (typeof window === 'undefined') {
    throw new Error('[GooglePicker] Must be called in the browser');
  }
  ensureEnv();

  try {
    await loadGoogleApiScript();
    await loadPickerModule();
  } catch (e) {
    console.error('[GooglePicker] Failed to load scripts', e);
    throw new Error('Failed to load Google API or Picker module');
  }

  let token: string;
  try {
    token = await getAccessToken();
  } catch (e) {
    console.error('[GooglePicker] Failed to acquire OAuth token', e);
    throw new Error('Failed to authenticate with Google');
  }

  return new Promise<{ picked: PickedDriveFile | null; accessToken: string | null }>((resolve) => {
    try {
      const googleNS = window.google;
      if (!googleNS?.picker) throw new Error('google.picker is not available');

      const view = new googleNS.picker.DocsView(googleNS.picker.ViewId.DOCS)
        .setIncludeFolders(false)
        .setMimeTypes('application/pdf');

      const cb = (data: any) => {
        if (data?.action === googleNS.picker.Action.PICKED) {
          const doc = (data.docs && data.docs[0]) || null;
          const picked: PickedDriveFile | null = doc
            ? {
                id: String(doc.id || ''),
                name: String(doc.name || ''),
                url:
                  ((doc.url || doc.viewUrl || doc.embedUrl || undefined) as Nullable<string>) || undefined,
                mimeType: (doc.mimeType as Nullable<string>) || undefined,
              }
            : null;
          resolve({ picked, accessToken: token || null });
        } else if (data?.action === googleNS.picker.Action.CANCEL) {
          resolve({ picked: null, accessToken: token || null });
        }
      };

      const builder = new googleNS.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(token)
        .setDeveloperKey(GOOGLE_API_KEY)
        .setOrigin(window.location.origin)
        .setCallback(cb);

      try {
        if (typeof builder['setSelectableMimeTypes'] === 'function') {
          builder['setSelectableMimeTypes']('application/pdf');
        }
      } catch {}

      const picker = builder.build();
      picker.setVisible(true);
    } catch (e) {
      console.error('[GooglePicker] Error building picker', e);
      resolve({ picked: null, accessToken: token || null });
    }
  });
}

/** Download a Drive file as a Blob using the OAuth access token. */
export async function downloadDriveFileAsBlob(fileId: string, accessToken: string): Promise<Blob> {
  if (!fileId) throw new Error('[GooglePicker] Missing fileId');
  if (!accessToken) throw new Error('[GooglePicker] Missing access token');
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`[GooglePicker] Download failed: ${res.status}`);
  }
  return await res.blob();
}
