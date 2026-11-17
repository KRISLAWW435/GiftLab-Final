export type CosmicPaletteId = 'lavender' | 'aurora' | 'galaxy' | 'dawn';

export type GlowColorId = 'gold' | 'blue' | 'lilac' | 'pink' | 'turquoise';

export type BuiltinIllustrationId = 'heart' | 'flower' | 'moon' | 'comet' | 'planet';

export type StarShapeId = 'star' | 'heart' | 'flower' | 'moon' | 'comet' | 'planet' | 'spark';

export type CompositionPresetId = 'free' | 'heart' | 'flower';

export type OccasionId = 'new_year' | 'mothers_day' | 'birthday' | 'teachers_day' | 'custom';

export type MusicTrackId =
  | 'none'
  | 'magical_cover'
  | 'cosmic_drift'
  | 'cosmic_genesis'
  | 'custom'
  | 'stardust'
  | 'aurora_chimes'
  | 'galaxy_waltz';

export type ConstellationAnimationId = 'rotation' | 'breathe' | 'dust' | 'none';

export type EditorInteractionMode = 'arrange' | 'connect' | 'orbit';

export type RecipientPhase =
  | 'sealed'
  | 'birthing'
  | 'starStory'
  | 'finalReveal'
  | 'constellation';

export interface StarPosition3D {
  x: number;
  y: number;
  z: number;
}

export type StarImageFitMode = 'contain' | 'cover';

