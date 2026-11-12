import React from 'react';
import { Clock, Filter, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { usePatient } from '../hooks/usePatient';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

export const TimelinePage: React.FC = () => {
  const { selectedPatient } = usePatient();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0f2b48] tracking-tight">Medical Timeline</h1>
            <Badge variant="primary" size="md">
              Chronological & Evidentiary
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Chronological sequence of conditions, medication events, allergies, tests, and consultations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={<Filter className="w-3.5 h-3.5" />}>
            Filter Categories
          </Button>
          <Button variant="outline" size="sm" icon={<Calendar className="w-3.5 h-3.5" />}>
            Date Range
          </Button>
        </div>
      </div>

      {selectedPatient ? (
        <Card className="p-8 text-center bg-white">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-[#0f2b48] flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-800 text-sm">
            Timeline for {selectedPatient.first_name} {selectedPatient.last_name}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
            Upload prescriptions or laboratory panels in the Medical Documents module to generate an interactive, chronological timeline with source text highlights.
          </p>
          <div className="p-3 max-w-md mx-auto bg-slate-50 border border-slate-200 rounded-lg text-left text-xs space-y-1.5 text-slate-600">
            <div className="font-semibold text-slate-800">Timeline Guarantees:</div>
            <div>• Event dates are kept strictly distinct from document upload dates.</div>
            <div>• Ambiguous or incomplete dates are preserved with precision flags rather than guessed.</div>
            <div>• Every event card provides a direct 1-click citation back to its original source document.</div>
          </div>
        </Card>
      ) : (
        <Alert type="warning" title="No Patient Selected">
          Please select a patient to view their medical timeline.
        </Alert>
      )}
    </div>
  );
};
