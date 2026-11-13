import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  Scale,
  ShieldCheck,
  CheckCheck,
  FileText,
  Clock,
  Filter,
  MessageSquare,
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Stethoscope,
  RefreshCw,
  AlertTriangle,
  User,
  ExternalLink,
} from 'lucide-react';
import { usePatient } from '../hooks/usePatient';
import { useAuth } from '../hooks/useAuth';
import { recordService } from '../services/recordService';
import { ConflictItem, ConflictSummary } from '../types/patient';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { Modal } from '../components/ui/Modal';

export const ConflictsPage: React.FC = () => {
  const { selectedPatient } = usePatient();
  const { user } = useAuth();

  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [summary, setSummary] = useState<ConflictSummary>({
    total: 0,
    new_conflicts: 0,
    under_review: 0,
    resolved: 0,
  });
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Doctor / Admin Audit & Resolve Modal
  const [selectedConflict, setSelectedConflict] = useState<ConflictItem | null>(null);
  const [auditStatus, setAuditStatus] = useState<string>('resolved');
  const [auditNotes, setAuditNotes] = useState<string>('');
  const [submittingAudit, setSubmittingAudit] = useState(false);
  const [auditSuccess, setAuditSuccess] = useState<string | null>(null);

  // Patient "Discuss with Doctor" state
  const [copiedConflictId, setCopiedConflictId] = useState<string | null>(null);

  const fetchConflicts = async () => {
    if (!selectedPatient) return;
    try {
      setLoading(true);
      const res = await recordService.getConflicts(selectedPatient.id);
      setConflicts(res.conflicts || []);
      if (res.summary) {
        setSummary(res.summary);
      } else {
        const total = res.conflicts.length;
        const newC = res.conflicts.filter((c) => c.status === 'new_conflict' || c.status === 'unresolved').length;
        const underR = res.conflicts.filter((c) => c.status === 'under_review').length;
        const resCount = res.conflicts.filter((c) => c.status === 'resolved' || c.status === 'reviewed_resolved').length;
        setSummary({ total, new_conflicts: newC, under_review: underR, resolved: resCount });
      }
    } catch (err) {
      console.error('Failed to load conflicts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConflicts();
  }, [selectedPatient]);

  const handleAuditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !selectedConflict) return;

    try {
      setSubmittingAudit(true);
      await recordService.resolveConflict(
        selectedPatient.id,
        selectedConflict.id,
        auditNotes,
        auditStatus
      );
      setAuditSuccess(`Conflict "${selectedConflict.title}" status updated to ${auditStatus.replace('_', ' ')}.`);
      setSelectedConflict(null);
      setAuditNotes('');
      fetchConflicts();
      setTimeout(() => setAuditSuccess(null), 4500);
    } catch (err: any) {
      alert(err?.message || 'Failed to update conflict resolution status.');
    } finally {
      setSubmittingAudit(false);
    }
  };

  const handleCopyDiscussionPrompt = (c: ConflictItem) => {
    const text = `Question for Doctor regarding conflicting records in MY CLINIX:\nIn "${c.document_a_name}" (${c.document_a_date}) versus "${c.document_b_name}" (${c.document_b_date}), an inconsistency was flagged: "${c.description}". What is the correct medical assessment?`;
    navigator.clipboard.writeText(text);
    setCopiedConflictId(c.id);
    setTimeout(() => setCopiedConflictId(null), 3000);
  };

  if (!selectedPatient) {
    return (
      <Alert type="warning" title="No Patient Selected">
        Please select a patient profile to audit medical record contradictions and inconsistencies.
      </Alert>
    );
  }

  // Filter conflicts
  const filteredConflicts = conflicts.filter((c) => {
    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'new_conflict' && c.status !== 'new_conflict' && c.status !== 'unresolved') return false;
      if (statusFilter === 'under_review' && c.status !== 'under_review') return false;
      if (statusFilter === 'resolved' && c.status !== 'resolved' && c.status !== 'reviewed_resolved') return false;
    }
    // Category filter
    if (categoryFilter !== 'all' && c.category.toLowerCase() !== categoryFilter.toLowerCase()) {
      return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = c.title.toLowerCase().includes(q);
      const matchDesc = c.description.toLowerCase().includes(q);
      const matchDocA = c.document_a_name.toLowerCase().includes(q);
      const matchDocB = c.document_b_name.toLowerCase().includes(q);
      const matchCategory = c.category.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchDocA && !matchDocB && !matchCategory) return false;
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    if (status === 'resolved' || status === 'reviewed_resolved') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Resolved
        </span>
      );
    }
    if (status === 'under_review') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          Under Review
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-800 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
        <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
        New Conflict
      </span>
    );
  };

  const getCategoryBadge = (category: string) => {
    const cat = category.toLowerCase();
    let colorClass = 'bg-slate-100 text-slate-700 border-slate-200';
    if (cat.includes('medication')) colorClass = 'bg-blue-50 text-blue-700 border-blue-200';
    else if (cat.includes('allergy')) colorClass = 'bg-purple-50 text-purple-700 border-purple-200';
    else if (cat.includes('blood')) colorClass = 'bg-rose-50 text-rose-700 border-rose-200';
    else if (cat.includes('diagnosis')) colorClass = 'bg-amber-50 text-amber-700 border-amber-200';

    return (
      <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${colorClass}`}>
        {category.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0f2b48] tracking-tight">Conflicts</h1>
            <Badge variant="warning" size="md">
              Medical History Change Detector
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Detects conflicting patient information, dosage changes, inconsistent allergy profiles, blood group discrepancies, and discordant clinical dates across uploaded records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            onClick={fetchConflicts}
          >
            Refresh Audits
          </Button>
        </div>
      </div>

      {auditSuccess && (
        <Alert type="success" title="Clinical Governance Action Recorded">
          {auditSuccess}
        </Alert>
      )}

      {/* Evidentiary Anti-Hallucination Policy Alert */}
      <Alert type="warning" title="Evidentiary Clinical Governance Policy">
        MY CLINIX never automatically overwrites medical records or decides which conflicting information is correct. Inconsistencies remain preserved side-by-side until reviewed and audited by an authorized attending physician or administrator.
      </Alert>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Inconsistencies</span>
            <div className="text-2xl font-bold text-[#0f2b48] mt-0.5">{summary.total}</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Identified across all records</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-[#0f2b48] flex items-center justify-center">
            <Scale className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">New Conflicts</span>
            <div className="text-2xl font-bold text-rose-600 mt-0.5">{summary.new_conflicts}</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Pending initial review</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertOctagon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Under Review</span>
            <div className="text-2xl font-bold text-amber-600 mt-0.5">{summary.under_review}</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Physician inquiry in progress</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Resolved Discrepancies</span>
            <div className="text-2xl font-bold text-emerald-600 mt-0.5">{summary.resolved}</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Audited with clinical rationale</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <Card>
        <CardContent className="p-3.5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search conflicts by medication, allergy, diagnosis, document..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#0d9488] focus:bg-white transition-all"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400 font-medium">Status:</span>
              {[
                { id: 'all', label: 'All' },
                { id: 'new_conflict', label: 'New Conflict' },
                { id: 'under_review', label: 'Under Review' },
                { id: 'resolved', label: 'Resolved' },
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

              <span className="text-slate-400 font-medium">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none focus:border-[#0d9488]"
              >
                <option value="all">All Categories</option>
                <option value="medication">Medication Dosages</option>
                <option value="allergy">Allergies</option>
                <option value="blood_group">Blood Group</option>
                <option value="diagnosis">Diagnoses & Timeline</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Conflicts List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Auditing medical records for contradictory assertions...</div>
      ) : filteredConflicts.length === 0 ? (
        <Card className="p-10 text-center bg-white">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-800 text-sm">No Inconsistencies Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            No conflicting statements, contradictory dosages, or inconsistent allergy profiles match the current filter selection.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredConflicts.map((c) => {
            const isResolved = c.status === 'resolved' || c.status === 'reviewed_resolved';
            return (
              <Card key={c.id} className="overflow-hidden border-slate-200 hover:border-slate-300 transition-all">
                {/* Header */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isResolved
                          ? 'bg-emerald-100 text-emerald-700'
                          : c.status === 'under_review'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {isResolved ? (
                        <ShieldCheck className="w-5 h-5" />
                      ) : c.status === 'under_review' ? (
                        <Clock className="w-5 h-5" />
                      ) : (
                        <AlertOctagon className="w-5 h-5" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-slate-800">{c.title}</h3>
                        {getCategoryBadge(c.category)}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Inconsistent clinical data across multiple uploaded records
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(c.status)}
                    {(user?.role === 'doctor' || user?.role === 'administrator') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedConflict(c);
                          setAuditStatus(c.status === 'resolved' ? 'resolved' : 'resolved');
                          setAuditNotes(c.doctor_notes || '');
                        }}
                      >
                        Review / Audit
                      </Button>
                    )}
                  </div>
                </div>

                <CardContent className="p-5 space-y-4">
                  {/* Detailed Description */}
                  <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-slate-800 leading-relaxed font-medium">
                    <div className="font-bold text-amber-900 mb-0.5">Detected Inconsistency Explanation:</div>
                    {c.description}
                  </div>

                  {/* Side-by-Side Conflicting Records */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Document A */}
                    <div className="p-4 rounded-xl border border-blue-200/80 bg-blue-50/30">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-2">
                        <span className="flex items-center gap-1.5 text-blue-800">
                          <FileText className="w-4 h-4 text-blue-600" />
                          Source Document A
                        </span>
                        <span className="flex items-center gap-1 text-slate-500 font-mono">
                          <Clock className="w-3 h-3" />
                          {c.document_a_date}
                        </span>
                      </div>

                      <div className="font-bold text-xs text-slate-900 mb-1.5">
                        {c.document_a_name}
                      </div>

                      {c.document_a_snippet && (
                        <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200/80 italic">
                          "{c.document_a_snippet}"
                        </div>
                      )}
                    </div>

                    {/* Document B */}
                    <div className="p-4 rounded-xl border border-purple-200/80 bg-purple-50/30">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-2">
                        <span className="flex items-center gap-1.5 text-purple-800">
                          <FileText className="w-4 h-4 text-purple-600" />
                          Source Document B
                        </span>
                        <span className="flex items-center gap-1 text-slate-500 font-mono">
                          <Clock className="w-3 h-3" />
                          {c.document_b_date}
                        </span>
                      </div>

                      <div className="font-bold text-xs text-slate-900 mb-1.5">
                        {c.document_b_name}
                      </div>

                      {c.document_b_snippet && (
                        <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200/80 italic">
                          "{c.document_b_snippet}"
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Doctor Reviewer Rationale */}
                  {c.doctor_notes && (
                    <div className="p-3.5 bg-teal-50/60 border border-teal-200 rounded-xl text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-[#0f2b48] mb-1">
                        <Stethoscope className="w-4 h-4 text-[#0d9488]" />
                        <span>Physician Clinical Resolution Rationale:</span>
                        {c.reviewed_by_name && (
                          <span className="text-[11px] font-medium text-slate-500">
                            • Audited by {c.reviewed_by_name}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-700 leading-relaxed">{c.doctor_notes}</p>
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-400 text-[11px]">
                      Permanent evidentiary audit trail • Both records preserved
                    </span>

                    <button
                      onClick={() => handleCopyDiscussionPrompt(c)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0f2b48] hover:text-[#0d9488] bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{copiedConflictId === c.id ? 'Question Copied to Clipboard!' : 'Discuss with Doctor'}</span>
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Review & Resolution Modal (Doctor & Administrator) */}
      {selectedConflict && (
        <Modal
          isOpen={!!selectedConflict}
          onClose={() => setSelectedConflict(null)}
          title={`Clinical Audit: ${selectedConflict.title}`}
          maxWidth="lg"
        >
          <form onSubmit={handleAuditSubmit} className="space-y-4 text-xs">
            <Alert type="warning" title="Anti-Hallucination Governance Policy">
              Resolving a conflict logs your medical credentials and clinical rationale permanently in the evidentiary record. Neither source document is altered or deleted.
            </Alert>

            <div>
              <span className="font-semibold text-slate-700 block mb-1">Inconsistency Description:</span>
              <p className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 font-medium">
                {selectedConflict.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Document A</span>
                <strong className="text-slate-800">{selectedConflict.document_a_name}</strong>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">{selectedConflict.document_a_date}</div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Document B</span>
                <strong className="text-slate-800">{selectedConflict.document_b_name}</strong>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">{selectedConflict.document_b_date}</div>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Clinical Audit Status:
              </label>
              <select
                value={auditStatus}
                onChange={(e) => setAuditStatus(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#0d9488]"
              >
                <option value="resolved">Resolved (Clinical resolution established)</option>
                <option value="under_review">Under Review (Requires external physician consultation or records)</option>
                <option value="new_conflict">New Conflict (Flagged for initial audit)</option>
                <option value="dismissed">Dismissed (Non-conflicting or superseded)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Physician Resolution Rationale & Audit Notes:
              </label>
              <textarea
                required
                rows={3}
                placeholder="State clinical reasoning (e.g., Reviewed certified hematology panel confirming patient is O Positive. Prior donor tag was an unverified self-report)..."
                value={auditNotes}
                onChange={(e) => setAuditNotes(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#0d9488]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="outline" size="sm" type="button" onClick={() => setSelectedConflict(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" loading={submittingAudit}>
                Save Permanent Resolution
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default ConflictsPage;
