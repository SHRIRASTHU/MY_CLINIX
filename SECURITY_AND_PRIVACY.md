# MY CLINIX Security & Privacy Architecture

This document provides a factual, code-accurate technical specification of the security, privacy, data governance, and cryptographic implementations within MY CLINIX. It reflects the live implementation across the FastAPI backend and React/TypeScript frontend.

---

## 1. Threat Model & Security Objectives

MY CLINIX is designed to solve the "One Patient, Many Records" problem by consolidating disparate medical documents (prescriptions, diagnostic blood tests, scans, discharge summaries, and consultation reports) across hospitals and clinics into a single patient-centric platform.

### Primary Security Objectives:
1. **Patient Data Isolation:** Zero unauthorized cross-patient data access.
2. **Confidentiality at Rest & in Transit:** AES-256-GCM authenticated encryption for stored medical artifacts and TLS for all data in transit.
3. **Traceability & Non-Repudiation:** Cryptographic SHA-256 evidence hashing per document and per extracted page with immutable security audit logging.
4. **Patient-Governed Consent:** Explicit patient authorization required for doctor access, with immediate revocation capability.
5. **GDPR Alignment:** Built-in data portability (Article 20), right to erasure with retention quarantine (Article 17), and data minimization (Article 5).

---

## 2. Cryptographic Storage & Encryption at Rest

### 2.1 Encryption Algorithm
- **Cipher:** AES-256-GCM (Galois/Counter Mode) via Python `cryptography` library (`AESGCM`).
- **Key Length:** 256 bits (32 bytes).
- **Initialization Vector / Nonce:** 12 bytes cryptographically secure random bytes (`os.urandom(12)`) generated uniquely per file write.
- **Authentication Tag:** 16 bytes (128-bit MAC tag generated automatically by AES-GCM).

### 2.2 Ciphertext On-Disk Structure
All encrypted files are stored on disk with the `.enc` extension using the following byte structure:
```
+-------------------+------------------------------------------+-----------------------+
|  Nonce (12 Bytes) |         Ciphertext (N Bytes)             |  GCM Tag (16 Bytes)   |
+-------------------+------------------------------------------+-----------------------+
```

### 2.3 Storage Architecture (`app.services.storage_service`)
- `StorageBackend` abstraction defines `save(content, filename)` and `load(stored_name)`.
- `LocalEncryptedStorageBackend` handles encryption before writing to disk and decryption upon reading.
- Fallback: If `DOCUMENT_ENCRYPTION_KEY` is omitted, `LocalPlaintextStorageBackend` operates with explicit security warnings.
- Backward Compatibility: When loading existing documents created prior to encryption configuration, the loader detects unencrypted formats and serves them without corruption.

### 2.4 Prevention of Filesystem Path Disclosure
- Raw filesystem paths (`file_path`, `stored_path`) are strictly omitted from all client-facing API responses.
- File downloads occur exclusively through the authenticated streaming endpoint:
  `GET /api/v1/records/patients/{patient_id}/documents/{document_id}/download`
- Streams decrypted bytes with `Content-Disposition: attachment; filename="..."` and proper MIME types.

---

## 3. Role-Based Access Control (RBAC) & Patient-Controlled Consent

### 3.1 Strict 3-Role Hierarchy
The platform strictly enforces exactly three user roles:
- `patient`: Can access and manage only their own health records, download data portability exports, and grant/revoke doctor consent.
- `doctor`: Can view, search, and upload clinical documents only for patients who have granted active consent.
- `administrator`: Can view platform metrics, manage user verification, query immutable security audit logs, and restore documents from the soft-deletion trash.
*(No unverified roles such as `caregiver` or `medical_reviewer` exist in the system).*

### 3.2 Patient-Controlled Doctor Consent
- Model: `ConsentRecord` (`backend/app/models/consent.py`).
- Endpoints:
  - `GET /api/v1/consent/doctors`: Directory of verified licensed doctors.
  - `GET /api/v1/consent/patients/{patient_id}/consent`: Retrieve active and historical authorizations.
  - `POST /api/v1/consent/patients/{patient_id}/consent/grant`: Authorize a doctor with granular access level (`read_only`, `read_write`, `full`) and document scope.
  - `POST /api/v1/consent/patients/{patient_id}/consent/revoke/{doctor_id}`: Immediately terminate access with an audited reason.

---

## 4. Evidentiary Traceability & Document Ingestion

### 4.1 Evidentiary Integrity Pipeline
1. **Document File Hash:** SHA-256 computed on the original raw uploaded bytes prior to storage.
2. **Text Layer First Ingestion:** PDF digital text layer extracted via PyMuPDF (`fitz`).
3. **Optical Character Recognition (OCR):** Tesseract OCR applied to scanned pages and images (`.png`, `.jpg`, `.jpeg`, `.tiff`, `.bmp`, `.webp`).
4. **Per-Page Cryptographic Hash:** SHA-256 computed on the extracted text of every individual page (`text_sha256`).
5. **OCR Confidence Score:** Maintained per page (0.0% to 100.0%) to flag low-confidence text (< 70%) for clinical review.

