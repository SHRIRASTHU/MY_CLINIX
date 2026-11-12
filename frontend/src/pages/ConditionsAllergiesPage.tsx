import React from 'react';
import { HeartPulse, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { usePatient } from '../hooks/usePatient';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';

export const ConditionsAllergiesPage: React.FC = () => {
  const { selectedPatient } = usePatient();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0f2b48] tracking-tight">Conditions & Allergies</h1>
            <Badge variant="primary" size="md">
              Explicit Polarities
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Explicit positive diagnoses, explicit negative assertions ("No Known Drug Allergies"), and unrecorded items.
          </p>
        </div>
      </div>

      <Alert type="warning" title="Strict Absence Principle">
        Never convert absence of evidence into evidence of absence. If allergies are not mentioned in a document, it is recorded as "Not documented in this record", distinct from an explicit negative.
      </Alert>

      {selectedPatient ? (
        <Card className="p-8 text-center bg-white">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <HeartPulse className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-800 text-sm">
            Diagnoses & Allergies for {selectedPatient.first_name} {selectedPatient.last_name}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Upload consultation notes, discharge summaries, or problem lists to populate categorized clinical conditions and verified allergy profiles.
          </p>
        </Card>
      ) : (
        <Alert type="warning" title="No Patient Selected">
          Please select a patient to view conditions and allergies.
        </Alert>
      )}
    </div>
  );
};
