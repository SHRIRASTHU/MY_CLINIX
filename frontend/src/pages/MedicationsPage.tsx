import React from 'react';
import { Pill, ShieldCheck, AlertCircle, History } from 'lucide-react';
import { usePatient } from '../hooks/usePatient';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';

export const MedicationsPage: React.FC = () => {
  const { selectedPatient } = usePatient();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0f2b48] tracking-tight">Medication History</h1>
            <Badge variant="primary" size="md">
              Lifecycle Management
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tracks start, dosage adjustment, historical use, and explicit discontinuation with evidentiary backing.
          </p>
        </div>
      </div>

      <Alert type="info" title="Medication Intelligence Rules">
        A medicine appearing in an old prescription is not automatically considered current, and a newer prescription does not automatically imply older medicines were stopped. Discontinuations require explicit source evidence.
      </Alert>

      {selectedPatient ? (
        <Card className="p-8 text-center bg-white">
          <div className="w-12 h-12 rounded-full bg-teal-50 text-[#0d9488] flex items-center justify-center mx-auto mb-3">
            <Pill className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-800 text-sm">
            Medication Profile for {selectedPatient.first_name} {selectedPatient.last_name}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
            Upload prescriptions to populate active regimens, historical therapies, dosage changes, and explicit discontinuation records.
          </p>
        </Card>
      ) : (
        <Alert type="warning" title="No Patient Selected">
          Please select a patient to view medication lifecycle.
        </Alert>
      )}
    </div>
  );
};
