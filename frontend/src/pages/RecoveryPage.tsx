import React, { useState, useEffect } from 'react';
import {
  Activity,
  HeartPulse,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Stethoscope,
  Clock,
  Sparkles,
  AlertCircle,
  FileText,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { usePatient } from '../hooks/usePatient';
import { recordService } from '../services/recordService';
import { RecoverySummary } from '../types/patient';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

export const RecoveryPage: React.FC = () => {
  const { selectedPatient } = usePatient();
  const [recovery, setRecovery] = useState<RecoverySummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedPatient) {
      setLoading(true);
      recordService
        .getRecovery(selectedPatient.id)
        .then((data) => setRecovery(data))
        .catch((e) => console.error(e))
        .finally(() => setLoading(false));
    }
  }, [selectedPatient]);

  if (!selectedPatient) {
    return (
      <Alert type="warning" title="No Patient Selected">
        Please select a patient profile to view complete medical records and recovery progress.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0f2b48] tracking-tight">Record & Recovery Summary</h1>
            <Badge variant="primary" size="md">
              Evidence-Based Trends
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Summarized clinical progress, past medical procedures, diagnostic trends, and verifiable health observations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Target Parameters Controlled</span>
          </span>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Synthesizing clinical recovery records...</div>
      ) : recovery ? (
        <div className="space-y-6">
          {/* Executive Medical Summary Card */}
          <Card className="border-teal-200 bg-gradient-to-r from-teal-50/40 via-white to-slate-50 shadow-xs">
            <CardHeader className="pb-2 border-b border-teal-100 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-teal-700" />
                <CardTitle>Comprehensive Clinical Record Summary</CardTitle>
              </div>
              <Badge variant="secondary" size="sm">
                Patient Scope: {selectedPatient.first_name} {selectedPatient.last_name}
              </Badge>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <p className="text-xs text-slate-700 leading-relaxed bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                {recovery.medical_summary}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  Recovery Status: <strong className="text-emerald-700 font-semibold">{recovery.recovery_status}</strong>
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Past Conditions & Procedures Two-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Past Medical Conditions & Diagnoses */}
            <Card>
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-rose-600" />
                  <CardTitle>Past Medical Conditions & Diagnoses</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {recovery.past_conditions.map((cond, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{cond}</span>
                    <Badge variant="secondary" size="sm">Documented</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Medical Procedures & Treatments */}
            <Card>
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  <CardTitle>Relevant Procedures & Interventions</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {recovery.procedures_and_treatments.map((proc, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <span className="font-semibold text-slate-800 block">{proc}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Vitals Trend Visualizations */}
          <div>
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
              Evidentiary Vital & Biomarker Trajectories
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recovery.vital_trends.map((trend, i) => (
                <Card key={i} className="p-4 bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">{trend.parameter}</span>
                    <Badge variant={trend.status === 'improving' ? 'secondary' : 'neutral'} size="sm">
                      {trend.status.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-[#0f2b48]">{trend.current}</span>
                    <span className="text-[10px] text-slate-400">Baseline: {trend.baseline}</span>
                  </div>

                  {/* Chart */}
                  <div className="h-28 w-full pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trend.historical_data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                        <YAxis domain={['auto', 'auto']} hide />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f2b48', color: '#fff', fontSize: '11px', borderRadius: '8px' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#0d9488"
                          strokeWidth={2.5}
                          dot={{ fill: '#0d9488', r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Recovery Updates & Clinical Observations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card>
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-600" />
                  <CardTitle>Recent Recovery Updates</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {recovery.recent_updates.map((upd, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{upd}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <CardTitle>Verified Clinical Observations</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {recovery.observations.map((obs, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0 mt-1.5" />
                    <span>{obs}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
};
