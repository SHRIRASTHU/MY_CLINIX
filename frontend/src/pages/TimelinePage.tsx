import React, { useState, useEffect } from 'react';
import {
  Clock,
  Filter,
  Calendar,
  FileText,
  CheckCircle2,
  Stethoscope,
  Pill,
  HeartPulse,
  FlaskConical,
  Activity,
  ArrowUpDown,
  ExternalLink,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { usePatient } from '../hooks/usePatient';
import { recordService } from '../services/recordService';
import { TimelineEvent, MedicalDocument } from '../types/patient';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { Modal } from '../components/ui/Modal';

export const TimelinePage: React.FC = () => {
  const { selectedPatient } = usePatient();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc'); // oldest to newest per requirement, toggleable

  // Associated Document Modal
  const [activeDoc, setActiveDoc] = useState<MedicalDocument | null>(null);

  const fetchTimeline = async () => {
    if (!selectedPatient) return;
    try {
      setLoading(true);
      const data = await recordService.getTimeline(
        selectedPatient.id,
        selectedCategory === 'all' ? undefined : selectedCategory,
        order
      );
      setEvents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, [selectedPatient, selectedCategory, order]);

  const handleOpenDoc = async (docId?: string, docName?: string) => {
    if (!docId && !docName) return;
    try {
      const docs = await recordService.getDocuments(selectedPatient!.id);
      const matched = docs.find((d) => d.id === docId || d.file_name === docName);
      if (matched) {
        setActiveDoc(matched);
      } else {
        alert(`Document "${docName || docId}" preserved in original file archive.`);
      }
    } catch (e) {
      alert(`Opening document citation: ${docName}`);
    }
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'consultation':
        return { label: 'Consultation', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Stethoscope };
      case 'condition':
        return { label: 'Diagnosis', color: 'bg-rose-100 text-rose-800 border-rose-200', icon: HeartPulse };
      case 'medication_event':
        return { label: 'Medication', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: Pill };
      case 'lab_investigation':
        return { label: 'Laboratory Test', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: FlaskConical };
      case 'scan':
        return { label: 'Imaging Scan', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Activity };
      case 'admission':
      case 'discharge':
        return { label: 'Hospital Care', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock };
      default:
        return { label: 'Clinical Event', color: 'bg-slate-100 text-slate-800 border-slate-200', icon: FileText };
    }
  };

  if (!selectedPatient) {
    return (
      <Alert type="warning" title="No Patient Selected">
        Please select a patient profile to view their chronological medical timeline.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0f2b48] tracking-tight">Medical Timeline</h1>
            <Badge variant="primary" size="md">
              Chronological & Evidentiary
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Reconstructed chronological sequence sorted by real event date. Links every milestone to its original document.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<ArrowUpDown className="w-3.5 h-3.5" />}
            onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')}
          >
            {order === 'asc' ? 'Oldest to Newest' : 'Newest First'}
          </Button>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'all', label: 'All Events' },
          { id: 'consultation', label: 'Consultations' },
          { id: 'medication_event', label: 'Prescriptions' },
          { id: 'lab_investigation', label: 'Lab Tests' },
          { id: 'scan', label: 'Imaging Scans' },
          { id: 'discharge', label: 'Discharges' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setSelectedCategory(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === f.id
                ? 'bg-[#0f2b48] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline Stream */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading chronological timeline...</div>
      ) : events.length === 0 ? (
        <Card className="p-10 text-center bg-white">
          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-500">No medical events found for this filter.</p>
        </Card>
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:inset-0 before:left-3 sm:before:left-4 before:w-0.5 before:bg-slate-200">
          {events.map((ev, index) => {
            const badge = getEventBadge(ev.event_type);
            const Icon = badge.icon;
            const isLatest = order === 'desc' ? index === 0 : index === events.length - 1;

            return (
              <div key={ev.id} className="relative group">
                {/* Node marker */}
                <div
                  className={`absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center z-10 transition-transform group-hover:scale-110 shadow-xs ${
                    isLatest
                      ? 'bg-[#0d9488] border-teal-200 text-white'
                      : 'bg-white border-slate-300 text-slate-600'
                  }`}
                >
                  <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                </div>

                {/* Event Card */}
                <Card className={`p-4 bg-white transition-all hover:shadow-md ${isLatest ? 'border-teal-300 ring-1 ring-teal-200' : 'border-slate-200'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${badge.color}`}>
                        {badge.label}
                      </span>
                      {isLatest && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                          Latest Event
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Event Date:</span>
                      <strong className="text-slate-800 font-mono">{ev.event_date}</strong>
                    </div>
                  </div>

                  <h3 className="font-bold text-sm text-[#0f2b48] mb-1">{ev.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-3">{ev.description}</p>

                  {/* Document Citation Footer */}
                  {ev.document_name && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <span className="flex items-center gap-1.5 text-slate-500 text-[11px] truncate max-w-md">
                        <FileText className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>Source: <strong className="text-slate-700">{ev.document_name}</strong></span>
                      </span>

                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[11px] py-1 px-2.5"
                        icon={<Eye className="w-3 h-3" />}
                        onClick={() => handleOpenDoc(ev.document_id, ev.document_name)}
                      >
                        Inspect Document
                      </Button>
                    </div>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* Document Inspection Modal */}
      {activeDoc && (
        <Modal
          isOpen={!!activeDoc}
          onClose={() => setActiveDoc(null)}
          title={`Source Record: ${activeDoc.file_name}`}
        >
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-teal-50 rounded-lg border border-teal-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-teal-700 block">Category</span>
                <span className="capitalize font-semibold">{activeDoc.document_type.replace('_', ' ')}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-teal-700 block">Event Date</span>
                <span>{activeDoc.document_date}</span>
              </div>
            </div>

            <div>
              <span className="font-bold text-slate-700 block mb-1">OCR Extracted Passage:</span>
              <div className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-xs whitespace-pre-wrap max-h-60 overflow-y-auto">
                {activeDoc.ocr_extracted_text || 'Structured OCR text preserved.'}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setActiveDoc(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
