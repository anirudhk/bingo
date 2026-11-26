import React from 'react';
import { motion } from 'framer-motion';

export type MascotMood = 'idle' | 'happy' | 'cheer' | 'encourage';

/**
 * Gridy — the game's mascot: a living number tile with a screen face and a
 * little "+" antenna. Pure SVG (no image assets), so it scales to any size
 * and follows the "reduce motion" setting via the app's MotionConfig.
 */
export const Mascot: React.FC<{ mood?: MascotMood; size?: number; className?: string }> = ({
  mood = 'idle',
  size = 48,
  className = '',
}) => {
  const bounce =
    mood === 'cheer'
      ? { y: [0, -10, 0, -6, 0], rotate: [0, -6, 6, -3, 0] }
      : mood === 'happy'
        ? { y: [0, -6, 0] }
        : mood === 'encourage'
          ? { rotate: [0, -8, 0] }
          : { y: [0, -2, 0] };

  return (
    <motion.svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      aria-hidden
      animate={bounce}
      transition={{
        duration: mood === 'idle' ? 2.4 : 0.7,
        repeat: mood === 'idle' ? Infinity : 0,
        ease: 'easeInOut',
      }}
    >
      {/* antenna with a plus */}
      <line
        x1="32"
        y1="9"
        x2="32"
        y2="15"
        stroke="#047857"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="32" cy="7" r="4.5" fill="#fbbf24" />
      <path d="M32 4.8v4.4M29.8 7h4.4" stroke="#78350f" strokeWidth="1.4" strokeLinecap="round" />

      {/* arms */}
      {mood === 'cheer' ? (
        <>
          <path d="M11 34 L4 22" stroke="#047857" strokeWidth="4" strokeLinecap="round" />
          <path d="M53 34 L60 22" stroke="#047857" strokeWidth="4" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M11 40 L5 46" stroke="#047857" strokeWidth="4" strokeLinecap="round" />
          <path d="M53 40 L59 46" stroke="#047857" strokeWidth="4" strokeLinecap="round" />
        </>
      )}

      {/* tile body */}
      <rect x="10" y="15" width="44" height="42" rx="11" fill="#10b981" />
      <rect
        x="10"
        y="15"
        width="44"
        height="42"
        rx="11"
        fill="none"
        stroke="#047857"
        strokeWidth="2.5"
      />
      {/* screen face */}
      <rect x="16" y="21" width="32" height="24" rx="7" fill="#ecfdf5" />

      {/* eyes */}
      {mood === 'happy' || mood === 'cheer' ? (
        <>
          <path
            d="M21 32 q3.5 -4 7 0"
            stroke="#064e3b"
            strokeWidth="2.6"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M36 32 q3.5 -4 7 0"
            stroke="#064e3b"
            strokeWidth="2.6"
            fill="none"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <circle cx="24.5" cy="31" r="2.8" fill="#064e3b" />
          <circle cx="39.5" cy="31" r="2.8" fill="#064e3b" />
        </>
      )}

      {/* mouth */}
      {mood === 'cheer' ? (
        <path d="M25 37 q7 8 14 0 z" fill="#064e3b" />
      ) : mood === 'happy' ? (
        <path
          d="M25 37 q7 6 14 0"
          stroke="#064e3b"
          strokeWidth="2.6"
          fill="none"
          strokeLinecap="round"
        />
      ) : mood === 'encourage' ? (
        <path
          d="M27 39 q5 2.5 10 0"
          stroke="#064e3b"
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M27 38 q5 3.5 10 0"
          stroke="#064e3b"
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
      )}

      {/* cheeks */}
      <circle cx="19.5" cy="38" r="2" fill="#fda4af" opacity="0.8" />
      <circle cx="44.5" cy="38" r="2" fill="#fda4af" opacity="0.8" />
    </motion.svg>
  );
};
