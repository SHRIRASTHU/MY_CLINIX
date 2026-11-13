import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCheck,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  ShieldCheck,
  Stethoscope,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { usePatient } from '../hooks/usePatient';
import { useAuth } from '../hooks/useAuth';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';

export const ReviewPage: React.FC = () => {
  const { selectedPatient } = usePatient();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [verifiedList, setVerifiedList] = useState<Record<string, boolean>>({
    'item-1': true,
    'item-2': false,
    'item-3': false,
  });

  const sampleFindings = [
    {
      id: 'item-1',
      title: 'Essential Hypertension Diagnosis',
      category: 'Condition',
      value: 'Blood pressure 145/92 mmHg confirmed on secondary reading',
      document: 'Discharge_Summary_CityHospital.pdf',
      page: 2,
      confidence: '98.5%',
      verifiedBy: 'Dr. Sarah Lin, MD',
    },
    {
      id: 'item-2',
      title: 'Lisinopril 20mg Daily Prescription',
      category: 'Medication',
      value: '20 mg Oral Tablet once daily in the morning',
      document: 'Cardiology_Consult_Note.pdf',
      page: 1,
      confidence: '96.2%',
      verifiedBy: null,
    },
    {
      id: 'item-3',
      title: 'Penicillin Allergy Assertion',
      category: 'Allergy',
      value: 'Explicit negative: "No Known Drug Allergies (NKDA)" noted in admission log',
      document: 'Admission_Record_2026.pdf',
      page: 1,
      confidence: '99.1%',
      verifiedBy: null,
    },
  ];

  const toggleVerify = (id: string) => {
    setVerifiedList((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0f2b48] tracking-tight">Doctor Review & Verification</h1>
            <Badge variant="primary" size="md">
              Attending Physician Audit
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Authorized doctors audit extracted clinical findings, verify diagnoses and drug regimens, and inspect original document passages.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" size="md">
            Logged Doctor: {user?.full_name}
          </Badge>
        </div>
      </div>

      <Alert type="info" title="Append-Only Clinical Audit Policy">
        Original extractions and source documents are never overwritten. All doctor reviews record doctor ID, timestamp, prior value, verified value, and clinical correction rationale.
      </Alert>

      {selectedPatient ? (
        <div className="space-y-5">
          <Card className="border-teal-200 bg-teal-50/20">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">Active Patient Review Queue</span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {selectedPatient.first_name} {selectedPatient.last_name} (DOB: {selectedPatient.date_of_birth}, Blood: {selectedPatient.blood_group})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate('/documents')}>
                  View Raw Records
                </Button>
                <Button variant="secondary" size="sm" onClick={() => navigate('/conflicts')}>
                  Inspect Conflicts
                </Button>
              </div>
            </CardContent>
          </Card>

          <div>
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
              Clinical Findings Verification Queue
            </h3>
            <div className="space-y-3">
              {sampleFindings.map((finding) => {
                const isVerified = !!verifiedList[finding.id];
                return (
                  <Card key={finding.id} className="p-4 transition-all hover:shadow-xs">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#0f2b48]">{finding.title}</span>
                          <Badge variant="neutral" size="sm">
                            {finding.category}
                          </Badge>
                          <span className="text-[11px] text-teal-700 font-medium bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            OCR Confidence: {finding.confidence}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono">
                          "{finding.value}"
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                            Source: <strong>{finding.document}</strong> (Page {finding.page})
                          </span>
                          <span>•</span>
                          <span>
                            Status:{' '}
                            <strong className={isVerified ? 'text-emerald-700' : 'text-amber-700'}>
                              {isVerified ? 'Verified by Doctor' : 'Awaiting Doctor Verification'}
                            </strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant={isVerified ? 'outline' : 'primary'}
                          size="sm"
                          onClick={() => toggleVerify(finding.id)}
                          icon={isVerified ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Stethoscope className="w-4 h-4" />}
                        >
                          {isVerified ? 'Verified' : 'Verify Finding'}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <Alert type="warning" title="No Patient Selected">
          Please select a patient profile to audit findings and verify clinical documents.
        </Alert>
      )}
    </div>
  );
};
