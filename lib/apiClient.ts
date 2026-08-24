'use client';

/**
 * Shared browser API client for authenticated FixIt requests.
 *
 * Authentication stays server-managed:
 * Browser -> HttpOnly auth cookies -> same-origin Next.js API -> Supabase.
 *
 * A temporary compatibility bridge is kept for older browser Supabase sessions
 * so an already signed-in user can move between Customer and Provider workspaces
 * without being sent back to the login screen.
 */

type ApiRequestInit = RequestInit & {
  /** Disable the one-time session recovery/retry for endpoints that should not retry. */
  retryAuth?: boolean;
};

let sessionRecovery: Promise<boolean> | null = null;

function isSessionEndpoint(input: RequestInfo | URL) {
  const value = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;
  return value === '/api/auth/session' ||
    value.startsWith('/api/auth/session?') ||
    value === '/api/auth/session/sync' ||
    value.startsWith('/api/auth/session/sync?');
}

async function checkServerSession(): Promise<boolean> {
  return fetch('/api/auth/session', {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
    .then((response) => response.ok)
    .catch(() => false);
}

async function syncLegacyBrowserSession(): Promise<boolean> {
  try {
    const { supabase } = await import('./supabaseClient');
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.access_token) return false;

    const response = await fetch('/api/auth/session/sync', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token || null,
        expiresIn: data.session.expires_in || 3600,
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

async function recoverSession(): Promise<boolean> {
  if (!sessionRecovery) {
    sessionRecovery = (async () => {
      // First let the secure HttpOnly-cookie session validate/refresh itself.
      if (await checkServerSession()) return true;

      // Older signed-in screens may still have a valid Supabase browser session.
      // Re-hydrate the secure same-origin cookie session once, then continue
      // without asking the user to sign in again.
      if (!(await syncLegacyBrowserSession())) return false;
      return checkServerSession();
    })().finally(() => {
      sessionRecovery = null;
    });
  }

  return sessionRecovery;
}

function withDefaults(init: ApiRequestInit = {}): RequestInit {
  const { retryAuth: _retryAuth, ...requestInit } = init;
  const headers = new Headers(requestInit.headers);

  if (!headers.has('Accept')) headers.set('Accept', 'application/json');

  return {
    ...requestInit,
    headers,
    credentials: requestInit.credentials ?? 'same-origin',
    cache: requestInit.cache ?? 'no-store',
  };
}

/**
 * Fetch a same-origin API route using the secure HttpOnly-cookie session.
 * A 401 gets one serialized session-recovery attempt, then the request is retried once.
 */
export async function apiFetch(input: RequestInfo | URL, init: ApiRequestInit = {}): Promise<Response> {
  const requestInit = withDefaults(init);
  const response = await fetch(input, requestInit);

  if (
    response.status !== 401 ||
    init.retryAuth === false ||
    isSessionEndpoint(input)
  ) {
    return response;
  }

  const recovered = await recoverSession();
  if (!recovered) return response;

  return fetch(input, requestInit);
}

/** Convenience helper for JSON APIs while preserving the Response on errors. */
export async function apiJson<T>(input: RequestInfo | URL, init: ApiRequestInit = {}): Promise<{ response: Response; data: T | null }> {
  const response = await apiFetch(input, init);
  const data = await response.json().catch(() => null) as T | null;
  return { response, data };
}

/**
 * Explicit secure logout. Server cookies are authoritative; callers can redirect afterwards.
 */
export async function apiLogout(): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  }).catch(() => undefined);
}