### 4.2 Multi-Hospital Consolidation & Versioning
- `source_hospital_or_clinic` metadata tag enables filtering across different healthcare providers (e.g. Apollo, City Clinic, Mayo Lab).
- When a new document with an existing filename is uploaded for a patient, the system assigns an incremented `version_number` (e.g., `v2`, `v3`) rather than overwriting historical evidence.

---

## 5. Security Audit Logging & Anti-Tamper Mechanisms

### 5.1 Immutable Audit Log Model (`backend/app/models/audit.py`)
Audit records are permanently preserved in the `audit_logs` table with:
- `id`: Unique UUIDv4.
- `actor_id` & `actor_role`: Identity and privilege tier of the performing user.
- `patient_id` & `document_id`: Target entity context.
- `action`: Specific security-relevant event (`login_success`, `login_failed`, `login_rate_limited`, `document_access`, `document_upload`, `document_download`, `document_delete_request`, `document_restore`, `consent_grant`, `consent_revoke`, `patient_data_export`).
- `outcome`: `success`, `failure`, or `denied`.
- `request_ip`: Source IP address.
- `user_agent_hash`: First 16 characters of SHA-256 over `User-Agent` header for privacy-preserving client tracking.
- `extra_context`: JSON metadata (excluding sensitive credentials or raw PII).
- `created_at`: UTC timestamp.

### 5.2 Fail-Safe Execution
The audit service (`app.services.audit_service.log_event`) runs in an isolated try/except block. Audit write failures are logged to stderr but never crash business transactions.

---

## 6. PII Protection & Authentication Rate Limiting

### 6.1 Authentication Hardening
- **Sliding-Window Rate Limiter:** An in-memory rate limiter in `backend/app/api/v1/endpoints/auth.py` restricts login attempts to **10 requests per 15-minute sliding window** per client IP.
- Rate limit violations trigger HTTP 429 and emit a `login_rate_limited` audit event.
- Passwords are encrypted using bcrypt hashing (`passlib.context.CryptContext`).

### 6.2 PII Protection in Error Responses
- Authentication and authorization failures emit generic error messages (`"Incorrect email or password"` or `"Not authorized to access this patient profile"`).
- Internal database schema details, file system paths, and raw credentials are never reflected in error bodies.

---

## 7. GDPR & Privacy Alignment

| GDPR Article | Platform Implementation | Verification / Endpoint |
|---|---|---|
| **Article 5 (Data Minimization)** | File paths suppressed; audit logs use hashed user-agent; PII scrubbed from errors. | Automated security test suite (`test_security.py`) |
| **Article 15 (Right of Access)** | Patients view full metadata, extraction text, confidence, and audit history. | `GET /patients/{id}/documents` & UI preview |
| **Article 17 (Right to Erasure / Retention)** | Soft-deletion marks records with deletion reason; quarantined for 30 days before purge. | `DELETE /patients/{id}/documents/{doc_id}` |
| **Article 20 (Right to Data Portability)** | Single-click export of complete demographic and clinical history in structured JSON. | `GET /patients/{id}/export` & Settings UI |
| **Article 32 (Security of Processing)** | AES-256-GCM encryption at rest; SHA-256 evidentiary integrity hashing; RBAC. | `LocalEncryptedStorageBackend` |

---

## 8. Data Retention & Soft-Deletion Lifecycle

```
[ Upload Record ]
       │
       ▼
[ Active State ]  ◄───────────────────────────────┐
       │                                          │
       │ (DELETE /records/patients/.../documents)  │ (Admin Restore)
       ▼                                          │
[ Quarantined in Trash ] ─────────────────────────┘
  • is_deleted = True
  • deleted_at = UTC Timestamp
  • deleted_by_id = User ID
  • deletion_reason = Stated Reason
  • Retained for 30 Days (TRASH_RETENTION_DAYS)
       │
       ▼ (Scheduled Purge / Future Worker)
[ Permanent Disk Shredding ]
```

---

## 9. Production Hardening Roadmap & Remaining Technical Debt

1. **Database Migration to Managed PostgreSQL:** The current configuration operates on SQLite (`myclinix.db`). For concurrent enterprise deployments, migrate to managed PostgreSQL with Row-Level Security (RLS).
2. **KMS / HSM Integration:** Replace environment variable `DOCUMENT_ENCRYPTION_KEY` with an external Key Management Service (AWS KMS, GCP Cloud KMS, or HashiCorp Vault) supporting automated key rotation.
3. **Distributed Rate Limiting:** Transition the in-memory sliding window rate limiter in `auth.py` to a distributed Redis cluster for multi-instance deployments.
4. **Malware / Virus Scanning:** Add ClamAV or equivalent asynchronous scanning pipeline during document ingestion before AES-256-GCM encryption.
5. **Periodic Trash Purge Cron:** Schedule automated hard-deletion of quarantined records older than `TRASH_RETENTION_DAYS` (30 days).
