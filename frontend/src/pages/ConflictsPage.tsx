import React from 'react';
import { AlertOctagon, Scale, ShieldCheck, CheckCheck } from 'lucide-react';
import { usePatient } from '../hooks/usePatient';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';

export const ConflictsPage: React.FC = () => {
  const { selectedPatient } = usePatient();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0f2b48] tracking-tight">Conflicts & Missing Information</h1>
            <Badge variant="warning" size="md">
              Contradiction Engine
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Detects conflicting allergy entries, contradictory test results, and inconsistent clinical statements.
          </p>
        </div>
      </div>

      <Alert type="warning" title="Anti-Hallucination Policy">
        MY CLINIX never silently chooses one conflicting medical value over another or uses AI confidence scores to resolve medical disagreements. Both pieces of evidence are preserved side-by-side for human reviewer audit.
      </Alert>

      {selectedPatient ? (
        <Card className="p-8 text-center bg-white">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-800 text-sm">
            Conflict Audit for {selectedPatient.first_name} {selectedPatient.last_name}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
            {(selectedPatient.contradictions_count || 0) > 0
              ? `${selectedPatient.contradictions_count} unresolved contradictions flagged in records.`
              : 'No contradictory medical assertions currently detected across uploaded records.'}
          </p>
        </Card>
      ) : (
        <Alert type="warning" title="No Patient Selected">
          Please select a patient to audit contradictions and missing information.
        </Alert>
      )}
    </div>
  );
};
