"""Endpoint for initiating bulk paper crawls from arXiv queries."""

import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crawler.arxiv_client import arxiv_client, normalize_arxiv_id
from app.crawler.queue import crawler_service
from app.db.repositories.job_repository import JobRepository
from app.db.repositories.paper_repository import PaperRepository
from app.db.session import get_db
from app.schemas.crawl import CrawlRequest, CrawlResponse
from app.schemas.job import JobResponse

router = APIRouter(prefix="/crawl", tags=["crawl"])


@router.post(
    "",
    response_model=CrawlResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Crawl arXiv papers matching a query and category",
)
async def crawl_papers(
    payload: CrawlRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Crawl arXiv query results, enqueueing new papers and skipping already-indexed ones."""
    query = payload.query.strip()
    if not query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A search query must be provided.",
        )

    # 1. Search arXiv API (enforces 3-second rate limit)
    try:
        search_results = await arxiv_client.search_papers(
            query=query,
            max_results=payload.max_papers,
            category=payload.category,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to query arXiv Atom API: {str(exc)}",
        ) from exc

    job_repo = JobRepository(db)
    paper_repo = PaperRepository(db)

    queued_jobs: list[JobResponse] = []
    skipped_count = 0
    batch_id = str(uuid.uuid4())

    for meta in search_results:
        clean_id = normalize_arxiv_id(meta.arxiv_id)
        if not clean_id:
            continue

        # Check if already present in database
        existing = await paper_repo.get_by_arxiv_id(clean_id, load_annotations=False)
        if existing:
            skipped_count += 1
            continue

        # Create job
        job = await job_repo.create(clean_id)
        await db.commit()
        await db.refresh(job)

        queued_jobs.append(JobResponse.model_validate(job))
        background_tasks.add_task(crawler_service.process_paper_job, job.id, clean_id)

    return CrawlResponse(
        batch_id=batch_id,
        query=query,
        category=payload.category,
        queued_count=len(queued_jobs),
        skipped_count=skipped_count,
        jobs=queued_jobs,
    )
