/**
 * In-memory brute-force protection for POST /auth/login.
 *
 * Failures are counted per (email, ip) pair. Once the threshold is reached the
 * pair is locked for a cooling-off period and further password checks are
 * skipped entirely, so bcrypt is not used as a DoS amplifier.
 *
 * A second, looser bucket counts failures by IP alone. The (email, ip) key on
 * its own can be sidestepped by rotating through addresses, and it cannot answer
 * "is this browser locked out?" before the user has typed one — which is
 * exactly the state a freshly refreshed page is in.
 *
 * The store is per-process. That is enough for a single-instance deployment;
 * a multi-instance one would move this to shared storage (Redis) keyed the
 * same way — the exported API would not change.
 */

interface AttemptRecord {
  failures: number;
  lockoutUntil: number;
}

type Store = Map<string, AttemptRecord>;

const attempts: Store = new Map();
const ipAttempts: Store = new Map();

function intFromEnv(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

// Read from env on every access so dotenv ordering (and tests) cannot leave a
// stale value baked in at module load.
function maxAttempts(): number {
  return intFromEnv('MAX_LOGIN_ATTEMPTS', 5);
}

function lockoutMs(): number {
  return intFromEnv('LOGIN_LOCKOUT_MINUTES', 15) * 60 * 1000;
}

/**
 * Threshold for the IP-wide bucket. Intentionally several times the per-account
 * limit — it exists to stop address-rotation, not to punish one person who
 * mistypes their password a few times on a shared connection.
 */
function ipMaxAttempts(): number {
  return intFromEnv('MAX_LOGIN_ATTEMPTS_PER_IP', Math.max(maxAttempts() * 4, 20));
}

/** Drop entries whose lockout has lapsed and that have no failures left. */
function prune(store: Store, now: number): void {
  for (const [key, record] of store) {
    if (record.lockoutUntil <= now && record.failures === 0) store.delete(key);
    else if (record.lockoutUntil <= now && record.failures > 0) record.lockoutUntil = 0;
  }
}

function recordFailure(store: Store, key: string, limit: number): void {
  const now = Date.now();
  prune(store, now);
  const record = store.get(key) ?? { failures: 0, lockoutUntil: 0 };
  record.failures += 1;
  if (record.failures >= limit) {
    record.lockoutUntil = now + lockoutMs();
  }
  store.set(key, record);
}

function remainingMs(store: Store, key: string): number {
  const record = store.get(key);
  if (!record) return 0;
  const remaining = record.lockoutUntil - Date.now();
  return remaining > 0 ? remaining : 0;
}

function remainingAttempts(store: Store, key: string, limit: number): number {
  const record = store.get(key);
  if (!record) return limit;
  if (remainingMs(store, key) > 0) return 0;
  return Math.max(0, limit - record.failures);
}

export function attemptKey(email: unknown, ip: unknown): string {
  const normalisedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  return `${normalisedEmail}|${typeof ip === 'string' ? ip : 'unknown'}`;
}

export function ipKey(ip: unknown): string {
  return typeof ip === 'string' ? ip : 'unknown';
}

/** Milliseconds of lockout left, or 0 when the pair may attempt a login. */
export function getLockoutMs(key: string): number {
  // Whichever bucket is still holding, so a caller gets the stricter answer.
  return Math.max(remainingMs(attempts, key), remainingMs(ipAttempts, ipKey(key.split('|').pop())));
}

export function isLockedOut(key: string): boolean {
  return getLockoutMs(key) > 0;
}

/** Record one failed attempt against both buckets; clears the per-account one on success. */
export function registerFailure(key: string): void {
  recordFailure(attempts, key, maxAttempts());
  recordFailure(ipAttempts, ipKey(key.split('|').pop()), ipMaxAttempts());
}

/** Clear the per-account record after a successful login. */
export function clearFailures(key: string): void {
  attempts.delete(key);
}

/** Attempts remaining before lockout — lets the UI warn ahead of the limit. */
export function attemptsRemaining(key: string): number {
  return remainingAttempts(attempts, key, maxAttempts());
}

/**
 * Everything the client needs to render a countdown, in one call.
 *
 * The UI needs this on page load: without it a user who refreshes mid-lockout
 * sees a normal login form and only discovers the lockout by failing a login
 * they were always going to be refused.
 *
 * When `email` is omitted the IP-wide bucket is consulted, which is the state a
 * refreshed page with an empty email field can actually be in.
 */
export function getLockoutStatus(email: unknown, ip: unknown): {
  lockedOut: boolean;
  retryAfterMs: number;
  attemptsRemaining: number;
} {
  const pairKey = attemptKey(email, ip);
  const wideKey = ipKey(ip);
  const remaining = Math.max(remainingMs(attempts, pairKey), remainingMs(ipAttempts, wideKey));
  return {
    lockedOut: remaining > 0,
    retryAfterMs: remaining,
    attemptsRemaining: remainingAttempts(attempts, pairKey, maxAttempts()),
  };
}
