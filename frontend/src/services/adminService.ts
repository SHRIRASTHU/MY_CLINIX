import { apiRequest } from './apiClient';
import { User } from '../types/auth';

export interface AdminStats {
  total_users: number;
  total_doctors: number;
  verified_doctors: number;
  total_patient_users: number;
  total_patient_profiles: number;
  total_documents: number;
  open_conflicts: number;
}

export const adminService = {
  getUsers: (role?: string, search?: string) => {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    if (search) params.append('search', search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<User[]>(`/admin/users${query}`);
  },

  verifyDoctor: (userId: string, isVerified: boolean) => {
    return apiRequest<User>(`/admin/users/${userId}/verify-doctor?is_verified=${isVerified}`, {
      method: 'PATCH',
    });
  },

  updateUserStatus: (userId: string, isActive: boolean) => {
    return apiRequest<User>(`/admin/users/${userId}/status?is_active=${isActive}`, {
      method: 'PATCH',
    });
  },

  getStats: () => {
    return apiRequest<AdminStats>('/admin/stats');
  },
};
