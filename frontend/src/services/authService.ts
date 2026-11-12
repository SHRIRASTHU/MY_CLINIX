import { apiRequest } from './apiClient';
import { AuthResponse, LoginCredentials, RegisterPayload, User } from '../types/auth';

export const authService = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const data = await apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    localStorage.setItem('myclinix_token', data.access_token);
    localStorage.setItem('myclinix_user', JSON.stringify(data.user));
    return data;
  },

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const data = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    localStorage.setItem('myclinix_token', data.access_token);
    localStorage.setItem('myclinix_user', JSON.stringify(data.user));
    return data;
  },

  async getMe(): Promise<User> {
    const user = await apiRequest<User>('/auth/me', {
      method: 'GET',
    });
    localStorage.setItem('myclinix_user', JSON.stringify(user));
    return user;
  },

  logout(): void {
    localStorage.removeItem('myclinix_token');
    localStorage.removeItem('myclinix_user');
    localStorage.removeItem('myclinix_selected_patient_id');
  },

  getStoredToken(): string | null {
    return localStorage.getItem('myclinix_token');
  },

  getStoredUser(): User | null {
    const item = localStorage.getItem('myclinix_user');
    if (!item) return null;
    try {
      return JSON.parse(item);
    } catch {
      return null;
    }
  },
};
