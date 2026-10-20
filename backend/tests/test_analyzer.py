"""Unit and integration tests for Phase 3 Analysis Engine:

- Metric regex patterns (BLEU, accuracy, F1, improvements)
- Method acronym definitions and architecture terms
- Dataset dictionary matches
- Non-overlapping resolution priority rules (result > method > dataset > concept)
- Annotation capping
- Swappable interface
- Related papers vector cosine similarity
"""

import pytest
from httpx import AsyncClient

from app.analysis.analyzer import (
    RuleAndModelAnalyzer,
    get_analyzer,
    resolve_overlaps,
)
from app.analysis.base import BaseAnalyzer, RawAnnotation
from app.db.repositories.paper_repository import PaperRepository
from app.schemas.paper import PaperCreate


def test_result_metric_regex_patterns():
    """Verify numeric metric patterns and comparative results are extracted accurately."""
    analyzer = RuleAndModelAnalyzer()
    sample_text = (
        "On the WMT 2014 English-to-German task, the model achieves 28.4 BLEU, "
        "establishing a new state of the art. On English-to-French, it reaches an F1 of 0.87 "
        "and improves by 2 points over previous ensembles. "
        "Our classifier yields 92.1% accuracy with a perplexity of 15.8."
    )

    annotations = analyzer.extract_annotations_pure(sample_text)
    results = [a for a in annotations if a.category == "result"]
    result_texts = [a.text for a in results]

    assert any("28.4 BLEU" in t for t in result_texts)
    assert any("F1 of 0.87" in t for t in result_texts)
    assert any("improves by 2 points" in t for t in result_texts)
    assert any("92.1% accuracy" in t for t in result_texts)
    assert any("perplexity of 15.8" in t for t in result_texts)


def test_method_acronyms_and_terms():
    """Verify acronym definitions and deep learning architecture terms are identified."""
    analyzer = RuleAndModelAnalyzer()
    sample_text = (
        "We propose Multi-Head Attention (MHA) within the Transformer architecture. "
        "We employ Scaled Dot-Product Attention and Layer Normalization."
    )

    annotations = analyzer.extract_annotations_pure(sample_text)
    methods = [a for a in annotations if a.category == "method"]
    method_texts = [a.text for a in methods]

    assert any("Multi-Head Attention (MHA)" in t for t in method_texts)
    assert any("Transformer" in t for t in method_texts)
    assert any("Scaled Dot-Product Attention" in t for t in method_texts)
    assert any("Layer Normalization" in t for t in method_texts)


def test_dataset_terms():
    """Verify curated dataset catalog terms are tagged."""
    analyzer = RuleAndModelAnalyzer()
    sample_text = "Experiments are conducted on WMT 2014, SQuAD 2.0, ImageNet, and the GLUE benchmark."

    annotations = analyzer.extract_annotations_pure(sample_text)
    datasets = [a for a in annotations if a.category == "dataset"]
    dataset_texts = [a.text for a in datasets]

    assert "WMT 2014" in dataset_texts
    assert "SQuAD 2.0" in dataset_texts
    assert "ImageNet" in dataset_texts
    assert "GLUE" in dataset_texts


def test_overlap_resolution_priority():
    """Verify priority order: result > method > dataset > concept."""
    # Case 1: result overlapping with method
    candidates = [
        RawAnnotation(category="method", start_offset=10, end_offset=25, text="MethodTerm", score=0.9),
        RawAnnotation(category="result", start_offset=12, end_offset=24, text="28.4 BLEU", score=1.0),
    ]
    resolved = resolve_overlaps(candidates)
    assert len(resolved) == 1
    assert resolved[0].category == "result"
    assert resolved[0].text == "28.4 BLEU"

    # Case 2: method overlapping with dataset
    candidates = [
        RawAnnotation(category="dataset", start_offset=30, end_offset=45, text="WMT 2014", score=0.9),
        RawAnnotation(category="method", start_offset=30, end_offset=40, text="MethodA", score=0.95),
    ]
    resolved = resolve_overlaps(candidates)
    assert len(resolved) == 1
    assert resolved[0].category == "method"

    # Case 3: dataset overlapping with concept
    candidates = [
        RawAnnotation(category="concept", start_offset=50, end_offset=65, text="ConceptTerm", score=0.5),
        RawAnnotation(category="dataset", start_offset=52, end_offset=62, text="ImageNet", score=0.9),
    ]
    resolved = resolve_overlaps(candidates)
    assert len(resolved) == 1
    assert resolved[0].category == "dataset"


