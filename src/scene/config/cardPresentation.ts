import type {
  CardThemeCustomColors,
  CardThemeId,
  CardVerticalAlign,
  ConstellationProject,
  ConstellationStar,
  DeviceCardLayout,
  DeviceLayoutKey,
  EnvelopeSettings,
  GlowColorId,
  MessageTextAlign,
  MessageTextShadow,
  ProjectDeviceLayouts,
  StarDecorSettings,
  StarIllustrationLayout,
  StarTextStyle,
} from '../../types/project';
import {
  type CardThemeConfig,
  type ResolvedCardColors,
  type SafeDecorPresentation,
  resolveCardColors,
  resolveCardTheme,
  resolveContrastSafeCardTextColor,
  resolveSafeCardDecorPresentation,
} from './cardThemesAndDecor';
import {
  resolveEffectiveCardLayout,
  resolveEffectiveFinalDecor,
  resolveEffectiveFinalTextStyle,
  resolveEffectiveIllustrationLayout,
  resolveEffectiveStarDecor,
  resolveEffectiveStarTextStyle,
} from './deviceLayouts';
import {
  ENVELOPE_VISIBLE_WORLD_H,
  ENVELOPE_WORLD_H,
  ENVELOPE_WORLD_W,
  type ResolvedEnvelopePresentation,
  computeEnvelopeFooterTranslateYPx,
  computeEnvelopeScreenOffsetYPx,
  computeEnvelopeTextTranslateYPx,
  resolveEnvelopeEffectiveWorldScale,
  resolveEnvelopeFooterOffsetY,
  resolveEnvelopeOffsetY,
  resolveEnvelopeSettings,
  resolveEnvelopeTextOffsetY,
  resolveEnvelopeUserScale,
} from './envelopeLayout';
import { GLOW_COLORS, type GlowColorConfig, resolveStarGlowHex } from './palettes';
import {
  type MessageFontMeta,
  computeTextBlockMarginLeftPct,
  isDefaultStarTextStyle,
  resolveMessageFont,
  resolveTextShadowCss,
} from './textStyles';

export type CardPresentationProjectInput = Pick<
  ConstellationProject,
  | 'title'
  | 'recipientName'
  | 'senderName'
  | 'globalGlowColor'
  | 'cardTheme'
  | 'cardColors'
  | 'envelopeSettings'
  | 'deviceLayouts'
  | 'finalMessage'
  | 'finalTextStyle'
  | 'finalDecor'
>;

export interface EnvelopeScreenGeometry {
  resolvedEnvelope: ResolvedEnvelopePresentation;
  aspect: number;
  userScale: number;
  worldScale: number;
  pxPerUnit: number;
  boxW: number;
  boxH: number;
  textOffsetY: number;
  textTranslateYPx: number;
  footerOffsetY: number;
  footerTranslateYPx: number;
  offsetY: number;
  screenOffsetYPx: number;
}

export function computeEnvelopeScreenGeometry(
  project: Pick<ConstellationProject, 'recipientName' | 'title' | 'envelopeSettings'> | null | undefined,
  viewportWidth: number,
  viewportHeight: number,
  device: DeviceLayoutKey,
  isPortrait: boolean,
): EnvelopeScreenGeometry {
  const resolvedEnvelope = resolveEnvelopeSettings(project);
  const aspect = Math.max(0.25, viewportWidth / Math.max(1, viewportHeight));
  const userScale = resolveEnvelopeUserScale(project?.envelopeSettings, device);
  const worldScale = resolveEnvelopeEffectiveWorldScale(
    project?.envelopeSettings,
    aspect,
    device,
  );
  const pxPerUnit = Math.max(1, viewportHeight) / ENVELOPE_VISIBLE_WORLD_H;
  const boxW = Math.round(ENVELOPE_WORLD_W * worldScale * pxPerUnit);
  const boxH = Math.round(ENVELOPE_WORLD_H * worldScale * pxPerUnit);

  const textOffsetY = resolveEnvelopeTextOffsetY(project?.envelopeSettings, device);
  const textTranslateYPx = computeEnvelopeTextTranslateYPx(
    textOffsetY,
    viewportHeight,
    isPortrait,
  );
  const footerOffsetY = resolveEnvelopeFooterOffsetY(project?.envelopeSettings, device);
  const footerTranslateYPx = computeEnvelopeFooterTranslateYPx(
    footerOffsetY,
    viewportHeight,
    isPortrait,
  );
  const offsetY = resolveEnvelopeOffsetY(project?.envelopeSettings, device);
  const screenOffsetYPx = computeEnvelopeScreenOffsetYPx(
    offsetY,
    viewportWidth,
    viewportHeight,
  );

  return {
    resolvedEnvelope,
    aspect,
    userScale,
    worldScale,
    pxPerUnit,
    boxW,
    boxH,
    textOffsetY,
    textTranslateYPx,
    footerOffsetY,
    footerTranslateYPx,
    offsetY,
    screenOffsetYPx,
  };
}

