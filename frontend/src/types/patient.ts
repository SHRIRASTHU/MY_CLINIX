export type Gender = 'male' | 'female' | 'other' | 'unknown';
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown';
export type AccessLevel = 'owner' | 'doctor' | 'viewer' | 'administrator';

export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: Gender;
  blood_group: BloodGroup;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  medical_notes?: string;
  created_by_id: string;
  created_at: string;
  updated_at: string;
  access_level?: AccessLevel;
  documents_count?: number;
  findings_count?: number;
  contradictions_count?: number;
}

export interface PatientCreateInput {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: Gender;
  blood_group: BloodGroup;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  medical_notes?: string;
}

export interface PatientAccessMember {
  id: string;
  user_id: string;
  patient_id: string;
  access_level: AccessLevel;
  user_email?: string;
  user_name?: string;
}

export interface PatientDetail extends Patient {
  access_list: PatientAccessMember[];
}

export interface DocumentPageItem {
  id: string;
  document_id: string;
  page_number: number;
  text: string;
  extraction_method: 'text_layer' | 'ocr' | 'ocr_unavailable' | string;
  ocr_confidence: number;
  text_sha256: string;
}

export interface MedicalDocument {
  id: string;
  patient_id: string;
  file_name: string;
  original_filename?: string;
  file_path?: string;
  stored_path?: string;
  file_size_bytes: number;
  mime_type: string;
  document_type: string;
  source_hospital_or_clinic?: string;
  document_date: string;
  upload_date: string;
  processing_status: string;
  page_count: number;
  version_number?: number;
  is_deleted?: boolean;
  deleted_at?: string;
  deletion_reason?: string;
  ocr_extracted_text?: string;
  sha256_hash?: string;
  file_sha256?: string;
  pages?: DocumentPageItem[];
}

export interface ConsentRecord {
  id: string;
  patient_id: string;
  doctor_id: string;
  doctor_name?: string;
  doctor_email?: string;
  access_level: 'read_only' | 'read_write' | 'full';
  scope?: string[];
  granted_at: string;
  revoked_at?: string;
  revocation_reason?: string;
  status: 'active' | 'revoked';
}

export interface DoctorLookupItem {
  id: string;
  full_name: string;
  email: string;
  is_verified: boolean;
}

export interface TimelineEvent {
  id: string;
  patient_id: string;
  document_id?: string;
  document_name?: string;
  event_type: 'consultation' | 'condition' | 'medication_event' | 'lab_investigation' | 'scan' | 'admission' | 'discharge' | 'other';
  title: string;
  description: string;
  event_date: string;
  event_date_precision: string;
  verification_status: string;
  findings_count?: number;
}

export interface MedicationItem {
  id: string;
  patient_id: string;
  document_id: string;
  document_name?: string;
  medicine_name: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  prescribed_date?: string;
  prescribing_doctor?: string;
  duration?: string;
  status: 'current' | 'completed' | 'historical' | 'explicitly_discontinued' | 'started' | 'requires_review';
  start_date?: string;
  stop_date?: string;
  discontinuation_evidence?: string;
  upload_date?: string;
}

export interface ConditionItem {
  id: string;
  patient_id: string;
  name: string;
  category: 'condition' | 'allergy' | 'diagnosis';
  status: 'active' | 'resolved' | 'suspected' | 'historical';
  diagnosed_date?: string;
  polarity: 'explicit_positive' | 'explicit_negative' | 'unclear' | 'not_documented';
  reaction?: string;
  severity?: string;
  supporting_document?: string;
  supporting_text?: string;
  confidence?: string;
  is_ai_assisted?: boolean;
}

export interface LabInvestigationItem {
  id: string;
  test_name: string;
  result_value: string;
  original_unit?: string;
  reference_range?: string;
  abnormal_flag?: 'HIGH' | 'LOW' | 'NORMAL' | 'CRITICAL';
  test_date?: string;
  document_name?: string;
  document_id?: string;
}

export interface ConflictItem {
  id: string;
  category: string;
  title: string;
  description: string;
  document_a_name: string;
  document_a_date: string;
  document_a_snippet?: string;
  document_b_name: string;
  document_b_date: string;
  document_b_snippet?: string;
  status: 'new_conflict' | 'unresolved' | 'under_review' | 'resolved' | 'reviewed_resolved' | 'dismissed';
  doctor_notes?: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
}

export interface ConflictSummary {
  total: number;
  new_conflicts: number;
  under_review: number;
  resolved: number;
}

export interface CompletenessMetric {
  category: string;
  status: 'complete' | 'partial' | 'missing' | 'requires_verification';
  detail: string;
  last_updated?: string;
}

export interface MissingInfoItem {
  id: string;
  category: string;
  field: string;
  reason: string;
  related_document?: string;
  recommended_action: string;
  status: 'complete' | 'incomplete' | 'missing' | 'requires_verification';
  distinction: 'confirmed_missing' | 'incomplete_data' | 'temporarily_unavailable';
  verified_by?: string;
  verification_date?: string;
  last_updated?: string;
}

export interface CompletenessReport {
  score_percentage: number;
  total_records_reviewed: number;
  complete_items: number;
  incomplete_items: number;
  missing_items: number;
  requires_verification_items: number;
  items: MissingInfoItem[];
  // Backward compatibility properties:
  metrics?: CompletenessMetric[];
  available_items?: number;
  records_requiring_verification?: number;
}

export interface RecoveryTrend {
  parameter: string;
  unit: string;
  baseline: string;
  current: string;
  status: 'improving' | 'stable' | 'attention_required';
  historical_data: { date: string; value: number }[];
}

export interface RecoverySummary {
  medical_summary: string;
  past_conditions: string[];
  major_diagnoses: string[];
  procedures_and_treatments: string[];
  recovery_status: string;
  recent_updates: string[];
  observations: string[];
  vital_trends: RecoveryTrend[];
}

export interface HealthPassportData {
  patient: Patient;
  passport_id: string;
  issued_at: string;
  verification_hash: string;
  emergency_contacts: { name: string; relation: string; phone: string }[];
  vitals_baseline: {
    blood_pressure?: string;
    heart_rate?: string;
    blood_group: string;
    height?: string;
    weight?: string;
  };
  allergies: { allergen: string; status: string; reaction?: string }[];
  active_conditions: string[];
  active_medications: { name: string; dosage?: string; frequency?: string }[];
  verification_stamp: {
    verified_by?: string;
    verified_at?: string;
    status: 'Verified by Attending Doctor' | 'Synchronized & Audited';
  };
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: { document_name: string; page?: number; text_span?: string }[];
  recommendations?: string[];
  questions_for_doctor?: string[];
  disclaimer?: string;
}
