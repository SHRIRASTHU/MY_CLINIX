import React from 'react';
import { FileText, UploadCloud, ShieldAlert, CheckCircle2, AlertTriangle, Eye, Download } from 'lucide-react';
import { usePatient } from '../hooks/usePatient';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';

export const DocumentsPage: React.FC = () => {
  const { selectedPatient } = usePatient();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0f2b48] tracking-tight">Medical Documents</h1>
            <Badge variant="primary" size="md">
              Ingestion & Verification
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Accepts prescriptions, laboratory panels, discharge summaries, and radiology reports. Preserves original originals permanently.
          </p>
        </div>

        <Button variant="secondary" size="md" icon={<UploadCloud className="w-4 h-4" />}>
          Upload Document
        </Button>
      </div>

      {selectedPatient ? (
        <div className="space-y-5">
          {/* Upload Dropzone Preview */}
          <Card className="border-2 border-dashed border-slate-300 hover:border-[#0d9488] transition-colors p-8 text-center cursor-pointer bg-slate-50/50">
            <div className="w-12 h-12 rounded-full bg-teal-50 text-[#0d9488] flex items-center justify-center mx-auto mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-slate-800 text-sm">
              Upload Medical Records for {selectedPatient.first_name} {selectedPatient.last_name}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Drag and drop PDF, JPG, JPEG, or PNG files here, or click to browse. Cryptographic SHA-256 duplicate detection is enabled.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="text-[10px] font-medium bg-slate-200/80 px-2 py-0.5 rounded text-slate-700">PDF</span>
              <span className="text-[10px] font-medium bg-slate-200/80 px-2 py-0.5 rounded text-slate-700">JPG</span>
              <span className="text-[10px] font-medium bg-slate-200/80 px-2 py-0.5 rounded text-slate-700">PNG</span>
              <span className="text-[10px] font-medium bg-teal-100 px-2 py-0.5 rounded text-teal-800">Max 25MB</span>
            </div>
          </Card>

          {/* Document Categories Info */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Prescriptions', count: 0 },
              { label: 'Lab Reports', count: 0 },
              { label: 'Discharge Summaries', count: 0 },
              { label: 'Consultation Notes', count: 0 },
              { label: 'Radiology & Scans', count: 0 },
              { label: 'Other Records', count: 0 },
            ].map((cat) => (
              <div key={cat.label} className="p-3 bg-white rounded-lg border border-slate-200 text-center">
                <p className="text-[11px] font-semibold text-slate-500">{cat.label}</p>
                <p className="text-lg font-bold text-[#0f2b48] mt-0.5">{cat.count}</p>
              </div>
            ))}
          </div>

          <Alert type="info" title="Traceability Guarantee">
            Do not trust filenames or user-selected categories as proof of contents. Document type is automatically confirmed via structured OCR text verification.
          </Alert>
        </div>
      ) : (
        <Alert type="warning" title="No Patient Selected">
          Please select a patient profile to view or upload medical documents.
        </Alert>
      )}
    </div>
  );
};
