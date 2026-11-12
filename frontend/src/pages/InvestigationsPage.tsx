import React from 'react';
import { FlaskConical, TrendingUp, CheckCircle2 } from 'lucide-react';
import { usePatient } from '../hooks/usePatient';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';

export const InvestigationsPage: React.FC = () => {
  const { selectedPatient } = usePatient();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0f2b48] tracking-tight">Diagnostic Investigations</h1>
            <Badge variant="primary" size="md">
              Lab Panels & Scans
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Reconciles blood chemistry, hematology, lipid panels, and imaging findings with original measurement units.
          </p>
        </div>
      </div>

      {selectedPatient ? (
        <Card className="p-8 text-center bg-white">
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <FlaskConical className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-800 text-sm">
            Diagnostic History for {selectedPatient.first_name} {selectedPatient.last_name}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
            Upload laboratory reports and radiology scans to chart test values across time while preserving native measurement units (e.g. mg/dL vs mmol/L).
          </p>
        </Card>
      ) : (
        <Alert type="warning" title="No Patient Selected">
          Please select a patient to view investigations.
        </Alert>
      )}
    </div>
  );
};
