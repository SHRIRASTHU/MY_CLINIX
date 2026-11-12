export type Gender = 'male' | 'female' | 'other' | 'unknown';
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown';
export type AccessLevel = 'owner' | 'caregiver' | 'reviewer' | 'viewer' | 'administrator';

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
