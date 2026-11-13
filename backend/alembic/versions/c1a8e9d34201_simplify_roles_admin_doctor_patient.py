"""Simplify user roles to Administrator, Doctor, and Patient

Revision ID: c1a8e9d34201
Revises: 53ef82835fbe
Create Date: 2026-11-12 23:25:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c1a8e9d34201'
down_revision: Union[str, None] = '53ef82835fbe'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Add is_verified column to users table with SQLite batch mode support
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [col['name'] for col in inspector.get_columns('users')]
    if 'is_verified' not in columns:
        with op.batch_alter_table('users', schema=None) as batch_op:
            batch_op.add_column(sa.Column('is_verified', sa.Boolean(), server_default='1', nullable=False))

    # 2. Migrate legacy roles in users table
    # Convert 'medical_reviewer' to 'doctor'
    bind.execute(
        sa.text("UPDATE users SET role = 'doctor' WHERE role = 'medical_reviewer'")
    )
    bind.execute(
        sa.text("UPDATE users SET email = 'doctor@myclinix.org', full_name = 'Dr. Sarah Lin (Lead Physician)' WHERE email = 'reviewer@myclinix.org'")
    )

    # 3. Clean up caregiver access and users
    bind.execute(
        sa.text("DELETE FROM patient_access WHERE access_level = 'caregiver'")
    )
    bind.execute(
        sa.text("DELETE FROM users WHERE role = 'caregiver'")
    )

    # 4. Migrate 'reviewer' access_level to 'doctor' in patient_access
    bind.execute(
        sa.text("UPDATE patient_access SET access_level = 'doctor' WHERE access_level = 'reviewer'")
    )

def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text("UPDATE users SET role = 'medical_reviewer' WHERE role = 'doctor'")
    )
    bind.execute(
        sa.text("UPDATE patient_access SET access_level = 'reviewer' WHERE access_level = 'doctor'")
    )
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('is_verified')
