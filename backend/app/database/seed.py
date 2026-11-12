import sys
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
    """Seed initial demonstration accounts and multi-country patient records."""
    init_db()
    db = SessionLocal()
    try:
        demo_users = [
            {
                "email": "admin@myclinix.org",
                "full_name": "System Administrator",
                "role": UserRole.ADMIN.value,
                "password": "DemoPass123!",
            },
            {
                "email": "reviewer@myclinix.org",
                "full_name": "Dr. Sarah Lin (Chief Reviewer)",
                "role": UserRole.REVIEWER.value,
                "password": "DemoPass123!",
            },
            {
                "email": "caregiver@myclinix.org",
                "full_name": "David Vance (Primary Caregiver)",
                "role": UserRole.CAREGIVER.value,
                "password": "DemoPass123!",
            },
            {
                "email": "patient@myclinix.org",
                "full_name": "Arthur Vance",
                "role": UserRole.PATIENT.value,
                "password": "DemoPass123!",
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
                )
                db.add(user)
                db.flush()
                created_users[u["email"]] = user
                print(f"[SEED] Created user: {u['email']} ({u['role']})")
            else:
                created_users[u["email"]] = existing
                print(f"[SEED] User already exists: {u['email']}")

        # Seed sample patient profile
        patient_user = created_users.get("patient@myclinix.org")
        reviewer_user = created_users.get("reviewer@myclinix.org")
        caregiver_user = created_users.get("caregiver@myclinix.org")

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
                    medical_notes="History of Essential Hypertension, Type 2 Diabetes Mellitus, and Mild Chronic Kidney Disease. Multi-country clinical record provenance across India, UK, Germany, and USA.",
                    created_by_id=patient_user.id,
                )
                db.add(patient)
                db.flush()

                # Grant owner access to patient
                db.add(PatientAccess(
                    patient_id=patient.id,
                    user_id=patient_user.id,
                    access_level=AccessLevel.OWNER
                ))

                # Share with caregiver
                if caregiver_user:
                    db.add(PatientAccess(
                        patient_id=patient.id,
                        user_id=caregiver_user.id,
                        access_level=AccessLevel.CAREGIVER
                    ))

                # Share with reviewer
                if reviewer_user:
                    db.add(PatientAccess(
                        patient_id=patient.id,
                        user_id=reviewer_user.id,
                        access_level=AccessLevel.REVIEWER
                    ))

                print(f"[SEED] Created sample patient: Arthur Vance (ID: {patient.id})")

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
    seed_database()
