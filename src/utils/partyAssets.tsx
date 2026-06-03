import React from 'react';
import type { PartyAffiliation } from '../types';
import { partyColorMap, partyNames } from './partyConstants';

interface PartyLogoProps {
  party: PartyAffiliation;
  size?: number;
  className?: string;
  glow?: boolean;
}

/**
 * Renders a state-of-the-art squircle-shaped monogram badge for a Swedish political party.
 * Uses a native SVG text rendering model with `textAnchor="middle"` and `dominantBaseline="central"`
 * to mathematically guarantee perfect vertical and horizontal centering of the party initials
 * across all browsers, operating systems, and viewport scales.
 */
export const PartyLogo: React.FC<PartyLogoProps> = ({
  party,
  size = 24,
  className = '',
  glow = false
}) => {
  const color = partyColorMap[party];
  const gradientId = `party-grad-${party}`;
  
  // Custom glowing drop shadow using the party color for high tech wow-factor
  const glowStyle = glow ? { filter: `drop-shadow(0 2px 6px ${color}60)` } : {};
  
  const initials = party === 'Externt' ? 'EXT' : party;

  // In the 24x24 SVG coordinate space, select the optimal font size
  const fontSize = initials.length > 2 ? 6.8 : initials.length > 1 ? 8.2 : 9.8;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        flexShrink: 0,
        ...glowStyle
      }}
    >
      <title>{partyNames[party]}</title>
      <defs>
        {/* Vibrant dual-tone linear gradients */}
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          {party === 'S' && (
            <>
              <stop offset="0%" stopColor="#FF3D42" />
              <stop offset="100%" stopColor="#B80006" />
            </>
          )}
          {party === 'M' && (
            <>
              <stop offset="0%" stopColor="#7FDBFF" />
              <stop offset="100%" stopColor="#2398D9" />
            </>
          )}
          {party === 'SD' && (
            <>
              <stop offset="0%" stopColor="#5AB1F6" />
              <stop offset="100%" stopColor="#004D91" />
            </>
          )}
          {party === 'C' && (
            <>
              <stop offset="0%" stopColor="#3DF27D" />
              <stop offset="100%" stopColor="#00701F" />
            </>
          )}
          {party === 'V' && (
            <>
              <stop offset="0%" stopColor="#FF4B3E" />
              <stop offset="100%" stopColor="#A30810" />
            </>
          )}
          {party === 'MP' && (
            <>
              <stop offset="0%" stopColor="#7FDB65" />
              <stop offset="100%" stopColor="#357327" />
            </>
          )}
          {party === 'L' && (
            <>
              <stop offset="0%" stopColor="#4AD0FF" />
              <stop offset="100%" stopColor="#0078B3" />
            </>
          )}
          {party === 'KD' && (
            <>
              <stop offset="0%" stopColor="#0075D1" />
              <stop offset="100%" stopColor="#001F3D" />
            </>
          )}
          {party === 'Externt' && (
            <>
              <stop offset="0%" stopColor="#94A3B8" />
              <stop offset="100%" stopColor="#475569" />
            </>
          )}
        </linearGradient>
      </defs>
      
      {/* Squircle background card (rx = 30% of 24) */}
      <rect
        x="0.75"
        y="0.75"
        width="22.5"
        height="22.5"
        rx="6.75"
        fill={`url(#${gradientId})`}
        stroke="rgba(255, 255, 255, 0.22)"
        strokeWidth="1.5"
      />
      
      {/* Mathematically Centered Initials Text */}
      <text
        x="12"
        y="12.2" // Precise vertical adjustment to balance the optical center of the sans-serif font baseline
        textAnchor="middle"
        dominantBaseline="central"
        fill="#FFFFFF"
        fontSize={`${fontSize}px`}
        fontWeight="900"
        fontFamily='"Outfit", "Inter", "Segoe UI", system-ui, sans-serif'
        letterSpacing="-0.03em"
        style={{
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.25)'
        }}
      >
        {initials}
      </text>
    </svg>
  );
};
