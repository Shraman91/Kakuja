import React, { Suspense, lazy, useRef, useState } from 'react';
import { SplitText } from '@/components/fx/SplitText';
import { WordRoll } from '@/components/fx/WordRoll';
import { CountUp } from '@/components/fx/CountUp';
import { Marquee } from '@/components/fx/Marquee';
import { MagneticButton } from '@/components/fx/MagneticButton';
import { SpotlightCard } from '@/components/fx/SpotlightCard';
import { CentipedeLoader } from '@/components/CentipedeLoader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const DotField = lazy(() => import('@/components/fx/DotField'));
import {
  ArrowRight,
  BookOpen,
  Cpu,
  Database,
  ExternalLink,
  GitBranch,
  Search,
  ShieldCheck,
  Sparkles,
  Layers,
  Award,
  Zap,
} from 'lucide-react';

interface LandingPageProps {
  onSearchSubmit: (query: string) => void;
  onNavigateDiscover: () => void;
}

const EXAMPLE_PAPERS = [
  { id: '1706.03762', label: '1706.03762 (Transformers)' },
  { id: '1810.04805', label: '1810.04805 (BERT)' },
  { id: '2005.14165', label: '2005.14165 (GPT-3)' },
  { id: 'attention mechanism', label: 'Attention Mechanism' },
];

