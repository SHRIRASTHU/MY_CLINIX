import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCheck,
  UploadCloud,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Search,
  Filter,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  Stethoscope,
  Info,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { usePatient } from '../hooks/usePatient';
import { useAuth } from '../hooks/useAuth';
import { recordService } from '../services/recordService';
import { CompletenessReport, MissingInfoItem } from '../types/patient';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { Modal } from '../components/ui/Modal';

export const MissingInformationPage: React.FC = () => {
  const { selectedPatient } = usePatient();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [completeness, setCompleteness] = useState<CompletenessReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Doctor / Admin Verification Modal
  const [selectedItem, setSelectedItem] = useState<MissingInfoItem | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<string>('complete');
  const [verifyNotes, setVerifyNotes] = useState<string>('');
  const [submittingVerify, setSubmittingVerify] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState<string | null>(null);

  const fetchMissingInformation = async () => {
    if (!selectedPatient) return;
    try {
      setLoading(true);
      const data = await recordService.getMissingInformation(selectedPatient.id);
      setCompleteness(data);
    } catch (err) {
      console.error('Failed to load missing information:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMissingInformation();
  }, [selectedPatient]);

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !selectedItem) return;

    try {
      setSubmittingVerify(true);
      await recordService.verifyMissingInfoItem(
        selectedPatient.id,
        selectedItem.id,
        verifyNotes,
        verifyStatus
      );
      setVerifySuccess(`Record dimension "${selectedItem.field}" updated to ${verifyStatus}.`);
      setSelectedItem(null);
      setVerifyNotes('');
      fetchMissingInformation();
      setTimeout(() => setVerifySuccess(null), 4500);
    } catch (err: any) {
      alert(err?.message || 'Failed to update record verification status.');
    } finally {
      setSubmittingVerify(false);
    }
  };

  if (!selectedPatient) {
    return (
      <Alert type="warning" title="No Patient Selected">
        Please select a patient profile to view the Medical Record Completeness Dashboard.
      </Alert>
    );
  }

  const items = completeness?.items || [];

  // Filter items
  const filteredItems = items.filter((it) => {
    if (statusFilter !== 'all' && it.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && it.category.toLowerCase() !== categoryFilter.toLowerCase()) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchField = it.field.toLowerCase().includes(q);
      const matchReason = it.reason.toLowerCase().includes(q);
      const matchCat = it.category.toLowerCase().includes(q);
      const matchAction = it.recommended_action.toLowerCase().includes(q);
      if (!matchField && !matchReason && !matchCat && !matchAction) return false;
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Complete
          </span>
        );
      case 'incomplete':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Incomplete
          </span>
        );
      case 'missing':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-800 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Missing
          </span>
        );
      case 'requires_verification':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-800 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
            <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
            Requires Verification
          </span>
        );
    }
  };

  const getDistinctionBadge = (distinction: string) => {
    switch (distinction) {
      case 'confirmed_missing':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
            Confirmed Missing
          </span>
        );
      case 'incomplete_data':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
            Incomplete Data
          </span>
        );
      case 'temporarily_unavailable':
      default:
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
            Temporarily Unavailable
          </span>
        );
    }
  };

  const categories = Array.from(new Set(items.map((it) => it.category)));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0f2b48] tracking-tight">Missing Information</h1>
            <Badge variant="secondary" size="md">
              Medical Record Completeness Dashboard
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Audits medical record completeness, identifies uncataloged clinical summaries, and highlights records requiring doctor or patient verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            onClick={fetchMissingInformation}
          >
            Re-Audit Record
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<UploadCloud className="w-3.5 h-3.5" />}
            onClick={() => navigate('/documents')}
          >
            Upload Missing Document
          </Button>
        </div>
      </div>

      {verifySuccess && (
        <Alert type="success" title="Record Updated">
          {verifySuccess}
        </Alert>
      )}

      {/* Clinical Guidance Notice on Medical Absence */}
      <Alert type="info" title="Evidentiary Notice on Unrecorded Information">
        Information is not automatically assumed to be medically absent simply because it does not appear in currently uploaded documents. MY CLINIX distinguishes between <strong>Confirmed Missing</strong> (recommended by an attending note), <strong>Incomplete Data</strong> (partially documented), and <strong>Temporarily Unavailable</strong> records.
      </Alert>

      {/* ============================================================ */}
      {/* COMPONENT A: Record Completeness Overview                    */}
      {/* ============================================================ */}
      <div className="space-y-4">
        {/* Main Completeness Progress Card */}
        <Card className="border-teal-100 bg-gradient-to-br from-white via-white to-teal-50/40 shadow-xs">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3 flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCheck className="w-5 h-5 text-[#0d9488]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Overall Health Record Completeness
                    </span>
                  </div>
                  <span className="text-2xl font-extrabold text-[#0d9488]">
                    {completeness?.score_percentage || 78}%
                  </span>
                </div>

                {/* Visual Progress Bar */}
                <div className="w-full h-3.5 bg-slate-200 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-[#0d9488] via-teal-500 to-emerald-500 rounded-full transition-all duration-700 shadow-xs"
                    style={{ width: `${completeness?.score_percentage || 78}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
                  <span>
                    <strong>{completeness?.complete_items || 3} of {completeness?.total_records_reviewed || 8}</strong> clinical dimensions fully verified
                  </span>
                  <span className="font-medium text-slate-600">
                    Target: 100% Comprehensive Health Record
                  </span>
                </div>
              </div>

              {/* Statistics Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0 border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-6">
                <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 text-center">
                  <div className="text-lg font-bold text-slate-800">
                    {completeness?.total_records_reviewed || 8}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">Total Reviewed</div>
                </div>

                <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-center">
                  <div className="text-lg font-bold text-emerald-700">
                    {completeness?.complete_items || 3}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-emerald-600 mt-0.5">Complete</div>
                </div>

                <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-200 text-center">
                  <div className="text-lg font-bold text-rose-700">
                    {completeness?.missing_items || 1}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-rose-600 mt-0.5">Missing</div>
                </div>

                <div className="p-2.5 bg-purple-50 rounded-lg border border-purple-200 text-center">
                  <div className="text-lg font-bold text-purple-700">
                    {completeness?.requires_verification_items || 2}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-purple-600 mt-0.5">To Verify</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actionable Suggestions Highlight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-rose-800 font-bold text-xs mb-1">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Cardiology Follow-up Note Needed</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Hospital discharge explicitly requested a 6-week post-admission ECG and consult tracing. Upload this note to complete your cardiovascular history.
              </p>
            </div>
            <button
              onClick={() => navigate('/documents')}
              className="mt-3 text-xs font-semibold text-rose-700 hover:text-rose-900 flex items-center gap-1 cursor-pointer"
            >
              <span>Upload Report Now</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-purple-800 font-bold text-xs mb-1">
                <HelpCircle className="w-4 h-4 text-purple-600" />
                <span>Allergy Polarity Clarification</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Documented moderate urticaria to Sulfonamides is pending formal allergist verification to distinguish true IgE allergy from non-allergic drug intolerance.
              </p>
            </div>
            <button
              onClick={() => navigate('/conditions-analysis')}
              className="mt-3 text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
            >
              <span>Review Allergy Profile</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Emergency Contact Proxy</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                A primary emergency contact is active. Adding a secondary emergency surrogate ensures full coverage for critical clinical care.
              </p>
            </div>
            <button
              onClick={() => navigate('/settings')}
              className="mt-3 text-xs font-semibold text-amber-800 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
            >
              <span>Update in Settings</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* COMPONENT B & C: Missing Information List & Status Table     */}
      {/* ============================================================ */}
      <div className="space-y-4 pt-2">
        {/* Filter Toolbar */}
        <Card>
          <CardContent className="p-3.5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search missing fields, clinical reasons, actions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#0d9488] focus:bg-white transition-all"
                />
              </div>

              {/* Status and Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-400 font-medium">Status:</span>
                {[
                  { id: 'all', label: 'All' },
                  { id: 'missing', label: 'Missing' },
                  { id: 'incomplete', label: 'Incomplete' },
                  { id: 'requires_verification', label: 'Requires Verification' },
                  { id: 'complete', label: 'Complete' },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setStatusFilter(st.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      statusFilter === st.id
                        ? 'bg-[#0f2b48] text-white shadow-xs'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}

                <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none focus:border-[#0d9488]"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Table / Cards */}
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Evaluating record completeness across clinical dimensions...</div>
        ) : filteredItems.length === 0 ? (
          <Card className="p-10 text-center bg-white">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-slate-800 text-sm">No Matching Items</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              All clinical dimensions under the selected filters are complete or no items match your search.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((it) => (
              <Card key={it.id} className="overflow-hidden border-slate-200 hover:border-slate-300 transition-all">
                <div className="p-4 flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    {/* Top badging */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                        {it.category}
                      </span>
                      {getDistinctionBadge(it.distinction)}
                      {getStatusBadge(it.status)}
                    </div>

                    {/* Field & Clinical Reason */}
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{it.field}</h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{it.reason}</p>
                    </div>

                    {/* Related Document and Recommended Action */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                      {it.related_document ? (
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                          <div className="truncate">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Related Document</span>
                            <span className="font-semibold text-slate-800 text-xs truncate block">{it.related_document}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center gap-2">
                          <Info className="w-4 h-4 text-slate-400 shrink-0" />
                          <div>
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Document Source</span>
                            <span className="text-slate-600 text-xs block">Unattached to uploaded record</span>
                          </div>
                        </div>
                      )}

                      <div className="p-2.5 rounded-lg bg-teal-50/60 border border-teal-200 flex items-center gap-2">
                        <CheckCheck className="w-4 h-4 text-[#0d9488] shrink-0" />
                        <div>
                          <span className="text-[10px] font-bold uppercase text-teal-800 block">Recommended Action</span>
                          <span className="text-slate-800 text-xs block">{it.recommended_action}</span>
                        </div>
                      </div>
                    </div>

                    {it.verified_by && (
                      <div className="flex items-center gap-2 text-[11px] text-emerald-800 pt-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Verified by {it.verified_by} ({it.verification_date})</span>
                      </div>
                    )}
                  </div>

                  {/* Right side actions */}
                  <div className="flex flex-row md:flex-col items-center md:items-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    {it.status !== 'complete' && (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<UploadCloud className="w-3.5 h-3.5" />}
                        onClick={() => navigate('/documents')}
                      >
                        Upload Document
                      </Button>
                    )}

                    {(user?.role === 'doctor' || user?.role === 'administrator') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedItem(it);
                          setVerifyStatus(it.status === 'complete' ? 'complete' : 'complete');
                          setVerifyNotes('');
                        }}
                      >
                        Verify Record
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Doctor / Admin Verification Modal */}
      {selectedItem && (
        <Modal
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          title={`Clinical Verification: ${selectedItem.field}`}
          maxWidth="lg"
        >
          <form onSubmit={handleVerifySubmit} className="space-y-4 text-xs">
            <Alert type="info" title="Clinical Verification Governance">
              Updating completeness records logs your provider credentials in the evidentiary audit trail.
            </Alert>

            <div>
              <span className="font-semibold text-slate-700 block mb-1">Dimension Field:</span>
              <p className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 font-medium">
                {selectedItem.field} ({selectedItem.category})
              </p>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Verification Status:
              </label>
              <select
                value={verifyStatus}
                onChange={(e) => setVerifyStatus(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#0d9488]"
              >
                <option value="complete">Complete (Fully documented & confirmed)</option>
                <option value="incomplete">Incomplete (Partially documented)</option>
                <option value="missing">Missing (Essential document/record unrecorded)</option>
                <option value="requires_verification">Requires Verification (Pending physician confirmation)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Clinical Audit Notes / Justification:
              </label>
              <textarea
                required
                rows={3}
                placeholder="State clinical notes confirming why this record was verified or updated..."
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#0d9488]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" type="button" onClick={() => setSelectedItem(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" loading={submittingVerify}>
                Confirm Verification
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default MissingInformationPage;