export interface StoryFlexSpacers {
  topOuterGrow: number;
  topInnerGrow: number;
  bottomInnerGrow: number;
}

export function computeStoryFlexSpacers(
  verticalAlign: CardVerticalAlign,
  illuOffsetY: number,
  textOffsetY: number,
  isCompactViewport: boolean,
): StoryFlexSpacers {
  const illuYShift = illuOffsetY / 100;
  const textYShift = textOffsetY / 100;
  const spacerBase = isCompactViewport ? 0.35 : 0.9;

  const rawTopOuterGrow = Math.max(
    0,
    Math.min(
      2.0,
      spacerBase * (1 + illuYShift * 0.85) - Math.max(0, -textYShift) * 0.45,
    ),
  );
  const rawTopInnerGrow = Math.max(
    0.06,
    Math.min(
      2.2,
      0.14 + Math.max(0, textYShift) * 1.4 + Math.max(0, -illuYShift) * 0.7,
    ),
  );
  const rawBottomInnerGrow = Math.max(
    0,
    Math.min(
      2.4,
      spacerBase + Math.max(0, -textYShift) * 1.35 - Math.max(0, textYShift) * 0.65,
    ),
  );

  const topOuterGrow = Number(
    (verticalAlign === 'top'
      ? rawTopOuterGrow * 0.2
      : verticalAlign === 'spread'
        ? rawTopOuterGrow * 0.4
        : rawTopOuterGrow
    ).toFixed(3),
  );
  const topInnerGrow = Number(
    (verticalAlign === 'spread' ? rawTopInnerGrow + 0.75 : rawTopInnerGrow).toFixed(3),
  );
  const bottomInnerGrow = Number(
    (verticalAlign === 'top'
      ? rawBottomInnerGrow + 1.15
      : verticalAlign === 'spread'
        ? rawBottomInnerGrow * 0.4
        : rawBottomInnerGrow
    ).toFixed(3),
  );

  return { topOuterGrow, topInnerGrow, bottomInnerGrow };
}

export interface StoryCardPresentation {
  signatureText: string;
  activeStarGlow: GlowColorConfig;
  cardTheme: CardThemeConfig;
  cardColors: ResolvedCardColors;
  hasExplicitCardTheme: boolean;
  isMinimalistTheme: boolean;
  cardLayout: DeviceCardLayout;
  textStyle: StarTextStyle;
  fontMeta: MessageFontMeta;
  sansFontMeta: MessageFontMeta;
  effectiveAlign: Exclude<MessageTextAlign, 'auto'>;
  effectiveBodyPx: number;
  effectiveTitlePx: number;
  titleLineHeight: number;
  textMarginLeftPct: number;
  illuLayout: StarIllustrationLayout;
  illuLeftGrow: number;
  illuRightGrow: number;
  clampedIlluScale: number;
  effectiveIlluPx: number;
  spacers: StoryFlexSpacers;
  storyWidthClass: string;
  storyCardPaddingClass: string;
  storyCardOffsetY: number;
  storyCardScale: number;
  storyTextShiftY: number;
  starDecor: StarDecorSettings;
  safeStarDecor: SafeDecorPresentation;
  effectiveTextColor: string;
  effectiveShadowMode: MessageTextShadow;
  resolvedTextShadow: string;
  decorGlowHex: string;
  decorCoreHex: string;
}