const MARQUEE_ITEMS = [
  'Attention Is All You Need',
  'BERT: Bidirectional Transformers',
  'Deep Residual Learning for Image Recognition',
  'Language Models are Few-Shot Learners',
  'High-Resolution Latent Diffusion Models',
  'Generative Adversarial Nets',
  'Mastering the Game of Go with Deep Neural Networks',
  'LoRA: Low-Rank Adaptation of Large Language Models',
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onSearchSubmit,
  onNavigateDiscover,
}) => {
  const [searchVal, setSearchVal] = useState('');
  const [activeDemoCat, setActiveDemoCat] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchVal.trim()) return;
    onSearchSubmit(searchVal.trim());
  };

  // Keyboard shortcut '/' to focus search bar
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement !== searchInputRef.current &&
        !['INPUT', 'TEXTAREA'].includes((document.activeElement?.tagName || ''))
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative min-h-screen bg-[var(--cream)] text-[var(--navy)] selection:bg-[var(--navy)] selection:text-[var(--accent)] overflow-x-hidden">
      {/* ========================================================
          1. HERO SECTION (Dark Section: Navy-Ink + Dot Field)
         ======================================================== */}
      <section className="dark-section relative flex min-h-[92vh] flex-col items-center justify-center overflow-hidden bg-[var(--navy-ink)] px-6 pt-24 pb-16 text-center text-[var(--cream)]">
        {/* Interactive Canvas Dot Field */}
        <Suspense fallback={null}>
          <DotField
            dotColor="rgba(245, 239, 224, 0.12)"
            glowColor="rgba(217, 164, 65, 0.55)"
            spacing={28}
          />
        </Suspense>

        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center">
          {/* Milestone Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--navy-soft)]/60 px-4 py-1.5 text-xs font-mono-code text-[var(--accent)] backdrop-blur-md shadow-navy-sm">
            <Sparkles size={13} className="text-[var(--accent)]" />
            <span>Kakuja Research Engine v2.0</span>
          </div>

          {/* Kinetic Headline */}
          <h1 className="font-serif-display text-5xl sm:text-7xl lg:text-8xl font-normal tracking-tight text-[var(--cream)] leading-[0.98]">
            <SplitText text="Read papers." delay={0.1} /> <br />
            <span className="italic text-[var(--accent)] font-serif-display">
              <SplitText text="Not PDFs." delay={0.35} />
            </span>
          </h1>

          {/* Subtitle with WordRoll */}
          <p className="mt-6 max-w-2xl text-lg sm:text-xl font-light text-[var(--cream)]/85 leading-relaxed">
            Instantly{' '}
            <WordRoll
              words={['Crawl', 'Highlight', 'Connect', 'Understand']}
              className="text-[var(--accent)]"
            />{' '}
            arXiv literature. Extract quantitative results, model architectures,
            and semantic clusters without manual skimming.
          </p>

          {/* Pill Search / Fetch Command Bar */}
          <form
            onSubmit={handleSubmit}
            className="mt-10 flex w-full max-w-2xl flex-col sm:flex-row items-center gap-2.5 rounded-2xl sm:rounded-full border border-[var(--border)] bg-[var(--navy-soft)]/90 p-2 shadow-navy-lg backdrop-blur-xl transition-all focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/50"
          >
            <div className="flex w-full items-center pl-3.5 pr-2">
              <Search className="h-5 w-5 shrink-0 text-[var(--accent)]/80 mr-2.5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder="arXiv ID (e.g. 1706.03762) or query..."
                className="w-full bg-transparent text-sm sm:text-base text-[var(--cream)] placeholder:text-[var(--cream)]/40 focus:outline-none"
              />
              <span className="hidden sm:inline-block rounded-md border border-[var(--border)] bg-[var(--navy-ink)] px-2 py-0.5 text-[11px] font-mono-code text-[var(--cream)]/60">
                /
              </span>
            </div>
            <Button
              type="submit"
              variant="accent"
              className="w-full sm:w-auto shrink-0 rounded-xl sm:rounded-full px-6 py-2.5 font-medium"
            >
              <span>Explore</span>
              <ArrowRight size={15} className="ml-1.5" />
            </Button>
          </form>

          {/* Quick Example Chips */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-[var(--cream)]/50 font-mono-code">Try:</span>
            {EXAMPLE_PAPERS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSearchVal(p.id);
                  onSearchSubmit(p.id);
                }}
                className="rounded-lg border border-[var(--border)] bg-[var(--navy-soft)]/50 px-2.5 py-1 text-xs text-[var(--cream)]/80 hover:bg-[var(--navy-soft)] hover:text-[var(--accent)] transition-all cursor-pointer font-mono-code"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Decorative Centipede Crawler along the bottom edge */}
        <div className="absolute bottom-2 left-0 right-0 z-10 flex justify-center opacity-85">
          <CentipedeLoader
            active={true}
            theme="gold"
            size="sm"
            label="arXiv rate-limit compliant crawler active"
          />
        </div>
      </section>

      {/* ========================================================
          2. MARQUEE STRIP
         ======================================================== */}
      <section className="border-y border-[var(--border)] bg-[var(--cream-deep)] py-4 overflow-hidden">
        <Marquee speedSec={32}>
          {MARQUEE_ITEMS.map((item, idx) => (
            <div key={idx} className="flex items-center gap-6">
              <span className="font-serif-display text-lg tracking-tight text-[var(--navy)]">
                {item}
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            </div>
          ))}
        </Marquee>
      </section>

      {/* ========================================================
          3. HOW IT WORKS (Sticky Process Architecture)
         ======================================================== */}
      <section className="relative px-6 py-24 sm:py-32 max-w-6xl mx-auto">
        <div className="mb-16 text-center">
          <Badge variant="secondary" className="mb-3">
            Pipeline Architecture
          </Badge>
          <h2 className="font-serif-display text-4xl sm:text-6xl text-[var(--navy)] tracking-tight">
            How Kakuja Works
          </h2>
          <p className="mt-3 text-base sm:text-lg text-[var(--navy-soft)] max-w-2xl mx-auto">
            From raw arXiv Atom feeds to dense vector embeddings and character-accurate
            highlight annotations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Step 1 */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--paper)] p-6 shadow-navy-sm flex flex-col justify-between">
            <div>
              <span className="font-serif-display text-4xl text-[var(--accent)] font-normal">
                01
              </span>
              <h3 className="mt-3 font-serif-display text-2xl text-[var(--navy)]">
                Crawl & Ingest
              </h3>
              <p className="mt-2 text-sm text-[var(--navy-soft)]/80 leading-relaxed">
                Connects to export.arxiv.org Atom API with a strict 3-second global
                rate limiter, caching metadata idempotently.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-mono-code text-[var(--navy-soft)]">
              <span>Token-Bucket</span>
              <ShieldCheck size={16} className="text-emerald-700" />
            </div>
          </div>

          {/* Step 2 */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--paper)] p-6 shadow-navy-sm flex flex-col justify-between">
            <div>
              <span className="font-serif-display text-4xl text-[var(--accent)] font-normal">
                02
              </span>
              <h3 className="mt-3 font-serif-display text-2xl text-[var(--navy)]">
                Extract Text
              </h3>
              <p className="mt-2 text-sm text-[var(--navy-soft)]/80 leading-relaxed">
                Downloads PDF buffers single-threaded via PyMuPDF (fitz), isolating
                abstract and full-text character streams without PDF rehosting.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-mono-code text-[var(--navy-soft)]">
              <span>PyMuPDF Stream</span>
              <Layers size={16} className="text-[var(--navy)]" />
            </div>
          </div>

          {/* Step 3 */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--paper)] p-6 shadow-navy-sm flex flex-col justify-between">
            <div>
              <span className="font-serif-display text-4xl text-[var(--accent)] font-normal">
                03
              </span>
              <h3 className="mt-3 font-serif-display text-2xl text-[var(--navy)]">
                Analyze & Highlight
              </h3>
              <p className="mt-2 text-sm text-[var(--navy-soft)]/80 leading-relaxed">
                Extracts numeric results, method acronyms, datasets, and YAKE keyphrases
                resolved with character offsets and strict priorities.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-mono-code text-[var(--navy-soft)]">
              <span>Priority Offsets</span>
              <Award size={16} className="text-[#D9A441]" />
            </div>
          </div>

          {/* Step 4 */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--paper)] p-6 shadow-navy-sm flex flex-col justify-between">
            <div>
              <span className="font-serif-display text-4xl text-[var(--accent)] font-normal">
                04
              </span>
              <h3 className="mt-3 font-serif-display text-2xl text-[var(--navy)]">
                Index & Connect
              </h3>
              <p className="mt-2 text-sm text-[var(--navy-soft)]/80 leading-relaxed">
                Computes 384-dimensional dense vectors with all-MiniLM-L6-v2, enabling
                instant cosine similarity exploration with pgvector.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-mono-code text-[var(--navy-soft)]">
              <span>pgvector HNSW</span>
              <Database size={16} className="text-[#2A7F7F]" />
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          4. LIVE HIGHLIGHT DEMO (Interactive Mock Reader)
         ======================================================== */}
      <section className="bg-[var(--cream-deep)]/60 border-y border-[var(--border)] py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <Badge variant="gold" className="mb-2">
              Interactive Prototype
            </Badge>
            <h2 className="font-serif-display text-3xl sm:text-5xl text-[var(--navy)] tracking-tight">
              Smart Highlights in Action
            </h2>
            <p className="mt-2 text-sm sm:text-base text-[var(--navy-soft)]">
              Hover or toggle a category below to test how Kakuja focuses your attention.
            </p>

            {/* Category Filter Pills */}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {[
                { id: 'result', label: 'Results', color: 'border-[#D9A441] bg-[#D9A441]/30 text-[#684803]' },
                { id: 'method', label: 'Methods', color: 'border-[var(--navy)] bg-[var(--navy)]/15 text-[var(--navy)]' },
                { id: 'dataset', label: 'Datasets', color: 'border-[#2A7F7F] bg-[#2A7F7F]/20 text-[#134E4E]' },
                { id: 'concept', label: 'Concepts', color: 'border-[#C2674A] bg-[#C2674A]/20 text-[#7C2D16]' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onMouseEnter={() => setActiveDemoCat(cat.id)}
                  onMouseLeave={() => setActiveDemoCat(null)}
                  onClick={() => setActiveDemoCat(activeDemoCat === cat.id ? null : cat.id)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-medium cursor-pointer transition-all ${
                    activeDemoCat === null || activeDemoCat === cat.id
                      ? cat.color
                      : 'opacity-40 border-[var(--border)] bg-transparent text-[var(--navy-soft)]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Paper Reading Mock Card */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--paper)] p-8 sm:p-10 shadow-navy-md">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-[var(--border-subtle)] text-xs text-[var(--navy-soft)]">
              <span className="font-mono-code font-semibold">arXiv:1706.03762</span>
              <span>Vaswani et al. (Google Brain)</span>
            </div>

            <h3 className="font-serif-display text-2xl sm:text-3xl font-normal text-[var(--navy)] mb-4">
              Attention Is All You Need
            </h3>

            {/* Highlighted text paragraph */}
            <div className="font-serif-editorial text-base sm:text-lg leading-[1.85] text-[var(--navy)]">
              The dominant sequence transduction models are based on complex recurrent or convolutional
              neural networks in an encoder-decoder configuration. We propose a new simple network
              architecture, the{' '}
              <mark
                className={`rounded px-1.5 py-0.5 border-b-2 transition-opacity ${
                  activeDemoCat && activeDemoCat !== 'method' ? 'opacity-30' : 'opacity-100'
                }`}
                style={{
                  backgroundColor: 'var(--hl-method-bg)',
                  borderColor: 'var(--hl-method-border)',
                  color: 'var(--hl-method-text)',
                }}
              >
                Transformer
              </mark>
              , based solely on{' '}
              <mark
                className={`rounded px-1.5 py-0.5 border-b-2 transition-opacity ${
                  activeDemoCat && activeDemoCat !== 'concept' ? 'opacity-30' : 'opacity-100'
                }`}
                style={{
                  backgroundColor: 'var(--hl-concept-bg)',
                  borderColor: 'var(--hl-concept-border)',
                  color: 'var(--hl-concept-text)',
                }}
              >
                attention mechanisms
              </mark>
              , dispensing with recurrence and convolutions entirely. On the{' '}
              <mark
                className={`rounded px-1.5 py-0.5 border-b-2 transition-opacity ${
                  activeDemoCat && activeDemoCat !== 'dataset' ? 'opacity-30' : 'opacity-100'
                }`}
                style={{
                  backgroundColor: 'var(--hl-dataset-bg)',
                  borderColor: 'var(--hl-dataset-border)',
                  color: 'var(--hl-dataset-text)',
                }}
              >
                WMT 2014 English-to-German
              </mark>{' '}
              translation task, our model establishes a state-of-the-art score of{' '}
              <mark
                className={`rounded px-1.5 py-0.5 border-b-2 font-semibold transition-opacity ${
                  activeDemoCat && activeDemoCat !== 'result' ? 'opacity-30' : 'opacity-100'
                }`}
                style={{
                  backgroundColor: 'var(--hl-result-bg)',
                  borderColor: 'var(--hl-result-border)',
                  color: 'var(--hl-result-text)',
                }}
              >
                28.4 BLEU
              </mark>
              , improving over the existing best ensembles by over 2 points.
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          5. BENTO GRID OF CORE CAPABILITIES
         ======================================================== */}
      <section className="px-6 py-24 sm:py-32 max-w-6xl mx-auto">
        <div className="mb-14 text-center">
          <Badge variant="secondary" className="mb-2">
            Features
          </Badge>
          <h2 className="font-serif-display text-4xl sm:text-6xl text-[var(--navy)] tracking-tight">
            Engineered for Researchers
          </h2>
          <p className="mt-3 text-base text-[var(--navy-soft)] max-w-xl mx-auto">
            High-performance indexing, pgvector semantic search, and transparent API compliance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Vector Space */}
          <SpotlightCard className="md:col-span-2">
            <div className="flex flex-col h-full justify-between">
              <div>
                <Cpu className="h-8 w-8 text-[var(--accent)] mb-4" />
                <h3 className="font-serif-display text-2xl sm:text-3xl text-[var(--navy)]">
                  384-Dimensional pgvector Similarity
                </h3>
                <p className="mt-2 text-sm sm:text-base text-[var(--navy-soft)] leading-relaxed">
                  Every crawled paper is embedded with sentence-transformers (all-MiniLM-L6-v2)
                  and indexed in PostgreSQL with HNSW vector distance. Instantly discover the top 5
                  conceptually related papers without manual citation chasing.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-3 font-mono-code text-xs text-[var(--navy-soft)]">
                <span className="rounded-lg bg-[var(--cream-deep)] px-2.5 py-1">vector(384)</span>
                <span className="rounded-lg bg-[var(--cream-deep)] px-2.5 py-1">Cosine Metric</span>
                <span className="rounded-lg bg-[var(--cream-deep)] px-2.5 py-1">Fast Cosine HNSW</span>
              </div>
            </div>
          </SpotlightCard>

          {/* Card 2: arXiv Terms Compliance */}
          <SpotlightCard>
            <div className="flex flex-col h-full justify-between">
              <div>
                <ShieldCheck className="h-8 w-8 text-emerald-700 mb-4" />
                <h3 className="font-serif-display text-2xl text-[var(--navy)]">
                  100% arXiv Compliant
                </h3>
                <p className="mt-2 text-sm text-[var(--navy-soft)] leading-relaxed">
                  Strictly observes the 3-second API interval with a token-bucket rate limiter.
                  Never scrapes HTML and links directly to official PDFs.
                </p>
              </div>
              <div className="mt-6 font-mono-code text-xs text-emerald-800 font-semibold">
                export.arxiv.org API
              </div>
            </div>
          </SpotlightCard>

          {/* Card 3: Quantitative Results */}
          <SpotlightCard>
            <div className="flex flex-col h-full justify-between">
              <div>
                <Zap className="h-8 w-8 text-[#D9A441] mb-4" />
                <h3 className="font-serif-display text-2xl text-[var(--navy)]">
                  Quantitative Headline Results
                </h3>
                <p className="mt-2 text-sm text-[var(--navy-soft)] leading-relaxed">
                  Engineered regex patterns capture BLEU, accuracy %, F1 scores, and error reduction
                  metrics so you can compare experimental gains at a glance.
                </p>
              </div>
              <div className="mt-6 font-mono-code text-xs text-[var(--navy-soft)]">
                e.g. "92.1% accuracy", "F1 of 0.87"
              </div>
            </div>
          </SpotlightCard>

          {/* Card 4: Offsets Not Markup */}
          <SpotlightCard className="md:col-span-2">
            <div className="flex flex-col h-full justify-between">
              <div>
                <Layers className="h-8 w-8 text-[#2A7F7F] mb-4" />
                <h3 className="font-serif-display text-2xl sm:text-3xl text-[var(--navy)]">
                  Offset-Accurate, Non-Destructive Storage
                </h3>
                <p className="mt-2 text-sm sm:text-base text-[var(--navy-soft)] leading-relaxed">
                  Annotations are stored as character offsets ([start_offset, end_offset]) into the
                  raw extracted text. Raw paper text is kept pure and unpolluted with HTML tags,
                  enabling swappable highlight models and LLM summarization plugins.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-3 font-mono-code text-xs text-[var(--navy-soft)]">
                <span className="rounded-lg bg-[var(--cream-deep)] px-2.5 py-1">Non-overlapping intervals</span>
                <span className="rounded-lg bg-[var(--cream-deep)] px-2.5 py-1">Swappable Engine</span>
              </div>
            </div>
          </SpotlightCard>
        </div>
      </section>

      {/* ========================================================
          6. ANIMATED STATS ROW
         ======================================================== */}
      <section className="border-y border-[var(--border)] bg-[var(--cream-deep)] py-16 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="font-serif-display text-4xl sm:text-6xl text-[var(--navy)]">
              <CountUp end={384} duration={1.5} />
            </div>
            <p className="mt-1 text-xs sm:text-sm font-medium text-[var(--navy-soft)] font-mono-code">
              Embedding Dimensions
            </p>
          </div>

          <div>
            <div className="font-serif-display text-4xl sm:text-6xl text-[var(--navy)]">
              <CountUp end={3} duration={1.2} suffix=".0s" />
            </div>
            <p className="mt-1 text-xs sm:text-sm font-medium text-[var(--navy-soft)] font-mono-code">
              arXiv Rate Limit Spacing
            </p>
          </div>

          <div>
            <div className="font-serif-display text-4xl sm:text-6xl text-[var(--navy)]">
              <CountUp end={4} duration={1.0} />
            </div>
            <p className="mt-1 text-xs sm:text-sm font-medium text-[var(--navy-soft)] font-mono-code">
              Semantic Highlight Tiers
            </p>
          </div>

          <div>
            <div className="font-serif-display text-4xl sm:text-6xl text-[var(--navy)]">
              <CountUp end={100} duration={1.6} suffix="%" />
            </div>
            <p className="mt-1 text-xs sm:text-sm font-medium text-[var(--navy-soft)] font-mono-code">
              Canonical Source Linking
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================
          7. FINAL CALL TO ACTION (Dark Section: Navy-Ink)
         ======================================================== */}
      <section className="dark-section bg-[var(--navy-ink)] py-28 px-6 text-center text-[var(--cream)] relative overflow-hidden">
        <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
          <Badge variant="gold" className="mb-4">
            Get Started
          </Badge>
          <h2 className="font-serif-display text-4xl sm:text-6xl text-[var(--cream)] tracking-tight">
            Explore the Frontiers of AI & Language
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[var(--cream)]/80 max-w-xl">
            Dive into the paper library, crawl new arXiv queries, and read papers with automatic
            color-coded highlights.
          </p>

          <div className="mt-10">
            <MagneticButton onClick={onNavigateDiscover}>
              <Button
                variant="accent"
                size="lg"
                className="rounded-full px-8 py-4 font-semibold text-base shadow-navy-lg"
              >
                <span>Open Discovery Portal</span>
                <ArrowRight size={18} className="ml-2" />
              </Button>
            </MagneticButton>
          </div>
        </div>
      </section>

      {/* ========================================================
          8. MINIMAL FOOTER
         ======================================================== */}
      <footer className="border-t border-[var(--border)] bg-[var(--cream)] py-10 px-6 text-xs text-[var(--navy-soft)]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-[var(--accent)]" />
            <span className="font-serif-display text-base font-semibold text-[var(--navy)]">
              Kakuja
            </span>
            <span className="text-[var(--navy-soft)]/60">
              — Academic Research Reader & Crawler
            </span>
          </div>

          <p className="text-center sm:text-right text-[11px] text-[var(--navy-soft)]/70">
            Adheres to export.arxiv.org API terms. PDFs are not rehosted.
          </p>

          <a
            href="https://github.com/Shraman91/Kakuja"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[var(--navy)] hover:text-[var(--accent)] transition-colors"
          >
            <GitBranch size={13} />
            <span>GitHub Repository</span>
            <ExternalLink size={11} />
          </a>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
