import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/auth';
import { Spinner } from './ui/Spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spinner size="lg" label="Validating medical credentials..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Enforce role-based access control
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-2xl border border-slate-200 m-4">
        <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4 shadow-xs">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Access Restricted</h2>
        <p className="text-xs text-slate-500 max-w-md mt-1.5 mb-2">
          Your active account role is <span className="font-semibold text-slate-700 capitalize">{user.role}</span>.
        </p>
        <p className="text-xs text-slate-500 max-w-md mb-6">
          This clinical interface is restricted to authorized <strong>{allowedRoles.map(r => r.toUpperCase()).join(' or ')}</strong> accounts only.
        </p>
        <Link
          to="/overview"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0f2b48] text-white text-xs font-semibold rounded-lg hover:bg-[#133b63] transition-colors shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Return to Authorized Dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
};
