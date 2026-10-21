import React from 'react';
import './CentipedeLoader.css';

export interface CentipedeLoaderProps {
  active?: boolean;
  label?: string;
  body?: string;
  legs?: string;
  head?: string;
}

export const CentipedeLoader: React.FC<CentipedeLoaderProps> = ({
  active = true,
  label = 'Crawling arXiv papers...',
  body = '#10b981', // Emerald primary
  legs = '#059669', // Darker emerald for legs
  head = '#047857', // Accent head
}) => {
  if (!active) return null;

  // 12 body segments
  const segments = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div
      className="centipede-loader-container"
      role="status"
      aria-live="polite"
      aria-label={label || 'Paper crawler is loading'}
    >
      <div className="centipede-track">
        <svg
          className="centipede-svg"
          viewBox="0 0 240 60"
          xmlns="http://www.w3.org/2005/svg"
        >
          <g className="centipede-body-group">
            {/* 12 Segments rendered from tail (index 0) to head (index 11) */}
            {segments.map((index) => {
              const isHead = index === 11;
              const cx = 30 + index * 14;
              const cy = 30;
              const radius = isHead ? 8.5 : 6.5 - (11 - index) * 0.15;

              return (
                <g
                  key={index}
                  className={`segment-group segment-${index}`}
                  style={{ '--segment-index': index } as React.CSSProperties}
                >
                  {/* Left and Right stepping legs */}
                  {!isHead && (
                    <>
                      {/* Top / Left leg */}
                      <line
                        className="centipede-leg leg-left"
                        x1={cx}
                        y1={cy - radius}
                        x2={cx - 4}
                        y2={cy - radius - 8}
                        stroke={legs}
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      {/* Bottom / Right leg */}
                      <line
                        className="centipede-leg leg-right"
                        x1={cx}
                        y1={cy + radius}
                        x2={cx - 4}
                        y2={cy + radius + 8}
                        stroke={legs}
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </>
                  )}

                  {/* Body Segment Circle */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={radius}
                    fill={isHead ? head : body}
                    className={isHead ? 'centipede-head' : 'centipede-segment'}
                  />

                  {/* Antennae / Twitching Feelers on Head */}
                  {isHead && (
                    <g className="centipede-feelers">
                      {/* Upper feeler */}
                      <path
                        d={`M ${cx + 5} ${cy - 4} Q ${cx + 14} ${cy - 12} ${cx + 20} ${cy - 10}`}
                        stroke={head}
                        strokeWidth="1.75"
                        fill="none"
                        strokeLinecap="round"
                        className="feeler feeler-top"
                      />
                      {/* Lower feeler */}
                      <path
                        d={`M ${cx + 5} ${cy + 4} Q ${cx + 14} ${cy + 12} ${cx + 20} ${cy + 10}`}
                        stroke={head}
                        strokeWidth="1.75"
                        fill="none"
                        strokeLinecap="round"
                        className="feeler feeler-bottom"
                      />
                      {/* Eyes */}
                      <circle cx={cx + 4} cy={cy - 3} r="1.5" fill="#ffffff" />
                      <circle cx={cx + 5} cy={cy - 3} r="0.75" fill="#0f172a" />
                      <circle cx={cx + 4} cy={cy + 3} r="1.5" fill="#ffffff" />
                      <circle cx={cx + 5} cy={cy + 3} r="0.75" fill="#0f172a" />
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {label && <p className="centipede-label">{label}</p>}
    </div>
  );
};

export default CentipedeLoader;
