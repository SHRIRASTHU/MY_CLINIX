from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

import logging
from typing import Generator
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

logger = logging.getLogger("myclinix.database")

db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+psycopg://", 1)
elif db_url.startswith("postgresql://") and "+" not in db_url.split("://")[0]:
    db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)

is_sqlite = db_url.startswith("sqlite")

connect_args = {"check_same_thread": False} if is_sqlite else {}
engine_kwargs = {
    "connect_args": connect_args,
    "echo": False,
}

if not is_sqlite:
    engine_kwargs.update({
        "pool_pre_ping": True,
        "pool_size": 10,
        "max_overflow": 20,
        "pool_recycle": 300,
    })

engine = create_engine(db_url, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Generator[Session, None, None]:
    """Dependency for obtaining a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initializes tables using SQLAlchemy metadata and performs automatic schema healing."""
    from app.database.base import Base
    import app.models  # Ensure all models are registered

    # 1. Ensure all declared tables exist
    Base.metadata.create_all(bind=engine)

    # 2. Schema self-healing: verify and add missing columns for existing databases
    try:
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        if "users" in existing_tables:
            user_columns = [col["name"] for col in inspector.get_columns("users")]
            with engine.begin() as conn:
                if "is_verified" not in user_columns:
                    logger.info("Self-healing database: adding missing 'is_verified' column to users table")
                    default_bool = "1" if is_sqlite else "TRUE"
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT {default_bool} NOT NULL"))

                # Migrate legacy medical reviewer roles to doctor
                conn.execute(text("UPDATE users SET role = 'doctor' WHERE role = 'medical_reviewer'"))
                # If doctor@myclinix.org exists, remove stale reviewer@myclinix.org, otherwise rename
                doctor_exists = conn.execute(text("SELECT id FROM users WHERE email = 'doctor@myclinix.org'")).fetchone()
                if doctor_exists:
                    conn.execute(text("DELETE FROM users WHERE email = 'reviewer@myclinix.org'"))
                else:
                    conn.execute(text("UPDATE users SET email = 'doctor@myclinix.org', full_name = 'Dr. Sarah Lin (Lead Physician)' WHERE email = 'reviewer@myclinix.org'"))
                conn.execute(text("DELETE FROM users WHERE role = 'caregiver'"))
    except Exception as e:
        logger.warning(f"Database schema self-healing warning: {e}")

    # 3. Seed demonstration accounts if database is empty or accounts are missing
    try:
        from app.models.user import User
        needs_seed = False
        with SessionLocal() as db:
            admin_user = db.query(User).filter(User.email == "admin@myclinix.org").first()
            doctor_user = db.query(User).filter(User.email == "doctor@myclinix.org").first()
            patient_user = db.query(User).filter(User.email == "patient@myclinix.org").first()
            if not (admin_user and doctor_user and patient_user):
                needs_seed = True

        if needs_seed:
            logger.info("Demonstration accounts missing in database. Running database seed...")
            from app.database.seed import seed_database
            seed_database()
    except Exception as e:
        logger.warning(f"Database auto-seed check warning: {e}")

    # 4. Stamp alembic_version to avoid migration conflicts on startup
    try:
        with engine.begin() as conn:
            inspector = inspect(engine)
            if "alembic_version" in inspector.get_table_names():
                rows = conn.execute(text("SELECT version_num FROM alembic_version")).fetchall()
                if not rows:
                    conn.execute(text("INSERT INTO alembic_version (version_num) VALUES ('c1a8e9d34201')"))
                else:
                    conn.execute(text("UPDATE alembic_version SET version_num = 'c1a8e9d34201'"))
    except Exception as e:
        logger.warning(f"Alembic tracking stamp warning: {e}")
