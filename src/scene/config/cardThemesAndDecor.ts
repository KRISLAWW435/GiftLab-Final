import type {
  CardDecorMotif,
  CardThemeCustomColors,
  CardThemeId,
  ConstellationProject,
  MessageFontId,
  MessageTextAccent,
  MessageTextShadow,
  StarDecorSettings,
  StarTextStyle,
} from '../../types/project';
import { HEX_COLOR_RE, resolveStarTextStyle } from './textStyles';

export const CARD_DECOR_MOTIFS: Array<{ id: CardDecorMotif; name: string }> = [
  { id: 'none', name: 'Без узора' },
  { id: 'sparkles', name: 'Искры' },
  { id: 'orbital', name: 'Орбита' },
  { id: 'hearts', name: 'Сердечки' },
  { id: 'corners', name: 'Уголки' },
  { id: 'floral_corners', name: 'Веточки' },
  { id: 'soft_flowers', name: 'Цветы' },
  { id: 'petals', name: 'Лепестки' },
  { id: 'magic_rays', name: 'Лучи' },
];

export const VALID_CARD_DECOR_MOTIFS = new Set<CardDecorMotif>(
  CARD_DECOR_MOTIFS.map((m) => m.id),
);

export const DEFAULT_STAR_DECOR: StarDecorSettings = {
  motif: 'none',
  xPct: 90,
  yPct: 14,
  scale: 0.94,
};

export interface SafeDecorPresentation {
  xPct: number;
  yPct: number;
  scale: number;
  opacity: number;
}

/**
 * Ensures card decor stays cleanly in safe perimeter / corner zones and softly scales down
 * when greeting text is long or screen space is tight, so recipient/message/signature remain sharp.
 */
export function resolveSafeCardDecorPresentation(
  decor: StarDecorSettings,
  options: {
    editMode?: boolean;
    textLength?: number;
    compactViewport?: boolean;
  } = {},
): SafeDecorPresentation {
  const editMode = Boolean(options.editMode);
  if (editMode) {
    return {
      xPct: decor.xPct,
      yPct: decor.yPct,
      scale: decor.scale,
      opacity: 0.92,
    };
  }

  const textLen = options.textLength ?? 0;
  const isLongText = textLen > 165;
  const isVeryLongText = textLen > 320;
  const compact = Boolean(options.compactViewport);

  // Pull decor gently away from the central reading column toward outer edges/corners
  let safeX = decor.xPct;
  let safeY = decor.yPct;

  const isInCenterX = safeX > 22 && safeX < 78;
  const isInCenterY = safeY > 22 && safeY < 74;

  if (isInCenterX && isInCenterY) {
    safeX = safeX >= 50 ? 90 : 10;
    safeY = safeY >= 50 ? 85 : 13;
  } else if (isLongText || compact) {
    if (safeX >= 50 && safeX < 88) safeX = Math.max(safeX, 89);
    if (safeX < 50 && safeX > 12) safeX = Math.min(safeX, 11);
    if (safeY >= 48 && safeY < 83) safeY = Math.max(safeY, 85);
    if (safeY < 48 && safeY > 15) safeY = Math.min(safeY, 13);
  }

  const lengthFactor = isVeryLongText ? 0.78 : isLongText ? 0.86 : 1;
  const viewportFactor = compact ? 0.88 : 1;
  const safeScale = Number(
    Math.max(0.62, Math.min(1.35, decor.scale * lengthFactor * viewportFactor)).toFixed(2),
  );
  const safeOpacity = isVeryLongText ? 0.56 : isLongText ? 0.68 : 0.82;

  return {
    xPct: Math.max(6, Math.min(94, Math.round(safeX))),
    yPct: Math.max(6, Math.min(88, Math.round(safeY))),
    scale: safeScale,
    opacity: safeOpacity,
  };
}

export function resolveStarDecor(
  rawHolder?: { decor?: Partial<StarDecorSettings> } | Partial<StarDecorSettings>,
): StarDecorSettings {
  const raw =
    rawHolder && 'decor' in rawHolder
      ? rawHolder.decor
      : (rawHolder as Partial<StarDecorSettings> | undefined);

  if (!raw) return { ...DEFAULT_STAR_DECOR };

  const motif: CardDecorMotif =
    raw.motif && VALID_CARD_DECOR_MOTIFS.has(raw.motif) ? raw.motif : 'none';
  const xPct =
    typeof raw.xPct === 'number' && Number.isFinite(raw.xPct)
      ? Math.max(6, Math.min(94, Math.round(raw.xPct)))
      : DEFAULT_STAR_DECOR.xPct;
  const yPct =
    typeof raw.yPct === 'number' && Number.isFinite(raw.yPct)
      ? Math.max(6, Math.min(88, Math.round(raw.yPct)))
      : DEFAULT_STAR_DECOR.yPct;
  const scale =
    typeof raw.scale === 'number' && Number.isFinite(raw.scale)
      ? Math.max(0.7, Math.min(1.45, Number(raw.scale.toFixed(2))))
      : DEFAULT_STAR_DECOR.scale;

  return { motif, xPct, yPct, scale };
}

