import { create } from 'zustand';
import { useReaderStore } from './useReaderStore';
import { UserService, type RegisterPayload } from '../services/userService';
import { onAuthFailure, type AuthFailureReason } from '../api/authEvents';
import { invalidateInFlightRequests } from '../api/client';

/**
 * Every localStorage key that identifies a session. Kept in one place so
 * logging out, expiring and signing in all agree on what to clear — and so a
 * key added later cannot be forgotten by one of the three paths.
 */
const SESSION_KEYS = ['lingq_token', 'lingq_user'] as const;

/**
 * Remembered only to pre-fill the login form. It belongs to the session that
 * typed it, so it is cleared whenever that session ends — otherwise a shared
 * browser shows the previous account's address to whoever signs in next.
 */
export const LAST_EMAIL_KEY = 'lingq_last_login_email';

function clearSessionStorage(): void {
  for (const key of SESSION_KEYS) localStorage.removeItem(key);
  localStorage.removeItem(LAST_EMAIL_KEY);
}

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthState {
  user: { id: string; fullName: string; username: string; email: string; preferences?: { targetLanguage: string } | null } | null;
  token: string | null;
  isAuthenticated: boolean;
  /**
   * `loading` until the stored token has been checked against the server. The
   * app must not render protected routes during this window — that is what let
   * a dead token leave the user staring at an empty shell until they reloaded.
   */
  status: AuthStatus;
  /** Why the session ended, so Login can explain itself. */
  sessionEndedReason: AuthFailureReason | null;
  login: (email: string, pass: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  endSession: (reason: AuthFailureReason) => void;
  clearSessionEndedReason: () => void;
  initializeAuth: () => Promise<void>;
}

const storedUser = () => {
  try {
    return JSON.parse(localStorage.getItem('lingq_user') || 'null');
  } catch {
    // A hand-edited or partially written entry should not crash the boot.
    localStorage.removeItem('lingq_user');
    return null;
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: storedUser(),
  token: localStorage.getItem('lingq_token'),
  // Not authenticated until the server has confirmed the token.
  isAuthenticated: false,
  status: localStorage.getItem('lingq_token') ? 'loading' : 'anonymous',
  sessionEndedReason: null,

  login: async (email, password) => {
    const data = await UserService.login(email.trim(), password);

    localStorage.setItem('lingq_token', data.token);
    localStorage.setItem('lingq_user', JSON.stringify(data.user));

    await useReaderStore.getState().initializeUserState(data.user.id);

    set({ user: data.user, token: data.token, isAuthenticated: true, status: 'authenticated', sessionEndedReason: null });
  },

  register: async (payload: RegisterPayload) => {
    await UserService.register(payload);
  },

  logout: () => {
    clearSessionStorage();
    // Orphan anything already in flight, so no late response can write this
    // account's data back after the reset below.
    invalidateInFlightRequests();
    // Drop cached user data too, so nothing protected stays on screen.
    useReaderStore.getState().resetSession();
    set({ user: null, token: null, isAuthenticated: false, status: 'anonymous' });
  },

  endSession: (reason) => {
    clearSessionStorage();
    invalidateInFlightRequests();
    useReaderStore.getState().resetSession();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      status: 'anonymous',
      sessionEndedReason: reason,
    });
  },

  clearSessionEndedReason: () => set({ sessionEndedReason: null }),

  initializeAuth: async () => {
    const token = get().token;
    if (!token) {
      // No token but a cached user object means the pair was already cleared;
      // drop the orphan so stale identity does not leak into the next render.
      if (get().user) useReaderStore.getState().resetSession();
      localStorage.removeItem('lingq_user');
      invalidateInFlightRequests();
      set({ user: null, status: 'anonymous', isAuthenticated: false });
      return;
    }

    try {
      const data = await UserService.verifyToken();
      if (data?.user) {
        localStorage.setItem('lingq_user', JSON.stringify(data.user));
        set({ user: data.user, isAuthenticated: true, status: 'authenticated' });
        // Refresh preferences/stats
        await useReaderStore.getState().initializeUserState(data.user.id);
      } else {
        get().endSession('invalid');
      }
    } catch (err) {
      // `verify` answers 401 for an expired, malformed or tampered token — all
      // of which mean the session is over. There is no state worth keeping.
      console.warn('Session could not be verified; ending session.', err);
      get().endSession('expired');
    }
  },
}));

// Any protected request that comes back 401 ends the session immediately. This
// is what turns an expired token into a redirect instead of a stuck UI, even
// when it happens long after the app finished booting.
onAuthFailure((reason) => {
  const { status } = useAuthStore.getState();
  if (status === 'anonymous') return;
  useAuthStore.getState().endSession(reason);
});
