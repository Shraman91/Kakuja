import React, { useEffect, useState } from 'react';
import { api } from '@/api/client';
import type { FetchJob, PaperDetail } from '@/api/types';
import { CentipedeLoader } from '@/components/CentipedeLoader';
import { PaperReader } from '@/components/PaperReader';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  RotateCcw,
  Users,
  PanelRightOpen,
} from 'lucide-react';

interface PaperPageProps {
  arxivId: string;
  onBack: () => void;
  onNavigatePaper: (newArxivId: string) => void;
}

export const PaperPage: React.FC<PaperPageProps> = ({
  arxivId,
  onBack,
  onNavigatePaper,
}) => {
  const [paper, setPaper] = useState<PaperDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeJob, setActiveJob] = useState<FetchJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [readingProgress, setReadingProgress] = useState(0);

  // Track window reading progress
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        setReadingProgress((window.scrollY / totalScroll) * 100);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Poll status if an ingestion job is required
  const pollJobAndLoadPaper = async (jobId: string) => {
    const pollInterval = 1800;
    const maxPolls = 60;

    for (let i = 0; i < maxPolls; i++) {
      try {
        const job = await api.getJob(jobId);
        setActiveJob(job);

        if (job.status === 'completed') {
          const paperData = await api.getPaper(arxivId);
          setPaper(paperData);
          setLoading(false);
          setActiveJob(null);
          return;
        }

        if (job.status === 'failed') {
          setError(job.error || `Could not ingest paper ${arxivId}.`);
          setLoading(false);
          return;
        }

        await new Promise((r) => setTimeout(r, pollInterval));
      } catch (err: any) {
        setError(err.message || 'Error checking ingestion progress.');
        setLoading(false);
        return;
      }
    }

    setError('Timed out waiting for paper ingestion.');
    setLoading(false);
  };

  const loadPaper = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setActiveJob(null);

    try {
      const paperData = await api.getPaper(arxivId);
      setPaper(paperData);
      setLoading(false);
    } catch (err: any) {
      if (err.message && (err.message.includes('404') || err.message.toLowerCase().includes('not found'))) {
        try {
          const job = await api.fetchPaper(arxivId);
          setActiveJob(job);
          await pollJobAndLoadPaper(job.id);
        } catch (fetchErr: any) {
          setError(fetchErr.message || `Failed to enqueue paper ${arxivId}`);
          setLoading(false);
        }
      } else {
        setError(err.message || 'Failed to load paper.');
        setLoading(false);
      }
    }
  }, [arxivId]);

  useEffect(() => {
    if (arxivId) {
      loadPaper();
    }
  }, [arxivId, loadPaper]);

  const getJobStatusLabel = (job: FetchJob | null): string => {
    if (!job) return `Preparing ${arxivId}...`;
    switch (job.status) {
      case 'queued':
        return `Queued paper ${job.arxiv_id} (0%)...`;
      case 'fetching_metadata':
        return `Fetching Atom metadata from arXiv API (${job.progress}%)...`;
      case 'downloading_pdf':
        return `Downloading PDF & extracting text sections (${job.progress}%)...`;
      case 'analyzing':
        return `Analyzing key concepts, results & embeddings (${job.progress}%)...`;
      case 'completed':
        return `Complete! Loading reader...`;
      case 'failed':
        return `Failed: ${job.error || 'Unknown error'}`;
      default:
        return `Ingesting paper ${job.arxiv_id}...`;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--cream)] px-6 py-8 max-w-7xl mx-auto flex flex-col gap-6 relative">
      {/* Top Fixed Reading Progress Indicator */}
      <div
        className="fixed top-0 left-0 right-0 h-1 bg-[var(--accent)] z-50 transition-all duration-150 ease-out"
        style={{ width: `${readingProgress}%` }}
        role="progressbar"
        aria-valuenow={Math.round(readingProgress)}
        aria-valuemin={0}
        aria-valuemax={100}
      />

      {/* Top Navigation Row */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="rounded-xl border-[var(--border)] bg-[var(--paper)] text-[var(--navy)] hover:bg-[var(--cream-deep)]"
        >
          <ArrowLeft size={15} className="mr-2" />
          <span>Back to Library</span>
        </Button>

        {/* Mobile Sidebar Trigger Sheet */}
        {paper && (
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <PanelRightOpen size={15} />
                  <span>Insights & Relatives</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Paper Insights</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  <Sidebar
                    arxivId={paper.arxiv_id}
                    annotations={paper.annotations || []}
                    pdfUrl={paper.pdf_url}
                    onNavigatePaper={onNavigatePaper}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        )}
      </div>

      {/* Loading state with enhanced Centipede Loader */}
      {loading ? (
        <Card className="p-16 flex flex-col items-center justify-center bg-[var(--paper)] border-[var(--border)] shadow-navy-sm min-h-[380px]">
          <CentipedeLoader
            active={true}
            theme="navy"
            size="lg"
            label={getJobStatusLabel(activeJob)}
          />
        </Card>
      ) : error ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center border-red-300 bg-red-50/50 shadow-navy-sm">
          <AlertTriangle size={36} className="text-red-700 mb-3" />
          <h2 className="font-serif-display text-2xl text-red-900 font-semibold">
            Could not load paper
          </h2>
          <p className="mt-1 text-sm text-red-800/80 max-w-md">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={loadPaper}
            className="mt-5 border-red-300 text-red-900 hover:bg-red-100"
          >
            <RotateCcw size={14} className="mr-2" />
            <span>Try Again</span>
          </Button>
        </Card>
      ) : paper ? (
        <div className="flex flex-col gap-8">
          {/* Paper Editorial Header Card */}
          <Card className="p-8 sm:p-10 bg-[var(--paper)] border-[var(--border)] shadow-navy-sm">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="font-mono-code text-xs font-semibold px-2.5 py-0.5 rounded bg-[var(--navy)] text-[var(--cream)]">
                arXiv:{paper.arxiv_id}
              </span>
              {paper.categories.map((c, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {c}
                </Badge>
              ))}
              {paper.published_at && (
                <span className="ml-auto flex items-center gap-1.5 text-xs text-[var(--navy-soft)]/70">
                  <Calendar size={13} />
                  {new Date(paper.published_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              )}
            </div>

            <h1 className="font-serif-display text-3xl sm:text-5xl font-normal leading-tight text-[var(--navy)] tracking-tight">
              {paper.title}
            </h1>

            <div className="mt-4 flex items-center gap-2 text-sm text-[var(--navy-soft)]">
              <Users size={16} className="text-[var(--accent)] shrink-0" />
              <span>{paper.authors.join(', ')}</span>
            </div>

            {/* Abstract Box */}
            <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--cream)]/60 p-5">
              <h2 className="text-xs font-mono-code font-bold uppercase tracking-wider text-[var(--navy-soft)]/70 mb-2">
                Abstract
              </h2>
              <p className="font-serif-editorial text-sm sm:text-base leading-relaxed text-[var(--navy)]/90">
                {paper.abstract}
              </p>
            </div>
          </Card>

          {/* 2-Column Reader Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
            {/* Left: Full Text Reader with 70ch measure */}
            <div>
              <PaperReader
                fullText={paper.full_text || paper.abstract}
                annotations={paper.annotations || []}
                title={paper.title}
                arxivId={paper.arxiv_id}
                onPaperUpdated={(updated) => setPaper(updated)}
              />
            </div>

            {/* Right: Sticky Desktop Sidebar */}
            <div className="hidden lg:block sticky top-6">
              <Sidebar
                arxivId={paper.arxiv_id}
                annotations={paper.annotations || []}
                pdfUrl={paper.pdf_url}
                onNavigatePaper={onNavigatePaper}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default PaperPage;
