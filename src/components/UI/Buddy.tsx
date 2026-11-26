import React from 'react';
import type { BuddyDef } from '../../constants/buddies';

/**
 * A Number Buddy: Gridy's tile shape in the buddy's colours, with its own
 * topper (ears, horns, leaf…) and a symbol on the antenna. Locked buddies
 * render as a grey silhouette with a "?".
 */
export const Buddy: React.FC<{ buddy: BuddyDef; locked?: boolean; size?: number }> = ({
  buddy,
  locked = false,
  size = 64,
}) => {
  const body = locked ? '#cbd5e1' : buddy.color;
  const line = locked ? '#94a3b8' : buddy.outline;
  const topper = locked ? 'none' : buddy.topper;

  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      {/* topper */}
      {topper === 'ears' && (
        <>
          <path
            d="M14 22 L18 8 L26 18 Z"
            fill={body}
            stroke={line}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M50 22 L46 8 L38 18 Z"
            fill={body}
            stroke={line}
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </>
      )}
      {topper === 'round-ears' && (
        <>
          <circle cx="16" cy="17" r="7" fill={body} stroke={line} strokeWidth="2" />
          <circle cx="48" cy="17" r="7" fill={body} stroke={line} strokeWidth="2" />
        </>
      )}
      {topper === 'horns' && (
        <>
          <path
            d="M18 19 Q12 8 20 4 Q19 12 24 17 Z"
            fill="#fef3c7"
            stroke={line}
            strokeWidth="1.8"
          />
          <path
            d="M46 19 Q52 8 44 4 Q45 12 40 17 Z"
            fill="#fef3c7"
            stroke={line}
            strokeWidth="1.8"
          />
        </>
      )}
      {topper === 'leaf' && (
        <path
          d="M32 15 Q24 4 16 8 Q22 16 32 15 Z"
          fill="#22c55e"
          stroke="#15803d"
          strokeWidth="1.8"
        />
      )}
      {topper === 'flame' && (
        <path
          d="M32 3 Q40 10 37 16 Q35 12 32 16 Q29 12 27 16 Q24 10 32 3 Z"
          fill="#f97316"
          stroke="#9a3412"
          strokeWidth="1.6"
        />
      )}
      {topper === 'crown' && (
        <path
          d="M20 16 L22 6 L27 12 L32 4 L37 12 L42 6 L44 16 Z"
          fill="#fde047"
          stroke="#854d0e"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      )}
      {topper === 'star' && (
        <path
          d="M46 4 l2.2 4.5 5 .7 -3.6 3.5 .9 5 -4.5-2.4 -4.5 2.4 .9-5 -3.6-3.5 5-.7z"
          fill="#fde047"
          stroke="#a16207"
          strokeWidth="1.4"
        />
      )}

      {/* antenna with emblem (not for buddies whose topper sits there) */}
      {topper !== 'flame' && topper !== 'crown' && topper !== 'leaf' && (
        <>
          <line
            x1="32"
            y1="11"
            x2="32"
            y2="16"
            stroke={line}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <circle
            cx="32"
            cy="8"
            r="5"
            fill={locked ? '#e2e8f0' : '#ffffff'}
            stroke={line}
            strokeWidth="1.6"
          />
          <text
            x="32"
            y="10.8"
            textAnchor="middle"
            fontSize="7.5"
            fontWeight="900"
            fill={line}
            fontFamily="system-ui, sans-serif"
          >
            {locked ? '?' : buddy.emblem}
          </text>
        </>
      )}

      {/* body + face */}
      <rect
        x="10"
        y="16"
        width="44"
        height="42"
        rx="11"
        fill={body}
        stroke={line}
        strokeWidth="2.5"
      />
      <rect
        x="16"
        y="22"
        width="32"
        height="24"
        rx="7"
        fill={locked ? '#e2e8f0' : '#ffffff'}
        opacity={locked ? 1 : 0.92}
      />
      {locked ? (
        <text
          x="32"
          y="40"
          textAnchor="middle"
          fontSize="16"
          fontWeight="900"
          fill="#94a3b8"
          fontFamily="system-ui, sans-serif"
        >
          ?
        </text>
      ) : (
        <>
          <circle cx="24.5" cy="32" r="2.8" fill="#1e293b" />
          <circle cx="39.5" cy="32" r="2.8" fill="#1e293b" />
          <circle cx="25.4" cy="31.1" r="0.9" fill="#ffffff" />
          <circle cx="40.4" cy="31.1" r="0.9" fill="#ffffff" />
          <path
            d="M26 38 q6 5 12 0"
            stroke="#1e293b"
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="19.5" cy="38.5" r="2" fill="#fda4af" opacity="0.85" />
          <circle cx="44.5" cy="38.5" r="2" fill="#fda4af" opacity="0.85" />
        </>
      )}
    </svg>
  );
};
