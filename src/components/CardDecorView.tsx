import { useId } from 'react';
import type { CardDecorMotif } from '../types/project';

interface CardDecorViewProps {
  motif: CardDecorMotif;
  glowHex: string;
  coreHex: string;
  className?: string;
}

export function CardDecorView({
  motif,
  glowHex,
  coreHex,
  className = 'w-24 h-24',
}: CardDecorViewProps) {
  const uid = useId().replace(/:/g, '');
  if (motif === 'none') return null;

  if (motif === 'sparkles') {
    const gradId = `sp_${uid}`;
    return (
      <svg
        viewBox="0 0 120 120"
        fill="none"
        className={className}
        aria-hidden="true"
        style={{ filter: `drop-shadow(0 0 10px ${glowHex}55)` }}
      >
        <defs>
          <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={coreHex} stopOpacity="0.98" />
            <stop offset="70%" stopColor={glowHex} stopOpacity="0.82" />
            <stop offset="100%" stopColor={glowHex} stopOpacity="0.2" />
          </radialGradient>
        </defs>
        <path
          d="M54 14L58.5 34.5L79 39L58.5 43.5L54 64L49.5 43.5L29 39L49.5 34.5L54 14Z"
          fill={`url(#${gradId})`}
        />
        <path
          d="M88 58L90.8 69.2L102 72L90.8 74.8L88 86L85.2 74.8L74 72L85.2 69.2L88 58Z"
          fill={glowHex}
          fillOpacity="0.88"
        />
        <path
          d="M32 76L33.8 83.2L41 85L33.8 86.8L32 94L30.2 86.8L23 85L30.2 83.2L32 76Z"
          fill={coreHex}
          fillOpacity="0.78"
        />
        <circle cx="88" cy="27" r="2.2" fill={coreHex} fillOpacity="0.88" />
        <circle cx="24" cy="48" r="1.8" fill={glowHex} fillOpacity="0.72" />
      </svg>
    );
  }

  if (motif === 'orbital') {
    const orbitGradId = `orb_${uid}`;
    return (
      <svg
        viewBox="0 0 120 120"
        fill="none"
        className={className}
        aria-hidden="true"
        style={{ filter: `drop-shadow(0 0 10px ${glowHex}44)` }}
      >
        <defs>
          <linearGradient id={orbitGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={coreHex} stopOpacity="0.92" />
            <stop offset="100%" stopColor={glowHex} stopOpacity="0.35" />
          </linearGradient>
        </defs>
        <ellipse
          cx="60"
          cy="60"
          rx="44"
          ry="17"
          transform="rotate(-24 60 60)"
          stroke={`url(#${orbitGradId})`}
          strokeWidth="1.4"
          strokeDasharray="3.5 4.5"
        />
        <ellipse
          cx="60"
          cy="60"
          rx="31"
          ry="11"
          transform="rotate(28 60 60)"
          stroke={coreHex}
          strokeWidth="1"
          strokeOpacity="0.58"
        />
        <circle cx="96" cy="43" r="3.8" fill={coreHex} />
        <circle cx="96" cy="43" r="6.5" stroke={glowHex} strokeWidth="0.7" strokeOpacity="0.45" />
        <path
          d="M31 32C26 35 23 41 24 47C25 53 31 57 37 56C32 55 29 50 29 45C29 40 31 35 35 32C33.5 31.6 32.2 31.6 31 32Z"
          fill={glowHex}
          fillOpacity="0.9"
        />
      </svg>
    );
  }

  if (motif === 'hearts') {
    const hGradId = `hrt_${uid}`;
    return (
      <svg
        viewBox="0 0 120 120"
        fill="none"
        className={className}
        aria-hidden="true"
        style={{ filter: `drop-shadow(0 0 10px ${glowHex}4d)` }}
      >
        <defs>
          <linearGradient id={hGradId} x1="25%" y1="20%" x2="80%" y2="85%">
            <stop offset="0%" stopColor={coreHex} stopOpacity="0.42" />
            <stop offset="100%" stopColor={glowHex} stopOpacity="0.16" />
          </linearGradient>
        </defs>
        <path
          d="M52 72C52 72 28 57 28 40C28 32 34 26 41.5 26C46.2 26 50.2 28.6 52 32.3C53.8 28.6 57.8 26 62.5 26C70 26 76 32 76 40C76 57 52 72 52 72Z"
          stroke={glowHex}
          strokeWidth="1.9"
          fill={`url(#${hGradId})`}
        />
        <path
          d="M86 86C86 86 73 78 73 69C73 64.8 76.2 61.6 80.2 61.6C82.8 61.6 84.9 63 86 65C87.1 63 89.2 61.6 91.8 61.6C95.8 61.6 99 64.8 99 69C99 78 86 86 86 86Z"
          stroke={coreHex}
          strokeWidth="1.6"
          fill={coreHex}
          fillOpacity="0.22"
        />
        <circle cx="88" cy="36" r="2" fill={coreHex} fillOpacity="0.85" />
        <circle cx="28" cy="82" r="2.2" fill={glowHex} fillOpacity="0.75" />
      </svg>
    );
  }

  if (motif === 'soft_flowers') {
    const pOuter = `sf_po_${uid}`;
    const pInner = `sf_pi_${uid}`;
    const leafGrad = `sf_lf_${uid}`;
    const coreGrad = `sf_cr_${uid}`;
    return (
      <svg
        viewBox="0 0 120 120"
        fill="none"
        className={className}
        aria-hidden="true"
        style={{ filter: `drop-shadow(0 4px 12px ${glowHex}36)` }}
      >
        <defs>
          <radialGradient id={pOuter} cx="50%" cy="30%" r="72%">
            <stop offset="0%" stopColor={coreHex} stopOpacity="0.52" />
            <stop offset="65%" stopColor={glowHex} stopOpacity="0.34" />
            <stop offset="100%" stopColor={glowHex} stopOpacity="0.12" />
          </radialGradient>
          <radialGradient id={pInner} cx="50%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.48" />
            <stop offset="100%" stopColor={coreHex} stopOpacity="0.32" />
          </radialGradient>
          <linearGradient id={leafGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={glowHex} stopOpacity="0.32" />
            <stop offset="100%" stopColor={coreHex} stopOpacity="0.14" />
          </linearGradient>
          <radialGradient id={coreGrad} cx="45%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.98" />
            <stop offset="60%" stopColor={coreHex} stopOpacity="0.9" />
            <stop offset="100%" stopColor={glowHex} stopOpacity="0.85" />
          </radialGradient>
        </defs>

        {/* Botanical gracefully curved stem & side twig */}
        <path
          d="M22 102C32 82 47 64 74 42"
          stroke={glowHex}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeOpacity="0.72"
        />
        <path
          d="M44 74C52 78 63 82 72 80"
          stroke={glowHex}
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeOpacity="0.55"
        />

        {/* Veined organic watercolor leaves */}
        <path
          d="M43 73C29 69 24 56 30 46C38 44 47 54 45 70Z"
          fill={`url(#${leafGrad})`}
          stroke={glowHex}
          strokeWidth="1.15"
          strokeOpacity="0.72"
        />
        <path
          d="M32 51C36 58 40 65 43 71"
          stroke={glowHex}
          strokeWidth="0.75"
          strokeOpacity="0.5"
          strokeLinecap="round"
        />
        <path
          d="M60 54C73 59 86 55 90 46C85 38 71 42 62 52Z"
          fill={`url(#${leafGrad})`}
          stroke={glowHex}
          strokeWidth="1.1"
          strokeOpacity="0.68"
        />
        <path
          d="M64 52C72 50 80 48 87 46"
          stroke={glowHex}
          strokeWidth="0.75"
          strokeOpacity="0.45"
          strokeLinecap="round"
        />

        {/* Main layered botanical garden bloom */}
        <g transform="translate(76 38)">
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <path
              key={deg}
              d="M0 0C-6 -6 -9 -17 0 -22C9 -17 6 -6 0 0Z"
              transform={`rotate(${deg})`}
              fill={`url(#${pOuter})`}
              stroke={glowHex}
              strokeWidth="1"
              strokeOpacity="0.68"
            />
          ))}
          {[30, 90, 150, 210, 270, 330].map((deg) => (
            <path
              key={`in-${deg}`}
              d="M0 0C-4.5 -4 -6.5 -12 0 -15.5C6.5 -12 4.5 -4 0 0Z"
              transform={`rotate(${deg})`}
              fill={`url(#${pInner})`}
              stroke={coreHex}
              strokeWidth="0.75"
              strokeOpacity="0.5"
            />
          ))}
          <circle cx="0" cy="0" r="4.8" fill={`url(#${coreGrad})`} />
          <circle cx="-1.5" cy="-1.2" r="0.9" fill="#FFFBEB" fillOpacity="0.9" />
          <circle cx="1.8" cy="1.1" r="0.8" fill="#FFFBEB" fillOpacity="0.85" />
          <circle cx="1.2" cy="-1.8" r="0.7" fill="#FFFBEB" fillOpacity="0.8" />
        </g>

        {/* Secondary delicate blossom */}
        <g transform="translate(36 86)">
          {[0, 72, 144, 216, 288].map((deg) => (
            <path
              key={`sb-${deg}`}
              d="M0 0C-4.2 -4 -6 -11.5 0 -14.5C6 -11.5 4.2 -4 0 0Z"
              transform={`rotate(${deg})`}
              fill={`url(#${pOuter})`}
              stroke={glowHex}
              strokeWidth="0.95"
              strokeOpacity="0.62"
            />
          ))}
          <circle cx="0" cy="0" r="3" fill={`url(#${coreGrad})`} />
        </g>

        {/* Unopened rosebud on lower twig */}
        <g transform="translate(76 78) rotate(28)">
          <path
            d="M0 4C-4 -1 -4 -8 0 -11C4 -8 4 -1 0 4Z"
            fill={`url(#${pOuter})`}
            stroke={glowHex}
            strokeWidth="0.95"
            strokeOpacity="0.68"
          />
        </g>

        {/* Delicate floating pollen specks */}
        <circle cx="48" cy="28" r="1.4" fill={coreHex} fillOpacity="0.7" />
        <circle cx="98" cy="64" r="1.2" fill={glowHex} fillOpacity="0.6" />
      </svg>
    );
  }

  if (motif === 'petals') {
    const ptA = `pt_a_${uid}`;
    const ptB = `pt_b_${uid}`;
    return (
      <svg
        viewBox="0 0 120 120"
        fill="none"
        className={className}
        aria-hidden="true"
        style={{ filter: `drop-shadow(0 3px 10px ${glowHex}36)` }}
      >
        <defs>
          <linearGradient id={ptA} x1="15%" y1="10%" x2="85%" y2="90%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.52" />
            <stop offset="45%" stopColor={coreHex} stopOpacity="0.4" />
            <stop offset="100%" stopColor={glowHex} stopOpacity="0.24" />
          </linearGradient>
          <linearGradient id={ptB} x1="0%" y1="20%" x2="100%" y2="85%">
            <stop offset="0%" stopColor={coreHex} stopOpacity="0.48" />
            <stop offset="100%" stopColor={glowHex} stopOpacity="0.18" />
          </linearGradient>
        </defs>

        {/* Sculpted sakura/rose petals with delicate vein creases */}
        <path
          d="M27 25C36 17 50 22 52 34C53 43 44 50 34 48C26 46 21 33 27 25Z"
          fill={`url(#${ptA})`}
          stroke={glowHex}
          strokeWidth="1.15"
          strokeOpacity="0.72"
        />
        <path
          d="M31 30C36 35 39 40 41 45"
          stroke={coreHex}
          strokeWidth="0.75"
          strokeOpacity="0.45"
          strokeLinecap="round"
        />

        <path
          d="M80 20C91 23 94 37 86 46C79 52 67 48 66 37C65 28 72 18 80 20Z"
          fill={`url(#${ptB})`}
          stroke={glowHex}
          strokeWidth="1.1"
          strokeOpacity="0.68"
        />
        <path
          d="M78 26C77 32 76 38 74 44"
          stroke={glowHex}
          strokeWidth="0.7"
          strokeOpacity="0.42"
          strokeLinecap="round"
        />

        <path
          d="M55 54C68 50 79 62 73 77C67 86 52 84 46 73C42 64 47 56 55 54Z"
          fill={`url(#${ptA})`}
          stroke={glowHex}
          strokeWidth="1.2"
          strokeOpacity="0.76"
        />
        <path
          d="M55 60C58 66 59 72 58 79"
          stroke={coreHex}
          strokeWidth="0.75"
          strokeOpacity="0.45"
          strokeLinecap="round"
        />

        {/* Slender curving botanical leaflet */}
        <path
          d="M21 79C28 70 40 72 40 82C38 91 26 93 20 85C18 83 19 81 21 79Z"
          fill={`url(#${ptB})`}
          stroke={glowHex}
          strokeWidth="1"
          strokeOpacity="0.62"
        />
        <path
          d="M89 75C98 76 102 86 95 93C89 98 80 94 79 86C79 80 84 75 89 75Z"
          fill={`url(#${ptA})`}
          stroke={glowHex}
          strokeWidth="1"
          strokeOpacity="0.62"
        />

        {/* Delicate floating petal mist & stamen dots */}
        <circle cx="60" cy="39" r="1.8" fill={coreHex} fillOpacity="0.78" />
        <circle cx="88" cy="59" r="1.5" fill={glowHex} fillOpacity="0.68" />
        <circle cx="42" cy="96" r="1.3" fill={coreHex} fillOpacity="0.65" />
      </svg>
    );
  }

  if (motif === 'floral_corners') {
    const fcPetal = `fc_pt_${uid}`;
    const fcLeaf = `fc_lf_${uid}`;
    return (
      <svg
        viewBox="0 0 120 120"
        fill="none"
        className={className}
        aria-hidden="true"
        style={{ filter: `drop-shadow(0 3px 10px ${glowHex}38)` }}
      >
        <defs>
          <radialGradient id={fcPetal} cx="45%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.5" />
            <stop offset="55%" stopColor={coreHex} stopOpacity="0.44" />
            <stop offset="100%" stopColor={glowHex} stopOpacity="0.22" />
          </radialGradient>
          <linearGradient id={fcLeaf} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={glowHex} stopOpacity="0.34" />
            <stop offset="100%" stopColor={coreHex} stopOpacity="0.14" />
          </linearGradient>
        </defs>

        {/* Corner vine framing arc along top-right & bottom-left perimeter */}
        <path
          d="M16 18C44 16 74 26 98 52"
          stroke={glowHex}
          strokeWidth="1.35"
          strokeLinecap="round"
          strokeOpacity="0.72"
        />
        <path
          d="M104 102C76 104 46 94 22 68"
          stroke={glowHex}
          strokeWidth="1.35"
          strokeLinecap="round"
          strokeOpacity="0.72"
        />

        {/* Leaves & buds along top corner sprig */}
        <path
          d="M42 20C36 10 44 4 52 10C53 16 47 20 42 20Z"
          fill={`url(#${fcLeaf})`}
          stroke={glowHex}
          strokeWidth="0.95"
          strokeOpacity="0.68"
        />
        <path
          d="M84 36C94 31 102 36 98 44C91 47 85 42 84 36Z"
          fill={`url(#${fcLeaf})`}
          stroke={glowHex}
          strokeWidth="0.95"
          strokeOpacity="0.68"
        />
        {/* Delicate blossom at corner apex */}
        <g transform="translate(68 25)">
          {[0, 72, 144, 216, 288].map((deg) => (
            <path
              key={`fct-${deg}`}
              d="M0 0C-3.8 -3.8 -5.4 -10.5 0 -13.2C5.4 -10.5 3.8 -3.8 0 0Z"
              transform={`rotate(${deg})`}
              fill={`url(#${fcPetal})`}
              stroke={glowHex}
              strokeWidth="0.9"
              strokeOpacity="0.7"
            />
          ))}
          <circle cx="0" cy="0" r="2.8" fill={coreHex} fillOpacity="0.92" />
        </g>

        {/* Symmetric opposite bottom corner sprig */}
        <path
          d="M78 100C84 110 76 116 68 110C67 104 73 100 78 100Z"
          fill={`url(#${fcLeaf})`}
          stroke={glowHex}
          strokeWidth="0.95"
          strokeOpacity="0.68"
        />
        <path
          d="M36 84C26 89 18 84 22 76C29 73 35 78 36 84Z"
          fill={`url(#${fcLeaf})`}
          stroke={glowHex}
          strokeWidth="0.95"
          strokeOpacity="0.68"
        />
        <g transform="translate(52 95)">
          {[0, 72, 144, 216, 288].map((deg) => (
            <path
              key={`fcb-${deg}`}
              d="M0 0C-3.8 -3.8 -5.4 -10.5 0 -13.2C5.4 -10.5 3.8 -3.8 0 0Z"
              transform={`rotate(${deg})`}
              fill={`url(#${fcPetal})`}
              stroke={glowHex}
              strokeWidth="0.9"
              strokeOpacity="0.7"
            />
          ))}
          <circle cx="0" cy="0" r="2.8" fill={coreHex} fillOpacity="0.92" />
        </g>

        <circle cx="96" cy="58" r="1.7" fill={coreHex} fillOpacity="0.78" />
        <circle cx="24" cy="62" r="1.7" fill={coreHex} fillOpacity="0.78" />
      </svg>
    );
  }

  if (motif === 'magic_rays') {
    const rayGrad = `mr_${uid}`;
    return (
      <svg
        viewBox="0 0 120 120"
        fill="none"
        className={className}
        aria-hidden="true"
        style={{ filter: `drop-shadow(0 0 12px ${glowHex}66)` }}
      >
        <defs>
          <radialGradient id={rayGrad} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={coreHex} stopOpacity="0.96" />
            <stop offset="55%" stopColor={glowHex} stopOpacity="0.7" />
            <stop offset="100%" stopColor={glowHex} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="60" cy="60" r="31" stroke={glowHex} strokeWidth="0.9" strokeDasharray="2.5 5" strokeOpacity="0.58" />
        <circle cx="60" cy="60" r="19" stroke={coreHex} strokeWidth="0.75" strokeOpacity="0.4" />
        <line x1="60" y1="10" x2="60" y2="110" stroke={coreHex} strokeWidth="1.2" strokeOpacity="0.65" strokeLinecap="round" />
        <line x1="10" y1="60" x2="110" y2="60" stroke={coreHex} strokeWidth="1.2" strokeOpacity="0.65" strokeLinecap="round" />
        <line x1="26" y1="26" x2="94" y2="94" stroke={glowHex} strokeWidth="1" strokeOpacity="0.48" strokeLinecap="round" />
        <line x1="94" y1="26" x2="26" y2="94" stroke={glowHex} strokeWidth="1" strokeOpacity="0.48" strokeLinecap="round" />
        <path
          d="M60 32L64.5 55.5L88 60L64.5 64.5L60 88L55.5 64.5L32 60L55.5 55.5L60 32Z"
          fill={`url(#${rayGrad})`}
          stroke={coreHex}
          strokeWidth="1.1"
        />
        <circle cx="91" cy="29" r="2" fill={coreHex} fillOpacity="0.88" />
        <circle cx="29" cy="91" r="2" fill={glowHex} fillOpacity="0.82" />
        <circle cx="29" cy="29" r="1.4" fill={coreHex} fillOpacity="0.65" />
        <circle cx="91" cy="91" r="1.4" fill={glowHex} fillOpacity="0.65" />
      </svg>
    );
  }

  // 'corners'
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      className={className}
      aria-hidden="true"
      style={{ filter: `drop-shadow(0 0 10px ${glowHex}44)` }}
    >
      <path
        d="M16 44V22C16 18.7 18.7 16 22 16H44"
        stroke={glowHex}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M22 38V24C22 22.9 22.9 22 24 22H38"
        stroke={coreHex}
        strokeWidth="1"
        strokeOpacity="0.65"
        strokeLinecap="round"
      />
      <path
        d="M104 76V98C104 101.3 101.3 104 98 104H76"
        stroke={glowHex}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M98 82V96C98 97.1 97.1 98 96 98H82"
        stroke={coreHex}
        strokeWidth="1"
        strokeOpacity="0.65"
        strokeLinecap="round"
      />
      <path
        d="M84 22L86 30L94 32L86 34L84 42L82 34L74 32L82 30L84 22Z"
        fill={coreHex}
        fillOpacity="0.9"
      />
      <path
        d="M36 78L38 86L46 88L38 90L36 98L34 90L26 88L34 86L36 78Z"
        fill={coreHex}
        fillOpacity="0.82"
      />
    </svg>
  );
}
