"""Add audit logs, patient consent records, and document soft-deletion retention fields

Revision ID: e3c1f5b26431
Revises: d2b9e4a15320
Create Date: 2026-11-13 18:10:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e3c1f5b26431'
down_revision: Union[str, None] = 'd2b9e4a15320'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    # 1. Create audit_logs table
    if 'audit_logs' not in existing_tables:
        op.create_table(
            'audit_logs',
            sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
            sa.Column('actor_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('actor_role', sa.String(length=50), nullable=True),
            sa.Column('patient_id', sa.String(length=36), nullable=True),
            sa.Column('document_id', sa.String(length=36), nullable=True),
            sa.Column('action', sa.String(length=100), nullable=False),
            sa.Column('outcome', sa.String(length=50), nullable=False, server_default='success'),
            sa.Column('request_ip', sa.String(length=64), nullable=True),
            sa.Column('user_agent_hash', sa.String(length=64), nullable=True),
            sa.Column('extra_context', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index('ix_audit_logs_action', 'audit_logs', ['action'])
        op.create_index('ix_audit_logs_actor_id', 'audit_logs', ['actor_id'])
        op.create_index('ix_audit_logs_patient_id', 'audit_logs', ['patient_id'])
        op.create_index('ix_audit_logs_created_at', 'audit_logs', ['created_at'])

    # 2. Create consent_records table
    if 'consent_records' not in existing_tables:
        op.create_table(
            'consent_records',
            sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
            sa.Column('patient_id', sa.String(length=36), sa.ForeignKey('patients.id', ondelete='CASCADE'), nullable=False),
            sa.Column('doctor_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('access_level', sa.String(length=50), nullable=False, server_default='read_only'),
            sa.Column('scope', sa.Text(), nullable=True),
            sa.Column('granted_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column('granted_by_id', sa.String(length=36), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('revoked_by_id', sa.String(length=36), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('revocation_reason', sa.Text(), nullable=True),
            sa.Column('status', sa.String(length=50), nullable=False, server_default='active'),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index('ix_consent_records_patient_id', 'consent_records', ['patient_id'])
        op.create_index('ix_consent_records_doctor_id', 'consent_records', ['doctor_id'])
        op.create_index('ix_consent_records_status', 'consent_records', ['status'])

    # 3. Add retention, versioning and clinic columns to documents table
    if 'documents' in existing_tables:
        doc_cols = [c['name'] for c in inspector.get_columns('documents')]
        with op.batch_alter_table('documents', schema=None) as batch_op:
            if 'source_hospital_or_clinic' not in doc_cols:
                batch_op.add_column(sa.Column('source_hospital_or_clinic', sa.String(length=255), nullable=True))
            if 'version_number' not in doc_cols:
                batch_op.add_column(sa.Column('version_number', sa.Integer(), nullable=False, server_default='1'))
            if 'is_deleted' not in doc_cols:
                batch_op.add_column(sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='0'))
            if 'deleted_at' not in doc_cols:
                batch_op.add_column(sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
            if 'deleted_by_id' not in doc_cols:
                batch_op.add_column(sa.Column('deleted_by_id', sa.String(length=36), nullable=True))
            if 'deletion_reason' not in doc_cols:
                batch_op.add_column(sa.Column('deletion_reason', sa.Text(), nullable=True))

def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    if 'consent_records' in existing_tables:
        op.drop_table('consent_records')
    if 'audit_logs' in existing_tables:
        op.drop_table('audit_logs')
