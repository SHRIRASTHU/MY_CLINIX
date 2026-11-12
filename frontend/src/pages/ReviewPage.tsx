import React from 'react';
import { CheckCheck, History, Eye, Check, X } from 'lucide-react';
import { usePatient } from '../hooks/usePatient';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';

export const ReviewPage: React.FC = () => {
  const { selectedPatient } = usePatient();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0f2b48] tracking-tight">Review & Verification</h1>
            <Badge variant="primary" size="md">
              Human-in-the-Loop Audit
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Authorized reviewers audit extracted findings, correct values with reasons, and inspect source document pages.
          </p>
        </div>
      </div>

      <Alert type="info" title="Append-Only Audit Policy">
        Original extractions and source documents are never overwritten. All reviewer updates record reviewer ID, timestamp, prior value, corrected value, and clinical correction rationale.
      </Alert>

      {selectedPatient ? (
        <Card className="p-8 text-center bg-white">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCheck className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-800 text-sm">
            Verification Queue for {selectedPatient.first_name} {selectedPatient.last_name}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
            Upload records to view extracted entities and launch the split-screen document viewer with interactive verification actions.
          </p>
        </Card>
      ) : (
        <Alert type="warning" title="No Patient Selected">
          Please select a patient to audit findings.
        </Alert>
      )}
    </div>
  );
};
