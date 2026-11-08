import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

interface WordRollProps {
  words: string[];
  className?: string;
  intervalMs?: number;
}

export const WordRoll: React.FC<WordRollProps> = ({
  words,
  className = '',
  intervalMs = 2800,
}) => {
  const [index, setIndex] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (words.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [words, intervalMs]);

  if (shouldReduceMotion) {
    return (
      <span className={`inline-block font-serif-display italic text-[var(--accent)] ${className}`}>
        {words[index]}
      </span>
    );
  }

  return (
    <span
      className={`relative inline-grid grid-cols-1 grid-rows-1 overflow-hidden align-baseline ${className}`}
      style={{
        display: 'inline-grid',
        verticalAlign: 'baseline',
      }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={words[index]}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{
            duration: 0.5,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="col-start-1 row-start-1 inline-block whitespace-nowrap font-serif-display italic text-[var(--accent)] px-0.5"
          style={{
            verticalAlign: 'baseline',
            lineHeight: 'inherit',
          }}
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

export default WordRoll;

