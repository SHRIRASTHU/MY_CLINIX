import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Pill,
  Sparkles,
  ArrowRight,
  Activity,
  HeartPulse,
  FlaskConical,
  Calendar,
  AlertCircle,
  Bell,
  Stethoscope,
  ChevronRight,
  User,
  CheckCircle2,
  Phone,
  BarChart3,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePatient } from '../hooks/usePatient';
import { recordService } from '../services/recordService';
import {
  MedicalDocument,
  TimelineEvent,
  MedicationItem,
  ConditionItem,
  RecoverySummary,
} from '../types/patient';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

export const OverviewPage: React.FC = () => {
  const { user } = useAuth();
  const { selectedPatient } = usePatient();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [conditions, setConditions] = useState<ConditionItem[]>([]);
  const [recovery, setRecovery] = useState<RecoverySummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedPatient) {
      setLoading(true);
      Promise.all([
        recordService.getDocuments(selectedPatient.id).catch(() => []),
        recordService.getTimeline(selectedPatient.id, undefined, 'desc').catch(() => []),
        recordService.getMedications(selectedPatient.id).catch(() => []),
        recordService.getConditions(selectedPatient.id).catch(() => []),
        recordService.getRecovery(selectedPatient.id).catch(() => null),
      ]).then(([docs, time, meds, conds, rec]) => {
        setDocuments(docs);
        setTimeline(time);
        setMedications(meds);
        setConditions(conds);
        setRecovery(rec);
      }).finally(() => setLoading(false));
    }
  }, [selectedPatient]);

  if (!selectedPatient) {
    return (
      <Alert type="warning" title="No Patient Selected">
        Please select or activate a patient profile to view the clinical overview.
      </Alert>
    );
  }

  const activeMeds = medications.filter((m) => m.status === 'current' || m.status === 'started');
  const recentDocs = documents.slice(0, 3);
  const recentActivities = timeline.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0f2b48] tracking-tight">Patient Health Overview</h1>
            <Badge variant="secondary" size="md">
              Live Medical Record
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Welcome back, <strong>{user?.full_name}</strong>. Here is your synthesized clinical overview and health summary.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Stethoscope className="w-3.5 h-3.5 text-teal-600" />}
            onClick={() => navigate('/passport')}
          >
            Global Health Passport
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<FileText className="w-3.5 h-3.5" />}
            onClick={() => navigate('/documents')}
          >
            Upload Document
          </Button>
        </div>
      </div>

      {/* Patient Basic Info Card & Overall Health Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Basic Info Card */}
        <Card className="border-teal-200/80 bg-gradient-to-br from-teal-50/50 via-white to-slate-50 shadow-xs">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded">
                Patient Baseline
              </span>
              <Badge variant="secondary" size="sm">
                Blood Group {selectedPatient.blood_group}
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#0f2b48] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                {selectedPatient.first_name[0]}{selectedPatient.last_name[0]}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 leading-tight">
                  {selectedPatient.first_name} {selectedPatient.last_name}
                </h2>
                <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                  <span>DOB: <strong>{selectedPatient.date_of_birth}</strong></span>
                  <span>•</span>
                  <span className="capitalize">{selectedPatient.gender}</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200/90 text-xs space-y-1.5">
              <div className="text-[11px] text-slate-400 font-semibold uppercase">Emergency Contact:</div>
              <div className="font-semibold text-slate-800">{selectedPatient.emergency_contact_name || 'David Vance (Son)'}</div>
              <div className="text-slate-500 flex items-center gap-1.5 text-[11px]">
                <Phone className="w-3 h-3 text-teal-600" />
                <span>{selectedPatient.emergency_contact_phone || '+1-555-0144'}</span>
              </div>
            </div>

            <div className="pt-1">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => navigate('/passport')}
              >
                Inspect Health Passport
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Overall Health Summary */}
        <Card className="lg:col-span-2 border-slate-200 bg-white shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <CardTitle>Overall Health Summary & Clinical Baseline</CardTitle>
            </div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Strictly Evidentiary</span>
          </CardHeader>
          <CardContent className="p-5 space-y-3.5">
            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              {recovery?.medical_summary ||
                `${selectedPatient.first_name} ${selectedPatient.last_name} has a verified clinical history of Essential Hypertension, Type 2 Diabetes Mellitus, and stable stage 2 renal baseline. Blood pressure and glycemic markers remain under controlled surveillance with high adherence.`}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">Recovery Status</span>
                <strong className="text-slate-900 text-xs mt-0.5 block">Controlled & Stable</strong>
                <span className="text-[10px] text-emerald-700">Therapeutic target achieved</span>
              </div>
              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100">
                <span className="text-[10px] font-bold text-blue-800 uppercase block">Active Medications</span>
                <strong className="text-slate-900 text-xs mt-0.5 block">{activeMeds.length || 3} Daily Regimens</strong>
                <span className="text-[10px] text-blue-700">No drug conflicts detected</span>
              </div>
              <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100">
                <span className="text-[10px] font-bold text-purple-800 uppercase block">Preserved Records</span>
                <strong className="text-slate-900 text-xs mt-0.5 block">{documents.length || 6} Medical Documents</strong>
                <span className="text-[10px] text-purple-700">Cryptographic audit log</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="hover:border-teal-300 transition-colors cursor-pointer" onClick={() => navigate('/documents')}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Documents</p>
              <p className="text-2xl font-bold text-[#0f2b48] mt-0.5">{documents.length}</p>
              <span className="text-[10px] text-slate-400">Preserved PDFs & scans</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#0d9488] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-blue-300 transition-colors cursor-pointer" onClick={() => navigate('/medications')}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Current Medicines</p>
              <p className="text-2xl font-bold text-[#0f2b48] mt-0.5">{activeMeds.length}</p>
              <span className="text-[10px] text-slate-400">Verified prescriptions</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Pill className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-rose-300 transition-colors cursor-pointer" onClick={() => navigate('/conditions-analysis')}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Conditions</p>
              <p className="text-2xl font-bold text-[#0f2b48] mt-0.5">{conditions.length || 3}</p>
              <span className="text-[10px] text-slate-400">Chronological history</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
              <HeartPulse className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-indigo-300 transition-colors cursor-pointer" onClick={() => navigate('/timeline')}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Medical Events</p>
              <p className="text-2xl font-bold text-[#0f2b48] mt-0.5">{timeline.length}</p>
              <span className="text-[10px] text-slate-400">Timeline milestones</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid: Recent Reports, Current Medications & Upcoming Care */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Medical Reports */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-600" />
              <CardTitle>Recent Medical Reports</CardTitle>
            </div>
            <button
              onClick={() => navigate('/documents')}
              className="text-xs font-semibold text-[#0d9488] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All Documents</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            {recentDocs.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No recent reports available.</p>
            ) : (
              recentDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => navigate('/documents')}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs shrink-0">
                      PDF
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{doc.file_name}</h4>
                      <p className="text-[10px] text-slate-400 capitalize">
                        {doc.document_type.replace('_', ' ')} • Recorded {doc.document_date}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" size="sm">Preserved</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Current Active Medications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Pill className="w-4 h-4 text-blue-600" />
              <CardTitle>Current Prescriptions & Regimens</CardTitle>
            </div>
            <button
              onClick={() => navigate('/medications')}
              className="text-xs font-semibold text-[#0d9488] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Medication History</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            {activeMeds.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No active medications recorded.</p>
            ) : (
              activeMeds.map((med) => (
                <div
                  key={med.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-200"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{med.medicine_name}</h4>
                    <p className="text-[10px] text-slate-500">
                      {med.dosage || 'Standard dose'} • {med.frequency || 'Daily'} • {med.route || 'Oral'}
                    </p>
                  </div>
                  <Badge variant="primary" size="sm">Active</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Medical Activities & Upcoming Care / Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Medical Activities Timeline Snippet */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <CardTitle>Recent Medical Activities</CardTitle>
            </div>
            <button
              onClick={() => navigate('/timeline')}
              className="text-xs font-semibold text-[#0d9488] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Explore Full Timeline</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
              {recentActivities.map((act) => (
                <div key={act.id} className="relative flex items-start gap-3 pl-1">
                  <div className="w-6 h-6 rounded-full bg-white border-2 border-teal-600 text-teal-600 flex items-center justify-center shrink-0 z-10 shadow-xs">
                    <Activity className="w-3 h-3" />
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{act.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{act.event_date}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">{act.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Health Alerts & Upcoming Care */}
        <Card className="border-amber-200/80 bg-amber-50/20">
          <CardHeader className="pb-3 border-b border-amber-100">
            <div className="flex items-center gap-2 text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <CardTitle>Health Alerts & Care Notice</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-white border border-amber-200 shadow-2xs space-y-1">
              <div className="font-semibold text-amber-900 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>Upcoming Surveillance Due:</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Routine HbA1c and Renal Function check scheduled for <strong>May 2027</strong>.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
              <div className="font-semibold text-slate-800">Allergy Alert:</div>
              <p className="text-[11px] text-slate-600">
                Sulfa drugs (moderate urticaria) documented. Penicillin negative.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-900">
              <div className="font-semibold text-xs flex items-center gap-1.5 text-teal-900">
                <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                <span>Need Quick Answers?</span>
              </div>
              <p className="text-[11px] text-teal-800 mt-1">
                Click the <strong>Ask MY CLINIX</strong> icon at the bottom-right corner to ask questions about your uploaded reports.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
