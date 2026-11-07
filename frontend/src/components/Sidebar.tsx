import React, { useEffect, useState } from 'react';
import type { Annotation, RelatedPaper } from '@/api/types';
import { api } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  ExternalLink,
  FileText,
  Sparkles,
  Award,
  ArrowRight,
  Database,
} from 'lucide-react';

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

  // Key concepts
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

  // Headline results
  const headlineResults = React.useMemo(() => {
    const results = annotations.filter((a) => a.category === 'result');
    const unique = Array.from(new Set(results.map((r) => r.text)));
    return unique.slice(0, 6);
  }, [annotations]);

  const arxivAbsUrl = `https://arxiv.org/abs/${arxivId}`;
  const directPdfUrl = pdfUrl || `https://arxiv.org/pdf/${arxivId}.pdf`;

  return (
    <aside className="flex flex-col gap-6 w-full">
      {/* Official arXiv Source Links */}
      <Card className="p-5 bg-[var(--paper)] border-[var(--border)] shadow-navy-sm">
        <h3 className="font-serif-display text-lg text-[var(--navy)] mb-3">
          Original Source
        </h3>
        <div className="flex flex-col gap-2.5">
          <a
            href={arxivAbsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--cream)] px-3.5 py-2 text-xs font-medium text-[var(--navy)] hover:bg-[var(--cream-deep)] transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-[var(--navy-soft)]" />
              <span>arXiv Abstract</span>
            </div>
            <ExternalLink size={12} className="opacity-60" />
          </a>

          <a
            href={directPdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl bg-[var(--navy)] px-3.5 py-2 text-xs font-medium text-[var(--cream)] hover:bg-[var(--navy-soft)] shadow-navy-sm transition-all"
          >
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-[var(--accent)]" />
              <span>Official PDF</span>
            </div>
            <ExternalLink size={12} className="opacity-80" />
          </a>
        </div>
      </Card>

      {/* Headline Results */}
      {headlineResults.length > 0 && (
        <Card className="p-5 bg-[var(--paper)] border-[var(--border)] shadow-navy-sm">
          <div className="flex items-center gap-2 mb-3">
            <Award size={15} className="text-[#D9A441]" />
            <h3 className="font-serif-display text-lg text-[var(--navy)]">
              Headline Results
            </h3>
          </div>
          <div className="flex flex-col gap-2">
            {headlineResults.map((res, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-xl border border-[#D9A441]/40 bg-[#D9A441]/15 px-3 py-2 text-xs text-[#684803] font-semibold"
              >
                <span className="text-[#D9A441] mt-0.5">★</span>
                <span className="break-words">{res}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Key Concepts Badges */}
      {keyConcepts.length > 0 && (
        <Card className="p-5 bg-[var(--paper)] border-[var(--border)] shadow-navy-sm">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={15} className="text-[#C2674A]" />
            <h3 className="font-serif-display text-lg text-[var(--navy)]">
              Key Concepts
            </h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {keyConcepts.map(([concept, count], i) => (
              <Badge
                key={i}
                variant="concept"
                className="text-[11px] font-normal py-0.5 px-2.5 rounded-lg"
              >
                <span>{concept}</span>
                {count > 1 && (
                  <span className="ml-1 text-[9px] font-mono-code font-bold opacity-75">
                    ×{count}
                  </span>
                )}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Related Papers via pgvector */}
      <Card className="p-5 bg-[var(--paper)] border-[var(--border)] shadow-navy-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Database size={15} className="text-[#2A7F7F]" />
            <h3 className="font-serif-display text-lg text-[var(--navy)]">
              Semantic Relatives
            </h3>
          </div>
          <span className="font-mono-code text-[10px] text-[var(--navy-soft)]/60">
            pgvector
          </span>
        </div>

        {loadingRelated ? (
          <div className="py-4 text-center text-xs text-[var(--navy-soft)]/70 font-mono-code">
            Computing cosine distance...
          </div>
        ) : relatedPapers.length === 0 ? (
          <p className="py-3 text-xs text-[var(--navy-soft)]/70">
            No semantic neighbors found yet.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {relatedPapers.map((paper) => {
              const simPercent = Math.round(paper.similarity_score * 100);
              return (
                <div
                  key={paper.id}
                  onClick={() => onNavigatePaper(paper.arxiv_id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onNavigatePaper(paper.arxiv_id);
                  }}
                  className="group relative rounded-xl border border-[var(--border)] bg-[var(--cream)] p-3 cursor-pointer hover:border-[var(--navy)] hover:shadow-navy-sm transition-all"
                >
                  <h4 className="font-serif-display text-sm font-normal text-[var(--navy)] line-clamp-2 leading-snug group-hover:text-[var(--navy-ink)]">
                    {paper.title}
                  </h4>
                  <p className="mt-1 text-[11px] text-[var(--navy-soft)]/70 truncate">
                    {paper.authors.slice(0, 2).join(', ')}
                    {paper.authors.length > 2 && ' et al.'}
                  </p>

                  {/* Similarity Progress Bar */}
                  <div className="mt-2.5 flex items-center gap-2">
                    <Progress value={simPercent} className="h-1.5 flex-1" />
                    <span className="font-mono-code text-[10px] font-semibold text-[var(--navy)]">
                      {simPercent}%
                    </span>
                  </div>

                  <ArrowRight
                    size={13}
                    className="absolute right-3 top-3 text-[var(--navy-soft)]/40 group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all"
                  />
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </aside>
  );
};

export default Sidebar;
