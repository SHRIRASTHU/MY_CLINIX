# MY CLINIX – One Patient, Many Records

> **Evidentiary Clinical Record Intelligence Platform**  
> *"Every medical finding must be traceable to its original source."*

---

## 1. Executive Overview

**MY CLINIX** addresses the systemic problem of fragmented medical records. Patients routinely accumulate diagnostic notes, laboratory test results, handwritten/printed prescriptions, discharge summaries, and scan reports scattered across multiple clinics and hospital systems.

MY CLINIX reconciles these disparate documents into an immutable, chronological, searchable, and verifiable medical history.

### Core Guarantees:
- **Zero Hallucination / Strict Traceability:** Every extracted finding links directly to its source document, specific page number, and exact extracted text span.
- **Contradiction Detection:** Opposing clinical claims (e.g. conflicting allergy records, differing lab values) are displayed side-by-side with original sources rather than silently merged.
- **Strict Absence Principle:** Distinguishes between explicit positive findings, explicit negative assertions (*"No known drug allergies"*), and undocumented entries (*"Not documented in this record"*).
- **Medication Lifecycle Integrity:** Older prescriptions are not assumed active, and newer prescriptions do not automatically imply older therapies were discontinued without explicit evidence.
- **Human-in-the-Loop Audit Trail:** Reviewer corrections are preserved in an append-only audit log without ever overwriting raw source documents or AI extraction logs.
- **Never Diagnoses:** The system never provides medical diagnoses or treatment recommendations.

---

## 2. Technology Stack

### Frontend
- **Framework:** React 19 (TypeScript)
- **Tooling:** Vite 8
- **Styling:** Tailwind CSS v4, custom clinical palette (Deep Navy `#0f2b48`, Clinical Teal `#0d9488`, Slate `#f8fafc`)
- **Icons:** Lucide React
- **Data Visualization:** Recharts
- **Routing:** React Router v7

### Backend
- **Framework:** FastAPI (Python 3.14)
- **ORM / Migrations:** SQLAlchemy 2.0 & Alembic
- **Validation:** Pydantic v2 & `email-validator`
- **Authentication:** Bcrypt password hashing & JWT (`python-jose`)
- **Database:** PostgreSQL 16 (production/Docker) & SQLite (zero-config local dev/testing)
- **Document Intelligence:** PyMuPDF (`fitz`), OpenAI API (structured JSON output)
- **Testing:** Pytest & HTTPX TestClient

---

## 3. Project Structure

```
MY CLINIX/
├── backend/
│   ├── alembic/              # Database migration scripts
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py       # JWT auth & patient isolation guards
│   │   │   └── v1/
│   │   │       ├── api.py    # Route aggregation
│   │   │       └── endpoints/# health, auth, patients
│   │   ├── core/             # config.py, security.py (bcrypt & JWT)
│   │   ├── database/         # session.py, base.py, seed.py
│   │   ├── models/           # user, patient, records, audit, chat
│   │   ├── schemas/          # pydantic request/response schemas
│   │   └── main.py           # FastAPI app entrypoint
│   ├── tests/                # pytest suite (health, auth, patient isolation)
│   ├── requirements.txt      # Python dependencies
│   └── pytest.ini
├── frontend/
│   ├── src/
│   │   ├── components/       # UI library (Button, Input, Modal, Badge, Card, Alert, Spinner)
│   │   ├── hooks/            # useAuth, usePatient (scoped context)
│   │   ├── layouts/          # MainLayout (12 sidebar items & top nav)
│   │   ├── pages/            # 12 navigation module views & login/register
│   │   ├── services/         # apiClient, authService, patientService
│   │   ├── types/            # auth, patient TypeScript interfaces
│   │   └── App.tsx           # Route configuration
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── data/
│   └── synthetic_patients/   # Synthetic hackathon evaluation fixtures
├── docs/                     # Specifications and architectural documentation
├── docker-compose.yml        # PostgreSQL 16 container definition
├── .env.example              # Secrets and configuration template
└── README.md
```

---

## 4. Database Schema (Normalized)

All tables utilize **UUID primary keys** with foreign keys, timestamps, and indexes:

| Table | Purpose |
|---|---|
| `users` | User accounts, credentials, and roles (`administrator`, `patient`, `caregiver`, `medical_reviewer`). |
| `patients` | Patient demographic, vital baseline, and creator reference. |
| `patient_access` | Row-level data isolation mapping users to patient profiles with permission levels (`owner`, `caregiver`, `reviewer`, `viewer`). |
| `documents` | Preserved original files, cryptographic SHA-256 hashes, OCR text, and processing statuses. |
| `extracted_findings` | Atomic medical findings with exact source text spans, page numbers, precision, and confidence. |
| `medical_events` | Chronological timeline events distinct from document upload dates. |
| `medications` | Drug regimens with start, change, discontinuation evidence, and dosage history. |
| `allergies` | Allergens, reactions, and explicit polarities (`explicit_positive`, `explicit_negative`, `unclear`). |
| `investigations` | Laboratory test results with original units and abnormal reference flags. |
| `contradictions` | Conflicting assertions between two documents awaiting human resolution. |
| `duplicates` | Cryptographic SHA-256 and semantic duplicate detection relationships. |
| `review_history` | Append-only audit log tracking reviewer corrections, timestamps, and reasons. |
| `chat_history` | Evidentiary AI queries, answers, and cited document references. |

---

## 5. Quickstart & Execution

### Prerequisites
- Python 3.10+ (Tested on Python 3.14)
- Node.js 18+ (Tested on Node.js v24)
- Docker (optional for PostgreSQL container)

### Step 1: Environment Setup
```powershell
# Copy environment configuration
Copy-Item .env.example .env
```

### Step 2: Backend Setup
```powershell
# Activate Python virtual environment
cd backend
.\.venv\Scripts\Activate.ps1

# Install dependencies (already installed in workspace)
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Seed initial demonstration accounts
python app/database/seed.py

# Run FastAPI backend server (port 8000)
uvicorn app.main:app --reload --port 8000
```

The interactive API documentation is accessible at:
- Swagger UI: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/v1/health`

### Step 3: Frontend Setup
```powershell
# In a separate terminal
cd frontend

# Install dependencies (already completed)
npm install

# Start Vite development server (port 5173)
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 6. Demonstration Accounts

The database seed provides four pre-configured roles with password `DemoPass123!`:

| Role | Email | Capabilities |
|---|---|---|
| **Administrator** | `admin@myclinix.org` | Global system audit, cross-patient access, user governance. |
| **Medical Reviewer** | `reviewer@myclinix.org` | Audit extracted findings, resolve contradictions, flag inaccuracies. |
| **Caregiver** | `caregiver@myclinix.org` | Manage authorized family member records and upload clinical notes. |
| **Patient** | `patient@myclinix.org` | Primary profile owner with access to Arthur Vance's records. |

---

## 7. Automated Test Suite

Run the backend test suite:
```powershell
cd backend
.\.venv\Scripts\pytest.exe -v
```

Tests verify:
- Health check and DB connectivity ping.
- User registration and duplicate prevention.
- JWT authentication and profile retrieval.
- Multi-patient management and CRUD operations.
- **Strict Patient Isolation:** Users cannot access or enumerate records of unshared patients (HTTP 403 Forbidden).
- Access delegation and role-based action enforcement.
