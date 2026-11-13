import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Activity,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  User,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { adminService } from '../services/adminService';
import { AuditLogEntry, PaginatedAuditLogs } from '../types/audit';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

export const AuditLogPage: React.FC = () => {
  const [data, setData] = useState<PaginatedAuditLogs | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState<number>(1);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminService.getAuditLogs({
        page,
        page_size: 25,
        action: actionFilter || undefined,
        outcome: outcomeFilter || undefined,
      });
      setData(res);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
      setError(err?.message || 'Failed to retrieve administrative audit trail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, outcomeFilter]);

  const handleActionChange = (val: string) => {
    setActionFilter(val);
    setPage(1);
  };

  const handleOutcomeChange = (val: string) => {
    setOutcomeFilter(val);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0f2b48] tracking-tight">Security Audit Logs</h1>
            <Badge variant="primary" size="md">
              Immutable Trail
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete, tamper-evident audit record of all authentication, document access, data exports, and consent decisions.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          onClick={fetchLogs}
        >
          Refresh Logs
        </Button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Action:</span>
          </div>
          <select
            value={actionFilter}
            onChange={(e) => handleActionChange(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:border-[#0d9488]"
          >
            <option value="">All Actions</option>
            <option value="login_success">login_success</option>
            <option value="login_failed">login_failed</option>
            <option value="login_rate_limited">login_rate_limited</option>
            <option value="document_access">document_access</option>
            <option value="document_upload">document_upload</option>
            <option value="document_delete_request">document_delete_request</option>
            <option value="document_restore">document_restore</option>
            <option value="document_download">document_download</option>
            <option value="consent_grant">consent_grant</option>
            <option value="consent_revoke">consent_revoke</option>
            <option value="patient_data_export">patient_data_export</option>
          </select>

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Outcome:</span>
          </div>
          <select
            value={outcomeFilter}
            onChange={(e) => handleOutcomeChange(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:border-[#0d9488]"
          >
            <option value="">All Outcomes</option>
            <option value="success">Success</option>
            <option value="denied">Denied</option>
            <option value="failure">Failure</option>
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Total Recorded Events: <strong className="text-slate-800">{data?.total || 0}</strong>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-3">Actor / Role</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Outcome</th>
                <th className="py-2.5 px-3">Patient ID</th>
                <th className="py-2.5 px-3">Document ID</th>
                <th className="py-2.5 px-3">IP Address</th>
                <th className="py-2.5 px-3">Context</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                    Loading audit records...
                  </td>
                </tr>
              ) : !data || data.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                    No audit records match the selected filter.
                  </td>
                </tr>
              ) : (
                data.items.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 font-sans text-slate-800">
                    <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 text-xs">{log.actor_name || 'System / Anonymous'}</div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                        {log.actor_role} ({log.actor_id ? log.actor_id.slice(0, 8) : 'N/A'})
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {log.outcome === 'success' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Success
                        </span>
                      ) : log.outcome === 'denied' ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-semibold text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Denied
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-700 font-semibold text-[11px]">
                          <XCircle className="w-3.5 h-3.5" />
                          Failure
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                      {log.patient_id ? `${log.patient_id.slice(0, 8)}...` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                      {log.document_id ? `${log.document_id.slice(0, 8)}...` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                      {log.request_ip || 'Internal'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[10px] truncate max-w-[120px]" title={log.extra_context || ''}>
                      {log.extra_context || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-slate-200 bg-slate-50 text-xs">
            <span className="text-slate-500">
              Page {data.page} of {data.total_pages} ({data.total} total items)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={<ChevronLeft className="w-3.5 h-3.5" />}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<ChevronRight className="w-3.5 h-3.5" />}
                onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                disabled={page >= data.total_pages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
