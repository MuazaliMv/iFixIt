'use client';

/**
 * Shared browser API client for authenticated FixIt requests.
 *
 * Authentication is server-managed and OTP-backed:
 * Browser -> HttpOnly auth cookies -> same-origin Next.js API -> Supabase.
 *
 * Browser Supabase sessions are never promoted into application sessions.
 */

type ApiRequestInit = RequestInit & {
  /** Disable the one-time session validation/retry for endpoints that should not retry. */
  retryAuth?: boolean;
};

let sessionRecovery: Promise<boolean> | null = null;
let profileRequest: Promise<Response> | null = null;
let profileCache: { body: string; status: number; statusText: string; headers: [string, string][]; expiresAt: number } | null = null;
const PROFILE_CACHE_MS = 15_000;

function inputPath(input: RequestInfo | URL) {
  return typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;
}

function isSessionEndpoint(input: RequestInfo | URL) {
  const value = inputPath(input);
  return value === '/api/auth/session' ||
    value.startsWith('/api/auth/session?') ||
    value === '/api/auth/session/sync' ||
    value.startsWith('/api/auth/session/sync?');
}

function isProfileEndpoint(input: RequestInfo | URL) {
  const value = inputPath(input);
  return value === '/api/user/profile' || value.startsWith('/api/user/profile?');
}

function isGetRequest(init: ApiRequestInit = {}) {
  return !init.method || String(init.method).toUpperCase() === 'GET';
}

function responseFromProfileCache() {
  if (!profileCache || profileCache.expiresAt <= Date.now()) {
    profileCache = null;
    return null;
  }
  return new Response(profileCache.body, {
    status: profileCache.status,
    statusText: profileCache.statusText,
    headers: profileCache.headers,
  });
}

async function rememberProfileResponse(response: Response) {
  const body = await response.clone().text();
  profileCache = {
    body,
    status: response.status,
    statusText: response.statusText,
    headers: Array.from(response.headers.entries()),
    expiresAt: Date.now() + PROFILE_CACHE_MS,
  };
  return response;
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

async function recoverSession(): Promise<boolean> {
  if (!sessionRecovery) {
    sessionRecovery = checkServerSession().finally(() => {
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

async function performApiFetch(input: RequestInfo | URL, init: ApiRequestInit = {}): Promise<Response> {
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

/**
 * Fetch a same-origin API route using the secure HttpOnly-cookie session.
 * A 401 gets one serialized server-session validation attempt, then the request is retried once.
 * Profile reads are additionally deduplicated and briefly cached so global shell
 * components do not race the same endpoint during route transitions.
 */
export async function apiFetch(input: RequestInfo | URL, init: ApiRequestInit = {}): Promise<Response> {
  if (isProfileEndpoint(input) && isGetRequest(init)) {
    const cached = responseFromProfileCache();
    if (cached) return cached;

    if (!profileRequest) {
      profileRequest = performApiFetch(input, init)
        .then(rememberProfileResponse)
        .finally(() => {
          profileRequest = null;
        });
    }

    return (await profileRequest).clone();
  }

  return performApiFetch(input, init);
}

/** Explicitly clear cached profile data after role/profile/auth mutations. */
export function invalidateProfileCache(): void {
  profileCache = null;
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
  profileCache = null;
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  }).catch(() => undefined);
}
