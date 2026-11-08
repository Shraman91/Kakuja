import React, { useEffect, useState } from 'react';
import { api } from '@/api/client';
import type { FetchJob, PaperListItem } from '@/api/types';
import { CentipedeLoader } from '@/components/CentipedeLoader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';

interface DiscoverPageProps {
  onSelectPaper: (arxivId: string) => void;
  initialQuery?: string;
}

const CATEGORIES = [
  { id: '', label: 'All Categories' },
  { id: 'cs.CL', label: 'Computation and Language (cs.CL)' },
  { id: 'cs.AI', label: 'Artificial Intelligence (cs.AI)' },
  { id: 'cs.LG', label: 'Machine Learning (cs.LG)' },
  { id: 'cs.CV', label: 'Computer Vision (cs.CV)' },
  { id: 'stat.ML', label: 'Statistics / ML (stat.ML)' },
];

export const DiscoverPage: React.FC<DiscoverPageProps> = ({
  onSelectPaper,
  initialQuery = '',
}) => {
  // Command bar state
  const [activeTab, setActiveTab] = useState<'id' | 'crawl'>('id');
  const [singleId, setSingleId] = useState(initialQuery);
  const [crawlQuery, setCrawlQuery] = useState('');
  const [crawlCategory, setCrawlCategory] = useState('');
  const [maxPapers, setMaxPapers] = useState(20);

  // Ingestion tracking
  const [activeJob, setActiveJob] = useState<FetchJob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Library state
  const [papers, setPapers] = useState<PaperListItem[]>([]);
  const [totalPapers, setTotalPapers] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [libraryFilterQuery, setLibraryFilterQuery] = useState('');
  const [libraryCategoryFilter, setLibraryCategoryFilter] = useState('');
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(true);

  // Fetch library papers
  const fetchLibrary = React.useCallback(async () => {
    setIsLoadingLibrary(true);
    try {
      const res = await api.listPapers({
        q: libraryFilterQuery || undefined,
        category: libraryCategoryFilter || undefined,
        page,
        page_size: 12,
      });
      setPapers(res.items);
      setTotalPapers(res.total);
      setPages(res.pages);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load library papers', { id: 'library-fetch-error' });
    } finally {
      setIsLoadingLibrary(false);
    }
  }, [libraryFilterQuery, libraryCategoryFilter, page]);

  // Poll single fetch job
  const pollJobStatus = React.useCallback(async (jobId: string, arxivId: string) => {
    const pollInterval = 1800;
    const maxPolls = 60;

    for (let i = 0; i < maxPolls; i++) {
      try {
        const job = await api.getJob(jobId);
        setActiveJob(job);

        if (job.status === 'completed') {
          toast.success(`Paper ${job.arxiv_id} ingested successfully!`);
          setIsSubmitting(false);
          setActiveJob(null);
          fetchLibrary();
          onSelectPaper(arxivId);
          return;
        }

        if (job.status === 'failed') {
          toast.error(job.error || `Failed to ingest paper ${job.arxiv_id}`);
          setIsSubmitting(false);
          setActiveJob(null);
          return;
        }

        await new Promise((r) => setTimeout(r, pollInterval));
      } catch (err: any) {
        toast.error(err.message || 'Error tracking ingestion job');
        setIsSubmitting(false);
        setActiveJob(null);
        return;
      }
    }

    toast.warning('Ingestion timed out. Paper might still be downloading.');
    setIsSubmitting(false);
    setActiveJob(null);
  }, [fetchLibrary, onSelectPaper]);

  // Submit Single Fetch
  const handleSingleFetch = React.useCallback(async (idToFetch?: string) => {
    const id = (idToFetch || singleId).trim();
    if (!id) {
      toast.error('Please enter an arXiv ID');
      return;
    }

    setIsSubmitting(true);
    setActiveJob(null);

    try {
      const job = await api.fetchPaper(id);
      setActiveJob(job);
      toast.info(`Fetching arXiv paper ${job.arxiv_id}...`);
      pollJobStatus(job.id, job.arxiv_id);
    } catch (err: any) {
      toast.error(err.message || 'Could not queue paper fetch');
      setIsSubmitting(false);
    }
  }, [singleId, pollJobStatus]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  // If initialQuery matches arXiv ID format or has text, run fetch
  useEffect(() => {
    if (initialQuery) {
      if (/^[0-9]{4}\.[0-9]{4,5}/.test(initialQuery)) {
        setActiveTab('id');
        setSingleId(initialQuery);
        handleSingleFetch(initialQuery);
      } else {
        setActiveTab('crawl');
        setCrawlQuery(initialQuery);
      }
    }
  }, [initialQuery, handleSingleFetch]);

  // Submit Crawl
  const handleCrawlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = crawlQuery.trim();
    if (!query) {
      toast.error('Please enter a research topic or search query');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.crawlPapers({
        query,
        max_papers: maxPapers,
        category: crawlCategory || undefined,
      });

      toast.success(
        `Crawl batch enqueued! Queued ${res.queued_count} papers (skipped ${res.skipped_count} cached).`
      );
      setIsSubmitting(false);
      setTimeout(() => {
        setPage(1);
        fetchLibrary();
      }, 1500);
    } catch (err: any) {
      toast.error(err.message || 'Crawl request failed');
      setIsSubmitting(false);
    }
  };

  const getJobStatusLabel = (job: FetchJob | null): string => {
    if (!job) return 'Connecting to arXiv API...';
    switch (job.status) {
      case 'queued':
        return `Queued paper ${job.arxiv_id} (0%)...`;
      case 'fetching_metadata':
        return `Fetching Atom feed metadata (${job.progress}%)...`;
      case 'downloading_pdf':
        return `Downloading PDF & extracting text sections (${job.progress}%)...`;
      case 'analyzing':
        return `Analyzing entities, results & embeddings (${job.progress}%)...`;
      case 'completed':
        return `Ingestion complete! Loading...`;
      case 'failed':
        return `Failed: ${job.error || 'Unknown error'}`;
      default:
        return `Processing ${job.arxiv_id}...`;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--cream)] px-6 py-10 max-w-7xl mx-auto flex flex-col gap-10">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <h1 className="font-serif-display text-4xl sm:text-5xl text-[var(--navy)] tracking-tight">
            Research Portal & Library
          </h1>
          <p className="mt-1 text-sm text-[var(--navy-soft)]">
            Ingest specific arXiv papers, crawl thematic query batches, and explore stored embeddings.
          </p>
        </div>
      </div>

      {/* Command Ingestion Card */}
      <Card className="p-6 bg-[var(--paper)] border-[var(--border)] shadow-navy-sm">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'id' | 'crawl')}>
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4 mb-5">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[var(--accent)]" />
              <span className="font-serif-display text-lg text-[var(--navy)] font-medium">
                Ingestion Command Center
              </span>
            </div>
            <TabsList>
              <TabsTrigger value="id">Fetch by arXiv ID</TabsTrigger>
              <TabsTrigger value="crawl">Crawl Query</TabsTrigger>
            </TabsList>
          </div>

          {/* Tab 1: Fetch by ID */}
          <TabsContent value="id" className="space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSingleFetch();
              }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Input
                value={singleId}
                onChange={(e) => setSingleId(e.target.value)}
                placeholder="e.g. 1706.03762 or 1810.04805"
                disabled={isSubmitting}
                className="font-mono-code text-sm"
              />
              <Button
                type="submit"
                variant="default"
                disabled={isSubmitting || !singleId.trim()}
                className="shrink-0"
              >
                <span>Fetch Paper</span>
                <ArrowRight size={15} className="ml-2" />
              </Button>
            </form>
          </TabsContent>

          {/* Tab 2: Crawl Query */}
          <TabsContent value="crawl" className="space-y-4">
            <form onSubmit={handleCrawlSubmit} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  value={crawlQuery}
                  onChange={(e) => setCrawlQuery(e.target.value)}
                  placeholder="e.g. latent diffusion models, transformer attention..."
                  disabled={isSubmitting}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  variant="default"
                  disabled={isSubmitting || !crawlQuery.trim()}
                  className="shrink-0"
                >
                  <Sparkles size={15} className="mr-2 text-[var(--accent)]" />
                  <span>Start Batch Crawl</span>
                </Button>
              </div>

              {/* Crawl Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[var(--navy-soft)]">
                    arXiv Category Filter:
                  </label>
                  <select
                    value={crawlCategory}
                    onChange={(e) => setCrawlCategory(e.target.value)}
                    className="h-10 rounded-xl border border-[var(--border)] bg-[var(--paper)] px-3 text-xs text-[var(--navy)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs text-[var(--navy-soft)]">
                    <span className="font-medium">Max Papers to Ingest:</span>
                    <span className="font-mono-code font-bold text-[var(--navy)]">{maxPapers}</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={maxPapers}
                    onChange={(e) => setMaxPapers(Number(e.target.value))}
                    className="h-2 rounded-lg accent-[var(--navy)] cursor-pointer mt-2"
                  />
                </div>
              </div>
            </form>
          </TabsContent>
        </Tabs>

        {/* Ingestion Centipede Progress Loader */}
        {isSubmitting && (
          <div className="mt-6 pt-6 border-t border-[var(--border-subtle)] flex flex-col items-center">
            <CentipedeLoader
              active={true}
              theme="navy"
              size="md"
              label={getJobStatusLabel(activeJob)}
            />
          </div>
        )}
      </Card>

      {/* Library Section */}
      <section className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="font-serif-display text-3xl text-[var(--navy)] tracking-tight">
              Indexed Library
            </h2>
            <Badge variant="secondary" className="font-mono-code">
              {totalPapers} papers
            </Badge>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--navy-soft)]/60" />
              <Input
                value={libraryFilterQuery}
                onChange={(e) => setLibraryFilterQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setPage(1);
                    fetchLibrary();
                  }
                }}
                placeholder="Search library..."
                className="pl-9 h-9 text-xs"
              />
            </div>

            <select
              value={libraryCategoryFilter}
              onChange={(e) => {
                setLibraryCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 rounded-xl border border-[var(--border)] bg-[var(--paper)] px-3 text-xs text-[var(--navy)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id || 'All Categories'}
                </option>
              ))}
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPage(1);
                fetchLibrary();
              }}
              title="Refresh library"
            >
              <RefreshCw size={14} className={isLoadingLibrary ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>

        {/* Papers Grid */}
        {isLoadingLibrary ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-6 space-y-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-16 w-full" />
              </Card>
            ))}
          </div>
        ) : papers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 rounded-2xl border border-[var(--border)] bg-[var(--paper)] text-center shadow-navy-sm">
            <div className="h-12 w-12 rounded-full bg-[var(--cream-deep)] flex items-center justify-center text-[var(--navy-soft)] mb-4">
              <BookOpen size={24} />
            </div>
            <h3 className="font-serif-display text-2xl text-[var(--navy)]">No Papers Found</h3>
            <p className="mt-1 text-sm text-[var(--navy-soft)] max-w-sm">
              Try crawling a new arXiv topic or adjust your search filters above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {papers.map((paper) => (
              <Card
                key={paper.id}
                onClick={() => onSelectPaper(paper.arxiv_id)}
                className="group p-6 flex flex-col justify-between cursor-pointer border border-[var(--border)] bg-[var(--paper)] rounded-2xl shadow-navy-sm hover:shadow-navy-md hover:-translate-y-1 transition-all duration-200"
              >
                <div>
                  {/* Meta Tag Row */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono-code text-xs font-semibold px-2 py-0.5 rounded bg-[var(--cream-deep)] border border-[var(--border)] text-[var(--navy)]">
                      arXiv:{paper.arxiv_id}
                    </span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {paper.categories.slice(0, 2).map((c, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] py-0 px-1.5">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-serif-display text-xl font-normal leading-snug text-[var(--navy)] group-hover:text-[var(--navy-ink)] transition-colors">
                    <span className="group-hover:underline group-hover:decoration-[var(--accent)] group-hover:underline-offset-4 decoration-2">
                      {paper.title}
                    </span>
                  </h3>

                  {/* Authors */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--navy-soft)] line-clamp-1">
                          <Users size={13} className="shrink-0 text-[var(--accent)]" />
                          <span className="truncate">{paper.authors.join(', ')}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{paper.authors.join(', ')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Abstract Snippet */}
                  <p className="mt-3 text-xs sm:text-sm text-[var(--navy-soft)]/80 line-clamp-3 leading-relaxed">
                    {paper.abstract}
                  </p>
                </div>

                {/* Footer */}
                <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--navy-soft)]">
                  {paper.published_at && (
                    <span className="flex items-center gap-1 text-[11px]">
                      <Calendar size={12} />
                      {new Date(paper.published_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  )}
                  <span className="inline-flex items-center font-medium text-[var(--navy)] group-hover:text-[var(--accent)] transition-colors">
                    Read Paper <ArrowRight size={12} className="ml-1" />
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination Bar */}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={14} className="mr-1" />
              Previous
            </Button>
            <span className="text-xs font-mono-code text-[var(--navy-soft)]">
              Page {page} of {pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
            >
              Next
              <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        )}
      </section>
    </div>
  );
};

export default DiscoverPage;