export function computeStoryCardPresentation(
  project: Pick<
    ConstellationProject,
    | 'recipientName'
    | 'senderName'
    | 'globalGlowColor'
    | 'cardTheme'
    | 'cardColors'
    | 'deviceLayouts'
  >,
  star: ConstellationStar | null | undefined,
  options: {
    device: DeviceLayoutKey;
    viewportWidth: number;
    isPortrait: boolean;
    isCompactLandscape: boolean;
    editMode?: boolean;
  },
): StoryCardPresentation {
  const { device, viewportWidth, isPortrait, isCompactLandscape, editMode = false } = options;
  const globalGlow = GLOW_COLORS[project.globalGlowColor] ?? GLOW_COLORS.gold;
  const activeStarGlow = star
    ? GLOW_COLORS[resolveStarGlowHex(star, project.globalGlowColor)] ?? globalGlow
    : globalGlow;

  const signatureText =
    project.senderName?.trim() ||
    (project.recipientName ? `Для ${project.recipientName}` : '');

  const cardTheme = resolveCardTheme(project.cardTheme);
  const cardColors = resolveCardColors(project);
  const hasExplicitCardTheme = Boolean(project.cardTheme || project.cardColors);
  const isMinimalistTheme = hasExplicitCardTheme && cardTheme.id === 'minimalist';
  const cardLayout = resolveEffectiveCardLayout(project, device);
  const textStyle = resolveEffectiveStarTextStyle(star ?? undefined, device);
  const fontMeta = resolveMessageFont(textStyle.fontId);
  const sansFontMeta = resolveMessageFont('manrope');

  const effectiveAlign: Exclude<MessageTextAlign, 'auto'> =
    textStyle.textAlign === 'auto'
      ? isMinimalistTheme
        ? 'left'
        : isPortrait
          ? 'center'
          : 'left'
      : textStyle.textAlign;

  const effectiveBodyPx = Math.min(
    textStyle.fontSize + fontMeta.opticalSizeBoost,
    isCompactLandscape ? 16 : isPortrait ? 20 : 26,
  );
  const effectiveTitlePx = Math.round(
    Math.min(isCompactLandscape ? 25 : isPortrait ? 31 : 38, effectiveBodyPx * 1.48),
  );
  const titleLineHeight = Math.min(
    1.4,
    Math.max(1.12, Number((textStyle.lineHeight * 0.78).toFixed(2))),
  );
  const textMarginLeftPct = computeTextBlockMarginLeftPct(
    textStyle.widthPct,
    textStyle.offsetX,
  );

  const illuLayout = resolveEffectiveIllustrationLayout(star ?? undefined, device);
  const illuLeftGrow = Number(((illuLayout.offsetX + 100) / 200).toFixed(3));
  const illuRightGrow = Number((1 - illuLeftGrow).toFixed(3));
  const clampedIlluScale = Math.min(isPortrait ? 1.28 : 1.45, illuLayout.scale);
  const baseIlluPx = isCompactLandscape
    ? 80
    : isPortrait
      ? viewportWidth >= 640
        ? 156
        : 118
      : viewportWidth >= 1024
        ? 196
        : 158;
  const effectiveIlluPx = Math.round(baseIlluPx * clampedIlluScale);

  const spacers = computeStoryFlexSpacers(
    cardLayout.verticalAlign,
    illuLayout.offsetY,
    textStyle.offsetY,
    isPortrait || isCompactLandscape,
  );

  const storyWidthClass = isPortrait
    ? cardLayout.width === 'compact'
      ? 'max-w-[330px]'
      : cardLayout.width === 'wide'
        ? 'max-w-full'
        : 'max-w-[374px]'
    : cardLayout.width === 'compact'
      ? 'max-w-md'
      : cardLayout.width === 'wide'
        ? 'max-w-2xl'
        : 'max-w-xl';

  const storyCardPaddingClass = isMinimalistTheme
    ? cardLayout.padding === 'compact'
      ? 'pl-7 pr-4 py-3 sm:pl-9 sm:pr-6 sm:py-4'
      : cardLayout.padding === 'spacious'
        ? 'pl-9 pr-6 py-5 sm:pl-12 sm:pr-9 sm:py-7'
        : 'pl-8 pr-5 py-4 sm:pl-10 sm:pr-7 sm:py-5'
    : cardLayout.padding === 'compact'
      ? 'px-3.5 py-2.5 sm:px-4 sm:py-3'
      : cardLayout.padding === 'spacious'
        ? 'px-5 py-4 sm:px-8 sm:py-6'
        : 'px-4 py-3.5 sm:px-6 sm:py-5';

  const storyCardOffsetY = Math.round(cardLayout.offsetY * 0.7);
  const storyCardScale = cardLayout.scale ?? 1;
  const storyTextShiftY = Math.round(textStyle.offsetY * 0.32);

  const starDecor = resolveEffectiveStarDecor(star ?? undefined, device);
  const safeStarDecor = resolveSafeCardDecorPresentation(starDecor, {
    editMode,
    textLength: (star?.message || '').length,
    compactViewport: isPortrait || isCompactLandscape,
  });

  const rawTextColor =
    star?.textStyle || !cardColors.isLightPaper
      ? textStyle.color
      : cardColors.textColor;
  const effectiveTextColor = resolveContrastSafeCardTextColor(
    rawTextColor,
    project,
    cardColors,
  );
  const effectiveShadowMode: MessageTextShadow =
    cardColors.isLightPaper && textStyle.shadow !== 'glow'
      ? 'none'
      : textStyle.shadow;
  const resolvedTextShadow = resolveTextShadowCss(
    effectiveShadowMode,
    activeStarGlow.hex,
  );
  const decorGlowHex = cardColors.isLightPaper
    ? cardColors.accentColor
    : activeStarGlow.hex;
  const decorCoreHex = cardColors.isLightPaper
    ? cardColors.badgeColor
    : activeStarGlow.coreHex;

  return {
    signatureText,
    activeStarGlow,
    cardTheme,
    cardColors,
    hasExplicitCardTheme,
    isMinimalistTheme,
    cardLayout,
    textStyle,
    fontMeta,
    sansFontMeta,
    effectiveAlign,
    effectiveBodyPx,
    effectiveTitlePx,
    titleLineHeight,
    textMarginLeftPct,
    illuLayout,
    illuLeftGrow,
    illuRightGrow,
    clampedIlluScale,
    effectiveIlluPx,
    spacers,
    storyWidthClass,
    storyCardPaddingClass,
    storyCardOffsetY,
    storyCardScale,
    storyTextShiftY,
    starDecor,
    safeStarDecor,
    effectiveTextColor,
    effectiveShadowMode,
    resolvedTextShadow,
    decorGlowHex,
    decorCoreHex,
  };
}

