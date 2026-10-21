import React, { useEffect, useState } from 'react';
import type { Annotation, RelatedPaper } from '../api/types';
import { api } from '../api/client';
import './Sidebar.css';
import { ExternalLink, FileText, Sparkles, Award, ArrowRight } from 'lucide-react';

interface SidebarProps {
  arxivId: string;
  annotations: Annotation[];
  pdfUrl?: string;
  onNavigatePaper: (arxivId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  arxivId,
  annotations,
  pdfUrl,
  onNavigatePaper,
}) => {
  const [relatedPapers, setRelatedPapers] = useState<RelatedPaper[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  // Fetch related papers
  useEffect(() => {
    let isMounted = true;
    async function loadRelated() {
      setLoadingRelated(true);
      try {
        const data = await api.getRelatedPapers(arxivId, 5);
        if (isMounted) setRelatedPapers(data);
      } catch (err) {
        console.warn('Could not load related papers:', err);
      } finally {
        if (isMounted) setLoadingRelated(false);
      }
    }
    if (arxivId) loadRelated();
    return () => {
      isMounted = false;
    };
  }, [arxivId]);

  // Extract unique key concepts
  const keyConcepts = React.useMemo(() => {
    const concepts = annotations.filter((a) => a.category === 'concept');
    const uniqueMap = new Map<string, number>();
    concepts.forEach((c) => {
      const lower = c.text.toLowerCase();
      uniqueMap.set(lower, (uniqueMap.get(lower) || 0) + 1);
    });
    return Array.from(uniqueMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 16);
  }, [annotations]);

  // Extract key headline results
  const headlineResults = React.useMemo(() => {
    const results = annotations.filter((a) => a.category === 'result');
    const unique = Array.from(new Set(results.map((r) => r.text)));
    return unique.slice(0, 6);
  }, [annotations]);

  const arxivAbsUrl = `https://arxiv.org/abs/${arxivId}`;
  const directPdfUrl = pdfUrl || `https://arxiv.org/pdf/${arxivId}.pdf`;

  return (
    <aside className="paper-sidebar">
      {/* Official arXiv Source Links */}
      <div className="sidebar-section">
        <h3 className="sidebar-heading">Original Source</h3>
        <div className="source-links-group">
          <a
            href={arxivAbsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="source-link-btn"
          >
            <FileText size={15} />
            <span>arXiv Abstract</span>
            <ExternalLink size={13} className="ext-icon" />
          </a>
          <a
            href={directPdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="source-link-btn primary"
          >
            <FileText size={15} />
            <span>Official PDF</span>
            <ExternalLink size={13} className="ext-icon" />
          </a>
        </div>
      </div>

      {/* Headline Results */}
      {headlineResults.length > 0 && (
        <div className="sidebar-section">
          <h3 className="sidebar-heading">
            <Award size={15} className="heading-icon gold" />
            Headline Results
          </h3>
          <div className="results-list">
            {headlineResults.map((res, i) => (
              <div key={i} className="result-chip">
                <span className="result-bullet">★</span>
                <span className="result-text">{res}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Concepts Cloud */}
      {keyConcepts.length > 0 && (
        <div className="sidebar-section">
          <h3 className="sidebar-heading">
            <Sparkles size={15} className="heading-icon blue" />
            Key Concepts
          </h3>
          <div className="concepts-cloud">
            {keyConcepts.map(([concept, count], i) => (
              <span key={i} className="concept-pill">
                {concept}
                {count > 1 && <span className="pill-count">{count}</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Related Papers via pgvector */}
      <div className="sidebar-section">
        <h3 className="sidebar-heading">Related Papers (pgvector)</h3>
        {loadingRelated ? (
          <div className="sidebar-skeleton">Calculating similarity...</div>
        ) : relatedPapers.length === 0 ? (
          <p className="sidebar-empty">No similar papers indexed yet.</p>
        ) : (
          <div className="related-papers-list">
            {relatedPapers.map((paper) => {
              const simPercent = Math.round(paper.similarity_score * 100);
              return (
                <div
                  key={paper.id}
                  className="related-paper-card"
                  onClick={() => onNavigatePaper(paper.arxiv_id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onNavigatePaper(paper.arxiv_id);
                  }}
                >
                  <div className="related-paper-title">{paper.title}</div>
                  <div className="related-paper-authors">
                    {paper.authors.slice(0, 2).join(', ')}
                    {paper.authors.length > 2 && ' et al.'}
                  </div>
                  <div className="similarity-row">
                    <div className="similarity-bar-bg">
                      <div
                        className="similarity-bar-fill"
                        style={{ width: `${Math.max(10, simPercent)}%` }}
                      />
                    </div>
                    <span className="similarity-label">{simPercent}% match</span>
                  </div>
                  <div className="card-hover-arrow">
                    <ArrowRight size={14} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
