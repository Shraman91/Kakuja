"""Swappable interface definition for paper analysis and highlight extraction."""

from abc import ABC, abstractmethod
from typing import NamedTuple


class RawAnnotation(NamedTuple):
    """Raw extracted annotation offset match."""

    category: str  # 'concept', 'method', 'result', 'dataset'
    start_offset: int
    end_offset: int
    text: str
    score: float


class AnalysisResult(NamedTuple):
    """Aggregate result from analyzing a research paper."""

    annotations: list[RawAnnotation]
    embedding: list[float]


class BaseAnalyzer(ABC):
    """Abstract base class for swappable analysis backends (rules, models, or LLMs)."""

    @abstractmethod
    async def analyze(self, title: str, abstract: str, full_text: str) -> AnalysisResult:
        """Extract annotations from full_text and generate a 384-dim semantic embedding."""
        pass