export interface FinalLetterPresentation {
  cardTheme: CardThemeConfig;
  cardColors: ResolvedCardColors;
  globalGlow: GlowColorConfig;
  isMinimalist: boolean;
  isFrostedDark: boolean;
  resolvedText: StarTextStyle;
  isDefaultSharedText: boolean;
  fontMeta: MessageFontMeta;
  sansFontMeta: MessageFontMeta;
  effectiveAlign: Exclude<MessageTextAlign, 'auto'>;
  effectiveTextColor: string;
  effectiveShadow: MessageTextShadow;
  textShadowCss: string;
  finalDecor: StarDecorSettings;
  safeDecor: SafeDecorPresentation;
  cardLayout: DeviceCardLayout;
  bodyPx: number;
  headerPx: number;
  signaturePx: number;
  accentStroke: string;
  crestGlowHex: string;
  crestCoreHex: string;
  widthClass: string;
  headerPadClass: string;
  bodyPadClass: string;
  footerPadClass: string;
  alignItemsClass: string;
  topPadClass: string;
  cardShiftY: number;
  cardScale: number;
  textMarginLeftPct: number;
  textShiftY: number;
}

export function computeFinalLetterPresentation(
  project: {
    cardTheme?: CardThemeId;
    cardColors?: CardThemeCustomColors;
    globalGlowColor: GlowColorId;
    finalMessage: string;
    finalTextStyle?: StarTextStyle;
    finalDecor?: StarDecorSettings;
    deviceLayouts?: ProjectDeviceLayouts;
  },
  options: {
    device: DeviceLayoutKey;
    isPortrait: boolean;
    isCompactLandscape: boolean;
    editMode?: boolean;
  },
): FinalLetterPresentation {
  const { device, isPortrait, isCompactLandscape, editMode = false } = options;
  const cardTheme = resolveCardTheme(project.cardTheme);
  const cardColors = resolveCardColors(project);
  const globalGlow = GLOW_COLORS[project.globalGlowColor] ?? GLOW_COLORS.gold;
  const isMinimalist = cardTheme.id === 'minimalist';
  const isFrostedDark = !cardColors.isLightPaper;

  const resolvedText = resolveEffectiveFinalTextStyle(project, device);
  const isDefaultSharedText =
    !project.finalTextStyle || isDefaultStarTextStyle(resolvedText);

  const fontMeta = resolveMessageFont(resolvedText.fontId);
  const sansFontMeta = resolveMessageFont('manrope');

  const effectiveAlign: Exclude<MessageTextAlign, 'auto'> =
    resolvedText.textAlign !== 'auto'
      ? resolvedText.textAlign
      : isMinimalist
        ? 'left'
        : 'center';

  const rawTextColor =
    project.finalTextStyle && !isDefaultSharedText
      ? resolvedText.color
      : project.cardColors?.textColor ??
        (project.cardTheme ? cardColors.textColor : resolvedText.color);
  const effectiveTextColor = resolveContrastSafeCardTextColor(
    rawTextColor,
    project,
    cardColors,
  );

  const effectiveShadow: MessageTextShadow =
    cardColors.isLightPaper && resolvedText.shadow === 'soft' && !project.finalTextStyle
      ? 'none'
      : cardColors.isLightPaper && resolvedText.shadow !== 'glow'
        ? 'none'
        : resolvedText.shadow;

  const textShadowCss = resolveTextShadowCss(effectiveShadow, globalGlow.hex);
  const finalDecor = resolveEffectiveFinalDecor(project, device);
  const safeDecor = resolveSafeCardDecorPresentation(finalDecor, {
    editMode: false,
    textLength: (project.finalMessage || '').length,
    compactViewport: isPortrait || isCompactLandscape,
  });
  const cardLayout = resolveEffectiveCardLayout(project, device);

  const bodyPx = Math.min(
    isCompactLandscape ? 19 : isPortrait ? 24 : 30,
    Math.max(
      12,
      Math.round((resolvedText.fontSize + fontMeta.opticalSizeBoost) * 1.15),
    ),
  );
  const headerPx = Math.max(
    12,
    Math.min(isPortrait ? 15 : 20, Math.round(bodyPx * 0.68)),
  );
  const signaturePx = Math.max(15, Math.min(24, Math.round(bodyPx * 0.8)));

  const accentStroke = cardColors.accentColor || globalGlow.hex;
  const crestGlowHex = cardColors.isLightPaper ? cardColors.accentColor : globalGlow.hex;
  const crestCoreHex = cardColors.isLightPaper ? cardColors.badgeColor : globalGlow.coreHex;

  const widthClass = cardLayout.customWidthPx
    ? 'max-w-[94vw]'
    : isCompactLandscape
      ? 'max-w-xl'
      : device === 'phone'
        ? cardLayout.width === 'compact'
          ? 'max-w-[min(86vw,330px)]'
          : cardLayout.width === 'wide'
            ? 'max-w-[min(96vw,440px)]'
            : 'max-w-[min(92vw,390px)]'
        : cardLayout.width === 'compact'
          ? 'max-w-[min(92vw,440px)]'
          : cardLayout.width === 'wide'
            ? 'max-w-[min(92vw,680px)]'
            : 'max-w-[min(92vw,540px)]';

  const hasDecorSafeMargin = finalDecor.motif !== 'none' && !editMode;

  const headerPadClass = isMinimalist
    ? cardLayout.padding === 'compact'
      ? 'pl-8 sm:pl-11 pr-5 sm:pr-7 pt-4 pb-2'
      : 'pl-9 sm:pl-12 pr-6 sm:pr-8 pt-5 sm:pt-6 pb-2.5'
    : cardLayout.padding === 'compact'
      ? 'px-4 sm:px-5 pt-3 pb-1.5'
      : cardLayout.padding === 'spacious'
        ? 'px-6 sm:px-9 pt-5 sm:pt-6 pb-3'
        : 'px-5 sm:px-7 pt-4 sm:pt-5 pb-2';

  const bodyPadClass = isMinimalist
    ? cardLayout.padding === 'compact'
      ? isCompactLandscape
        ? 'max-h-[42dvh] pl-8 sm:pl-11 pr-5 sm:pr-8 py-3.5'
        : isPortrait
          ? 'max-h-[48dvh] pl-8 pr-6 py-4'
          : 'max-h-[52dvh] pl-11 pr-9 py-5'
      : isCompactLandscape
        ? 'max-h-[46dvh] pl-9 sm:pl-12 pr-6 sm:pr-9 py-4'
        : isPortrait
          ? 'max-h-[52dvh] pl-8 pr-6 py-5'
          : 'max-h-[58dvh] pl-12 pr-10 py-7 sm:py-8'
    : cardLayout.padding === 'compact'
      ? isCompactLandscape
        ? 'max-h-[42dvh] px-4 py-2.5'
        : isPortrait
          ? 'max-h-[48dvh] px-4 py-3'
          : 'max-h-[50dvh] px-5 py-3.5'
      : cardLayout.padding === 'spacious'
        ? isCompactLandscape
          ? 'max-h-[46dvh] px-6 py-4'
          : isPortrait
            ? 'max-h-[54dvh] px-6 py-5'
            : 'max-h-[58dvh] px-9 py-6 sm:py-7'
        : isCompactLandscape
          ? 'max-h-[44dvh] px-5 py-3'
          : isPortrait
            ? `max-h-[50dvh] ${hasDecorSafeMargin ? 'px-6' : 'px-5'} py-4`
            : `max-h-[54dvh] ${hasDecorSafeMargin ? 'px-7 sm:px-10' : 'px-5 sm:px-8'} py-5 sm:py-6`;

  const footerPadClass = isMinimalist
    ? cardLayout.padding === 'compact'
      ? 'pl-8 sm:pl-11 pr-5 sm:pr-7 pb-4 pt-1.5'
      : 'pl-9 sm:pl-12 pr-6 sm:pr-8 pb-5 sm:pb-6 pt-2'
    : cardLayout.padding === 'compact'
      ? 'px-4 sm:px-5 pb-2.5 pt-1'
      : cardLayout.padding === 'spacious'
        ? 'px-6 sm:px-9 pb-5 pt-2'
        : 'px-5 sm:px-7 pb-3.5 sm:pb-4 pt-1';

  const alignItemsClass =
    cardLayout.verticalAlign === 'top' ? 'items-start' : 'items-center';

  const cardShiftY = Math.round(cardLayout.offsetY * 1.4);
  const cardScale = cardLayout.scale ?? 1;
  const textMarginLeftPct = computeTextBlockMarginLeftPct(
    resolvedText.widthPct,
    resolvedText.offsetX,
  );
  const textShiftY = Math.round(resolvedText.offsetY * 0.25);

  const topPadClass =
    cardLayout.verticalAlign === 'top'
      ? isCompactLandscape
        ? 'pt-14 pb-3'
        : 'pt-16 sm:pt-20 pb-4'
      : isCompactLandscape
        ? 'pt-8 pb-3'
        : 'pt-10 sm:pt-12 pb-4';

  return {
    cardTheme,
    cardColors,
    globalGlow,
    isMinimalist,
    isFrostedDark,
    resolvedText,
    isDefaultSharedText,
    fontMeta,
    sansFontMeta,
    effectiveAlign,
    effectiveTextColor,
    effectiveShadow,
    textShadowCss,
    finalDecor,
    safeDecor,
    cardLayout,
    bodyPx,
    headerPx,
    signaturePx,
    accentStroke,
    crestGlowHex,
    crestCoreHex,
    widthClass,
    headerPadClass,
    bodyPadClass,
    footerPadClass,
    alignItemsClass,
    topPadClass,
    cardShiftY,
    cardScale,
    textMarginLeftPct,
    textShiftY,
  };
}
