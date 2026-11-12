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
    """Seed comprehensive clinical data for MY CLINIX."""
    init_db()
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
                    medical_notes="History of Essential Hypertension, Type 2 Diabetes Mellitus, and Mild Chronic Kidney Disease (Stage 2). Under stable combined therapy.",
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

        db.commit()
        print("[SEED] Database seeding completed successfully.")
    except Exception as e:
        db.rollback()
        print(f"[SEED ERROR] {str(e)}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
