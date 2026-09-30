/**
 * Auth failure notifications.
 *
 * Deliberately dependency-free: `apiClient` needs to tell the auth store that
 * a request came back 401, but the store already imports the service layer
 * that wraps `apiClient`. Routing the signal through the DOM event bus breaks
 * that cycle without a framework-level solution.
 */

export type AuthFailureReason = 'expired' | 'invalid' | 'missing';

export const AUTH_FAILURE_EVENT = 'lexiflow:auth-failure';

export function emitAuthFailure(reason: AuthFailureReason): void {
  window.dispatchEvent(new CustomEvent<AuthFailureReason>(AUTH_FAILURE_EVENT, { detail: reason }));
}

export function onAuthFailure(handler: (reason: AuthFailureReason) => void): () => void {
  const listener = (event: Event) => handler((event as CustomEvent<AuthFailureReason>).detail);
  window.addEventListener(AUTH_FAILURE_EVENT, listener);
  return () => window.removeEventListener(AUTH_FAILURE_EVENT, listener);
}
