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
    return <span className={className}>{words[index]}</span>;
  }

  return (
    <span className={`relative inline-flex h-[1.25em] overflow-hidden align-middle ${className}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={words[index]}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{
            duration: 0.55,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="inline-block whitespace-nowrap text-[var(--accent)] font-serif-display italic"
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

export default WordRoll;

