"""Unit tests for arXiv ID parsing, normalization, and Atom feed client."""

from unittest.mock import patch

import httpx
import pytest

from app.crawler.arxiv_client import ArxivClient, normalize_arxiv_id

SAMPLE_ATOM_FEED = """<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <link href="http://arxiv.org/api/query?id_list=1706.03762" rel="self" type="application/atom+xml"/>
  <title type="html">ArXiv Query: search_query=&amp;id_list=1706.03762</title>
  <id>http://arxiv.org/api/1706.03762</id>
  <updated>2024-01-01T00:00:00Z</updated>
  <entry>
    <id>http://arxiv.org/abs/1706.03762v7</id>
    <updated>2023-08-02T01:54:33Z</updated>
    <published>2017-06-12T17:57:34Z</published>
    <title>Attention Is All You Need</title>
    <summary>The dominant sequence transduction models are based on complex recurrent or convolutional neural networks.</summary>
    <author>
      <name>Ashish Vaswani</name>
    </author>
    <author>
      <name>Noam Shazeer</name>
    </author>
    <link href="http://arxiv.org/abs/1706.03762v7" rel="alternate" type="text/html"/>
    <link title="pdf" href="http://arxiv.org/pdf/1706.03762v7" rel="related" type="application/pdf"/>
    <category term="cs.CL" scheme="http://arxiv.org/schemas/atom"/>
    <category term="cs.AI" scheme="http://arxiv.org/schemas/atom"/>
  </entry>
</feed>
"""


def test_normalize_arxiv_id():
    """Verify various formats of arXiv IDs resolve to canonical unversioned ID."""
    assert normalize_arxiv_id("1706.03762") == "1706.03762"
    assert normalize_arxiv_id("1706.03762v5") == "1706.03762"
    assert normalize_arxiv_id("arXiv:1706.03762v1") == "1706.03762"
    assert normalize_arxiv_id("ARXIV:1706.03762") == "1706.03762"
    assert normalize_arxiv_id("http://arxiv.org/abs/1706.03762v7") == "1706.03762"
    assert normalize_arxiv_id("https://arxiv.org/pdf/1706.03762.pdf") == "1706.03762"


@pytest.mark.asyncio
async def test_fetch_paper_metadata_parsing():
    """Test parsing arXiv Atom feed XML into structured ArxivMetadata."""
    client = ArxivClient()

    with patch.object(client, "_execute_with_retry") as mock_exec:
        mock_response = httpx.Response(200, text=SAMPLE_ATOM_FEED)
        mock_exec.return_value = mock_response

        meta = await client.fetch_paper_metadata("1706.03762")

        assert meta is not None
        assert meta.arxiv_id == "1706.03762"
        assert meta.title == "Attention Is All You Need"
        assert meta.authors == ["Ashish Vaswani", "Noam Shazeer"]
        assert "dominant sequence transduction models" in meta.abstract
        assert "cs.CL" in meta.categories
        assert "cs.AI" in meta.categories
        assert meta.published_at.year == 2017
        assert meta.published_at.month == 6


@pytest.mark.asyncio
async def test_paper_not_found():
    """Test behavior when arXiv returns empty feed for non-existent paper."""
    client = ArxivClient()
    empty_feed = """<?xml version="1.0" encoding="utf-8"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <title>ArXiv Query</title>
    </feed>
    """

    with patch.object(client, "_execute_with_retry") as mock_exec:
        mock_response = httpx.Response(200, text=empty_feed)
        mock_exec.return_value = mock_response

        meta = await client.fetch_paper_metadata("9999.99999")
        assert meta is None
