import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Stethoscope, UserCheck, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/auth';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('patient');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await register({
        full_name: fullName,
        email,
        password,
        role,
      });
      navigate('/overview');
    } catch (err: any) {
      setError(err?.message || 'Registration failed. An account with this email may already exist.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-2.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0f2b48] to-[#0d9488] flex items-center justify-center text-white shadow-md">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#0f2b48]">MY CLINIX</h2>
            <p className="text-xs text-slate-500 font-medium -mt-0.5">One Patient, Many Records</p>
          </div>
        </div>
        <h3 className="mt-6 text-center text-lg font-semibold text-slate-800">
          Create an Authorized Account
        </h3>
        <p className="mt-1 text-center text-xs text-slate-500">
          Role-based clinical record access and verification
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-8 shadow-[0_4px_20px_rgba(0,0,0,0.06)] rounded-2xl border border-slate-200/80">
          {error && (
            <Alert type="error" className="mb-5">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Dr. Jennifer Adams"
              required
            />

            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. physician@hospital.org"
              required
            />

            <Input
              label="Password (min 8 chars)"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Clinical / System Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-[#0d9488] text-slate-900 cursor-pointer"
              >
                <option value="patient">Patient (Manage personal records & health passport)</option>
                <option value="doctor">Doctor (Clinical Review & Medical Verification)</option>
                <option value="administrator">Administrator (System & Data Governance)</option>
              </select>
            </div>

            <Button
              type="submit"
              variant="secondary"
              size="lg"
              loading={loading}
              className="w-full mt-4"
              icon={<UserCheck className="w-4 h-4" />}
            >
              Complete Registration
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[#0d9488] hover:underline">
              Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
