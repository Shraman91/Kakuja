"""Pydantic schemas for crawling and batch ingestion."""

from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.job import JobResponse


class CrawlRequest(BaseModel):
    """Request payload for crawling arXiv search results."""

    query: str = Field(..., min_length=1, description="arXiv search term or topic")
    max_papers: int = Field(default=20, ge=1, le=100, description="Max papers to queue (1-100)")
    category: Optional[str] = Field(None, description="Optional arXiv primary category, e.g. cs.CL, cs.AI")


class CrawlResponse(BaseModel):
    """Response payload returned upon initiating a crawl."""

    batch_id: str
    query: str
    category: Optional[str] = None
    queued_count: int
    skipped_count: int
    jobs: list[JobResponse]
