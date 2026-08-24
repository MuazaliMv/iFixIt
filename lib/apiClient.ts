'use client';

/**
 * Shared browser API client for authenticated FixIt requests.
 *
 * Authentication stays server-managed:
 * Browser -> HttpOnly auth cookies -> same-origin Next.js API -> Supabase.
 *
 * Do not read, persist, or attach Supabase access/refresh tokens here.
 */

type ApiRequestInit = RequestInit & {
  /** Disable the one-time session recovery/retry for endpoints that should not retry. */
  retryAuth?: boolean;
};

let sessionRecovery: Promise<boolean> | null = null;

function isSessionEndpoint(input: RequestInfo | URL) {
  const value = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;
  return value === '/api/auth/session' || value.startsWith('/api/auth/session?');
}

async function recoverSession(): Promise<boolean> {
  if (!sessionRecovery) {
    sessionRecovery = fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
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
