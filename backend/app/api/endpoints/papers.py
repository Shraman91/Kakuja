"""Endpoints for paper ingestion, reader retrieval, library search, and recommendations."""

from datetime import datetime
from math import ceil
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crawler.arxiv_client import normalize_arxiv_id
from app.crawler.queue import crawler_service
from app.db.repositories.job_repository import JobRepository
from app.db.repositories.paper_repository import PaperRepository
from app.db.session import get_db
from app.schemas.job import FetchPaperRequest, JobResponse
from app.schemas.paper import (
    PaperDetailResponse,
    PaperListItem,
    PaperListResponse,
    RelatedPaperResponse,
)

router = APIRouter(prefix="/papers", tags=["papers"])


@router.post(
    "/fetch",
    response_model=JobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Enqueue a paper fetch and analysis job",
)
async def fetch_paper(
    payload: FetchPaperRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Enqueue a job to fetch paper metadata, download PDF, extract text, and analyze key concepts."""
    clean_id = normalize_arxiv_id(payload.arxiv_id)
    if not clean_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid arXiv ID must be provided (e.g. '1706.03762').",
        )

    job_repo = JobRepository(db)
    paper_repo = PaperRepository(db)

    # If paper is already indexed, return an instantly completed job
    existing = await paper_repo.get_by_arxiv_id(clean_id, load_annotations=False)
    if existing:
        job = await job_repo.create(clean_id)
        await job_repo.update_status(job.id, status="completed", progress=100)
        await db.commit()
        await db.refresh(job)
        return job

    # Create new queued job
    job = await job_repo.create(clean_id)
    await db.commit()
    await db.refresh(job)

    # Dispatch to background task worker
    background_tasks.add_task(crawler_service.process_paper_job, job.id, clean_id)

    return job


@router.get(
    "",
    response_model=PaperListResponse,
    summary="List and search indexed papers",
)
async def list_papers(
    q: Optional[str] = Query(None, description="Full-text search query across title, abstract, text"),
    category: Optional[str] = Query(None, description="Filter by category (e.g. cs.CL)"),
    published_from: Optional[datetime] = Query(None, description="Filter papers published on or after date"),
    published_to: Optional[datetime] = Query(None, description="Filter papers published on or before date"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve paginated papers from the library with full-text search and category filtering."""
    paper_repo = PaperRepository(db)
    items, total = await paper_repo.list(
        q=q,
        category=category,
        published_from=published_from,
        published_to=published_to,
        page=page,
        page_size=page_size,
    )
    pages = ceil(total / page_size) if total > 0 else 0

    return PaperListResponse(
        items=[PaperListItem.model_validate(p) for p in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get(
    "/{arxiv_id}",
    response_model=PaperDetailResponse,
    summary="Get paper details, full text, and highlights for reader",
)
async def get_paper(arxiv_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve complete paper record including extracted full text and offset annotations."""
    clean_id = normalize_arxiv_id(arxiv_id)
    paper_repo = PaperRepository(db)
    paper = await paper_repo.get_by_arxiv_id(clean_id, load_annotations=True)

    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Paper with arXiv ID '{clean_id}' was not found in the library.",
        )

    return paper


@router.get(
    "/{arxiv_id}/related",
    response_model=list[RelatedPaperResponse],
    summary="Get related papers via semantic vector similarity",
)
async def get_related_papers(
    arxiv_id: str,
    limit: int = Query(5, ge=1, le=20, description="Number of related papers to return"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve top related papers using pgvector cosine similarity."""
    clean_id = normalize_arxiv_id(arxiv_id)
    paper_repo = PaperRepository(db)

    paper = await paper_repo.get_by_arxiv_id(clean_id, load_annotations=False)
    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Paper with arXiv ID '{clean_id}' was not found.",
        )

    related = await paper_repo.get_related(clean_id, limit=limit)
    response_items = []
    for rel_paper, sim in related:
        item_dict = {
            "id": rel_paper.id,
            "arxiv_id": rel_paper.arxiv_id,
            "title": rel_paper.title,
            "authors": rel_paper.authors or [],
            "abstract": rel_paper.abstract,
            "categories": rel_paper.categories or [],
            "published_at": rel_paper.published_at,
            "pdf_url": rel_paper.pdf_url,
            "similarity_score": sim,
        }
        response_items.append(RelatedPaperResponse.model_validate(item_dict))

    return response_items