export interface StarImageSettings {
  fit: StarImageFitMode;
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface StarIllustrationLayout {
  /** Horizontal placement offset within safe card width (-100..100) */
  offsetX: number;
  /** Vertical placement offset within safe card area (-100..100) */
  offsetY: number;
  /** Card illustration scale multiplier (0.65..1.45) */
  scale: number;
}

export type CardDecorMotif =
  | 'none'
  | 'sparkles'
  | 'orbital'
  | 'hearts'
  | 'corners'
  | 'floral_corners'
  | 'soft_flowers'
  | 'petals'
  | 'magic_rays';

export type CardThemeId =
  | 'gentle_letter'
  | 'cosmic_card'
  | 'floral'
  | 'magical'
  | 'minimalist';

export interface CardThemeCustomColors {
  surfaceBg?: string;
  accentColor?: string;
  textColor?: string;
  badgeColor?: string;
}

export interface StarDecorSettings {
  motif: CardDecorMotif;
  /** Horizontal position percentage inside card area (6..94) */
  xPct: number;
  /** Vertical position percentage inside card area (6..88) */
  yPct: number;
  /** Scale multiplier (0.7..1.45) */
  scale: number;
}

export type MessageFontId = 'manrope' | 'comfortaa' | 'caveat' | 'cormorant' | 'lora';

export type MessageFontCategory = 'handwritten' | 'elegant' | 'classic' | 'modern';

export type MessageTextWeight = 'normal' | 'semibold';

export type MessageTextAlign = 'left' | 'center' | 'right';

export type MessageTextShadow = 'soft' | 'none' | 'glow';

export type MessageTextAccent = 'none' | 'line' | 'frame' | 'quote';

export interface StarTextStyle {
  fontId: MessageFontId;
  /** Message body font size in px (14..24) */
  fontSize: number;
  fontWeight: MessageTextWeight;
  textAlign: MessageTextAlign | 'auto';
  /** Line height multiplier (1.2..2.0) */
  lineHeight: number;
  color: string;
  shadow: MessageTextShadow;
  accent: MessageTextAccent;
  /** Bounded horizontal offset (-100..100) */
  offsetX: number;
  /** Bounded vertical offset (-100..100) */
  offsetY: number;
  /** Text block width percentage within safe stage (56..100) */
  widthPct: number;
}

export type DeviceLayoutKey = 'phone' | 'desktop';

export type CardPaddingPreset = 'compact' | 'normal' | 'spacious';

export type CardVerticalAlign = 'top' | 'center' | 'spread';

export type CardWidthPreset = 'compact' | 'standard' | 'wide';

export interface DeviceTextLayout {
  /** Message body font size in px (14..24) */
  fontSize: number;
  textAlign: MessageTextAlign | 'auto';
  /** Line height multiplier (1.2..2.0) */
  lineHeight: number;
  /** Bounded horizontal offset (-100..100) */
  offsetX: number;
  /** Bounded vertical offset (-100..100) */
  offsetY: number;
  /** Text block width percentage within safe stage (56..100) */
  widthPct: number;
}

export interface DeviceDecorLayout {
  /** Horizontal position percentage inside card area (6..94) */
  xPct: number;
  /** Vertical position percentage inside card area (6..88) */
  yPct: number;
  /** Scale multiplier (0.7..1.45) */
  scale: number;
}

export interface DeviceConstellationLayout {
  /** Horizontal shift (-100..100) */
  offsetX: number;
  /** Vertical shift (-100..100) */
  offsetY: number;
  /** Constellation scale multiplier (0.55..1.45) */
  scale: number;
}

export interface DeviceCardLayout {
  padding: CardPaddingPreset;
  verticalAlign: CardVerticalAlign;
  width: CardWidthPreset;
  /** Bounded vertical offset for card / finale letter (-60..60) */
  offsetY: number;
  /** Overall proportional card scale multiplier (0.55..1.25) */
  scale?: number;
  /** Optional direct-dragged card width in px for this device */
  customWidthPx?: number;
  /** Optional direct-dragged card height in px for this device */
  customHeightPx?: number;
}

export interface EnvelopeSettings {
  kickerText?: string;
  headlineText?: string;
  hintText?: string;
  ctaText?: string;
  envelopeColor?: string;
  sealColor?: string;
  /** Legacy shared scale multiplier */
  scale?: number;
  /** Envelope visual scale multiplier for phone viewport (0.55..1.35) */
  phoneScale?: number;
  /** Envelope visual scale multiplier for desktop viewport (0.55..1.35) */
  desktopScale?: number;
  /** Legacy shared header text vertical offset (-20..100) */
  textOffsetY?: number;
  /** Envelope header text vertical offset for phone viewport (-20..100) */
  phoneTextOffsetY?: number;
  /** Envelope header text vertical offset for desktop viewport (-20..100) */
  desktopTextOffsetY?: number;
  /** Legacy shared envelope vertical offset (-100..100) */
  offsetY?: number;
  /** Envelope vertical offset for phone viewport (-100..100) */
  phoneOffsetY?: number;
  /** Envelope vertical offset for desktop viewport (-100..100) */
  desktopOffsetY?: number;
}

export interface StarDeviceLayoutEntry {
  text?: Partial<DeviceTextLayout>;
  illustration?: Partial<StarIllustrationLayout>;
  decor?: Partial<DeviceDecorLayout>;
}

export interface StarDeviceLayouts {
  phone?: StarDeviceLayoutEntry;
  desktop?: StarDeviceLayoutEntry;
}

export interface ProjectDeviceLayoutEntry {
  constellation?: Partial<DeviceConstellationLayout>;
  card?: Partial<DeviceCardLayout>;
  finalText?: Partial<DeviceTextLayout>;
  finalDecor?: Partial<DeviceDecorLayout>;
}

export interface ProjectDeviceLayouts {
  phone?: ProjectDeviceLayoutEntry;
  desktop?: ProjectDeviceLayoutEntry;
}

export interface StarIllustrationRef {
  type: 'builtin' | 'custom';
  /** BuiltinIllustrationId when type === 'builtin', or imageId in IndexedDB when type === 'custom' */
  id: string;
}

export interface ConstellationStar {
  id: string;
  order: number;
  title: string;
  message: string;
  illustration: StarIllustrationRef;
  /** Optional non-destructive image presentation & crop settings */
  imageSettings?: StarImageSettings;
  /** Optional legacy/fallback card illustration placement and scale settings */
  illustrationLayout?: StarIllustrationLayout;
  /** Optional typography and visual style settings */
  textStyle?: StarTextStyle;
  /** Optional decorative card motif and placement */
  decor?: StarDecorSettings;
  /** Independent presentation layouts per viewport device (phone / desktop) */
  deviceLayouts?: StarDeviceLayouts;
  /** 3D crystal form; migrated to 'star' when absent in legacy projects */
  shape: StarShapeId;
  /** If 'inherit' or undefined, uses project.globalGlowColor */
  glowColor: GlowColorId | 'inherit';
  position: StarPosition3D;
  /** True for freshly generated preset or newly added draft stars until user edits or confirms text */
  isDraft?: boolean;
}

export interface StarConnection {
  id: string;
  from: string;
  to: string;
}

export interface ConstellationProject {
  id: string;
  title: string;
  recipientName: string;
  senderName?: string;
  occasion: OccasionId;
  occasionLabel: string;
  paletteId: CosmicPaletteId;
  globalGlowColor: GlowColorId;
  composition?: CompositionPresetId;
  cardTheme?: CardThemeId;
  cardColors?: CardThemeCustomColors;
  stars: ConstellationStar[];
  connections: StarConnection[];
  finalMessage: string;
  finalTextStyle?: StarTextStyle;
  finalDecor?: StarDecorSettings;
  /** Independent presentation layouts per viewport device (phone / desktop) */
  deviceLayouts?: ProjectDeviceLayouts;
  /** Sealed envelope texts & colors */
  envelopeSettings?: EnvelopeSettings;
  constellationAnimation?: ConstellationAnimationId;
  musicTrackId: MusicTrackId;
  customMusicId?: string;
  customMusicName?: string;
  createdAt: number;
  updatedAt: number;
}

export interface StoredImageRecord {
  id: string;
  projectId: string;
  blob: Blob;
  mimeType: string;
  size: number;
  updatedAt: number;
}

export interface StoredAudioRecord {
  id: string;
  projectId: string;
  blob: Blob;
  fileName: string;
  mimeType: string;
  size: number;
  updatedAt: number;
}

export const MIN_STARS = 5;
export const MAX_STARS = 20;

export function isStarFilled(star: ConstellationStar): boolean {
  return star.title.trim().length > 0 && star.message.trim().length > 0;
}

export function isStarComplete(star: ConstellationStar): boolean {
  return !star.isDraft && isStarFilled(star);
}

export function canExportProject(project: ConstellationProject): boolean {
  if (project.stars.length < MIN_STARS) return false;
  return (
    project.title.trim().length > 0 &&
    project.finalMessage.trim().length > 0 &&
    project.stars.every(isStarFilled)
  );
}
