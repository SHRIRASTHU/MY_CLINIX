import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  FileText,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Pill,
  Sparkles,
  ArrowRight,
  Activity,
  CheckCircle2,
  Database,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePatient } from '../hooks/usePatient';
import { apiRequest } from '../services/apiClient';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

export const OverviewPage: React.FC = () => {
  const { user } = useAuth();
  const { patients, selectedPatient } = usePatient();
  const navigate = useNavigate();

  const [systemHealth, setSystemHealth] = useState<{ status: string; database: string } | null>(null);

  useEffect(() => {
    apiRequest<{ status: string; database: string }>('/health')
      .then((data) => setSystemHealth(data))
      .catch(() => setSystemHealth({ status: 'offline', database: 'disconnected' }));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header with Welcome and Active Patient Info */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0f2b48] tracking-tight">
              Clinical Workspace Overview
            </h1>
            <Badge variant="secondary" size="md">
              v1.0.0
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Welcome back, <strong>{user?.full_name}</strong> ({user?.role}). Evidentiary multi-document clinical intelligence active.
          </p>
        </div>

        {/* System Health Pill */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs shadow-2xs">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-600 font-medium">Backend & DB:</span>
          <span className="font-semibold text-emerald-700 capitalize">
            {systemHealth?.status === 'healthy' ? 'Operational' : 'Connecting...'}
          </span>
        </div>
      </div>

      {/* Core Principle Callout */}
      <div className="rounded-xl bg-gradient-to-r from-[#0f2b48] to-[#133b63] p-5 text-white shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 text-teal-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Evidentiary Healthcare Architecture</span>
          </div>
          <h2 className="text-lg font-bold tracking-tight text-white mb-1.5">
            EVERY MEDICAL FINDING MUST BE TRACEABLE TO ITS ORIGINAL SOURCE
          </h2>
          <p className="text-xs text-slate-200 leading-relaxed opacity-95">
            MY CLINIX reconciles fragmented prescriptions, lab panels, and scan reports into an immutable, chronological timeline.
            Contradictions, duplicate records, and dosage changes are surfaced transparently without hallucinating or silently modifying clinical facts.
          </p>
        </div>
        <div className="absolute -right-6 -bottom-6 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Active Patient Highlight Card */}
      {selectedPatient ? (
        <Card className="border-teal-200 bg-teal-50/20">
          <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#0d9488]">Active Patient Scope</span>
                <Badge variant="secondary" size="sm">
                  {selectedPatient.access_level}
                </Badge>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                {selectedPatient.first_name} {selectedPatient.last_name}
              </h3>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-1">
                <span>DOB: <strong>{selectedPatient.date_of_birth}</strong></span>
                <span>•</span>
                <span>Gender: <strong>{selectedPatient.gender}</strong></span>
                <span>•</span>
                <span>Blood Group: <strong>{selectedPatient.blood_group}</strong></span>
                {selectedPatient.emergency_contact_phone && (
                  <>
                    <span>•</span>
                    <span>Emergency: <strong>{selectedPatient.emergency_contact_name} ({selectedPatient.emergency_contact_phone})</strong></span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/patients')}
              >
                Switch Patient
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<ArrowRight className="w-4 h-4" />}
                onClick={() => navigate('/documents')}
              >
                View Patient Records
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Alert type="warning" title="No Active Patient Selected">
          You currently have no patient profile active. Please{' '}
          <button onClick={() => navigate('/patients')} className="font-bold underline text-amber-950 cursor-pointer">
            create or select a patient profile
          </button>{' '}
          to upload documents and inspect clinical intelligence.
        </Alert>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Authorized Patients</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{patients.length}</p>
              <span className="text-[11px] text-slate-400">Strict patient isolation</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Documents Uploaded</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{selectedPatient?.documents_count || 0}</p>
              <span className="text-[11px] text-slate-400">PDF, JPG, PNG preserved</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-[#0d9488] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Traceable Findings</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{selectedPatient?.findings_count || 0}</p>
              <span className="text-[11px] text-slate-400">Linked to page & text spans</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contradictions Flagged</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{selectedPatient?.contradictions_count || 0}</p>
              <span className="text-[11px] text-slate-400">Awaiting reviewer audit</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Launchpad to Modules */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-3">Clinical Launchpad</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="hover:border-slate-300 transition-all cursor-pointer" onClick={() => navigate('/documents')}>
            <CardContent className="p-5">
              <div className="w-9 h-9 rounded-lg bg-teal-50 text-[#0d9488] flex items-center justify-center mb-3">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-slate-900">Document Ingestion</h4>
              <p className="text-xs text-slate-500 mt-1">
                Upload prescriptions, lab panels, and discharge notes. Runs OCR and structured evidentiary extraction.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:border-slate-300 transition-all cursor-pointer" onClick={() => navigate('/timeline')}>
            <CardContent className="p-5">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#0f2b48] flex items-center justify-center mb-3">
                <Clock className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-slate-900">Medical Timeline</h4>
              <p className="text-xs text-slate-500 mt-1">
                Explore an interactive chronological event sequence. Keeps event dates distinct from upload dates.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:border-slate-300 transition-all cursor-pointer" onClick={() => navigate('/ask-ai')}>
            <CardContent className="p-5">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-slate-900">Ask MY CLINIX AI</h4>
              <p className="text-xs text-slate-500 mt-1">
                Ask evidence-grounded queries with strict source citations. Never diagnoses or gives medical advice.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
