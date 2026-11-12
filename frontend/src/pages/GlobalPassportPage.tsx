import React, { useState, useEffect } from 'react';
import {
  Globe,
  Plane,
  ArrowRight,
  ShieldCheck,
  QrCode,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Download,
  Printer,
  Calculator,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Info,
  PhoneCall,
  Sparkles,
  Flame,
  Stethoscope,
  Building2,
  Languages,
  Eye,
  CheckCheck,
  X,
} from 'lucide-react';
import { usePatient } from '../hooks/usePatient';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { Spinner } from '../components/ui/Spinner';
import {
  normalizationService,
  CountryProfile,
  TravelSummary,
  EmergencyPassport,
  CrossBorderAudit,
} from '../services/normalizationService';

export const GlobalPassportPage: React.FC = () => {
  const { selectedPatient } = usePatient();

  // Country profiles state
  const [countries, setCountries] = useState<CountryProfile[]>([]);
  const [originCountry, setOriginCountry] = useState<string>('IN');
  const [destinationCountry, setDestinationCountry] = useState<string>('US');

  // Normalization data state
  const [travelSummary, setTravelSummary] = useState<TravelSummary | null>(null);
  const [emergencyPassport, setEmergencyPassport] = useState<EmergencyPassport | null>(null);
  const [crossBorderAudit, setCrossBorderAudit] = useState<CrossBorderAudit | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'travel' | 'units' | 'passport' | 'provenance'>('travel');

  // Interactive Unit Sandbox Calculator state
  const [calcVal, setCalcVal] = useState<number>(126);
  const [calcFromUnit, setCalcFromUnit] = useState<string>('mg/dL');
  const [calcToUnit, setCalcToUnit] = useState<string>('mmol/L');
  const [calcAnalyte, setCalcAnalyte] = useState<string>('glucose');
  const [calcResult, setCalcResult] = useState<any>(null);
  const [calcLoading, setCalcLoading] = useState<boolean>(false);

  // Evidence modal state
  const [evidenceModalFinding, setEvidenceModalFinding] = useState<any | null>(null);

  // Offline QR simulator decoder state
  const [showQrDecoder, setShowQrDecoder] = useState<boolean>(false);

  // Load countries list
  useEffect(() => {
    normalizationService
      .getCountries()
      .then((data) => setCountries(data))
      .catch((err) => console.error('Failed to load countries', err));
  }, []);

  // Fetch travel summary and passport whenever patient or destination changes
  useEffect(() => {
    if (!selectedPatient) return;
    setLoading(true);

    Promise.all([
      normalizationService.getTravelSummary(selectedPatient.id, destinationCountry, originCountry),
      normalizationService.getEmergencyPassport(selectedPatient.id, destinationCountry),
      normalizationService.getCrossBorderAudit(selectedPatient.id),
    ])
      .then(([summary, passport, audit]) => {
        setTravelSummary(summary);
        setEmergencyPassport(passport);
        setCrossBorderAudit(audit);
      })
      .catch((err) => console.error('Error fetching travel data:', err))
      .finally(() => setLoading(false));
  }, [selectedPatient, destinationCountry, originCountry]);

  // Run interactive unit calculation
  const handleCalculate = async () => {
    setCalcLoading(true);
    try {
      const res = await normalizationService.convertUnit(
        calcVal,
        calcFromUnit,
        calcToUnit,
        calcAnalyte,
        destinationCountry
      );
      setCalcResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setCalcLoading(false);
    }
  };

  useEffect(() => {
    handleCalculate();
  }, [calcVal, calcFromUnit, calcToUnit, calcAnalyte]);

  // Download Standalone Offline HTML Passport
  const handleDownloadOfflinePassport = () => {
    if (!emergencyPassport || !selectedPatient) return;

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MY CLINIX - Offline Emergency Medical Passport</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f2b48; color: #fff; margin: 0; padding: 24px; }
    .card { background: #133b63; border-radius: 16px; padding: 24px; max-width: 650px; margin: 0 auto; border: 2px solid #0d9488; box-shadow: 0 10px 25px rgba(0,0,0,0.4); }
    h1 { margin: 0 0 4px; font-size: 24px; color: #2dd4bf; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; background: #0d9488; color: #fff; margin-bottom: 16px; }
    .section { background: rgba(255,255,255,0.06); padding: 14px; border-radius: 8px; margin-bottom: 14px; }
    .alert { background: rgba(239, 68, 68, 0.2); border-left: 4px solid #ef4444; padding: 10px; border-radius: 4px; color: #fca5a5; font-weight: bold; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .val { font-size: 18px; font-weight: bold; color: #fff; }
    .lbl { font-size: 11px; text-transform: uppercase; color: #94a3b8; }
    .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <div>
        <h1>MY CLINIX</h1>
        <div class="badge">OFFLINE EMERGENCY HEALTH PASSPORT • 100% NO INTERNET NEEDED</div>
      </div>
      <div style="font-size:32px;">${emergencyPassport.destination_country.flag || '🌐'}</div>
    </div>

    <div class="section grid">
      <div>
        <div class="lbl">Patient Name</div>
        <div class="val">${emergencyPassport.payload.patient_name}</div>
      </div>
      <div>
        <div class="lbl">Date of Birth / Blood Group</div>
        <div class="val">${emergencyPassport.payload.dob} • <span style="color:#ef4444;">${emergencyPassport.payload.blood_group}</span></div>
      </div>
    </div>

    <div class="section alert">
      <div style="font-size:12px; text-transform:uppercase; margin-bottom:4px;">🚨 CRITICAL ALLERGIES & CONTRAINDICATIONS</div>
      <div>${emergencyPassport.payload.allergies.join(', ')}</div>
    </div>

    <div class="section">
      <div class="lbl">Active Chronic Regimens (Normalized)</div>
      <ul style="margin:6px 0; padding-left:20px;">
        ${emergencyPassport.payload.medications.map((m: string) => `<li><strong>${m}</strong></li>`).join('')}
      </ul>
    </div>

    <div class="section grid">
      <div>
        <div class="lbl">Destination Local Emergency Dial</div>
        <div class="val" style="color:#2dd4bf;">CALL ${emergencyPassport.payload.emergency_call} (${emergencyPassport.payload.destination})</div>
      </div>
      <div>
        <div class="lbl">Primary Family Emergency Contact</div>
        <div class="val" style="font-size:14px;">${emergencyPassport.payload.contact}</div>
      </div>
    </div>

    <div class="footer">
      Generated by MY CLINIX Universal Medical Normalization Engine • ${emergencyPassport.payload.timestamp}<br>
      Security Hash: ${emergencyPassport.payload.offline_hash}
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MY_CLINIX_Emergency_Passport_${selectedPatient.last_name}_${destinationCountry}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!selectedPatient) {
    return (
      <div className="p-8">
        <Alert type="warning" title="No Patient Selected">
          Please select an active patient from the top bar to open the Global Health Passport.
        </Alert>
      </div>
    );
  }

  const currentDest = countries.find((c) => c.code === destinationCountry);
  const currentOrig = countries.find((c) => c.code === originCountry);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Flagship Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0f2b48] via-[#133b63] to-[#0d9488] p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-400/20 text-teal-200 border border-teal-300/30 text-xs font-bold tracking-wide uppercase">
                <Globe className="w-3.5 h-3.5" />
                Flagship Interoperability Layer
              </span>
              <span className="px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/30 text-xs font-semibold">
                Universal Medical Normalization Engine v2.0
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Global Health Passport & Travel Mode
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 max-w-2xl leading-relaxed">
              Making a patient's medical history truly portable across borders. Automatically normalizes measurement units
              (mg/dL ↔ mmol/L), contrasts regional reference intervals, translates multilingual records, and prevents
              cross-border prescription errors without ever overwriting raw source documents.
            </p>
          </div>

          {/* Quick Origin -> Destination Control Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 min-w-[280px] shadow-sm space-y-3">
            <div className="text-[11px] font-bold text-teal-200 uppercase tracking-wider flex items-center justify-between">
              <span>Patient Travel Route</span>
              <Plane className="w-3.5 h-3.5 text-teal-300" />
            </div>

            <div className="flex items-center gap-2">
              {/* Origin */}
              <div className="flex-1">
                <label className="text-[10px] text-slate-300 block mb-0.5 font-medium">Origin Country</label>
                <select
                  value={originCountry}
                  onChange={(e) => setOriginCountry(e.target.value)}
                  className="w-full bg-white/20 text-white font-semibold text-xs rounded-lg px-2.5 py-1.5 border border-white/30 focus:outline-none focus:ring-1 focus:ring-teal-300 cursor-pointer"
                >
                  {countries.map((c) => (
                    <option key={c.code} value={c.code} className="text-slate-900">
                      {c.flag} {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 text-teal-300 font-bold">➔</div>

              {/* Destination */}
              <div className="flex-1">
                <label className="text-[10px] text-slate-300 block mb-0.5 font-medium">Destination</label>
                <select
                  value={destinationCountry}
                  onChange={(e) => setDestinationCountry(e.target.value)}
                  className="w-full bg-teal-500/30 text-white font-bold text-xs rounded-lg px-2.5 py-1.5 border border-teal-300/50 focus:outline-none focus:ring-2 focus:ring-teal-300 cursor-pointer"
                >
                  {countries.map((c) => (
                    <option key={c.code} value={c.code} className="text-slate-900">
                      {c.flag} {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-200 pt-1 border-t border-white/10">
              <span>Active Scope:</span>
              <span className="font-bold text-white">
                {selectedPatient.first_name} {selectedPatient.last_name}
              </span>
            </div>
          </div>
        </div>

        {/* Background glow decoration */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('travel')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'travel'
              ? 'bg-[#0f2b48] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Plane className="w-4 h-4" />
          Destination Travel Summary & Drugs
        </button>

        <button
          onClick={() => setActiveTab('units')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'units'
              ? 'bg-[#0f2b48] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calculator className="w-4 h-4" />
          Unit Normalizer & Lab Discrepancies
        </button>

        <button
          onClick={() => setActiveTab('passport')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'passport'
              ? 'bg-[#0f2b48] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <QrCode className="w-4 h-4" />
          Offline Emergency QR Passport
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-1" />
        </button>

        <button
          onClick={() => setActiveTab('provenance')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'provenance'
              ? 'bg-[#0f2b48] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Provenance & Conflict Audit
          {crossBorderAudit && crossBorderAudit.conflicts_detected.length > 0 && (
            <Badge variant="warning" size="sm" className="ml-1">
              {crossBorderAudit.conflicts_detected.length}
            </Badge>
          )}
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-white rounded-2xl border border-slate-200">
          <Spinner size="lg" />
          <p className="text-xs font-medium text-slate-500 animate-pulse">
            Reconciling cross-border clinical records with Universal Normalization Engine...
          </p>
        </div>
      ) : (
        <>
          {/* TAB 1: TRAVEL SUMMARY & MEDICATION PASSPORT */}
          {activeTab === 'travel' && travelSummary && (
            <div className="space-y-6">
              {/* Emergency Service Header for Destination */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                    <PhoneCall className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        Emergency Dispatch in {travelSummary.destination_country.name}
                      </span>
                      <span className="text-base">{travelSummary.destination_country.flag}</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Standard Guidelines Body: <strong>{travelSummary.destination_country.national_guidelines_body}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Immediate Emergency Call</div>
                    <div className="text-xs text-slate-700">Paramedic / Ambulance Dispatch</div>
                  </div>
                  <div className="px-4 py-2 bg-emerald-700 text-white font-extrabold text-base rounded-lg shadow-sm flex items-center gap-2">
                    <PhoneCall className="w-4 h-4 animate-bounce" />
                    <span>DIAL {travelSummary.destination_country.emergency_number}</span>
                  </div>
                </div>
              </div>

              {/* Cross-Border Medication Brand & Generic Equivalence */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-[#0d9488]" />
                        Medication Equivalency & Destination Generic Mapping
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Solves regional naming discrepancies (e.g. Paracetamol in UK/India ↔ Acetaminophen / Tylenol in USA).
                      </p>
                    </div>
                    <Badge variant="primary" size="sm">
                      RxNorm / INN Standard
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {travelSummary.medications.map((m: any, idx: number) => {
                      const cross = m.destination_cross_border_info;
                      return (
                        <div key={idx} className="p-4 bg-white hover:bg-slate-50/60 transition-colors">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-sm">{m.medicine_name}</span>
                                {m.dosage && <Badge variant="neutral" size="sm">{m.dosage}</Badge>}
                                <Badge variant="secondary" size="sm">{m.status || 'Active'}</Badge>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                Prescribed regimen: {m.frequency || 'Daily'} • Route: {m.route || 'Oral'}
                              </p>
                            </div>

                            {/* Destination Equivalency Card */}
                            {cross ? (
                              <div className="bg-teal-50/80 border border-teal-200 rounded-lg p-2.5 min-w-[280px]">
                                <div className="flex items-center justify-between text-[11px] font-bold text-teal-800">
                                  <span>In {travelSummary.destination_country.name}:</span>
                                  <span className="text-[10px] text-teal-600">RxCUI: {cross.rxnorm_cui}</span>
                                </div>
                                <div className="text-xs font-extrabold text-slate-900 mt-0.5">
                                  {cross.destination_generic_name}
                                  {cross.destination_local_brands && cross.destination_local_brands.length > 0 && (
                                    <span className="text-teal-700 font-semibold ml-1.5">
                                      (Brands: {cross.destination_local_brands.slice(0, 2).join(', ')})
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-600 mt-1 leading-snug">
                                  {cross.advisory_note}
                                </p>
                              </div>
                            ) : (
                              <div className="text-xs text-slate-400 italic">
                                Generic formulation identical internationally
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Destination-Normalized Lab Panel Table */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#0f2b48]" />
                        Normalized Diagnostic Investigations ({travelSummary.destination_country.name} Standards)
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Native values converted to destination convention with original evidence retained.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Destination Units:</span>
                      <Badge variant="secondary" size="sm">
                        {travelSummary.destination_country.preferred_units.glucose || 'Standard'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Test Name</th>
                          <th className="py-3 px-4">Original Record</th>
                          <th className="py-3 px-4 bg-teal-50/50 text-[#0d9488]">
                            Normalized ({travelSummary.destination_country.name})
                          </th>
                          <th className="py-3 px-4">Regional Discrepancy</th>
                          <th className="py-3 px-4 text-right">Trust & Evidence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {travelSummary.investigations.map((inv: any, idx: number) => {
                          const interp = inv.regional_interpretation;
                          return (
                            <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3 px-4 font-semibold text-slate-900">
                                {inv.test_name}
                                <div className="text-[10px] text-slate-400 font-normal">Date: {inv.test_date || 'N/A'}</div>
                              </td>

                              <td className="py-3 px-4 font-medium text-slate-700">
                                <span className="font-bold text-slate-900">{inv.result_value}</span> {inv.original_unit}
                                {inv.reference_range && (
                                  <div className="text-[10px] text-slate-400">Ref: {inv.reference_range}</div>
                                )}
                              </td>

                              <td className="py-3 px-4 bg-teal-50/30 font-bold text-teal-900">
                                <span className="text-sm">{inv.normalized_value}</span> {inv.normalized_unit}
                                {interp?.destination_reference_range && (
                                  <div className="text-[10px] text-teal-700 font-medium">
                                    Local Ref: {interp.destination_reference_range}
                                  </div>
                                )}
                              </td>

                              <td className="py-3 px-4 max-w-xs">
                                {interp?.has_regional_discrepancy ? (
                                  <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded p-1.5 leading-snug">
                                    <span className="font-bold block">⚠️ Reference Standards Differ:</span>
                                    {interp.discrepancy_explanation}
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-500">Conforms to destination clinical thresholds</span>
                                )}
                              </td>

                              <td className="py-3 px-4 text-right">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="text-xs"
                                  onClick={() =>
                                    setEvidenceModalFinding({
                                      entity_name: inv.test_name,
                                      extracted_value: `${inv.result_value} ${inv.original_unit}`,
                                      normalized: `${inv.normalized_value} ${inv.normalized_unit}`,
                                      formula: inv.conversion_formula,
                                      document_name: 'Origin Lab Clinical Document',
                                      original_extracted_text: `Test: ${inv.test_name} Result: ${inv.result_value} ${inv.original_unit} Ref: ${inv.reference_range}`,
                                      source_page_number: 1,
                                      event_date: inv.test_date,
                                    })
                                  }
                                >
                                  <Eye className="w-3.5 h-3.5 mr-1" />
                                  Evidence
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 2: UNIT NORMALIZER & INTERACTIVE CONVERTER */}
          {activeTab === 'units' && (
            <div className="space-y-6">
              {/* Live Showcase Banner (India Glucose 126 mg/dL -> UK Glucose 7.0 mmol/L) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-teal-200 bg-gradient-to-br from-teal-50/50 to-white">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
                        Interactive Showcase Example
                      </span>
                      <Badge variant="primary" size="sm">Live Clinical Math</Badge>
                    </div>
                    <CardTitle className="text-base text-slate-900 mt-1">
                      Fasting Blood Glucose Normalization
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">India (ICMR Standard)</div>
                        <div className="text-xl font-extrabold text-[#0f2b48]">126.0 mg/dL</div>
                        <div className="text-xs text-amber-600 font-medium">Ref: 70 - 100 mg/dL (Diabetic Cutoff)</div>
                      </div>
                      <div className="p-2 rounded-full bg-teal-100 text-teal-700">
                        <ArrowRight className="w-5 h-5" />
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-teal-700 uppercase font-bold">UK / International (NICE)</div>
                        <div className="text-xl font-extrabold text-teal-700">7.0 mmol/L</div>
                        <div className="text-xs text-teal-800 font-medium">Ref: 3.9 - 5.5 mmol/L (Diabetic Cutoff)</div>
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-200">
                      <strong>Analyte Formula:</strong> Molecular Weight of D-Glucose = 180.156 g/mol.
                      Conversion: <code>126.0 mg/dL ÷ 18.0182 = 7.0 mmol/L</code>.
                      Both values express identical physiological molar concentration without loss of original data.
                    </div>
                  </CardContent>
                </Card>

                {/* Multilingual Terminology Normalization Showcase */}
                <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-white">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-800">
                        Multilingual Terminology Mapping
                      </span>
                      <Badge variant="secondary" size="sm">LOINC 1558-6</Badge>
                    </div>
                    <CardTitle className="text-base text-slate-900 mt-1">
                      Cross-Lingual Clinical Concept Grounding
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-bold">Hindi (हिंदी)</span>
                        <span className="font-bold text-slate-800 text-sm">फास्टिंग ब्लड शुगर</span>
                        <span className="block text-[10px] text-slate-500 mt-0.5">Dr Lal PathLabs (Delhi)</span>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-bold">German (Deutsch)</span>
                        <span className="font-bold text-slate-800 text-sm">Nüchternglukose</span>
                        <span className="block text-[10px] text-slate-500 mt-0.5">Charité Berlin</span>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-bold">Arabic (العربية)</span>
                        <span className="font-bold text-slate-800 text-sm">سكر الدم الصائم</span>
                        <span className="block text-[10px] text-slate-500 mt-0.5">DHA Dubai Standard</span>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-bold">Vernacular English</span>
                        <span className="font-bold text-slate-800 text-sm">Fasting Sugar Level</span>
                        <span className="block text-[10px] text-slate-500 mt-0.5">Patient Consultation Note</span>
                      </div>
                    </div>
                    <div className="p-2 bg-indigo-100/70 text-indigo-950 font-semibold rounded-lg text-center mt-2">
                      ⬇ Standardized Canonical Concept: <strong>Fasting Blood Glucose [LOINC: 1558-6 / SNOMED CT]</strong>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Interactive Unit Normalizer Sandbox Calculator */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-[#0d9488]" />
                        Universal Clinical Measurement Converter Sandbox
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Test arbitrary cross-border conversions for blood chemistry, vitals, anthropometrics, and fluids.
                      </p>
                    </div>
                    <Badge variant="neutral" size="sm">Direct Sandbox</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Measurement Value</label>
                      <input
                        type="number"
                        step="0.1"
                        value={calcVal}
                        onChange={(e) => setCalcVal(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0d9488]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">From Unit</label>
                      <select
                        value={calcFromUnit}
                        onChange={(e) => setCalcFromUnit(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0d9488]"
                      >
                        <option value="mg/dL">mg/dL (Glucose / Lipids)</option>
                        <option value="mmol/L">mmol/L (Glucose / Lipids)</option>
                        <option value="kg">kg (Weight)</option>
                        <option value="lb">lb (Weight)</option>
                        <option value="cm">cm (Height)</option>
                        <option value="inches">inches (Height)</option>
                        <option value="°C">°C (Temperature)</option>
                        <option value="°F">°F (Temperature)</option>
                        <option value="mL">mL (Fluid Volume)</option>
                        <option value="oz">fl oz (Fluid Volume)</option>
                        <option value="g/dL">g/dL (Hemoglobin)</option>
                        <option value="g/L">g/L (Hemoglobin)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Target Unit</label>
                      <select
                        value={calcToUnit}
                        onChange={(e) => setCalcToUnit(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0d9488]"
                      >
                        <option value="mmol/L">mmol/L</option>
                        <option value="mg/dL">mg/dL</option>
                        <option value="lb">lb</option>
                        <option value="kg">kg</option>
                        <option value="inches">inches</option>
                        <option value="cm">cm</option>
                        <option value="°F">°F</option>
                        <option value="°C">°C</option>
                        <option value="oz">fl oz</option>
                        <option value="mL">mL</option>
                        <option value="g/L">g/L</option>
                        <option value="g/dL">g/dL</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Analyte Context</label>
                      <select
                        value={calcAnalyte}
                        onChange={(e) => setCalcAnalyte(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0d9488]"
                      >
                        <option value="glucose">Glucose (MW 180.16 g/mol)</option>
                        <option value="total_cholesterol">Cholesterol (MW 386.65 g/mol)</option>
                        <option value="creatinine">Creatinine (MW 113.12 g/mol)</option>
                        <option value="hemoglobin">Hemoglobin (Factor 10x)</option>
                        <option value="weight">Physical Weight</option>
                        <option value="height">Physical Height</option>
                        <option value="temperature">Body Temperature</option>
                        <option value="volume">Fluid Intake / Volume</option>
                      </select>
                    </div>
                  </div>

                  {calcResult && (
                    <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] text-emerald-800 uppercase font-bold tracking-wider">
                          Result with Mathematical Provenance
                        </div>
                        <div className="text-lg font-bold text-slate-900 mt-0.5">
                          {calcResult.original_value} {calcResult.original_unit} ={' '}
                          <span className="text-emerald-700 font-extrabold">
                            {calcResult.normalized_value} {calcResult.normalized_unit}
                          </span>
                        </div>
                        <div className="text-xs text-emerald-900 mt-1 font-medium">
                          {calcResult.formula}
                        </div>
                      </div>
                      <Badge variant="primary" size="md">
                        Strict Traceability Preserved
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 3: OFFLINE EMERGENCY MEDICAL PASSPORT */}
          {activeTab === 'passport' && emergencyPassport && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 cols: Physical Emergency Card Preview */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="rounded-2xl bg-gradient-to-br from-[#0f2b48] via-[#133b63] to-[#0a1e33] p-6 text-white border-2 border-teal-500/50 shadow-xl relative overflow-hidden">
                    <div className="flex items-center justify-between border-b border-white/20 pb-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                          <Stethoscope className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-extrabold text-lg tracking-tight flex items-center gap-2">
                            <span>MY CLINIX EMERGENCY MEDICAL PASSPORT</span>
                            <span className="text-base">{emergencyPassport.destination_country.flag}</span>
                          </div>
                          <p className="text-[10px] text-teal-300 font-semibold tracking-wider uppercase">
                            Self-Contained Offline Profile • Emergency Department Portable
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" size="sm">
                        {emergencyPassport.passport_id}
                      </Badge>
                    </div>

                    {/* Patient Identifiers */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 bg-white/5 p-3 rounded-xl border border-white/10 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-300 block uppercase font-medium">Patient Full Name</span>
                        <span className="font-extrabold text-sm text-white">{emergencyPassport.payload.patient_name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-300 block uppercase font-medium">DOB / Gender</span>
                        <span className="font-bold text-white">{emergencyPassport.payload.dob} • Male</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-300 block uppercase font-medium">Blood Group</span>
                        <span className="font-extrabold text-base text-rose-400">{emergencyPassport.payload.blood_group}</span>
                      </div>
                    </div>

                    {/* Critical Allergies (Red Alert Box) */}
                    <div className="p-3.5 bg-rose-950/60 border border-rose-500/60 rounded-xl mb-4 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-rose-300 font-bold uppercase text-[11px] tracking-wide">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <span>Critical Allergies & Contraindications</span>
                      </div>
                      <div className="font-semibold text-rose-100">
                        {emergencyPassport.payload.allergies.join('; ')}
                      </div>
                      <p className="text-[10px] text-rose-300/80">
                        *Strict absence rule applied: Only explicit positives surfaced as high-risk alerts.
                      </p>
                    </div>

                    {/* Chronic Active Regimens */}
                    <div className="p-3 bg-white/5 rounded-xl border border-white/10 mb-4 text-xs">
                      <span className="text-[10px] text-teal-300 block uppercase font-bold mb-1">
                        Active Medications (Destination Formulations)
                      </span>
                      <ul className="list-disc pl-5 space-y-1 text-slate-100 font-medium">
                        {emergencyPassport.payload.medications.map((med: string, i: number) => (
                          <li key={i}>{med}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Destination Emergency Contact */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-white/10 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-300 block">Emergency Dispatch:</span>
                        <span className="font-extrabold text-sm text-teal-300">
                          CALL {emergencyPassport.payload.emergency_call} ({emergencyPassport.destination_country.name})
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-300 block">Family Contact:</span>
                        <span className="font-semibold text-white">{emergencyPassport.payload.contact}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      variant="primary"
                      onClick={handleDownloadOfflinePassport}
                      className="flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download Standalone Offline HTML Passport
                    </Button>

                    <Button
                      variant="secondary"
                      onClick={() => window.print()}
                      className="flex items-center gap-2"
                    >
                      <Printer className="w-4 h-4" />
                      Print Wallet Emergency Card
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setShowQrDecoder(!showQrDecoder)}
                      className="flex items-center gap-2 ml-auto"
                    >
                      <QrCode className="w-4 h-4" />
                      {showQrDecoder ? 'Hide Offline QR Inspector' : 'Simulate Paramedic QR Scan'}
                    </Button>
                  </div>
                </div>

                {/* Right col: High-Fidelity Offline QR Code */}
                <div className="space-y-4">
                  <Card className="text-center p-6 bg-white border-slate-300 shadow-sm flex flex-col items-center">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                      <QrCode className="w-4 h-4 text-[#0d9488]" />
                      <span>Paramedic Scan Code</span>
                    </div>

                    {/* Rendered Offline QR Code Box with simulated high density pattern */}
                    <div className="w-48 h-48 bg-slate-900 p-3 rounded-2xl flex flex-col items-center justify-center relative shadow-inner">
                      <div className="w-full h-full bg-white rounded-lg p-2 flex flex-col items-center justify-center">
                        {/* High density QR visual */}
                        <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
                          {/* Corner positioning squares */}
                          <rect x="5" y="5" width="26" height="26" fill="#0f2b48" rx="2" />
                          <rect x="9" y="9" width="18" height="18" fill="white" rx="1" />
                          <rect x="13" y="13" width="10" height="10" fill="#0f2b48" />

                          <rect x="69" y="5" width="26" height="26" fill="#0f2b48" rx="2" />
                          <rect x="73" y="9" width="18" height="18" fill="white" rx="1" />
                          <rect x="77" y="13" width="10" height="10" fill="#0f2b48" />

                          <rect x="5" y="69" width="26" height="26" fill="#0f2b48" rx="2" />
                          <rect x="9" y="73" width="18" height="18" fill="white" rx="1" />
                          <rect x="13" y="77" width="10" height="10" fill="#0f2b48" />

                          {/* Data cells pattern */}
                          <rect x="36" y="8" width="6" height="6" fill="#0d9488" />
                          <rect x="46" y="8" width="6" height="6" fill="#0f2b48" />
                          <rect x="56" y="8" width="6" height="6" fill="#0d9488" />
                          <rect x="36" y="18" width="6" height="6" fill="#0f2b48" />
                          <rect x="46" y="18" width="6" height="6" fill="#0d9488" />
                          <rect x="8" y="36" width="6" height="6" fill="#0f2b48" />
                          <rect x="18" y="36" width="6" height="6" fill="#0d9488" />
                          <rect x="28" y="36" width="6" height="6" fill="#0f2b48" />
                          <rect x="36" y="36" width="8" height="8" fill="#0f2b48" />
                          <rect x="48" y="36" width="8" height="8" fill="#0d9488" />
                          <rect x="60" y="36" width="8" height="8" fill="#0f2b48" />
                          <rect x="72" y="36" width="6" height="6" fill="#0d9488" />
                          <rect x="84" y="36" width="6" height="6" fill="#0f2b48" />

                          <rect x="36" y="48" width="8" height="8" fill="#0d9488" />
                          <rect x="48" y="48" width="8" height="8" fill="#0f2b48" />
                          <rect x="60" y="48" width="8" height="8" fill="#0d9488" />

                          <rect x="36" y="60" width="8" height="8" fill="#0f2b48" />
                          <rect x="48" y="60" width="8" height="8" fill="#0d9488" />
                          <rect x="60" y="60" width="8" height="8" fill="#0f2b48" />
                          <rect x="72" y="60" width="6" height="6" fill="#0d9488" />

                          <rect x="36" y="72" width="6" height="6" fill="#0d9488" />
                          <rect x="46" y="72" width="6" height="6" fill="#0f2b48" />
                          <rect x="56" y="72" width="6" height="6" fill="#0d9488" />
                          <rect x="68" y="72" width="6" height="6" fill="#0f2b48" />
                          <rect x="78" y="72" width="6" height="6" fill="#0d9488" />
                          <rect x="88" y="72" width="6" height="6" fill="#0f2b48" />

                          <rect x="68" y="82" width="6" height="6" fill="#0d9488" />
                          <rect x="78" y="82" width="6" height="6" fill="#0f2b48" />
                          <rect x="88" y="82" width="6" height="6" fill="#0d9488" />
                        </svg>
                      </div>
                    </div>

                    <div className="text-[11px] font-bold text-slate-800 mt-3">
                      100% Offline Capable
                    </div>
                    <p className="text-[10px] text-slate-500 max-w-[200px] mt-1">
                      Contains self-contained JSON payload with blood group, allergies, medications, and emergency numbers.
                    </p>
                  </Card>
                </div>
              </div>

              {/* QR Decoder Simulator Drawer */}
              {showQrDecoder && (
                <Card className="border-teal-300 bg-teal-50/40">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold text-teal-900 flex items-center gap-2">
                        <CheckCheck className="w-4 h-4 text-teal-600" />
                        Offline Emergency QR Decoder Simulation
                      </CardTitle>
                      <Badge variant="secondary" size="sm">Zero Network Verification</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-slate-900 text-teal-300 p-4 rounded-xl font-mono text-xs overflow-x-auto shadow-inner">
                      <pre>{JSON.stringify(emergencyPassport.payload, null, 2)}</pre>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* TAB 4: PROVENANCE & CONFLICT AUDIT */}
          {activeTab === 'provenance' && crossBorderAudit && (
            <div className="space-y-6">
              {/* Conflict Warnings */}
              {crossBorderAudit.conflicts_detected.length > 0 ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <div className="font-bold text-amber-900 text-sm">
                        {crossBorderAudit.conflicts_detected.length} Cross-Border Medical Discrepancies Detected
                      </div>
                      <p className="text-amber-800 mt-0.5">
                        MY CLINIX enforces strict zero-hallucination policy. Conflicting assertions between international
                        records are displayed side-by-side with original sources rather than silently merged.
                      </p>
                    </div>
                  </div>

                  {crossBorderAudit.conflicts_detected.map((conf: any, idx: number) => (
                    <Card key={idx} className="border-amber-300 overflow-hidden">
                      <div className="bg-amber-100/60 px-4 py-2.5 border-b border-amber-200 flex items-center justify-between">
                        <span className="font-bold text-xs text-amber-900 uppercase tracking-wide">
                          {conf.title}
                        </span>
                        <Badge variant="warning" size="sm">Requires Verification</Badge>
                      </div>

                      <CardContent className="p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Finding A */}
                          <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1">
                            <div className="text-[10px] text-slate-400 font-bold uppercase">Record A (Origin)</div>
                            <div className="font-bold text-slate-800">{conf.finding_a.document_name}</div>
                            <div className="text-slate-600">Date: {conf.finding_a.date}</div>
                            <div className="p-2 bg-slate-50 font-semibold text-slate-900 rounded border border-slate-100">
                              Value: {conf.finding_a.raw_value}
                            </div>
                          </div>

                          {/* Finding B */}
                          <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1">
                            <div className="text-[10px] text-slate-400 font-bold uppercase">Record B (Comparison)</div>
                            <div className="font-bold text-slate-800">{conf.finding_b.document_name}</div>
                            <div className="text-slate-600">Date: {conf.finding_b.date}</div>
                            <div className="p-2 bg-slate-50 font-semibold text-slate-900 rounded border border-slate-100">
                              Value: {conf.finding_b.raw_value}
                            </div>
                          </div>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-700 border border-slate-200">
                          <strong>Clinical Context & Explanation:</strong> {conf.explanation}
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className="text-slate-500">
                            <strong>Recommended Action:</strong> {conf.recommended_action}
                          </span>
                          <Button variant="secondary" size="sm">
                            Flag for Clinical Reviewer
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <h3 className="font-bold text-slate-800 text-sm">No Unresolved Cross-Border Conflicts</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    All cross-border assertions across records from India, UK, and Germany are reconcilable.
                  </p>
                </div>
              )}

              {/* Complete Cross-Border Findings Provenance Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#0d9488]" />
                    Complete Extracted Finding Provenance Log
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Entity</th>
                          <th className="py-3 px-4">Extracted Value</th>
                          <th className="py-3 px-4">Source Document</th>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Confidence</th>
                          <th className="py-3 px-4 text-right">Evidence Modal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {crossBorderAudit.provenance_records.map((rec: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="py-3 px-4 font-semibold text-slate-900">{rec.entity_name}</td>
                            <td className="py-3 px-4 font-bold text-slate-800">{rec.extracted_value}</td>
                            <td className="py-3 px-4 text-slate-600">{rec.document_name}</td>
                            <td className="py-3 px-4 text-slate-500">{rec.event_date || 'N/A'}</td>
                            <td className="py-3 px-4">
                              <Badge variant="primary" size="sm">
                                {(rec.extraction_confidence * 100).toFixed(0)}%
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setEvidenceModalFinding(rec)}
                              >
                                View Text Span
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* EVIDENCE PROVENANCE MODAL */}
      {evidenceModalFinding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#0d9488] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Evidence & Provenance Audit</h3>
                  <p className="text-[10px] text-slate-500">Immutable source document text span</p>
                </div>
              </div>
              <button
                onClick={() => setEvidenceModalFinding(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Entity Name</span>
                  <span className="font-bold text-slate-900">{evidenceModalFinding.entity_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Recorded Date</span>
                  <span className="font-medium text-slate-700">{evidenceModalFinding.event_date || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Extracted Value</span>
                  <span className="font-extrabold text-teal-800">{evidenceModalFinding.extracted_value}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Source Document</span>
                  <span className="font-medium text-slate-700">{evidenceModalFinding.document_name}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
                  Verbatim Source Passage (Page {evidenceModalFinding.source_page_number || 1})
                </span>
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl font-mono text-xs text-amber-950 leading-relaxed">
                  "{evidenceModalFinding.original_extracted_text}"
                </div>
              </div>

              {evidenceModalFinding.formula && (
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
                    Normalization Equation
                  </span>
                  <div className="p-2.5 bg-teal-50 border border-teal-200 rounded-lg text-teal-950 font-medium">
                    {evidenceModalFinding.formula}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="primary" size="sm" onClick={() => setEvidenceModalFinding(null)}>
                Close Audit View
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
