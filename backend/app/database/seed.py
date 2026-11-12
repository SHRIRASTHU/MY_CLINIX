import sys
from pathlib import Path

# Add backend directory to path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BASE_DIR))

from app.database.session import SessionLocal, init_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.patient_access import PatientAccess, AccessLevel
from app.core.security import hash_password

def seed_database():
    """Seed initial demonstration accounts and patient record."""
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
            existing_patient = db.query(Patient).filter(
                Patient.first_name == "Arthur",
                Patient.last_name == "Vance"
            ).first()

            if not existing_patient:
                patient = Patient(
                    first_name="Arthur",
                    last_name="Vance",
                    date_of_birth="1956-07-14",
                    gender="male",
                    blood_group="O+",
                    emergency_contact_name="David Vance (Son)",
                    emergency_contact_phone="+1-555-0144",
                    medical_notes="History of Essential Hypertension, Type 2 Diabetes Mellitus, and Mild Chronic Kidney Disease.",
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
