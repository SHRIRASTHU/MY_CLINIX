import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserCheck,
  UserX,
  Lock,
  Plus,
  Clock,
  Building,
  AlertCircle,
  CheckCircle2,
  Stethoscope,
  Key,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePatient } from '../hooks/usePatient';
import { consentService } from '../services/consentService';
import { ConsentRecord, DoctorLookupItem } from '../types/patient';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { Modal } from '../components/ui/Modal';

export const ConsentPage: React.FC = () => {
  const { user } = useAuth();
  const { selectedPatient } = usePatient();

  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [doctors, setDoctors] = useState<DoctorLookupItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Grant Modal State
  const [isGrantOpen, setIsGrantOpen] = useState<boolean>(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [accessLevel, setAccessLevel] = useState<'read_only' | 'read_write' | 'full'>('read_only');
  const [selectedScope, setSelectedScope] = useState<string>('all');
  const [grantLoading, setGrantLoading] = useState<boolean>(false);

  // Revoke Modal State
  const [revokeDoctorId, setRevokeDoctorId] = useState<string | null>(null);
  const [revokeDoctorName, setRevokeDoctorName] = useState<string>('');
  const [revocationReason, setRevocationReason] = useState<string>('');
  const [revokeLoading, setRevokeLoading] = useState<boolean>(false);

  const fetchConsents = async () => {
    if (!selectedPatient) return;
    try {
      setLoading(true);
      const data = await consentService.getConsentRecords(selectedPatient.id);
      setConsents(data);
    } catch (err: any) {
      console.error('Failed to load consent records:', err);
      setActionError(err?.message || 'Failed to load consent records');
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const docList = await consentService.getAvailableDoctors();
      setDoctors(docList);
      if (docList.length > 0 && !selectedDoctorId) {
        setSelectedDoctorId(docList[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load doctors:', err);
    }
  };

  useEffect(() => {
    fetchConsents();
    fetchDoctors();
  }, [selectedPatient]);

  const handleGrantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !selectedDoctorId) return;

    try {
      setGrantLoading(true);
      setActionError(null);
      await consentService.grantConsent(
        selectedPatient.id,
        selectedDoctorId,
        accessLevel,
        selectedScope === 'all' ? undefined : [selectedScope]
      );
      setIsGrantOpen(false);
      setActionSuccess('Doctor access authorization successfully granted.');
      fetchConsents();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to grant consent');
    } finally {
      setGrantLoading(false);
    }
  };

  const handleRevokeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !revokeDoctorId) return;

    try {
      setRevokeLoading(true);
      setActionError(null);
      await consentService.revokeConsent(selectedPatient.id, revokeDoctorId, revocationReason || undefined);
      setRevokeDoctorId(null);
      setRevocationReason('');
      setActionSuccess('Doctor authorization successfully revoked. Access has been terminated immediately.');
      fetchConsents();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to revoke authorization');
    } finally {
      setRevokeLoading(false);
    }
  };

  if (!selectedPatient) {
    return (
      <Alert type="warning" title="No Patient Selected">
        Please select a patient profile to view and manage doctor consent settings.
      </Alert>
    );
  }

  const activeConsents = consents.filter((c) => c.status === 'active');
  const historicalConsents = consents.filter((c) => c.status === 'revoked');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0f2b48] tracking-tight">Consent & Doctor Access</h1>
            <Badge variant="primary" size="md">
              Privacy-First Authorization
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Control which licensed physicians are authorized to view your unified medical history. You may grant or immediately revoke access at any time.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsGrantOpen(true)}
        >
          Grant Doctor Access
        </Button>
      </div>

      {actionSuccess && (
        <Alert type="success" title="Consent Updated">
          {actionSuccess}
        </Alert>
      )}

      {actionError && (
        <Alert type="error" title="Action Failed">
          {actionError}
        </Alert>
      )}

      {/* Active Authorizations */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Active Doctor Authorizations ({activeConsents.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading consent registry...</div>
        ) : activeConsents.length === 0 ? (
          <Card className="p-8 text-center bg-white border-dashed">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">No Active Doctor Authorizations</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Your consolidated records are strictly private. No doctor currently has active access authorization to your medical records.
            </p>
            <Button variant="outline" size="sm" onClick={() => setIsGrantOpen(true)}>
              Authorize a Doctor
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeConsents.map((consent) => (
              <Card key={consent.id} className="border-slate-200/90 bg-white hover:shadow-xs transition">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-100">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Active
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-900">
                      {consent.doctor_name || `Doctor #${consent.doctor_id.slice(0, 8)}`}
                    </h4>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {consent.doctor_email || 'Verified Licensed Physician'}
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Access Level:</span>
                      <span className="font-semibold text-slate-800 capitalize">{consent.access_level.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Scope:</span>
                      <span className="font-semibold text-slate-800 uppercase text-[11px]">{consent.scope}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Granted:</span>
                      <span className="text-slate-700">{new Date(consent.granted_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs text-red-600 hover:bg-red-50 hover:border-red-200"
                      icon={<UserX className="w-3.5 h-3.5" />}
                      onClick={() => {
                        setRevokeDoctorId(consent.doctor_id);
                        setRevokeDoctorName(consent.doctor_name || 'Selected Doctor');
                      }}
                    >
                      Revoke Authorization
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Historical / Revoked Authorizations */}
      {historicalConsents.length > 0 && (
        <div className="pt-4">
          <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            Authorization Audit History ({historicalConsents.length})
          </h2>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Doctor</th>
                  <th className="py-2.5 px-3">Scope & Level</th>
                  <th className="py-2.5 px-3">Granted Date</th>
                  <th className="py-2.5 px-3">Revoked Date</th>
                  <th className="py-2.5 px-4">Revocation Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {historicalConsents.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      {item.doctor_name || `Doctor #${item.doctor_id.slice(0, 8)}`}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="capitalize">{item.access_level}</span> ({item.scope})
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {new Date(item.granted_at).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {item.revoked_at ? new Date(item.revoked_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 italic">
                      {item.revocation_reason || 'Manual revocation'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grant Access Modal */}
      {isGrantOpen && (
        <Modal
          isOpen={isGrantOpen}
          onClose={() => setIsGrantOpen(false)}
          title="Authorize Doctor Access"
        >
          <form onSubmit={handleGrantSubmit} className="space-y-4">
            <Alert type="info" title="Patient-Controlled Permission">
              You are granting access to your consolidated records across all clinics and hospitals. Access can be terminated at any time from this dashboard.
            </Alert>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Select Registered Doctor
              </label>
              {doctors.length === 0 ? (
                <div className="text-xs text-slate-500 p-2 bg-slate-50 rounded border">
                  No verified doctor accounts available in directory.
                </div>
              ) : (
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0d9488]"
                  required
                >
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.full_name} ({doc.email} {doc.is_verified ? '• Verified Physician' : ''})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Access Level
              </label>
              <select
                value={accessLevel}
                onChange={(e) => setAccessLevel(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0d9488]"
              >
                <option value="read_only">Read-Only (View medical history and scans)</option>
                <option value="read_write">Read & Write (View and upload consultation records)</option>
                <option value="full">Full Clinical Access</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Scope of Records
              </label>
              <select
                value={selectedScope}
                onChange={(e) => setSelectedScope(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0d9488]"
              >
                <option value="all">All Records (Prescriptions, Lab, Scans, Consultations)</option>
                <option value="prescriptions">Prescriptions Only</option>
                <option value="scans">Scans and Imaging Only</option>
                <option value="lab_reports">Lab & Blood Reports Only</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" type="button" onClick={() => setIsGrantOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" loading={grantLoading} disabled={!selectedDoctorId}>
                Authorize Access
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Revoke Access Modal */}
      {revokeDoctorId && (
        <Modal
          isOpen={!!revokeDoctorId}
          onClose={() => {
            setRevokeDoctorId(null);
            setRevocationReason('');
          }}
          title={`Revoke Access: ${revokeDoctorName}`}
        >
          <form onSubmit={handleRevokeSubmit} className="space-y-4">
            <Alert type="warning" title="Immediate Access Revocation">
              Revoking authorization terminates this doctor's ability to view your consolidated medical history immediately. All past access events remain logged in the immutable audit trail.
            </Alert>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Reason for Revocation (optional)
              </label>
              <textarea
                rows={3}
                value={revocationReason}
                onChange={(e) => setRevocationReason(e.target.value)}
                placeholder="e.g. Treatment completed, switching physician, patient requested..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-red-500 text-slate-800"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => {
                  setRevokeDoctorId(null);
                  setRevocationReason('');
                }}
              >
                Cancel
              </Button>
              <Button variant="danger" size="sm" type="submit" loading={revokeLoading}>
                Confirm Revocation
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
