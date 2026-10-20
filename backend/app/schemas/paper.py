"""Pydantic schemas for research papers and annotations."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AnnotationBase(BaseModel):
    """Base schema for extracted annotations."""

    category: str = Field(..., description="Annotation category: concept, method, result, dataset")
    start_offset: int = Field(..., ge=0, description="0-indexed start character offset in full_text")
    end_offset: int = Field(..., ge=0, description="0-indexed end character offset in full_text")
    text: str = Field(..., description="Matched text in paper")
    score: float = Field(default=1.0, description="Confidence or relevance score")


class AnnotationCreate(AnnotationBase):
    """Schema for creating a new annotation."""

    pass


class AnnotationResponse(AnnotationBase):
    """Schema for reading an annotation."""

    id: UUID
    paper_id: UUID

    model_config = ConfigDict(from_attributes=True)


class PaperBase(BaseModel):
    """Base schema for research papers."""

    arxiv_id: str = Field(..., description="arXiv identifier, e.g. 1706.03762")
    title: str
    authors: list[str] = Field(default_factory=list)
    abstract: str
    categories: list[str] = Field(default_factory=list)
    published_at: Optional[datetime] = None
    pdf_url: Optional[str] = None


class PaperCreate(PaperBase):
    """Schema for inserting a new paper."""

    full_text: Optional[str] = None
    embedding: Optional[list[float]] = None


class PaperListItem(PaperBase):
    """Summary item schema for paper listings and search results."""

    id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaperDetailResponse(PaperBase):
    """Comprehensive paper detail schema including full text and annotations."""

    id: UUID
    full_text: Optional[str] = None
    created_at: datetime
    annotations: list[AnnotationResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class PaperListResponse(BaseModel):
    """Paginated response for paper listings."""

    items: list[PaperListItem]
    total: int
    page: int
    page_size: int
    pages: int


class RelatedPaperResponse(PaperBase):
    """Related paper recommendation item with similarity score."""

    id: UUID
    similarity_score: float = Field(..., ge=0.0, le=1.0, description="Cosine similarity score (0.0 to 1.0)")

    model_config = ConfigDict(from_attributes=True)
