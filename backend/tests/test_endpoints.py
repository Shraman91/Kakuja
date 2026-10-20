"""Integration tests for REST API endpoints using test database and mock crawler."""

import uuid
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from app.crawler.arxiv_client import ArxivMetadata
from app.db.repositories.paper_repository import PaperRepository
from app.schemas.paper import AnnotationCreate, PaperCreate


@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient):
    """Test health check endpoint."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"


@pytest.mark.asyncio
async def test_fetch_paper_enqueues_job(client: AsyncClient):
    """Test POST /papers/fetch enqueues background job."""
    with patch("app.crawler.queue.crawler_service.process_paper_job", new_callable=AsyncMock):
        response = await client.post("/papers/fetch", json={"arxiv_id": "1706.03762"})
        assert response.status_code == 202
        data = response.json()
        assert data["arxiv_id"] == "1706.03762"
        assert data["status"] == "queued"
        assert "id" in data

        job_id = data["id"]
        # Poll job status
        job_res = await client.get(f"/jobs/{job_id}")
        assert job_res.status_code == 200
        job_data = job_res.json()
        assert job_data["id"] == job_id
        assert job_data["arxiv_id"] == "1706.03762"


@pytest.mark.asyncio
async def test_get_nonexistent_job(client: AsyncClient):
    """Test GET /jobs/{job_id} returns 404 for unknown job."""
    fake_id = str(uuid.uuid4())
    response = await client.get(f"/jobs/{fake_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_paper_reader_and_annotations(client: AsyncClient, test_session):
    """Test GET /papers/{arxiv_id} returns full text, metadata, and annotations."""
    paper_repo = PaperRepository(test_session)
    paper = await paper_repo.create(
        PaperCreate(
            arxiv_id="1706.03762",
            title="Attention Is All You Need",
            authors=["Ashish Vaswani", "Noam Shazeer"],
            abstract="The Transformer is based on self-attention mechanisms.",
            categories=["cs.CL", "cs.AI"],
            pdf_url="https://arxiv.org/pdf/1706.03762.pdf",
            full_text="The Transformer establishes 28.4 BLEU on WMT 2014 English-to-German.",
            embedding=[0.05] * 384,
        )
    )
    await paper_repo.bulk_create_annotations(
        paper.id,
        [
            AnnotationCreate(
                category="result",
                start_offset=28,
                end_offset=37,
                text="28.4 BLEU",
                score=1.0,
            ),
            AnnotationCreate(
                category="method",
                start_offset=4,
                end_offset=15,
                text="Transformer",
                score=0.9,
            ),
        ],
    )
    await test_session.commit()

    # Query reader endpoint
    response = await client.get("/papers/1706.03762")
    assert response.status_code == 200
    data = response.json()
    assert data["arxiv_id"] == "1706.03762"
    assert data["title"] == "Attention Is All You Need"
    assert len(data["annotations"]) == 2
    assert data["annotations"][0]["category"] in ["result", "method"]


@pytest.mark.asyncio
async def test_list_papers_pagination(client: AsyncClient, test_session):
    """Test GET /papers lists papers with pagination."""
    paper_repo = PaperRepository(test_session)
    for i in range(5):
        await paper_repo.create(
            PaperCreate(
                arxiv_id=f"2401.0000{i}",
                title=f"Sample Research Paper {i}",
                authors=["Author A"],
                abstract=f"Abstract of paper {i}",
                categories=["cs.LG"],
            )
        )
    await test_session.commit()

    response = await client.get("/papers?page=1&page_size=3")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 5
    assert len(data["items"]) == 3
    assert data["pages"] == 2


@pytest.mark.asyncio
async def test_crawl_endpoint(client: AsyncClient):
    """Test POST /crawl enqueues papers returned from arXiv search."""
    mock_results = [
        ArxivMetadata(
            arxiv_id="2401.00001",
            title="Paper One",
            authors=["A"],
            abstract="Summary 1",
            categories=["cs.AI"],
            published_at=None,
            pdf_url="http://arxiv.org/pdf/2401.00001.pdf",
        ),
        ArxivMetadata(
            arxiv_id="2401.00002",
            title="Paper Two",
            authors=["B"],
            abstract="Summary 2",
            categories=["cs.AI"],
            published_at=None,
            pdf_url="http://arxiv.org/pdf/2401.00002.pdf",
        ),
    ]

    with patch("app.crawler.arxiv_client.arxiv_client.search_papers", new_callable=AsyncMock) as mock_search:
        mock_search.return_value = mock_results
        with patch("app.crawler.queue.crawler_service.process_paper_job", new_callable=AsyncMock):
            response = await client.post("/crawl", json={"query": "diffusion models", "max_papers": 5})
            assert response.status_code == 202
            data = response.json()
            assert data["queued_count"] == 2
            assert data["skipped_count"] == 0
            assert len(data["jobs"]) == 2
