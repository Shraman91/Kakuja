import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { PaperListItem } from '../api/types';
import SearchCrawlBar from '../components/SearchCrawlBar';
import './HomePage.css';
import {
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';

interface HomePageProps {
  onSelectPaper: (arxivId: string) => void;
}

const CATEGORIES = [
  { id: '', label: 'All Categories' },
  { id: 'cs.CL', label: 'cs.CL (Computation & Language)' },
  { id: 'cs.AI', label: 'cs.AI (Artificial Intelligence)' },
  { id: 'cs.LG', label: 'cs.LG (Machine Learning)' },
  { id: 'cs.CV', label: 'cs.CV (Computer Vision)' },
  { id: 'stat.ML', label: 'stat.ML (Statistics / ML)' },
];

export const HomePage: React.FC<HomePageProps> = ({ onSelectPaper }) => {
  const [papers, setPapers] = useState<PaperListItem[]>([]);
  const [totalPapers, setTotalPapers] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLibrary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listPapers({
        q: searchQuery || undefined,
        category: categoryFilter || undefined,
        page,
        page_size: 12,
      });
      setPapers(res.items);
      setTotalPapers(res.total);
      setPages(res.pages);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch indexed papers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, [page, categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLibrary();
  };

  return (
    <div className="home-page-container">
      {/* Hero Header */}
      <section className="hero-section">
        <div className="hero-badge">
          <Sparkles size={14} className="sparkle-icon" />
          <span>Full-Stack arXiv Paper Crawler & Semantic Reader</span>
        </div>
        <h1 className="hero-title">
          Explore Research with <span className="gradient-text">Instant Highlights</span>
        </h1>
        <p className="hero-subtitle">
          Crawl papers from arXiv, extract quantitative metrics, model methods, and datasets, and
          read them in an interactive reader backed by pgvector semantic similarity.
        </p>

        {/* Search & Crawl Input */}
        <div className="hero-search-wrapper">
          <SearchCrawlBar
            onPaperReady={(arxivId) => onSelectPaper(arxivId)}
            onCrawlQueued={() => {
              setTimeout(() => {
                setPage(1);
                fetchLibrary();
              }, 1500);
            }}
          />
        </div>
      </section>

      {/* Library Section */}
      <section className="library-section">
        <div className="library-header">
          <div className="library-title-group">
            <h2 className="library-title">Indexed Papers Library</h2>
            <span className="library-counter-badge">{totalPapers} papers</span>
          </div>

          {/* Filters Bar */}
          <div className="library-controls">
            <form onSubmit={handleSearchSubmit} className="library-search-box">
              <Search size={16} className="lib-search-icon" />
              <input
                type="text"
                placeholder="Search library..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="lib-search-input"
              />
            </form>

            <div className="category-select-wrapper">
              <Filter size={15} className="filter-icon" />
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                className="lib-category-select"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="refresh-btn"
              onClick={fetchLibrary}
              title="Refresh library"
            >
              <RefreshCw size={15} className={loading ? 'spinning' : ''} />
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && <div className="library-error-card">{error}</div>}

        {/* Papers Grid */}
        {loading ? (
          <div className="papers-grid skeleton-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="paper-card skeleton-card">
                <div className="skeleton-title" />
                <div className="skeleton-line short" />
                <div className="skeleton-line" />
                <div className="skeleton-line" />
              </div>
            ))}
          </div>
        ) : papers.length === 0 ? (
          <div className="empty-library-card">
            <BookOpen size={48} className="empty-icon" />
            <h3 className="empty-title">No papers found</h3>
            <p className="empty-desc">
              {searchQuery || categoryFilter
                ? 'Try adjusting your search terms or category filters.'
                : 'Enter an arXiv ID above (e.g. 1706.03762 for "Attention Is All You Need") or run a crawl query.'}
            </p>
            <button
              type="button"
              className="try-example-btn"
              onClick={() => onSelectPaper('1706.03762')}
            >
              Fetch Example Paper: 1706.03762
            </button>
          </div>
        ) : (
          <div className="papers-grid">
            {papers.map((paper) => (
              <article
                key={paper.id}
                className="paper-card"
                onClick={() => onSelectPaper(paper.arxiv_id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSelectPaper(paper.arxiv_id);
                }}
              >
                <div className="card-top-meta">
                  <span className="arxiv-id-badge">arXiv:{paper.arxiv_id}</span>
                  {paper.published_at && (
                    <span className="published-date">
                      <Calendar size={12} />
                      {new Date(paper.published_at).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <h3 className="paper-card-title">{paper.title}</h3>

                <div className="paper-card-authors">
                  <Users size={13} className="authors-icon" />
                  <span>
                    {paper.authors.slice(0, 3).join(', ')}
                    {paper.authors.length > 3 && ` +${paper.authors.length - 3} more`}
                  </span>
                </div>

                <p className="paper-card-abstract">{paper.abstract}</p>

                <div className="card-footer-tags">
                  <div className="category-tags">
                    {paper.categories.slice(0, 3).map((cat, i) => (
                      <span key={i} className="cat-tag">
                        {cat}
                      </span>
                    ))}
                  </div>
                  <span className="read-action-link">Open Reader →</span>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Pagination Bar */}
        {pages > 1 && (
          <div className="pagination-bar">
            <button
              type="button"
              className="pagination-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>
            <span className="pagination-info">
              Page {page} of {pages}
            </span>
            <button
              type="button"
              className="pagination-btn"
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default HomePage;
