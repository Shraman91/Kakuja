"""Background worker and ingestion pipeline for single papers and batch crawls."""

import logging
from uuid import UUID

from app.analysis.analyzer import default_analyzer
from app.crawler.arxiv_client import arxiv_client, normalize_arxiv_id
from app.crawler.pdf_extractor import extract_text_from_pdf
from app.db.repositories.job_repository import JobRepository
from app.db.repositories.paper_repository import PaperRepository
from app.db.session import async_session_maker
from app.schemas.paper import AnnotationCreate, PaperCreate

logger = logging.getLogger(__name__)


class CrawlerService:
    """Orchestrates paper ingestion, text extraction, analysis, and persistence."""

    def __init__(self, analyzer=default_analyzer):
        self.analyzer = analyzer

    async def process_paper_job(self, job_id: UUID, raw_arxiv_id: str) -> None:
        """Execute full fetch pipeline for a single paper within a background task."""
        clean_id = normalize_arxiv_id(raw_arxiv_id)

        async with async_session_maker() as session:
            job_repo = JobRepository(session)
            paper_repo = PaperRepository(session)

            try:
                # 1. Idempotency Check: if paper already stored in database
                existing_paper = await paper_repo.get_by_arxiv_id(clean_id, load_annotations=False)
                if existing_paper is not None:
                    logger.info("Paper '%s' is already indexed in DB. Reusing cached result.", clean_id)
                    await job_repo.update_status(job_id, status="completed", progress=100)
                    await session.commit()
                    return

                # 2. Fetch Metadata from arXiv Atom API
                await job_repo.update_status(job_id, status="fetching_metadata", progress=20)
                await session.commit()

                meta = await arxiv_client.fetch_paper_metadata(clean_id)
                if not meta:
                    error_msg = f"Paper '{clean_id}' was not found in the arXiv registry."
                    logger.warning(error_msg)
                    await job_repo.update_status(job_id, status="failed", progress=20, error=error_msg)
                    await session.commit()
                    return

                # 3. Download PDF directly from official URL
                await job_repo.update_status(job_id, status="downloading_pdf", progress=40)
                await session.commit()

                pdf_bytes = await arxiv_client.download_pdf_bytes(clean_id)

                # 4. Extract Text with PyMuPDF
                await job_repo.update_status(job_id, status="downloading_pdf", progress=60)
                await session.commit()

                try:
                    full_text = await extract_text_from_pdf(pdf_bytes)
                except Exception as exc:
                    logger.warning(
                        "Could not extract full text from PDF for '%s': %s. Falling back to abstract.",
                        clean_id,
                        exc,
                    )
                    full_text = meta.abstract

                if not full_text or len(full_text.strip()) < 50:
                    full_text = meta.abstract

                # 5. Extract Highlights & Compute Vector Embedding
                await job_repo.update_status(job_id, status="analyzing", progress=80)
                await session.commit()

                analysis_result = await self.analyzer.analyze(
                    title=meta.title,
                    abstract=meta.abstract,
                    full_text=full_text,
                )

                # 6. Persist Paper and Annotations
                paper_create = PaperCreate(
                    arxiv_id=clean_id,
                    title=meta.title,
                    authors=meta.authors,
                    abstract=meta.abstract,
                    categories=meta.categories,
                    published_at=meta.published_at,
                    pdf_url=meta.pdf_url,
                    full_text=full_text,
                    embedding=analysis_result.embedding,
                )
                paper = await paper_repo.create(paper_create)

                annotations_create = [
                    AnnotationCreate(
                        category=item.category,
                        start_offset=item.start_offset,
                        end_offset=item.end_offset,
                        text=item.text,
                        score=item.score,
                    )
                    for item in analysis_result.annotations
                ]
                await paper_repo.bulk_create_annotations(paper.id, annotations_create)

                # Mark Job Completed
                await job_repo.update_status(job_id, status="completed", progress=100)
                await session.commit()
                logger.info(
                    "Successfully ingested paper '%s' (%d annotations)", clean_id, len(annotations_create)
                )

            except Exception as exc:
                logger.error("Error processing paper job %s (%s): %s", job_id, clean_id, exc, exc_info=True)
                await session.rollback()
                try:
                    await job_repo.update_status(job_id, status="failed", progress=0, error=str(exc))
                    await session.commit()
                except Exception as commit_exc:
                    logger.error("Failed to commit job failure state: %s", commit_exc)


crawler_service = CrawlerService()
