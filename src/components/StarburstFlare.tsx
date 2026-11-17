import { useId } from 'react';

interface StarburstFlareProps {
  coreColor?: string;
  rayColor?: string;
  reducedMotion?: boolean;
  className?: string;
}

export function StarburstFlare({
  coreColor = '#FFFBEB',
  rayColor = '#FCD34D',
  reducedMotion = false,
  className = 'w-28 h-28',
}: StarburstFlareProps) {
  const uid = useId().replace(/:/g, '');
  const haloId = `sb_halo_${uid}`;
  const rayHId = `sb_rayh_${uid}`;
  const rayVId = `sb_rayv_${uid}`;

  return (
    <div
      className={`pointer-events-none select-none ${
        reducedMotion ? '' : 'gl-starburst-pulse'
      } ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 160 160" fill="none" className="w-full h-full overflow-visible">
        <defs>
          <radialGradient id={haloId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={coreColor} stopOpacity="0.96" />
            <stop offset="16%" stopColor={rayColor} stopOpacity="0.62" />
            <stop offset="48%" stopColor={rayColor} stopOpacity="0.16" />
            <stop offset="100%" stopColor={rayColor} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={rayHId} x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor={rayColor} stopOpacity="0" />
            <stop offset="50%" stopColor={coreColor} stopOpacity="0.95" />
            <stop offset="100%" stopColor={rayColor} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={rayVId} x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor={rayColor} stopOpacity="0" />
            <stop offset="50%" stopColor={coreColor} stopOpacity="0.95" />
            <stop offset="100%" stopColor={rayColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Soft volumetric halo */}
        <circle cx="80" cy="80" r="64" fill={`url(#${haloId})`} />

        {/* Secondary fine diagonal starburst rays */}
        <g opacity="0.72" transform="rotate(28 80 80)">
          <line x1="80" y1="24" x2="80" y2="136" stroke={`url(#${rayVId})`} strokeWidth="1" strokeLinecap="round" />
          <line x1="24" y1="80" x2="136" y2="80" stroke={`url(#${rayHId})`} strokeWidth="1" strokeLinecap="round" />
        </g>
        <g opacity="0.58" transform="rotate(-24 80 80)">
          <line x1="80" y1="30" x2="80" y2="130" stroke={`url(#${rayVId})`} strokeWidth="0.85" strokeLinecap="round" />
          <line x1="30" y1="80" x2="130" y2="80" stroke={`url(#${rayHId})`} strokeWidth="0.85" strokeLinecap="round" />
        </g>

        {/* Primary crisp tapered 4-point star flare */}
        <path
          d="M80 12L82.4 76.2L148 80L82.4 83.8L80 148L77.6 83.8L12 80L77.6 76.2Z"
          fill={coreColor}
          fillOpacity="0.86"
        />
        <path
          d="M80 34L83.8 75.5L126 80L83.8 84.5L80 126L76.2 84.5L34 80L76.2 75.5Z"
          fill={rayColor}
          fillOpacity="0.45"
        />

        {/* Radiant core + curated stardust sparkles */}
        <circle cx="80" cy="80" r="5.5" fill={coreColor} />
        <circle cx="48" cy="46" r="1.4" fill={rayColor} fillOpacity="0.88" />
        <circle cx="116" cy="52" r="1.2" fill={coreColor} fillOpacity="0.85" />
        <circle cx="54" cy="116" r="1.1" fill={coreColor} fillOpacity="0.8" />
        <circle cx="112" cy="112" r="1.5" fill={rayColor} fillOpacity="0.9" />
        <circle cx="98" cy="34" r="0.9" fill={coreColor} fillOpacity="0.72" />
        <circle cx="34" cy="96" r="1" fill={rayColor} fillOpacity="0.7" />
      </svg>
    </div>
  );
}
