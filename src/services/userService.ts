import { apiClient } from '../api/client';

export interface RegisterPayload {
  fullName: string;
  username: string;
  email: string;
  password: string;
  targetLanguage: string;
  dailyGoalTier: string;
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

  async verifyToken() {
    return await apiClient('/auth/verify', {
      method: 'GET',
    });
  }
};
