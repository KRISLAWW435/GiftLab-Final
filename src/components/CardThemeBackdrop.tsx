import { useId } from 'react';
import type { CardThemeConfig } from '../scene/paletteConfig';
import { StarburstFlare } from './StarburstFlare';

interface CardThemeBackdropProps {
  pattern: CardThemeConfig['paperPattern'];
  accentColor: string;
  badgeColor: string;
  borderColor: string;
  glowHex: string;
  isLightPaper?: boolean;
  reducedMotion?: boolean;
  compact?: boolean;
}

export function CardThemeBackdrop({
  pattern,
  accentColor,
  badgeColor,
  borderColor,
  glowHex,
  isLightPaper = false,
  reducedMotion = false,
  compact = false,
}: CardThemeBackdropProps) {
  const uid = useId().replace(/:/g, '');

  if (pattern === 'paper') {
    return (
      <>
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(140,108,80,0.032) 0px, rgba(140,108,80,0.032) 1px, transparent 1px, transparent 24px)',
          }}
          aria-hidden="true"
        />
        <div
          className={`pointer-events-none absolute ${
            compact ? 'inset-1.5 rounded-lg' : 'inset-2.5 sm:inset-3 rounded-[18px]'
          } border`}
          style={{ borderColor: `${accentColor}40` }}
          aria-hidden="true"
        />
      </>
    );
  }

  if (pattern === 'stars') {
    return (
      <>
        {/* Deep cosmic frosted depth + iridescent top specular light */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: [
              `radial-gradient(ellipse 85% 65% at 86% 18%, ${accentColor}26 0%, transparent 64%)`,
              `radial-gradient(ellipse 75% 60% at 15% 88%, ${glowHex}22 0%, transparent 65%)`,
              'linear-gradient(165deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 38%, rgba(12,10,30,0.28) 100%)',
            ].join(', '),
          }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-35"
          style={{
            backgroundImage: `radial-gradient(${accentColor}77 1px, transparent 1px)`,
            backgroundSize: compact ? '16px 16px' : '28px 28px',
          }}
          aria-hidden="true"
        />
        {/* Crisp top specular rim */}
        <div
          className="pointer-events-none absolute inset-x-4 top-0 h-px opacity-75"
          style={{
            background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.85) 35%, ${badgeColor} 65%, transparent)`,
          }}
          aria-hidden="true"
        />
        <div
          className={`pointer-events-none absolute ${
            compact ? 'inset-1.5 rounded-lg' : 'inset-2.5 sm:inset-3 rounded-[18px]'
          } border`}
          style={{
            borderColor: `${borderColor}38`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.22)`,
          }}
          aria-hidden="true"
        />
        {/* Gentle pulsing golden/starlight Starburst flare in upper-right safe perimeter */}
        <div
          className={`pointer-events-none absolute ${
            compact ? '-right-3 -top-3 opacity-80' : 'right-3 sm:right-6 top-6 sm:top-8 opacity-90'
          }`}
          aria-hidden="true"
        >
          <StarburstFlare
            coreColor="#FFFBEB"
            rayColor={accentColor}
            reducedMotion={reducedMotion}
            className={compact ? 'w-14 h-14' : 'w-28 h-28 sm:w-36 sm:h-36'}
          />
        </div>
      </>
    );
  }

  if (pattern === 'botanical') {
    return (
      <>
        <div
          className="pointer-events-none absolute inset-0 opacity-65"
          style={{
            background: `radial-gradient(circle at 10% 10%, ${accentColor}26, transparent 44%), radial-gradient(circle at 90% 90%, ${accentColor}24, transparent 44%)`,
          }}
          aria-hidden="true"
        />
        <div
          className={`pointer-events-none absolute ${
            compact ? 'inset-1.5 rounded-lg' : 'inset-2.5 sm:inset-3 rounded-[18px]'
          } border border-dashed`}
          style={{ borderColor: `${accentColor}4c` }}
          aria-hidden="true"
        />
        {!compact && (
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 w-full h-full opacity-35"
            aria-hidden="true"
          >
            <path
              d="M4 18C7 10 12 6 20 4M96 82C93 90 88 94 80 96"
              stroke={accentColor}
              strokeWidth="0.45"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        )}
      </>
    );
  }

  if (pattern === 'aurora') {
    const gradNebulaId = `aurora_nebula_${uid}`;
    return (
      <>
        {/* Frosted holographic violet glass washes */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: [
              `radial-gradient(ellipse 78% 64% at 14% 12%, rgba(255,255,255,0.22) 0%, ${accentColor}28 32%, transparent 68%)`,
              `radial-gradient(ellipse 68% 58% at 86% 88%, ${badgeColor}2a 0%, transparent 64%)`,
              `radial-gradient(ellipse 56% 48% at 88% 14%, ${glowHex}2a 0%, transparent 68%)`,
            ].join(', '),
          }}
          aria-hidden="true"
        />

        {/* Iridescent top & bottom frosted border refraction */}
        <div
          className="pointer-events-none absolute inset-x-3 top-0 h-px opacity-85"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(255,255,255,0.92) 30%, rgba(216,180,254,0.85) 70%, transparent)',
          }}
          aria-hidden="true"
        />

        {/* Soft luminous central halo directly behind greeting text */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 66% 52% at 50% 52%, ${accentColor}24 0%, ${glowHex}14 42%, transparent 74%)`,
          }}
          aria-hidden="true"
        />

        {/* Delicate slowly rotating concentric orbits centered cleanly */}
        <div
          className={`pointer-events-none absolute left-1/2 top-1/2 ${
            compact ? 'w-[125%] aspect-square opacity-45' : 'w-[86%] max-w-[440px] aspect-square opacity-55'
          } ${reducedMotion ? '-translate-x-1/2 -translate-y-1/2' : 'gl-card-orbit-cw'}`}
          aria-hidden="true"
        >
          <svg viewBox="0 0 240 240" fill="none" className="w-full h-full">
            <defs>
              <linearGradient id={gradNebulaId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={accentColor} stopOpacity="0.65" />
                <stop offset="50%" stopColor={badgeColor} stopOpacity="0.42" />
                <stop offset="100%" stopColor={accentColor} stopOpacity="0.15" />
              </linearGradient>
            </defs>
            <ellipse
              cx="120"
              cy="120"
              rx="106"
              ry="76"
              transform="rotate(-18 120 120)"
              stroke={`url(#${gradNebulaId})`}
              strokeWidth="0.7"
              strokeDasharray="2.5 5.5"
            />
            <circle cx="218" cy="88" r="2.1" fill={badgeColor} fillOpacity="0.9" />
            <circle cx="22" cy="152" r="1.6" fill={accentColor} fillOpacity="0.85" />
          </svg>
        </div>

        <div
          className={`pointer-events-none absolute left-1/2 top-1/2 ${
            compact ? 'w-[96%] aspect-square opacity-40' : 'w-[70%] max-w-[350px] aspect-square opacity-45'
          } ${reducedMotion ? '-translate-x-1/2 -translate-y-1/2' : 'gl-card-orbit-ccw'}`}
          aria-hidden="true"
        >
          <svg viewBox="0 0 240 240" fill="none" className="w-full h-full">
            <ellipse
              cx="120"
              cy="120"
              rx="92"
              ry="62"
              transform="rotate(24 120 120)"
              stroke={badgeColor}
              strokeWidth="0.55"
              strokeOpacity="0.48"
            />
            <path
              d="M42 74L43.5 78.5L48 80L43.5 81.5L42 86L40.5 81.5L36 80L40.5 78.5Z"
              fill={badgeColor}
              fillOpacity="0.85"
            />
          </svg>
        </div>

        {/* Crisp holographic glass frame */}
        <div
          className={`pointer-events-none absolute ${
            compact ? 'inset-1.5 rounded-lg' : 'inset-2.5 sm:inset-3.5 rounded-[18px]'
          } border gl-card-holo-rim`}
          style={{
            borderColor: `${borderColor}55`,
          }}
          aria-hidden="true"
        />

        {/* Ambient space 4-point starburst in upper-right perimeter */}
        <div
          className={`pointer-events-none absolute ${
            compact ? '-right-2 -top-2 opacity-80' : 'right-3 sm:right-5 top-4 sm:top-6 opacity-90'
          }`}
          aria-hidden="true"
        >
          <StarburstFlare
            coreColor="#FFFFFF"
            rayColor={badgeColor}
            reducedMotion={reducedMotion}
            className={compact ? 'w-12 h-12' : 'w-24 h-24 sm:w-32 sm:h-32'}
          />
        </div>

        {!compact && (
          <svg
            viewBox="0 0 400 300"
            preserveAspectRatio="none"
            fill="none"
            className="pointer-events-none absolute inset-0 w-full h-full opacity-80"
            aria-hidden="true"
          >
            {/* Glowing 4-point space sparkles around perimeter */}
            <path
              d="M36 42L38 48L44 50L38 52L36 58L34 52L28 50L34 48Z"
              fill="#FFFFFF"
              fillOpacity="0.82"
            />
            <path
              d="M366 244L368 250L374 252L368 254L366 260L364 254L358 252L364 250Z"
              fill={badgeColor}
              fillOpacity="0.85"
            />
            <path
              d="M200 10L203 16L209 18L203 20L200 26L197 20L191 18L197 16Z"
              fill={badgeColor}
              fillOpacity="0.72"
            />
            <path
              d="M200 274L203 280L209 282L203 284L200 290L197 284L191 282L197 280Z"
              fill={accentColor}
              fillOpacity="0.68"
            />
            <circle cx="116" cy="18" r="1.1" fill="#FFFFFF" fillOpacity="0.58" />
            <circle cx="284" cy="18" r="1.1" fill="#FFFFFF" fillOpacity="0.58" />
            <circle cx="34" cy="266" r="1.4" fill={accentColor} fillOpacity="0.75" />
            <circle cx="116" cy="282" r="1" fill={badgeColor} fillOpacity="0.55" />
            <circle cx="284" cy="282" r="1" fill={badgeColor} fillOpacity="0.55" />
          </svg>
        )}
      </>
    );
  }

  // 'minimal' — Editorial architectural stationery composition
  const inkLine = isLightPaper ? borderColor : accentColor;
  return (
    <>
      {/* Subtle asymmetric tonal field on top-right edge */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-[34%] opacity-35"
        style={{
          background: `linear-gradient(180deg, ${accentColor}18 0%, transparent 65%, ${accentColor}12 100%)`,
        }}
        aria-hidden="true"
      />

      {/* Crisp geometric architectural frame */}
      <div
        className={`pointer-events-none absolute ${
          compact ? 'inset-1.5 rounded-md' : 'inset-3 sm:inset-4 rounded-[14px]'
        } border`}
        style={{ borderColor: `${inkLine}66` }}
        aria-hidden="true"
      />

      {/* Asymmetric vertical guide line & datum geometry */}
      {!compact ? (
        <>
          <div
            className="pointer-events-none absolute left-5 sm:left-7 top-3 sm:top-4 bottom-3 sm:bottom-4 w-px opacity-45"
            style={{ backgroundColor: accentColor }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute right-6 top-6 w-2 h-2 rounded-full opacity-75"
            style={{ backgroundColor: accentColor }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute right-6 bottom-6 w-6 h-px opacity-60"
            style={{ backgroundColor: badgeColor }}
            aria-hidden="true"
          />
        </>
      ) : (
        <>
          <div
            className="pointer-events-none absolute left-3 top-1.5 bottom-1.5 w-px opacity-50"
            style={{ backgroundColor: accentColor }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute right-3 top-3 w-1.5 h-1.5 rounded-full opacity-75"
            style={{ backgroundColor: accentColor }}
            aria-hidden="true"
          />
        </>
      )}
    </>
  );
}
