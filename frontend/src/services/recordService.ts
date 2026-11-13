import { apiRequest, API_BASE } from './apiClient';
import {
  MedicalDocument,
  DocumentPageItem,
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
  getDocuments: (
    patientId: string,
    category?: string,
    search?: string,
    sortBy?: string,
    hospital?: string,
    includeDeleted?: boolean
  ) => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    if (sortBy) params.append('sort_by', sortBy);
    if (hospital) params.append('hospital', hospital);
    if (includeDeleted) params.append('include_deleted', 'true');
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<MedicalDocument[]>(`/patients/${patientId}/documents${query}`);
  },

  uploadDocument: async (
    patientId: string,
    file: File,
    documentType: string,
    documentDate?: string,
    sourceHospital?: string
  ): Promise<MedicalDocument> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    if (documentDate) formData.append('document_date', documentDate);
    if (sourceHospital) formData.append('source_hospital_or_clinic', sourceHospital);

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

  getDocumentPages: (patientId: string, documentId: string) => {
    return apiRequest<DocumentPageItem[]>(`/patients/${patientId}/documents/${documentId}/pages`);
  },

  deleteDocument: (patientId: string, documentId: string, reason?: string) => {
    const query = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    return apiRequest<{ message: string; id: string; is_deleted: boolean }>(
      `/patients/${patientId}/documents/${documentId}${query}`,
      {
        method: 'DELETE',
      }
    );
  },

  restoreDocument: (patientId: string, documentId: string) => {
    return apiRequest<{ message: string; id: string; is_deleted: boolean }>(
      `/patients/${patientId}/documents/${documentId}/restore`,
      {
        method: 'POST',
      }
    );
  },

  downloadDocumentFile: async (patientId: string, documentId: string, fileName: string): Promise<void> => {
    const token = localStorage.getItem('myclinix_token');
    const response = await fetch(`${API_BASE}/patients/${patientId}/documents/${documentId}/download`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) {
      throw new Error('Failed to download document file from secure storage.');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  exportPatientData: (patientId: string) => {
    return apiRequest<any>(`/patients/${patientId}/export`);
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
