import { useEffect, useRef, useState } from 'react';
import { StarShapePreview } from '../assets/shapePreviews';
import {
  COSMIC_PALETTES,
  GLOW_COLORS,
  buildLegacySequentialConnections,
  resolveStarGlowHex,
  resolveStarShape,
} from '../scene/paletteConfig';
import type {
  ConstellationAnimationId,
  ConstellationStar,
  CosmicPaletteId,
  DeviceConstellationLayout,
  EditorInteractionMode,
  GlowColorId,
  RecipientPhase,
  StarConnection,
  StarPosition3D,
} from '../types/project';

interface Constellation2DFallbackProps {
  paletteId: CosmicPaletteId;
  globalGlowColor: GlowColorId;
  stars: ConstellationStar[];
  connections?: StarConnection[];
  selectedStarId: string | null;
  selectedConnectionId?: string | null;
  pendingLinkStarId?: string | null;
  visitedStarIds?: string[];
  interactionMode: EditorInteractionMode | 'recipient';
  recipientPhase?: RecipientPhase;
  unlockedCount?: number;
  finaleActive?: boolean;
  reducedMotion?: boolean;
  constellationLayout?: DeviceConstellationLayout;
  constellationAnimation?: ConstellationAnimationId;
  onSelectStar?: (starId: string) => void;
  onSelectConnection?: (connectionId: string | null) => void;
  onMoveStar?: (starId: string, position: StarPosition3D) => void;
}

function worldToPercent(
  x: number,
  y: number,
  extentX: number,
  extentY: number,
  layout?: DeviceConstellationLayout,
): { left: number; top: number } {
  const sc = layout ? Math.max(0.55, Math.min(1.45, layout.scale)) : 1;
  const ox = layout ? (Math.max(-100, Math.min(100, layout.offsetX)) / 100) * 2.8 : 0;
  const oy = layout ? (Math.max(-100, Math.min(100, layout.offsetY)) / 100) * 2.2 : 0;
  const sx = x * sc + ox;
  const sy = y * sc + oy;
  const left = 50 + (sx / extentX) * 40;
  const top = 50 - (sy / extentY) * 38;
  return {
    left: Math.max(8, Math.min(92, left)),
    top: Math.max(12, Math.min(88, top)),
  };
}

function percentToWorld(
  leftPct: number,
  topPct: number,
  extentX: number,
  extentY: number,
): { x: number; y: number } {
  const x = ((leftPct - 50) / 40) * extentX;
  const y = -((topPct - 50) / 38) * extentY;
  return {
    x: Number(Math.max(-8.5, Math.min(8.5, x)).toFixed(2)),
    y: Number(Math.max(-5.5, Math.min(5.5, y)).toFixed(2)),
  };
}

