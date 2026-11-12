import { apiRequest } from './apiClient';

export interface CountryProfile {
  code: string;
  name: string;
  flag: string;
  preferred_units: Record<string, string>;
  date_format: string;
  emergency_number: string;
  ambulance_number?: string;
  national_guidelines_body: string;
  typical_labs: string[];
  currency: string;
}

export interface UnitConversionResult {
  original_value: number;
  original_unit: string;
  normalized_value: number;
  normalized_unit: string;
  formula: string;
  analyte: string;
  converted: boolean;
}

export interface TravelSummary {
  patient: any;
  origin_country: CountryProfile;
  destination_country: CountryProfile;
  travel_mode_active: boolean;
  medications: any[];
  investigations: any[];
  allergies: any[];
  emergency_info: {
    destination_country: string;
    flag: string;
    local_emergency_phone: string;
    local_ambulance_phone: string;
    regulatory_body: string;
    primary_patient_contact?: string;
    primary_patient_phone?: string;
    blood_group: string;
    critical_allergies: string[];
  };
  generated_at: string;
}

export interface EmergencyPassport {
  passport_id: string;
  patient_id: string;
  destination_country: CountryProfile;
  payload: {
    type: string;
    patient_name: string;
    dob: string;
    blood_group: string;
    destination: string;
    emergency_call: string;
    contact: string;
    allergies: string[];
    medications: string[];
    major_conditions: string[];
    offline_hash: string;
    timestamp: string;
  };
  qr_payload_raw: string;
  qr_data_uri: string;
  base64_offline_token: string;
  offline_instructions: string;
}

export interface CrossBorderAudit {
  patient_id: string;
  patient_name: string;
  total_cross_border_findings: number;
  conflicts_detected: any[];
  provenance_records: any[];
  interoperability_standard: string;
}

export const normalizationService = {
  async getCountries(): Promise<CountryProfile[]> {
    return apiRequest<CountryProfile[]>('/normalization/countries', { method: 'GET' });
  },

  async convertUnit(
    value: number,
    fromUnit: string,
    toUnit?: string,
    analyte?: string,
    destinationCountry?: string
  ): Promise<UnitConversionResult> {
    return apiRequest<UnitConversionResult>('/normalization/convert-unit', {
      method: 'POST',
      body: JSON.stringify({
        value,
        from_unit: fromUnit,
        to_unit: toUnit,
        analyte,
        destination_country: destinationCountry,
      }),
    });
  },

  async detectContext(text: string, fileName?: string): Promise<any> {
    return apiRequest<any>('/normalization/detect-context', {
      method: 'POST',
      body: JSON.stringify({ text, file_name: fileName || '' }),
    });
  },

  async normalizeDate(dateStr: string, countryContext?: string): Promise<any> {
    return apiRequest<any>('/normalization/normalize-date', {
      method: 'POST',
      body: JSON.stringify({ date_str: dateStr, country_context: countryContext || 'IN' }),
    });
  },

  async normalizeTerm(rawTerm: string): Promise<any> {
    return apiRequest<any>('/normalization/normalize-term', {
      method: 'POST',
      body: JSON.stringify({ raw_term: rawTerm }),
    });
  },

  async getTravelSummary(
    patientId: string,
    destinationCountry: string = 'US',
    originCountry: string = 'IN'
  ): Promise<TravelSummary> {
    return apiRequest<TravelSummary>(
      `/normalization/patient/${patientId}/travel-summary?destination_country=${destinationCountry}&origin_country=${originCountry}`,
      { method: 'GET' }
    );
  },

  async getEmergencyPassport(patientId: string, destinationCountry: string = 'US'): Promise<EmergencyPassport> {
    return apiRequest<EmergencyPassport>(
      `/normalization/patient/${patientId}/emergency-passport?destination_country=${destinationCountry}`,
      { method: 'GET' }
    );
  },

  async getCrossBorderAudit(patientId: string): Promise<CrossBorderAudit> {
    return apiRequest<CrossBorderAudit>(`/normalization/patient/${patientId}/cross-border-audit`, { method: 'GET' });
  },
};
