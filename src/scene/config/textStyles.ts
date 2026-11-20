import type {
  MessageFontCategory,
  MessageFontId,
  MessageTextAccent,
  MessageTextShadow,
  StarTextStyle,
} from '../../types/project';

export const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export interface MessageFontCategoryMeta {
  id: MessageFontCategory;
  name: string;
  hint: string;
}

export const MESSAGE_FONT_CATEGORIES: MessageFontCategoryMeta[] = [
  { id: 'handwritten', name: 'Рукописные', hint: 'Эффект личного письма' },
  { id: 'elegant', name: 'Элегантные', hint: 'Для праздничных открыток' },
  { id: 'classic', name: 'Классические', hint: 'Для длинных пожеланий' },
  { id: 'modern', name: 'Современные', hint: 'Для минималистичных композиций' },
];

export interface MessageFontMeta {
  id: MessageFontId;
  category: MessageFontCategory;
  name: string;
  cssFamily: string;
  sample: string;
  /** Optical size adjustment in px so handwritten/display faces stay balanced */
  opticalSizeBoost: number;
}

export const MESSAGE_FONTS: MessageFontMeta[] = [
  {
    id: 'caveat',
    category: 'handwritten',
    name: 'Caveat',
    cssFamily: '"Caveat", cursive',
    sample: 'Тёплые слова от всего сердца',
    opticalSizeBoost: 3,
  },
  {
    id: 'cormorant',
    category: 'elegant',
    name: 'Cormorant Garamond',
    cssFamily: '"Cormorant Garamond", Georgia, serif',
    sample: 'Сияй ярко и верь в чудеса',
    opticalSizeBoost: 2,
  },
  {
    id: 'lora',
    category: 'classic',
    name: 'Lora',
    cssFamily: '"Lora", Georgia, serif',
    sample: 'Пусть каждый день приносит радость',
    opticalSizeBoost: 0,
  },
  {
    id: 'manrope',
    category: 'modern',
    name: 'Manrope',
    cssFamily: '"Manrope", system-ui, -apple-system, sans-serif',
    sample: 'Чистота и современный ритм',
    opticalSizeBoost: 0,
  },
  {
    id: 'comfortaa',
    category: 'modern',
    name: 'Comfortaa',
    cssFamily: '"Comfortaa", ui-rounded, sans-serif',
    sample: 'Мягкое космическое настроение',
    opticalSizeBoost: 0,
  },
];

export const VALID_MESSAGE_FONT_IDS = new Set<MessageFontId>(
  MESSAGE_FONTS.map((f) => f.id),
);

export const LIGHT_PAPER_TEXT_COLORS: Array<{ hex: string; name: string }> = [
  { hex: '#171923', name: 'Глубокий антрацит' },
  { hex: '#3B2B30', name: 'Тёплый чернильный' },
  { hex: '#3D2436', name: 'Сливовый чернильный' },
  { hex: '#1E293B', name: 'Глубокий графит' },
  { hex: '#4A3525', name: 'Шоколадный' },
  { hex: '#14532D', name: 'Ботанический зелёный' },
];

export const DARK_CARD_TEXT_COLORS: Array<{ hex: string; name: string }> = [
  { hex: '#F8FAFC', name: 'Лунный белый' },
  { hex: '#FEF3C7', name: 'Тёплое золото' },
  { hex: '#E0E7FF', name: 'Перламутровый' },
  { hex: '#FCE7F3', name: 'Нежно-розовый' },
  { hex: '#CCFBF1', name: 'Бирюзовый свет' },
  { hex: '#E9D5FF', name: 'Сиреневый' },
];

export const MESSAGE_TEXT_COLORS: Array<{ hex: string; name: string }> = [
  ...DARK_CARD_TEXT_COLORS,
  ...LIGHT_PAPER_TEXT_COLORS,
];

export const DEFAULT_STAR_TEXT_STYLE: StarTextStyle = {
  fontId: 'manrope',
  fontSize: 17,
  fontWeight: 'normal',
  textAlign: 'auto',
  lineHeight: 1.6,
  color: '#F8FAFC',
  shadow: 'soft',
  accent: 'none',
  offsetX: 0,
  offsetY: 0,
  widthPct: 100,
};

