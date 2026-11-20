import type {
  ConstellationProject,
  DeviceLayoutKey,
  EnvelopeMotifId,
  EnvelopeSettings,
  EnvelopeShapeId,
} from '../../types/project';
import type { CosmicPaletteConfig, GlowColorConfig } from './palettes';
import { HEX_COLOR_RE } from './textStyles';

export interface EnvelopeShapeMeta {
  id: EnvelopeShapeId;
  name: string;
  description: string;
}

export const ENVELOPE_SHAPES: EnvelopeShapeMeta[] = [
  {
    id: 'classic',
    name: 'Классический',
    description: 'Треугольный клапан и строгий вырез',
  },
  {
    id: 'rounded',
    name: 'Арочный',
    description: 'Мягкие углы и волнистый клапан',
  },
];

export const VALID_ENVELOPE_SHAPES = new Set<EnvelopeShapeId>(
  ENVELOPE_SHAPES.map((s) => s.id),
);

export interface EnvelopeMotifMeta {
  id: EnvelopeMotifId;
  name: string;
}

export const ENVELOPE_MOTIFS: EnvelopeMotifMeta[] = [
  { id: 'none', name: 'Без рисунка' },
  { id: 'heart', name: 'Сердечко' },
  { id: 'stars', name: 'Созвездие' },
  { id: 'moon', name: 'Полумесяц' },
  { id: 'flower', name: 'Цветок' },
  { id: 'butterfly', name: 'Бабочка' },
];

export const VALID_ENVELOPE_MOTIFS = new Set<EnvelopeMotifId>(
  ENVELOPE_MOTIFS.map((m) => m.id),
);

export const ENVELOPE_COLOR_SWATCHES: Array<{ hex: string; name: string }> = [
  { hex: '#E4DFF8', name: 'Жемчужный шёлк' },
  { hex: '#E8D8BF', name: 'Тёплый кремовый' },
  { hex: '#E8BFD1', name: 'Пудровый румянец' },
  { hex: '#B9D1F2', name: 'Небесный сатин' },
  { hex: '#8B72D6', name: 'Королевская сирень' },
  { hex: '#2D7A8A', name: 'Изумрудная бирюза' },
  { hex: '#A63A64', name: 'Бордовый бархат' },
];

export const SEAL_COLOR_SWATCHES: Array<{ hex: string; name: string }> = [
  { hex: '#D97706', name: 'Янтарное золото' },
  { hex: '#E11D48', name: 'Рубиновый сургуч' },
  { hex: '#7C3AED', name: 'Аметистовый воск' },
  { hex: '#0284C7', name: 'Сапфировый лёд' },
  { hex: '#059669', name: 'Изумрудный кристалл' },
  { hex: '#F9A8D4', name: 'Розовый кварц' },
];

export const DEFAULT_ENVELOPE_TEXTS = {
  kickerPrefix: 'Для',
  fallbackKicker: 'Тебе звёздное письмо',
  headlineSuffix: 'тебя ждёт особенное созвездие',
  fallbackHeadline: 'Тебя ждёт космическое поздравление',
  hintText: 'Коснись конверта или нажми кнопку ниже',
  ctaText: 'Открыть созвездие',
};

export const ENVELOPE_WORLD_W = 3.14;
export const ENVELOPE_WORLD_H = 2.08;
/** Vertical world span at z=0 from envelope camera (z=5.2, fov=48deg) */
export const ENVELOPE_VISIBLE_WORLD_H = 2 * 5.2 * Math.tan((48 * Math.PI) / 360);
export const ENVELOPE_MIN_SCALE = 0.55;
export const ENVELOPE_MAX_SCALE = 1.35;
export const ENVELOPE_TEXT_OFFSET_MIN = -20;
export const ENVELOPE_TEXT_OFFSET_MAX = 100;
export const ENVELOPE_FOOTER_OFFSET_MIN = -100;
export const ENVELOPE_FOOTER_OFFSET_MAX = 20;
export const ENVELOPE_OFFSET_MIN = -100;
export const ENVELOPE_OFFSET_MAX = 100;
export const ENVELOPE_GLOW_MIN = 0;
export const ENVELOPE_GLOW_MAX = 1.5;
export const ENVELOPE_GLOW_DEFAULT = 1;

function parseHexRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return [0.5, 0.5, 0.6];
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return [
    Number.isFinite(r) ? r : 0.5,
    Number.isFinite(g) ? g : 0.5,
    Number.isFinite(b) ? b : 0.6,
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clampByte = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v * 255)))
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
  return `#${clampByte(r)}${clampByte(g)}${clampByte(b)}`;
}

export function mixHexColors(hexA: string, hexB: string, t: number): string {
  const ratio = Math.max(0, Math.min(1, t));
  const [r1, g1, b1] = parseHexRgb(hexA);
  const [r2, g2, b2] = parseHexRgb(hexB);
  return rgbToHex(
    r1 + (r2 - r1) * ratio,
    g1 + (g2 - g1) * ratio,
    b1 + (b2 - b1) * ratio,
  );
}

export function getHexLuminance(hex: string): number {
  const [r, g, b] = parseHexRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function hexWithAlpha(hex: string, alpha: number): string {
  const [r, g, b] = parseHexRgb(hex);
  const clamped = Math.max(0, Math.min(1, Number.isFinite(alpha) ? alpha : 1));
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${Number(
    clamped.toFixed(3),
  )})`;
}

export interface ResolvedEnvelopePaletteColors {
  bodyHex: string;
  pocketHex: string;
  flapHex: string;
  borderHex: string;
  emissiveHex: string;
  emissiveIntensity: number;
  motifInkHex: string;
  isLightBody: boolean;
}

export function resolveEnvelopePaletteColors(
  envelopeColor: string | undefined,
  palette: Pick<CosmicPaletteConfig, 'midColor' | 'nebulaPrimary' | 'dustTint' | 'lineTint'>,
): ResolvedEnvelopePaletteColors {
  if (envelopeColor && HEX_COLOR_RE.test(envelopeColor)) {
    const clean = envelopeColor.toUpperCase();
    const lum = getHexLuminance(clean);
    if (lum >= 0.40) {
      const [r, g, b] = parseHexRgb(clean);
      const isWarmSand = r - b > 0.11;
      const isBlushPink = !isWarmSand && r - g > 0.08;
      const shadowTarget = isWarmSand ? '#6B5344' : isBlushPink ? '#634358' : '#4C436E';
      const deepShadowTarget = isWarmSand ? '#38251C' : isBlushPink ? '#3B1E2E' : '#20143D';
      // Calibrate light paper albedos safely below bloom threshold (1.04) under 3D key light
      const bodyTone =
        lum > 0.72
          ? mixHexColors(clean, shadowTarget, 0.32)
          : mixHexColors(clean, shadowTarget, 0.18);
      return {
        bodyHex: bodyTone,
        pocketHex: mixHexColors(bodyTone, deepShadowTarget, 0.28),
        flapHex: mixHexColors(bodyTone, deepShadowTarget, 0.14),
        borderHex: mixHexColors(clean, deepShadowTarget, 0.62),
        emissiveHex: '#000000',
        emissiveIntensity: 0,
        motifInkHex: mixHexColors(clean, deepShadowTarget, 0.76),
        isLightBody: true,
      };
    }

    const safeBody = lum < 0.06 ? mixHexColors(clean, palette.lineTint, 0.28) : clean;
    return {
      bodyHex: safeBody,
      pocketHex: mixHexColors(safeBody, '#0B0616', 0.24),
      flapHex: mixHexColors(safeBody, '#FFFFFF', 0.16),
      borderHex: mixHexColors(safeBody, '#FFFFFF', 0.56),
      emissiveHex: safeBody,
      emissiveIntensity: 0.14,
      motifInkHex: '#FFF5D6',
      isLightBody: false,
    };
  }

  return {
    bodyHex: mixHexColors(palette.midColor, palette.lineTint, 0.56),
    pocketHex: mixHexColors(palette.midColor, palette.nebulaPrimary, 0.36),
    flapHex: mixHexColors(palette.midColor, palette.dustTint, 0.72),
    borderHex: palette.dustTint,
    emissiveHex: palette.nebulaPrimary,
    emissiveIntensity: 0.22,
    motifInkHex: '#FFFBEB',
    isLightBody: false,
  };
}

export interface ResolvedSealPaletteColors {
  discHex: string;
  rimHex: string;
  starHex: string;
  starEmissiveHex: string;
  haloHex: string;
  discEmissiveIntensity: number;
  starEmissiveIntensity: number;
  isLightDisc: boolean;
}

export function resolveSealPaletteColors(
  sealColor: string | undefined,
  glow: Pick<GlowColorConfig, 'hex' | 'coreHex' | 'haloHex'>,
): ResolvedSealPaletteColors {
  if (sealColor && HEX_COLOR_RE.test(sealColor)) {
    const clean = sealColor.toUpperCase();
    const lum = getHexLuminance(clean);
    if (lum >= 0.44) {
      const [r, g, b] = parseHexRgb(clean);
      const isWarmLight = r > b + 0.16 && g > 0.42;
      const starContrast = isWarmLight ? '#5C240E' : '#241447';
      return {
        discHex: clean,
        rimHex: mixHexColors(clean, starContrast, 0.45),
        starHex: starContrast,
        starEmissiveHex: starContrast,
        haloHex: clean,
        discEmissiveIntensity: 0.14,
        starEmissiveIntensity: 0.1,
        isLightDisc: true,
      };
    }

    return {
      discHex: clean,
      rimHex: mixHexColors(clean, '#FFFBEB', 0.52),
      starHex: '#FFFDF5',
      starEmissiveHex: mixHexColors(clean, '#FFFFFF', 0.72),
      haloHex: mixHexColors(clean, '#FFFFFF', 0.28),
      discEmissiveIntensity: 0.12,
      starEmissiveIntensity: 0.62,
      isLightDisc: false,
    };
  }

  return {
    discHex: mixHexColors(glow.haloHex, '#1A1033', 0.18),
    rimHex: '#FDE68A',
    starHex: glow.coreHex,
    starEmissiveHex: glow.hex,
    haloHex: glow.hex,
    discEmissiveIntensity: 0.15,
    starEmissiveIntensity: 0.65,
    isLightDisc: false,
  };
}

export function clampEnvelopeScale(val: unknown): number | undefined {
  if (typeof val !== 'number' || !Number.isFinite(val)) return undefined;
  return Math.max(ENVELOPE_MIN_SCALE, Math.min(ENVELOPE_MAX_SCALE, Number(val.toFixed(2))));
}

export function clampEnvelopeTextOffsetY(val: unknown): number | undefined {
  if (typeof val !== 'number' || !Number.isFinite(val)) return undefined;
  return Math.max(
    ENVELOPE_TEXT_OFFSET_MIN,
    Math.min(ENVELOPE_TEXT_OFFSET_MAX, Math.round(val)),
  );
}

export function clampEnvelopeOffsetY(val: unknown): number | undefined {
  if (typeof val !== 'number' || !Number.isFinite(val)) return undefined;
  return Math.max(ENVELOPE_OFFSET_MIN, Math.min(ENVELOPE_OFFSET_MAX, Math.round(val)));
}

export function clampEnvelopeFooterOffsetY(val: unknown): number | undefined {
  if (typeof val !== 'number' || !Number.isFinite(val)) return undefined;
  return Math.max(
    ENVELOPE_FOOTER_OFFSET_MIN,
    Math.min(ENVELOPE_FOOTER_OFFSET_MAX, Math.round(val)),
  );
}

export function clampEnvelopeGlowIntensity(val: unknown): number | undefined {
  if (typeof val !== 'number' || !Number.isFinite(val)) return undefined;
  return Math.max(
    ENVELOPE_GLOW_MIN,
    Math.min(ENVELOPE_GLOW_MAX, Number(val.toFixed(2))),
  );
}

export function resolveEnvelopeGlowIntensity(
  settings?: EnvelopeSettings | null,
): number {
  return clampEnvelopeGlowIntensity(settings?.glowIntensity) ?? ENVELOPE_GLOW_DEFAULT;
}

export interface ResolvedEnvelopeGlowFactors {
  glowIntensity: number;
  albedoScale: number;
  bodyEmissiveIntensity: number;
  pocketEmissiveIntensity: number;
  flapEmissiveIntensity: number;
  bodyEnvMapIntensity: number;
  pocketEnvMapIntensity: number;
  flapEnvMapIntensity: number;
  bodyClearcoat: number;
  sealDiscEmissive: number;
  sealRimEmissive: number;
  sealStarEmissive: number;
  sealHaloOpacityBase: number;
  sealHaloHoverOpacity: number;
  ambientBackdropAlpha: number;
  fallbackGlowAlpha: number;
  sealShadowHaloAlpha: number;
}

export function resolveEnvelopeGlowFactors(
  glowIntensity: number | undefined,
  envColors: Pick<ResolvedEnvelopePaletteColors, 'emissiveIntensity' | 'isLightBody'>,
  sealColors: Pick<
    ResolvedSealPaletteColors,
    'discEmissiveIntensity' | 'starEmissiveIntensity'
  >,
): ResolvedEnvelopeGlowFactors {
  const g = clampEnvelopeGlowIntensity(glowIntensity) ?? ENVELOPE_GLOW_DEFAULT;
  const light = envColors.isLightBody;
  const dimFactor = g < 1 ? g : 1;
  const boostFactor = g > 1 ? g - 1 : 0;

  const albedoScale =
    g < 1
      ? Number(((light ? 0.68 : 0.80) + (light ? 0.32 : 0.20) * dimFactor).toFixed(3))
      : Number((1 + boostFactor * (light ? 0.14 : 0.22)).toFixed(3));

  const baseBodyEmissive = envColors.emissiveIntensity;
  const bodyEmissiveIntensity = light
    ? Number((boostFactor * 0.10).toFixed(3))
    : Number((baseBodyEmissive * g).toFixed(3));

  const bodyEnvBase = light ? 0.14 : 0.56;
  const pocketEnvBase = light ? 0.12 : 0.54;
  const envMult =
    g < 1
      ? 0.32 + 0.68 * dimFactor
      : 1 + boostFactor * 0.45;

  const sealScale = g < 1 ? dimFactor : 1 + boostFactor * 0.7;

  return {
    glowIntensity: g,
    albedoScale,
    bodyEmissiveIntensity,
    pocketEmissiveIntensity: Number((bodyEmissiveIntensity * 0.72).toFixed(3)),
    flapEmissiveIntensity: Number((bodyEmissiveIntensity * 0.9).toFixed(3)),
    bodyEnvMapIntensity: Number((bodyEnvBase * envMult).toFixed(3)),
    pocketEnvMapIntensity: Number((pocketEnvBase * envMult).toFixed(3)),
    flapEnvMapIntensity: Number((bodyEnvBase * envMult).toFixed(3)),
    bodyClearcoat: light
      ? Number((boostFactor * 0.08).toFixed(3))
      : Number((0.22 * (0.25 + 0.75 * dimFactor + boostFactor * 0.25)).toFixed(3)),
    sealDiscEmissive: Number((sealColors.discEmissiveIntensity * sealScale).toFixed(3)),
    sealRimEmissive: Number((0.20 * sealScale).toFixed(3)),
    sealStarEmissive: Number((sealColors.starEmissiveIntensity * sealScale).toFixed(3)),
    sealHaloOpacityBase: Number(Math.min(0.82, 0.42 * g).toFixed(3)),
    sealHaloHoverOpacity: Number(Math.min(0.92, 0.62 * g).toFixed(3)),
    ambientBackdropAlpha: 0,
    fallbackGlowAlpha: Number(Math.min(0.32, 0.18 * g).toFixed(3)),
    sealShadowHaloAlpha: Number(Math.min(0.85, 0.53 * g).toFixed(3)),
  };
}

export function resolveEnvelopeShape(settings?: EnvelopeSettings | null): EnvelopeShapeId {
  if (settings?.shape === 'rounded') {
    return 'rounded';
  }
  return 'classic';
}

export function resolveEnvelopeMotif(settings?: EnvelopeSettings | null): EnvelopeMotifId {
  if (settings?.motif && VALID_ENVELOPE_MOTIFS.has(settings.motif)) {
    return settings.motif;
  }
  return 'none';
}

export function resolveEnvelopeUserScale(
  settings: EnvelopeSettings | undefined,
  device: DeviceLayoutKey,
): number {
  const raw =
    device === 'phone'
      ? settings?.phoneScale ?? settings?.scale
      : settings?.desktopScale ?? settings?.scale;
  return clampEnvelopeScale(raw) ?? 1;
}

export function resolveEnvelopeTextOffsetY(
  settings: EnvelopeSettings | undefined,
  device: DeviceLayoutKey,
): number {
  const raw =
    device === 'phone'
      ? settings?.phoneTextOffsetY ?? settings?.textOffsetY
      : settings?.desktopTextOffsetY ?? settings?.textOffsetY;
  return clampEnvelopeTextOffsetY(raw) ?? 0;
}

export function resolveEnvelopeOffsetY(
  settings: EnvelopeSettings | undefined,
  device: DeviceLayoutKey,
): number {
  const raw =
    device === 'phone'
      ? settings?.phoneOffsetY ?? settings?.offsetY
      : settings?.desktopOffsetY ?? settings?.offsetY;
  return clampEnvelopeOffsetY(raw) ?? 0;
}

export function resolveEnvelopeFooterOffsetY(
  settings: EnvelopeSettings | undefined,
  device: DeviceLayoutKey,
): number {
  const raw =
    device === 'phone'
      ? settings?.phoneFooterOffsetY ?? settings?.footerOffsetY
      : settings?.desktopFooterOffsetY ?? settings?.footerOffsetY;
  return clampEnvelopeFooterOffsetY(raw) ?? 0;
}

export function computeEnvelopeTextTranslateYPx(
  textOffsetY: number,
  viewportHeight: number,
  isPortrait: boolean,
): number {
  const h = Math.max(320, viewportHeight);
  if (textOffsetY >= 0) {
    const maxDownFrac = isPortrait ? 0.25 : 0.14;
    return Math.round((textOffsetY / 100) * h * maxDownFrac);
  }
  const maxUpFrac = isPortrait ? 0.018 : 0.025;
  return Math.round((textOffsetY / 20) * h * maxUpFrac);
}

export function computeEnvelopeFooterTranslateYPx(
  footerOffsetY: number,
  viewportHeight: number,
  isPortrait: boolean,
): number {
  const h = Math.max(320, viewportHeight);
  if (footerOffsetY <= 0) {
    const maxUpFrac = isPortrait ? 0.25 : 0.16;
    return Math.round((footerOffsetY / 100) * h * maxUpFrac);
  }
  const maxDownFrac = isPortrait ? 0.018 : 0.022;
  return Math.round((footerOffsetY / 20) * h * maxDownFrac);
}

export function computeEnvelopeWorldOffsetY(
  offsetY: number,
  aspect: number,
): number {
  const isPortrait = aspect < 1;
  const maxFrac = isPortrait ? 0.16 : 0.11;
  // Positive offsetY = lower on screen = negative Three.js world Y
  return -(offsetY / 100) * ENVELOPE_VISIBLE_WORLD_H * maxFrac;
}

export function computeEnvelopeScreenOffsetYPx(
  offsetY: number,
  viewportWidth: number,
  viewportHeight: number,
): number {
  const aspect = Math.max(0.25, viewportWidth / Math.max(1, viewportHeight));
  const worldY = computeEnvelopeWorldOffsetY(offsetY, aspect);
  const pxPerUnit = Math.max(1, viewportHeight) / ENVELOPE_VISIBLE_WORLD_H;
  return Math.round(-worldY * pxPerUnit);
}

export function computeEnvelopeBaseFitScale(aspect: number): number {
  const safeAspect = Math.max(0.25, aspect);
  const visW = ENVELOPE_VISIBLE_WORLD_H * safeAspect;
  const maxByW = (visW * 0.74) / ENVELOPE_WORLD_W;
  const maxByH = (ENVELOPE_VISIBLE_WORLD_H * 0.44) / ENVELOPE_WORLD_H;
  return Math.min(0.9, maxByW, maxByH);
}

export function resolveEnvelopeEffectiveWorldScale(
  settings: EnvelopeSettings | undefined,
  aspect: number,
  device: DeviceLayoutKey,
): number {
  const safeAspect = Math.max(0.25, aspect);
  const visW = ENVELOPE_VISIBLE_WORLD_H * safeAspect;
  const maxWidthSafeScale = (visW * 0.91) / ENVELOPE_WORLD_W;
  const baseFit = computeEnvelopeBaseFitScale(safeAspect);
  const userScale = resolveEnvelopeUserScale(settings, device);
  return Math.min(maxWidthSafeScale, Math.max(0.22, baseFit * userScale));
}

export function sanitizeEnvelopeSettings(
  raw?: EnvelopeSettings,
): EnvelopeSettings | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const clean: EnvelopeSettings = {};
  if (typeof raw.kickerText === 'string' && raw.kickerText.trim()) {
    clean.kickerText = raw.kickerText.trim().slice(0, 80);
  }
  if (typeof raw.headlineText === 'string' && raw.headlineText.trim()) {
    clean.headlineText = raw.headlineText.trim().slice(0, 120);
  }
  if (typeof raw.hintText === 'string' && raw.hintText.trim()) {
    clean.hintText = raw.hintText.trim().slice(0, 120);
  }
  if (typeof raw.ctaText === 'string' && raw.ctaText.trim()) {
    clean.ctaText = raw.ctaText.trim().slice(0, 50);
  }
  if (typeof raw.envelopeColor === 'string' && HEX_COLOR_RE.test(raw.envelopeColor)) {
    clean.envelopeColor = raw.envelopeColor.toUpperCase();
  }
  if (typeof raw.sealColor === 'string' && HEX_COLOR_RE.test(raw.sealColor)) {
    clean.sealColor = raw.sealColor.toUpperCase();
  }
  if (raw.shape && VALID_ENVELOPE_SHAPES.has(raw.shape) && raw.shape !== 'classic') {
    clean.shape = raw.shape;
  }
  if (raw.motif && VALID_ENVELOPE_MOTIFS.has(raw.motif) && raw.motif !== 'none') {
    clean.motif = raw.motif;
  }
  const cleanGlow = clampEnvelopeGlowIntensity(raw.glowIntensity);
  if (cleanGlow !== undefined && cleanGlow !== ENVELOPE_GLOW_DEFAULT) {
    clean.glowIntensity = cleanGlow;
  }
  const cleanScale = clampEnvelopeScale(raw.scale);
  if (cleanScale !== undefined && cleanScale !== 1) {
    clean.scale = cleanScale;
  }
  const cleanPhoneScale = clampEnvelopeScale(raw.phoneScale);
  if (cleanPhoneScale !== undefined && cleanPhoneScale !== 1) {
    clean.phoneScale = cleanPhoneScale;
  }
  const cleanDesktopScale = clampEnvelopeScale(raw.desktopScale);
  if (cleanDesktopScale !== undefined && cleanDesktopScale !== 1) {
    clean.desktopScale = cleanDesktopScale;
  }
  const cleanTextOffsetY = clampEnvelopeTextOffsetY(raw.textOffsetY);
  if (cleanTextOffsetY !== undefined && cleanTextOffsetY !== 0) {
    clean.textOffsetY = cleanTextOffsetY;
  }
  const cleanPhoneTextOffsetY = clampEnvelopeTextOffsetY(raw.phoneTextOffsetY);
  if (cleanPhoneTextOffsetY !== undefined && cleanPhoneTextOffsetY !== 0) {
    clean.phoneTextOffsetY = cleanPhoneTextOffsetY;
  }
  const cleanDesktopTextOffsetY = clampEnvelopeTextOffsetY(raw.desktopTextOffsetY);
  if (cleanDesktopTextOffsetY !== undefined && cleanDesktopTextOffsetY !== 0) {
    clean.desktopTextOffsetY = cleanDesktopTextOffsetY;
  }
  const cleanFooterOffsetY = clampEnvelopeFooterOffsetY(raw.footerOffsetY);
  if (cleanFooterOffsetY !== undefined && cleanFooterOffsetY !== 0) {
    clean.footerOffsetY = cleanFooterOffsetY;
  }
  const cleanPhoneFooterOffsetY = clampEnvelopeFooterOffsetY(raw.phoneFooterOffsetY);
  if (cleanPhoneFooterOffsetY !== undefined && cleanPhoneFooterOffsetY !== 0) {
    clean.phoneFooterOffsetY = cleanPhoneFooterOffsetY;
  }
  const cleanDesktopFooterOffsetY = clampEnvelopeFooterOffsetY(raw.desktopFooterOffsetY);
  if (cleanDesktopFooterOffsetY !== undefined && cleanDesktopFooterOffsetY !== 0) {
    clean.desktopFooterOffsetY = cleanDesktopFooterOffsetY;
  }
  const cleanOffsetY = clampEnvelopeOffsetY(raw.offsetY);
  if (cleanOffsetY !== undefined && cleanOffsetY !== 0) {
    clean.offsetY = cleanOffsetY;
  }
  const cleanPhoneOffsetY = clampEnvelopeOffsetY(raw.phoneOffsetY);
  if (cleanPhoneOffsetY !== undefined && cleanPhoneOffsetY !== 0) {
    clean.phoneOffsetY = cleanPhoneOffsetY;
  }
  const cleanDesktopOffsetY = clampEnvelopeOffsetY(raw.desktopOffsetY);
  if (cleanDesktopOffsetY !== undefined && cleanDesktopOffsetY !== 0) {
    clean.desktopOffsetY = cleanDesktopOffsetY;
  }
  return Object.keys(clean).length > 0 ? clean : undefined;
}

export interface ResolvedEnvelopePresentation {
  kickerText: string;
  headlineText: string;
  hintText: string;
  ctaText: string;
  envelopeColor?: string;
  sealColor?: string;
  shape: EnvelopeShapeId;
  motif: EnvelopeMotifId;
  glowIntensity: number;
}

export function resolveEnvelopeSettings(
  project?: Pick<ConstellationProject, 'recipientName' | 'title' | 'envelopeSettings'> | null,
): ResolvedEnvelopePresentation {
  const raw = project?.envelopeSettings;
  const recipient = project?.recipientName?.trim() ?? '';
  const defaultKicker = recipient
    ? `Для ${recipient}`
    : DEFAULT_ENVELOPE_TEXTS.fallbackKicker;
  const defaultHeadline =
    project?.title?.trim() ||
    (recipient
      ? `${recipient}, ${DEFAULT_ENVELOPE_TEXTS.headlineSuffix}`
      : DEFAULT_ENVELOPE_TEXTS.fallbackHeadline);

  return {
    kickerText: raw?.kickerText?.trim() || defaultKicker,
    headlineText: raw?.headlineText?.trim() || defaultHeadline,
    hintText: raw?.hintText?.trim() || DEFAULT_ENVELOPE_TEXTS.hintText,
    ctaText: raw?.ctaText?.trim() || DEFAULT_ENVELOPE_TEXTS.ctaText,
    envelopeColor:
      raw?.envelopeColor && HEX_COLOR_RE.test(raw.envelopeColor)
        ? raw.envelopeColor.toUpperCase()
        : undefined,
    sealColor:
      raw?.sealColor && HEX_COLOR_RE.test(raw.sealColor)
        ? raw.sealColor.toUpperCase()
        : undefined,
    shape: resolveEnvelopeShape(raw),
    motif: resolveEnvelopeMotif(raw),
    glowIntensity: resolveEnvelopeGlowIntensity(raw),
  };
}

export interface Envelope2DSvgSpec {
  borderRadiusPx: number;
  flapPath: string;
  pocketPath: string;
  sealTopOffsetPx: number;
}

/** Coordinates in a 320x192 SVG viewBox matching EnvelopeProp 3D silhouettes */
export function getEnvelope2DSvgSpec(shape: EnvelopeShapeId): Envelope2DSvgSpec {
  if (shape === 'rounded') {
    return {
      borderRadiusPx: 34,
      flapPath: 'M0 0 L320 0 C286 78, 214 114, 160 114 C106 114, 34 78, 0 0 Z',
      pocketPath: 'M0 192 L0 74 Q82 106, 160 114 Q238 106, 320 74 L320 192 Z',
      sealTopOffsetPx: 18,
    };
  }
  return {
    borderRadiusPx: 24,
    flapPath: 'M0 0 L320 0 L160 112 Z',
    pocketPath: 'M0 192 L0 66 L160 118 L320 66 L320 192 Z',
    sealTopOffsetPx: 20,
  };
}

export interface EnvelopeMotifSvgElement {
  tag: 'path' | 'circle' | 'polygon' | 'line' | 'ellipse';
  attrs: Record<string, string>;
}

/** Coordinates in a 48x48 SVG viewBox for small envelope corner motifs */
export function getEnvelopeMotifSvgElements(
  motif: EnvelopeMotifId,
): EnvelopeMotifSvgElement[] {
  if (motif === 'heart') {
    return [
      {
        tag: 'path',
        attrs: {
          d: 'M24 38 C12 29, 9 19, 15 14 C19 10.5, 23 13, 24 16 C25 13, 29 10.5, 33 14 C39 19, 36 29, 24 38 Z',
          fill: 'currentColor',
        },
      },
    ];
  }
  if (motif === 'stars') {
    return [
      {
        tag: 'path',
        attrs: {
          d: 'M12 31 L24 16 L36 26',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: '1.8',
          strokeDasharray: '2.5 2.5',
          strokeLinecap: 'round',
        },
      },
      {
        tag: 'polygon',
        attrs: {
          points: '24,10 25.8,14.2 30,16 25.8,17.8 24,22 22.2,17.8 18,16 22.2,14.2',
          fill: 'currentColor',
        },
      },
      {
        tag: 'circle',
        attrs: { cx: '12', cy: '31', r: '3', fill: 'currentColor' },
      },
      {
        tag: 'circle',
        attrs: { cx: '36', cy: '26', r: '3.2', fill: 'currentColor' },
      },
    ];
  }
  if (motif === 'moon') {
    return [
      {
        tag: 'path',
        attrs: {
          d: 'M28 12 C14.5 13, 13.5 33, 30 35 C21.5 31.5, 20.5 17.5, 28 12 Z',
          fill: 'currentColor',
        },
      },
      {
        tag: 'polygon',
        attrs: {
          points: '32,14.5 33,17.2 35.8,18.2 33,19.2 32,22 31,19.2 28.2,18.2 31,17.2',
          fill: 'currentColor',
        },
      },
      {
        tag: 'polygon',
        attrs: {
          points: '34,24 34.6,25.7 36.3,26.3 34.6,26.9 34,28.6 33.4,26.9 31.7,26.3 33.4,25.7',
          fill: 'currentColor',
        },
      },
    ];
  }
  if (motif === 'flower') {
    return [
      { tag: 'ellipse', attrs: { cx: '24', cy: '14', rx: '4.2', ry: '6.2', fill: 'currentColor' } },
      { tag: 'ellipse', attrs: { cx: '33.5', cy: '21', rx: '6.2', ry: '4.2', transform: 'rotate(-18 33.5 21)', fill: 'currentColor' } },
      { tag: 'ellipse', attrs: { cx: '30', cy: '32', rx: '4.4', ry: '6.2', transform: 'rotate(-36 30 32)', fill: 'currentColor' } },
      { tag: 'ellipse', attrs: { cx: '18', cy: '32', rx: '4.4', ry: '6.2', transform: 'rotate(36 18 32)', fill: 'currentColor' } },
      { tag: 'ellipse', attrs: { cx: '14.5', cy: '21', rx: '6.2', ry: '4.2', transform: 'rotate(18 14.5 21)', fill: 'currentColor' } },
      { tag: 'circle', attrs: { cx: '24', cy: '24', r: '3.6', fill: '#FFFBEB' } },
    ];
  }
  if (motif === 'butterfly') {
    return [
      {
        tag: 'path',
        attrs: {
          d: 'M24 22 C18 11, 8 13, 11 23 C12 26, 19 25, 24 24 C29 25, 36 26, 37 23 C40 13, 30 11, 24 22 Z',
          fill: 'currentColor',
        },
      },
      {
        tag: 'path',
        attrs: {
          d: 'M24 25 C16 26, 13 34, 18 36.5 C21 37.5, 23 32, 24 29 C25 32, 27 37.5, 30 36.5 C35 34, 32 26, 24 25 Z',
          fill: 'currentColor',
        },
      },
      {
        tag: 'line',
        attrs: {
          x1: '24',
          y1: '17',
          x2: '24',
          y2: '34',
          stroke: 'currentColor',
          strokeWidth: '2',
          strokeLinecap: 'round',
        },
      },
    ];
  }
  return [];
}
