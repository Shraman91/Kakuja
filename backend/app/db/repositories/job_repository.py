"""Repository for fetch job status and progress tracking."""

from typing import Optional
from uuid import UUID

from sqlalchemy import desc, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import FetchJob


class JobRepository:
    """Manages background fetch job lifecycle and status updates."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, arxiv_id: str) -> FetchJob:
        """Create a new queued fetch job."""
        clean_id = arxiv_id.strip().lower().removeprefix("arxiv:")
        job = FetchJob(
            arxiv_id=clean_id,
            status="queued",
            progress=0,
            error=None,
        )
        self.session.add(job)
        await self.session.flush()
        await self.session.refresh(job)
        return job

    async def get_by_id(self, job_id: UUID) -> Optional[FetchJob]:
        """Retrieve a job by its unique ID."""
        stmt = select(FetchJob).where(FetchJob.id == job_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_latest_for_arxiv_id(self, arxiv_id: str) -> Optional[FetchJob]:
        """Retrieve the most recent job for a specific arXiv ID."""
        clean_id = arxiv_id.strip().lower().removeprefix("arxiv:")
        stmt = (
            select(FetchJob)
            .where(func.lower(FetchJob.arxiv_id) == clean_id)
            .order_by(desc(FetchJob.created_at))
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def update_status(
        self,
        job_id: UUID,
        status: str,
        progress: int,
        error: Optional[str] = None,
    ) -> Optional[FetchJob]:
        """Update job status, progress percentage, and optional error message."""
        stmt = (
            update(FetchJob)
            .where(FetchJob.id == job_id)
            .values(
                status=status,
                progress=progress,
                error=error,
                updated_at=func.now(),
            )
            .returning(FetchJob)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def reset_stale_jobs(self) -> int:
        """Reset jobs left in progress on system startup to 'failed'."""
        in_progress_statuses = ["queued", "fetching_metadata", "downloading_pdf", "analyzing"]
        stmt = (
            update(FetchJob)
            .where(FetchJob.status.in_(in_progress_statuses))
            .values(
                status="failed",
                error="Interrupted by system restart",
                updated_at=func.now(),
            )
        )
        result = await self.session.execute(stmt)
        return result.rowcount
