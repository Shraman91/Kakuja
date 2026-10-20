"""Rule and model-based paper analysis engine.

Extracts non-overlapping character offset annotations for:
- result: Quantitative evaluation metrics (e.g. '28.4 BLEU', '92.1% accuracy', 'F1 of 0.87', 'improves by 2 points')
- method: Model architectures, techniques, and acronym definitions (e.g. 'Multi-Head Attention (MHA)')
- dataset: Benchmarks and datasets (e.g. 'SQuAD', 'WMT 2014', 'ImageNet')
- concept: Key concepts and domain phrases (via YAKE keyphrase extraction)
"""

import asyncio
import logging
import re
from typing import Optional

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

# 1. Result regexes: numeric results with their metric (e.g. "28.4 BLEU", "92.1% accuracy", "F1 of 0.87", "improves by 2 points")
RESULT_PATTERNS = [
    # Metrics preceded by number/percentage: "28.4 BLEU", "92.1% accuracy", "0.87 F1", "2.1 BLEU-4"
    re.compile(
        r"\b\d+(?:\.\d+)?%?\s*(?:BLEU(?:-[1-4])?|ROUGE(?:-[1-4]|-[L])?|accuracy|acc|F1(?:-score)?|PPL|perplexity|AUC|mAP|top-[15]|error\s*rate)\b",
        re.IGNORECASE,
    ),
    # Metrics followed by score: "F1 of 0.87", "BLEU score of 28.4", "accuracy of 94.2%", "loss of 0.24", "perplexity of 15.8"
    re.compile(
        r"\b(?:BLEU(?:-[1-4])?|ROUGE(?:-[1-4]|-[L])?|accuracy|acc|F1(?:-score)?|AUC|mAP|PPL|perplexity|loss|error\s*rate)\s*(?:score\s*)?(?:of|reaching|at)\s*\d+(?:\.\d+)?%?\b",
        re.IGNORECASE,
    ),
    # Comparative improvements: "improves by 2 points", "improves by 2.3 points", "improves by 1.5 BLEU", "outperforms baseline by 3.2%"
    re.compile(
        r"\b(?:improves?(?:\s+over\s+\w+)?\s+by\s+\d+(?:\.\d+)?\s*(?:points?|%|percent|BLEU|accuracy)?)\b",
        re.IGNORECASE,
    ),
    # Relative gain: "outperforms by 2.0 points"
    re.compile(
        r"\b(?:outperforms?\s+.*?\s*by\s+\d+(?:\.\d+)?\s*(?:points?|%|percent)?)\b",
        re.IGNORECASE,
    ),
]

# 2. Method regexes: acronym definitions like "Multi-Head Attention (MHA)" and technique terms
ACRONYM_DEF_PATTERN = re.compile(
    r"\b([A-Z][A-Za-z\-]+(?:\s+[A-Z][A-Za-z\-]+)+)\s*\(([A-Z0-9]{2,8})\)"
)

METHOD_TERMS = [
    "Transformer",
    "Attention Mechanism",
    "Self-Attention",
    "Multi-Head Attention",
    "Scaled Dot-Product Attention",
    "Feed-Forward Network",
    "Positional Encoding",
    "Layer Normalization",
    "Residual Connection",
    "Residual Connections",
    "Beam Search",
    "Stochastic Gradient Descent",
    "Adam Optimizer",
    "AdamW",
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
    "FlashAttention",
    "Low-Rank Adaptation",
    "LoRA",
    "Quantization",
    "Mixture of Experts",
    "MoE",
    "Chain-of-Thought",
    "Instruction Tuning",
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
    "MS MARCO",
    "HotpotQA",
    "DROP",
    "LAMBADA",
    "BLEURT",
    "MATH",
    "Spider",
]


def resolve_overlaps(
    candidates: list[RawAnnotation],
    max_annotations: int = 150,
) -> list[RawAnnotation]:
    """Pure function resolving overlapping annotation spans with priority rules.

    Priority hierarchy: result > method > dataset > concept.
    Tie breaker:
    1. Longer matched span wins
    2. Earlier start offset wins

    Enforces strictly non-overlapping intervals and caps total annotations per paper.
    """
    # Sort candidates by:
    # 1. Category priority (descending, e.g. result=4, method=3, dataset=2, concept=1)
    # 2. Span length (descending)
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
        # Overlap condition: cand.start < acc.end AND acc.start < cand.end
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
                            text=full_text[match.start() : match.end()],
                            score=1.0,
                        )
                    )

        # 2. Method Extraction (Acronym definitions + Curated method terms)
        for match in ACRONYM_DEF_PATTERN.finditer(full_text):
            candidates.append(
                RawAnnotation(
                    category="method",
                    start_offset=match.start(),
                    end_offset=match.end(),
                    text=full_text[match.start() : match.end()],
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
            # Run YAKE on abstract + beginning of full text for density and performance
            sample_text = full_text[:12000]
            try:
                keywords = yake_extractor.extract_keywords(sample_text)
                for kw, score in keywords:
                    kw_clean = kw.strip()
                    # Filter out short or numeric keywords
                    if len(kw_clean) < 3 or kw_clean.replace(".", "").isdigit():
                        continue
                    # In YAKE, lower score means higher relevance
                    relevance = max(0.1, min(1.0, 1.0 - (score / 2.0)))
                    pattern = re.compile(r"\b" + re.escape(kw_clean) + r"\b", re.IGNORECASE)
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
        """Run complete extraction and embedding asynchronously in a background thread."""
        annotations = await asyncio.to_thread(
            self.extract_annotations_pure, full_text, abstract, settings.MAX_ANNOTATIONS_PER_PAPER
        )

        text_for_embedding = f"{title}\n\n{abstract}"
        embedding = await asyncio.to_thread(self._generate_embedding_sync, text_for_embedding)

        return AnalysisResult(annotations=annotations, embedding=embedding)


class LLMSummarizerStub(BaseAnalyzer):
    """LLM-based analyzer stub demonstrating swappable interface behind a feature flag.

    Can be wired to any external or local LLM (e.g. OpenAI, Anthropic, Gemini, Ollama)
    without requiring paid APIs or altering downstream contracts.
    """

    def __init__(self, fallback_analyzer: Optional[BaseAnalyzer] = None):
        self.fallback = fallback_analyzer or RuleAndModelAnalyzer()

    async def analyze(self, title: str, abstract: str, full_text: str) -> AnalysisResult:
        """Analyze paper with LLM summarizer if configured, falling back to rule & model analyzer."""
        logger.info("LLMSummarizerStub active. Performing LLM-assisted analysis...")
        # For demonstration purposes, delegates to the rule-and-model baseline
        return await self.fallback.analyze(title, abstract, full_text)


def get_analyzer(use_llm: bool = settings.USE_LLM_ANALYZER) -> BaseAnalyzer:
    """Factory creating the appropriate analyzer based on configuration."""
    if use_llm:
        return LLMSummarizerStub()
    return RuleAndModelAnalyzer()


# Global default analyzer instance
default_analyzer = get_analyzer()
