"""Official arXiv API and PDF client with rate limiting, retries, and Atom feed parsing."""

import asyncio
import logging
import re
from datetime import datetime
from typing import Any, Optional

import feedparser
import httpx

from app.core.config import settings
from app.core.rate_limiter import arxiv_rate_limiter

logger = logging.getLogger(__name__)

# Regex to extract canonical arXiv ID without version, e.g. '1706.03762' or 'math/0211159'
ARXIV_ID_PATTERN = re.compile(
    r"(?:arxiv:)?([0-9]{4}\.[0-9]{4,5}|[a-z\-]+(?:\.[A-Z]{2})?/\d{7})(?:v\d+)?", re.IGNORECASE
)


def normalize_arxiv_id(arxiv_id: str) -> str:
    """Extract and normalize an arXiv ID to its canonical unversioned string.

    Examples:
        '1706.03762v5' -> '1706.03762'
        'arXiv:1706.03762' -> '1706.03762'
        'http://arxiv.org/abs/1706.03762v1' -> '1706.03762'
    """
    clean = arxiv_id.strip()
    match = ARXIV_ID_PATTERN.search(clean)
    if match:
        return match.group(1).lower()
    return clean.lower()


class ArxivMetadata:
    """Structured paper metadata retrieved from arXiv Atom feed."""

    def __init__(
        self,
        arxiv_id: str,
        title: str,
        authors: list[str],
        abstract: str,
        categories: list[str],
        published_at: Optional[datetime],
        pdf_url: str,
    ):
        self.arxiv_id = arxiv_id
        self.title = title
        self.authors = authors
        self.abstract = abstract
        self.categories = categories
        self.published_at = published_at
        self.pdf_url = pdf_url

    def to_dict(self) -> dict[str, Any]:
        return {
            "arxiv_id": self.arxiv_id,
            "title": self.title,
            "authors": self.authors,
            "abstract": self.abstract,
            "categories": self.categories,
            "published_at": self.published_at,
            "pdf_url": self.pdf_url,
        }


