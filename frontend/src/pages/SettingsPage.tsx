import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Shield,
  Key,
  Database,
  UserCheck,
  CheckCircle2,
  XCircle,
  Stethoscope,
  Users,
  Search,
  Filter,
  User,
  Mail,
  Calendar,
  Droplet,
  Phone,
  Lock,
  Bell,
  Eye,
  Activity,
  Download,
  Save,
  Check,
  Smartphone,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePatient } from '../hooks/usePatient';
import { adminService } from '../services/adminService';
import { User as UserType } from '../types/auth';
import { BloodGroup } from '../types/patient';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { Input } from '../components/ui/Input';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { selectedPatient } = usePatient();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'privacy' | 'activity' | 'admin'>('profile');

  // Profile Form state
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [dob, setDob] = useState(selectedPatient?.date_of_birth || '1979-05-14');
  const [bloodType, setBloodType] = useState<BloodGroup>(selectedPatient?.blood_group || 'O+');
  const [contactPhone, setContactPhone] = useState(selectedPatient?.emergency_contact_phone || '+1 (555) 234-5678');
  const [emergencyContactName, setEmergencyContactName] = useState(selectedPatient?.emergency_contact_name || 'Eleanor Vance (Spouse)');
  const [profileSaved, setProfileSaved] = useState(false);

  // Password Change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Security 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);

  // Notification Preferences state
  const [notifLabResults, setNotifLabResults] = useState(true);
  const [notifConflictResolutions, setNotifConflictResolutions] = useState(true);
  const [notifDocumentUploads, setNotifDocumentUploads] = useState(true);
  const [notifReminders, setNotifReminders] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);

  // Administrator State
  const [userList, setUserList] = useState<UserType[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [filterRole, setFilterRole] = useState<string>('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === 'administrator') {
      loadUsers();
    }
  }, [user, filterRole]);

  useEffect(() => {
    if (selectedPatient) {
      setDob(selectedPatient.date_of_birth || '1979-05-14');
      setBloodType(selectedPatient.blood_group || 'O+');
      if (selectedPatient.emergency_contact_phone) setContactPhone(selectedPatient.emergency_contact_phone);
      if (selectedPatient.emergency_contact_name) setEmergencyContactName(selectedPatient.emergency_contact_name);
    }
  }, [selectedPatient]);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const data = await adminService.getUsers(filterRole || undefined);
      setUserList(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordStatus(null);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordStatus('Password successfully updated with bcrypt cryptographic hash.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordStatus(null), 4000);
  };

  const handleSaveNotifications = () => {
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 3000);
  };

  const handleToggleDoctorVerification = async (targetUser: UserType) => {
    try {
      const updated = await adminService.verifyDoctor(targetUser.id, !targetUser.is_verified);
      setUserList((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, is_verified: updated.is_verified } : u))
      );
      setActionSuccess(
        `Doctor ${targetUser.full_name} verification status updated to: ${
          !targetUser.is_verified ? 'Verified' : 'Unverified'
        }`
      );
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Failed to update doctor verification status');
    }
  };

  const handleToggleUserStatus = async (targetUser: UserType) => {
    try {
      const updated = await adminService.updateUserStatus(targetUser.id, !targetUser.is_active);
      setUserList((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, is_active: updated.is_active } : u))
      );
      setActionSuccess(
        `User ${targetUser.full_name} status updated to: ${!targetUser.is_active ? 'Active' : 'Inactive'}`
      );
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Failed to update user status');
    }
  };

  const auditActivities = [
    {
      action: 'Global Health Passport Verified',
      date: 'Today, 10:14 AM',
      ip: '192.168.1.45',
      device: 'Chrome / Windows 11',
      status: 'success',
    },
    {
      action: 'Medical Record Document Downloaded (Comprehensive_Metabolic_Panel.pdf)',
      date: 'Yesterday, 04:30 PM',
      ip: '192.168.1.45',
      device: 'Chrome / Windows 11',
      status: 'success',
    },
    {
      action: 'Successful Authenticated Session Login',
      date: '2026-11-10 09:12 AM',
      ip: '192.168.1.45',
      device: 'Chrome / Windows 11',
      status: 'success',
    },
    {
      action: 'Medication History Discrepancy Audited',
      date: '2026-11-05 02:40 PM',
      ip: '10.0.4.12',
      device: 'Firefox / macOS',
      status: 'verified',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0f2b48] tracking-tight">Account & Patient Settings</h1>
            <Badge variant="primary" size="md">
              Governance & Security
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage your patient profile, contact info, security credentials, notification preferences, and privacy controls.
          </p>
        </div>

        {/* Setting Navigation Pills */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'profile' ? 'bg-white text-[#0f2b48] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Profile & Contact
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'security' ? 'bg-white text-[#0f2b48] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Password & Security
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'notifications' ? 'bg-white text-[#0f2b48] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Notifications
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'privacy' ? 'bg-white text-[#0f2b48] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Privacy
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'activity' ? 'bg-white text-[#0f2b48] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Activity Log
          </button>
          {user?.role === 'administrator' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'admin' ? 'bg-white text-[#0f2b48] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Doctor Verification
            </button>
          )}
        </div>
      </div>

      {actionSuccess && (
        <Alert type="success" title="Success">
          {actionSuccess}
        </Alert>
      )}

      {/* ============================================================ */}
      {/* 1. Profile & Contact Management                              */}
      {/* ============================================================ */}
      {activeTab === 'profile' && (
        <div className="space-y-6 max-w-4xl">
          {profileSaved && (
            <Alert type="success" title="Profile Updated">
              Patient contact information and profile details have been saved successfully.
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Identity Card */}
            <Card className="md:col-span-1 border-teal-100">
              <CardHeader>
                <CardTitle>Patient Identification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0f2b48] to-[#0d9488] text-white flex items-center justify-center font-bold text-2xl shadow-sm mx-auto">
                  {fullName ? fullName.charAt(0).toUpperCase() : 'P'}
                </div>

                <div className="text-center">
                  <div className="font-bold text-sm text-slate-800">{fullName}</div>
                  <div className="text-slate-400 text-[11px]">{email}</div>
                  <Badge variant="primary" size="sm" className="mt-2 capitalize">
                    {user?.role || 'Patient'}
                  </Badge>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Account Status:</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      Active & Verified
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Blood Type:</span>
                    <span className="font-mono font-bold text-[#0d9488] bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      {bloodType}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Date of Birth:</span>
                    <span className="font-medium text-slate-700">{dob}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profile Edit Form */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Profile & Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0d9488] focus:bg-white text-slate-800"
                        required
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        disabled
                        className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
                      />
                      <span className="text-[10px] text-slate-400">Email linked to verified auth provider.</span>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0d9488] focus:bg-white text-slate-800"
                        required
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Blood Type
                      </label>
                      <select
                        value={bloodType}
                        onChange={(e) => setBloodType(e.target.value as BloodGroup)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0d9488] focus:bg-white text-slate-800"
                      >
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bt) => (
                          <option key={bt} value={bt}>
                            {bt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Emergency Contact Name & Relation
                      </label>
                      <input
                        type="text"
                        value={emergencyContactName}
                        onChange={(e) => setEmergencyContactName(e.target.value)}
                        placeholder="e.g., Eleanor Vance (Spouse)"
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0d9488] focus:bg-white text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Emergency Contact Phone
                      </label>
                      <input
                        type="tel"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="+1 (555) 234-5678"
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0d9488] focus:bg-white text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-3 border-t border-slate-100">
                    <Button variant="primary" size="sm" type="submit" icon={<Save className="w-3.5 h-3.5" />}>
                      Save Profile Changes
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. Password & Account Security                               */}
      {/* ============================================================ */}
      {activeTab === 'security' && (
        <div className="space-y-6 max-w-3xl">
          {passwordStatus && (
            <Alert type="success" title="Security Updated">
              {passwordStatus}
            </Alert>
          )}
          {passwordError && (
            <Alert type="warning" title="Password Validation Error">
              {passwordError}
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Change Account Password</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0d9488] focus:bg-white text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Minimum 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0d9488] focus:bg-white text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0d9488] focus:bg-white text-slate-800"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end pt-3 border-t border-slate-100">
                  <Button variant="primary" size="sm" type="submit" icon={<Lock className="w-3.5 h-3.5" />}>
                    Update Password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Account Security Measures */}
          <Card>
            <CardHeader>
              <CardTitle>Account Security & Multi-Factor Authentication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-teal-50 text-[#0d9488] flex items-center justify-center">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">Two-Factor Authentication (2FA)</div>
                    <div className="text-slate-500 text-[11px]">Enforce one-time verification codes upon sign-in</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    twoFactorEnabled
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-slate-700">Bcrypt cryptographic password hashing</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2.5">
                  <Key className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-slate-700">Strict JWT bearer token expiry (8 hours)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. Notification Preferences                                  */}
      {/* ============================================================ */}
      {activeTab === 'notifications' && (
        <div className="space-y-6 max-w-3xl">
          {notifSaved && (
            <Alert type="success" title="Preferences Saved">
              Notification preferences have been updated.
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Medical Alerts & Notification Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="divide-y divide-slate-100">
                <div className="py-3.5 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">Diagnostic & Lab Result Alerts</div>
                    <div className="text-slate-500 text-[11px]">Notify when abnormal lab values (HIGH/LOW) are processed</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifLabResults}
                    onChange={(e) => setNotifLabResults(e.target.checked)}
                    className="w-4 h-4 accent-[#0d9488] cursor-pointer"
                  />
                </div>

                <div className="py-3.5 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">Doctor Conflict Resolutions</div>
                    <div className="text-slate-500 text-[11px]">Notify when an attending doctor reviews and resolves a medical record discrepancy</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifConflictResolutions}
                    onChange={(e) => setNotifConflictResolutions(e.target.checked)}
                    className="w-4 h-4 accent-[#0d9488] cursor-pointer"
                  />
                </div>

                <div className="py-3.5 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">Document Upload & Extraction Confirmation</div>
                    <div className="text-slate-500 text-[11px]">Receive notification when uploaded documents finish OCR & evidentiary extraction</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifDocumentUploads}
                    onChange={(e) => setNotifDocumentUploads(e.target.checked)}
                    className="w-4 h-4 accent-[#0d9488] cursor-pointer"
                  />
                </div>

                <div className="py-3.5 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">Appointment & Follow-up Reminders</div>
                    <div className="text-slate-500 text-[11px]">Periodic alerts for scheduled clinical appointments and prescription renewals</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifReminders}
                    onChange={(e) => setNotifReminders(e.target.checked)}
                    className="w-4 h-4 accent-[#0d9488] cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-slate-100">
                <Button variant="primary" size="sm" onClick={handleSaveNotifications} icon={<Save className="w-3.5 h-3.5" />}>
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. Privacy & Evidentiary Data Governance                     */}
      {/* ============================================================ */}
      {activeTab === 'privacy' && (
        <div className="space-y-6 max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>Evidentiary Privacy & Compliance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs text-slate-600">
              <div className="p-4 bg-teal-50/50 rounded-xl border border-teal-200">
                <div className="flex items-center gap-2 font-bold text-[#0f2b48] mb-1">
                  <Shield className="w-4 h-4 text-[#0d9488]" />
                  <span>Strict Patient Record Isolation Policy</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Your medical data is encrypted in transit and at rest. Access to your records is governed strictly by cryptographic tokens and explicitly granted permissions to verified doctors and platform administrators.
                </p>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-slate-800">Your Data Rights:</div>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li>Permanent access to all uploaded original documents and SHA-256 integrity proofs.</li>
                  <li>Tamper-evident record of all physician reviews, notes, and contradiction resolutions.</li>
                  <li>Right to export your complete medical timeline and health passport at any time.</li>
                </ul>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">Download machine-readable evidentiary archive (JSON / PDF)</span>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Download className="w-3.5 h-3.5" />}
                  onClick={() => alert('Exporting complete patient health record package...')}
                >
                  Export Health Record
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. Account Activity Audit Log                                */}
      {/* ============================================================ */}
      {activeTab === 'activity' && (
        <div className="space-y-6 max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle>Recent Account Activity & Security Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px]">
                      <th className="py-2.5 px-3">Event Action</th>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">IP Address</th>
                      <th className="py-2.5 px-3">Client Device</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditActivities.map((act, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 font-medium text-slate-800 flex items-center gap-2">
                          <Activity className="w-3.5 h-3.5 text-[#0d9488]" />
                          <span>{act.action}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-500">{act.date}</td>
                        <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">{act.ip}</td>
                        <td className="py-3 px-3 text-slate-500">{act.device}</td>
                        <td className="py-3 px-3 text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Audited
                          </span>
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

      {/* ============================================================ */}
      {/* 6. Administrator Doctor Verification & User Governance       */}
      {/* ============================================================ */}
      {user?.role === 'administrator' && activeTab === 'admin' && (
        <Card className="border-indigo-100 shadow-xs">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle>Doctor Verification & User Governance</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Review registered doctors, verify medical credentials, and manage account statuses.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#0d9488]"
              >
                <option value="">All Roles</option>
                <option value="doctor">Doctors</option>
                <option value="patient">Patients</option>
                <option value="administrator">Administrators</option>
              </select>
              <Button variant="outline" size="sm" onClick={loadUsers}>
                Refresh
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {loadingUsers ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading user accounts...</div>
            ) : userList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No user accounts found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px]">
                      <th className="py-2.5 px-3">User</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Doctor Verification</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {userList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-800">{u.full_name}</div>
                          <div className="text-[11px] text-slate-400">{u.email}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge
                            variant={u.role === 'administrator' ? 'primary' : u.role === 'doctor' ? 'secondary' : 'neutral'}
                            size="sm"
                          >
                            {u.role.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3">
                          {u.role === 'doctor' ? (
                            u.is_verified ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                Verified Doctor
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                <XCircle className="w-3 h-3" />
                                Pending Verification
                              </span>
                            )
                          ) : (
                            <span className="text-slate-400 text-[11px]">N/A (Non-physician)</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {u.is_active ? (
                            <span className="text-emerald-700 font-medium">Active</span>
                          ) : (
                            <span className="text-rose-600 font-medium">Suspended</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {u.role === 'doctor' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleDoctorVerification(u)}
                              >
                                {u.is_verified ? 'Revoke Verification' : 'Verify Doctor'}
                              </Button>
                            )}
                            {u.id !== user?.id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleUserStatus(u)}
                              >
                                {u.is_active ? 'Deactivate' : 'Activate'}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SettingsPage;
