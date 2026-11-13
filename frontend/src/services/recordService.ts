import { apiRequest, API_BASE } from './apiClient';
import {
  MedicalDocument,
  TimelineEvent,
  MedicationItem,
  ConditionItem,
  LabInvestigationItem,
  ConflictItem,
  ConflictSummary,
  MissingInfoItem,
  CompletenessReport,
  RecoverySummary,
  HealthPassportData,
  ChatMessage,
} from '../types/patient';

export const recordService = {
  getDocuments: (patientId: string, category?: string, search?: string, sortBy?: string) => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    if (sortBy) params.append('sort_by', sortBy);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<MedicalDocument[]>(`/patients/${patientId}/documents${query}`);
  },

  uploadDocument: async (patientId: string, file: File, documentType: string, documentDate?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    if (documentDate) formData.append('document_date', documentDate);

    const token = localStorage.getItem('myclinix_token');
    const response = await fetch(`${API_BASE}/patients/${patientId}/documents`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Document upload failed' }));
      throw new Error(err.detail || 'Failed to upload document');
    }
    return response.json();
  },

  getTimeline: (patientId: string, category?: string, order: string = 'asc') => {
    const params = new URLSearchParams({ order });
    if (category) params.append('category', category);
    return apiRequest<TimelineEvent[]>(`/patients/${patientId}/timeline?${params.toString()}`);
  },

  getMedications: (patientId: string, statusFilter?: string) => {
    const params = new URLSearchParams();
    if (statusFilter) params.append('status_filter', statusFilter);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<MedicationItem[]>(`/patients/${patientId}/medications${query}`);
  },

  getConditions: (patientId: string) => {
    return apiRequest<ConditionItem[]>(`/patients/${patientId}/conditions`);
  },

  getInvestigations: (patientId: string) => {
    return apiRequest<LabInvestigationItem[]>(`/patients/${patientId}/investigations`);
  },

  getConflicts: (patientId: string) => {
    return apiRequest<{
      conflicts: ConflictItem[];
      summary: ConflictSummary;
      completeness?: CompletenessReport;
    }>(`/patients/${patientId}/conflicts`);
  },

  getConflictsAndCompleteness: (patientId: string) => {
    return apiRequest<{ conflicts: ConflictItem[]; summary?: ConflictSummary; completeness: CompletenessReport }>(
      `/patients/${patientId}/conflicts`
    );
  },

  resolveConflict: (patientId: string, conflictId: string, notes: string, status: string = 'resolved') => {
    return apiRequest(`/patients/${patientId}/conflicts/${conflictId}/resolve?notes=${encodeURIComponent(notes)}&status=${status}`, {
      method: 'POST',
    });
  },

  getMissingInformation: (patientId: string) => {
    return apiRequest<CompletenessReport>(`/patients/${patientId}/missing-information`);
  },

  verifyMissingInfoItem: (patientId: string, itemId: string, notes: string, status: string = 'complete') => {
    return apiRequest(`/patients/${patientId}/missing-information/${itemId}/verify?notes=${encodeURIComponent(notes)}&status=${status}`, {
      method: 'POST',
    });
  },

  getPassport: (patientId: string) => {
    return apiRequest<HealthPassportData>(`/patients/${patientId}/passport`);
  },

  getRecovery: (patientId: string) => {
    return apiRequest<RecoverySummary>(`/patients/${patientId}/recovery`);
  },

  askAi: (patientId: string, query: string) => {
    return apiRequest<{
      query: string;
      content: string;
      citations: { document_name: string; page?: number; text_span?: string }[];
      recommendations: string[];
      questions_for_doctor: string[];
      timestamp: string;
      disclaimer: string;
    }>(`/patients/${patientId}/chat?query=${encodeURIComponent(query)}`, {
      method: 'POST',
    });
  },
};
