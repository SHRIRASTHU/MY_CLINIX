import { apiRequest } from './apiClient';
import { Patient, PatientCreateInput, PatientDetail, PatientAccessMember, AccessLevel } from '../types/patient';

export const patientService = {
  async listPatients(): Promise<Patient[]> {
    return apiRequest<Patient[]>('/patients', { method: 'GET' });
  },

  async createPatient(payload: PatientCreateInput): Promise<Patient> {
    return apiRequest<Patient>('/patients', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getPatientDetail(patientId: string): Promise<PatientDetail> {
    return apiRequest<PatientDetail>(`/patients/${patientId}`, { method: 'GET' });
  },

  async updatePatient(patientId: string, payload: Partial<PatientCreateInput>): Promise<Patient> {
    return apiRequest<Patient>(`/patients/${patientId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deletePatient(patientId: string): Promise<void> {
    return apiRequest<void>(`/patients/${patientId}`, {
      method: 'DELETE',
    });
  },

  async grantAccess(patientId: string, userEmail: string, accessLevel: AccessLevel): Promise<PatientAccessMember> {
    return apiRequest<PatientAccessMember>(`/patients/${patientId}/access`, {
      method: 'POST',
      body: JSON.stringify({ user_email: userEmail, access_level: accessLevel }),
    });
  },
};
