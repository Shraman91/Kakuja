import React from 'react';

export interface CentipedeLoaderProps {
  active?: boolean;
  label?: string;
  theme?: 'navy' | 'cream' | 'gold';
  body?: string;
  legs?: string;
  head?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const CentipedeLoader: React.FC<CentipedeLoaderProps> = ({
  active = true,
  label,
  theme = 'gold',
  body,
  legs,
  head,
  size = 'md',
  className = '',
}) => {
  if (!active) return null;

  // Color theme presets
  const colors = {
    gold: {
      body: body || '#E5B869',
      legs: legs || '#D9A441',
      head: head || '#F5EFE0',
      feeler: '#D9A441',
      eye: '#0B1F3A',
      pupil: '#F5EFE0',
      trackBg: 'rgba(245, 239, 224, 0.05)',
      trackBorder: 'rgba(217, 164, 65, 0.25)',
      labelColor: 'text-[var(--cream)]',
    },
    navy: {
      body: body || '#0B1F3A',
      legs: legs || '#1B3358',
      head: head || '#06132A',
      feeler: '#D9A441',
      eye: '#F5EFE0',
      pupil: '#0B1F3A',
      trackBg: 'rgba(11, 31, 58, 0.04)',
      trackBorder: 'rgba(11, 31, 58, 0.12)',
      labelColor: 'text-[var(--navy)]',
    },
    cream: {
      body: body || '#F5EFE0',
      legs: legs || '#EBE2CC',
      head: head || '#D9A441',
      feeler: '#D9A441',
      eye: '#06132A',
      pupil: '#F5EFE0',
      trackBg: 'rgba(245, 239, 224, 0.08)',
      trackBorder: 'rgba(245, 239, 224, 0.15)',
      labelColor: 'text-[var(--cream)]',
    },
  }[theme];

  // Dimensions
  const dims = {
    sm: { trackH: 'h-12', svgW: 200, svgH: 48, scale: 0.8 },
    md: { trackH: 'h-14', svgW: 240, svgH: 56, scale: 1.0 },
    lg: { trackH: 'h-18', svgW: 300, svgH: 70, scale: 1.25 },
  }[size];

  // 12 body segments (0: tail -> 11: head)
  const segments = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div
      className={`flex flex-col items-center justify-center p-3 select-none ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label || 'Paper crawler in progress'}
    >
      {/* Crawler Track */}
      <div
        className={`relative w-full max-w-[460px] ${dims.trackH} overflow-hidden rounded-full border shadow-inner`}
        style={{
          backgroundColor: colors.trackBg,
          borderColor: colors.trackBorder,
        }}
      >
        <svg
          className="centipede-motion-crawler absolute top-0.5 left-0"
          viewBox="0 0 240 56"
          width={dims.svgW}
          height={dims.svgH}
          xmlns="http://www.w3.org/2005/svg"
        >
          <defs>
            <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.legs} stopOpacity="0.85" />
              <stop offset="100%" stopColor={colors.body} stopOpacity="1" />
            </linearGradient>
            <filter id="centipedeShadow" x="-10%" y="-10%" width="120%" height="130%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodOpacity="0.25" />
            </filter>
          </defs>

          <g filter="url(#centipedeShadow)">
            {segments.map((index) => {
              const isHead = index === 11;
              const isTail = index === 0;
              const cx = 26 + index * 14.5;
              const cy = 28;
              // Organic tapering: larger thorax at index 8-10, smaller at tail
              const radius = isHead
                ? 8.5
                : 5.2 + Math.sin((index / 11) * Math.PI) * 2.8;

              return (
                <g
                  key={index}
                  className="centipede-segment-group"
                  style={{ '--seg-idx': index } as React.CSSProperties}
                >
                  {/* Organic articulated stepping legs (alternating wave gait) */}
                  {!isHead && (
                    <>
                      {/* Top Leg: jointed femur + tibia */}
                      <path
                        d={`M ${cx} ${cy - radius} Q ${cx - 3} ${cy - radius - 5} ${cx - 6} ${cy - radius - 9}`}
                        stroke={colors.legs}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        fill="none"
                        className="centipede-leg-pair-top"
                      />
                      {/* Bottom Leg */}
                      <path
                        d={`M ${cx} ${cy + radius} Q ${cx - 3} ${cy + radius + 5} ${cx - 6} ${cy + radius + 9}`}
                        stroke={colors.legs}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        fill="none"
                        className="centipede-leg-pair-bottom"
                      />
                    </>
                  )}

                  {/* Body Segment */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={radius}
                    fill={isHead ? colors.head : 'url(#bodyGradient)'}
                    stroke={colors.legs}
                    strokeWidth="0.75"
                  />

                  {/* Tail spine */}
                  {isTail && (
                    <path
                      d={`M ${cx - radius} ${cy} L ${cx - radius - 6} ${cy}`}
                      stroke={colors.legs}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  )}

                  {/* Head detail: feelers and glowing eyes */}
                  {isHead && (
                    <g>
                      {/* Upper Antenna / Feeler */}
                      <path
                        d={`M ${cx + 5} ${cy - 3} Q ${cx + 15} ${cy - 12} ${cx + 22} ${cy - 9}`}
                        stroke={colors.feeler}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        fill="none"
                        className="centipede-feeler-top"
                      />
                      {/* Lower Antenna / Feeler */}
                      <path
                        d={`M ${cx + 5} ${cy + 3} Q ${cx + 15} ${cy + 12} ${cx + 22} ${cy + 9}`}
                        stroke={colors.feeler}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        fill="none"
                        className="centipede-feeler-bottom"
                      />
                      {/* Upper Eye */}
                      <circle cx={cx + 3.5} cy={cy - 3} r="1.7" fill={colors.eye} />
                      <circle cx={cx + 4.2} cy={cy - 3} r="0.8" fill={colors.pupil} />
                      {/* Lower Eye */}
                      <circle cx={cx + 3.5} cy={cy + 3} r="1.7" fill={colors.eye} />
                      <circle cx={cx + 4.2} cy={cy + 3} r="0.8" fill={colors.pupil} />
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Status Progress Label */}
      {label && (
        <p
          className={`mt-2.5 text-xs font-mono-code font-medium tracking-wide ${colors.labelColor} animate-pulse`}
        >
          {label}
        </p>
      )}

      {/* Organic Kinematic Keyframes */}
      <style>{`
        @keyframes crawlerWalk {
          0% {
            transform: translateX(-240px);
          }
          100% {
            transform: translateX(460px);
          }
        }
        @keyframes bodyUndulation {
          0% {
            transform: translateY(-2.2px);
          }
          100% {
            transform: translateY(2.2px);
          }
        }
        @keyframes legGaitLeft {
          0% {
            transform: rotate(-16deg);
          }
          100% {
            transform: rotate(18deg);
          }
        }
        @keyframes legGaitRight {
          0% {
            transform: rotate(18deg);
          }
          100% {
            transform: rotate(-16deg);
          }
        }
        @keyframes feelerTwitchTop {
          0% {
            transform: rotate(-8deg);
          }
          100% {
            transform: rotate(14deg);
          }
        }
        @keyframes feelerTwitchBottom {
          0% {
            transform: rotate(8deg);
          }
          100% {
            transform: rotate(-14deg);
          }
        }

        .centipede-motion-crawler {
          animation: crawlerWalk 5.2s linear infinite;
        }

        .centipede-segment-group {
          animation: bodyUndulation 1.1s ease-in-out infinite alternate;
          animation-delay: calc(var(--seg-idx) * 0.08s);
          transform-origin: center;
        }

        .centipede-leg-pair-top {
          animation: legGaitLeft 0.38s ease-in-out infinite alternate;
          animation-delay: calc(var(--seg-idx) * 0.06s);
          transform-origin: center;
        }

        .centipede-leg-pair-bottom {
          animation: legGaitRight 0.38s ease-in-out infinite alternate;
          animation-delay: calc(var(--seg-idx) * 0.06s + 0.19s);
          transform-origin: center;
        }

        .centipede-feeler-top {
          animation: feelerTwitchTop 0.5s ease-in-out infinite alternate;
          transform-origin: left center;
        }

        .centipede-feeler-bottom {
          animation: feelerTwitchBottom 0.45s ease-in-out infinite alternate;
          transform-origin: left center;
        }

        @media (prefers-reduced-motion: reduce) {
          .centipede-motion-crawler {
            animation: none;
            left: 110px;
          }
          .centipede-segment-group,
          .centipede-leg-pair-top,
          .centipede-leg-pair-bottom,
          .centipede-feeler-top,
          .centipede-feeler-bottom {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
};

export default CentipedeLoader;
