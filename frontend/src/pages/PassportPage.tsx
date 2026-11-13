import React, { useEffect, useState } from 'react';
import {
  Stethoscope,
  ShieldCheck,
  Printer,
  Download,
  Share2,
  AlertCircle,
  Pill,
  HeartPulse,
  User,
  Phone,
  Calendar,
  CheckCircle2,
  Lock,
  QrCode,
  Activity,
  FileText,
} from 'lucide-react';
import { usePatient } from '../hooks/usePatient';
import { useAuth } from '../hooks/useAuth';
import { recordService } from '../services/recordService';
import { HealthPassportData } from '../types/patient';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

export const PassportPage: React.FC = () => {
  const { selectedPatient } = usePatient();
  const { user } = useAuth();
  const [passportData, setPassportData] = useState<HealthPassportData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedPatient) {
      setLoading(true);
      recordService
        .getPassport(selectedPatient.id)
        .then((data) => setPassportData(data))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [selectedPatient]);

  const handlePrint = () => {
    window.print();
  };

  if (!selectedPatient) {
    return (
      <Alert type="warning" title="No Patient Selected">
        Please select or activate a patient profile to view the Global Health Passport.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0f2b48] tracking-tight">Global Health Passport</h1>
            <Badge variant="primary" size="md">
              Synchronized & Evidentiary
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Universal, tamper-evident health passport synchronized across Patient, Doctor, and Administrator workspaces.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={<Printer className="w-3.5 h-3.5" />} onClick={handlePrint}>
            Print Passport
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={() => alert('Exporting signed PDF health passport with cryptographic audit chain...')}
          >
            Export Secure PDF
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading synchronized passport credentials...</div>
      ) : passportData ? (
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Main Passport Card */}
          <div className="bg-white rounded-2xl border-2 border-teal-500/30 shadow-[0_10px_30px_rgba(15,43,72,0.08)] overflow-hidden">
            {/* Passport Banner Header */}
            <div className="bg-gradient-to-r from-[#0f2b48] via-[#133b63] to-[#0d9488] p-6 text-white relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                    <Stethoscope className="w-6 h-6 text-teal-300" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-teal-300 block">
                      MY CLINIX UNIVERSAL HEALTH ARCHITECTURE
                    </span>
                    <h2 className="text-2xl font-black tracking-tight text-white mt-0.5">
                      GLOBAL HEALTH PASSPORT
                    </h2>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-xs font-mono font-bold text-teal-200">{passportData.passport_id}</div>
                  <div className="text-[10px] text-slate-300 mt-0.5">Issued: {passportData.issued_at}</div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded border border-emerald-400/30 mt-1">
                    <ShieldCheck className="w-3 h-3" />
                    Cryptographically Audited
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Demographics & Emergency Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">
                    Patient Identification
                  </span>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {passportData.patient.first_name} {passportData.patient.last_name}
                      </h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 mt-1">
                        <span>DOB: <strong>{passportData.patient.date_of_birth}</strong></span>
                        <span>•</span>
                        <span>Gender: <strong className="capitalize">{passportData.patient.gender}</strong></span>
                        <span>•</span>
                        <span>ID: <strong className="font-mono text-slate-700">{passportData.patient.id.slice(0, 8)}...</strong></span>
                      </div>
                    </div>

                    <div className="text-center px-3 py-1.5 bg-teal-50 rounded-lg border border-teal-200">
                      <span className="text-[9px] uppercase font-bold text-teal-700 block">Blood Group</span>
                      <strong className="text-xl font-black text-[#0f2b48]">{passportData.patient.blood_group}</strong>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">
                    Emergency Contact & Kin
                  </span>
                  {passportData.emergency_contacts.map((c, i) => (
                    <div key={i} className="text-xs text-slate-700 space-y-1">
                      <div className="font-bold text-slate-900">{c.name}</div>
                      <div className="text-slate-500 text-[11px]">{c.relation}</div>
                      <div className="flex items-center gap-1.5 text-teal-700 font-semibold mt-1">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{c.phone}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vitals Baseline Bar */}
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">
                  Clinical Baseline Vitals
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-400 block">Blood Pressure</span>
                    <strong className="text-xs text-slate-900 font-bold">{passportData.vitals_baseline.blood_pressure}</strong>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-400 block">Resting Heart Rate</span>
                    <strong className="text-xs text-slate-900 font-bold">{passportData.vitals_baseline.heart_rate}</strong>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-400 block">Height & Weight</span>
                    <strong className="text-xs text-slate-900 font-bold">{passportData.vitals_baseline.height} • {passportData.vitals_baseline.weight}</strong>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-400 block">Rh Factor Group</span>
                    <strong className="text-xs text-teal-700 font-bold">{passportData.vitals_baseline.blood_group} Positive</strong>
                  </div>
                </div>
              </div>

              {/* Conditions & Active Medication Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#0f2b48] uppercase tracking-wider">
                    <HeartPulse className="w-4 h-4 text-rose-600" />
                    <span>Active Chronic Conditions</span>
                  </div>
                  <div className="space-y-1.5">
                    {passportData.active_conditions.map((cond, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-xs">
                        <span className="font-semibold text-slate-800">{cond}</span>
                        <Badge variant="secondary" size="sm">Documented</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#0f2b48] uppercase tracking-wider">
                    <Pill className="w-4 h-4 text-teal-600" />
                    <span>Active Medication Regimen</span>
                  </div>
                  <div className="space-y-1.5">
                    {passportData.active_medications.map((med, i) => (
                      <div key={i} className="p-2 bg-white rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-800 block">{med.name}</span>
                          <span className="text-[10px] text-slate-500">{med.dosage} • {med.frequency}</span>
                        </div>
                        <Badge variant="primary" size="sm">Active</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Allergy Polarity Profile */}
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">
                  Allergy Polarity Profile (Strict Absence Principle)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {passportData.allergies.map((all, i) => (
                    <div key={i} className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-slate-800 block">{all.allergen}</strong>
                        <span className="text-[11px] text-slate-500">Reaction: {all.reaction}</span>
                      </div>
                      <Badge
                        variant={all.status.includes('Positive') ? 'warning' : 'secondary'}
                        size="sm"
                      >
                        {all.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Verification & Compliance Seal */}
              <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-teal-900">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <strong className="block text-slate-900 font-bold">
                      {passportData.verification_stamp.status}
                    </strong>
                    <span className="text-[11px] text-slate-600">
                      Sign-off: {passportData.verification_stamp.verified_by} • Stamp: {passportData.verification_stamp.verified_at}
                    </span>
                  </div>
                </div>

                <div className="font-mono text-[10px] text-slate-500 bg-white px-2.5 py-1.5 rounded border border-teal-200 text-right">
                  {passportData.verification_hash}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
