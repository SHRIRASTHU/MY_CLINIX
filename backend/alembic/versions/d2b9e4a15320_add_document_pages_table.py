"""Add document_pages table for OCR and per-page text storage

Revision ID: d2b9e4a15320
Revises: c1a8e9d34201
Create Date: 2026-11-13 15:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd2b9e4a15320'
down_revision: Union[str, None] = 'c1a8e9d34201'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    if 'document_pages' not in existing_tables:
        op.create_table(
            'document_pages',
            sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
            sa.Column('document_id', sa.String(length=36), sa.ForeignKey('documents.id', ondelete='CASCADE'), nullable=False),
            sa.Column('page_number', sa.Integer(), nullable=False),
            sa.Column('text', sa.Text(), nullable=False, server_default=''),
            sa.Column('extraction_method', sa.String(length=50), nullable=False, server_default='text_layer'),
            sa.Column('ocr_confidence', sa.Float(), nullable=False, server_default='100.0'),
            sa.Column('text_sha256', sa.String(length=64), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index('ix_document_pages_document_id', 'document_pages', ['document_id'])

def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    if 'document_pages' in existing_tables:
        op.drop_index('ix_document_pages_document_id', table_name='document_pages')
        op.drop_table('document_pages')