export function resolveStarTextStyle(
  rawHolder?: { textStyle?: Partial<StarTextStyle> } | Partial<StarTextStyle>,
): StarTextStyle {
  const raw =
    rawHolder && 'textStyle' in rawHolder
      ? rawHolder.textStyle
      : (rawHolder as Partial<StarTextStyle> | undefined);

  if (!raw) return { ...DEFAULT_STAR_TEXT_STYLE };

  const fontId: MessageFontId =
    raw.fontId && VALID_MESSAGE_FONT_IDS.has(raw.fontId) ? raw.fontId : 'manrope';
  const fontSize =
    typeof raw.fontSize === 'number' && Number.isFinite(raw.fontSize)
      ? Math.max(12, Math.min(28, Math.round(raw.fontSize)))
      : DEFAULT_STAR_TEXT_STYLE.fontSize;
  const fontWeight = raw.fontWeight === 'semibold' ? 'semibold' : 'normal';
  const textAlign =
    raw.textAlign === 'left' ||
    raw.textAlign === 'center' ||
    raw.textAlign === 'right'
      ? raw.textAlign
      : 'auto';
  const lineHeight =
    typeof raw.lineHeight === 'number' && Number.isFinite(raw.lineHeight)
      ? Math.max(1.2, Math.min(2.0, Number(raw.lineHeight.toFixed(2))))
      : DEFAULT_STAR_TEXT_STYLE.lineHeight;
  const color =
    typeof raw.color === 'string' && HEX_COLOR_RE.test(raw.color)
      ? raw.color.toUpperCase()
      : DEFAULT_STAR_TEXT_STYLE.color;
  const shadow: MessageTextShadow =
    raw.shadow === 'none' || raw.shadow === 'glow' ? raw.shadow : 'soft';
  const accent: MessageTextAccent =
    raw.accent === 'line' || raw.accent === 'frame' || raw.accent === 'quote'
      ? raw.accent
      : 'none';
  const offsetX =
    typeof raw.offsetX === 'number' && Number.isFinite(raw.offsetX)
      ? Math.max(-100, Math.min(100, Math.round(raw.offsetX)))
      : 0;
  const offsetY =
    typeof raw.offsetY === 'number' && Number.isFinite(raw.offsetY)
      ? Math.max(-100, Math.min(100, Math.round(raw.offsetY)))
      : 0;
  const widthPct =
    typeof raw.widthPct === 'number' && Number.isFinite(raw.widthPct)
      ? Math.max(38, Math.min(100, Math.round(raw.widthPct)))
      : 100;

  return {
    fontId,
    fontSize,
    fontWeight,
    textAlign,
    lineHeight,
    color,
    shadow,
    accent,
    offsetX,
    offsetY,
    widthPct,
  };
}

export function isDefaultStarTextStyle(style: StarTextStyle): boolean {
  return (
    style.fontId === DEFAULT_STAR_TEXT_STYLE.fontId &&
    style.fontSize === DEFAULT_STAR_TEXT_STYLE.fontSize &&
    style.fontWeight === DEFAULT_STAR_TEXT_STYLE.fontWeight &&
    style.textAlign === DEFAULT_STAR_TEXT_STYLE.textAlign &&
    style.lineHeight === DEFAULT_STAR_TEXT_STYLE.lineHeight &&
    style.color.toUpperCase() === DEFAULT_STAR_TEXT_STYLE.color.toUpperCase() &&
    style.shadow === DEFAULT_STAR_TEXT_STYLE.shadow &&
    style.accent === DEFAULT_STAR_TEXT_STYLE.accent &&
    style.offsetX === DEFAULT_STAR_TEXT_STYLE.offsetX &&
    style.offsetY === DEFAULT_STAR_TEXT_STYLE.offsetY &&
    style.widthPct === DEFAULT_STAR_TEXT_STYLE.widthPct
  );
}

export function resolveMessageFont(fontId: MessageFontId): MessageFontMeta {
  return MESSAGE_FONTS.find((f) => f.id === fontId) ?? MESSAGE_FONTS[3];
}

export function resolveTextShadowCss(
  shadow: MessageTextShadow,
  glowHex: string,
): string {
  if (shadow === 'none') return 'none';
  if (shadow === 'glow') {
    return `0 2px 10px rgba(0, 0, 0, 0.78), 0 0 18px ${glowHex}66`;
  }
  return '0 2px 12px rgba(0, 0, 0, 0.76)';
}

export function computeTextBlockMarginLeftPct(
  widthPct: number,
  offsetX: number,
): number {
  const safeW = Math.max(38, Math.min(100, widthPct));
  const slack = Math.max(0, 100 - safeW);
  const tX = (Math.max(-100, Math.min(100, offsetX)) + 100) / 200;
  return Number((slack * tX).toFixed(2));
}
