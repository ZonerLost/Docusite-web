import { NextResponse } from 'next/server';
import { google } from 'googleapis';

function json(data: unknown, init?: number | ResponseInit) {
  return NextResponse.json(data, init as any);
}

function logError(context: string, err: unknown, extra?: Record<string, unknown>) {
  const anyErr = err as any;
  const payload = {
    context,
    message: anyErr?.message || String(err),
    code: anyErr?.code,
    name: anyErr?.name,
    ...extra,
  };
  console.error('[api/google/drive-token]', payload);
  if (anyErr?.response?.data) {
    console.error('[api/google/drive-token] response.data', anyErr.response.data);
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code') || '';

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN || '';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${url.origin}/api/google/drive-token`;

  if (!clientId || !clientSecret) {
    logError('missing_client_credentials', null, { hasClientId: !!clientId, hasClientSecret: !!clientSecret });
    return json({ error: 'Server misconfigured: missing Google client credentials' }, { status: 500 });
  }

  // Initialize OAuth2 client
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  try {
    if (code) {
      // Exchange authorization code for tokens
      console.log('[api/google/drive-token] exchanging authorization code for tokens');
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      const response = {
        accessToken: tokens.access_token || null,
        refreshToken: tokens.refresh_token || null,
        expiryDate: tokens.expiry_date || null,
      };
      console.log('[api/google/drive-token] token exchange success', {
        hasAccess: !!response.accessToken,
        hasRefresh: !!response.refreshToken,
        hasExpiry: !!response.expiryDate,
      });
      return json(response);
    }

    // If no code is provided, attempt to use a configured refresh token
    if (!refreshToken) {
      console.warn('[api/google/drive-token] missing code and no server refresh token configured');
      return json({ error: 'Missing authorization code or server refresh token' }, { status: 400 });
    }

    console.log('[api/google/drive-token] acquiring access token via refresh token');
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const tokenResp = await oauth2Client.getAccessToken();
    const accessToken = typeof tokenResp === 'string' ? tokenResp : tokenResp?.token || null;

    if (!accessToken) {
      logError('refresh_token_no_access_token', null);
      return json({ error: 'Failed to acquire Google access token' }, { status: 500 });
    }

    console.log('[api/google/drive-token] acquired access token via refresh token');
    return json({ accessToken });
  } catch (e) {
    logError('token_exchange_failed', e, { hasCode: !!code, usingRefresh: !code && !!refreshToken });
    return json({ error: `Failed to get Google access token` }, { status: 500 });
  }
}
