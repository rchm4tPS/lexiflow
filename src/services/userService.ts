import { apiClient } from '../api/client';

export interface RegisterPayload {
  fullName: string;
  username: string;
  email: string;
  password: string;
  /** Every language the user enrolled in. Order matters: the first is primary. */
  targetLanguages: string[];
  dailyGoalTier: string;
}

export interface AvailabilityResult {
  username?: { available: boolean };
  email?: { available: boolean };
}

export interface LockoutStatus {
  lockedOut: boolean;
  retryAfterMs: number;
  attemptsRemaining: number;
}

export const UserService = {
  async login(email: string, password: string) {
    return await apiClient('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async register(payload: RegisterPayload) {
    return await apiClient('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /** Advisory — `/register` still owns the authoritative uniqueness check. */
  async checkAvailability(input: { username?: string; email?: string }): Promise<AvailabilityResult> {
    return await apiClient('/auth/check-availability', {
      method: 'POST',
      body: JSON.stringify(input),
    }) as AvailabilityResult;
  },

  /**
   * Current lockout state for this caller. Called on load and while the email
   * field changes so the countdown is visible before the user tries a login
   * that is already doomed.
   */
  async loginLockoutStatus(email?: string): Promise<LockoutStatus> {
    const query = email?.trim() ? `?email=${encodeURIComponent(email.trim())}` : '';
    return await apiClient(`/auth/login-lockout${query}`, {
      method: 'GET',
    }) as LockoutStatus;
  },

  async verifyToken() {
    return await apiClient('/auth/verify', {
      method: 'GET',
    });
  }
};
