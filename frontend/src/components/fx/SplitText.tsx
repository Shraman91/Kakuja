import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  by?: 'word' | 'char';
}

export const SplitText: React.FC<SplitTextProps> = ({
  text,
  className = '',
  delay = 0,
  by = 'word',
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <span className={className}>{text}</span>;
  }

  const items = by === 'word' ? text.split(' ') : text.split('');

  return (
    <span className={`inline-block overflow-hidden ${className}`}>
      {items.map((item, index) => (
        <motion.span
          key={index}
          className="inline-block"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          transition={{
            duration: 0.6,
            delay: delay + index * (by === 'word' ? 0.08 : 0.025),
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {item}
          {by === 'word' && index < items.length - 1 && '\u00A0'}
        </motion.span>
      ))}
    </span>
  );
};

export default SplitText;

