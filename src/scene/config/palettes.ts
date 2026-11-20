import type {
  CompositionPresetId,
  ConstellationAnimationId,
  ConstellationStar,
  CosmicPaletteId,
  GlowColorId,
  StarShapeId,
} from '../../types/project';

export interface CosmicPaletteConfig {
  id: CosmicPaletteId;
  name: string;
  description: string;
  deepColor: string;
  midColor: string;
  nebulaPrimary: string;
  nebulaSecondary: string;
  dustTint: string;
  lineTint: string;
  fogColor: string;
  cssGradient: string;
}

export const COSMIC_PALETTES: Record<CosmicPaletteId, CosmicPaletteConfig> = {
  lavender: {
    id: 'lavender',
    name: 'Лавандовая туманность',
    description: 'Глубокий чёрно-фиолетовый космос, бордовые отблески и сиреневое свечение',
    deepColor: '#06040a',
    midColor: '#1f0d34',
    nebulaPrimary: '#7c3aed',
    nebulaSecondary: '#9d174d',
    dustTint: '#e9d5ff',
    lineTint: '#c4b5fd',
    fogColor: '#08040e',
    cssGradient:
      'radial-gradient(circle at 22% 28%, rgba(124,58,237,0.34), transparent 54%), radial-gradient(circle at 78% 72%, rgba(157,23,77,0.28), transparent 54%), linear-gradient(155deg, #06040a 0%, #1d0c30 52%, #170818 100%)',
  },
  aurora: {
    id: 'aurora',
    name: 'Северное сияние',
    description: 'Бездонный ночной космос, бирюзовые всполохи и изумрудное свечение',
    deepColor: '#05080f',
    midColor: '#0b2b3a',
    nebulaPrimary: '#2dd4bf',
    nebulaSecondary: '#6d28d9',
    dustTint: '#a7f3d0',
    lineTint: '#7dd3fc',
    fogColor: '#060a12',
    cssGradient:
      'radial-gradient(circle at 25% 24%, rgba(45,212,191,0.30), transparent 54%), radial-gradient(circle at 76% 74%, rgba(109,40,217,0.26), transparent 52%), linear-gradient(155deg, #05080f 0%, #0b2b3a 52%, #0c081d 100%)',
  },
  galaxy: {
    id: 'galaxy',
    name: 'Золотая галактика',
    description: 'Бархатный космос, сливовая туманность и тёплая золотая пыльца',
    deepColor: '#07040b',
    midColor: '#230e36',
    nebulaPrimary: '#f59e0b',
    nebulaSecondary: '#881337',
    dustTint: '#fde68a',
    lineTint: '#fcd34d',
    fogColor: '#090510',
    cssGradient:
      'radial-gradient(circle at 28% 26%, rgba(245,158,11,0.26), transparent 50%), radial-gradient(circle at 75% 70%, rgba(136,19,55,0.32), transparent 55%), linear-gradient(155deg, #07040b 0%, #220e35 55%, #160917 100%)',
  },
  dawn: {
    id: 'dawn',
    name: 'Космический рассвет',
    description: 'Бордово-сливовый небосвод, розовые облака и нежный сиреневый свет',
    deepColor: '#0a040d',
    midColor: '#360d2d',
    nebulaPrimary: '#fb7185',
    nebulaSecondary: '#9333ea',
    dustTint: '#fecdd3',
    lineTint: '#fda4af',
    fogColor: '#0e0513',
    cssGradient:
      'radial-gradient(circle at 24% 28%, rgba(251,113,133,0.30), transparent 52%), radial-gradient(circle at 78% 72%, rgba(147,51,234,0.28), transparent 54%), linear-gradient(155deg, #0a040d 0%, #360d2d 52%, #180823 100%)',
  },
};

export interface GlowColorConfig {
  id: GlowColorId;
  name: string;
  hex: string;
  coreHex: string;
  haloHex: string;
}

