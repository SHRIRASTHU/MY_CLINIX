import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Stethoscope, Lock, Mail, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await login({ email, password });
      navigate('/overview');
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('DemoPass123!');
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
          Sign in to your clinical workspace
        </h3>
        <p className="mt-1 text-center text-xs text-slate-500">
          Traceable, evidentiary medical record intelligence
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
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. physician@hospital.org"
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center text-slate-600 cursor-pointer">
                <input type="checkbox" className="rounded border-slate-300 text-[#0d9488] focus:ring-[#0d9488] mr-2" />
                Remember this terminal
              </label>
              <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Please contact system administrator to reset credentials.'); }} className="text-[#0d9488] hover:underline font-medium">
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-2"
              icon={<Lock className="w-4 h-4" />}
            >
              Sign In to Patient Records
            </Button>
          </form>

          {/* Quick Demo Access Bar */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2.5 text-center">
              Demonstration Quick Accounts
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDemo('admin@myclinix.org')}
                className="text-left p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer text-xs"
              >
                <div className="font-semibold text-slate-800">Admin Account</div>
                <div className="text-[10px] text-slate-500">admin@myclinix.org</div>
              </button>
              <button
                type="button"
                onClick={() => fillDemo('reviewer@myclinix.org')}
                className="text-left p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer text-xs"
              >
                <div className="font-semibold text-slate-800">Medical Reviewer</div>
                <div className="text-[10px] text-slate-500">reviewer@myclinix.org</div>
              </button>
              <button
                type="button"
                onClick={() => fillDemo('caregiver@myclinix.org')}
                className="text-left p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer text-xs"
              >
                <div className="font-semibold text-slate-800">Caregiver</div>
                <div className="text-[10px] text-slate-500">caregiver@myclinix.org</div>
              </button>
              <button
                type="button"
                onClick={() => fillDemo('patient@myclinix.org')}
                className="text-left p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer text-xs"
              >
                <div className="font-semibold text-slate-800">Patient</div>
                <div className="text-[10px] text-slate-500">patient@myclinix.org</div>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-600">
            Don't have an authorized account?{' '}
            <Link to="/register" className="font-semibold text-[#0d9488] hover:underline">
              Create an account
            </Link>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-[#0d9488]" />
          <span>Strict Patient Isolation • Never Invent Medical Facts</span>
        </div>
      </div>
    </div>
  );
};
