import { useId } from 'react';
import type { CompositionPresetId, StarShapeId } from '../types/project';

interface ShapePreviewProps {
  shape: StarShapeId;
  color: string;
  coreColor?: string;
  className?: string;
}

export function StarShapePreview({
  shape,
  color,
  coreColor = '#ffffff',
  className = 'w-8 h-8',
}: ShapePreviewProps) {
  const uid = useId().replace(/:/g, '');
  const gradBodyId = `gl-cry-body-${uid}`;
  const gradFacetId = `gl-cry-facet-${uid}`;
  const gradGlossId = `gl-cry-gloss-${uid}`;
  const gradCoreId = `gl-cry-core-${uid}`;

  return (
    <svg
      viewBox="0 0 48 48"
      className={`${className} gl-icon-3d`}
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradBodyId} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a5f3fc" stopOpacity="0.92" />
          <stop offset="48%" stopColor={color} stopOpacity="0.84" />
          <stop offset="100%" stopColor="#d946ef" stopOpacity="0.78" />
        </linearGradient>
        <linearGradient id={gradFacetId} x1="24" y1="6" x2="38" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.58" />
          <stop offset="55%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.34" />
        </linearGradient>
        <linearGradient id={gradGlossId} x1="12" y1="6" x2="30" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.88" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={gradCoreId} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="48%" stopColor={coreColor} stopOpacity="0.92" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>

      {shape === 'star' && (
        <g>
          <polygon
            points="24,4.5 29.5,16.2 42.5,18 32.8,26.9 35.4,39.8 24,33.4 12.6,39.8 15.2,26.9 5.5,18 18.5,16.2"
            fill={`url(#${gradBodyId})`}
            stroke="rgba(255,255,255,0.82)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Left-top lit crystal facet */}
          <polygon
            points="24,4.5 18.5,16.2 5.5,18 15.2,26.9 24,23.5"
            fill={`url(#${gradGlossId})`}
          />
          {/* Bottom-right shadow prism */}
          <polygon
            points="24,23.5 32.8,26.9 35.4,39.8 24,33.4"
            fill={`url(#${gradFacetId})`}
            opacity="0.7"
          />
          {/* Facet ridges */}
          <path
            d="M24 5.5V33M18.5 16.5L24 23.5L29.5 16.5M6.5 18.2L24 23.5L41.5 18.2M13.2 39L24 23.5L34.8 39"
            stroke="rgba(255,255,255,0.42)"
            strokeWidth="0.95"
            strokeLinecap="round"
          />
          <circle cx="24" cy="23.5" r="7" fill={`url(#${gradCoreId})`} />
          <circle cx="24" cy="23.5" r="2.6" fill="#ffffff" />
        </g>
      )}

      {shape === 'heart' && (
        <g>
          <path
            d="M24 40C24 40 8 30 8 18.6C8 13.2 12.2 9 17.4 9C20.5 9 22.8 10.6 24 12.8C25.2 10.6 27.5 9 30.6 9C35.8 9 40 13.2 40 18.6C40 30 24 40 24 40Z"
            fill={`url(#${gradBodyId})`}
            stroke="rgba(255,255,255,0.82)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M24 12.8C22.8 10.6 20.5 9 17.4 9C12.2 9 8 13.2 8 18.6C8 24.4 13.4 30.2 18.6 34.8L24 22.4V12.8Z"
            fill={`url(#${gradGlossId})`}
          />
          <path
            d="M24 13L18.5 20L24 39.2M24 13L29.5 20L24 39.2M9 19L24 22.5L39 19"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="0.95"
            strokeLinecap="round"
          />
          <circle cx="24" cy="22" r="6.8" fill={`url(#${gradCoreId})`} />
          <circle cx="15.5" cy="14.5" r="1.9" fill="#ffffff" fillOpacity="0.85" />
        </g>
      )}

      {shape === 'flower' && (
        <g>
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 24 24)`}>
              <polygon
                points="24,4.5 29,12.5 24,20.5 19,12.5"
                fill={`url(#${gradBodyId})`}
                stroke="rgba(255,255,255,0.78)"
                strokeWidth="1.25"
                strokeLinejoin="round"
              />
              <polygon points="24,4.5 24,20.5 19,12.5" fill={`url(#${gradGlossId})`} />
            </g>
          ))}
          <circle cx="24" cy="24" r="7.5" fill={`url(#${gradCoreId})`} />
          <circle
            cx="24"
            cy="24"
            r="4.2"
            fill="#ffffff"
            fillOpacity="0.92"
            stroke={color}
            strokeWidth="1"
          />
        </g>
      )}

      {shape === 'moon' && (
        <g>
          <path
            d="M30 8.5C20.5 9.2 13 16.9 13 26C13 35.1 20.6 42.3 30 42.3C33.5 42.3 36.8 41.2 39.5 39.2C32.3 39.1 26.4 33.4 26.4 25.6C26.4 18.2 31.3 12.1 38.2 10.8C35.7 9.2 32.9 8.3 30 8.5Z"
            fill={`url(#${gradBodyId})`}
            stroke="rgba(255,255,255,0.82)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M30 8.5C20.5 9.2 13 16.9 13 26C13 30.8 15.2 35.1 18.7 38.1L22.5 25.5L30 8.5Z"
            fill={`url(#${gradGlossId})`}
          />
          <path
            d="M27.5 10.5L20 26L28 40.5"
            stroke="rgba(255,255,255,0.45)"
            strokeWidth="0.95"
            strokeLinecap="round"
          />
          <polygon
            points="35,14.5 36.4,18.2 40,19.5 36.4,20.8 35,24.5 33.6,20.8 30,19.5 33.6,18.2"
            fill="#ffffff"
          />
        </g>
      )}

      {shape === 'comet' && (
        <g>
          <path
            d="M29 19L7.5 39.5M26.5 15L10.5 27.5M33 22L20.5 38"
            stroke={`url(#${gradBodyId})`}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M28.5 18.5L13 33.5"
            stroke="rgba(255,255,255,0.72)"
            strokeWidth="1.15"
            strokeLinecap="round"
          />
          <polygon
            points="32,7.5 40.5,16 32,24.5 23.5,16"
            fill={`url(#${gradBodyId})`}
            stroke="rgba(255,255,255,0.88)"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <polygon points="32,7.5 32,16 23.5,16" fill={`url(#${gradGlossId})`} />
          <circle cx="32" cy="16" r="5.5" fill={`url(#${gradCoreId})`} />
          <circle cx="32" cy="16" r="2.2" fill="#ffffff" />
        </g>
      )}

      {shape === 'planet' && (
        <g>
          <circle
            cx="24"
            cy="24"
            r="9.8"
            fill={`url(#${gradBodyId})`}
            stroke="rgba(255,255,255,0.82)"
            strokeWidth="1.4"
          />
          <path
            d="M24 14.2A9.8 9.8 0 0 0 15.2 28.4L28.5 15.4A9.6 9.6 0 0 0 24 14.2Z"
            fill={`url(#${gradGlossId})`}
          />
          <ellipse
            cx="24"
            cy="24"
            rx="19"
            ry="5.8"
            transform="rotate(-22 24 24)"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth="2"
          />
          <ellipse
            cx="24"
            cy="24"
            rx="17"
            ry="4.8"
            transform="rotate(-22 24 24)"
            stroke={color}
            strokeWidth="0.9"
            strokeOpacity="0.7"
          />
          <circle cx="24" cy="24" r="5.2" fill={`url(#${gradCoreId})`} />
        </g>
      )}

      {shape === 'spark' && (
        <g>
          <polygon
            points="24,4 29,19 44,24 29,29 24,44 19,29 4,24 19,19"
            fill={`url(#${gradBodyId})`}
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <polygon points="24,4 24,24 4,24 19,19" fill={`url(#${gradGlossId})`} />
          <polygon points="24,24 44,24 29,29 24,44" fill={`url(#${gradFacetId})`} opacity="0.65" />
          <line
            x1="24"
            y1="6"
            x2="24"
            y2="42"
            stroke="rgba(255,255,255,0.62)"
            strokeWidth="1.05"
          />
          <line
            x1="6"
            y1="24"
            x2="42"
            y2="24"
            stroke="rgba(255,255,255,0.62)"
            strokeWidth="1.05"
          />
          <circle cx="24" cy="24" r="6.8" fill={`url(#${gradCoreId})`} />
          <circle cx="24" cy="24" r="2.5" fill="#ffffff" />
          <circle cx="36" cy="12" r="1.6" fill="#ffffff" fillOpacity="0.9" />
          <circle cx="12" cy="36" r="1.3" fill="#a5f3fc" fillOpacity="0.85" />
        </g>
      )}
    </svg>
  );
}

