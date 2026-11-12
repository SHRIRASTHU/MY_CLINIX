import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Check,
  Share2,
  Trash2,
  FileText,
  Calendar,
  AlertCircle,
  ShieldCheck,
  Heart,
  Phone,
  Clock,
} from 'lucide-react';
import { usePatient } from '../hooks/usePatient';
import { useAuth } from '../hooks/useAuth';
import { patientService } from '../services/patientService';
import { Patient, PatientCreateInput, Gender, BloodGroup, AccessLevel } from '../types/patient';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';
import { Spinner } from '../components/ui/Spinner';

export const PatientsPage: React.FC = () => {
  const { patients, selectedPatient, selectPatient, refreshPatients, loading } = usePatient();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [targetPatientForShare, setTargetPatientForShare] = useState<Patient | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState<AccessLevel>('viewer');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareMessage, setShareMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState<PatientCreateInput>({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'unknown',
    blood_group: 'unknown',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    medical_notes: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name || !formData.last_name || !formData.date_of_birth) {
      setFormError('First name, last name, and date of birth are required.');
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError(null);
      const created = await patientService.createPatient(formData);
      await refreshPatients();
      selectPatient(created.id);
      setIsAddModalOpen(false);
      setFormData({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        gender: 'unknown',
        blood_group: 'unknown',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        medical_notes: '',
      });
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create patient profile');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeletePatient = async (patientId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete patient ${name}? This action cannot be undone.`)) {
      return;
    }
    try {
      await patientService.deletePatient(patientId);
      await refreshPatients();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete patient. Ensure you have owner permissions.');
    }
  };

  const handleOpenShare = (patient: Patient) => {
    setTargetPatientForShare(patient);
    setShareEmail('');
    setShareRole('viewer');
    setShareMessage(null);
    setIsShareModalOpen(true);
  };

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPatientForShare || !shareEmail) return;

    try {
      setShareLoading(true);
      setShareMessage(null);
      await patientService.grantAccess(targetPatientForShare.id, shareEmail, shareRole);
      setShareMessage({
        type: 'success',
        text: `Access successfully granted to ${shareEmail} with role: ${shareRole}`,
      });
      setShareEmail('');
      await refreshPatients();
    } catch (err: any) {
      setShareMessage({
        type: 'error',
        text: err?.message || 'Failed to grant access. Verify that the email is a registered user.',
      });
    } finally {
      setShareLoading(false);
    }
  };

  const filteredPatients = patients.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.first_name.toLowerCase().includes(term) ||
      p.last_name.toLowerCase().includes(term) ||
      p.blood_group.toLowerCase().includes(term) ||
      p.date_of_birth.includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0f2b48] tracking-tight">Patient Management</h1>
            <Badge variant="primary" size="md">
              {patients.length} Authorized {patients.length === 1 ? 'Profile' : 'Profiles'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage multi-patient medical profiles with strict role-based access control and patient data isolation.
          </p>
        </div>

        <Button
          variant="secondary"
          size="md"
          icon={<UserPlus className="w-4 h-4" />}
          onClick={() => setIsAddModalOpen(true)}
        >
          Add New Patient
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient by name, DOB, or blood group..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#0d9488] shadow-xs text-slate-900"
          />
        </div>
      </div>

      {/* Patient Cards Grid */}
      {loading && patients.length === 0 ? (
        <Spinner size="lg" label="Loading authorized patient records..." />
      ) : filteredPatients.length === 0 ? (
        <Card className="text-center py-12 px-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h4 className="text-base font-semibold text-slate-800">No Patient Records Found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            {searchTerm
              ? 'No patients matched your search criteria. Try a different query.'
              : 'You do not have any patient profiles registered yet. Create your first profile to begin uploading records.'}
          </p>
          {!searchTerm && (
            <Button
              variant="secondary"
              size="sm"
              icon={<UserPlus className="w-4 h-4" />}
              onClick={() => setIsAddModalOpen(true)}
            >
              Add New Patient Profile
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPatients.map((patient) => {
            const isSelected = selectedPatient?.id === patient.id;
            const canManage = patient.access_level === 'owner' || user?.role === 'administrator';

            return (
              <Card
                key={patient.id}
                className={`transition-all duration-200 border-2 ${
                  isSelected ? 'border-[#0d9488] bg-teal-50/10 shadow-sm' : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-slate-900">
                          {patient.first_name} {patient.last_name}
                        </h3>
                        {isSelected && (
                          <Badge variant="secondary" size="sm">
                            Active Scope
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        DOB: {patient.date_of_birth} • Gender: {patient.gender}
                      </p>
                    </div>

                    <Badge variant="primary" size="sm">
                      {patient.access_level || 'Viewer'}
                    </Badge>
                  </div>

                  {/* Vitals & Summary Badges */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Heart className="w-3.5 h-3.5 text-rose-500" />
                      <span>Blood: <strong className="text-slate-800">{patient.blood_group}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <FileText className="w-3.5 h-3.5 text-[#0d9488]" />
                      <span>Records: <strong className="text-slate-800">{patient.documents_count || 0}</strong></span>
                    </div>
                  </div>

                  {patient.emergency_contact_name && (
                    <div className="mt-3 p-2 rounded-lg bg-slate-50 text-[11px] text-slate-600 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>Contact: <strong>{patient.emergency_contact_name}</strong></span>
                      </span>
                      <span className="text-slate-500">{patient.emergency_contact_phone}</span>
                    </div>
                  )}

                  {patient.medical_notes && (
                    <p className="mt-2 text-xs text-slate-600 line-clamp-2 italic bg-amber-50/50 p-2 rounded border border-amber-100">
                      "{patient.medical_notes}"
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 mt-5 pt-3 border-t border-slate-100">
                    <Button
                      variant={isSelected ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() => selectPatient(patient.id)}
                      icon={isSelected ? <Check className="w-3.5 h-3.5" /> : undefined}
                      className="flex-1"
                    >
                      {isSelected ? 'Active Scope' : 'Select Patient'}
                    </Button>

                    {canManage && (
                      <>
                        <button
                          onClick={() => handleOpenShare(patient)}
                          title="Share patient access"
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePatient(patient.id, `${patient.first_name} ${patient.last_name}`)}
                          title="Delete patient profile"
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add New Patient Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Patient Profile"
        subtitle="Create an isolated medical record for a new patient"
        maxWidth="lg"
      >
        {formError && (
          <Alert type="error" className="mb-4">
            {formError}
          </Alert>
        )}

        <form onSubmit={handleCreatePatient} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name *"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              placeholder="e.g. Eleanor"
              required
            />
            <Input
              label="Last Name *"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              placeholder="e.g. Vance"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Date of Birth *"
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              required
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Biological Sex
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0d9488]"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Blood Group
              </label>
              <select
                value={formData.blood_group}
                onChange={(e) => setFormData({ ...formData, blood_group: e.target.value as BloodGroup })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0d9488]"
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Emergency Contact Name"
              value={formData.emergency_contact_name || ''}
              onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
              placeholder="e.g. Marcus Vance (Spouse)"
            />
            <Input
              label="Emergency Contact Phone"
              value={formData.emergency_contact_phone || ''}
              onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
              placeholder="e.g. +1 (555) 234-5678"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Preliminary Clinical Notes / Baseline History
            </label>
            <textarea
              rows={3}
              value={formData.medical_notes || ''}
              onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value })}
              placeholder="Enter any initial clinical context, baseline diagnoses, or primary concerns..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0d9488]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" size="md" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="secondary" size="md" type="submit" loading={formSubmitting}>
              Create Patient Record
            </Button>
          </div>
        </form>
      </Modal>

      {/* Share Access Modal */}
      <Modal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title="Share Patient Access"
        subtitle={`Grant permission to access records for ${targetPatientForShare?.first_name} ${targetPatientForShare?.last_name}`}
        maxWidth="md"
      >
        {shareMessage && (
          <Alert type={shareMessage.type} className="mb-4">
            {shareMessage.text}
          </Alert>
        )}

        <form onSubmit={handleGrantAccess} className="space-y-4">
          <Input
            label="User Email Address"
            type="email"
            value={shareEmail}
            onChange={(e) => setShareEmail(e.target.value)}
            placeholder="e.g. specialist@hospital.org"
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Access Permission Level
            </label>
            <select
              value={shareRole}
              onChange={(e) => setShareRole(e.target.value as AccessLevel)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0d9488]"
            >
              <option value="viewer">Viewer (Read-only access to timeline and findings)</option>
              <option value="doctor">Doctor (Can audit findings, update notes, and resolve contradictions)</option>
              <option value="owner">Co-Owner (Full administrative permissions)</option>
            </select>
          </div>

          <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100 text-xs text-blue-900 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              By granting access, the specified user will be able to review medical records according to their role.
              All actions are permanently audited.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" size="md" type="button" onClick={() => setIsShareModalOpen(false)}>
              Done
            </Button>
            <Button variant="primary" size="md" type="submit" loading={shareLoading}>
              Grant Authorization
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
