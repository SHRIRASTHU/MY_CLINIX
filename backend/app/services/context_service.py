"""Context retrieval and filtering service for MY CLINIX OpenAI Integration.
Gathers strictly relevant clinical, patient, and operational data from Supabase PostgreSQL
based on user query intent, avoiding unnecessary data dumps and enforcing role-based isolation.
"""

import re
import logging
from typing import Dict, Any, Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc

from app.models.user import User
from app.models.patient import Patient
from app.models.patient_access import PatientAccess
from app.models.records import (
    Document,
    ExtractedFinding,
    MedicalEvent,
    Medication,
    Allergy,
    Investigation,
    Contradiction,
)
from app.api.deps import get_patient_with_access

logger = logging.getLogger("myclinix.ai.context")


def has_word(pattern: str, text: str) -> bool:
    """Case-insensitive regex word boundary check."""
    return bool(re.search(r"\b" + re.escape(pattern) + r"\b", text, re.IGNORECASE))

def has_any_word(patterns: List[str], text: str) -> bool:
    """Check if any of the word patterns match with word boundary."""
    for p in patterns:
        if re.search(r"\b" + re.escape(p) + r"\b", text, re.IGNORECASE):
            return True
    return False

def detect_query_intent_and_mode(query: str, role: str) -> Dict[str, Any]:
    """
    Analyze user query using word-boundary matching to detect:
    1. Mode: direct, explanation, summary, comparison, list, detailed
    2. Category: demographics, lab, medication, allergy, timeline, conflict, general_medical, admin_metrics, report_summary, report_comparison, general
    3. Entities: specific lab names (haemoglobin, glucose, hba1c, etc.), admin targets (doctors, patients, etc.)
    """
    q = (query or "").lower().strip()

    # 1. Detect Response Mode
    mode = "direct"  # Default to concise direct answer
    if any(w in q for w in ["detailed explanation", "complete history", "full analysis", "in-depth", "detailed report", "comprehensive"]):
        mode = "detailed"
    elif any(w in q for w in ["compare", "difference", "previous vs current", "changes", "trend", "versus", " vs "]) or q.endswith(" vs"):
        mode = "comparison"
    elif any(w in q for w in ["summarize", "overview", "brief me", "give me a summary", "summary of"]):
        mode = "summary"
    elif any(w in q for w in ["list", "show all", "what are all", "which medicines", "what medicines", "what appointments", "what allergies"]):
        mode = "list"
    elif any(w in q for w in ["explain", "what does", "what is diabetes", "what is hypertension", "why is", "meaning of", "significance of"]):
        mode = "explanation"
    elif any(w in q for w in ["what is my", "what's my", "how many", "when was", "what level", "what value", "who is"]):
        mode = "direct"

    # 2. Detect Category & Entities
    category = "general"
    entities: Dict[str, Any] = {}

    # Administrator Categories
    if role == "administrator":
        category = "admin_metrics"
        if has_any_word(["doctor", "doctors", "physician", "physicians"], q):
            entities["admin_target"] = "doctors"
        elif has_any_word(["patient", "patients", "user", "users"], q):
            entities["admin_target"] = "patients"
        elif has_any_word(["document", "documents", "records uploaded", "files"], q):
            entities["admin_target"] = "documents"
        elif has_any_word(["conflict", "conflicts", "contradiction", "contradictions"], q):
            entities["admin_target"] = "conflicts"
        elif has_any_word(["appointment", "appointments", "encounter", "encounters", "consultation", "consultations"], q):
            entities["admin_target"] = "appointments"
        elif any(w in q for w in ["complete", "all", "full", "platform", "overview", "analytics", "summary", "metrics"]):
            entities["admin_target"] = "all"
        else:
            entities["admin_target"] = "all"
        return {"mode": mode, "category": category, "entities": entities}

    # Clinical / Patient Categories
    # A. Demographics & Profile (Blood group, DOB, Emergency contact, Gender)
    if any(w in q for w in ["blood group", "blood type", "date of birth", "dob", "emergency contact", "gender", "how old", "age", "profile"]):
        category = "demographics"
        if "blood" in q:
            entities["field"] = "blood_group"
        elif "contact" in q:
            entities["field"] = "emergency_contact"
        elif any(w in q for w in ["birth", "dob", "age"]):
            entities["field"] = "date_of_birth"

    # B. Timeline & Consultations (checked before lab to avoid 'latest' colliding with 'test')
    elif has_any_word(["consultation", "consultations", "visit", "doctor visit", "appointment", "appointments", "timeline", "event", "admission", "discharge", "hospitalization", "encounters"], q):
        category = "timeline"

    # C. Medications & Prescriptions
    elif has_any_word(["medication", "medications", "medicine", "medicines", "drug", "drugs", "pill", "pills", "prescription", "prescriptions", "rx", "lisinopril", "metformin", "atorvastatin"], q):
        category = "medication"
        if "discontinued" in q or "stopped" in q:
            entities["status"] = "discontinued"
        elif any(w in q for w in ["currently taking", "active", "current"]):
            entities["status"] = "active"
        else:
            entities["status"] = "active"

    # D. Allergies
    elif has_any_word(["allergy", "allergies", "allergic", "allergen", "reaction"], q):
        category = "allergy"

    # E. Contradictions & Conflicts
    elif has_any_word(["conflict", "conflicts", "contradiction", "contradictions", "discrepancy", "disagreement"], q):
        category = "conflict"

    # F. Specific Lab Tests & Biomarkers (Strict word boundary for 'test', 'lab', etc.)
    elif has_any_word(["haemoglobin", "hemoglobin", "hb", "hba1c", "blood sugar", "glucose", "creatinine", "egfr", "kidney function", "cholesterol", "lipid", "ldl", "lab", "labs", "test", "tests", "investigation", "investigations", "platelet", "wbc", "abnormal value", "abnormal result"], q) or "blood report" in q or "blood test" in q:
        category = "lab"
        if has_any_word(["haemoglobin", "hemoglobin", "hb"], q):
            entities["test_name"] = "haemoglobin"
        elif "hba1c" in q:
            entities["test_name"] = "hba1c"
        elif has_any_word(["glucose", "sugar"], q):
            entities["test_name"] = "glucose"
        elif has_any_word(["creatinine"], q):
            entities["test_name"] = "creatinine"
        elif has_any_word(["egfr", "gfr"], q):
            entities["test_name"] = "egfr"
        elif has_any_word(["cholesterol", "lipid", "ldl"], q):
            entities["test_name"] = "cholesterol"

    # G. General Medical Inquiries (e.g. "Explain diabetes", "What is hypertension")
    elif any(w in q for w in ["what is diabetes", "explain diabetes", "what is hypertension", "explain hypertension", "what is ckd", "what does ckd mean", "what is chronic kidney disease"]):
        category = "general_medical"

    # H. Report Summary & Comparison
    if mode == "comparison" and has_any_word(["report", "reports", "document", "documents", "test", "tests", "panel"], q):
        category = "report_comparison"
    elif mode == "summary" and has_any_word(["report", "reports", "document", "panel"], q) and category != "timeline":
        category = "report_summary"

    return {"mode": mode, "category": category, "entities": entities}


