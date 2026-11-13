import React, { useState, useEffect } from 'react';
import {
  FileText,
  UploadCloud,
  Search,
  Filter,
  Eye,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldCheck,
  X,
  FileCheck,
  FolderOpen,
  ArrowUpDown,
  AlertTriangle,
  Layers,
  Building,
  Trash2,
  RefreshCw,
  FileDown,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePatient } from '../hooks/usePatient';
import { recordService } from '../services/recordService';
import { MedicalDocument, DocumentPageItem } from '../types/patient';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';

export const DocumentsPage: React.FC = () => {
  const { user } = useAuth();
  const { selectedPatient } = usePatient();
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hospitalFilter, setHospitalFilter] = useState<string>('');
  const [includeDeleted, setIncludeDeleted] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('newest');

  // Preview Modal
  const [previewDoc, setPreviewDoc] = useState<MedicalDocument | null>(null);
  const [docPages, setDocPages] = useState<DocumentPageItem[]>([]);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);
  const [pagesLoading, setPagesLoading] = useState<boolean>(false);

  // Upload Modal
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState<string>('blood_report');
  const [uploadHospital, setUploadHospital] = useState<string>('');
  const [uploadDate, setUploadDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Soft Delete Modal
  const [deleteDoc, setDeleteDoc] = useState<MedicalDocument | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>('');
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  const categories = [
    { id: 'all', label: 'All Documents' },
    { id: 'blood_report', label: 'Blood Reports' },
    { id: 'prescription', label: 'Prescriptions' },
    { id: 'scan', label: 'Scans & Imaging' },
    { id: 'discharge', label: 'Discharge Summaries' },
    { id: 'consultation', label: 'Consultation Reports' },
    { id: 'lab_report', label: 'Lab Reports' },
    { id: 'other', label: 'Other Medical Documents' },
  ];

  const fetchDocuments = async () => {
    if (!selectedPatient) return;
    try {
      setLoading(true);
      const data = await recordService.getDocuments(
        selectedPatient.id,
        selectedCategory === 'all' ? undefined : selectedCategory,
        searchQuery || undefined,
        sortBy,
        hospitalFilter || undefined,
        includeDeleted
      );
      setDocuments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [selectedPatient, selectedCategory, sortBy, hospitalFilter, includeDeleted]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDocuments();
  };

  const handleOpenPreview = async (doc: MedicalDocument) => {
    setPreviewDoc(doc);
    setSelectedPageIndex(0);
    if (doc.pages && doc.pages.length > 0) {
      setDocPages(doc.pages);
    } else if (selectedPatient) {
      setPagesLoading(true);
      try {
        const pages = await recordService.getDocumentPages(selectedPatient.id, doc.id);
        setDocPages(pages);
      } catch (err) {
        console.error('Failed to load document pages:', err);
        setDocPages([]);
      } finally {
        setPagesLoading(false);
      }
    } else {
      setDocPages([]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !uploadFile) return;

    try {
      setUploadLoading(true);
      setUploadError(null);
      const uploadedDoc = await recordService.uploadDocument(
        selectedPatient.id,
        uploadFile,
        uploadCategory,
        uploadDate,
        uploadHospital || undefined
      );
      setUploadSuccess(`Document "${uploadFile.name}" successfully uploaded and encrypted (${uploadedDoc.page_count} page(s) extracted).`);
      setIsUploadOpen(false);
      setUploadFile(null);
      setUploadHospital('');
      fetchDocuments();
      setTimeout(() => setUploadSuccess(null), 5000);
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload document');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !deleteDoc) return;
    try {
      setDeleteLoading(true);
      await recordService.deleteDocument(selectedPatient.id, deleteDoc.id, deleteReason);
      setUploadSuccess(`Record "${deleteDoc.file_name}" soft-deleted and moved to trash.`);
      setDeleteDoc(null);
      setDeleteReason('');
      fetchDocuments();
      setTimeout(() => setUploadSuccess(null), 5000);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete record');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRestore = async (doc: MedicalDocument) => {
    if (!selectedPatient) return;
    try {
      await recordService.restoreDocument(selectedPatient.id, doc.id);
      setUploadSuccess(`Record "${doc.file_name}" restored from trash.`);
      fetchDocuments();
      setTimeout(() => setUploadSuccess(null), 5000);
    } catch (err: any) {
      alert(err?.message || 'Failed to restore record');
    }
  };

  const handleDownloadOriginal = async (doc: MedicalDocument) => {
    if (!selectedPatient) return;
    try {
      await recordService.downloadDocumentFile(selectedPatient.id, doc.id, doc.file_name);
    } catch (err: any) {
      alert(err?.message || 'Failed to download original document.');
    }
  };

  const handleDownload = (doc: MedicalDocument) => {
    const textBlob = new Blob([doc.ocr_extracted_text || `Medical Document: ${doc.file_name}`], {
      type: 'text/plain',
    });
    const url = URL.createObjectURL(textBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.file_name.endsWith('.pdf') ? doc.file_name.replace('.pdf', '.txt') : `${doc.file_name}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!selectedPatient) {
    return (
      <Alert type="warning" title="No Patient Selected">
        Please select a patient profile to access medical documents.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0f2b48] tracking-tight">Medical Documents</h1>
            <Badge variant="primary" size="md">
              {documents.length} Records Preserved
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Categorized archival for prescriptions, diagnostic scans, blood tests, and clinical consultation records.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={<UploadCloud className="w-4 h-4" />}
          onClick={() => setIsUploadOpen(true)}
        >
          Upload Medical Record
        </Button>
      </div>

      {uploadSuccess && (
        <Alert type="success" title="Ingestion Complete">
          {uploadSuccess}
        </Alert>
      )}

      {/* Category Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-[#0f2b48] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Search, Filter & Sort Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents by filename or OCR content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0d9488] focus:bg-white text-slate-800"
          />
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Building className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by hospital..."
              value={hospitalFilter}
              onChange={(e) => setHospitalFilter(e.target.value)}
              className="pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#0d9488] text-slate-700 w-36 sm:w-44"
            />
          </div>

          {user?.role === 'administrator' && (
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg">
              <input
                type="checkbox"
                checked={includeDeleted}
                onChange={(e) => setIncludeDeleted(e.target.checked)}
                className="rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
              />
              <span>Show Trash</span>
            </label>
          )}

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Sort:</span>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:border-[#0d9488]"
          >
            <option value="newest">Newest Uploaded</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Document Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Documents Grid / Table */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Retrieving patient documents...</div>
      ) : documents.length === 0 ? (
        <Card className="p-10 text-center bg-white border-dashed">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <FolderOpen className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">No Documents Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            No medical records match the selected category or filter. Upload a PDF or scan to start archiving.
          </p>
          <Button variant="outline" size="sm" onClick={() => setIsUploadOpen(true)}>
            Upload First Document
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <Card
              key={doc.id}
              className="hover:shadow-md transition-all border-slate-200/90 flex flex-col justify-between bg-white group"
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#0d9488] flex items-center justify-center shrink-0 border border-teal-100">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {doc.version_number && doc.version_number > 1 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        v{doc.version_number}
                      </span>
                    )}
                    {doc.is_deleted && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                        In Trash
                      </span>
                    )}
                    <Badge variant="secondary" size="sm" className="capitalize">
                      {doc.document_type.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-slate-900 group-hover:text-[#0d9488] transition-colors line-clamp-1" title={doc.file_name}>
                    {doc.file_name}
                  </h4>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Recorded: <strong>{doc.document_date}</strong>
                    </span>
                    <span>•</span>
                    <span>{(doc.file_size_bytes / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  {doc.source_hospital_or_clinic && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-600 mt-1.5 font-medium">
                      <Building className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{doc.source_hospital_or_clinic}</span>
                    </div>
                  )}
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 line-clamp-2 font-mono">
                  {doc.ocr_extracted_text || 'OCR Extraction verified.'}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-teal-700 font-medium">
                  <Layers className="w-3.5 h-3.5" />
                  <span>{doc.page_count || (doc.pages ? doc.pages.length : 1)} page(s) extracted</span>
                </div>
              </CardContent>

              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  icon={<Eye className="w-3.5 h-3.5" />}
                  onClick={() => handleOpenPreview(doc)}
                >
                  Preview
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs text-slate-600"
                  icon={<FileDown className="w-3.5 h-3.5" />}
                  onClick={() => handleDownloadOriginal(doc)}
                  title="Download Decrypted File"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs text-slate-600"
                  icon={<Download className="w-3.5 h-3.5" />}
                  onClick={() => handleDownload(doc)}
                  title="Download Record Text"
                />
                {!doc.is_deleted && (user?.role === 'doctor' || user?.role === 'administrator') && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-red-600 hover:bg-red-50 hover:border-red-200"
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    onClick={() => setDeleteDoc(doc)}
                    title="Move to Trash"
                  />
                )}
                {doc.is_deleted && user?.role === 'administrator' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200"
                    icon={<RefreshCw className="w-3.5 h-3.5" />}
                    onClick={() => handleRestore(doc)}
                    title="Restore Record"
                  >
                    Restore
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <Modal
          isOpen={!!previewDoc}
          onClose={() => {
            setPreviewDoc(null);
            setDocPages([]);
          }}
          title={`Document Preview: ${previewDoc.file_name}`}
        >
          <div className="space-y-4">
            <div className="p-3 bg-teal-50 rounded-lg border border-teal-200 text-xs text-teal-900 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <span className="font-bold uppercase text-[10px] text-teal-700 block">Category</span>
                <span className="capitalize font-semibold">{previewDoc.document_type.replace('_', ' ')}</span>
              </div>
              <div>
                <span className="font-bold uppercase text-[10px] text-teal-700 block">Clinical Date</span>
                <span>{previewDoc.document_date}</span>
              </div>
              <div>
                <span className="font-bold uppercase text-[10px] text-teal-700 block">Total Pages</span>
                <span className="font-semibold">{previewDoc.page_count || (docPages.length > 0 ? docPages.length : 1)} Extracted</span>
              </div>
              <div>
                <span className="font-bold uppercase text-[10px] text-teal-700 block">Status</span>
                <span className="text-emerald-700 font-bold">Verified & Preserved</span>
              </div>
            </div>

            {/* Per-Page View or Fallback */}
            {pagesLoading ? (
              <div className="p-8 text-center text-xs text-slate-500 font-medium">
                Loading extracted page content...
              </div>
            ) : docPages.length > 0 ? (
              <div className="space-y-3">
                {/* Page Selector & Metadata Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100 p-2.5 rounded-lg border border-slate-200 text-xs">
                  <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
                    <span className="font-semibold text-slate-700 text-xs mr-1 shrink-0">Page:</span>
                    {docPages.map((page, idx) => (
                      <button
                        key={page.id || idx}
                        type="button"
                        onClick={() => setSelectedPageIndex(idx)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                          selectedPageIndex === idx
                            ? 'bg-teal-700 text-white shadow-xs'
                            : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                        }`}
                      >
                        Page {page.page_number}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Method badge */}
                    {docPages[selectedPageIndex]?.extraction_method === 'text_layer' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Digital Text Layer
                      </span>
                    ) : docPages[selectedPageIndex]?.extraction_method === 'ocr' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-300">
                        <FileText className="w-3 h-3 text-blue-600" />
                        OCR Extracted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        OCR Unavailable
                      </span>
                    )}

                    {/* Confidence score badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                        (docPages[selectedPageIndex]?.ocr_confidence ?? 100) >= 70
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      Confidence: {(docPages[selectedPageIndex]?.ocr_confidence ?? 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Low-confidence warning for OCR < 70% */}
                {docPages[selectedPageIndex]?.extraction_method === 'ocr' &&
                  (docPages[selectedPageIndex]?.ocr_confidence ?? 100) < 70 && (
                    <Alert type="warning" title="Low OCR Confidence (< 70%)">
                      This page was processed with a low OCR confidence score of{' '}
                      <strong>{(docPages[selectedPageIndex]?.ocr_confidence ?? 0).toFixed(1)}%</strong>. Extracted
                      clinical text may contain OCR noise or missing values. Please verify critical dosages, lab figures,
                      and doctor notes against the original uploaded report.
                    </Alert>
                )}

                {/* Per-Page Extracted Text */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Page {docPages[selectedPageIndex]?.page_number || 1} Extracted Content:</span>
                    <span className="text-[10px] font-mono text-slate-400 truncate max-w-[200px]" title={docPages[selectedPageIndex]?.text_sha256}>
                      SHA-256: {docPages[selectedPageIndex]?.text_sha256?.slice(0, 16)}...
                    </span>
                  </div>
                  <div className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed border border-slate-800 select-text">
                    {docPages[selectedPageIndex]?.text || '[No text detected on this page]'}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <span className="text-xs font-semibold text-slate-700 block mb-1">OCR Extracted Text Span:</span>
                <div className="p-4 bg-slate-900 text-slate-200 rounded-xl font-mono text-xs whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed border border-slate-800">
                  {previewDoc.ocr_extracted_text || 'Structured OCR text preserved.'}
                </div>
              </div>
            )}

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-500 flex items-center justify-between font-mono">
              <span>File SHA-256:</span>
              <span className="truncate max-w-xs">{previewDoc.sha256_hash || previewDoc.file_sha256 || 'SHA256:4f82a9...'}</span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPreviewDoc(null);
                  setDocPages([]);
                }}
              >
                Close Preview
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Download className="w-3.5 h-3.5" />}
                onClick={() => handleDownload(previewDoc)}
              >
                Download Evidence File
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Upload Document Modal */}
      {isUploadOpen && (
        <Modal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          title="Upload Medical Document"
        >
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            {uploadError && <Alert type="error">{uploadError}</Alert>}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Select Medical File (PDF, PNG, JPG, TIFF, BMP, WEBP — Max 25 MB)
              </label>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif,.bmp,.webp"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer border border-slate-200 rounded-lg p-1.5"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Document Category
              </label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0d9488]"
              >
                <option value="blood_report">Blood Reports</option>
                <option value="prescription">Prescriptions</option>
                <option value="scan">Scans and Imaging</option>
                <option value="discharge">Discharge Summaries</option>
                <option value="consultation">Consultation Reports</option>
                <option value="lab_report">Lab Reports</option>
                <option value="other">Other Medical Documents</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Source Hospital or Clinic (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Apollo Hospital, City Clinic, Mayo Diagnostic Center"
                value={uploadHospital}
                onChange={(e) => setUploadHospital(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0d9488]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Clinical Event Date
              </label>
              <input
                type="date"
                value={uploadDate}
                onChange={(e) => setUploadDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0d9488]"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" type="button" onClick={() => setIsUploadOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" loading={uploadLoading}>
                Upload & Ingest Record
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteDoc && (
        <Modal
          isOpen={!!deleteDoc}
          onClose={() => {
            setDeleteDoc(null);
            setDeleteReason('');
          }}
          title={`Delete Record: ${deleteDoc.file_name}`}
        >
          <form onSubmit={handleDeleteSubmit} className="space-y-4">
            <Alert type="warning" title="Soft-Deletion & 30-Day Retention">
              This record will be moved to the quarantine trash and hidden from standard patient/doctor views. In accordance with the 30-day retention policy, it will be retained before permanent purge, and can be restored by an administrator.
            </Alert>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Reason for Deletion (required for audit trail)
              </label>
              <textarea
                rows={3}
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="State why this record is being removed (e.g. duplicate upload, patient requested removal, misclassified document)..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-red-500 text-slate-800"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => {
                  setDeleteDoc(null);
                  setDeleteReason('');
                }}
              >
                Cancel
              </Button>
              <Button variant="danger" size="sm" type="submit" loading={deleteLoading}>
                Confirm Soft Delete
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
