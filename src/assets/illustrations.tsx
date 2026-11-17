import { useId } from 'react';
import type { BuiltinIllustrationId } from '../types/project';

export interface BuiltinIllustrationMeta {
  id: BuiltinIllustrationId;
  name: string;
  meaning: string;
  accentColor: string;
}

export const BUILTIN_ILLUSTRATIONS: BuiltinIllustrationMeta[] = [
  {
    id: 'heart',
    name: 'Светящееся сердце',
    meaning: 'Любовь, забота и близость',
    accentColor: '#f472b6',
  },
  {
    id: 'flower',
    name: 'Волшебный цветок',
    meaning: 'Благодарность, нежность и красота',
    accentColor: '#c084fc',
  },
  {
    id: 'moon',
    name: 'Луна',
    meaning: 'Спокойствие, тепло и уют',
    accentColor: '#fcd34d',
  },
  {
    id: 'comet',
    name: 'Комета',
    meaning: 'Мечты, желания и путешествия',
    accentColor: '#38bdf8',
  },
  {
    id: 'planet',
    name: 'Сияющая планета',
    meaning: 'Дружба, общий мир и воспоминания',
    accentColor: '#2dd4bf',
  },
];

export function getBuiltinIllustrationSvgString(
  id: BuiltinIllustrationId,
  size: number | string = 640,
): string {
  const wrap = (inner: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512" fill="none">${inner}</svg>`;

  switch (id) {
    case 'heart':
      return wrap(`
        <defs>
          <radialGradient id="h_aura" cx="50%" cy="48%" r="48%">
            <stop offset="0%" stop-color="#f472b6" stop-opacity="0.52"/>
            <stop offset="55%" stop-color="#c084fc" stop-opacity="0.18"/>
            <stop offset="100%" stop-color="#f472b6" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="h_body" x1="160" y1="120" x2="360" y2="410" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#fbcfe8"/>
            <stop offset="45%" stop-color="#f472b6"/>
            <stop offset="100%" stop-color="#a855f7"/>
          </linearGradient>
          <linearGradient id="h_rim" x1="120" y1="120" x2="390" y2="390" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#fff1f2"/>
            <stop offset="50%" stop-color="#f9a8d4"/>
            <stop offset="100%" stop-color="#fde68a"/>
          </linearGradient>
        </defs>
        <circle cx="256" cy="256" r="228" fill="url(#h_aura)"/>
        <circle cx="256" cy="256" r="188" stroke="#f9a8d4" stroke-opacity="0.32" stroke-width="2" stroke-dasharray="8 10"/>
        <path d="M256 408C256 408 104 316 104 202C104 146 148 106 198 106C228 106 247 122 256 138C265 122 284 106 314 106C364 106 408 146 408 202C408 316 256 408 256 408Z" fill="url(#h_body)" stroke="url(#h_rim)" stroke-width="6"/>
        <path d="M256 372C256 372 134 295 134 204C134 166 164 136 198 136C222 136 241 150 256 172C271 150 290 136 314 136C348 136 378 166 378 204C378 295 256 372 256 372Z" fill="#fff1f2" fill-opacity="0.16"/>
        <path d="M168 178C178 158 198 150 218 154" stroke="#ffffff" stroke-opacity="0.72" stroke-width="8" stroke-linecap="round"/>
        <path d="M256 218L266 242L290 252L266 262L256 286L246 262L222 252L246 242L256 218Z" fill="#fffbeb"/>
        <circle cx="136" cy="116" r="5" fill="#fde68a"/>
        <circle cx="386" cy="128" r="6" fill="#fbcfe8"/>
        <circle cx="372" cy="368" r="4" fill="#fde68a"/>
        <path d="M114 334L119 346L131 351L119 356L114 368L109 356L97 351L109 346L114 334Z" fill="#fde68a" fill-opacity="0.9"/>
      `);

    case 'flower':
      return wrap(`
        <defs>
          <radialGradient id="f_aura" cx="50%" cy="50%" r="48%">
            <stop offset="0%" stop-color="#c084fc" stop-opacity="0.5"/>
            <stop offset="60%" stop-color="#38bdf8" stop-opacity="0.16"/>
            <stop offset="100%" stop-color="#c084fc" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="f_petal" x1="256" y1="80" x2="256" y2="256" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#f5d0fe"/>
            <stop offset="55%" stop-color="#c084fc"/>
            <stop offset="100%" stop-color="#6366f1"/>
          </linearGradient>
          <radialGradient id="f_core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fffbeb"/>
            <stop offset="60%" stop-color="#fcd34d"/>
            <stop offset="100%" stop-color="#f59e0b"/>
          </radialGradient>
        </defs>
        <circle cx="256" cy="256" r="226" fill="url(#f_aura)"/>
        <circle cx="256" cy="256" r="192" stroke="#e9d5ff" stroke-opacity="0.28" stroke-width="2" stroke-dasharray="6 10"/>
        <g stroke="#f5d0fe" stroke-width="4" stroke-opacity="0.85">
          <path d="M256 76C288 122 296 196 256 256C216 196 224 122 256 76Z" fill="url(#f_petal)"/>
          <path d="M256 76C288 122 296 196 256 256C216 196 224 122 256 76Z" fill="url(#f_petal)" transform="rotate(60 256 256)"/>
          <path d="M256 76C288 122 296 196 256 256C216 196 224 122 256 76Z" fill="url(#f_petal)" transform="rotate(120 256 256)"/>
          <path d="M256 76C288 122 296 196 256 256C216 196 224 122 256 76Z" fill="url(#f_petal)" transform="rotate(180 256 256)"/>
          <path d="M256 76C288 122 296 196 256 256C216 196 224 122 256 76Z" fill="url(#f_petal)" transform="rotate(240 256 256)"/>
          <path d="M256 76C288 122 296 196 256 256C216 196 224 122 256 76Z" fill="url(#f_petal)" transform="rotate(300 256 256)"/>
        </g>
        <g stroke="#a5f3fc" stroke-width="3" stroke-opacity="0.6">
          <path d="M256 120C274 152 276 212 256 256C236 212 238 152 256 120Z" fill="#e0f2fe" fill-opacity="0.22" transform="rotate(30 256 256)"/>
          <path d="M256 120C274 152 276 212 256 256C236 212 238 152 256 120Z" fill="#e0f2fe" fill-opacity="0.22" transform="rotate(90 256 256)"/>
          <path d="M256 120C274 152 276 212 256 256C236 212 238 152 256 120Z" fill="#e0f2fe" fill-opacity="0.22" transform="rotate(150 256 256)"/>
          <path d="M256 120C274 152 276 212 256 256C236 212 238 152 256 120Z" fill="#e0f2fe" fill-opacity="0.22" transform="rotate(210 256 256)"/>
          <path d="M256 120C274 152 276 212 256 256C236 212 238 152 256 120Z" fill="#e0f2fe" fill-opacity="0.22" transform="rotate(270 256 256)"/>
          <path d="M256 120C274 152 276 212 256 256C236 212 238 152 256 120Z" fill="#e0f2fe" fill-opacity="0.22" transform="rotate(330 256 256)"/>
        </g>
        <circle cx="256" cy="256" r="42" fill="url(#f_core)" stroke="#fffbeb" stroke-width="5"/>
        <circle cx="122" cy="144" r="5" fill="#fde68a"/>
        <circle cx="394" cy="148" r="5" fill="#bae6fd"/>
        <circle cx="380" cy="382" r="6" fill="#f5d0fe"/>
      `);

    case 'moon':
      return wrap(`
        <defs>
          <radialGradient id="m_aura" cx="48%" cy="50%" r="48%">
            <stop offset="0%" stop-color="#fcd34d" stop-opacity="0.46"/>
            <stop offset="60%" stop-color="#818cf8" stop-opacity="0.16"/>
            <stop offset="100%" stop-color="#fcd34d" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="m_crescent" x1="130" y1="100" x2="360" y2="410" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#fffbeb"/>
            <stop offset="48%" stop-color="#fde68a"/>
            <stop offset="100%" stop-color="#f59e0b"/>
          </linearGradient>
        </defs>
        <circle cx="256" cy="256" r="224" fill="url(#m_aura)"/>
        <circle cx="268" cy="256" r="176" stroke="#fde68a" stroke-opacity="0.28" stroke-width="2" stroke-dasharray="5 9"/>
        <path d="M324 106C250 112 192 176 192 256C192 336 250 400 324 406C234 428 138 368 122 276C106 184 166 98 258 88C281 85 304 92 324 106Z" fill="url(#m_crescent)" stroke="#fffbeb" stroke-width="5" stroke-linejoin="round"/>
        <path d="M356 176L368 206L398 218L368 230L356 260L344 230L314 218L344 206L356 176Z" fill="#fffbeb" stroke="#fde68a" stroke-width="2"/>
        <path d="M312 296L319 312L335 319L319 326L312 342L305 326L289 319L305 312L312 296Z" fill="#bae6fd"/>
        <circle cx="218" cy="212" r="14" fill="#f59e0b" fill-opacity="0.24"/>
        <circle cx="172" cy="284" r="9" fill="#f59e0b" fill-opacity="0.24"/>
        <circle cx="360" cy="120" r="5" fill="#fde68a"/>
        <circle cx="394" cy="300" r="4" fill="#fffbeb"/>
      `);

    case 'comet':
      return wrap(`
        <defs>
          <radialGradient id="c_aura" cx="62%" cy="38%" r="50%">
            <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.52"/>
            <stop offset="55%" stop-color="#818cf8" stop-opacity="0.2"/>
            <stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="c_tail" x1="360" y1="152" x2="96" y2="416" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#e0f2fe" stop-opacity="0.95"/>
            <stop offset="45%" stop-color="#38bdf8" stop-opacity="0.72"/>
            <stop offset="100%" stop-color="#818cf8" stop-opacity="0"/>
          </linearGradient>
          <linearGradient id="c_tail2" x1="340" y1="184" x2="128" y2="412" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#fde68a" stop-opacity="0.85"/>
            <stop offset="55%" stop-color="#f472b6" stop-opacity="0.4"/>
            <stop offset="100%" stop-color="#818cf8" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <circle cx="268" cy="244" r="220" fill="url(#c_aura)"/>
        <path d="M358 142C312 152 178 262 84 398C158 342 278 248 370 184L358 142Z" fill="url(#c_tail)"/>
        <path d="M366 178C324 198 214 294 128 416C198 358 308 268 384 204L366 178Z" fill="url(#c_tail2)"/>
        <path d="M342 126C282 154 202 222 132 298" stroke="#bae6fd" stroke-width="4" stroke-linecap="round" stroke-opacity="0.65"/>
        <circle cx="358" cy="162" r="56" fill="#38bdf8" fill-opacity="0.35"/>
        <path d="M358 88L376 144L432 162L376 180L358 236L340 180L284 162L340 144L358 88Z" fill="#fffbeb" stroke="#bae6fd" stroke-width="4" stroke-linejoin="round"/>
        <circle cx="358" cy="162" r="22" fill="#ffffff"/>
        <circle cx="212" cy="172" r="5" fill="#fde68a"/>
        <circle cx="284" cy="336" r="6" fill="#bae6fd"/>
        <circle cx="148" cy="248" r="4" fill="#f9a8d4"/>
      `);

    case 'planet':
      return wrap(`
        <defs>
          <radialGradient id="p_aura" cx="50%" cy="50%" r="48%">
            <stop offset="0%" stop-color="#2dd4bf" stop-opacity="0.46"/>
            <stop offset="60%" stop-color="#6366f1" stop-opacity="0.18"/>
            <stop offset="100%" stop-color="#2dd4bf" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="p_sphere" cx="38%" cy="34%" r="65%">
            <stop offset="0%" stop-color="#ccfbf1"/>
            <stop offset="40%" stop-color="#2dd4bf"/>
            <stop offset="80%" stop-color="#3b82f6"/>
            <stop offset="100%" stop-color="#312e81"/>
          </radialGradient>
          <linearGradient id="p_ring" x1="80" y1="316" x2="432" y2="196" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#fde68a" stop-opacity="0.85"/>
            <stop offset="50%" stop-color="#f9a8d4" stop-opacity="0.9"/>
            <stop offset="100%" stop-color="#7dd3fc" stop-opacity="0.85"/>
          </linearGradient>
        </defs>
        <circle cx="256" cy="256" r="224" fill="url(#p_aura)"/>
        <ellipse cx="256" cy="256" rx="194" ry="56" transform="rotate(-22 256 256)" stroke="url(#p_ring)" stroke-width="14" stroke-opacity="0.42"/>
        <circle cx="256" cy="256" r="106" fill="url(#p_sphere)" stroke="#99f6e4" stroke-width="4"/>
        <path d="M174 226C210 210 264 218 326 204" stroke="#ffffff" stroke-opacity="0.28" stroke-width="10" stroke-linecap="round"/>
        <path d="M168 272C218 258 286 266 346 248" stroke="#ccfbf1" stroke-opacity="0.22" stroke-width="8" stroke-linecap="round"/>
        <path d="M84 326C116 356 208 338 302 300C396 262 444 206 424 176" stroke="url(#p_ring)" stroke-width="16" stroke-linecap="round"/>
        <path d="M116 322C154 336 226 320 296 292C366 264 406 222 406 196" stroke="#fffbeb" stroke-opacity="0.65" stroke-width="3" stroke-linecap="round"/>
        <path d="M396 112L403 130L421 137L403 144L396 162L389 144L371 137L389 130L396 112Z" fill="#fde68a"/>
        <circle cx="122" cy="144" r="6" fill="#99f6e4"/>
        <circle cx="384" cy="378" r="5" fill="#fbcfe8"/>
      `);
  }
}

export function BuiltinIllustration({
  id,
  className = 'w-full h-full',
}: {
  id: BuiltinIllustrationId;
  className?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const rawSvg = getBuiltinIllustrationSvgString(id, '100%');
  const scopedSvg = rawSvg
    .replace(/id="([a-z]+_[a-z0-9]+)"/g, `id="$1_${uid}"`)
    .replace(/url\(#([a-z]+_[a-z0-9]+)\)/g, `url(#$1_${uid})`);

  return (
    <div
      className={`${className} overflow-hidden flex items-center justify-center`}
      aria-label={BUILTIN_ILLUSTRATIONS.find((i) => i.id === id)?.name ?? id}
      dangerouslySetInnerHTML={{ __html: scopedSvg }}
    />
  );
}

/**
 * Renders one of the 5 built-in illustrations onto an offscreen canvas (640x640 transparent)
 * and encodes it as WebP (or PNG fallback) Blob for the offline ZIP export.
 */
export async function renderBuiltinIllustrationToBlob(
  id: BuiltinIllustrationId,
  size = 640,
): Promise<{ blob: Blob; ext: 'webp' | 'png' }> {
  const svg = getBuiltinIllustrationSvgString(id, size);
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(`Failed to load built-in illustration: ${id}`));
      el.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);

    const webpBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.9),
    );
    if (webpBlob && webpBlob.type === 'image/webp') {
      return { blob: webpBlob, ext: 'webp' };
    }

    const pngBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png'),
    );
    if (!pngBlob) throw new Error('Failed to encode built-in illustration');
    return { blob: pngBlob, ext: 'png' };
  } finally {
    URL.revokeObjectURL(url);
  }
}
