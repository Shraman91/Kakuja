import React, { useState } from 'react';
import { api } from '../api/client';
import type { FetchJob } from '../api/types';
import CentipedeLoader from './CentipedeLoader';
import './SearchCrawlBar.css';
import { Search, SlidersHorizontal, ArrowRight, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface SearchCrawlBarProps {
  onPaperReady?: (arxivId: string) => void;
  onCrawlQueued?: () => void;
}

const ARXIV_ID_REGEX = /^(?:arxiv:)?([0-9]{4}\.[0-9]{4,5}|[a-z\-]+(?:\.[A-Z]{2})?\/\d{7})(?:v\d+)?$/i;

const COMMON_CATEGORIES = [
  { id: '', label: 'All Categories' },
  { id: 'cs.CL', label: 'Computation and Language (cs.CL)' },
  { id: 'cs.AI', label: 'Artificial Intelligence (cs.AI)' },
  { id: 'cs.LG', label: 'Machine Learning (cs.LG)' },
  { id: 'cs.CV', label: 'Computer Vision (cs.CV)' },
  { id: 'stat.ML', label: 'Machine Learning (stat.ML)' },
];

export const SearchCrawlBar: React.FC<SearchCrawlBarProps> = ({
  onPaperReady,
  onCrawlQueued,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [maxPapers, setMaxPapers] = useState(20);
  const [category, setCategory] = useState('');
  const [showOptions, setShowOptions] = useState(false);

  // Ingestion tracking
  const [activeJob, setActiveJob] = useState<FetchJob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Detect whether input looks like an arXiv ID
  const isArxivId = ARXIV_ID_REGEX.test(inputVal.trim());

  // Poll job status until complete or failed
  const pollJobStatus = async (jobId: string, arxivId: string) => {
    const pollInterval = 1800; // 1.8s
    const maxPolls = 60; // 60 * 1.8s ~ 108 seconds timeout

    for (let i = 0; i < maxPolls; i++) {
      try {
        const job = await api.getJob(jobId);
        setActiveJob(job);

        if (job.status === 'completed') {
          setSuccessMessage(`Paper ${job.arxiv_id} is ready!`);
          setIsSubmitting(false);
          if (onPaperReady) {
            setTimeout(() => {
              onPaperReady(arxivId);
            }, 1200);
          }
          return;
        }

        if (job.status === 'failed') {
          setErrorMessage(job.error || 'Paper ingestion encountered a failure.');
          setIsSubmitting(false);
          return;
        }

        await new Promise((r) => setTimeout(r, pollInterval));
      } catch (err: any) {
        console.error('Job polling error:', err);
        setErrorMessage(err.message || 'Error checking job status');
        setIsSubmitting(false);
        return;
      }
    }

    setErrorMessage('Ingestion timed out. The server may still be downloading the paper.');
    setIsSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputVal.trim();
    if (!query) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      if (isArxivId) {
        // Single paper fetch
        const job = await api.fetchPaper(query);
        setActiveJob(job);
        pollJobStatus(job.id, job.arxiv_id);
      } else {
        // Bulk crawl search query
        const crawlRes = await api.crawlPapers({
          query,
          max_papers: maxPapers,
          category: category || undefined,
        });

        setSuccessMessage(
          `Crawl initiated: queued ${crawlRes.queued_count} papers (skipped ${crawlRes.skipped_count} already cached).`
        );
        setIsSubmitting(false);
        if (onCrawlQueued) {
          onCrawlQueued();
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit request');
      setIsSubmitting(false);
    }
  };

  const getJobStatusLabel = (job: FetchJob | null): string => {
    if (!job) return 'Connecting to arXiv...';
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
        return `Completed! Loading reader (${job.progress}%)...`;
      case 'failed':
        return `Failed: ${job.error || 'Unknown error'}`;
      default:
        return `Processing ${job.arxiv_id}...`;
    }
  };

  return (
    <div className="search-crawl-container">
      <form onSubmit={handleSubmit} className="search-crawl-form">
        <div className="search-input-wrapper">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            className="search-main-input"
            placeholder="Enter arXiv ID (e.g. 1706.03762) or topic query (e.g. attention mechanism)..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            disabled={isSubmitting}
          />
          <button
            type="button"
            className={`options-toggle-btn ${showOptions ? 'active' : ''}`}
            onClick={() => setShowOptions(!showOptions)}
            title="Toggle crawl settings"
          >
            <SlidersHorizontal size={17} />
          </button>
        </div>

        <button
          type="submit"
          className={`submit-action-btn ${isArxivId ? 'btn-id-fetch' : 'btn-crawl'}`}
          disabled={isSubmitting || !inputVal.trim()}
        >
          {isArxivId ? (
            <>
              <span>Fetch Paper</span>
              <ArrowRight size={16} />
            </>
          ) : (
            <>
              <Sparkles size={16} />
              <span>Crawl arXiv</span>
            </>
          )}
        </button>
      </form>

      {/* Crawl Options Accordion */}
      {showOptions && (
        <div className="crawl-options-panel">
          <div className="option-field">
            <label className="option-label">Category Filter:</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="option-select"
            >
              {COMMON_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="option-field">
            <label className="option-label">
              Max Papers to Ingest: <span className="option-val">{maxPapers}</span>
            </label>
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={maxPapers}
              onChange={(e) => setMaxPapers(Number(e.target.value))}
              className="option-range"
            />
          </div>
        </div>
      )}

      {/* Active Centipede Loader while Fetching/Crawling */}
      {isSubmitting && (
        <div className="crawler-progress-card">
          <CentipedeLoader
            active={true}
            label={getJobStatusLabel(activeJob)}
            body="#10b981"
            legs="#059669"
            head="#047857"
          />
        </div>
      )}

      {/* Success Notification */}
      {successMessage && !isSubmitting && (
        <div className="status-banner success">
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && !isSubmitting && (
        <div className="status-banner error">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

export default SearchCrawlBar;
