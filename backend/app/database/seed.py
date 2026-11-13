import sys
import hashlib
from pathlib import Path
from datetime import datetime, timezone

# Add backend directory to path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BASE_DIR))

from app.database.session import SessionLocal, init_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.patient_access import PatientAccess, AccessLevel
from app.models.records import (
    Document,
    ExtractedFinding,
    MedicalEvent,
    Medication,
    Allergy,
    Investigation,
    Contradiction,
)
from app.core.security import hash_password

def seed_database():
    """Seed comprehensive clinical data for MY CLINIX with multi-country normalization."""
    db = SessionLocal()
    try:
        demo_users = [
            {
                "email": "admin@myclinix.org",
                "full_name": "System Administrator",
                "role": UserRole.ADMIN.value,
                "password": "DemoPass123!",
                "is_verified": True,
            },
            {
                "email": "doctor@myclinix.org",
                "full_name": "Dr. Sarah Lin (Lead Physician)",
                "role": UserRole.DOCTOR.value,
                "password": "DemoPass123!",
                "is_verified": True,
            },
            {
                "email": "patient@myclinix.org",
                "full_name": "Arthur Vance",
                "role": UserRole.PATIENT.value,
                "password": "DemoPass123!",
                "is_verified": True,
            },
        ]

        created_users = {}
        for u in demo_users:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if not existing:
                user = User(
                    email=u["email"],
                    full_name=u["full_name"],
                    role=u["role"],
                    hashed_password=hash_password(u["password"]),
                    is_active=True,
                    is_verified=u["is_verified"],
                )
                db.add(user)
                db.flush()
                created_users[u["email"]] = user
                print(f"[SEED] Created user: {u['email']} ({u['role']})")
            else:
                existing.role = u["role"]
                existing.full_name = u["full_name"]
                existing.is_verified = u["is_verified"]
                created_users[u["email"]] = existing
                print(f"[SEED] User updated: {u['email']} ({u['role']})")

        patient_user = created_users.get("patient@myclinix.org")
        doctor_user = created_users.get("doctor@myclinix.org")

        if patient_user:
            patient = db.query(Patient).filter(
                Patient.first_name == "Arthur",
                Patient.last_name == "Vance"
            ).first()

            if not patient:
                patient = Patient(
                    first_name="Arthur",
                    last_name="Vance",
                    date_of_birth="1956-07-14",
                    gender="male",
                    blood_group="O+",
                    emergency_contact_name="David Vance (Son)",
                    emergency_contact_phone="+1-555-0144",
                    medical_notes="History of Essential Hypertension, Type 2 Diabetes Mellitus, and Mild Chronic Kidney Disease (Stage 2). Under stable combined therapy across multi-country clinical record provenance.",
                    created_by_id=patient_user.id,
                )
                db.add(patient)
                db.flush()

                db.add(PatientAccess(
                    patient_id=patient.id,
                    user_id=patient_user.id,
                    access_level=AccessLevel.OWNER
                ))

                if doctor_user:
                    db.add(PatientAccess(
                        patient_id=patient.id,
                        user_id=doctor_user.id,
                        access_level=AccessLevel.DOCTOR
                    ))

                print(f"[SEED] Created sample patient: Arthur Vance (ID: {patient.id})")
            else:
                if doctor_user:
                    doc_acc = db.query(PatientAccess).filter(
                        PatientAccess.patient_id == patient.id,
                        PatientAccess.user_id == doctor_user.id
                    ).first()
                    if not doc_acc:
                        db.add(PatientAccess(
                            patient_id=patient.id,
                            user_id=doctor_user.id,
                            access_level=AccessLevel.DOCTOR
                        ))

            # Seed Documents if empty
            if db.query(Document).filter(Document.patient_id == patient.id).count() == 0:
                docs_meta = [
                    {
                        "file_name": "Cardiology_Discharge_Summary_CityHospital.pdf",
                        "document_type": "discharge",
                        "document_date": "2024-03-12",
                        "size": 1845200,
                        "ocr": "CITY HOSPITAL CARDIOLOGY DEPARTMENT\nPatient: Arthur Vance (DOB: 1956-07-14)\nDiagnosis: Essential Hypertension, Dyslipidemia.\nDischarge BP: 138/88 mmHg. Started on Lisinopril 10mg daily.",
                    },
                    {
                        "file_name": "Endocrinology_Consult_Prescription.pdf",
                        "document_type": "prescription",
                        "document_date": "2025-01-20",
                        "size": 945200,
                        "ocr": "ENDOCRINOLOGY CLINICAL NOTE\nPrescription: Metformin HCl 500mg Extended Release, Oral Tablet. Sig: 1 tab PO BID with meals. Duration: 180 days.",
                    },
                    {
                        "file_name": "Comprehensive_Metabolic_Panel_LabReport.pdf",
                        "document_type": "lab_report",
                        "document_date": "2025-06-15",
                        "size": 1245000,
                        "ocr": "REGIONAL PATHOLOGY LABS\nHbA1c: 7.4% (Elevated)\nSerum Creatinine: 1.28 mg/dL (Reference: 0.7 - 1.2 mg/dL)\neGFR: 68 mL/min/1.73m2\nFasting Blood Sugar: 122 mg/dL",
                    },
                    {
                        "file_name": "Renal_Ultrasound_Imaging_Report.pdf",
                        "document_type": "scan",
                        "document_date": "2025-09-10",
                        "size": 3420100,
                        "ocr": "DIAGNOSTIC RADIOLOGY\nProcedure: Bilateral Renal Ultrasound with Doppler.\nFindings: Kidneys normal in size and cortical echogenicity. No hydronephrosis or renal artery stenosis.",
                    },
                    {
                        "file_name": "Primary_Care_Progress_Note.pdf",
                        "document_type": "consultation",
                        "document_date": "2026-04-18",
                        "size": 845000,
                        "ocr": "PRIMARY CARE PROGRESS NOTE\nBlood pressure controlled at 128/82 mmHg under Lisinopril 20mg daily. Hydrochlorothiazide 25mg discontinued due to mild hypokalemia.",
                    },
                    {
                        "file_name": "Latest_Hematology_Blood_Panel.pdf",
                        "document_type": "blood_report",
                        "document_date": "2026-10-25",
                        "size": 1120000,
                        "ocr": "METRO HEALTH HEMATOLOGY & METABOLIC PANEL\nHbA1c: 6.8% (Target Attained)\nSerum Creatinine: 1.18 mg/dL (Stable)\nTotal Cholesterol: 168 mg/dL\nLDL: 88 mg/dL\nBlood Group: O Positive",
                    },
                ]

                seeded_docs = []
                for d in docs_meta:
                    sha = hashlib.sha256(f"{d['file_name']}_{patient.id}".encode()).hexdigest()
                    doc_obj = Document(
                        patient_id=patient.id,
                        uploader_id=patient_user.id,
                        file_name=d["file_name"],
                        file_path=f"uploads/{d['file_name']}",
                        file_size_bytes=d["size"],
                        mime_type="application/pdf",
                        sha256_hash=sha,
                        document_type=d["document_type"],
                        document_date=d["document_date"],
                        processing_status="completed",
                        ocr_extracted_text=d["ocr"],
                        page_count=2,
                    )
                    db.add(doc_obj)
                    db.flush()
                    seeded_docs.append(doc_obj)

                # Seed Timeline Events
                events_meta = [
                    {"type": "discharge", "title": "Inpatient Hospital Discharge", "desc": "Discharged from City Hospital Cardiology with initial diagnosis of Essential Hypertension.", "date": "2024-03-12", "doc_idx": 0},
                    {"type": "medication_event", "title": "Initiation of Metformin Therapy", "desc": "Prescribed Metformin ER 500mg BID for newly confirmed Type 2 Diabetes Mellitus.", "date": "2025-01-20", "doc_idx": 1},
                    {"type": "lab_investigation", "title": "Metabolic and Renal Baseline Labs", "desc": "Demonstrated HbA1c 7.4% and baseline serum creatinine 1.28 mg/dL.", "date": "2025-06-15", "doc_idx": 2},
                    {"type": "scan", "title": "Bilateral Renal Ultrasound Doppler", "desc": "Normal kidney dimensions with patent renal vasculature, excluding renovascular hypertension.", "date": "2025-09-10", "doc_idx": 3},
                    {"type": "consultation", "title": "Outpatient Primary Care Review", "desc": "Lisinopril increased to 20mg daily; Hydrochlorothiazide discontinued.", "date": "2026-04-18", "doc_idx": 4},
                    {"type": "lab_investigation", "title": "Latest Comprehensive Blood Chemistry", "desc": "Improved HbA1c to 6.8% and stabilized creatinine at 1.18 mg/dL.", "date": "2026-10-25", "doc_idx": 5},
                ]

                for em in events_meta:
                    db.add(MedicalEvent(
                        patient_id=patient.id,
                        document_id=seeded_docs[em["doc_idx"]].id,
                        event_type=em["type"],
                        title=em["title"],
                        description=em["desc"],
                        event_date=em["date"],
                        verification_status="verified",
                    ))

                # Seed Medications
                meds_meta = [
                    {"name": "Lisinopril", "dose": "20 mg Oral Tablet", "freq": "Once daily (Morning)", "route": "Oral", "status": "current", "start": "2024-03-12", "doc_idx": 4},
                    {"name": "Metformin HCl ER", "dose": "500 mg Extended Release", "freq": "Twice daily with meals", "route": "Oral", "status": "current", "start": "2025-01-20", "doc_idx": 1},
                    {"name": "Atorvastatin Calcium", "dose": "20 mg Oral Tablet", "freq": "Once daily at bedtime", "route": "Oral", "status": "current", "start": "2024-03-12", "doc_idx": 0},
                    {"name": "Hydrochlorothiazide", "dose": "25 mg Oral Tablet", "freq": "Once daily", "route": "Oral", "status": "explicitly_discontinued", "start": "2024-03-12", "stop": "2026-04-18", "disc": "Discontinued per Primary Care Consult due to mild hypokalemia.", "doc_idx": 4},
                ]

                for mm in meds_meta:
                    db.add(Medication(
                        patient_id=patient.id,
                        document_id=seeded_docs[mm["doc_idx"]].id,
                        medicine_name=mm["name"],
                        dosage=mm["dose"],
                        frequency=mm["freq"],
                        route=mm["route"],
                        status=mm["status"],
                        start_date=mm["start"],
                        stop_date=mm.get("stop"),
                        discontinuation_evidence=mm.get("disc"),
                    ))

                # Seed Extracted Findings (Conditions)
                findings_meta = [
                    {"name": "Essential Hypertension", "val": "Primary hypertension under Lisinopril therapy", "text": "Essential Hypertension confirmed on repeat auscultation.", "doc_idx": 0},
                    {"name": "Type 2 Diabetes Mellitus", "val": "Controlled under oral antihyperglycemic regimen", "text": "Diagnosed Type 2 Diabetes Mellitus; HbA1c 6.8%.", "doc_idx": 1},
                    {"name": "Chronic Kidney Disease Stage 2", "val": "Mild stable renal impairment with eGFR 68-72 mL/min", "text": "Mild Chronic Kidney Disease Stage 2, stable serum creatinine.", "doc_idx": 2},
                ]

                for fm in findings_meta:
                    db.add(ExtractedFinding(
                        patient_id=patient.id,
                        document_id=seeded_docs[fm["doc_idx"]].id,
                        finding_category="condition",
                        entity_name=fm["name"],
                        extracted_value=fm["val"],
                        original_extracted_text=fm["text"],
                        source_page_number=1,
                        event_date="2024-03-12",
                        extraction_confidence=0.98,
                        verification_status="confirmed",
                        polarity="positive",
                    ))

                # Seed Allergies
                db.add(Allergy(
                    patient_id=patient.id,
                    document_id=seeded_docs[0].id,
                    allergen="Penicillin G / Amoxicillin",
                    reaction="None - Explicit negative recorded",
                    severity="None",
                    status="explicit_negative",
                    recorded_date="2024-03-12",
                ))

                db.add(Allergy(
                    patient_id=patient.id,
                    document_id=seeded_docs[4].id,
                    allergen="Sulfonamides (Sulfa drugs)",
                    reaction="Urticarial rash and mild pruritus",
                    severity="Moderate",
                    status="explicit_positive",
                    recorded_date="2026-04-18",
                ))

                # Seed Diagnostic Investigations
                invs_meta = [
                    {"name": "Haemoglobin (Hb)", "val": "13.5", "unit": "g/dL", "range": "13.0 - 17.0 g/dL", "flag": "NORMAL", "date": "2026-10-25", "doc_idx": 5},
                    {"name": "HbA1c (Glycated Hemoglobin)", "val": "6.8", "unit": "%", "range": "4.0 - 5.6%", "flag": "HIGH", "date": "2026-10-25", "doc_idx": 5},
                    {"name": "Serum Creatinine", "val": "1.18", "unit": "mg/dL", "range": "0.70 - 1.20 mg/dL", "flag": "NORMAL", "date": "2026-10-25", "doc_idx": 5},
                    {"name": "Estimated GFR (CKD-EPI)", "val": "72", "unit": "mL/min/1.73m2", "range": "> 60 mL/min", "flag": "NORMAL", "date": "2026-10-25", "doc_idx": 5},
                    {"name": "Fasting Plasma Glucose", "val": "108", "unit": "mg/dL", "range": "70 - 99 mg/dL", "flag": "HIGH", "date": "2026-10-25", "doc_idx": 5},
                    {"name": "Total Serum Cholesterol", "val": "168", "unit": "mg/dL", "range": "< 200 mg/dL", "flag": "NORMAL", "date": "2026-10-25", "doc_idx": 5},
                    {"name": "LDL Calculated Cholesterol", "val": "88", "unit": "mg/dL", "range": "< 100 mg/dL", "flag": "NORMAL", "date": "2026-10-25", "doc_idx": 5},
                ]

                for im in invs_meta:
                    db.add(Investigation(
                        patient_id=patient.id,
                        document_id=seeded_docs[im["doc_idx"]].id,
                        test_name=im["name"],
                        result_value=im["val"],
                        original_unit=im["unit"],
                        reference_range=im["range"],
                        abnormal_flag=im["flag"],
                        test_date=im["date"],
                    ))

                # Seed Contradictions (Conflicts - Multi-Category)
                contradictions_meta = [
                    {
                        "category": "medication",
                        "doc_a": seeded_docs[0].id,
                        "doc_b": seeded_docs[4].id,
                        "desc": "City Hospital discharge note recorded Lisinopril 10mg daily, whereas subsequent Primary Care Consult recorded Lisinopril 20mg daily without explicit transitional titration note.",
                        "status": "new_conflict",
                        "notes": "Awaiting doctor clinical review to confirm date of upward dosage titration.",
                    },
                    {
                        "category": "allergy",
                        "doc_a": seeded_docs[1].id,
                        "doc_b": seeded_docs[4].id,
                        "desc": "Outpatient intake document recorded 'No Known Drug Allergies (NKDA)', whereas subsequent Primary Care Consult documented an explicit moderate urticarial allergy to Sulfonamides.",
                        "status": "under_review",
                        "notes": "Attending physician reviewing patient adverse reaction history before prescribing sulfa-based antibiotic compounds.",
                    },
                    {
                        "category": "blood_group",
                        "doc_a": seeded_docs[2].id,
                        "doc_b": seeded_docs[5].id,
                        "desc": "Pathology baseline laboratory intake listed unconfirmed 'O Negative' donor tag, whereas certified Metro Health Hematology Panel confirmed 'O Positive' with positive Rh-D antibody screen.",
                        "status": "resolved",
                        "notes": "Reviewed and clinically resolved by Dr. Sarah Lin, MD. Metro Health certified lab confirms patient is O Positive. Prior donor tag was an unverified self-report.",
                    },
                    {
                        "category": "diagnosis",
                        "doc_a": seeded_docs[0].id,
                        "doc_b": seeded_docs[1].id,
                        "desc": "Inpatient discharge established formal diagnosis onset date of Essential Hypertension as March 2024, whereas Outpatient Consult references pre-existing hypertension dating back to August 2021.",
                        "status": "new_conflict",
                        "notes": "Pending historical medical record retrieval to verify pre-2024 cardiovascular treatment duration.",
                    },
                ]

                for cm in contradictions_meta:
                    db.add(Contradiction(
                        patient_id=patient.id,
                        category=cm["category"],
                        document_a_id=cm["doc_a"],
                        document_b_id=cm["doc_b"],
                        description=cm["desc"],
                        status=cm["status"],
                        reviewer_notes=cm["notes"],
                    ))

                print("[SEED] Successfully seeded rich clinical documents, timeline events, medications, lab tests, and 4 multi-category conflicts.")

            # Seed Multi-Country Clinical Documents & Findings if not already present
            existing_docs = db.query(Document).filter(Document.patient_id == patient.id).count()
            if existing_docs == 0:
                print("[SEED] Seeding multi-country documents, investigations, and cross-border findings...")

                # 1. Indian Laboratory Report (Dr Lal PathLabs New Delhi)
                doc_in = Document(
                    patient_id=patient.id,
                    uploader_id=patient_user.id,
                    file_name="Dr_Lal_PathLabs_Comprehensive_Panel_Delhi.pdf",
                    file_path="/uploads/Dr_Lal_PathLabs_Comprehensive_Panel_Delhi.pdf",
                    file_size_bytes=425100,
                    mime_type="application/pdf",
                    sha256_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                    document_type="lab_report",
                    document_date="12/05/2024",
                    ocr_extracted_text="""DR LAL PATHLABS - NEW DELHI NABL ACCREDITED
Patient: Arthur Vance | Age: 68 Y / Male | Ref: Dr. R. Sharma
दिनांक: 12/05/2024
BIOCHEMISTRY REPORT:
Fasting Blood Sugar (FBS / फास्टिंग ब्लड शुगर): 126 mg/dL (Ref: 70 - 100 mg/dL) [HIGH]
HbA1c (ग्लाइकेटेड हीमोग्लोबिन): 7.2 % (Ref: 4.0 - 5.6 %) [ELEVATED]
Total Cholesterol (कुल कोलेस्ट्रॉल): 210 mg/dL (Ref: < 200 mg/dL) [BORDERLINE]
Serum Creatinine: 1.18 mg/dL (Ref: 0.70 - 1.30 mg/dL) [NORMAL]
Allergies: No Known Drug Allergies (NKDA) reported by patient.
Note: High fasting blood glucose indicates diabetic range per ICMR criteria.""",
                    page_count=2,
                    processing_status="completed"
                )
                db.add(doc_in)
                db.flush()

                # 2. UK NHS Hospital Discharge Report (Royal London Hospital)
                doc_uk = Document(
                    patient_id=patient.id,
                    uploader_id=patient_user.id,
                    file_name="NHS_Royal_London_Discharge_Summary.pdf",
                    file_path="/uploads/NHS_Royal_London_Discharge_Summary.pdf",
                    file_size_bytes=312450,
                    mime_type="application/pdf",
                    sha256_hash="8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
                    document_type="discharge_summary",
                    document_date="18/09/2024",
                    ocr_extracted_text="""BARTS HEALTH NHS TRUST - THE ROYAL LONDON HOSPITAL
Patient: Vance, Arthur (DOB: 14/07/1956) | NHS No: 482 910 2039
Admission Date: 16/09/2024 | Discharge Date: 18/09/2024
CLINICAL BIOCHEMISTRY (SI Units):
Venous Plasma Glucose: 7.0 mmol/L (Ref: 3.9 - 5.5 mmol/L) [ABNORMAL]
Serum Creatinine: 104 μmol/L (Ref: 60 - 110 μmol/L) [NORMAL]
Total Serum Cholesterol: 5.43 mmol/L (Ref: < 5.0 mmol/L) [ELEVATED - NICE CG181]
DISCHARGE MEDICATIONS:
1. Paracetamol 500mg tablets, 1-2 tabs QDS PRN for mild tension headache.
2. Amlodipine 5mg oral daily.
3. Metformin 500mg BD with meals.
Allergies: Penicillin allergy noted during review (mild rash recorded 2024).""",
                    page_count=3,
                    processing_status="completed"
                )
                db.add(doc_uk)
                db.flush()

                # 3. German Hospital Consultation (Charité Universitätsmedizin Berlin)
                doc_de = Document(
                    patient_id=patient.id,
                    uploader_id=patient_user.id,
                    file_name="Charite_Berlin_Ambulanzbefund_Kardiologie.pdf",
                    file_path="/uploads/Charite_Berlin_Ambulanzbefund_Kardiologie.pdf",
                    file_size_bytes=289000,
                    mime_type="application/pdf",
                    sha256_hash="d59b2dc327aa48f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88",
                    document_type="consultation_note",
                    document_date="22.07.2024",
                    ocr_extracted_text="""CHARITÉ - UNIVERSITÄTSMEDIZIN BERLIN
Klinik für Kardiologie und Angiologie | Campus Charité Mitte
Patient: Arthur Vance, geb. 14.07.1956
Datum: 22.07.2024
DIAGNOSE & BEFUND:
- Arterielle Hypertonie (Grad 1)
- Typ-2-Diabetes mellitus (Blutzucker nüchtern: 128 mg/dL)
- Allergie: Penicillin G (Allergische Hautreaktion, Exanthem nach Gabe)
MEDIKATIONSEMPFEHLUNG:
- Amlodipin 5 mg 1x täglich morgens
- Metformin 500 mg 2x täglich zur Mahlzeit
- Paracetamol-ratiopharm 500 mg bei Bedarf""",
                    page_count=1,
                    processing_status="completed"
                )
                db.add(doc_de)
                db.flush()

                # Add Investigations with native units
                # Indian Lab Glucose (126 mg/dL)
                inv_in_glu = Investigation(
                    patient_id=patient.id,
                    document_id=doc_in.id,
                    test_name="Fasting Blood Sugar (FBS)",
                    result_value="126",
                    original_unit="mg/dL",
                    reference_range="70 - 100 mg/dL",
                    abnormal_flag="HIGH",
                    test_date="2024-05-12"
                )
                # UK NHS Glucose (7.0 mmol/L)
                inv_uk_glu = Investigation(
                    patient_id=patient.id,
                    document_id=doc_uk.id,
                    test_name="Venous Plasma Glucose",
                    result_value="7.0",
                    original_unit="mmol/L",
                    reference_range="3.9 - 5.5 mmol/L",
                    abnormal_flag="ABNORMAL",
                    test_date="2024-09-18"
                )
                # Indian Cholesterol (210 mg/dL)
                inv_in_chol = Investigation(
                    patient_id=patient.id,
                    document_id=doc_in.id,
                    test_name="Total Serum Cholesterol",
                    result_value="210",
                    original_unit="mg/dL",
                    reference_range="< 200 mg/dL",
                    abnormal_flag="BORDERLINE",
                    test_date="2024-05-12"
                )
                # UK NHS Cholesterol (5.43 mmol/L)
                inv_uk_chol = Investigation(
                    patient_id=patient.id,
                    document_id=doc_uk.id,
                    test_name="Total Serum Cholesterol",
                    result_value="5.43",
                    original_unit="mmol/L",
                    reference_range="< 5.0 mmol/L",
                    abnormal_flag="HIGH",
                    test_date="2024-09-18"
                )
                # UK NHS Creatinine (104 μmol/L)
                inv_uk_creat = Investigation(
                    patient_id=patient.id,
                    document_id=doc_uk.id,
                    test_name="Serum Creatinine",
                    result_value="104",
                    original_unit="μmol/L",
                    reference_range="60 - 110 μmol/L",
                    abnormal_flag="NORMAL",
                    test_date="2024-09-18"
                )
                # Indian Lab Creatinine (1.18 mg/dL)
                inv_in_creat = Investigation(
                    patient_id=patient.id,
                    document_id=doc_in.id,
                    test_name="Serum Creatinine",
                    result_value="1.18",
                    original_unit="mg/dL",
                    reference_range="0.70 - 1.30 mg/dL",
                    abnormal_flag="NORMAL",
                    test_date="2024-05-12"
                )
                # Indian Lab HbA1c (7.2 %)
                inv_in_a1c = Investigation(
                    patient_id=patient.id,
                    document_id=doc_in.id,
                    test_name="Glycated Hemoglobin (HbA1c)",
                    result_value="7.2",
                    original_unit="%",
                    reference_range="4.0 - 5.6 %",
                    abnormal_flag="ELEVATED",
                    test_date="2024-05-12"
                )

                db.add_all([inv_in_glu, inv_uk_glu, inv_in_chol, inv_uk_chol, inv_uk_creat, inv_in_creat, inv_in_a1c])

                # Add Medications
                med_para = Medication(
                    patient_id=patient.id,
                    document_id=doc_uk.id,
                    medicine_name="Paracetamol",
                    dosage="500mg",
                    frequency="PRN (As needed)",
                    route="oral",
                    status="started",
                    start_date="2024-09-18",
                )
                med_amlo = Medication(
                    patient_id=patient.id,
                    document_id=doc_uk.id,
                    medicine_name="Amlodipine Besylate",
                    dosage="5mg",
                    frequency="OD (Once daily)",
                    route="oral",
                    status="started",
                    start_date="2024-07-22",
                )
                med_metf = Medication(
                    patient_id=patient.id,
                    document_id=doc_uk.id,
                    medicine_name="Metformin HCl",
                    dosage="500mg",
                    frequency="BD (Twice daily)",
                    route="oral",
                    status="started",
                    start_date="2024-05-12",
                )
                db.add_all([med_para, med_amlo, med_metf])

                # Add Allergies
                all_neg = Allergy(
                    patient_id=patient.id,
                    document_id=doc_in.id,
                    allergen="All Drug Allergies",
                    reaction="None reported",
                    severity="None",
                    status="explicit_negative",
                    recorded_date="2024-05-12",
                )
                all_pos = Allergy(
                    patient_id=patient.id,
                    document_id=doc_de.id,
                    allergen="Penicillin G",
                    reaction="Cutaneous Rash & Facial Erythema (Exanthem)",
                    severity="moderate",
                    status="explicit_positive",
                    recorded_date="2024-07-22",
                )
                db.add_all([all_neg, all_pos])

                # Add Extracted Findings with Text Spans and Provenance
                find1 = ExtractedFinding(
                    patient_id=patient.id,
                    document_id=doc_in.id,
                    finding_category="investigation",
                    entity_name="Fasting Blood Glucose",
                    extracted_value="126 mg/dL",
                    original_extracted_text="Fasting Blood Sugar (FBS / फास्टिंग ब्लड शुगर): 126 mg/dL (Ref: 70 - 100 mg/dL) [HIGH]",
                    source_page_number=1,
                    text_span_start=180,
                    text_span_end=265,
                    event_date="2024-05-12",
                    date_precision="exact",
                    extraction_confidence=0.99,
                    verification_status="confirmed",
                    polarity="positive"
                )
                find2 = ExtractedFinding(
                    patient_id=patient.id,
                    document_id=doc_uk.id,
                    finding_category="investigation",
                    entity_name="Venous Plasma Glucose",
                    extracted_value="7.0 mmol/L",
                    original_extracted_text="Venous Plasma Glucose: 7.0 mmol/L (Ref: 3.9 - 5.5 mmol/L) [ABNORMAL]",
                    source_page_number=2,
                    text_span_start=210,
                    text_span_end=278,
                    event_date="2024-09-18",
                    date_precision="exact",
                    extraction_confidence=0.98,
                    verification_status="confirmed",
                    polarity="positive"
                )
                find3 = ExtractedFinding(
                    patient_id=patient.id,
                    document_id=doc_de.id,
                    finding_category="allergy",
                    entity_name="Penicillin G Allergy",
                    extracted_value="Penicillin G - Allergic Exanthem",
                    original_extracted_text="Allergie: Penicillin G (Allergische Hautreaktion, Exanthem nach Gabe)",
                    source_page_number=1,
                    text_span_start=240,
                    text_span_end=308,
                    event_date="2024-07-22",
                    date_precision="exact",
                    extraction_confidence=0.97,
                    verification_status="requires_review",
                    polarity="positive"
                )
                find4 = ExtractedFinding(
                    patient_id=patient.id,
                    document_id=doc_in.id,
                    finding_category="allergy",
                    entity_name="Drug Allergy Absence Assertion",
                    extracted_value="No Known Drug Allergies",
                    original_extracted_text="Allergies: No Known Drug Allergies (NKDA) reported by patient.",
                    source_page_number=1,
                    text_span_start=340,
                    text_span_end=402,
                    event_date="2024-05-12",
                    date_precision="exact",
                    extraction_confidence=0.96,
                    verification_status="requires_review",
                    polarity="negative"
                )
                db.add_all([find1, find2, find3, find4])

                # Add Cross-Border Contradiction (Penicillin Allergy Neg vs Pos)
                contra = Contradiction(
                    patient_id=patient.id,
                    category="allergy",
                    finding_a_id=find4.id,
                    finding_b_id=find3.id,
                    document_a_id=doc_in.id,
                    document_b_id=doc_de.id,
                    description="Contradictory Allergy Assertion: Earlier Indian clinic record (May 2024) asserts 'No Known Drug Allergies (NKDA)', while subsequent German hospital record (July 2024) documents an acute allergic cutaneous reaction to Penicillin G.",
                    status="unresolved",
                )
                db.add(contra)

                # Add Chronological Timeline Events
                event1 = MedicalEvent(
                    patient_id=patient.id,
                    document_id=doc_in.id,
                    event_type="lab_investigation",
                    title="Comprehensive Metabolic Panel (New Delhi, India)",
                    description="Dr Lal PathLabs documented Fasting Blood Glucose of 126 mg/dL and HbA1c 7.2%. Units in mg/dL.",
                    event_date="2024-05-12",
                    verification_status="confirmed"
                )
                event2 = MedicalEvent(
                    patient_id=patient.id,
                    document_id=doc_de.id,
                    event_type="consultation",
                    title="Cardiology & Metabolic Review (Charité Berlin, Germany)",
                    description="Confirmed Grade 1 Hypertension and Type 2 Diabetes. Recorded Penicillin allergy cutaneous exanthem.",
                    event_date="2024-07-22",
                    verification_status="confirmed"
                )
                event3 = MedicalEvent(
                    patient_id=patient.id,
                    document_id=doc_uk.id,
                    event_type="admission",
                    title="Inpatient Observation & Medication Review (NHS London, UK)",
                    description="Barts Health NHS Trust recorded Plasma Glucose of 7.0 mmol/L and prescribed Paracetamol 500mg.",
                    event_date="2024-09-18",
                    verification_status="confirmed"
                )
                db.add_all([event1, event2, event3])

                print("[SEED] Successfully seeded multi-country documents, findings, and contradictions.")

        db.commit()
        print("[SEED] Database seeding completed successfully.")
    except Exception as e:
        db.rollback()
        print(f"[SEED ERROR] {str(e)}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
    seed_database()
