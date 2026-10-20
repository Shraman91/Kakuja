"""Initial schema with pgvector, papers, annotations, and fetch_jobs

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-10-20 18:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    # 2. Create papers table
    op.create_table(
        "papers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("arxiv_id", sa.String(length=32), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("authors", postgresql.ARRAY(sa.String()), nullable=False, server_default="{}"),
        sa.Column("abstract", sa.Text(), nullable=False),
        sa.Column("categories", postgresql.ARRAY(sa.String()), nullable=False, server_default="{}"),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("pdf_url", sa.String(length=512), nullable=True),
        sa.Column("full_text", sa.Text(), nullable=True),
        sa.Column("embedding", Vector(384), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # Papers indexes
    op.create_index("idx_papers_arxiv_id", "papers", ["arxiv_id"], unique=True)
    op.execute(
        """
        CREATE INDEX idx_papers_fts ON papers USING gin (
            to_tsvector('english', coalesce(title, '') || ' ' || coalesce(abstract, '') || ' ' || coalesce(full_text, ''))
        );
        """
    )
    op.execute(
        """
        CREATE INDEX idx_papers_embedding_hnsw ON papers USING hnsw (
            embedding vector_cosine_ops
        ) WITH (m = 16, ef_construction = 64);
        """
    )

    # 3. Create annotations table
    op.create_table(
        "annotations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "paper_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("papers.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("start_offset", sa.Integer(), nullable=False),
        sa.Column("end_offset", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("score", sa.Float(), nullable=False, server_default="1.0"),
    )
    op.create_index("idx_annotations_paper_id", "annotations", ["paper_id"])
    op.create_index("idx_annotations_paper_start", "annotations", ["paper_id", "start_offset"])

    # 4. Create fetch_jobs table
    op.create_table(
        "fetch_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("arxiv_id", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="queued"),
        sa.Column("progress", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("idx_fetch_jobs_arxiv_id", "fetch_jobs", ["arxiv_id"])
    op.create_index("idx_fetch_jobs_status", "fetch_jobs", ["status"])


def downgrade() -> None:
    op.drop_table("fetch_jobs")
    op.drop_table("annotations")
    op.drop_table("papers")
    op.execute("DROP EXTENSION IF EXISTS vector;")
