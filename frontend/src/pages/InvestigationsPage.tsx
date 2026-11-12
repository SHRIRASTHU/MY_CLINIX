import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FlaskConical,
  Globe,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Eye,
  RefreshCw,
  Calculator,
} from 'lucide-react';
import { usePatient } from '../hooks/usePatient';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { normalizationService } from '../services/normalizationService';

export const InvestigationsPage: React.FC = () => {
  const { selectedPatient } = usePatient();
  const navigate = useNavigate();

  // Unit mode: 'native' (original doc units) vs 'normalized' (international SI units)
  const [unitMode, setUnitMode] = useState<'native' | 'normalized'>('native');
  const [investigations, setInvestigations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!selectedPatient) return;
    setLoading(true);
    // Fetch travel summary to get enriched investigations with normalized values and provenance
    normalizationService
      .getTravelSummary(selectedPatient.id, 'GB', 'IN')
      .then((data) => {
        setInvestigations(data.investigations || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [selectedPatient]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0f2b48] tracking-tight">Diagnostic Investigations</h1>
            <Badge variant="primary" size="md">
              Lab Panels & Scans
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Reconciles blood chemistry, hematology, and kidney panels across international clinics with zero loss of native units.
          </p>
        </div>

        {/* Global Normalization & Travel Mode Quick Action */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/passport')}
            className="flex items-center gap-1.5 text-xs text-teal-800 bg-teal-50 border-teal-200 hover:bg-teal-100"
          >
            <Globe className="w-3.5 h-3.5 text-[#0d9488]" />
            <span>Open Global Health Passport</span>
          </Button>
        </div>
      </div>

      {/* Universal Normalization Engine Callout Banner */}
      <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0d9488] text-white flex items-center justify-center font-bold">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-teal-900 flex items-center gap-2">
              <span>Universal Medical Normalization Engine Active</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-semibold">
                Cross-Border Interoperability
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Current view can seamlessly toggle between <strong>Native Source Units</strong> (as printed on original reports)
              and <strong>Normalized International Units</strong> (LOINC standard mmol/L & g/L) while preserving exact provenance.
            </p>
          </div>
        </div>

        {/* Unit Mode Switcher */}
        <div className="flex items-center bg-white p-1 rounded-lg border border-slate-300 shadow-2xs">
          <button
            onClick={() => setUnitMode('native')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              unitMode === 'native'
                ? 'bg-[#0f2b48] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Original Native Units
          </button>
          <button
            onClick={() => setUnitMode('normalized')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              unitMode === 'normalized'
                ? 'bg-[#0d9488] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Normalized (SI / International)
          </button>
        </div>
      </div>

      {selectedPatient ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-[#0d9488]" />
                Laboratory Investigations Log for {selectedPatient.first_name} {selectedPatient.last_name}
              </CardTitle>
              <Badge variant="neutral" size="sm">
                Displaying: {unitMode === 'native' ? 'Original Document Units' : 'Normalized International Units'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading diagnostic panels...</div>
            ) : investigations.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No diagnostic test entries found. Upload clinical reports to extract investigations.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Test Name</th>
                      <th className="py-3 px-4">
                        {unitMode === 'native' ? 'Reported Value & Unit' : 'Normalized Value (Converted)'}
                      </th>
                      <th className="py-3 px-4">Reference Range</th>
                      <th className="py-3 px-4">Flag / Status</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Interoperability Audit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {investigations.map((inv, idx) => {
                      const isHigh =
                        inv.abnormal_flag === 'HIGH' ||
                        inv.abnormal_flag === 'ABNORMAL' ||
                        inv.abnormal_flag === 'ELEVATED';
                      return (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {inv.test_name}
                          </td>

                          <td className="py-3 px-4">
                            {unitMode === 'native' ? (
                              <span className="font-extrabold text-slate-900 text-sm">
                                {inv.result_value} <span className="text-xs font-semibold text-slate-500">{inv.original_unit}</span>
                              </span>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="font-extrabold text-teal-800 text-sm">
                                  {inv.normalized_value}{' '}
                                  <span className="text-xs font-semibold text-teal-600">{inv.normalized_unit}</span>
                                </span>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  Orig: {inv.result_value} {inv.original_unit}
                                </div>
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-slate-600">
                            {inv.reference_range || 'Not specified'}
                          </td>

                          <td className="py-3 px-4">
                            {isHigh ? (
                              <Badge variant="warning" size="sm">
                                {inv.abnormal_flag}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" size="sm">
                                Normal
                              </Badge>
                            )}
                          </td>

                          <td className="py-3 px-4 text-slate-500">{inv.test_date || 'N/A'}</td>

                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="text-xs"
                              onClick={() => navigate('/passport')}
                            >
                              <Globe className="w-3.5 h-3.5 mr-1" />
                              View Passport
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Alert type="warning" title="No Patient Selected">
          Please select a patient to view investigations.
        </Alert>
      )}
    </div>
  );
};
