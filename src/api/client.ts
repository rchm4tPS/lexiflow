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
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

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
    } else {
      const text = await response.text();
      console.error("Non-JSON response:", text);
      if (response.status === 401) emitAuthFailure('invalid');
      throw new ApiFieldError('Server returned an unexpected response. Please try again.');
    }
  }

  return response.json();
};
