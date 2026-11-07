import React, { useMemo, useState } from 'react';
import type { Annotation, AnnotationCategory, PaperDetail } from '../api/types';
import { api } from '../api/client';
import './PaperReader.css';
import {
  Award,
  Box,
  Database,
  Sparkles,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle,
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

interface TooltipState {
  annotation: Annotation;
  x: number;
  y: number;
}

export const PaperReader: React.FC<PaperReaderProps> = ({
  fullText,
  annotations,
  arxivId,
  onPaperUpdated,
}) => {
  // Active category filter state (all active by default)
  const [activeCategories, setActiveCategories] = useState<Record<AnnotationCategory, boolean>>({
    result: true,
    method: true,
    dataset: true,
    concept: true,
  });

  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [reanalyzeSuccess, setReanalyzeSuccess] = useState(false);

  // Toggle category visibility
  const toggleCategory = (category: AnnotationCategory) => {
    setActiveCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // Toggle all categories
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

  // Handle re-analyze
  const handleReanalyze = async () => {
    if (!arxivId || isReanalyzing) return;
    setIsReanalyzing(true);
    setReanalyzeSuccess(false);
    try {
      const updated = await api.reanalyzePaper(arxivId);
      if (onPaperUpdated) {
        onPaperUpdated(updated);
      }
      setReanalyzeSuccess(true);
      setTimeout(() => setReanalyzeSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to reanalyze paper:', err);
    } finally {
      setIsReanalyzing(false);
    }
  };

  // Generate character-offset accurate text segments
  const segments = useMemo(() => {
    if (!fullText) return [];

    // Filter annotations to only enabled categories and sort by start_offset
    const visibleAnnotations = annotations
      .filter((a) => activeCategories[a.category])
      .sort((a, b) => a.start_offset - b.start_offset);

    const resultSegments: TextSegment[] = [];
    let currentIdx = 0;

    for (const ann of visibleAnnotations) {
      // Validate offsets against text length
      const start = Math.max(0, Math.min(ann.start_offset, fullText.length));
      const end = Math.max(start, Math.min(ann.end_offset, fullText.length));

      // Skip invalid or out-of-order bounds
      if (start < currentIdx) continue;

      // Plain text before highlight
      if (start > currentIdx) {
        resultSegments.push({
          text: fullText.slice(currentIdx, start),
          isHighlight: false,
        });
      }

      // Highlighted segment
      resultSegments.push({
        text: fullText.slice(start, end),
        isHighlight: true,
        annotation: ann,
      });

      currentIdx = end;
    }

    // Remaining trailing text
    if (currentIdx < fullText.length) {
      resultSegments.push({
        text: fullText.slice(currentIdx),
        isHighlight: false,
      });
    }

    return resultSegments;
  }, [fullText, annotations, activeCategories]);

  const handleMouseEnter = (e: React.MouseEvent, ann: Annotation) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      annotation: ann,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  return (
    <div className="paper-reader">
      {/* Sticky Category Legend Bar */}
      <div className="reader-legend-toolbar">
        <div className="legend-left-controls">
          <span className="legend-title">Highlights:</span>
          <div className="legend-items">
            {/* Result Toggle */}
            <button
              type="button"
              className={`legend-badge badge-result ${activeCategories.result ? 'active' : 'disabled'}`}
              onClick={() => toggleCategory('result')}
              aria-pressed={activeCategories.result}
              title="Toggle Quantitative Results"
            >
              <Award className="legend-icon" size={13} />
              <span className="legend-label">Results</span>
              <span className="legend-count">{categoryCounts.result}</span>
              {activeCategories.result ? <Eye size={11} /> : <EyeOff size={11} />}
            </button>

            {/* Method Toggle */}
            <button
              type="button"
              className={`legend-badge badge-method ${activeCategories.method ? 'active' : 'disabled'}`}
              onClick={() => toggleCategory('method')}
              aria-pressed={activeCategories.method}
              title="Toggle Method & Technique Names"
            >
              <Box className="legend-icon" size={13} />
              <span className="legend-label">Methods</span>
              <span className="legend-count">{categoryCounts.method}</span>
              {activeCategories.method ? <Eye size={11} /> : <EyeOff size={11} />}
            </button>

            {/* Dataset Toggle */}
            <button
              type="button"
              className={`legend-badge badge-dataset ${activeCategories.dataset ? 'active' : 'disabled'}`}
              onClick={() => toggleCategory('dataset')}
              aria-pressed={activeCategories.dataset}
              title="Toggle Dataset & Benchmark Names"
            >
              <Database className="legend-icon" size={13} />
              <span className="legend-label">Datasets</span>
              <span className="legend-count">{categoryCounts.dataset}</span>
              {activeCategories.dataset ? <Eye size={11} /> : <EyeOff size={11} />}
            </button>

            {/* Concept Toggle */}
            <button
              type="button"
              className={`legend-badge badge-concept ${activeCategories.concept ? 'active' : 'disabled'}`}
              onClick={() => toggleCategory('concept')}
              aria-pressed={activeCategories.concept}
              title="Toggle Key Concepts & Phrases"
            >
              <Sparkles className="legend-icon" size={13} />
              <span className="legend-label">Concepts</span>
              <span className="legend-count">{categoryCounts.concept}</span>
              {activeCategories.concept ? <Eye size={11} /> : <EyeOff size={11} />}
            </button>
          </div>
        </div>

        {/* Right Toolbar Actions */}
        <div className="legend-right-actions">
          <button
            type="button"
            className="reader-toggle-all-btn"
            onClick={toggleAll}
            title="Toggle All Highlights"
          >
            {Object.values(activeCategories).some(Boolean) ? 'Hide All' : 'Show All'}
          </button>

          {arxivId && (
            <button
              type="button"
              className={`reanalyze-action-btn ${isReanalyzing ? 'loading' : ''} ${
                reanalyzeSuccess ? 'success' : ''
              }`}
              onClick={handleReanalyze}
              disabled={isReanalyzing}
              title="Re-run analysis engine and refresh highlights"
            >
              {isReanalyzing ? (
                <>
                  <RefreshCw size={12} className="spin-icon" />
                  <span>Re-analyzing...</span>
                </>
              ) : reanalyzeSuccess ? (
                <>
                  <CheckCircle size={12} />
                  <span>Updated</span>
                </>
              ) : (
                <>
                  <RefreshCw size={12} />
                  <span>Re-analyze</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Reader Body with Offset Highlights */}
      <div className="reader-content-body">
        <div className="reader-text-stream">
          {segments.map((segment, idx) => {
            if (!segment.isHighlight || !segment.annotation) {
              return <React.Fragment key={idx}>{segment.text}</React.Fragment>;
            }

            const cat = segment.annotation.category;
            return (
              <mark
                key={idx}
                className={`reader-mark mark-${cat}`}
                onMouseEnter={(e) => handleMouseEnter(e, segment.annotation!)}
                onMouseLeave={handleMouseLeave}
                tabIndex={0}
                role="button"
                aria-label={`${cat}: ${segment.text}`}
              >
                {segment.text}
              </mark>
            );
          })}
        </div>
      </div>

      {/* Floating Tooltip Indicator positioned dynamically */}
      {tooltip && (
        <div
          className="annotation-floating-tooltip"
          style={{
            position: 'fixed',
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <span className={`tooltip-tag tag-${tooltip.annotation.category}`}>
            {tooltip.annotation.category.toUpperCase()}
          </span>
          <span className="tooltip-text">"{tooltip.annotation.text}"</span>
          <span className="tooltip-score">
            {(tooltip.annotation.score * 100).toFixed(0)}% match
          </span>
        </div>
      )}
    </div>
  );
};

export default PaperReader;