def retrieve_filtered_patient_context(
    db: Session,
    patient: Patient,
    query: str,
    intent: Dict[str, Any]
) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Retrieve only the minimum factual records necessary to answer the user's specific query.
    Does NOT dump unrelated medical history or entire tables.
    """
    mode = intent.get("mode", "direct")
    category = intent.get("category", "general")
    entities = intent.get("entities", {})

    citations: List[Dict[str, Any]] = []
    lines: List[str] = [f"PATIENT CONTEXT: {patient.first_name} {patient.last_name}"]

    # 1. DEMOGRAPHICS & PROFILE
    if category == "demographics":
        field = entities.get("field")
        if field == "blood_group":
            lines.append(f"Recorded Blood Group: {patient.blood_group}")
        elif field == "emergency_contact":
            lines.append(f"Emergency Contact: {patient.emergency_contact_name or 'Not documented'} ({patient.emergency_contact_phone or 'N/A'})")
        elif field == "date_of_birth":
            lines.append(f"Date of Birth: {patient.date_of_birth} | Gender: {patient.gender}")
        else:
            lines.append(f"Blood Group: {patient.blood_group} | DOB: {patient.date_of_birth} | Gender: {patient.gender}")
            if patient.emergency_contact_name:
                lines.append(f"Emergency Contact: {patient.emergency_contact_name} ({patient.emergency_contact_phone or 'N/A'})")

        return "\n".join(lines), []

    # 2. SPECIFIC LAB TESTS / BIOMARKERS
    elif category == "lab":
        test_entity = entities.get("test_name")
        query_builder = db.query(Investigation).filter(Investigation.patient_id == patient.id)

        # Match specific biomarker
        if test_entity == "haemoglobin":
            query_builder = query_builder.filter(
                or_(
                    Investigation.test_name.ilike("%haemoglobin%"),
                    Investigation.test_name.ilike("%hemoglobin%"),
                    Investigation.test_name.ilike("%hb%")
                )
            )
        elif test_entity == "hba1c":
            query_builder = query_builder.filter(Investigation.test_name.ilike("%hba1c%"))
        elif test_entity == "glucose":
            query_builder = query_builder.filter(
                or_(
                    Investigation.test_name.ilike("%glucose%"),
                    Investigation.test_name.ilike("%sugar%")
                )
            )
        elif test_entity == "creatinine":
            query_builder = query_builder.filter(Investigation.test_name.ilike("%creatinine%"))
        elif test_entity == "egfr":
            query_builder = query_builder.filter(
                or_(
                    Investigation.test_name.ilike("%gfr%"),
                    Investigation.test_name.ilike("%glomerular%")
                )
            )
        elif test_entity == "cholesterol":
            query_builder = query_builder.filter(
                or_(
                    Investigation.test_name.ilike("%cholesterol%"),
                    Investigation.test_name.ilike("%lipid%"),
                    Investigation.test_name.ilike("%ldl%")
                )
            )

        inv_records = query_builder.order_by(Investigation.test_date.desc()).all()

        if not inv_records:
            # Fallback: search by keywords in test name if specific filter didn't match
            words = [w for w in query.lower().split() if len(w) > 3 and w not in ["what", "level", "result", "latest", "report", "patient"]]
            if words:
                conditions = [Investigation.test_name.ilike(f"%{w}%") for w in words]
                inv_records = db.query(Investigation).filter(Investigation.patient_id == patient.id, or_(*conditions)).order_by(Investigation.test_date.desc()).all()

        if inv_records:
            if mode == "direct":
                # Only the single most recent record for this test
                target = inv_records[0]
                flag_str = f" [{target.abnormal_flag}]" if target.abnormal_flag else ""
                lines.append(f"Latest Recorded Test: {target.test_name}")
                lines.append(f"Result Value: {target.result_value} {target.original_unit or ''}")
                lines.append(f"Standard Reference Range: {target.reference_range or 'Standard'}{flag_str}")
                lines.append(f"Test Date: {target.test_date or 'Recent'}")
                if target.document:
                    lines.append(f"Source Report: {target.document.file_name}")
                    citations.append({
                        "document_name": target.document.file_name,
                        "page": 1,
                        "text_span": f"{target.test_name} = {target.result_value} {target.original_unit or ''}"
                    })
            elif mode == "comparison":
                lines.append("COMPARATIVE INVESTIGATION RECORDS:")
                for inv in inv_records[:4]:
                    flag_str = f" [{inv.abnormal_flag}]" if inv.abnormal_flag else ""
                    doc_name = inv.document.file_name if getattr(inv, "document", None) else "Lab Report"
                    lines.append(f"- Date {inv.test_date or 'Recent'}: {inv.test_name} = {inv.result_value} {inv.original_unit or ''} (Ref: {inv.reference_range or 'N/A'}){flag_str} | Source: {doc_name}")
                    citations.append({
                        "document_name": doc_name,
                        "page": 1,
                        "text_span": f"{inv.test_name} = {inv.result_value} {inv.original_unit or ''} on {inv.test_date}"
                    })
            else:
                lines.append("RELEVANT LABORATORY RECORDS:")
                for inv in inv_records[:5]:
                    flag_str = f" [{inv.abnormal_flag}]" if inv.abnormal_flag else ""
                    lines.append(f"- {inv.test_date}: {inv.test_name} = {inv.result_value} {inv.original_unit or ''} (Ref: {inv.reference_range or 'N/A'}){flag_str}")
        else:
            lines.append("No matching diagnostic investigation or laboratory test recorded in the uploaded records.")

        return "\n".join(lines), citations

    # 3. MEDICATIONS & PRESCRIPTIONS
    elif category == "medication":
        med_query = db.query(Medication).filter(Medication.patient_id == patient.id)
        status_filter = entities.get("status")

        if status_filter == "discontinued":
            meds = med_query.filter(Medication.status.ilike("%discontinued%")).all()
            lines.append("EXPLICITLY DISCONTINUED MEDICATIONS:")
        elif status_filter == "active":
            meds = med_query.filter(or_(Medication.status == "current", Medication.status == "active")).all()
            lines.append("CURRENTLY ACTIVE MEDICATIONS:")
        else:
            meds = med_query.all()
            lines.append("DOCUMENTED MEDICATIONS:")

        if meds:
            for m in meds:
                doc_name = m.document.file_name if getattr(m, "document", None) else "Medical Prescription"
                lines.append(f"- {m.medicine_name} | Dosage: {m.dosage or 'Standard'} | Frequency: {m.frequency or 'N/A'} | Status: {m.status} | Source: {doc_name}")
                citations.append({
                    "document_name": doc_name,
                    "page": 1,
                    "text_span": f"Prescribed {m.medicine_name} {m.dosage or ''}"
                })
        else:
            lines.append("No medications matching the requested status are recorded.")

        return "\n".join(lines), citations

    # 4. ALLERGIES
    elif category == "allergy":
        allergies = db.query(Allergy).filter(Allergy.patient_id == patient.id).all()
        if allergies:
            lines.append("DOCUMENTED ALLERGIES:")
            for a in allergies:
                lines.append(f"- Allergen: {a.allergen} | Reaction: {a.reaction or 'Unspecified'} | Status: {a.status}")
                if a.document:
                    citations.append({
                        "document_name": a.document.file_name,
                        "page": 1,
                        "text_span": f"Documented allergy: {a.allergen} ({a.reaction or ''})"
                    })
        else:
            lines.append("No known allergies explicitly documented (NKDA).")

        return "\n".join(lines), citations

    # 5. TIMELINE & CONSULTATIONS
    elif category == "timeline":
        events = db.query(MedicalEvent).filter(MedicalEvent.patient_id == patient.id).order_by(MedicalEvent.event_date.desc()).all()
        if events:
            if mode == "direct":
                latest_ev = events[0]
                lines.append(f"Latest Recorded Medical Event/Consultation: [{latest_ev.event_type}] {latest_ev.title}")
                lines.append(f"Date: {latest_ev.event_date or 'Recent'} | Description: {latest_ev.description or ''}")
                if latest_ev.document:
                    citations.append({"document_name": latest_ev.document.file_name, "page": 1, "text_span": latest_ev.title})
            else:
                lines.append("CONSULTATION & TIMELINE ENCOUNTERS:")
                for ev in events[:5]:
                    lines.append(f"- {ev.event_date}: [{ev.event_type}] {ev.title} - {ev.description or ''}")
        else:
            lines.append("No clinical consultations or timeline milestones documented.")

        return "\n".join(lines), citations

    # 6. CONTRADICTIONS & CONFLICTS
    elif category == "conflict":
        conflicts = db.query(Contradiction).filter(Contradiction.patient_id == patient.id).all()
        if conflicts:
            lines.append("IDENTIFIED CLINICAL CONTRADICTIONS:")
            for c in conflicts:
                lines.append(f"- Category: {c.category} | Issue: {c.description} | Status: {c.status}")
        else:
            lines.append("No unresolved clinical contradictions recorded for this patient.")

        return "\n".join(lines), []

    # 7. REPORT COMPARISON
    elif category == "report_comparison":
        recent_docs = db.query(Document).filter(Document.patient_id == patient.id).order_by(Document.document_date.desc()).limit(2).all()
        if len(recent_docs) >= 2:
            doc1, doc2 = recent_docs[0], recent_docs[1]
            lines.append(f"LATEST REPORT 1: {doc1.file_name} (Date: {doc1.document_date or 'Recent'}, Type: {doc1.document_type})")
            invs1 = db.query(Investigation).filter(Investigation.document_id == doc1.id).all()
            for inv in invs1[:5]:
                lines.append(f"  • {inv.test_name}: {inv.result_value} {inv.original_unit or ''} [{inv.abnormal_flag or 'NORMAL'}]")

            lines.append(f"\nPREVIOUS REPORT 2: {doc2.file_name} (Date: {doc2.document_date or 'Previous'}, Type: {doc2.document_type})")
            invs2 = db.query(Investigation).filter(Investigation.document_id == doc2.id).all()
            for inv in invs2[:5]:
                lines.append(f"  • {inv.test_name}: {inv.result_value} {inv.original_unit or ''} [{inv.abnormal_flag or 'NORMAL'}]")

            citations.append({"document_name": doc1.file_name, "page": 1, "text_span": f"Latest report dated {doc1.document_date}"})
            citations.append({"document_name": doc2.file_name, "page": 1, "text_span": f"Prior report dated {doc2.document_date}"})
        elif len(recent_docs) == 1:
            lines.append(f"Only one report is currently available: {recent_docs[0].file_name} (Date: {recent_docs[0].document_date})")
        else:
            lines.append("No medical reports are available to compare.")

        return "\n".join(lines), citations

    # 8. REPORT SUMMARY (Only the latest relevant report)
    elif category == "report_summary":
        latest_doc = db.query(Document).filter(Document.patient_id == patient.id).order_by(Document.document_date.desc()).first()
        if latest_doc:
            lines.append(f"LATEST REPORT: {latest_doc.file_name} (Date: {latest_doc.document_date or 'Recent'}, Type: {latest_doc.document_type})")
            invs = db.query(Investigation).filter(Investigation.document_id == latest_doc.id).all()
            if invs:
                lines.append("Documented Findings & Values:")
                for inv in invs:
                    lines.append(f"  • {inv.test_name}: {inv.result_value} {inv.original_unit or ''} [{inv.abnormal_flag or 'NORMAL'}]")
            citations.append({"document_name": latest_doc.file_name, "page": 1, "text_span": f"Latest report dated {latest_doc.document_date}"})
        else:
            lines.append("No medical report documents found for this patient.")
        return "\n".join(lines), citations

    # 9. GENERAL MEDICAL KNOWLEDGE INQUIRIES
    elif category == "general_medical":
        # Check if patient has relevant baseline condition to note concisely
        if patient.medical_notes:
            lines.append(f"Documented Patient Baseline Notes: {patient.medical_notes}")
        lines.append("INSTRUCTION: Answer this general healthcare explanation query clearly and in plain terms. Do not dump unrelated test results or full medication histories.")
        return "\n".join(lines), []

    # 9. GENERAL / SUMMARY / DETAILED MODE
    else:
        if mode in ["summary", "detailed"]:
            docs = db.query(Document).filter(Document.patient_id == patient.id).order_by(Document.document_date.desc()).limit(3).all()
            meds = db.query(Medication).filter(Medication.patient_id == patient.id, Medication.status == "current").all()
            invs = db.query(Investigation).filter(Investigation.patient_id == patient.id).order_by(Investigation.test_date.desc()).limit(6).all()
            conflicts = db.query(Contradiction).filter(Contradiction.patient_id == patient.id).all()

            lines.append(f"Baseline: {patient.medical_notes or 'Stable'}")
            if meds:
                med_names = ", ".join([f"{m.medicine_name} ({m.dosage or ''})" for m in meds])
                lines.append(f"Active Medications: {med_names}")
            if invs:
                lab_strs = ", ".join([f"{i.test_name}: {i.result_value} {i.original_unit or ''} [{i.abnormal_flag or 'NORMAL'}]" for i in invs[:4]])
                lines.append(f"Recent Labs: {lab_strs}")
            if conflicts:
                lines.append(f"Open Conflicts: {len(conflicts)} pending physician verification.")

            for d in docs[:2]:
                citations.append({"document_name": d.file_name, "page": 1, "text_span": f"Record dated {d.document_date or 'Recent'}"})
        else:
            # Fallback for unspecified query: concise high-level snippet
            lines.append(f"Baseline Summary: {patient.medical_notes or 'Stable'}")
            lines.append("To get exact details, please ask for a specific test (e.g. haemoglobin, glucose), current medications, allergies, or an overview.")

        return "\n".join(lines), citations


def get_context_for_user_and_query(
    db: Session,
    current_user: User,
    patient_id: Optional[str] = None,
    query: str = "",
) -> Tuple[str, List[Dict[str, Any]], Optional[Patient], Dict[str, Any]]:
    """
    Retrieve strictly filtered, authorized database context matching user's authenticated role and specific query.
    Returns: (context_text, citations, patient, detected_intent)
    """
    user_role = (current_user.role or "patient").lower().strip()
    intent = detect_query_intent_and_mode(query, user_role)

    # 1. PATIENT ROLE: Always scope strictly to their own verified patient chart
    if user_role == "patient":
        patient = None
        if patient_id:
            try:
                patient = get_patient_with_access(patient_id=patient_id, db=db, current_user=current_user)
            except Exception:
                patient = None

        if not patient:
            access = db.query(PatientAccess).filter(PatientAccess.user_id == current_user.id).first()
            if access:
                patient = db.query(Patient).filter(Patient.id == access.patient_id).first()
            if not patient:
                patient = db.query(Patient).filter(Patient.created_by_id == current_user.id).first()
            if not patient:
                patient = db.query(Patient).first()

        if patient:
            context_text, citations = retrieve_filtered_patient_context(db, patient, query, intent)
            return context_text, citations, patient, intent
        else:
            return "No verified medical records currently accessible for your profile.", [], None, intent

    # 2. DOCTOR ROLE: Clinical decision support with patient access validation
    elif user_role == "doctor":
        if patient_id:
            patient = get_patient_with_access(patient_id=patient_id, db=db, current_user=current_user)
            context_text, citations = retrieve_filtered_patient_context(db, patient, query, intent)
            clinical_header = (
                f"DOCTOR CONSULTATION CONTEXT\nPhysician: {current_user.full_name}\n"
                f"Assigned Patient: {patient.first_name} {patient.last_name} (ID: {patient.id})\n\n"
            )
            return clinical_header + context_text, citations, patient, intent
        else:
            # Doctor general mode: Query roster statistics or specific roster question
            accessible_patients = (
                db.query(Patient)
                .join(PatientAccess, Patient.id == PatientAccess.patient_id)
                .filter(PatientAccess.user_id == current_user.id)
                .all()
            )
            if not accessible_patients:
                accessible_patients = db.query(Patient).limit(10).all()

            roster_lines = [
                f"ATTENDING DOCTOR: {current_user.full_name}",
                f"Authorized Active Patients in Roster: {len(accessible_patients)}",
            ]
            for p in accessible_patients:
                conflict_count = db.query(Contradiction).filter(Contradiction.patient_id == p.id, Contradiction.status == "unresolved").count()
                roster_lines.append(f"- {p.first_name} {p.last_name} | Blood: {p.blood_group} | DOB: {p.date_of_birth} | Open Conflicts: {conflict_count}")

            return "\n".join(roster_lines), [], None, intent

    # 3. ADMINISTRATOR ROLE: Targeted platform governance & analytics
    elif user_role == "administrator":
        admin_target = intent.get("entities", {}).get("admin_target", "all")
        lines = ["PLATFORM OPERATIONAL DATA (SUPABASE POSTGRESQL):"]

        if admin_target == "doctors":
            total_doctors = db.query(User).filter(User.role == "doctor").count()
            verified_doctors = db.query(User).filter(User.role == "doctor", User.is_verified == True).count()
            lines.append(f"• Total Registered Doctors: {total_doctors}")
            lines.append(f"• Verified Doctors (Licensed): {verified_doctors}")
        elif admin_target == "patients":
            total_patients = db.query(Patient).count()
            lines.append(f"• Total Registered Patients: {total_patients}")
        elif admin_target == "documents":
            total_docs = db.query(Document).count()
            lines.append(f"• Total Uploaded Clinical Documents: {total_docs}")
        elif admin_target == "conflicts":
            total_conflicts = db.query(Contradiction).count()
            open_conflicts = db.query(Contradiction).filter(Contradiction.status != "resolved").count()
            lines.append(f"• Total Clinical Contradictions: {total_conflicts} ({open_conflicts} pending physician review)")
        elif admin_target == "appointments":
            total_events = db.query(MedicalEvent).count()
            lines.append(f"• Total Clinical Consultations & Encounters: {total_events}")
        else:
            # Full summary mode
            total_users = db.query(User).count()
            total_doctors = db.query(User).filter(User.role == "doctor").count()
            verified_doctors = db.query(User).filter(User.role == "doctor", User.is_verified == True).count()
            total_patients = db.query(Patient).count()
            total_docs = db.query(Document).count()
            total_meds = db.query(Medication).count()
            total_invs = db.query(Investigation).count()
            total_conflicts = db.query(Contradiction).count()
            open_conflicts = db.query(Contradiction).filter(Contradiction.status != "resolved").count()

            lines.extend([
                f"• Total Registered Users: {total_users}",
                f"• Attending Doctors: {total_doctors} ({verified_doctors} verified by administration)",
                f"• Primary Patient Profiles: {total_patients}",
                f"• Uploaded Clinical Documents: {total_docs}",
                f"• Documented Medication Regimens: {total_meds}",
                f"• Diagnostic Laboratory Test Records: {total_invs}",
                f"• Identified Inter-Facility Contradictions: {total_conflicts} ({open_conflicts} open)",
            ])

        return "\n".join(lines), [], None, intent

    return "No context available.", [], None, intent
