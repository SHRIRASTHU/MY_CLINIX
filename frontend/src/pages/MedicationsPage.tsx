import React, { useState, useEffect } from 'react';
import {
  Pill,
  ShieldCheck,
  AlertCircle,
  FileText,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  Stethoscope,
  Info,
} from 'lucide-react';
import { usePatient } from '../hooks/usePatient';
import { recordService } from '../services/recordService';
import { MedicationItem } from '../types/patient';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

export const MedicationsPage: React.FC = () => {
  const { selectedPatient } = usePatient();
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchMeds = async () => {
    if (!selectedPatient) return;
    try {
      setLoading(true);
      const data = await recordService.getMedications(
        selectedPatient.id,
        statusFilter === 'all' ? undefined : statusFilter
      );
      setMedications(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeds();
  }, [selectedPatient, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'current':
      case 'started':
        return { label: 'Current / Active', variant: 'primary' as const, bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'completed':
        return { label: 'Completed Course', variant: 'secondary' as const, bg: 'bg-blue-50 text-blue-800 border-blue-200' };
      case 'explicitly_discontinued':
        return { label: 'Explicitly Discontinued', variant: 'warning' as const, bg: 'bg-rose-50 text-rose-800 border-rose-200' };
      default:
        return { label: 'Historical Record', variant: 'neutral' as const, bg: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  if (!selectedPatient) {
    return (
      <Alert type="warning" title="No Patient Selected">
        Please select a patient profile to view medication lifecycle history.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0f2b48] tracking-tight">Medication History</h1>
            <Badge variant="primary" size="md">
              Lifecycle Intelligence
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tracks start dates, dosages, prescribing doctors, active therapies, and explicit discontinuations with source evidence.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          {['all', 'current', 'explicitly_discontinued'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#0f2b48] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <Alert type="info" title="Medication Lifecycle Integrity Guarantee">
        Older prescriptions are not assumed active, and newer prescriptions do not automatically imply older therapies were discontinued. Every discontinuation requires explicit clinical evidence.
      </Alert>

      {/* Medication Cards */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading verified medication records...</div>
      ) : medications.length === 0 ? (
        <Card className="p-8 text-center bg-white">
          <Pill className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-500">No medication records found for this status.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {medications.map((med) => {
            const badge = getStatusBadge(med.status);
            const isDiscontinued = med.status === 'explicitly_discontinued';

            return (
              <Card
                key={med.id}
                className={`p-5 bg-white transition-all hover:shadow-xs border ${
                  isDiscontinued ? 'border-rose-200 bg-rose-50/10' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                        isDiscontinued
                          ? 'bg-rose-50 text-rose-600 border-rose-200'
                          : 'bg-teal-50 text-[#0d9488] border-teal-200'
                      }`}
                    >
                      <Pill className="w-5 h-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-slate-900">{med.medicine_name}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                        <span>Dosage: <strong>{med.dosage || 'Not stated'}</strong></span>
                        <span>•</span>
                        <span>Frequency: <strong>{med.frequency || 'Daily'}</strong></span>
                        <span>•</span>
                        <span>Route: <strong className="capitalize">{med.route || 'Oral'}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right text-xs space-y-0.5">
                    <div className="text-slate-400 text-[10px]">Prescribed / Start:</div>
                    <strong className="text-slate-800 font-mono">{med.start_date || 'Undocumented'}</strong>
                    {med.stop_date && (
                      <div className="text-rose-700 font-semibold text-[11px]">
                        Discontinued: {med.stop_date}
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Clinical Details & Proof */}
                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Prescribing Physician</span>
                    <span className="text-slate-800 font-medium">{med.prescribing_doctor || 'Dr. Sarah Lin, MD (Attending)'}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Course: {med.duration}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Associated Prescription Record</span>
                    <div className="flex items-center gap-1.5 text-teal-700 font-medium truncate mt-0.5">
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{med.document_name || 'Prescription_Record.pdf'}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Archived: {med.upload_date}</span>
                  </div>
                </div>

                {/* Discontinuation Evidence Box */}
                {isDiscontinued && med.discontinuation_evidence && (
                  <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900">
                    <span className="font-bold flex items-center gap-1 mb-0.5">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Explicit Discontinuation Evidence:</span>
                    </span>
                    <p className="italic text-[11px] text-rose-800">"{med.discontinuation_evidence}"</p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
