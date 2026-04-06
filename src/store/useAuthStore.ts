import { create } from 'zustand';
import { useReaderStore } from './useReaderStore';
import { UserService, type RegisterPayload } from '../services/userService';

interface AuthState {
  user: { id: string; fullName: string; username: string; email: string; preferences?: { targetLanguage: string } | null } | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: JSON.parse(localStorage.getItem('lingq_user') || 'null'),
  token: localStorage.getItem('lingq_token'),
  isAuthenticated: !!localStorage.getItem('lingq_token'),

  login: async (email, password) => {
    const data = await UserService.login(email, password);
    
    localStorage.setItem('lingq_token', data.token);
    localStorage.setItem('lingq_user', JSON.stringify(data.user));

    await useReaderStore.getState().initializeUserState(data.user.id);

    set({ user: data.user, token: data.token, isAuthenticated: true });
  },

  register: async (payload: RegisterPayload) => {
    await UserService.register(payload);
  },

  logout: () => {
    localStorage.removeItem('lingq_token');
    localStorage.removeItem('lingq_user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  initializeAuth: async () => {
    const token = get().token;
    if (!token) return;

    try {
      const data = await UserService.verifyToken();
      if (data.user) {
        localStorage.setItem('lingq_user', JSON.stringify(data.user));
        set({ user: data.user, isAuthenticated: true });
        // Refresh preferences/stats
        await useReaderStore.getState().initializeUserState(data.user.id);
      }
    } catch (err) {
      console.error('Verify token failed:', err);
      get().logout();
    }
  },
}));