export interface CardThemeConfig {
  id: CardThemeId;
  name: string;
  description: string;
  isLightPaper: boolean;
  defaultSurfaceBg: string;
  surfaceBgAlt: string;
  borderColor: string;
  defaultAccentColor: string;
  defaultTextColor: string;
  defaultBadgeColor: string;
  defaultFontId: MessageFontId;
  defaultTextShadow: MessageTextShadow;
  defaultTextAccent: MessageTextAccent;
  defaultDecorMotif: CardDecorMotif;
  paperPattern: 'paper' | 'stars' | 'botanical' | 'aurora' | 'minimal';
}

export const CARD_THEMES: Record<CardThemeId, CardThemeConfig> = {
  gentle_letter: {
    id: 'gentle_letter',
    name: 'Нежное письмо',
    description: 'Светлая фактурная бумага, мягкие цветы и тёплый рукописный шрифт',
    isLightPaper: true,
    defaultSurfaceBg: '#FAF5EB',
    surfaceBgAlt: '#F2E8D5',
    borderColor: '#D6C2AA',
    defaultAccentColor: '#B87D6A',
    defaultTextColor: '#3B2B30',
    defaultBadgeColor: '#7D524A',
    defaultFontId: 'caveat',
    defaultTextShadow: 'none',
    defaultTextAccent: 'line',
    defaultDecorMotif: 'soft_flowers',
    paperPattern: 'paper',
  },
  cosmic_card: {
    id: 'cosmic_card',
    name: 'Космическая открытка',
    description: 'Матовое космическое стекло, тонкий блик грани и золотая вспышка',
    isLightPaper: false,
    defaultSurfaceBg: '#231D3F',
    surfaceBgAlt: '#141129',
    borderColor: '#C4B5FD',
    defaultAccentColor: '#F6C453',
    defaultTextColor: '#F8FAFC',
    defaultBadgeColor: '#FDE68A',
    defaultFontId: 'cormorant',
    defaultTextShadow: 'soft',
    defaultTextAccent: 'frame',
    defaultDecorMotif: 'sparkles',
    paperPattern: 'stars',
  },
  floral: {
    id: 'floral',
    name: 'Цветочная',
    description: 'Пастельные лепестки, ботанические узоры и классическая типографика',
    isLightPaper: true,
    defaultSurfaceBg: '#FDF4F7',
    surfaceBgAlt: '#F8E3EB',
    borderColor: '#E4B8C9',
    defaultAccentColor: '#D9779B',
    defaultTextColor: '#3D2436',
    defaultBadgeColor: '#8C4663',
    defaultFontId: 'lora',
    defaultTextShadow: 'none',
    defaultTextAccent: 'quote',
    defaultDecorMotif: 'petals',
    paperPattern: 'botanical',
  },
  magical: {
    id: 'magical',
    name: 'Волшебная',
    description: 'Голографическое фиалковое стекло, кристаллы звёзд и лёгкие орбиты',
    isLightPaper: false,
    defaultSurfaceBg: '#3D2F78',
    surfaceBgAlt: '#24184E',
    borderColor: '#D8B4FE',
    defaultAccentColor: '#E9D5FF',
    defaultTextColor: '#FFFFFF',
    defaultBadgeColor: '#F5E8FF',
    defaultFontId: 'comfortaa',
    defaultTextShadow: 'glow',
    defaultTextAccent: 'line',
    defaultDecorMotif: 'magic_rays',
    paperPattern: 'aurora',
  },
  minimalist: {
    id: 'minimalist',
    name: 'Минималистичная',
    description: 'Пастельный дизайнерский лист, чёткая геометрия и выразительная типографика',
    isLightPaper: true,
    defaultSurfaceBg: '#F4EFE6',
    surfaceBgAlt: '#EAE2D4',
    borderColor: '#C9BFA9',
    defaultAccentColor: '#8A6D4F',
    defaultTextColor: '#171923',
    defaultBadgeColor: '#4A5568',
    defaultFontId: 'lora',
    defaultTextShadow: 'none',
    defaultTextAccent: 'line',
    defaultDecorMotif: 'none',
    paperPattern: 'minimal',
  },
};

export const CARD_THEME_LIST: CardThemeConfig[] = [
  CARD_THEMES.gentle_letter,
  CARD_THEMES.cosmic_card,
  CARD_THEMES.floral,
  CARD_THEMES.magical,
  CARD_THEMES.minimalist,
];

export const VALID_CARD_THEME_IDS = new Set<CardThemeId>(
  CARD_THEME_LIST.map((t) => t.id),
);

