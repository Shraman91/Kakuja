"""Rule and model-based paper analysis engine.

Extracts non-overlapping character offset annotations for:
- result: Quantitative evaluation metrics (e.g. '28.4 BLEU', '92.1% accuracy', 'F1 of 0.87')
- method: Model architectures, techniques, and acronym definitions (e.g. 'Multi-Head Attention (MHA)')
- dataset: Benchmarks and datasets (e.g. 'SQuAD', 'WMT 2014', 'ImageNet')
- concept: Key concepts and domain phrases (via YAKE keyphrase extraction)
"""

import asyncio
import logging
import re

from app.analysis.base import AnalysisResult, BaseAnalyzer, RawAnnotation
from app.core.config import settings

logger = logging.getLogger(__name__)

# Category priority hierarchy: result > method > dataset > concept
CATEGORY_PRIORITY = {
    "result": 4,
    "method": 3,
    "dataset": 2,
    "concept": 1,
}

# 1. Result regexes: quantitative metrics with numbers, percentages, comparative improvements
RESULT_PATTERNS = [
    # Metrics with numbers: "28.4 BLEU", "92.1% accuracy", "F1 of 0.87", "loss of 0.32"
    re.compile(
        r"(?i)\b(?:"
        r"(?:\d+(?:\.\d+)?%?\s*(?:BLEU(?:-[1-4])?|ROUGE(?:-[1-4]|-[L])?|accuracy|acc|F1(?:-score)?|PPL|perplexity|AUC|mAP|top-[15]|error\s*rate))|"
        r"(?:(?:BLEU(?:-[1-4])?|ROUGE(?:-[1-4]|-[L])?|accuracy|acc|F1(?:-score)?|AUC|mAP)\s*(?:of|score\s*of|score|reaching)?\s*\d+(?:\.\d+)?%?)|"
        r"(?:improves?\s*(?:by|over)?\s*\d+(?:\.\d+)?\s*(?:points?|%|percent))|"
        r"(?:(?:outperforms?|exceeds?|surpasses?)\s*.*?\s*by\s*\d+(?:\.\d+)?%?)"
        r")\b"
    ),
    # Strict score patterns like "28.4 BLEU", "0.87 F1"
    re.compile(r"\b\d+(?:\.\d+)?%?\s*(?:BLEU|ROUGE|F1|Accuracy|PPL|AUC|mAP)\b"),
]