export const GLOW_COLORS: Record<GlowColorId, GlowColorConfig> = {
  gold: {
    id: 'gold',
    name: 'Золотой',
    hex: '#fcd34d',
    coreHex: '#fffbeb',
    haloHex: '#f59e0b',
  },
  blue: {
    id: 'blue',
    name: 'Голубой',
    hex: '#60a5fa',
    coreHex: '#eff6ff',
    haloHex: '#3b82f6',
  },
  lilac: {
    id: 'lilac',
    name: 'Сиреневый',
    hex: '#c084fc',
    coreHex: '#faf5ff',
    haloHex: '#9333ea',
  },
  pink: {
    id: 'pink',
    name: 'Розовый',
    hex: '#f472b6',
    coreHex: '#fdf2f8',
    haloHex: '#ec4899',
  },
  turquoise: {
    id: 'turquoise',
    name: 'Бирюзовый',
    hex: '#2dd4bf',
    coreHex: '#f0fdfa',
    haloHex: '#0d9488',
  },
};

export interface StarShapeMeta {
  id: StarShapeId;
  name: string;
  shortHint: string;
}

export const STAR_SHAPES: StarShapeMeta[] = [
  { id: 'star', name: 'Звезда', shortHint: 'Пятиконечный кристалл' },
  { id: 'heart', name: 'Сердце', shortHint: 'Объёмное кристальное сердце' },
  { id: 'flower', name: 'Цветок', shortHint: 'Светящиеся лепестки' },
  { id: 'moon', name: 'Полумесяц', shortHint: 'Лунный кристалл' },
  { id: 'comet', name: 'Комета', shortHint: 'Ядро со световым хвостом' },
  { id: 'planet', name: 'Планета', shortHint: 'Кристалл с кольцами' },
  { id: 'spark', name: 'Искра', shortHint: 'Четырёхлучевая объёмная искра' },
];

export const VALID_STAR_SHAPES = new Set<StarShapeId>(
  STAR_SHAPES.map((s) => s.id),
);

export interface CompositionPresetMeta {
  id: CompositionPresetId;
  name: string;
  description: string;
}

export const COMPOSITION_PRESETS: CompositionPresetMeta[] = [
  {
    id: 'free',
    name: 'Свободная композиция',
    description: 'Плавная дуга звёзд в пространстве',
  },
  {
    id: 'heart',
    name: 'Сердце',
    description: 'Звёзды и линии образуют сердце',
  },
  {
    id: 'flower',
    name: 'Цветок',
    description: 'Центр и лепестки вокруг него',
  },
];

export interface ConstellationAnimationMeta {
  id: ConstellationAnimationId;
  name: string;
  description: string;
}

export const CONSTELLATION_ANIMATIONS: ConstellationAnimationMeta[] = [
  {
    id: 'rotation',
    name: 'Плавное вращение',
    description: 'Созвездие нежно поворачивается в пространстве',
  },
  {
    id: 'breathe',
    name: 'Дыхание',
    description: 'Звёзды мягко переливаются и пульсируют светом',
  },
  {
    id: 'dust',
    name: 'Звёздная пыль',
    description: 'Вокруг созвездия кружатся золотистые космические искорки',
  },
  {
    id: 'none',
    name: 'Без анимации',
    description: 'Спокойное неподвижное созвездие без вращения',
  },
];

export const VALID_CONSTELLATION_ANIMATIONS = new Set<ConstellationAnimationId>(
  CONSTELLATION_ANIMATIONS.map((a) => a.id),
);

export function resolveConstellationAnimation(
  holder?: { constellationAnimation?: ConstellationAnimationId } | ConstellationAnimationId | null,
): ConstellationAnimationId {
  const id =
    typeof holder === 'string'
      ? holder
      : holder && typeof holder === 'object'
        ? holder.constellationAnimation
        : undefined;
  if (id && VALID_CONSTELLATION_ANIMATIONS.has(id)) {
    return id;
  }
  return 'rotation';
}

export function resolveStarGlowHex(
  star: ConstellationStar,
  globalGlow: GlowColorId,
): GlowColorId {
  if (!star.glowColor || star.glowColor === 'inherit' || !(star.glowColor in GLOW_COLORS)) {
    return globalGlow;
  }
  return star.glowColor;
}

export function resolveStarShape(star: Partial<ConstellationStar>): StarShapeId {
  if (star.shape && VALID_STAR_SHAPES.has(star.shape)) {
    return star.shape;
  }
  return 'star';
}
