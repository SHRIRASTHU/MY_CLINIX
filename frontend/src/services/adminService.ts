import { apiRequest } from './apiClient';
import { User } from '../types/auth';
import { PaginatedAuditLogs } from '../types/audit';

export interface AdminStats {
  total_users: number;
  total_doctors: number;
  verified_doctors: number;
  total_patient_users: number;
  total_patient_profiles: number;
  total_documents: number;
  open_conflicts: number;
}

export interface AuditLogParams {
  action?: string;
  actor_id?: string;
  patient_id?: string;
  outcome?: string;
  page?: number;
  page_size?: number;
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

  getAuditLogs: (params: AuditLogParams = {}) => {
    const query = new URLSearchParams();
    if (params.action) query.append('action', params.action);
    if (params.actor_id) query.append('actor_id', params.actor_id);
    if (params.patient_id) query.append('patient_id', params.patient_id);
    if (params.outcome) query.append('outcome', params.outcome);
    if (params.page) query.append('page', params.page.toString());
    if (params.page_size) query.append('page_size', params.page_size.toString());
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return apiRequest<PaginatedAuditLogs>(`/admin/audit-logs${qStr}`);
  },
};
