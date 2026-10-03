import { emitAuthFailure } from './authEvents';

export const BASE_URL = '/api/v1';

/** Endpoints that are allowed to answer 401 without ending the session. */
const AUTH_ENTRYPOINTS = ['/auth/login', '/auth/register'];

/**
 * Bumped whenever the session ends (logout, expiry, forced sign-out).
 *
 * Without this, a request dispatched while authenticated can resolve *after*
 * the user has signed out and write the previous account's data back into the
 * stores, undoing the reset that just ran. Bumping the epoch orphans every
 * in-flight request at one point in the transport layer, rather than guarding
 * each caller.
 */
let sessionEpoch = 0;

export function invalidateInFlightRequests(): void {
  sessionEpoch += 1;
}

/**
 * An error carrying the server's per-field messages, so a form can place each
 * one next to the input it belongs to instead of collapsing them into a banner.
 */
export class ApiFieldError extends Error {
  fieldErrors: Record<string, string>;
  code?: string;
  /** Seconds to wait, for throttled endpoints. */
  retryAfter?: number;

  constructor(
    message: string,
    fieldErrors: Record<string, string> = {},
    code?: string,
    retryAfter?: number,
  ) {
    super(message);
    this.name = 'ApiFieldError';
    this.fieldErrors = fieldErrors;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

/** Shown when the request never reached a server at all. */
const NETWORK_ERROR_MESSAGE =
  "Can't reach the server. Check your connection and try again.";

/**
 * User-facing text for a response that never became JSON, or that was a gateway
 * error. A dev proxy answering "502 Bad Gateway" means the backend was not
 * running; telling the user "unexpected response" makes that sound like an
 * application fault, which it is not.
 */
function unparsedResponseMessage(status: number): string {
  if (status === 502 || status === 503 || status === 504) {
    return 'The server is temporarily unavailable. Please try again in a moment.';
  }
  if (status >= 500) {
    return 'Something went wrong on our side. Please try again in a moment.';
  }
  return 'Server returned an unexpected response. Please try again.';
}

/** Truncated so a stray HTML error page cannot flood the console. */
function bodyPreview(body: string, limit = 300): string {
  const trimmed = body.trim();
  return trimmed.length > limit ? `${trimmed.slice(0, limit)}…` : trimmed;
}

export const apiClient = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('lingq_token');

  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    'x-timezone-offset': new Date().getTimezoneOffset().toString(),
    ...options.headers,
  };

  const epoch = sessionEpoch;
  const method = options.method ?? 'GET';

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (cause) {
    // The request never reached a server: backend down mid-flight, CORS
    // rejection, offline. Without this the raw "Failed to fetch" TypeError
    // reached the user.
    console.error(`[api] ${method} ${endpoint} → network failure`, cause);
    throw new ApiFieldError(NETWORK_ERROR_MESSAGE, {}, 'NETWORK_ERROR');
  }

  // The session ended while this was in flight. Throwing keeps the response
  // from reaching any caller that would write it into a store.
  if (epoch !== sessionEpoch) {
    throw new ApiFieldError('Your session has ended. Please sign in again.');
  }

  if (!response.ok) {
    if (response.headers.get('content-type')?.includes('application/json')) {
      const error = await response.json().catch(() => null);
      const message: string = error?.error || 'API Request Failed';
      const fieldErrors: Record<string, string> = error?.errors ?? {};
      const code: string | undefined = error?.code;
      const retryAfter: number | undefined = error?.retryAfter;

      // A 401 on a protected route means the stored token is no longer usable
      // (expired, tampered with, or hand-edited). End the session right away
      // instead of letting the UI sit in a half-authenticated state until the
      // next hard refresh. The auth store listens for this and redirects.
      if (response.status === 401 && !AUTH_ENTRYPOINTS.some(p => endpoint.startsWith(p))) {
        const reason = code === 'TOKEN_EXPIRED' ? 'expired' : token ? 'invalid' : 'missing';
        emitAuthFailure(reason);
      }

      throw new ApiFieldError(message, fieldErrors, code, retryAfter);
    }

    // Not JSON. A dev proxy's "502 Bad Gateway" lands here with an empty or
    // HTML body — log enough to tell that apart from an application fault.
    const body = await response.text();
    console.error(
      `[api] ${method} ${endpoint} → ${response.status} ${response.statusText}` +
      ` (content-type: ${response.headers.get('content-type') ?? 'none'})` +
      ` body: ${JSON.stringify(bodyPreview(body))}`,
    );
    if (response.status === 401) emitAuthFailure('invalid');
    throw new ApiFieldError(
      unparsedResponseMessage(response.status),
      {},
      `HTTP_${response.status}`,
    );
  }

  try {
    return await response.json();
  } catch (cause) {
    // A 200 whose body is not JSON. Left unhandled this surfaces as a raw
    // "Unexpected token < in JSON" at the call site.
    console.error(`[api] ${method} ${endpoint} → 200 but body was not JSON`, cause);
    throw new ApiFieldError(
      'Server returned an unexpected response. Please try again.',
      {},
      'BAD_RESPONSE',
    );
  }
};