interface CompositionPreviewProps {
  preset: CompositionPresetId;
  color?: string;
  className?: string;
}

export function CompositionPresetPreview({
  preset,
  color = '#c4b5fd',
  className = 'w-12 h-10',
}: CompositionPreviewProps) {
  const uid = useId().replace(/:/g, '');
  const nodeGradId = `gl-comp-node-${uid}`;

  const renderNodes = (coords: number[][], coreIndex = -1) =>
    coords.map(([x, y], i) => (
      <g key={i}>
        <circle
          cx={x}
          cy={y}
          r={i === coreIndex ? 3.2 : 2.5}
          fill={`url(#${nodeGradId})`}
          stroke="rgba(255,255,255,0.85)"
          strokeWidth="0.9"
        />
        <circle cx={x - 0.6} cy={y - 0.6} r="0.85" fill="#ffffff" />
      </g>
    ));

  if (preset === 'heart') {
    const pts = [
      [24, 15],
      [35, 9],
      [39, 20],
      [24, 34],
      [9, 20],
      [13, 9],
    ];
    return (
      <svg viewBox="0 0 48 40" className={`${className} gl-icon-3d`} fill="none" aria-hidden="true">
        <defs>
          <radialGradient id={nodeGradId} cx="35%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="55%" stopColor="#a5f3fc" />
            <stop offset="100%" stopColor={color} />
          </radialGradient>
        </defs>
        <polygon
          points={pts.map((p) => p.join(',')).join(' ')}
          stroke="rgba(255,255,255,0.72)"
          strokeWidth="1.6"
        />
        {renderNodes(pts)}
      </svg>
    );
  }

  if (preset === 'flower') {
    const petals = [0, 1, 2, 3, 4].map((i) => {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      return [24 + Math.cos(a) * 14, 20 + Math.sin(a) * 13];
    });
    return (
      <svg viewBox="0 0 48 40" className={`${className} gl-icon-3d`} fill="none" aria-hidden="true">
        <defs>
          <radialGradient id={nodeGradId} cx="35%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="55%" stopColor="#a5f3fc" />
            <stop offset="100%" stopColor={color} />
          </radialGradient>
        </defs>
        <polygon
          points={petals.map((p) => p.join(',')).join(' ')}
          stroke="rgba(255,255,255,0.62)"
          strokeWidth="1.4"
        />
        {petals.map(([x, y], i) => (
          <line
            key={`l-${i}`}
            x1="24"
            y1="20"
            x2={x}
            y2={y}
            stroke="rgba(255,255,255,0.72)"
            strokeWidth="1.4"
          />
        ))}
        {renderNodes([[24, 20], ...petals], 0)}
      </svg>
    );
  }

  const freePts = [
    [8, 15],
    [17, 9],
    [25, 22],
    [34, 11],
    [40, 29],
  ];
  return (
    <svg viewBox="0 0 48 40" className={`${className} gl-icon-3d`} fill="none" aria-hidden="true">
      <defs>
        <radialGradient id={nodeGradId} cx="35%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#a5f3fc" />
          <stop offset="100%" stopColor={color} />
        </radialGradient>
      </defs>
      <polyline
        points={freePts.map((p) => p.join(',')).join(' ')}
        stroke="rgba(255,255,255,0.72)"
        strokeWidth="1.6"
      />
      {renderNodes(freePts)}
    </svg>
  );
}