export function resolveCardTheme(
  holder?: { cardTheme?: CardThemeId } | CardThemeId | null,
): CardThemeConfig {
  const id =
    typeof holder === 'string'
      ? holder
      : holder && typeof holder === 'object'
        ? holder.cardTheme
        : undefined;
  if (id && VALID_CARD_THEME_IDS.has(id)) {
    return CARD_THEMES[id];
  }
  return CARD_THEMES.cosmic_card;
}

export function isHexLight(hex: string): boolean {
  if (!HEX_COLOR_RE.test(hex)) return false;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.52;
}

function sanitizeCardHex(value: string | undefined, fallback: string): string {
  return typeof value === 'string' && HEX_COLOR_RE.test(value)
    ? value.toUpperCase()
    : fallback;
}

export function sanitizeCardColors(
  colors?: CardThemeCustomColors,
): CardThemeCustomColors | undefined {
  if (!colors || typeof colors !== 'object') return undefined;
  const clean: CardThemeCustomColors = {};
  if (typeof colors.surfaceBg === 'string' && HEX_COLOR_RE.test(colors.surfaceBg)) {
    clean.surfaceBg = colors.surfaceBg.toUpperCase();
  }
  if (typeof colors.accentColor === 'string' && HEX_COLOR_RE.test(colors.accentColor)) {
    clean.accentColor = colors.accentColor.toUpperCase();
  }
  if (typeof colors.textColor === 'string' && HEX_COLOR_RE.test(colors.textColor)) {
    clean.textColor = colors.textColor.toUpperCase();
  }
  if (typeof colors.badgeColor === 'string' && HEX_COLOR_RE.test(colors.badgeColor)) {
    clean.badgeColor = colors.badgeColor.toUpperCase();
  }
  return Object.keys(clean).length > 0 ? clean : undefined;
}

export interface ResolvedCardColors {
  surfaceBg: string;
  surfaceBgAlt: string;
  borderColor: string;
  accentColor: string;
  textColor: string;
  badgeColor: string;
  isLightPaper: boolean;
}

export function resolveCardColors(
  holder?: Pick<ConstellationProject, 'cardTheme' | 'cardColors'> | null,
): ResolvedCardColors {
  const theme = resolveCardTheme(holder?.cardTheme);
  const custom = holder?.cardColors;
  const surfaceBg = sanitizeCardHex(custom?.surfaceBg, theme.defaultSurfaceBg);
  const accentColor = sanitizeCardHex(custom?.accentColor, theme.defaultAccentColor);
  const textColor = sanitizeCardHex(custom?.textColor, theme.defaultTextColor);
  const badgeColor = sanitizeCardHex(custom?.badgeColor, theme.defaultBadgeColor);
  const lightPaper = custom?.surfaceBg ? isHexLight(surfaceBg) : theme.isLightPaper;
  return {
    surfaceBg,
    surfaceBgAlt: custom?.surfaceBg ? surfaceBg : theme.surfaceBgAlt,
    borderColor: custom?.accentColor ? accentColor : theme.borderColor,
    accentColor,
    textColor,
    badgeColor,
    isLightPaper: lightPaper,
  };
}

/** Ensures legacy light-text minimalist saves remain contrast-safe on the redesigned pastel surface */
export function resolveContrastSafeCardTextColor(
  candidateColor: string,
  holder: Pick<ConstellationProject, 'cardTheme' | 'cardColors'> | null | undefined,
  cardColors: ResolvedCardColors,
): string {
  if (
    holder?.cardTheme === 'minimalist' &&
    !holder.cardColors?.surfaceBg &&
    !holder.cardColors?.textColor &&
    cardColors.isLightPaper &&
    isHexLight(candidateColor)
  ) {
    return cardColors.textColor;
  }
  return candidateColor;
}

/**
 * Non-destructively applies a card composition theme to a project.
 * Strictly preserves user texts, illustrations, star shapes, glow colors, positions, and connections.
 */
export function applyCardThemeToProject(
  project: ConstellationProject,
  themeId: CardThemeId,
): ConstellationProject {
  const theme = CARD_THEMES[themeId] ?? CARD_THEMES.cosmic_card;

  const mergeTextStyle = (prev?: StarTextStyle): StarTextStyle => {
    const resolved = resolveStarTextStyle(prev);
    return {
      ...resolved,
      fontId: theme.defaultFontId,
      color: theme.defaultTextColor,
      shadow: theme.defaultTextShadow,
      accent: theme.defaultTextAccent,
    };
  };

  const mergeDecor = (prev?: StarDecorSettings): StarDecorSettings => {
    const resolved = resolveStarDecor(prev);
    return {
      ...resolved,
      motif: theme.defaultDecorMotif,
    };
  };

  return {
    ...project,
    cardTheme: theme.id,
    cardColors: undefined,
    stars: project.stars.map((star) => ({
      ...star,
      textStyle: mergeTextStyle(star.textStyle),
      decor: mergeDecor(star.decor),
    })),
    finalTextStyle: mergeTextStyle(project.finalTextStyle),
    finalDecor: mergeDecor(project.finalDecor),
  };
}
