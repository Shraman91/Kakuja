import React, { useMemo, useState } from 'react';
import type { Annotation, AnnotationCategory } from '../api/types';
import './PaperReader.css';
import { Award, Box, Database, Sparkles, Eye, EyeOff } from 'lucide-react';

interface PaperReaderProps {
  fullText: string;
  annotations: Annotation[];
  title: string;
}

interface TextSegment {
  text: string;
  isHighlight: boolean;
  annotation?: Annotation;
}

export const PaperReader: React.FC<PaperReaderProps> = ({
  fullText,
  annotations,
}) => {
  // Active category filter state (all active by default)
  const [activeCategories, setActiveCategories] = useState<Record<AnnotationCategory, boolean>>({
    result: true,
    method: true,
    dataset: true,
    concept: true,
  });

  const [activeTooltip, setActiveTooltip] = useState<Annotation | null>(null);

  // Toggle category visibility
  const toggleCategory = (category: AnnotationCategory) => {
    setActiveCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
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

  return (
    <div className="paper-reader">
      {/* Sticky Category Legend Bar */}
      <div className="reader-legend-toolbar">
        <div className="legend-title">Highlights:</div>
        <div className="legend-items">
          {/* Result Toggle */}
          <button
            type="button"
            className={`legend-badge badge-result ${activeCategories.result ? 'active' : 'disabled'}`}
            onClick={() => toggleCategory('result')}
            aria-pressed={activeCategories.result}
          >
            <Award className="legend-icon" size={14} />
            <span className="legend-label">Results</span>
            <span className="legend-count">{categoryCounts.result}</span>
            {activeCategories.result ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>

          {/* Method Toggle */}
          <button
            type="button"
            className={`legend-badge badge-method ${activeCategories.method ? 'active' : 'disabled'}`}
            onClick={() => toggleCategory('method')}
            aria-pressed={activeCategories.method}
          >
            <Box className="legend-icon" size={14} />
            <span className="legend-label">Methods</span>
            <span className="legend-count">{categoryCounts.method}</span>
            {activeCategories.method ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>

          {/* Dataset Toggle */}
          <button
            type="button"
            className={`legend-badge badge-dataset ${activeCategories.dataset ? 'active' : 'disabled'}`}
            onClick={() => toggleCategory('dataset')}
            aria-pressed={activeCategories.dataset}
          >
            <Database className="legend-icon" size={14} />
            <span className="legend-label">Datasets</span>
            <span className="legend-count">{categoryCounts.dataset}</span>
            {activeCategories.dataset ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>

          {/* Concept Toggle */}
          <button
            type="button"
            className={`legend-badge badge-concept ${activeCategories.concept ? 'active' : 'disabled'}`}
            onClick={() => toggleCategory('concept')}
            aria-pressed={activeCategories.concept}
          >
            <Sparkles className="legend-icon" size={14} />
            <span className="legend-label">Concepts</span>
            <span className="legend-count">{categoryCounts.concept}</span>
            {activeCategories.concept ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
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
                onMouseEnter={() => setActiveTooltip(segment.annotation!)}
                onMouseLeave={() => setActiveTooltip(null)}
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

      {/* Floating Tooltip Indicator */}
      {activeTooltip && (
        <div className="annotation-floating-tooltip">
          <span className={`tooltip-tag tag-${activeTooltip.category}`}>
            {activeTooltip.category.toUpperCase()}
          </span>
          <span className="tooltip-text">"{activeTooltip.text}"</span>
          <span className="tooltip-score">
            Relevance: {(activeTooltip.score * 100).toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );
};

export default PaperReader;
