import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  Clock,
  Pill,
  HeartPulse,
  FlaskConical,
  AlertOctagon,
  BotMessageSquare,
  CheckCheck,
  BarChart3,
  Settings as SettingsIcon,
  Search,
  Bell,
  LogOut,
  ShieldAlert,
  User as UserIcon,
  Menu,
  X,
  Stethoscope,
  Activity,
  Shield,
  ShieldCheck,
  TrendingUp,
  Globe,
  Plane,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePatient } from '../hooks/usePatient';
import { Badge } from '../components/ui/Badge';
import { UserRole } from '../types/auth';
import { FloatingAiChatbot } from '../components/FloatingAiChatbot';

export const MainLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { patients, selectedPatient, selectPatient } = usePatient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // Role-specific Navigation Schemes
  // For Patient: Strictly follows prompt:
  // 1. Global Health Passport
  // 2. Overview
  // 3. Medical Documents
  // 4. Medical Timeline
  // 5. Medication History
  // 6. View Patient's Record & Recovery
  // 7. Conditions & Analysis
  // 8. Conflicts
  // 9. Missing Information
  // 10. Settings
  const getNavigationForRole = (role?: UserRole) => {
    if (role === 'patient') {
      return [
        {
          name: 'Global Health Passport',
          path: '/passport',
          icon: ShieldCheck,
          badge: 'Verified',
        },
        {
          name: 'Overview',
          path: '/overview',
          icon: LayoutDashboard,
        },
        {
          name: 'Medical Documents',
          path: '/documents',
          icon: FileText,
          badge: selectedPatient?.documents_count ? `${selectedPatient.documents_count}` : undefined,
        },
        {
          name: 'Medical Timeline',
          path: '/timeline',
          icon: Clock,
        },
        {
          name: 'Medication History',
          path: '/medications',
          icon: Pill,
        },
        {
          name: "View Patient's Record & Recovery",
          path: '/recovery',
          icon: TrendingUp,
        },
        {
          name: 'Conditions & Analysis',
          path: '/conditions-analysis',
          icon: HeartPulse,
        },
        {
          name: 'Conflicts',
          path: '/conflicts',
          icon: AlertOctagon,
          alert: (selectedPatient?.contradictions_count || 0) > 0,
          badge: selectedPatient?.contradictions_count ? `${selectedPatient.contradictions_count}` : undefined,
        },
        {
          name: 'Missing Information',
          path: '/missing-information',
          icon: CheckCheck,
        },
        {
          name: 'Ask MY CLINIX',
          path: '/ask-ai',
          icon: Sparkles,
          badge: 'AI',
        },
        {
          name: 'Doctor Access & Consent',
          path: '/consent',
          icon: ShieldCheck,
        },
        {
          name: 'Settings',
          path: '/settings',
          icon: SettingsIcon,
        },
      ];
    }

    if (role === 'doctor') {
      return [
        {
          name: 'Global Health Passport',
          path: '/passport',
          icon: ShieldCheck,
          badge: 'Verified',
        },
        {
          name: 'Overview',
          path: '/overview',
          icon: LayoutDashboard,
        },
        {
          name: 'Authorized Patients',
          path: '/patients',
          icon: Users,
          badge: patients.length ? `${patients.length}` : undefined,
        },
        {
          name: 'Medical Documents',
          path: '/documents',
          icon: FileText,
          badge: selectedPatient?.documents_count ? `${selectedPatient.documents_count}` : undefined,
        },
        {
          name: 'Medical Timeline',
          path: '/timeline',
          icon: Clock,
        },
        {
          name: 'Medication History',
          path: '/medications',
          icon: Pill,
        },
        {
          name: 'Conditions & Analysis',
          path: '/conditions-analysis',
          icon: HeartPulse,
        },
        {
          name: 'Patient Record & Recovery',
          path: '/recovery',
          icon: TrendingUp,
        },
        {
          name: 'Conflicts',
          path: '/conflicts',
          icon: AlertOctagon,
          alert: (selectedPatient?.contradictions_count || 0) > 0,
          badge: selectedPatient?.contradictions_count ? `${selectedPatient.contradictions_count}` : undefined,
        },
        {
          name: 'Missing Information',
          path: '/missing-information',
          icon: CheckCheck,
        },
        {
          name: 'Doctor Review & Verification',
          path: '/review',
          icon: ShieldAlert,
        },
        {
          name: 'Ask MY CLINIX',
          path: '/ask-ai',
          icon: Sparkles,
          badge: 'AI',
        },
        {
          name: 'Doctor Access & Consent',
          path: '/consent',
          icon: ShieldCheck,
        },
        {
          name: 'Settings',
          path: '/settings',
          icon: SettingsIcon,
        },
      ];
    }

    // Default: Administrator
    return [
      {
        name: 'Global Health Passport',
        path: '/passport',
        icon: ShieldCheck,
        badge: 'Verified',
      },
      {
        name: 'Overview',
        path: '/overview',
        icon: LayoutDashboard,
      },
      {
        name: 'Patients Management',
        path: '/patients',
        icon: Users,
        badge: patients.length ? `${patients.length}` : undefined,
      },
      {
        name: 'Medical Documents',
        path: '/documents',
        icon: FileText,
        badge: selectedPatient?.documents_count ? `${selectedPatient.documents_count}` : undefined,
      },
      {
        name: 'Medical Timeline',
        path: '/timeline',
        icon: Clock,
      },
      {
        name: 'Medication History',
        path: '/medications',
        icon: Pill,
      },
      {
        name: 'Conditions & Analysis',
        path: '/conditions-analysis',
        icon: HeartPulse,
      },
      {
        name: 'Patient Record & Recovery',
        path: '/recovery',
        icon: TrendingUp,
      },
      {
        name: 'Conflicts',
        path: '/conflicts',
        icon: AlertOctagon,
        alert: (selectedPatient?.contradictions_count || 0) > 0,
        badge: selectedPatient?.contradictions_count ? `${selectedPatient.contradictions_count}` : undefined,
      },
      {
        name: 'Missing Information',
        path: '/missing-information',
        icon: CheckCheck,
      },
      {
        name: 'Doctor Review & Verification',
        path: '/review',
        icon: ShieldAlert,
      },
      {
        name: 'Platform Analytics',
        path: '/analytics',
        icon: BarChart3,
      },
      {
        name: 'Ask MY CLINIX',
        path: '/ask-ai',
        icon: Sparkles,
        badge: 'AI',
      },
      {
        name: 'Security Audit Logs',
        path: '/admin/audit-logs',
        icon: ShieldAlert,
      },
      {
        name: 'Settings & Governance',
        path: '/settings',
        icon: SettingsIcon,
      },
    ];
  };

  const navigationItems = getNavigationForRole(user?.role);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLabels: Record<string, { label: string; variant: 'primary' | 'secondary' | 'neutral'; icon: any }> = {
    administrator: { label: 'Administrator', variant: 'primary', icon: Shield },
    doctor: { label: 'Doctor', variant: 'secondary', icon: Activity },
    patient: { label: 'Patient', variant: 'neutral', icon: UserIcon },
  };

  const userRoleConfig =
    user?.role && roleLabels[user.role]
      ? roleLabels[user.role]
      : { label: user?.role || 'User', variant: 'neutral' as const, icon: UserIcon };

  const RoleIcon = userRoleConfig.icon;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      {/* Top Navigation Bar */}
      <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Application Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/overview')}>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#0f2b48] to-[#0d9488] flex items-center justify-center text-white shadow-sm">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-[#0f2b48]">MY CLINIX</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-teal-50 text-[#0d9488] border border-teal-200">
                  Evidentiary
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium -mt-0.5 hidden sm:block">One Patient, Many Records</p>
            </div>
          </div>
        </div>

        {/* Center: Search & Active Patient Indicator & Travel Mode Quick Pill */}
        <div className="flex items-center gap-3 flex-1 max-w-2xl mx-4 hidden md:flex">
          <div className="relative w-56">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search findings, tests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0d9488] focus:bg-white transition-all text-slate-800"
            />
          </div>

          {/* Active Patient Selector */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
            <UserIcon className="w-3.5 h-3.5 text-[#0d9488]" />
            <span className="text-slate-500 font-medium">Patient:</span>
            {patients.length > 0 ? (
              <select
                value={selectedPatient?.id || ''}
                onChange={(e) => selectPatient(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name} ({p.blood_group})
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-amber-600 font-medium">No patient selected</span>
            )}
          </div>

          {/* Direct Flagship Travel Mode Shortcut Pill */}
          <button
            onClick={() => navigate('/passport')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 text-teal-800 hover:border-teal-300 text-xs font-bold transition-all shadow-2xs cursor-pointer ml-auto"
          >
            <Globe className="w-3.5 h-3.5 text-[#0d9488]" />
            <span>Travel Mode</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
          </button>
        </div>

        {/* Right: User Role Badge, Profile & Logout */}
        <div className="flex items-center gap-3">
          <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
          </button>

          <div className="h-6 w-px bg-slate-200" />

          {/* User profile */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#0f2b48] text-white flex items-center justify-center text-xs font-semibold">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-semibold text-slate-800 leading-tight">{user?.full_name}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant={userRoleConfig.variant} size="sm">
                  <span className="flex items-center gap-1">
                    <RoleIcon className="w-3 h-3" />
                    <span>{userRoleConfig.label}</span>
                  </span>
                </Badge>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          className={`w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 transition-transform duration-200 z-30 ${
            mobileMenuOpen ? 'fixed inset-y-16 left-0 shadow-lg' : 'hidden md:flex'
          }`}
        >
          {/* Active Patient Banner in Sidebar */}
          {selectedPatient && (
            <div className="p-3.5 mx-3 mt-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Patient Record</span>
                <Badge variant="secondary" size="sm">
                  {selectedPatient.access_level || 'Active'}
                </Badge>
              </div>
              <div className="mt-1 font-semibold text-sm text-[#0f2b48]">
                {selectedPatient.first_name} {selectedPatient.last_name}
              </div>
              <div className="text-[11px] text-slate-500 flex gap-2 mt-0.5">
                <span>DOB: {selectedPatient.date_of_birth}</span>
                <span>•</span>
                <span>Blood: {selectedPatient.blood_group}</span>
              </div>
            </div>
          )}

          <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-[#0f2b48] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.badge === 'Travel Mode'
                          ? 'bg-teal-600 text-white'
                          : item.alert
                          ? 'bg-rose-500 text-white'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Clinical Safety Notice in Sidebar Footer */}
          <div className="p-3 m-3 rounded-lg bg-teal-50/50 border border-teal-100 text-[11px] text-slate-600">
            <div className="flex items-center gap-1.5 font-semibold text-[#0f2b48] mb-1">
              <ShieldAlert className="w-3.5 h-3.5 text-[#0d9488]" />
              <span>Evidence Traceability</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              All findings link strictly to verifiable source passages. Never provides unsupervised diagnoses.
            </p>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl relative">
          <Outlet />

          {/* Floating AI Chatbot Widget (Bottom-Right) */}
          <FloatingAiChatbot />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
