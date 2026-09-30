/**
 * Generic fixed-window rate limiter keyed by client IP.
 *
 * Used to throttle endpoints that are reachable without a session. The lockout
 * in `loginRateLimit.ts` is deliberately not reused here: that one keys on
 * (email, ip) and locks a user out of their own account, which would be harmful
 * for an anonymous lookup that merely reports whether a name is free.
 */

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

function sweep(now: number): void {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

/**
 * Register a hit for `key`.
 * Returns the number of milliseconds until the caller may try again — 0 when
 * the request is allowed.
 */
export function hit(key: string, limit: number, windowMs: number): number {
  const now = Date.now();
  sweep(now);

  const existing = windows.get(key);
  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return 0;
  }

  if (existing.count >= limit) {
    return existing.resetAt - now;
  }

  existing.count += 1;
  return 0;
}
