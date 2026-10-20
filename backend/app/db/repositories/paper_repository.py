"""Repository for Paper and Annotation database operations."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import Annotation, Paper
from app.schemas.paper import AnnotationCreate, PaperCreate


class PaperRepository:
    """Handles CRUD, full-text search, and vector similarity operations for papers."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, paper_id: UUID, load_annotations: bool = True) -> Optional[Paper]:
        """Fetch a paper by its internal UUID."""
        stmt = select(Paper).where(Paper.id == paper_id)
        if load_annotations:
            stmt = stmt.options(selectinload(Paper.annotations))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_arxiv_id(self, arxiv_id: str, load_annotations: bool = True) -> Optional[Paper]:
        """Fetch a paper by its unique arXiv identifier."""
        clean_id = arxiv_id.strip().lower().removeprefix("arxiv:")
        stmt = select(Paper).where(func.lower(Paper.arxiv_id) == clean_id)
        if load_annotations:
            stmt = stmt.options(selectinload(Paper.annotations))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, paper_in: PaperCreate) -> Paper:
        """Create and persist a new research paper."""
        clean_id = paper_in.arxiv_id.strip().lower().removeprefix("arxiv:")
        paper = Paper(
            arxiv_id=clean_id,
            title=paper_in.title,
            authors=paper_in.authors,
            abstract=paper_in.abstract,
            categories=paper_in.categories,
            published_at=paper_in.published_at,
            pdf_url=paper_in.pdf_url,
            full_text=paper_in.full_text,
            embedding=paper_in.embedding,
        )
        self.session.add(paper)
        await self.session.flush()
        await self.session.refresh(paper)
        return paper

    async def bulk_create_annotations(
        self, paper_id: UUID, annotations_in: list[AnnotationCreate]
    ) -> list[Annotation]:
        """Bulk insert annotations for a given paper."""
        if not annotations_in:
            return []

        annotations = [
            Annotation(
                paper_id=paper_id,
                category=item.category,
                start_offset=item.start_offset,
                end_offset=item.end_offset,
                text=item.text,
                score=item.score,
            )
            for item in annotations_in
        ]
        self.session.add_all(annotations)
        await self.session.flush()
        return annotations

    async def list(
        self,
        q: Optional[str] = None,
        category: Optional[str] = None,
        published_from: Optional[datetime] = None,
        published_to: Optional[datetime] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Paper], int]:
        """Paginated paper list with full-text search and category/date filtering."""
        base_query = select(Paper)
        count_query = select(func.count(Paper.id))

        conditions = []

        # Full-text search or text filter
        if q and q.strip():
            query_str = q.strip()
            # Try PostgreSQL full-text search match if supported, with ILIKE fallback
            dialect_name = self.session.bind.dialect.name if self.session.bind else "postgresql"
            if dialect_name == "postgresql":
                ts_vector = func.to_tsvector(
                    "english",
                    func.coalesce(Paper.title, "")
                    + " "
                    + func.coalesce(Paper.abstract, "")
                    + " "
                    + func.coalesce(Paper.full_text, ""),
                )
                ts_query = func.plainto_tsquery("english", query_str)
                conditions.append(
                    or_(
                        ts_vector.op("@@")(ts_query),
                        Paper.arxiv_id.ilike(f"%{query_str}%"),
                        Paper.title.ilike(f"%{query_str}%"),
                    )
                )
            else:
                like_expr = f"%{query_str}%"
                conditions.append(
                    or_(
                        Paper.title.ilike(like_expr),
                        Paper.abstract.ilike(like_expr),
                        Paper.arxiv_id.ilike(like_expr),
                    )
                )

        # Category filter
        if category and category.strip():
            cat = category.strip()
            dialect_name = self.session.bind.dialect.name if self.session.bind else "postgresql"
            if dialect_name == "postgresql":
                conditions.append(Paper.categories.any(cat))
            else:
                conditions.append(Paper.categories.ilike(f"%{cat}%"))

        # Date range filter
        if published_from:
            conditions.append(Paper.published_at >= published_from)
        if published_to:
            conditions.append(Paper.published_at <= published_to)

        if conditions:
            base_query = base_query.where(*conditions)
            count_query = count_query.where(*conditions)

        # Total count
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        # Ordering and pagination
        offset = (page - 1) * page_size
        stmt = base_query.order_by(desc(Paper.created_at)).offset(offset).limit(page_size)
        result = await self.session.execute(stmt)
        items = list(result.scalars().all())

        return items, total

    async def get_related(self, arxiv_id: str, limit: int = 5) -> list[tuple[Paper, float]]:
        """Find the top N most semantically similar papers using pgvector cosine similarity."""
        target_paper = await self.get_by_arxiv_id(arxiv_id, load_annotations=False)
        if not target_paper or target_paper.embedding is None:
            return []

        distance_expr = Paper.embedding.cosine_distance(target_paper.embedding)
        stmt = (
            select(Paper, distance_expr.label("distance"))
            .where(Paper.id != target_paper.id)
            .where(Paper.embedding.is_not(None))
            .order_by(distance_expr.asc())
            .limit(limit)
        )

        result = await self.session.execute(stmt)
        rows = result.all()

        related = []
        for paper, distance in rows:
            # Cosine similarity = 1.0 - cosine_distance
            sim = 1.0 - float(distance) if distance is not None else 0.0
            sim = max(0.0, min(1.0, sim))
            related.append((paper, round(sim, 4)))

        return related
