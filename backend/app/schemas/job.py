"""Pydantic schemas for fetch jobs and status tracking."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class FetchPaperRequest(BaseModel):
    """Request payload to initiate paper fetch."""

    arxiv_id: str = Field(..., description="arXiv ID (e.g. '1706.03762' or 'arxiv:1706.03762')")


class JobResponse(BaseModel):
    """Response payload for job status."""

    id: UUID
    arxiv_id: str
    status: str = Field(
        ...,
        description="Current status: queued, fetching_metadata, downloading_pdf, analyzing, completed, failed",
    )
    progress: int = Field(..., ge=0, le=100, description="Progress percentage (0-100)")
    error: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