export function Constellation2DFallback({
  paletteId,
  globalGlowColor,
  stars,
  connections,
  selectedStarId,
  selectedConnectionId = null,
  pendingLinkStarId = null,
  visitedStarIds = [],
  interactionMode,
  recipientPhase,
  unlockedCount,
  finaleActive = false,
  reducedMotion = false,
  constellationLayout,
  constellationAnimation = 'rotation',
  onSelectStar,
  onSelectConnection,
  onMoveStar,
}: Constellation2DFallbackProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const palette = COSMIC_PALETTES[paletteId];
  const visitedSet = new Set(visitedStarIds);
  const starMap = new Map(stars.map((s) => [s.id, s]));
  const activeConnections =
    connections ?? buildLegacySequentialConnections(stars);
  const appliedLayout =
    interactionMode === 'recipient' &&
    recipientPhase !== 'sealed' &&
    recipientPhase !== 'birthing'
      ? constellationLayout
      : undefined;

  const extentX = Math.max(
    5.2,
    ...stars.map((s) => Math.abs(s.position.x) * 1.12),
  );
  const extentY = Math.max(
    3.4,
    ...stars.map((s) => Math.abs(s.position.y) * 1.15),
  );

  const isRecipientStory =
    interactionMode === 'recipient' && recipientPhase === 'starStory';
  const showLines =
    interactionMode !== 'recipient' ||
    recipientPhase === 'finalReveal' ||
    recipientPhase === 'constellation';
  const maxUnlocked =
    interactionMode === 'recipient' && unlockedCount !== undefined
      ? unlockedCount
      : stars.length;

  const [isPortrait, setIsPortrait] = useState(() =>
    typeof window !== 'undefined'
      ? window.innerHeight > window.innerWidth || window.innerWidth < 540
      : false,
  );

  useEffect(() => {
    const syncOrientation = () => {
      setIsPortrait(
        window.innerHeight > window.innerWidth || window.innerWidth < 540,
      );
    };
    window.addEventListener('resize', syncOrientation);
    window.addEventListener('orientationchange', syncOrientation);
    return () => {
      window.removeEventListener('resize', syncOrientation);
      window.removeEventListener('orientationchange', syncOrientation);
    };
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (draggingId && interactionMode === 'arrange') {
      const targetStar = stars.find((s) => s.id === draggingId);
      if (!targetStar) return;
      const leftPct = ((e.clientX - rect.left) / rect.width) * 100;
      const topPct = ((e.clientY - rect.top) / rect.height) * 100;
      const { x, y } = percentToWorld(leftPct, topPct, extentX, extentY);
      onMoveStar?.(draggingId, { x, y, z: targetStar.position.z });
      return;
    }

    if (!reducedMotion && constellationAnimation !== 'none') {
      const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      setParallax({ x: nx * 12, y: ny * 8 });
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={() => setDraggingId(null)}
      onPointerLeave={() => setDraggingId(null)}
      onClick={() => {
        if (interactionMode === 'connect') {
          onSelectConnection?.(null);
        }
      }}
      className="relative w-full h-full overflow-hidden select-none"
      style={{ background: palette.cssGradient }}
      aria-label="Космическое созвездие (облегчённый режим)"
    >
      {/* Constellation connection lines */}
      {showLines && (
        <svg
          className={`absolute inset-0 w-full h-full ${
            interactionMode === 'connect' ? 'pointer-events-auto' : 'pointer-events-none'
          }`}
          style={{
            transform: reducedMotion
              ? undefined
              : `translate3d(${parallax.x * -0.4}px, ${parallax.y * -0.4}px, 0)`,
            transition: 'transform 160ms ease-out',
          }}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {activeConnections.map((conn) => {
            const fromStar = starMap.get(conn.from);
            const toStar = starMap.get(conn.to);
            if (!fromStar || !toStar) return null;

            const p1 = worldToPercent(fromStar.position.x, fromStar.position.y, extentX, extentY, appliedLayout);
            const p2 = worldToPercent(toStar.position.x, toStar.position.y, extentX, extentY, appliedLayout);
            const isSelectedLine = conn.id === selectedConnectionId;

            return (
              <g key={conn.id}>
                <line
                  x1={p1.left}
                  y1={p1.top}
                  x2={p2.left}
                  y2={p2.top}
                  stroke={isSelectedLine ? '#fde68a' : palette.lineTint}
                  strokeWidth={isSelectedLine ? 0.75 : finaleActive ? 0.55 : 0.34}
                  strokeOpacity={isSelectedLine ? 0.98 : finaleActive ? 0.9 : 0.65}
                  strokeLinecap="round"
                />
                {interactionMode === 'connect' && (
                  <line
                    x1={p1.left}
                    y1={p1.top}
                    x2={p2.left}
                    y2={p2.top}
                    stroke="transparent"
                    strokeWidth="3.5"
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectConnection?.(conn.id);
                    }}
                  />
                )}
              </g>
            );
          })}
        </svg>
      )}

      {/* Interactive star nodes */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: reducedMotion
            ? undefined
            : `translate3d(${parallax.x * 0.5}px, ${parallax.y * 0.5}px, 0)`,
          transition: 'transform 160ms ease-out',
        }}
      >
        {stars.map((star, idx) => {
          if (interactionMode === 'recipient' && idx >= maxUnlocked) {
            return null;
          }

          const isHero = isRecipientStory && selectedStarId === star.id;
          const isBgStory = isRecipientStory && !isHero;
          const pos = isHero
            ? isPortrait
              ? { left: 50, top: 20 }
              : { left: 22, top: 50 }
            : worldToPercent(star.position.x, star.position.y, extentX, extentY, appliedLayout);

          const glowCfg = GLOW_COLORS[resolveStarGlowHex(star, globalGlowColor)];
          const shape = resolveStarShape(star);
          const isSelected = selectedStarId === star.id;
          const isPending = pendingLinkStarId === star.id;
          const isVisited = visitedSet.has(star.id);

          const sizePx = isHero
            ? 96
            : isSelected || finaleActive || isPending
              ? 46
              : 38;

          return (
            <button
              key={star.id}
              type="button"
              onPointerDown={(e) => {
                if (interactionMode === 'arrange') {
                  e.stopPropagation();
                  setDraggingId(star.id);
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectStar?.(star.id);
              }}
              className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 rounded-2xl p-1.5 cursor-pointer flex flex-col items-center transition-all duration-500"
              style={{
                left: `${pos.left}%`,
                top: `${pos.top}%`,
                opacity: isBgStory ? 0.55 : 1,
                zIndex: isHero ? 5 : 1,
              }}
              aria-label={star.title || `Звезда ${idx + 1}`}
            >
              <span
                className={`rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${
                  isPending
                    ? 'ring-2 ring-amber-300 scale-115'
                    : isSelected && !isHero
                      ? 'ring-2 ring-white/80'
                      : ''
                }`}
                style={{
                  width: `${sizePx}px`,
                  height: `${sizePx}px`,
                  background: `radial-gradient(circle, ${glowCfg.hex}${
                    isHero ? '66' : '44'
                  } 0%, transparent 72%)`,
                  boxShadow:
                    isHero || isVisited || isSelected
                      ? `0 0 ${isHero ? 38 : 18}px ${glowCfg.hex}99`
                      : undefined,
                }}
              >
                <StarShapePreview
                  shape={shape}
                  color={glowCfg.hex}
                  coreColor={glowCfg.coreHex}
                  className={isHero ? 'w-20 h-20' : 'w-8 h-8'}
                />
              </span>
              {!isHero && (
                <span className="mt-0.5 block text-[11px] font-medium text-white/90 whitespace-nowrap drop-shadow">
                  {star.title || `Звезда ${idx + 1}`}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