class ArxivClient:
    """Async client interacting with official arXiv endpoints according to terms of service."""

    def __init__(
        self,
        api_url: str = settings.ARXIV_API_URL,
        pdf_base_url: str = settings.ARXIV_PDF_BASE_URL,
        user_agent: str = settings.ARXIV_USER_AGENT,
        timeout: float = settings.ARXIV_TIMEOUT_SECONDS,
        max_retries: int = settings.ARXIV_MAX_RETRIES,
    ):
        self.api_url = api_url
        self.pdf_base_url = pdf_base_url
        self.user_agent = user_agent
        self.timeout = timeout
        self.max_retries = max_retries
        self.headers = {
            "User-Agent": self.user_agent,
            "Accept": "application/atom+xml, application/pdf, */*",
        }

    async def _execute_with_retry(
        self,
        url: str,
        params: Optional[dict[str, Any]] = None,
        is_binary: bool = False,
    ) -> httpx.Response:
        """Execute HTTP request with strict rate limiting and exponential backoff on 5xx/timeouts."""
        last_exception: Optional[Exception] = None

        for attempt in range(1, self.max_retries + 1):
            try:
                # Wait for global 3-second rate limiter
                await arxiv_rate_limiter.acquire()

                async with httpx.AsyncClient(
                    headers=self.headers,
                    timeout=self.timeout,
                    follow_redirects=True,
                ) as client:
                    logger.debug("Requesting arXiv (attempt %d/%d): %s", attempt, self.max_retries, url)
                    response = await client.get(url, params=params)

                    # If server returns 5xx or 429, retry
                    if response.status_code in (429, 500, 502, 503, 504):
                        logger.warning(
                            "arXiv responded with status %d on %s. Retrying in %ds...",
                            response.status_code,
                            url,
                            2**attempt,
                        )
                        await asyncio.sleep(2**attempt)
                        continue

                    response.raise_for_status()
                    return response

            except (httpx.TimeoutException, httpx.NetworkError, httpx.HTTPStatusError) as exc:
                last_exception = exc
                wait_time = 2**attempt
                logger.warning(
                    "Network error accessing arXiv (%s). Retrying in %ds... Error: %s",
                    url,
                    wait_time,
                    str(exc),
                )
                await asyncio.sleep(wait_time)

        raise RuntimeError(
            f"Failed to fetch from arXiv after {self.max_retries} attempts ({url}): {last_exception}"
        ) from last_exception

    def _parse_entry(self, entry: Any) -> ArxivMetadata:
        """Parse feedparser entry into ArxivMetadata."""
        raw_id = entry.get("id", "")
        arxiv_id = normalize_arxiv_id(raw_id)

        # Clean title (remove newlines and excessive whitespace)
        title = " ".join(entry.get("title", "").replace("\n", " ").split())

        # Clean abstract
        abstract = " ".join(entry.get("summary", "").replace("\n", " ").split())

        # Authors
        authors = [a.get("name", "").strip() for a in entry.get("authors", []) if a.get("name")]

        # Categories
        categories = [t.get("term", "").strip() for t in entry.get("tags", []) if t.get("term")]

        # Published date
        published_at = None
        if "published_parsed" in entry and entry.published_parsed:
            published_at = datetime(*entry.published_parsed[:6])

        # PDF URL
        pdf_url = f"{self.pdf_base_url}/{arxiv_id}.pdf"
        for link in entry.get("links", []):
            if link.get("title") == "pdf" or link.get("type") == "application/pdf":
                pdf_url = link.get("href", pdf_url)
                break

        return ArxivMetadata(
            arxiv_id=arxiv_id,
            title=title,
            authors=authors,
            abstract=abstract,
            categories=categories,
            published_at=published_at,
            pdf_url=pdf_url,
        )

    async def fetch_paper_metadata(self, arxiv_id: str) -> Optional[ArxivMetadata]:
        """Fetch metadata for a single arXiv paper by its ID."""
        clean_id = normalize_arxiv_id(arxiv_id)
        params = {"id_list": clean_id}

        response = await self._execute_with_retry(self.api_url, params=params)
        feed = feedparser.parse(response.text)

        if not feed.entries:
            return None

        # Sometimes arXiv returns an entry with an error message if not found
        first_entry = feed.entries[0]
        if "summary" in first_entry and "error" in first_entry.get("title", "").lower():
            return None

        return self._parse_entry(first_entry)

    async def search_papers(
        self,
        query: str,
        max_results: int = 20,
        category: Optional[str] = None,
    ) -> list[ArxivMetadata]:
        """Search arXiv query using the Atom feed query API."""
        clean_query = query.strip()
        search_query_parts = []

        if category and category.strip():
            search_query_parts.append(f"cat:{category.strip()}")

        if clean_query:
            search_query_parts.append(f"all:{clean_query}")

        search_query = " AND ".join(search_query_parts) if search_query_parts else f"all:{clean_query}"

        params = {
            "search_query": search_query,
            "start": 0,
            "max_results": min(max_results, 100),
            "sortBy": "relevance",
            "sortOrder": "descending",
        }

        response = await self._execute_with_retry(self.api_url, params=params)
        feed = feedparser.parse(response.text)

        results = []
        for entry in feed.entries:
            meta = self._parse_entry(entry)
            if meta.arxiv_id:
                results.append(meta)

        return results

    async def download_pdf_bytes(self, arxiv_id: str) -> bytes:
        """Download raw PDF bytes directly from the official arXiv PDF URL."""
        clean_id = normalize_arxiv_id(arxiv_id)
        pdf_url = f"{self.pdf_base_url}/{clean_id}.pdf"
        response = await self._execute_with_retry(pdf_url, is_binary=True)
        return response.content


# Global default client
arxiv_client = ArxivClient()
