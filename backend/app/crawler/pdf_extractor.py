"""PDF text extraction using PyMuPDF (fitz) with layout-aware text normalization."""

import asyncio
import logging
import re

import pymupdf

logger = logging.getLogger(__name__)

# Pattern to detect isolated table/figure symbols, cell markers, and short tokens
# e.g., '+', '-', '0', '+ -', '0 + -', '0 0', '✓', '✗', '•', '*'
IS_SYMBOL_LINE = re.compile(r"^[+\-0•*|/–—–\s\d✓✗]{1,10}$")


def _clean_extracted_text(raw_text: str) -> str:
    """Clean and normalize raw extracted PDF text.

    Fixes split hyphens across lines, collapses vertical cascades of isolated
    table/diagram symbols into horizontal rows, and normalizes whitespace.
    """
    if not raw_text:
        return ""

    # Replace windows line endings
    text = raw_text.replace("\r\n", "\n").replace("\r", "\n")

    # Rejoin words hyphenated at end of line (e.g., "trans-\nformer" -> "transformer")
    text = re.sub(r"(\w+)-\n(\w+)", r"\1\2", text)

    # Collapse vertical cascades of isolated table/diagram symbols into horizontal rows
    lines = text.split("\n")
    new_lines: list[str] = []
    symbol_buffer: list[str] = []

    for line in lines:
        stripped = line.strip()
        if stripped and IS_SYMBOL_LINE.match(stripped):
            symbol_buffer.append(stripped)
        else:
            if symbol_buffer:
                joined_symbols = "  ".join(symbol_buffer)
                if (
                    new_lines
                    and len(new_lines[-1].strip()) > 0
                    and not new_lines[-1].strip().endswith((".", ":", "?", "!"))
                ):
                    new_lines[-1] = f"{new_lines[-1]}  {joined_symbols}"
                else:
                    new_lines.append(joined_symbols)
                symbol_buffer = []
            new_lines.append(line)

    if symbol_buffer:
        joined_symbols = "  ".join(symbol_buffer)
        if (
            new_lines
            and len(new_lines[-1].strip()) > 0
            and not new_lines[-1].strip().endswith((".", ":", "?", "!"))
        ):
            new_lines[-1] = f"{new_lines[-1]}  {joined_symbols}"
        else:
            new_lines.append(joined_symbols)

    text = "\n".join(new_lines)

    # Normalize multiple newlines (more than 2 -> 2)
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Normalize multiple spaces/tabs within a line while preserving line structure
    normalized_lines = [re.sub(r"[ \t]+", " ", l).strip() for l in text.split("\n")]
    cleaned = "\n".join(normalized_lines).strip()

    return cleaned


def _extract_page_text(page: pymupdf.Page) -> str:
    """Extract text from a single PDF page with layout-aware horizontal row reconstruction.

    Groups elements on the same horizontal baseline into coherent rows, preventing
    multi-column tables, diagrams, and figures from fragmenting into vertical symbol cascades.
    """
    try:
        text_dict = page.get_text("dict")
    except Exception:
        return page.get_text("text") or ""

    block_texts: list[str] = []

    for block in text_dict.get("blocks", []):
        if block.get("type") != 0:
            continue

        raw_lines = []
        rotated_lines = []

        for line in block.get("lines", []):
            spans = line.get("spans", [])
            line_text = "".join(s.get("text", "") for s in spans).strip()
            if not line_text:
                continue

            line_dir = line.get("dir", (1.0, 0.0))
            # Rotated text (e.g. LaTeX table vertical column headers)
            if abs(line_dir[0]) < 0.5:
                rotated_lines.append((line["bbox"], line_text))
            else:
                raw_lines.append((line["bbox"], line_text))

        block_lines: list[str] = []

        # If there are rotated vertical column headers, sort left-to-right
        if rotated_lines:
            rotated_lines.sort(key=lambda item: item[0][0])
            block_lines.append("  |  ".join(item[1] for item in rotated_lines))

        # Group horizontal lines that share approximately the same vertical baseline (within 3.5 points)
        if raw_lines:
            clusters: list[dict] = []
            for bbox, text in raw_lines:
                placed = False
                for c in clusters:
                    if abs(bbox[1] - c["y0"]) <= 3.5:
                        c["items"].append((bbox[0], text))
                        placed = True
                        break
                if not placed:
                    clusters.append({"y0": bbox[1], "items": [(bbox[0], text)]})

            clusters.sort(key=lambda c: c["y0"])
            for c in clusters:
                c["items"].sort(key=lambda it: it[0])
                block_lines.append("  ".join(it[1] for it in c["items"]))

        if block_lines:
            block_texts.append("\n".join(block_lines))

    # Fallback to standard text extraction if dictionary extraction was empty
    if not block_texts:
        return page.get_text("text") or ""

    return "\n\n".join(block_texts)


def _extract_text_sync(pdf_bytes: bytes) -> str:
    """Synchronous extraction of text from PDF bytes using PyMuPDF."""
    doc = None
    try:
        doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
        page_texts = []
        for page_idx in range(len(doc)):
            page = doc[page_idx]
            page_text = _extract_page_text(page)
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
