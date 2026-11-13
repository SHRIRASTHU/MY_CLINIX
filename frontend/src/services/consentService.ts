import { apiRequest } from './apiClient';
import { ConsentRecord, DoctorLookupItem } from '../types/patient';

export const consentService = {
  getAvailableDoctors: () => {
    return apiRequest<DoctorLookupItem[]>('/doctors');
  },

  getConsentRecords: (patientId: string) => {
    return apiRequest<ConsentRecord[]>(`/patients/${patientId}/consent`);
  },

  grantConsent: (patientId: string, doctorId: string, accessLevel: string = 'read_only', scope?: string[]) => {
    return apiRequest<ConsentRecord>(`/patients/${patientId}/consent/grant`, {
      method: 'POST',
      body: JSON.stringify({
        doctor_id: doctorId,
        access_level: accessLevel,
        scope: scope && scope.length > 0 ? scope : undefined,
      }),
    });
  },

  revokeConsent: (patientId: string, doctorId: string, reason?: string) => {
    return apiRequest<ConsentRecord>(`/patients/${patientId}/consent/revoke/${doctorId}`, {
      method: 'POST',
      body: JSON.stringify({
        reason: reason || 'Revoked by patient',
      }),
    });
  },
};
