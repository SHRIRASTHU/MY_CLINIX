import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Patient } from '../types/patient';
import { patientService } from '../services/patientService';
import { useAuth } from './useAuth';

interface PatientContextType {
  patients: Patient[];
  selectedPatient: Patient | null;
  loading: boolean;
  error: string | null;
  selectPatient: (patientId: string) => void;
  refreshPatients: () => Promise<void>;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

export const PatientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshPatients = useCallback(async () => {
    if (!isAuthenticated) {
      setPatients([]);
      setSelectedPatient(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await patientService.listPatients();
      setPatients(data);

      const storedId = localStorage.getItem('myclinix_selected_patient_id');
      if (storedId) {
        const found = data.find((p) => p.id === storedId);
        if (found) {
          setSelectedPatient(found);
          return;
        }
      }
      if (data.length > 0) {
        setSelectedPatient(data[0]);
        localStorage.setItem('myclinix_selected_patient_id', data[0].id);
      } else {
        setSelectedPatient(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshPatients();
  }, [refreshPatients]);

  const selectPatient = (patientId: string) => {
    const found = patients.find((p) => p.id === patientId);
    if (found) {
      setSelectedPatient(found);
      localStorage.setItem('myclinix_selected_patient_id', found.id);
    }
  };

  return (
    <PatientContext.Provider
      value={{
        patients,
        selectedPatient,
        loading,
        error,
        selectPatient,
        refreshPatients,
      }}
    >
      {children}
    </PatientContext.Provider>
  );
};

export const usePatient = (): PatientContextType => {
  const context = useContext(PatientContext);
  if (!context) {
    throw new Error('usePatient must be used within a PatientProvider');
  }
  return context;
};
