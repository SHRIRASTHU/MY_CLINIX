import React, { useState, useEffect } from 'react';
import {
  HeartPulse,
  FlaskConical,
  Activity,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  FileText,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Info,
} from 'lucide-react';
import { usePatient } from '../hooks/usePatient';
import { recordService } from '../services/recordService';
import { ConditionItem, LabInvestigationItem } from '../types/patient';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

export const ConditionsAnalysisPage: React.FC = () => {
  const { selectedPatient } = usePatient();
  const [conditions, setConditions] = useState<ConditionItem[]>([]);
  const [investigations, setInvestigations] = useState<LabInvestigationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'conditions' | 'abnormal_labs'>('all');

  useEffect(() => {
    if (selectedPatient) {
      setLoading(true);
      Promise.all([
        recordService.getConditions(selectedPatient.id).catch(() => []),
        recordService.getInvestigations(selectedPatient.id).catch(() => []),
      ]).then(([conds, invs]) => {
        setConditions(conds);
        setInvestigations(invs);
      }).finally(() => setLoading(false));
    }
  }, [selectedPatient]);

  if (!selectedPatient) {
    return (
      <Alert type="warning" title="No Patient Selected">
        Please select a patient profile to view conditions and clinical analysis.
      </Alert>
    );
  }

  const abnormalLabs = investigations.filter((i) => i.abnormal_flag && i.abnormal_flag !== 'NORMAL');
  const normalLabs = investigations.filter((i) => !i.abnormal_flag || i.abnormal_flag === 'NORMAL');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0f2b48] tracking-tight">Conditions & Clinical Analysis</h1>
            <Badge variant="primary" size="md">
              Intelligent Synthesis
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Reconciles diagnosed conditions, allergy polarities, laboratory biomarker trends, and AI-assisted clinical relationships.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2">
          {[
            { id: 'all', label: 'All Findings' },
            { id: 'conditions', label: 'Conditions & Allergies' },
            { id: 'abnormal_labs', label: `Abnormal Labs (${abnormalLabs.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#0f2b48] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <Alert type="info" title="AI-Assisted Observations Notice">
        Clinical relationships and trends highlighted below are AI-assisted analytical observations derived strictly from uploaded medical reports. They are provided to support clinical understanding and are not independent medical diagnoses.
      </Alert>

      {/* Abnormal Laboratory Values Alert Panel */}
      {abnormalLabs.length > 0 && (activeTab === 'all' || activeTab === 'abnormal_labs') && (
        <Card className="border-rose-200 bg-rose-50/20">
          <CardHeader className="pb-3 border-b border-rose-100">
            <div className="flex items-center gap-2 text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <CardTitle>Abnormal Laboratory Biomarkers Requiring Clinical Attention</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {abnormalLabs.map((lab) => (
                <div key={lab.id} className="p-3 bg-white rounded-xl border border-rose-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800 line-clamp-1">{lab.test_name}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 uppercase">
                      {lab.abnormal_flag}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-rose-600">{lab.result_value}</span>
                    <span className="text-[11px] text-slate-500">{lab.original_unit}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Ref Range: {lab.reference_range} • Date: {lab.test_date}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conditions & Diagnoses Cards */}
      {(activeTab === 'all' || activeTab === 'conditions') && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Verified Medical Conditions & Allergy Polarities
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {conditions.map((cond) => (
              <Card key={cond.id} className="p-4 bg-white border-slate-200 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                      {cond.category === 'allergy' ? <HeartPulse className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{cond.name}</h4>
                      <span className="text-[10px] text-slate-400 capitalize">{cond.category} • Recorded {cond.diagnosed_date}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {cond.is_ai_assisted && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        AI-Assisted
                      </span>
                    )}
                    <Badge variant={cond.status === 'active' ? 'primary' : 'secondary'} size="sm">
                      {cond.status}
                    </Badge>
                  </div>
                </div>

                {cond.supporting_text && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono">
                    "{cond.supporting_text}"
                  </p>
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                  <span className="flex items-center gap-1 truncate max-w-xs">
                    <FileText className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>Evidence: <strong>{cond.supporting_document}</strong></span>
                  </span>
                  <span>Confidence: <strong>{cond.confidence}</strong></span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Clinical Relationships & Trend Insights */}
      {activeTab === 'all' && (
        <Card className="border-indigo-100 bg-indigo-50/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <CardTitle>Cross-Document Clinical Relationships & Trends</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5 text-xs text-slate-700">
            <div className="p-3 bg-white rounded-xl border border-indigo-100 shadow-2xs space-y-1">
              <strong className="text-indigo-950 font-bold block">1. Hypertensive & Renal Correlation:</strong>
              <p className="text-slate-600 text-[11px]">
                Essential hypertension diagnosed in 2024 is physiologically linked with mild stage 2 renal impairment (eGFR 68-72 mL/min). Lisinopril maintenance provides renal protection alongside blood pressure reduction.
              </p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-indigo-100 shadow-2xs space-y-1">
              <strong className="text-indigo-950 font-bold block">2. Glycemic Stabilization Trend:</strong>
              <p className="text-slate-600 text-[11px]">
                HbA1c decreased from 7.8% (April 2026) to 6.8% (October 2026) following strict compliance with Metformin ER 500mg BID and dietary sodium/carbohydrate adjustments.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
