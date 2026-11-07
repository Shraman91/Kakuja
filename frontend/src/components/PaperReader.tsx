import React, { useMemo, useState } from 'react';
import type { Annotation, AnnotationCategory, PaperDetail } from '@/api/types';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  Award,
  Box,
  Database,
  Sparkles,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';

interface PaperReaderProps {
  fullText: string;
  annotations: Annotation[];
  title: string;
  arxivId?: string;
  onPaperUpdated?: (updated: PaperDetail) => void;
}

interface TextSegment {
  text: string;
  isHighlight: boolean;
  annotation?: Annotation;
}

export const PaperReader: React.FC<PaperReaderProps> = ({
  fullText,
  annotations,
  arxivId,
  onPaperUpdated,
}) => {
  // Active category filter state
  const [activeCategories, setActiveCategories] = useState<Record<AnnotationCategory, boolean>>({
    result: true,
    method: true,
    dataset: true,
    concept: true,
  });

  const [isReanalyzing, setIsReanalyzing] = useState(false);

  // Toggle category
  const toggleCategory = (category: AnnotationCategory) => {
    setActiveCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // Toggle all
  const toggleAll = () => {
    const anyActive = Object.values(activeCategories).some(Boolean);
    setActiveCategories({
      result: !anyActive,
      method: !anyActive,
      dataset: !anyActive,
      concept: !anyActive,
    });
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<AnnotationCategory, number> = {
      result: 0,
      method: 0,
      dataset: 0,
      concept: 0,
    };
    annotations.forEach((a) => {
      if (counts[a.category] !== undefined) {
        counts[a.category]++;
      }
    });
    return counts;
  }, [annotations]);

  // Re-analyze annotations with backend engine
  const handleReanalyze = async () => {
    if (!arxivId || isReanalyzing) return;
    setIsReanalyzing(true);
    try {
      const updated = await api.reanalyzePaper(arxivId);
      if (onPaperUpdated) {
        onPaperUpdated(updated);
      }
      toast.success('Highlights successfully refreshed!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reanalyze paper');
    } finally {
      setIsReanalyzing(false);
    }
  };

  // Character-offset segmentation
  const segments = useMemo(() => {
    if (!fullText) return [];

    const visibleAnnotations = annotations
      .filter((a) => activeCategories[a.category])
      .sort((a, b) => a.start_offset - b.start_offset);

    const resultSegments: TextSegment[] = [];
    let currentIdx = 0;

    for (const ann of visibleAnnotations) {
      const start = Math.max(0, Math.min(ann.start_offset, fullText.length));
      const end = Math.max(start, Math.min(ann.end_offset, fullText.length));

      if (start < currentIdx) continue;

      if (start > currentIdx) {
        resultSegments.push({
          text: fullText.slice(currentIdx, start),
          isHighlight: false,
        });
      }

      resultSegments.push({
        text: fullText.slice(start, end),
        isHighlight: true,
        annotation: ann,
      });

      currentIdx = end;
    }

    if (currentIdx < fullText.length) {
      resultSegments.push({
        text: fullText.slice(currentIdx),
        isHighlight: false,
      });
    }

    return resultSegments;
  }, [fullText, annotations, activeCategories]);

  return (
    <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--paper)] shadow-navy-sm overflow-hidden">
      {/* Sticky Category Legend Toolbar */}
      <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--paper)]/95 px-6 py-3.5 backdrop-blur-md">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono-code font-semibold uppercase tracking-wider text-[var(--navy-soft)]/70 mr-1">
            Highlights:
          </span>

          {/* Results Toggle */}
          <button
            type="button"
            onClick={() => toggleCategory('result')}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-medium cursor-pointer transition-all duration-150 ${
              activeCategories.result
                ? 'border-[#D9A441] bg-[#D9A441]/25 text-[#684803] font-semibold'
                : 'opacity-40 border-[var(--border)] bg-transparent text-[var(--navy-soft)]'
            }`}
          >
            <Award size={13} className="text-[#D9A441]" />
            <span>Results</span>
            <span className="ml-1 rounded-full bg-[#D9A441]/20 px-1.5 py-0.2 text-[10px] font-mono-code">
              {categoryCounts.result}
            </span>
            {activeCategories.result ? <Eye size={11} /> : <EyeOff size={11} />}
          </button>

          {/* Methods Toggle */}
          <button
            type="button"
            onClick={() => toggleCategory('method')}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-medium cursor-pointer transition-all duration-150 ${
              activeCategories.method
                ? 'border-[var(--navy)] bg-[var(--navy)]/15 text-[var(--navy)] font-semibold'
                : 'opacity-40 border-[var(--border)] bg-transparent text-[var(--navy-soft)]'
            }`}
          >
            <Box size={13} className="text-[var(--navy)]" />
            <span>Methods</span>
            <span className="ml-1 rounded-full bg-[var(--navy)]/15 px-1.5 py-0.2 text-[10px] font-mono-code">
              {categoryCounts.method}
            </span>
            {activeCategories.method ? <Eye size={11} /> : <EyeOff size={11} />}
          </button>

          {/* Datasets Toggle */}
          <button
            type="button"
            onClick={() => toggleCategory('dataset')}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-medium cursor-pointer transition-all duration-150 ${
              activeCategories.dataset
                ? 'border-[#2A7F7F] bg-[#2A7F7F]/20 text-[#134E4E] font-semibold'
                : 'opacity-40 border-[var(--border)] bg-transparent text-[var(--navy-soft)]'
            }`}
          >
            <Database size={13} className="text-[#2A7F7F]" />
            <span>Datasets</span>
            <span className="ml-1 rounded-full bg-[#2A7F7F]/20 px-1.5 py-0.2 text-[10px] font-mono-code">
              {categoryCounts.dataset}
            </span>
            {activeCategories.dataset ? <Eye size={11} /> : <EyeOff size={11} />}
          </button>

          {/* Concepts Toggle */}
          <button
            type="button"
            onClick={() => toggleCategory('concept')}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-medium cursor-pointer transition-all duration-150 ${
              activeCategories.concept
                ? 'border-[#C2674A] bg-[#C2674A]/20 text-[#7C2D16] font-semibold'
                : 'opacity-40 border-[var(--border)] bg-transparent text-[var(--navy-soft)]'
            }`}
          >
            <Sparkles size={13} className="text-[#C2674A]" />
            <span>Concepts</span>
            <span className="ml-1 rounded-full bg-[#C2674A]/20 px-1.5 py-0.2 text-[10px] font-mono-code">
              {categoryCounts.concept}
            </span>
            {activeCategories.concept ? <Eye size={11} /> : <EyeOff size={11} />}
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAll}
            className="text-xs h-8 text-[var(--navy-soft)]"
          >
            {Object.values(activeCategories).some(Boolean) ? 'Hide All' : 'Show All'}
          </Button>

          {arxivId && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReanalyze}
              disabled={isReanalyzing}
              className="text-xs h-8"
              title="Re-run entity & result analysis"
            >
              <RefreshCw size={12} className={`mr-1.5 ${isReanalyzing ? 'animate-spin' : ''}`} />
              <span>{isReanalyzing ? 'Re-analyzing...' : 'Re-analyze'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Reader Body with Measure ~70ch and Serif Long-form Typography */}
      <TooltipProvider delayDuration={150}>
        <div className="px-8 sm:px-14 py-12 mx-auto max-w-[72ch]">
          <div className="font-serif-editorial text-[1.08rem] sm:text-[1.15rem] leading-[1.95] text-[var(--navy)] tracking-[-0.01em] whitespace-pre-wrap break-words">
            {segments.map((segment, idx) => {
              if (!segment.isHighlight || !segment.annotation) {
                return <React.Fragment key={idx}>{segment.text}</React.Fragment>;
              }

              const cat = segment.annotation.category;

              // Color styles matching requirements (contrast >= 4.5:1 on cream/paper)
              const highlightStyles = {
                result: {
                  backgroundColor: 'var(--hl-result-bg)',
                  borderBottom: '2px solid var(--hl-result-border)',
                  color: 'var(--hl-result-text)',
                  fontWeight: 600,
                },
                method: {
                  backgroundColor: 'var(--hl-method-bg)',
                  borderBottom: '2px solid var(--hl-method-border)',
                  color: 'var(--hl-method-text)',
                  fontWeight: 500,
                },
                dataset: {
                  backgroundColor: 'var(--hl-dataset-bg)',
                  borderBottom: '2px solid var(--hl-dataset-border)',
                  color: 'var(--hl-dataset-text)',
                  fontWeight: 500,
                },
                concept: {
                  backgroundColor: 'var(--hl-concept-bg)',
                  borderBottom: '1.5px solid var(--hl-concept-border)',
                  color: 'var(--hl-concept-text)',
                  fontWeight: 500,
                },
              }[cat];

              return (
                <Tooltip key={idx}>
                  <TooltipTrigger asChild>
                    <mark
                      tabIndex={0}
                      className="rounded px-1 py-0.5 mx-[1px] cursor-pointer transition-all duration-150 hover:brightness-95"
                      style={highlightStyles}
                      aria-label={`${cat}: ${segment.text}`}
                    >
                      {segment.text}
                    </mark>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <div className="flex items-center gap-2 font-mono-code text-[11px]">
                      <span className="font-bold uppercase tracking-wider text-[var(--accent)]">
                        {cat}
                      </span>
                      <span className="text-white/50">|</span>
                      <span className="text-white/80">
                        {Math.round(segment.annotation.score * 100)}% match
                      </span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </TooltipProvider>
    </div>
  );
};

export default PaperReader;
