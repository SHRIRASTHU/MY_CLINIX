import React from 'react';
import { Settings as SettingsIcon, Shield, Key, Bell, Database } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-[#0f2b48] tracking-tight">System & Account Settings</h1>
          <Badge variant="primary" size="md">
            Security & Compliance
          </Badge>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          User profile, role management, API integration, and audit logging configuration.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle>User Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div>
              <span className="text-slate-500 block">Full Name:</span>
              <strong className="text-sm text-slate-800">{user?.full_name}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Email Address:</span>
              <strong className="text-sm text-slate-800">{user?.email}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Role:</span>
              <Badge variant="secondary" size="md" className="mt-1">
                {user?.role}
              </Badge>
            </div>
            <div>
              <span className="text-slate-500 block">Account Status:</span>
              <span className="text-emerald-700 font-semibold">Active & Authorized</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security & Data Governance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>JWT authentication with role-based backend authorization.</span>
            </div>
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Bcrypt password hashing with salt rounds.</span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Strict patient isolation enforced at database query level.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
