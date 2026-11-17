import type { CSSProperties } from 'react';
import type { CosmicPaletteId } from '../types/project';

interface CosmicBackdropProps {
  paletteId?: CosmicPaletteId;
}

interface GlowOrbSpec {
  id: number;
  className: string;
  style: CSSProperties;
}

const GLOW_ORBS: GlowOrbSpec[] = [
  {
    id: 1,
    className: 'gl-glow-orb gl-glow-orb-1',
    style: {
      top: '-12%',
      left: '-8%',
      width: 'clamp(340px, 52vw, 680px)',
      height: 'clamp(340px, 52vw, 680px)',
      background:
        'radial-gradient(circle at 42% 42%, rgba(34, 211, 238, 0.42) 0%, rgba(56, 189, 248, 0.20) 42%, transparent 72%)',
    },
  },
  {
    id: 2,
    className: 'gl-glow-orb gl-glow-orb-2',
    style: {
      top: '4%',
      right: '-10%',
      width: 'clamp(360px, 56vw, 720px)',
      height: 'clamp(360px, 56vw, 720px)',
      background:
        'radial-gradient(circle at 54% 44%, rgba(232, 121, 249, 0.40) 0%, rgba(192, 38, 211, 0.19) 45%, transparent 74%)',
    },
  },
  {
    id: 3,
    className: 'gl-glow-orb gl-glow-orb-3',
    style: {
      bottom: '-14%',
      left: '8%',
      width: 'clamp(360px, 54vw, 700px)',
      height: 'clamp(360px, 54vw, 700px)',
      background:
        'radial-gradient(circle at 48% 52%, rgba(139, 92, 246, 0.44) 0%, var(--gl-nebula-1) 46%, transparent 74%)',
    },
  },
  {
    id: 4,
    className: 'gl-glow-orb gl-glow-orb-4',
    style: {
      bottom: '-8%',
      right: '6%',
      width: 'clamp(300px, 44vw, 560px)',
      height: 'clamp(300px, 44vw, 560px)',
      background:
        'radial-gradient(circle at 50% 50%, rgba(253, 186, 116, 0.34) 0%, rgba(251, 113, 133, 0.18) 44%, transparent 72%)',
    },
  },
  {
    id: 5,
    className: 'gl-glow-orb gl-glow-orb-5',
    style: {
      top: '36%',
      left: '34%',
      width: 'clamp(280px, 42vw, 540px)',
      height: 'clamp(280px, 42vw, 540px)',
      background:
        'radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.24) 0%, rgba(168, 85, 247, 0.16) 46%, transparent 74%)',
    },
  },
  {
    id: 6,
    className: 'gl-glow-orb gl-glow-orb-6',
    style: {
      top: '48%',
      right: '24%',
      width: 'clamp(260px, 38vw, 480px)',
      height: 'clamp(260px, 38vw, 480px)',
      background:
        'radial-gradient(circle at 50% 50%, var(--gl-nebula-2) 0%, rgba(244, 114, 182, 0.14) 48%, transparent 74%)',
    },
  },
];

export function CosmicBackdrop({ paletteId = 'lavender' }: CosmicBackdropProps) {
  return (
    <div
      data-palette={paletteId}
      aria-hidden="true"
      className="gl-cosmic-backdrop pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
    >
      {/* Subtle deep palette wash */}
      <div className="gl-nebula-layer gl-nebula-layer-far opacity-55" />

      {/* 6 Large Floating Volumetric Glow Orbs (Cyan, Fuchsia, Violet, Peach) */}
      <div className="absolute inset-0">
        {GLOW_ORBS.map((orb) => (
          <div key={orb.id} className={orb.className} style={orb.style} />
        ))}
      </div>
    </div>
  );
}