def test_overlap_resolution_length_tie_breaker():
    """Verify that when priorities are equal, the longer match is preferred."""
    candidates = [
        RawAnnotation(category="method", start_offset=0, end_offset=11, text="Transformer", score=0.85),
        RawAnnotation(
            category="method", start_offset=0, end_offset=22, text="Transformer Model Arch", score=0.85
        ),
    ]
    resolved = resolve_overlaps(candidates)
    assert len(resolved) == 1
    assert resolved[0].text == "Transformer Model Arch"


def test_strictly_non_overlapping_and_sorted():
    """Verify resolved annotations never collide and are sorted chronologically."""
    candidates = [
        RawAnnotation(category="concept", start_offset=100, end_offset=110, text="A", score=0.5),
        RawAnnotation(category="result", start_offset=10, end_offset=20, text="B", score=1.0),
        RawAnnotation(category="method", start_offset=15, end_offset=25, text="C", score=0.9),
        RawAnnotation(category="dataset", start_offset=30, end_offset=40, text="D", score=0.8),
    ]
    resolved = resolve_overlaps(candidates)

    for i in range(len(resolved) - 1):
        # Must be strictly ordered
        assert resolved[i].start_offset < resolved[i + 1].start_offset
        # Must not overlap
        assert resolved[i].end_offset <= resolved[i + 1].start_offset


def test_annotation_capping():
    """Verify total annotations are capped at max_annotations."""
    candidates = [
        RawAnnotation(
            category="concept", start_offset=i * 10, end_offset=i * 10 + 5, text=f"Term {i}", score=0.5
        )
        for i in range(50)
    ]
    resolved = resolve_overlaps(candidates, max_annotations=10)
    assert len(resolved) == 10


def test_pure_function_invariants():
    """Verify exact character offset slicing matches extracted text."""
    sample_text = (
        "The Transformer achieves 28.4 BLEU on WMT 2014 English-to-German. "
        "Multi-Head Attention (MHA) is applied with Layer Normalization."
    )
    analyzer = RuleAndModelAnalyzer()
    annotations = analyzer.extract_annotations_pure(sample_text)

    for a in annotations:
        sliced = sample_text[a.start_offset : a.end_offset]
        assert a.text == sliced, f"Offset mismatch: expected '{sliced}', got '{a.text}'"


def test_swappable_interface():
    """Verify swappable analyzer factory and interface conformance."""
    analyzer = get_analyzer(use_llm=False)
    assert isinstance(analyzer, BaseAnalyzer)

    llm_analyzer = get_analyzer(use_llm=True)
    assert isinstance(llm_analyzer, BaseAnalyzer)


@pytest.mark.asyncio
async def test_related_papers_similarity_endpoint(client: AsyncClient, test_session):
    """Test /papers/{arxiv_id}/related returns semantically ranked papers with similarity scores."""
    paper_repo = PaperRepository(test_session)

    # Base target vector (all ones)
    target_vec = [1.0] * 384
    # Highly similar vector (close to target)
    close_vec = [0.95] * 384
    # Distant vector (orthogonal or opposite)
    distant_vec = [-1.0] * 384

    # Seed 3 papers
    await paper_repo.create(
        PaperCreate(
            arxiv_id="2401.00001",
            title="Target Anchor Paper",
            authors=["Alice"],
            abstract="Anchor paper abstract",
            categories=["cs.CL"],
            embedding=target_vec,
        )
    )
    await paper_repo.create(
        PaperCreate(
            arxiv_id="2401.00002",
            title="Closely Related Paper",
            authors=["Bob"],
            abstract="Similar topic paper",
            categories=["cs.CL"],
            embedding=close_vec,
        )
    )
    await paper_repo.create(
        PaperCreate(
            arxiv_id="2401.00003",
            title="Distant Paper",
            authors=["Charlie"],
            abstract="Unrelated topic",
            categories=["math.PR"],
            embedding=distant_vec,
        )
    )
    await test_session.commit()

    # Query related papers
    response = await client.get("/papers/2401.00001/related?limit=5")
    assert response.status_code == 200
    data = response.json()

    assert len(data) == 2
    # First result should be the closely related paper
    assert data[0]["arxiv_id"] == "2401.00002"
    assert data[0]["similarity_score"] > 0.95

    # Second result should be the distant paper with low similarity
    assert data[1]["arxiv_id"] == "2401.00003"
    assert data[1]["similarity_score"] < 0.2
