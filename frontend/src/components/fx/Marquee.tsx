import React from 'react';
import { useReducedMotion } from 'motion/react';

interface MarqueeProps {
  children: React.ReactNode;
  speedSec?: number;
  pauseOnHover?: boolean;
  className?: string;
}

export const Marquee: React.FC<MarqueeProps> = ({
  children,
  speedSec = 35,
  pauseOnHover = true,
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return (
      <div className={`overflow-x-auto py-3 ${className}`}>
        <div className="flex gap-8 whitespace-nowrap">{children}</div>
      </div>
    );
  }

  return (
    <div
      className={`group relative flex overflow-hidden select-none ${className}`}
      style={{
        maskImage:
          'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
        WebkitMaskImage:
          'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
      }}
    >
      <div
        className={`flex shrink-0 items-center justify-around gap-8 min-w-full animate-marquee ${
          pauseOnHover ? 'group-hover:[animation-play-state:paused]' : ''
        }`}
        style={{ animationDuration: `${speedSec}s` }}
      >
        {children}
      </div>
      <div
        aria-hidden="true"
        className={`flex shrink-0 items-center justify-around gap-8 min-w-full animate-marquee ${
          pauseOnHover ? 'group-hover:[animation-play-state:paused]' : ''
        }`}
        style={{ animationDuration: `${speedSec}s` }}
      >
        {children}
      </div>
    </div>
  );
};

export default Marquee;

