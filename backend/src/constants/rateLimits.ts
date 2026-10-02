/**
 * Central configuration for every request-rate limit in the API.
 *
 * Each limit reads its value from the environment and falls back to a sensible
 * default, so nothing has to be edited and redeployed to change a limit. Keep
 * new limits here rather than as constants in the route that uses them —
 * otherwise they drift apart and only some of them are tunable.
 *
 * Documented in `.env.example`.
 */

/** Reads a positive integer from the environment, or returns the fallback. */
function intFromEnv(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

// ── Login throttling (per account, and per IP) ──────────────────────────────

/** Failed logins allowed for one (email, ip) pair before it locks. */
export const MAX_LOGIN_ATTEMPTS = () => intFromEnv('MAX_LOGIN_ATTEMPTS', 5);

/** How long a login lockout lasts. */
export const LOGIN_LOCKOUT_MS = () => intFromEnv('LOGIN_LOCKOUT_MINUTES', 15) * 60_000;

/**
 * Failed logins allowed for one IP across any address. Stops an attacker
 * sidestepping the per-account limit by rotating emails. Deliberately several
 * times higher than the per-account limit so a shared NAT or office
 * connection is not locked out by a few unrelated people mistyping.
 */
export const MAX_LOGIN_ATTEMPTS_PER_IP = () =>
  intFromEnv('MAX_LOGIN_ATTEMPTS_PER_IP', Math.max(MAX_LOGIN_ATTEMPTS() * 4, 20));

// ── Registration availability lookup (anonymous, per IP) ─────────────────────

/**
 * Requests allowed per IP per window against `/auth/check-availability`.
 *
 * That endpoint is reachable without a session and answers whether a username
 * or email is registered, so it is also a way to enumerate accounts. The limit
 * is generous enough for the sign-up form, which debounces to one call per
 * field, and tight enough that the endpoint cannot be walked in bulk.
 */
export const AVAILABILITY_RATE_LIMIT = () => intFromEnv('AVAILABILITY_RATE_LIMIT', 30);

/** Window the availability limit applies over, in milliseconds. */
export const AVAILABILITY_RATE_WINDOW_MS = () =>
  intFromEnv('AVAILABILITY_RATE_WINDOW_SECONDS', 60) * 1000;