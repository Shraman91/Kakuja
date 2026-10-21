import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { FetchJob, PaperDetail } from '../api/types';
import CentipedeLoader from '../components/CentipedeLoader';
import PaperReader from '../components/PaperReader';
import Sidebar from '../components/Sidebar';
import './PaperPage.css';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  RotateCcw,
  Users,
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

  // Poll status if an ingestion job is required
  const pollJobAndLoadPaper = async (jobId: string) => {
    const pollInterval = 1800;
    const maxPolls = 60;

    for (let i = 0; i < maxPolls; i++) {
      try {
        const job = await api.getJob(jobId);
        setActiveJob(job);

        if (job.status === 'completed') {
          // Job complete, fetch the paper
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

  const loadPaper = async () => {
    setLoading(true);
    setError(null);
    setActiveJob(null);

    try {
      // First try to fetch from database
      const paperData = await api.getPaper(arxivId);
      setPaper(paperData);
      setLoading(false);
    } catch (err: any) {
      // If 404, trigger a fetch job
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
  };

  useEffect(() => {
    if (arxivId) {
      loadPaper();
    }
  }, [arxivId]);

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
    <div className="paper-page-container">
      {/* Top Navigation Bar */}
      <div className="paper-top-nav">
        <button type="button" className="back-btn" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Back to Library</span>
        </button>
      </div>

      {/* Loading state with Centipede Loader */}
      {loading ? (
        <div className="paper-loading-card">
          <CentipedeLoader
            active={true}
            label={getJobStatusLabel(activeJob)}
            body="#10b981"
            legs="#059669"
            head="#047857"
          />
        </div>
      ) : error ? (
        <div className="paper-error-card">
          <AlertTriangle size={36} className="error-icon" />
          <h2 className="error-title">Could not load paper</h2>
          <p className="error-text">{error}</p>
          <button type="button" className="retry-btn" onClick={loadPaper}>
            <RotateCcw size={15} />
            <span>Try Again</span>
          </button>
        </div>
      ) : paper ? (
        <div className="paper-main-layout">
          {/* Paper Header Card */}
          <header className="paper-header-card">
            <div className="header-meta-row">
              <span className="arxiv-tag">arXiv:{paper.arxiv_id}</span>
              {paper.categories.map((c, i) => (
                <span key={i} className="category-pill">
                  {c}
                </span>
              ))}
              {paper.published_at && (
                <span className="meta-date">
                  <Calendar size={13} />
                  {new Date(paper.published_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              )}
            </div>

            <h1 className="paper-hero-title">{paper.title}</h1>

            <div className="paper-authors-list">
              <Users size={15} className="authors-icon" />
              <span>{paper.authors.join(', ')}</span>
            </div>

            {/* Abstract preview box */}
            <div className="paper-abstract-box">
              <h2 className="abstract-heading">Abstract</h2>
              <p className="abstract-content">{paper.abstract}</p>
            </div>
          </header>

          {/* Reader & Sidebar 2-Column Grid */}
          <div className="paper-reader-grid">
            {/* Left Column: Full Text Reader with Highlights */}
            <div className="reader-column">
              <PaperReader
                fullText={paper.full_text || paper.abstract}
                annotations={paper.annotations || []}
                title={paper.title}
              />
            </div>

            {/* Right Column: Key Results, Concepts, Related Papers */}
            <div className="sidebar-column">
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
