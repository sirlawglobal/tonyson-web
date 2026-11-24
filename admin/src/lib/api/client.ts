/**
 * HTTP client for the Tonyson API (admin surface: staff sessions).
 *
 * Session model: a short-lived access token lives only in memory (never localStorage, so XSS cannot read it); the
 * long-lived refresh token is an httpOnly cookie the browser sends to /auth/refresh. When the access token is missing
 * or about to expire the client refreshes first, and if a request still comes back 401 it refreshes once and retries.
 * Many requests failing at once share a single refresh call (refresh tokens are single-use).
 */
import type { ApiErrorBody, AuthResponse } from '@sirlawglobal/contracts';

const RAW_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
export const API_CONFIGURED = RAW_BASE.length > 0;
const API_BASE = `${RAW_BASE}/api/v1`;

const REFRESH_PATH = '/admin/auth/refresh';
/** Remembers that this browser had a staff session, so the login page does not fire a pointless (401) refresh. */
const HINT_KEY = 'tonyson-admin:session-hint';
/** Refresh slightly early so a request never leaves with a token that expires in flight. */
const EXPIRY_SKEW_MS = 30_000;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** First message for a field, e.g. fieldError('email'). */
  fieldError(field: string): string | undefined {
    return this.details?.[field]?.[0];
  }
}

/** Anything thrown that is not already an ApiError, as a message safe to show a user. */
export function errorMessage(e: unknown, fallback = 'Something went wrong. Please try again.'): string {
  return e instanceof ApiError ? e.message : fallback;
}

/* ------------------------------ token state ------------------------------ */
let accessToken: string | null = null;
let expiresAt = 0;
const lostListeners = new Set<() => void>();

const hint = {
  get(): boolean {
    try {
      return localStorage.getItem(HINT_KEY) === '1';
    } catch {
      return false;
    }
  },
  set(on: boolean) {
    try {
      if (on) localStorage.setItem(HINT_KEY, '1');
      else localStorage.removeItem(HINT_KEY);
    } catch {
      /* storage unavailable: the session still works, it just will not survive a reload */
    }
  },
};

export const session = {
  /** Call with the body of login / register / verify. */
  adopt(auth: Pick<AuthResponse, 'accessToken' | 'expiresIn'>) {
    if (!auth.accessToken) return;
    accessToken = auth.accessToken;
    expiresAt = Date.now() + (auth.expiresIn ?? 900) * 1000;
    hint.set(true);
  },
  clear() {
    accessToken = null;
    expiresAt = 0;
    hint.set(false);
  },
  /** True if this browser probably has a session worth restoring on page load. */
  mightHaveSession: () => accessToken !== null || hint.get(),
  hasToken: () => accessToken !== null,
  /** Called when the session is definitively gone (refresh refused). Returns an unsubscribe function. */
  onLost(fn: () => void) {
    lostListeners.add(fn);
    return () => void lostListeners.delete(fn);
  },
};

function sessionLost() {
  session.clear();
  lostListeners.forEach((fn) => fn());
}

/* -------------------------------- refresh -------------------------------- */
type RefreshOutcome = 'ok' | 'lost' | 'unavailable';
let refreshing: Promise<RefreshOutcome> | null = null;

/** Concurrent callers share one network call. 'lost' = the server says there is no session; 'unavailable' = could not tell. */
function refreshOutcome(): Promise<RefreshOutcome> {
  refreshing ??= doRefresh().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/** True if a fresh access token is now held. */
export async function refreshSession(): Promise<boolean> {
  return (await refreshOutcome()) === 'ok';
}

async function doRefresh(): Promise<RefreshOutcome> {
  if (!API_CONFIGURED) return 'lost';
  try {
    const res = await fetch(`${API_BASE}${REFRESH_PATH}`, { method: 'POST', credentials: 'include' });
    if (res.status === 401 || res.status === 403) {
      sessionLost();
      return 'lost';
    }
    if (!res.ok) return 'unavailable'; // server trouble: keep what we have, the next call will try again
    session.adopt((await res.json()) as { accessToken: string; expiresIn: number });
    return 'ok';
  } catch {
    return 'unavailable'; // offline is not the same as signed out
  }
}

/** Makes sure a usable access token is held, or throws the right error for why not. */
async function ensureToken(): Promise<void> {
  const outcome = await refreshOutcome();
  if (outcome === 'ok') return;
  if (outcome === 'lost') throw new ApiError('Please sign in to continue', 401, 'UNAUTHENTICATED');
  throw new ApiError('Cannot reach the server. Check your connection and try again.', 0, 'NETWORK');
}

/* -------------------------------- requests -------------------------------- */
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Attach the access token (default). Pass false for public endpoints such as login. */
  auth?: boolean;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

async function toError(res: Response): Promise<ApiError> {
  let body: Partial<ApiErrorBody> = {};
  try {
    body = (await res.json()) as Partial<ApiErrorBody>;
  } catch {
    /* non-JSON error page (proxy, gateway) */
  }
  const retry = res.headers.get('Retry-After');
  const message =
    res.status === 429 && retry ? `${body.message ?? 'Too many requests'} Try again in ${retry} seconds.` : (body.message ?? 'Something went wrong. Please try again.');
  return new ApiError(message, res.status, body.code ?? (res.status === 401 ? 'UNAUTHENTICATED' : 'INTERNAL'), body.details);
}

async function send(path: string, o: RequestOptions, token: string | null): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json', ...o.headers };
  if (o.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${API_BASE}${path}`, {
    method: o.method ?? 'GET',
    headers,
    body: o.body !== undefined ? JSON.stringify(o.body) : undefined,
    credentials: 'include', // the refresh cookie must travel on login/logout/refresh
    signal: o.signal,
  });
}

export async function request<T>(path: string, o: RequestOptions = {}): Promise<T> {
  if (!API_CONFIGURED) {
    throw new ApiError('The API address is not configured (set NEXT_PUBLIC_API_URL).', 0, 'NOT_CONFIGURED');
  }
  const useAuth = o.auth ?? true;

  if (useAuth && (accessToken === null || Date.now() > expiresAt - EXPIRY_SKEW_MS)) {
    await ensureToken();
  }

  let res: Response;
  try {
    res = await send(path, o, useAuth ? accessToken : null);
    if (res.status === 401 && useAuth) {
      // The token was rejected (revoked, or the clock drifted): one refresh, one retry.
      await ensureToken();
      res = await send(path, o, accessToken);
    }
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0, 'NETWORK');
  }

  if (!res.ok) {
    if (res.status === 401 && useAuth) sessionLost();
    throw await toError(res);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const http = {
  get: <T>(path: string, o?: Omit<RequestOptions, 'method' | 'body'>) => request<T>(path, { ...o, method: 'GET' }),
  post: <T>(path: string, body?: unknown, o?: Omit<RequestOptions, 'method' | 'body'>) => request<T>(path, { ...o, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, o?: Omit<RequestOptions, 'method' | 'body'>) => request<T>(path, { ...o, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, o?: Omit<RequestOptions, 'method' | 'body'>) => request<T>(path, { ...o, method: 'PUT', body }),
  delete: <T>(path: string, o?: Omit<RequestOptions, 'method' | 'body'>) => request<T>(path, { ...o, method: 'DELETE' }),
};

/** Retry policy for TanStack Query: never retry a 4xx (it will not change), retry network/5xx once. */
export const shouldRetry = (failureCount: number, error: unknown): boolean => {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 1;
};
