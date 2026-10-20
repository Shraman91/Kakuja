"""PDF text extraction using PyMuPDF (fitz) with text normalization."""

import asyncio
import logging
import re

import pymupdf

logger = logging.getLogger(__name__)


def _clean_extracted_text(raw_text: str) -> str:
    """Clean and normalize raw extracted PDF text.

    Fixes split hyphens across lines, normalizes whitespace, and strips page headers/footers.
    """
    if not raw_text:
        return ""

    # Replace windows line endings
    text = raw_text.replace("\r\n", "\n").replace("\r", "\n")

    # Rejoin words hyphenated at end of line (e.g., "trans-\nformer" -> "transformer")
    text = re.sub(r"(\w+)-\n(\w+)", r"\1\2", text)

    # Normalize multiple newlines (more than 2 -> 2)
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Normalize multiple spaces/tabs within a line
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.split("\n")]
    cleaned = "\n".join(lines).strip()

    return cleaned


def _extract_text_sync(pdf_bytes: bytes) -> str:
    """Synchronous extraction of text from PDF bytes using PyMuPDF."""
    doc = None
    try:
        doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
        page_texts = []
        for page_idx in range(len(doc)):
            page = doc[page_idx]
            page_text = page.get_text("text")
            if page_text:
                page_texts.append(page_text)
        raw_combined = "\n\n".join(page_texts)
        return _clean_extracted_text(raw_combined)
    except Exception as exc:
        logger.error("Failed to parse PDF bytes with PyMuPDF: %s", exc)
        raise
    finally:
        if doc is not None:
            doc.close()


async def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Asynchronously extract full text from PDF bytes via thread pool worker."""
    return await asyncio.to_thread(_extract_text_sync, pdf_bytes)
