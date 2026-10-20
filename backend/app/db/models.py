"""SQLAlchemy 2.0 ORM models for papers, annotations, and fetch jobs."""

import json
import uuid
from typing import Any

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    TypeDecorator,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import relationship

from app.db.session import Base


class StringArrayType(TypeDecorator):
    """Platform-independent string array type.

    Uses PostgreSQL ARRAY(String) on Postgres and JSON on SQLite.
    """

    impl = Text
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(ARRAY(String))
        return dialect.type_descriptor(Text())

    def process_bind_param(self, value: Any, dialect):
        if value is None:
            return None
        if dialect.name == "postgresql":
            return list(value)
        return json.dumps(list(value))

    def process_result_value(self, value: Any, dialect):
        if value is None:
            return []
        if dialect.name == "postgresql":
            return list(value)
        try:
            return json.loads(value)
        except Exception:
            return []


class Paper(Base):
    """Model representing an indexed arXiv research paper."""

    __tablename__ = "papers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    arxiv_id = Column(String(32), unique=True, nullable=False, index=True)
    title = Column(Text, nullable=False)
    authors = Column(StringArrayType, nullable=False, default=list)
    abstract = Column(Text, nullable=False)
    categories = Column(StringArrayType, nullable=False, default=list)
    published_at = Column(DateTime(timezone=True), nullable=True)
    pdf_url = Column(String(512), nullable=True)
    full_text = Column(Text, nullable=True)
    embedding = Column(Vector(384), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    annotations = relationship(
        "Annotation",
        back_populates="paper",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="Annotation.start_offset",
    )

    __table_args__ = (Index("ix_papers_created_at", created_at.desc()),)


class Annotation(Base):
    """Extracted character-offset highlight annotation within paper full text."""

    __tablename__ = "annotations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    paper_id = Column(
        UUID(as_uuid=True),
        ForeignKey("papers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category = Column(String(32), nullable=False)  # 'concept', 'method', 'result', 'dataset'
    start_offset = Column(Integer, nullable=False)
    end_offset = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    score = Column(Float, nullable=False, default=1.0)

    # Relationship
    paper = relationship("Paper", back_populates="annotations")

    __table_args__ = (Index("ix_annotations_paper_start", "paper_id", "start_offset"),)


class FetchJob(Base):
    """Background ingestion and crawl job status record."""

    __tablename__ = "fetch_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    arxiv_id = Column(String(32), nullable=False, index=True)
    status = Column(
        String(32), nullable=False, default="queued", index=True
    )  # 'queued', 'fetching_metadata', 'downloading_pdf', 'analyzing', 'completed', 'failed'
    progress = Column(Integer, nullable=False, default=0)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
