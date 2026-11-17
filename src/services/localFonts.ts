import type JSZip from 'jszip';
import type { MessageFontId } from '../types/project';

import caveatCyr400 from '@fontsource/caveat/files/caveat-cyrillic-400-normal.woff2?url';
import caveatCyr600 from '@fontsource/caveat/files/caveat-cyrillic-600-normal.woff2?url';
import caveatLat400 from '@fontsource/caveat/files/caveat-latin-400-normal.woff2?url';
import caveatLat600 from '@fontsource/caveat/files/caveat-latin-600-normal.woff2?url';

import cormorantCyr400 from '@fontsource/cormorant-garamond/files/cormorant-garamond-cyrillic-400-normal.woff2?url';
import cormorantCyr600 from '@fontsource/cormorant-garamond/files/cormorant-garamond-cyrillic-600-normal.woff2?url';
import cormorantLat400 from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff2?url';
import cormorantLat600 from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff2?url';

import loraCyr400 from '@fontsource/lora/files/lora-cyrillic-400-normal.woff2?url';
import loraCyr600 from '@fontsource/lora/files/lora-cyrillic-600-normal.woff2?url';
import loraLat400 from '@fontsource/lora/files/lora-latin-400-normal.woff2?url';
import loraLat600 from '@fontsource/lora/files/lora-latin-600-normal.woff2?url';

import comfortaaCyr400 from '@fontsource/comfortaa/files/comfortaa-cyrillic-400-normal.woff2?url';
import comfortaaCyr600 from '@fontsource/comfortaa/files/comfortaa-cyrillic-600-normal.woff2?url';
import comfortaaLat400 from '@fontsource/comfortaa/files/comfortaa-latin-400-normal.woff2?url';
import comfortaaLat600 from '@fontsource/comfortaa/files/comfortaa-latin-600-normal.woff2?url';

import manropeCyr400 from '@fontsource/manrope/files/manrope-cyrillic-400-normal.woff2?url';
import manropeCyr600 from '@fontsource/manrope/files/manrope-cyrillic-600-normal.woff2?url';
import manropeLat400 from '@fontsource/manrope/files/manrope-latin-400-normal.woff2?url';
import manropeLat600 from '@fontsource/manrope/files/manrope-latin-600-normal.woff2?url';

interface FontFaceAssetSpec {
  family: string;
  weight: number;
  unicodeRange: string;
  url: string;
  fileName: string;
}

const CYRILLIC_RANGE = 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116';
const LATIN_RANGE = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';

const FONT_ASSET_SPECS: Record<MessageFontId, FontFaceAssetSpec[]> = {
  caveat: [
    { family: 'Caveat', weight: 400, unicodeRange: CYRILLIC_RANGE, url: caveatCyr400, fileName: 'caveat-cyrillic-400.woff2' },
    { family: 'Caveat', weight: 600, unicodeRange: CYRILLIC_RANGE, url: caveatCyr600, fileName: 'caveat-cyrillic-600.woff2' },
    { family: 'Caveat', weight: 400, unicodeRange: LATIN_RANGE, url: caveatLat400, fileName: 'caveat-latin-400.woff2' },
    { family: 'Caveat', weight: 600, unicodeRange: LATIN_RANGE, url: caveatLat600, fileName: 'caveat-latin-600.woff2' },
  ],
  cormorant: [
    { family: 'Cormorant Garamond', weight: 400, unicodeRange: CYRILLIC_RANGE, url: cormorantCyr400, fileName: 'cormorant-cyrillic-400.woff2' },
    { family: 'Cormorant Garamond', weight: 600, unicodeRange: CYRILLIC_RANGE, url: cormorantCyr600, fileName: 'cormorant-cyrillic-600.woff2' },
    { family: 'Cormorant Garamond', weight: 400, unicodeRange: LATIN_RANGE, url: cormorantLat400, fileName: 'cormorant-latin-400.woff2' },
    { family: 'Cormorant Garamond', weight: 600, unicodeRange: LATIN_RANGE, url: cormorantLat600, fileName: 'cormorant-latin-600.woff2' },
  ],
  lora: [
    { family: 'Lora', weight: 400, unicodeRange: CYRILLIC_RANGE, url: loraCyr400, fileName: 'lora-cyrillic-400.woff2' },
    { family: 'Lora', weight: 600, unicodeRange: CYRILLIC_RANGE, url: loraCyr600, fileName: 'lora-cyrillic-600.woff2' },
    { family: 'Lora', weight: 400, unicodeRange: LATIN_RANGE, url: loraLat400, fileName: 'lora-latin-400.woff2' },
    { family: 'Lora', weight: 600, unicodeRange: LATIN_RANGE, url: loraLat600, fileName: 'lora-latin-600.woff2' },
  ],
  comfortaa: [
    { family: 'Comfortaa', weight: 400, unicodeRange: CYRILLIC_RANGE, url: comfortaaCyr400, fileName: 'comfortaa-cyrillic-400.woff2' },
    { family: 'Comfortaa', weight: 600, unicodeRange: CYRILLIC_RANGE, url: comfortaaCyr600, fileName: 'comfortaa-cyrillic-600.woff2' },
    { family: 'Comfortaa', weight: 400, unicodeRange: LATIN_RANGE, url: comfortaaLat400, fileName: 'comfortaa-latin-400.woff2' },
    { family: 'Comfortaa', weight: 600, unicodeRange: LATIN_RANGE, url: comfortaaLat600, fileName: 'comfortaa-latin-600.woff2' },
  ],
  manrope: [
    { family: 'Manrope', weight: 400, unicodeRange: CYRILLIC_RANGE, url: manropeCyr400, fileName: 'manrope-cyrillic-400.woff2' },
    { family: 'Manrope', weight: 600, unicodeRange: CYRILLIC_RANGE, url: manropeCyr600, fileName: 'manrope-cyrillic-600.woff2' },
    { family: 'Manrope', weight: 400, unicodeRange: LATIN_RANGE, url: manropeLat400, fileName: 'manrope-latin-400.woff2' },
    { family: 'Manrope', weight: 600, unicodeRange: LATIN_RANGE, url: manropeLat600, fileName: 'manrope-latin-600.woff2' },
  ],
};

/**
 * Bundles local WOFF2 font files into the exported ZIP archive and returns offline @font-face CSS.
 */
export async function bundleFontsForZip(
  assetsFolder: JSZip,
  fontIds: Iterable<MessageFontId>,
): Promise<string> {
  const uniqueIds = Array.from(new Set(fontIds));
  if (uniqueIds.length === 0) return '';

  const fontsFolder = assetsFolder.folder('fonts');
  if (!fontsFolder) return '';

  const cssRules: string[] = [];

  for (const fontId of uniqueIds) {
    const specs = FONT_ASSET_SPECS[fontId];
    if (!specs) continue;

    for (const spec of specs) {
      try {
        const res = await fetch(spec.url);
        if (!res.ok) continue;
        const buf = await res.arrayBuffer();
        fontsFolder.file(spec.fileName, buf);
        cssRules.push(
          `@font-face { font-family: '${spec.family}'; font-style: normal; font-weight: ${spec.weight}; font-display: swap; src: url('assets/fonts/${spec.fileName}') format('woff2'); unicode-range: ${spec.unicodeRange}; }`,
        );
      } catch {
        // Resilient fallback to system stack if fetch is unavailable
      }
    }
  }

  return cssRules.join('\n  ');
}