# 2. Method regexes: acronym definitions like "Multi-Head Attention (MHA)" and capitalized technique terms
ACRONYM_DEF_PATTERN = re.compile(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*\(([A-Z0-9]{2,8})\)")

METHOD_TERMS = [
    "Transformer",
    "Attention Mechanism",
    "Self-Attention",
    "Multi-Head Attention",
    "Feed-Forward Network",
    "Positional Encoding",
    "Layer Normalization",
    "Residual Connection",
    "Beam Search",
    "Stochastic Gradient Descent",
    "Adam Optimizer",
    "Backpropagation",
    "Convolutional Neural Network",
    "Recurrent Neural Network",
    "Long Short-Term Memory",
    "Gated Recurrent Unit",
    "Diffusion Model",
    "Reinforcement Learning",
    "Proximal Policy Optimization",
    "Direct Preference Optimization",
    "Cross-Entropy Loss",
    "Dropout",
]

# 3. Dataset dictionary & heuristics
DATASET_TERMS = [
    "WMT 2014",
    "WMT 2017",
    "WMT 14",
    "SQuAD",
    "SQuAD 1.1",
    "SQuAD 2.0",
    "GLUE",
    "SuperGLUE",
    "ImageNet",
    "COCO",
    "CIFAR-10",
    "CIFAR-100",
    "MNIST",
    "Penn Treebank",
    "Common Crawl",
    "The Pile",
    "TriviaQA",
    "Natural Questions",
    "GSM8K",
    "HumanEval",
    "MMLU",
    "HellaSwag",
    "ARC Challenge",
    "TruthfulQA",
    "BookCorpus",
    "WikiText-103",
]


def resolve_overlaps(candidates: list[RawAnnotation], max_annotations: int = 150) -> list[RawAnnotation]:
    """Pure function resolving overlapping annotation spans with priority rules.

    Priority: result > method > dataset > concept.
    Tie breaker: longer matched length wins.
    Enforces strictly non-overlapping intervals and caps total count.
    """
    # Sort candidates by:
    # 1. Category priority (descending)
    # 2. Text length (descending)
    # 3. Start offset (ascending)
    sorted_candidates = sorted(
        candidates,
        key=lambda c: (
            -CATEGORY_PRIORITY.get(c.category, 0),
            -(c.end_offset - c.start_offset),
            c.start_offset,
        ),
    )

    accepted: list[RawAnnotation] = []

    for cand in sorted_candidates:
        if len(accepted) >= max_annotations:
            break

        # Check for overlap with already accepted annotations
        # Overlap: cand.start_offset < acc.end_offset and acc.start_offset < cand.end_offset
        overlaps = False
        for acc in accepted:
            if cand.start_offset < acc.end_offset and acc.start_offset < cand.end_offset:
                overlaps = True
                break

        if not overlaps:
            accepted.append(cand)

    # Return accepted annotations ordered chronologically by start_offset
    return sorted(accepted, key=lambda a: a.start_offset)


class RuleAndModelAnalyzer(BaseAnalyzer):
    """Production analyzer extracting highlights via rules/YAKE and embeddings via sentence-transformers."""

    def __init__(self, model_name: str = settings.EMBEDDING_MODEL_NAME):
        self.model_name = model_name
        self._embedding_model = None
        self._yake_extractor = None

    def _get_embedding_model(self):
        """Lazy load sentence-transformers model."""
        if self._embedding_model is None:
            try:
                from sentence_transformers import SentenceTransformer

                logger.info("Loading embedding model '%s'...", self.model_name)
                self._embedding_model = SentenceTransformer(self.model_name)
            except Exception as exc:
                logger.warning("Could not load SentenceTransformer (%s): %s", self.model_name, exc)
                self._embedding_model = None
        return self._embedding_model

    def _get_yake(self):
        """Lazy load YAKE keyword extractor."""
        if self._yake_extractor is None:
            try:
                import yake

                self._yake_extractor = yake.KeywordExtractor(
                    lan="en",
                    n=3,
                    dedupLim=0.7,
                    top=40,
                    features=None,
                )
            except Exception as exc:
                logger.warning("Could not initialize YAKE extractor: %s", exc)
                self._yake_extractor = None
        return self._yake_extractor

    def extract_annotations_pure(
        self,
        full_text: str,
        abstract: str = "",
        max_annotations: int = settings.MAX_ANNOTATIONS_PER_PAPER,
    ) -> list[RawAnnotation]:
        """Pure extractor generating all candidates and resolving non-overlapping intervals."""
        if not full_text:
            return []

        candidates: list[RawAnnotation] = []

        # 1. Result Extraction (Regex)
        for pattern in RESULT_PATTERNS:
            for match in pattern.finditer(full_text):
                matched_text = match.group(0).strip()
                if len(matched_text) >= 4:
                    candidates.append(
                        RawAnnotation(
                            category="result",
                            start_offset=match.start(),
                            end_offset=match.end(),
                            text=matched_text,
                            score=1.0,
                        )
                    )

        # 2. Method Extraction (Acronym definitions + Curated method terms)
        for match in ACRONYM_DEF_PATTERN.finditer(full_text):
            matched_text = match.group(0).strip()
            candidates.append(
                RawAnnotation(
                    category="method",
                    start_offset=match.start(),
                    end_offset=match.end(),
                    text=matched_text,
                    score=0.95,
                )
            )

        for term in METHOD_TERMS:
            pattern = re.compile(r"\b" + re.escape(term) + r"\b", re.IGNORECASE)
            for match in pattern.finditer(full_text):
                candidates.append(
                    RawAnnotation(
                        category="method",
                        start_offset=match.start(),
                        end_offset=match.end(),
                        text=full_text[match.start() : match.end()],
                        score=0.85,
                    )
                )

        # 3. Dataset Extraction
        for dataset in DATASET_TERMS:
            pattern = re.compile(r"\b" + re.escape(dataset) + r"\b", re.IGNORECASE)
            for match in pattern.finditer(full_text):
                candidates.append(
                    RawAnnotation(
                        category="dataset",
                        start_offset=match.start(),
                        end_offset=match.end(),
                        text=full_text[match.start() : match.end()],
                        score=0.9,
                    )
                )

        # 4. Concept Extraction (YAKE)
        yake_extractor = self._get_yake()
        if yake_extractor and full_text:
            # Run YAKE on abstract + beginning of full text for performance and density
            sample_text = full_text[:12000]
            try:
                keywords = yake_extractor.extract_keywords(sample_text)
                for kw, score in keywords:
                    # In YAKE lower score means higher relevance
                    relevance = max(0.1, min(1.0, 1.0 - (score / 2.0)))
                    pattern = re.compile(r"\b" + re.escape(kw) + r"\b", re.IGNORECASE)
                    for match in pattern.finditer(full_text):
                        candidates.append(
                            RawAnnotation(
                                category="concept",
                                start_offset=match.start(),
                                end_offset=match.end(),
                                text=full_text[match.start() : match.end()],
                                score=round(relevance, 2),
                            )
                        )
            except Exception as exc:
                logger.warning("YAKE keyword extraction encountered an error: %s", exc)

        return resolve_overlaps(candidates, max_annotations=max_annotations)

    def _generate_embedding_sync(self, text_to_embed: str) -> list[float]:
        """Compute 384-dimensional dense vector embedding."""
        model = self._get_embedding_model()
        if model is None:
            # Zero vector fallback if torch/model unavailable
            return [0.0] * 384
        embedding = model.encode(text_to_embed, normalize_embeddings=True)
        return embedding.tolist()

    async def analyze(self, title: str, abstract: str, full_text: str) -> AnalysisResult:
        """Run complete extraction and embedding asynchronously."""
        # Run CPU-bound extraction and embedding in thread pool
        annotations = await asyncio.to_thread(
            self.extract_annotations_pure, full_text, abstract, settings.MAX_ANNOTATIONS_PER_PAPER
        )

        text_for_embedding = f"{title}\n\n{abstract}"
        embedding = await asyncio.to_thread(self._generate_embedding_sync, text_for_embedding)

        return AnalysisResult(annotations=annotations, embedding=embedding)


# Global default analyzer instance
default_analyzer = RuleAndModelAnalyzer()
