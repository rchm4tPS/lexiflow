// TODO: [RESPONSIVE] Halaman LoginView belum di-responsivekan untuk layar mobile/tablet.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore, LAST_EMAIL_KEY } from '../store/useAuthStore';
import { ApiFieldError } from '../api/client';
import type { AuthFailureReason } from '../api/authEvents';
import { validateEmail, validatePassword, type FieldErrors } from '../features/auth/validation';
import { UserService } from '../services/userService';

/** Copy for the notice shown when the app bounced us back here. */
const SESSION_ENDED_NOTICE: Record<AuthFailureReason, string> = {
  expired: 'Your session has expired. Please log in again to continue.',
  invalid: 'Your session is no longer valid. Please log in again.',
  missing: 'Please log in to continue.',
};

/**
 * Remembered so a refresh mid-lockout still knows which account to ask about.
 * The key itself lives in the auth store, which owns it and clears it whenever
 * the session that typed it ends.
 */

/** How long typing must pause before re-asking about the lockout. */
const LOCKOUT_DEBOUNCE_MS = 400;

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.ceil(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export default function LoginView() {
  const { login, sessionEndedReason, clearSessionEndedReason } = useAuthStore();

  const [email, setEmail] = useState(() => localStorage.getItem(LAST_EMAIL_KEY) ?? '');
  const [password, setPassword] = useState('');
  // Local to this component and independent of focus, so the eye stays put.
  const [revealPassword, setRevealPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  /** Errors keyed by field, so each renders next to its own input. */
  const [errors, setErrors] = useState<FieldErrors>({});
  // Failures that belong to no single field (bad credentials, network, server).
  const [formError, setFormError] = useState('');
  // Seconds left on a server-side lockout; 0 means "you may try again".
  const [lockedFor, setLockedFor] = useState(0);
  // Attempts left before the server locks this account out, so the user can
  // see the limit approaching rather than discovering it by hitting it.
  const [remainingHint, setRemainingHint] = useState<number | null>(null);

  const isLockedOut = lockedFor > 0;
  const emailValid = !validateEmail(email);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Distinguishes the in-flight lockout lookups so a slow reply for an old
  // email cannot disable a countdown that has since started for a new one.
  const lockoutRequest = useRef(0);

  // The notice explains why we are here; it should not survive a retry.
  useEffect(() => {
    if (!sessionEndedReason) return;
    setFormError(SESSION_ENDED_NOTICE[sessionEndedReason]);
    clearSessionEndedReason();
  }, [sessionEndedReason, clearSessionEndedReason]);

  /** Ask the server whether this caller is locked out, and start the clock. */
  const syncLockout = useCallback(async (value: string) => {
    const requestId = ++lockoutRequest.current;
    try {
      const status = await UserService.loginLockoutStatus(value);
      if (requestId !== lockoutRequest.current) return;
      setLockedFor(status.lockedOut ? Math.max(1, Math.ceil(status.retryAfterMs / 1000)) : 0);
      setRemainingHint(status.attemptsRemaining);
    } catch {
      // A failed lookup must not block logging in; the attempt itself is
      // still authoritative and will report a lockout if there is one.
      if (requestId === lockoutRequest.current) {
        setLockedFor(0);
        setRemainingHint(null);
      }
    }
  }, []);

  // On load: a refresh during a lockout should show the countdown immediately,
  // not after the user submits a request that was never going to be checked.
  useEffect(() => {
    void syncLockout(email);
    // Deliberately mount-only — subsequent changes go through handleEmailChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
  }, []);

  // Count the lockout down locally so the button unlocks the moment the
  // server would accept another attempt, without polling it.
  useEffect(() => {
    if (lockedFor <= 0) return;
    const timer = setInterval(() => {
      setLockedFor(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockedFor]);

  const clearError = (field: string) => {
    setErrors(prev => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    clearError('email');
    setFormError('');

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null;
      void syncLockout(value);
    }, LOCKOUT_DEBOUNCE_MS);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    clearError('password');
    setFormError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) return;

    setFormError('');

    // Check both fields before dispatching, so an empty or malformed value is
    // reported against the input it belongs to instead of coming back as one
    // generic "invalid credentials" banner.
    const nextErrors: FieldErrors = {};
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    if (emailError) nextErrors.email = emailError;
    if (passwordError) nextErrors.password = passwordError;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      await login(email, password);
      localStorage.removeItem(LAST_EMAIL_KEY);
    } catch (err: unknown) {
      if (err instanceof ApiFieldError && err.code === 'LOCKED_OUT') {
        setLockedFor(Math.max(1, Math.ceil((err.retryAfter ?? 60) / 1000)));
        setRemainingHint(0);
      } else {
        // Remember the address so a refresh can re-check the lockout for it.
        localStorage.setItem(LAST_EMAIL_KEY, email.trim());
        // One attempt has been spent: re-read the remaining budget rather than
        // leaving a stale number on screen.
        void syncLockout(email);
      }
      setFormError(err instanceof Error && err?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // The session-ended notice is informational rather than a complaint about
  // what was typed, so it gets its own softer styling.
  const isNotice = /session is no longer valid|Please log in to continue/i.test(formError);

  return (
    <div className="min-h-dvh flex font-nunito bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900">
      {/* ── Left branding ── */}
      <div className="hidden lg:flex flex-col justify-center items-start px-16 w-[42%] text-white gap-8">
        <div>
          <div className="text-5xl font-black tracking-tight mb-2">Lexiflow</div>
          <p className="text-blue-300 text-lg font-medium">Master a language through content you love.</p>
        </div>
        <ul className="flex flex-col gap-4 text-blue-200 text-sm font-medium">
          {['Track every word you learn', 'Listen & read in sync', 'Build streaks, hit daily goals', 'Works with any language'].map(f => (
            <li key={f} className="flex items-center gap-3">
              <span className="text-blue-400 text-lg">✦</span>
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Right form ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400" />

          <form onSubmit={handleLogin} noValidate className="p-8 flex flex-col gap-5">
            <div>
              <h1 className="text-2xl font-black text-gray-800">Welcome back</h1>
              <p className="text-gray-400 text-sm mt-1">Log in to continue your learning journey.</p>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-sm font-semibold text-gray-600">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => handleEmailChange(e.target.value)}
                onBlur={() => { if (debounceTimer.current) { clearTimeout(debounceTimer.current); debounceTimer.current = null; } void syncLockout(email); }}
                placeholder="ada@example.com"
                disabled={isLockedOut}
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? 'email-error' : undefined}
                className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none transition bg-white focus:ring-2 disabled:bg-gray-50 disabled:text-gray-400 ${
                  errors.email
                    ? 'border-red-300 focus:ring-red-300'
                    : 'border-gray-200 focus:ring-blue-400 focus:border-transparent'
                }`}
              />
              {errors.email && (
                <p id="email-error" role="alert" className="text-red-500 text-[11px] font-bold flex items-start gap-1">
                  <span aria-hidden="true">⚠</span><span>{errors.email}</span>
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-sm font-semibold text-gray-600">Password</label>
              {/* relative anchors the eye button to this field */}
              <div className="relative">
              <input
                id="password"
                type={revealPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={e => handlePasswordChange(e.target.value)}
                placeholder="Your password"
                disabled={isLockedOut}
                aria-invalid={errors.password ? true : undefined}
                aria-describedby={errors.password ? 'password-error' : undefined}
                className={`w-full border rounded-lg px-4 py-3 pr-11 text-sm focus:outline-none transition bg-white focus:ring-2 disabled:bg-gray-50 disabled:text-gray-400 ${
                  errors.password
                    ? 'border-red-300 focus:ring-red-300'
                    : 'border-gray-200 focus:ring-blue-400 focus:border-transparent'
                }`}
              />
              {/* Always present: not tied to focus, and not tied to whether the
                  field has content, so it cannot vanish as the user types. */}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setRevealPassword(prev => !prev)}
                disabled={isLockedOut}
                aria-pressed={revealPassword}
                aria-controls="password"
                aria-label={revealPassword ? 'Hide password' : 'Show password'}
                title={revealPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {revealPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              </div>
              {errors.password && (
                <p id="password-error" role="alert" className="text-red-500 text-[11px] font-bold flex items-start gap-1">
                  <span aria-hidden="true">⚠</span><span>{errors.password}</span>
                </p>
              )}
            </div>

            {formError && (
              <p role="alert" className={`text-xs font-semibold border px-3 py-2 rounded-lg ${
                isLockedOut
                  ? 'text-amber-700 bg-amber-50 border-amber-200'
                  : isNotice
                    ? 'text-blue-700 bg-blue-50 border-blue-200'
                    : 'text-red-500 bg-red-50 border-red-200'
              }`}>
                {isLockedOut
                  ? `Too many failed attempts. Try again in ${formatCountdown(lockedFor)}.`
                  : formError}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || isLockedOut}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition text-sm"
            >
              {isLockedOut
                ? `Locked · ${formatCountdown(lockedFor)}`
                : loading ? 'Logging in...' : 'Log In →'}
            </button>

            {!isLockedOut && emailValid && email.trim() !== '' && (
              <p className="text-[11px] font-bold text-gray-400 text-center">
                {`Attempts remaining before lockout: ${remainingHint ?? '—'}`}
              </p>
            )}

            <p className="text-center text-xs text-gray-400">
              Don't have an account?{' '}
              <Link to="/signup" className="text-blue-500 font-bold hover:underline">Sign Up for free</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
