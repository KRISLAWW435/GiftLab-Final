import type {
  BuiltinIllustrationId,
  CardDecorMotif,
  CardPaddingPreset,
  CardThemeCustomColors,
  CardThemeId,
  CardVerticalAlign,
  CardWidthPreset,
  CompositionPresetId,
  ConstellationAnimationId,
  ConstellationProject,
  ConstellationStar,
  CosmicPaletteId,
  DeviceCardLayout,
  DeviceConstellationLayout,
  DeviceDecorLayout,
  DeviceLayoutKey,
  DeviceTextLayout,
  EnvelopeSettings,
  GlowColorId,
  MessageFontCategory,
  MessageFontId,
  MessageTextAccent,
  MessageTextAlign,
  MessageTextShadow,
  MusicTrackId,
  OccasionId,
  ProjectDeviceLayoutEntry,
  ProjectDeviceLayouts,
  StarConnection,
  StarDecorSettings,
  StarDeviceLayoutEntry,
  StarDeviceLayouts,
  StarIllustrationLayout,
  StarImageSettings,
  StarPosition3D,
  StarShapeId,
  StarTextStyle,
} from '../types/project';

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

export interface OccasionPreset {
  id: OccasionId;
  label: string;
  defaultTitle: string;
  defaultRecipient: string;
  defaultPalette: CosmicPaletteId;
  defaultGlow: GlowColorId;
  defaultFinalMessage: string;
  starterStars: Array<{
    title: string;
    message: string;
    illustration: BuiltinIllustrationId;
    shape?: StarShapeId;
  }>;
}

export const OCCASION_PRESETS: OccasionPreset[] = [
  {
    id: 'new_year',
    label: 'Новый год',
    defaultTitle: 'Созвездие новогодних желаний',
    defaultRecipient: 'Дорогой друг',
    defaultPalette: 'aurora',
    defaultGlow: 'gold',
    defaultFinalMessage:
      'Пусть в новом году сбудется каждое загаданное желание, а рядом всегда будут тепло и чудеса!',
    starterStars: [
      {
        title: 'Звезда чудес',
        message: 'Пусть каждый зимний вечер приносит маленькое волшебство и уютные улыбки.',
        illustration: 'comet',
        shape: 'comet',
      },
      {
        title: 'Звезда тепла',
        message: 'Желаю, чтобы дома всегда было светло, тепло и радостно.',
        illustration: 'moon',
        shape: 'moon',
      },
      {
        title: 'Звезда смелых мечт',
        message: 'Пусть самые яркие мечты смело ведут к новым открытиям!',
        illustration: 'planet',
        shape: 'star',
      },
      {
        title: 'Звезда добра',
        message: 'Спасибо за доброту, поддержку и самые весёлые моменты года.',
        illustration: 'heart',
        shape: 'heart',
      },
      {
        title: 'Звезда вдохновения',
        message: 'Пусть впереди ждёт целый год ярких идей, друзей и праздников!',
        illustration: 'flower',
        shape: 'flower',
      },
    ],
  },
  {
    id: 'mothers_day',
    label: 'День матери',
    defaultTitle: 'Моя вселенная для тебя',
    defaultRecipient: 'Любимая мама',
    defaultPalette: 'dawn',
    defaultGlow: 'pink',
    defaultFinalMessage:
      'Мама, ты — самое яркое солнце в моей вселенной! Спасибо за твою любовь и заботу каждый день.',
    starterStars: [
      {
        title: 'Сердце заботы',
        message: 'Спасибо за твои добрые объятия, которые согревают в любой день.',
        illustration: 'heart',
        shape: 'heart',
      },
      {
        title: 'Нежный цветок',
        message: 'Пусть твоя улыбка расцветает чаще, а поводов для радости будет бесконечно много.',
        illustration: 'flower',
        shape: 'flower',
      },
      {
        title: 'Уютная луна',
        message: 'С тобой дома всегда спокойно, светло и очень уютно.',
        illustration: 'moon',
        shape: 'moon',
      },
      {
        title: 'Звезда мечтаний',
        message: 'Желаю тебе побольше времени для твоих любимых дел и отдыха!',
        illustration: 'comet',
        shape: 'comet',
      },
      {
        title: 'Наш общий мир',
        message: 'Люблю наши разговоры, прогулки и каждый праздник вместе.',
        illustration: 'planet',
        shape: 'star',
      },
    ],
  },
  {
    id: 'birthday',
    label: 'День рождения',
    defaultTitle: 'Пять звёзд для именинника',
    defaultRecipient: 'Именинник',
    defaultPalette: 'galaxy',
    defaultGlow: 'gold',
    defaultFinalMessage:
      'С днём рождения! Сияй ярко, верь в свои мечты и открывай самые удивительные галактики!',
    starterStars: [
      {
        title: 'Звезда приключений',
        message: 'Пусть этот год подарит невероятные путешествия и яркие впечатления!',
        illustration: 'comet',
        shape: 'comet',
      },
      {
        title: 'Звезда дружбы',
        message: 'Рядом всегда будут верные друзья, с которыми весело в любую минуту.',
        illustration: 'planet',
        shape: 'planet',
      },
      {
        title: 'Звезда радости',
        message: 'Желаю смеха, приятных сюрпризов и отличного настроения каждый день!',
        illustration: 'heart',
        shape: 'heart',
      },
      {
        title: 'Звезда гармонии',
        message: 'Пусть всё получается легко, а вечера будут уютными и вдохновляющими.',
        illustration: 'moon',
        shape: 'moon',
      },
      {
        title: 'Звезда талантов',
        message: 'Пусть все твои идеи расцветают и приносят настоящую гордость!',
        illustration: 'flower',
        shape: 'star',
      },
    ],
  },
  {
    id: 'teachers_day',
    label: 'День учителя',
    defaultTitle: 'Созвездие благодарности',
    defaultRecipient: 'Любимый учитель',
    defaultPalette: 'lavender',
    defaultGlow: 'lilac',
    defaultFinalMessage:
      'Спасибо за знания, терпение и веру в нас! Вы зажигаете в каждом ученике настоящую звезду.',
    starterStars: [
      {
        title: 'Свет знаний',
        message: 'Спасибо, что делаете каждый урок интересным открытием нового мира.',
        illustration: 'planet',
        shape: 'star',
      },
      {
        title: 'Звезда терпения',
        message: 'Благодарим за поддержку, внимание и добрые советы в нужный момент.',
        illustration: 'moon',
        shape: 'moon',
      },
      {
        title: 'Искры вдохновения',
        message: 'Благодаря вам хочется мечтать смелее и узнавать всё больше!',
        illustration: 'comet',
        shape: 'comet',
      },
      {
        title: 'Цветок признательности',
        message: 'От всей души желаем вам радости, здоровья и благодарных учеников.',
        illustration: 'flower',
        shape: 'flower',
      },
      {
        title: 'Доброе сердце',
        message: 'Пусть ваша доброта возвращается к вам тёплым светом каждый день!',
        illustration: 'heart',
        shape: 'heart',
      },
    ],
  },
  {
    id: 'custom',
    label: 'Свой повод',
    defaultTitle: 'Моё космическое послание',
    defaultRecipient: 'Близкий человек',
    defaultPalette: 'lavender',
    defaultGlow: 'turquoise',
    defaultFinalMessage:
      'Это маленькое созвездие создано специально для тебя — помни, как ярко ты светишь!',
    starterStars: [
      {
        title: 'Первая звезда',
        message: 'Пусть в твоём сердце всегда горит тёплый огонёк радости.',
        illustration: 'heart',
        shape: 'star',
      },
      {
        title: 'Вторая звезда',
        message: 'Желаю спокойных вечеров и самых приятных воспоминаний.',
        illustration: 'moon',
        shape: 'star',
      },
      {
        title: 'Третья звезда',
        message: 'Пусть каждый новый день приносит повод для искренней улыбки.',
        illustration: 'flower',
        shape: 'star',
      },
      {
        title: 'Четвёртая звезда',
        message: 'Мечтай смело — пусть твои желания летят быстрее комет!',
        illustration: 'comet',
        shape: 'star',
      },
      {
        title: 'Пятая звезда',
        message: 'Спасибо, что делаешь наш общий мир добрее и светлее.',
        illustration: 'planet',
        shape: 'star',
      },
    ],
  },
];

export interface BuiltinMusicTrackMeta {
  id: MusicTrackId;
  name: string;
  mood: string;
  assetPath?: string;
  filename?: string;
}

export const MUSIC_TRACKS: BuiltinMusicTrackMeta[] = [
  {
    id: 'magical_cover',
    name: 'Волшебная мелодия',
    mood: 'Тёплая космическая мелодия (по умолчанию)',
    assetPath: '/assets/audio/Magical_and_Joyful_Cover.mp3',
    filename: 'Magical_and_Joyful_Cover.mp3',
  },
  {
    id: 'cosmic_drift',
    name: 'Космический дрейф',
    mood: 'Спокойное звёздное парение',
    assetPath: '/assets/audio/CosmicDrift.mp3',
    filename: 'CosmicDrift.mp3',
  },
  {
    id: 'cosmic_genesis',
    name: 'Рождение вселенной',
    mood: 'Вдохновляющее сияние космоса',
    assetPath: '/assets/audio/CosmicGenesis.mp3',
    filename: 'CosmicGenesis.mp3',
  },
  {
    id: 'none',
    name: 'Без музыки',
    mood: 'Тишина космического пространства',
  },
];

export const LEGACY_SYNTH_TRACK_NAMES: Partial<Record<MusicTrackId, string>> = {
  stardust: 'Колыбельная звёзд',
  aurora_chimes: 'Переливы сияния',
  galaxy_waltz: 'Звёздный вальс',
};

export function resolveMusicTrackName(
  project: Pick<ConstellationProject, 'musicTrackId' | 'customMusicName'>,
): string | null {
  if (project.musicTrackId === 'none') return null;
  if (project.musicTrackId === 'custom') {
    return project.customMusicName?.trim() || 'Своя музыка';
  }
  const builtin = MUSIC_TRACKS.find((t) => t.id === project.musicTrackId);
  if (builtin) return builtin.name;
  return LEGACY_SYNTH_TRACK_NAMES[project.musicTrackId] ?? 'Фоновая музыка';
}

/** Default 3D layout positions forming a graceful spatial constellation arc */
export const DEFAULT_STAR_POSITIONS: StarPosition3D[] = [
  { x: -3.2, y: 1.15, z: 0.9 },
  { x: -1.45, y: 2.05, z: -0.65 },
  { x: 0.25, y: 0.45, z: 1.25 },
  { x: 1.95, y: 1.75, z: -0.45 },
  { x: 3.15, y: -0.55, z: 0.75 },
  { x: 0.85, y: -1.85, z: -0.95 },
  { x: -2.05, y: -1.35, z: -0.35 },
];

export function computeAutoDepthForIndex(index: number, x: number, y: number): number {
  const wave = Math.sin(index * 1.45 + x * 0.32) * 1.9 + Math.cos(y * 0.42) * 0.85;
  return Number(Math.max(-3.2, Math.min(3.2, wave)).toFixed(2));
}

export const STAR_SPAWN_BOUNDS = {
  maxX: 7.4,
  maxY: 4.6,
  maxZ: 3.4,
} as const;

/**
 * Generates an expanded, non-overlapping 3D spawn position for newly added stars (up to 20+).
 */
export function computeNextStarSpawnPosition(
  existingStars: ReadonlyArray<{ position: StarPosition3D }>,
  index: number,
): StarPosition3D {
  const goldenAngle = 2.399963229728653;
  let bestCandidate: StarPosition3D = { x: 0, y: 0, z: 0 };
  let bestMinDistSq = -1;

  for (let attempt = 0; attempt < 28; attempt++) {
    const step = index + attempt * 0.73;
    const shellT = Math.min(1, (step + 1.5) / 21);
    const rx = 2.6 + shellT * (STAR_SPAWN_BOUNDS.maxX - 2.6);
    const ry = 1.8 + shellT * (STAR_SPAWN_BOUNDS.maxY - 1.8);
    const angle = step * goldenAngle + attempt * 0.41;

    const x = Number(
      Math.max(
        -STAR_SPAWN_BOUNDS.maxX,
        Math.min(STAR_SPAWN_BOUNDS.maxX, Math.cos(angle) * rx),
      ).toFixed(2),
    );
    const y = Number(
      Math.max(
        -STAR_SPAWN_BOUNDS.maxY,
        Math.min(STAR_SPAWN_BOUNDS.maxY, Math.sin(angle) * ry),
      ).toFixed(2),
    );
    const zWave =
      Math.sin(step * 1.35 + attempt * 0.85) * 2.35 +
      Math.cos(angle * 1.7) * 0.95;
    const z = Number(
      Math.max(
        -STAR_SPAWN_BOUNDS.maxZ,
        Math.min(STAR_SPAWN_BOUNDS.maxZ, zWave),
      ).toFixed(2),
    );

    if (existingStars.length === 0) {
      return { x, y, z };
    }

    let nearestSq = Infinity;
    for (const s of existingStars) {
      const dx = s.position.x - x;
      const dy = s.position.y - y;
      const dz = s.position.z - z;
      const dSq = dx * dx + dy * dy + dz * dz;
      if (dSq < nearestSq) nearestSq = dSq;
    }

    // Found a roomy spot at least 2.35 units away from every existing star
    if (nearestSq >= 2.35 * 2.35) {
      return { x, y, z };
    }

    if (nearestSq > bestMinDistSq) {
      bestMinDistSq = nearestSq;
      bestCandidate = { x, y, z };
    }
  }

  return bestCandidate;
}

export function resolveStarGlowHex(
  star: ConstellationStar,
  globalGlow: GlowColorId,
): GlowColorId {
  return star.glowColor === 'inherit' ? globalGlow : star.glowColor;
}

export const DEFAULT_STAR_IMAGE_SETTINGS: StarImageSettings = {
  fit: 'contain',
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};

export function resolveStarImageSettings(
  star?: Partial<ConstellationStar>,
): StarImageSettings {
  const raw = star?.imageSettings;
  if (!raw) return { ...DEFAULT_STAR_IMAGE_SETTINGS };

  const fit = raw.fit === 'cover' ? 'cover' : 'contain';
  const scale =
    typeof raw.scale === 'number' && Number.isFinite(raw.scale)
      ? Math.max(1, Math.min(2.5, Number(raw.scale.toFixed(2))))
      : 1;
  const offsetX =
    typeof raw.offsetX === 'number' && Number.isFinite(raw.offsetX)
      ? Math.max(-50, Math.min(50, Math.round(raw.offsetX)))
      : 0;
  const offsetY =
    typeof raw.offsetY === 'number' && Number.isFinite(raw.offsetY)
      ? Math.max(-50, Math.min(50, Math.round(raw.offsetY)))
      : 0;

  return { fit, scale, offsetX, offsetY };
}

export const DEFAULT_ILLUSTRATION_LAYOUT: StarIllustrationLayout = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
};

export function resolveStarIllustrationLayout(
  rawHolder?: { illustrationLayout?: Partial<StarIllustrationLayout> } | Partial<StarIllustrationLayout>,
  fallbackOffsetX = 0,
): StarIllustrationLayout {
  const raw =
    rawHolder && 'illustrationLayout' in rawHolder
      ? rawHolder.illustrationLayout
      : (rawHolder as Partial<StarIllustrationLayout> | undefined);

  if (!raw) {
    return { offsetX: fallbackOffsetX, offsetY: 0, scale: 1 };
  }

  const offsetX =
    typeof raw.offsetX === 'number' && Number.isFinite(raw.offsetX)
      ? Math.max(-100, Math.min(100, Math.round(raw.offsetX)))
      : fallbackOffsetX;
  const offsetY =
    typeof raw.offsetY === 'number' && Number.isFinite(raw.offsetY)
      ? Math.max(-100, Math.min(100, Math.round(raw.offsetY)))
      : 0;
  const scale =
    typeof raw.scale === 'number' && Number.isFinite(raw.scale)
      ? Math.max(0.65, Math.min(1.45, Number(raw.scale.toFixed(2))))
      : 1;

  return { offsetX, offsetY, scale };
}

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

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

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

/** Classifies real viewports into phone (portrait & compact landscape like 390×844 / 844×390) vs desktop */
export function resolveViewportDeviceMode(
  width: number,
  height: number,
): DeviceLayoutKey {
  const minSide = Math.min(width, height);
  if (minSide < 540 || width < 640) return 'phone';
  return 'desktop';
}

export const DEFAULT_CONSTELLATION_LAYOUT: Record<
  DeviceLayoutKey,
  DeviceConstellationLayout
> = {
  phone: { offsetX: 0, offsetY: 8, scale: 0.78 },
  desktop: { offsetX: 0, offsetY: 0, scale: 1 },
};

export const DEFAULT_CARD_LAYOUT: Record<DeviceLayoutKey, DeviceCardLayout> = {
  phone: { padding: 'compact', verticalAlign: 'center', width: 'standard', offsetY: 0, scale: 1 },
  desktop: { padding: 'normal', verticalAlign: 'center', width: 'standard', offsetY: 0, scale: 1 },
};

export function getDefaultDeviceTextLayout(device: DeviceLayoutKey): DeviceTextLayout {
  return device === 'phone'
    ? {
        fontSize: 16,
        textAlign: 'auto',
        lineHeight: 1.55,
        offsetX: 0,
        offsetY: 0,
        widthPct: 100,
      }
    : {
        fontSize: 17,
        textAlign: 'auto',
        lineHeight: 1.6,
        offsetX: 0,
        offsetY: 0,
        widthPct: 100,
      };
}

export function getDefaultDeviceIllustrationLayout(
  device: DeviceLayoutKey,
): StarIllustrationLayout {
  return device === 'phone'
    ? { offsetX: 0, offsetY: 0, scale: 1 }
    : { offsetX: -100, offsetY: 0, scale: 1 };
}

export function getDefaultDeviceDecorLayout(
  device: DeviceLayoutKey,
): DeviceDecorLayout {
  return device === 'phone'
    ? { xPct: 89, yPct: 12, scale: 0.84 }
    : { xPct: 90, yPct: 14, scale: 0.94 };
}

export function resolveDeviceTextLayout(
  raw: Partial<DeviceTextLayout> | undefined,
  device: DeviceLayoutKey,
  legacyStyle?: Partial<StarTextStyle>,
): DeviceTextLayout {
  const fallback = getDefaultDeviceTextLayout(device);
  const src = raw ?? legacyStyle;
  if (!src) return { ...fallback };

  const fontSize =
    typeof src.fontSize === 'number' && Number.isFinite(src.fontSize)
      ? Math.max(12, Math.min(28, Math.round(src.fontSize)))
      : fallback.fontSize;
  const textAlign: MessageTextAlign | 'auto' =
    src.textAlign === 'left' || src.textAlign === 'center' || src.textAlign === 'right'
      ? src.textAlign
      : 'auto';
  const lineHeight =
    typeof src.lineHeight === 'number' && Number.isFinite(src.lineHeight)
      ? Math.max(1.2, Math.min(2.0, Number(src.lineHeight.toFixed(2))))
      : fallback.lineHeight;
  const offsetX =
    typeof src.offsetX === 'number' && Number.isFinite(src.offsetX)
      ? Math.max(-100, Math.min(100, Math.round(src.offsetX)))
      : fallback.offsetX;
  const offsetY =
    typeof src.offsetY === 'number' && Number.isFinite(src.offsetY)
      ? Math.max(-100, Math.min(100, Math.round(src.offsetY)))
      : fallback.offsetY;
  const widthPct =
    typeof src.widthPct === 'number' && Number.isFinite(src.widthPct)
      ? Math.max(38, Math.min(100, Math.round(src.widthPct)))
      : fallback.widthPct;

  return { fontSize, textAlign, lineHeight, offsetX, offsetY, widthPct };
}

export function resolveEffectiveStarTextStyle(
  star: Pick<ConstellationStar, 'textStyle' | 'deviceLayouts'> | undefined,
  device: DeviceLayoutKey,
): StarTextStyle {
  const base = resolveStarTextStyle(star?.textStyle);
  const devText = resolveDeviceTextLayout(
    star?.deviceLayouts?.[device]?.text,
    device,
    star?.textStyle,
  );
  return { ...base, ...devText };
}

export function resolveEffectiveFinalTextStyle(
  project: Pick<ConstellationProject, 'finalTextStyle' | 'deviceLayouts' | 'cardTheme' | 'cardColors'>,
  device: DeviceLayoutKey,
): StarTextStyle {
  const cardTheme = resolveCardTheme(project.cardTheme);
  const cardColors = resolveCardColors(project);
  const base = project.finalTextStyle
    ? resolveStarTextStyle(project.finalTextStyle)
    : resolveStarTextStyle({
        fontId: cardTheme.defaultFontId,
        color: cardColors.textColor,
        shadow: cardTheme.defaultTextShadow,
        accent: cardTheme.defaultTextAccent,
      });
  const devText = resolveDeviceTextLayout(
    project.deviceLayouts?.[device]?.finalText,
    device,
    project.finalTextStyle,
  );
  return { ...base, ...devText };
}

export function resolveEffectiveIllustrationLayout(
  star: Pick<ConstellationStar, 'illustrationLayout' | 'deviceLayouts'> | undefined,
  device: DeviceLayoutKey,
): StarIllustrationLayout {
  const devIllu = star?.deviceLayouts?.[device]?.illustration;
  const fallback = getDefaultDeviceIllustrationLayout(device);
  if (devIllu) {
    return resolveStarIllustrationLayout(devIllu, fallback.offsetX);
  }
  if (star?.illustrationLayout) {
    return resolveStarIllustrationLayout(star.illustrationLayout, fallback.offsetX);
  }
  return { ...fallback };
}

export function resolveDeviceDecorLayout(
  raw: Partial<DeviceDecorLayout> | undefined,
  device: DeviceLayoutKey,
  legacyDecor?: Partial<StarDecorSettings>,
): DeviceDecorLayout {
  const fallback = getDefaultDeviceDecorLayout(device);
  const src = raw ?? legacyDecor;
  if (!src) return { ...fallback };
  const xPct =
    typeof src.xPct === 'number' && Number.isFinite(src.xPct)
      ? Math.max(6, Math.min(94, Math.round(src.xPct)))
      : fallback.xPct;
  const yPct =
    typeof src.yPct === 'number' && Number.isFinite(src.yPct)
      ? Math.max(6, Math.min(88, Math.round(src.yPct)))
      : fallback.yPct;
  const scale =
    typeof src.scale === 'number' && Number.isFinite(src.scale)
      ? Math.max(0.7, Math.min(1.45, Number(src.scale.toFixed(2))))
      : fallback.scale;
  return { xPct, yPct, scale };
}

export function resolveEffectiveStarDecor(
  star: Pick<ConstellationStar, 'decor' | 'deviceLayouts'> | undefined,
  device: DeviceLayoutKey,
): StarDecorSettings {
  const base = resolveStarDecor(star?.decor);
  const devDecor = resolveDeviceDecorLayout(
    star?.deviceLayouts?.[device]?.decor,
    device,
    star?.decor,
  );
  return { motif: base.motif, ...devDecor };
}

export function resolveEffectiveFinalDecor(
  project: Pick<ConstellationProject, 'finalDecor' | 'deviceLayouts'>,
  device: DeviceLayoutKey,
): StarDecorSettings {
  const base = resolveStarDecor(project.finalDecor);
  const devDecor = resolveDeviceDecorLayout(
    project.deviceLayouts?.[device]?.finalDecor,
    device,
    project.finalDecor,
  );
  return { motif: base.motif, ...devDecor };
}

export function resolveEffectiveConstellationLayout(
  project: Pick<ConstellationProject, 'deviceLayouts'> | undefined,
  device: DeviceLayoutKey,
): DeviceConstellationLayout {
  const fallback = DEFAULT_CONSTELLATION_LAYOUT[device];
  const raw = project?.deviceLayouts?.[device]?.constellation;
  if (!raw) return { ...fallback };
  const offsetX =
    typeof raw.offsetX === 'number' && Number.isFinite(raw.offsetX)
      ? Math.max(-100, Math.min(100, Math.round(raw.offsetX)))
      : fallback.offsetX;
  const offsetY =
    typeof raw.offsetY === 'number' && Number.isFinite(raw.offsetY)
      ? Math.max(-100, Math.min(100, Math.round(raw.offsetY)))
      : fallback.offsetY;
  const scale =
    typeof raw.scale === 'number' && Number.isFinite(raw.scale)
      ? Math.max(0.55, Math.min(1.45, Number(raw.scale.toFixed(2))))
      : fallback.scale;
  return { offsetX, offsetY, scale };
}

export function resolveEffectiveCardLayout(
  project: Pick<ConstellationProject, 'deviceLayouts'> | undefined,
  device: DeviceLayoutKey,
): DeviceCardLayout {
  const fallback = DEFAULT_CARD_LAYOUT[device];
  const raw = project?.deviceLayouts?.[device]?.card;
  if (!raw) return { ...fallback };
  const padding: CardPaddingPreset =
    raw.padding === 'compact' || raw.padding === 'normal' || raw.padding === 'spacious'
      ? raw.padding
      : fallback.padding;
  const verticalAlign: CardVerticalAlign =
    raw.verticalAlign === 'top' || raw.verticalAlign === 'center' || raw.verticalAlign === 'spread'
      ? raw.verticalAlign
      : fallback.verticalAlign;
  const width: CardWidthPreset =
    raw.width === 'compact' || raw.width === 'standard' || raw.width === 'wide'
      ? raw.width
      : fallback.width;
  const offsetY =
    typeof raw.offsetY === 'number' && Number.isFinite(raw.offsetY)
      ? Math.max(-60, Math.min(60, Math.round(raw.offsetY)))
      : fallback.offsetY;
  const scale =
    typeof raw.scale === 'number' && Number.isFinite(raw.scale)
      ? Math.max(0.55, Math.min(1.25, Number(raw.scale.toFixed(2))))
      : 1;
  const minW = device === 'phone' ? 240 : 340;
  const maxW = device === 'phone' ? 366 : 840;
  const maxH = device === 'phone' ? 640 : 560;
  const customWidthPx =
    typeof raw.customWidthPx === 'number' && Number.isFinite(raw.customWidthPx)
      ? Math.max(minW, Math.min(maxW, Math.round(raw.customWidthPx)))
      : undefined;
  const customHeightPx =
    typeof raw.customHeightPx === 'number' && Number.isFinite(raw.customHeightPx)
      ? Math.max(220, Math.min(maxH, Math.round(raw.customHeightPx)))
      : undefined;
  return {
    padding,
    verticalAlign,
    width,
    offsetY,
    scale,
    ...(customWidthPx !== undefined ? { customWidthPx } : {}),
    ...(customHeightPx !== undefined ? { customHeightPx } : {}),
  };
}

const SHARED_TEXT_STYLE_KEYS = new Set<keyof StarTextStyle>([
  'fontId',
  'fontWeight',
  'color',
  'shadow',
  'accent',
]);

export function buildStarTextDevicePatch(
  star: ConstellationStar,
  device: DeviceLayoutKey,
  patch: Partial<StarTextStyle>,
): Partial<ConstellationStar> {
  const hasSharedStyleChange = Object.keys(patch).some((k) =>
    SHARED_TEXT_STYLE_KEYS.has(k as keyof StarTextStyle),
  );
  const currentShared = resolveStarTextStyle(star.textStyle);
  const currentDeviceText = resolveDeviceTextLayout(
    star.deviceLayouts?.[device]?.text,
    device,
    star.textStyle,
  );

  const nextDeviceText = resolveDeviceTextLayout(
    { ...currentDeviceText, ...patch },
    device,
  );

  const result: Partial<ConstellationStar> = {
    deviceLayouts: {
      ...star.deviceLayouts,
      [device]: {
        ...star.deviceLayouts?.[device],
        text: nextDeviceText,
      },
    },
  };

  if (hasSharedStyleChange) {
    result.textStyle = resolveStarTextStyle({
      ...currentShared,
      fontId: patch.fontId ?? currentShared.fontId,
      fontWeight: patch.fontWeight ?? currentShared.fontWeight,
      color: patch.color ?? currentShared.color,
      shadow: patch.shadow ?? currentShared.shadow,
      accent: patch.accent ?? currentShared.accent,
    });
  }

  return result;
}

export function buildStarIllustrationDevicePatch(
  star: ConstellationStar,
  device: DeviceLayoutKey,
  patch: Partial<StarIllustrationLayout>,
): Partial<ConstellationStar> {
  const current = resolveEffectiveIllustrationLayout(star, device);
  const next = resolveStarIllustrationLayout(
    { ...current, ...patch },
    getDefaultDeviceIllustrationLayout(device).offsetX,
  );
  return {
    deviceLayouts: {
      ...star.deviceLayouts,
      [device]: {
        ...star.deviceLayouts?.[device],
        illustration: next,
      },
    },
  };
}

export function buildStarDecorDevicePatch(
  star: ConstellationStar,
  device: DeviceLayoutKey,
  patch: Partial<StarDecorSettings>,
): Partial<ConstellationStar> {
  const currentDecor = resolveStarDecor(star.decor);
  const currentDeviceDecor = resolveDeviceDecorLayout(
    star.deviceLayouts?.[device]?.decor,
    device,
    star.decor,
  );
  const nextDeviceDecor = resolveDeviceDecorLayout(
    { ...currentDeviceDecor, ...patch },
    device,
  );

  const result: Partial<ConstellationStar> = {
    deviceLayouts: {
      ...star.deviceLayouts,
      [device]: {
        ...star.deviceLayouts?.[device],
        decor: nextDeviceDecor,
      },
    },
  };

  if (patch.motif !== undefined) {
    result.decor = resolveStarDecor({
      ...currentDecor,
      motif: patch.motif,
    });
  }

  return result;
}

export function buildProjectConstellationDevicePatch(
  project: ConstellationProject,
  device: DeviceLayoutKey,
  patch: Partial<DeviceConstellationLayout>,
): Partial<ConstellationProject> {
  const current = resolveEffectiveConstellationLayout(project, device);
  const next = resolveEffectiveConstellationLayout(
    {
      deviceLayouts: {
        ...project.deviceLayouts,
        [device]: {
          ...project.deviceLayouts?.[device],
          constellation: { ...current, ...patch },
        },
      },
    },
    device,
  );
  return {
    deviceLayouts: {
      ...project.deviceLayouts,
      [device]: {
        ...project.deviceLayouts?.[device],
        constellation: next,
      },
    },
  };
}

export function buildProjectCardDevicePatch(
  project: ConstellationProject,
  device: DeviceLayoutKey,
  patch: Partial<DeviceCardLayout>,
): Partial<ConstellationProject> {
  const current = resolveEffectiveCardLayout(project, device);
  const next = resolveEffectiveCardLayout(
    {
      deviceLayouts: {
        ...project.deviceLayouts,
        [device]: {
          ...project.deviceLayouts?.[device],
          card: { ...current, ...patch },
        },
      },
    },
    device,
  );
  return {
    deviceLayouts: {
      ...project.deviceLayouts,
      [device]: {
        ...project.deviceLayouts?.[device],
        card: next,
      },
    },
  };
}

export function buildProjectFinalTextDevicePatch(
  project: ConstellationProject,
  device: DeviceLayoutKey,
  patch: Partial<StarTextStyle>,
): Partial<ConstellationProject> {
  const hasSharedStyleChange = Object.keys(patch).some((k) =>
    SHARED_TEXT_STYLE_KEYS.has(k as keyof StarTextStyle),
  );
  const cardTheme = resolveCardTheme(project.cardTheme);
  const cardColors = resolveCardColors(project);
  const currentShared = project.finalTextStyle
    ? resolveStarTextStyle(project.finalTextStyle)
    : resolveStarTextStyle({
        fontId: cardTheme.defaultFontId,
        color: cardColors.textColor,
        shadow: cardTheme.defaultTextShadow,
        accent: cardTheme.defaultTextAccent,
      });
  const currentDeviceText = resolveDeviceTextLayout(
    project.deviceLayouts?.[device]?.finalText,
    device,
    project.finalTextStyle,
  );
  const nextDeviceText = resolveDeviceTextLayout(
    { ...currentDeviceText, ...patch },
    device,
  );

  const result: Partial<ConstellationProject> = {
    deviceLayouts: {
      ...project.deviceLayouts,
      [device]: {
        ...project.deviceLayouts?.[device],
        finalText: nextDeviceText,
      },
    },
  };

  if (hasSharedStyleChange) {
    result.finalTextStyle = resolveStarTextStyle({
      ...currentShared,
      fontId: patch.fontId ?? currentShared.fontId,
      fontWeight: patch.fontWeight ?? currentShared.fontWeight,
      color: patch.color ?? currentShared.color,
      shadow: patch.shadow ?? currentShared.shadow,
      accent: patch.accent ?? currentShared.accent,
    });
  }

  return result;
}

export function buildProjectFinalDecorDevicePatch(
  project: ConstellationProject,
  device: DeviceLayoutKey,
  patch: Partial<StarDecorSettings>,
): Partial<ConstellationProject> {
  const currentDecor = resolveStarDecor(project.finalDecor);
  const currentDeviceDecor = resolveDeviceDecorLayout(
    project.deviceLayouts?.[device]?.finalDecor,
    device,
    project.finalDecor,
  );
  const nextDeviceDecor = resolveDeviceDecorLayout(
    { ...currentDeviceDecor, ...patch },
    device,
  );

  const result: Partial<ConstellationProject> = {
    deviceLayouts: {
      ...project.deviceLayouts,
      [device]: {
        ...project.deviceLayouts?.[device],
        finalDecor: nextDeviceDecor,
      },
    },
  };

  if (patch.motif !== undefined) {
    result.finalDecor = resolveStarDecor({
      ...currentDecor,
      motif: patch.motif,
    });
  }

  return result;
}

/** Resets ONLY the target device's layout (constellation, card padding/composition, text & illustration & decor placement) without modifying content or the other device. */
export function resetDeviceLayoutInProject(
  project: ConstellationProject,
  device: DeviceLayoutKey,
): ConstellationProject {
  const nextProjectEntry: ProjectDeviceLayoutEntry = {
    constellation: { ...DEFAULT_CONSTELLATION_LAYOUT[device] },
    card: { ...DEFAULT_CARD_LAYOUT[device] },
    finalText: getDefaultDeviceTextLayout(device),
    finalDecor: getDefaultDeviceDecorLayout(device),
  };

  return {
    ...project,
    deviceLayouts: {
      ...project.deviceLayouts,
      [device]: nextProjectEntry,
    },
    stars: project.stars.map((star) => ({
      ...star,
      deviceLayouts: {
        ...star.deviceLayouts,
        [device]: {
          text: getDefaultDeviceTextLayout(device),
          illustration: getDefaultDeviceIllustrationLayout(device),
          decor: getDefaultDeviceDecorLayout(device),
        } satisfies StarDeviceLayoutEntry,
      },
    })),
  };
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

export const ENVELOPE_COLOR_SWATCHES: Array<{ hex: string; name: string }> = [
  { hex: '#ECEAF8', name: 'Жемчужное стекло' },
  { hex: '#6D54B5', name: 'Глубокий индиго' },
  { hex: '#3B2C68', name: 'Космический фиолет' },
  { hex: '#1E3A5F', name: 'Полночный сапфир' },
  { hex: '#F5E6DC', name: 'Тёплый шёлк' },
  { hex: '#6E2B57', name: 'Сливовый бархат' },
];

export const SEAL_COLOR_SWATCHES: Array<{ hex: string; name: string }> = [
  { hex: '#FDE68A', name: 'Солнечное золото' },
  { hex: '#F59E0B', name: 'Янтарная звезда' },
  { hex: '#C4B5FD', name: 'Лунная сирень' },
  { hex: '#F9A8D4', name: 'Розовый кварц' },
  { hex: '#67E8F9', name: 'Небесный лёд' },
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
export const ENVELOPE_OFFSET_MIN = -100;
export const ENVELOPE_OFFSET_MAX = 100;

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

export interface StarIdeaItem {
  id: string;
  title: string;
  message: string;
}

export const STAR_IDEAS_BY_OCCASION: Record<'mothers_day' | 'new_year', StarIdeaItem[]> = {
  mothers_day: [
    {
      id: 'md_warmth',
      title: 'Тёплые объятия',
      message: 'Мама, спасибо за твои самые нежные объятия, которые согревают в любой день!',
    },
    {
      id: 'md_smile',
      title: 'Сияние улыбки',
      message: 'Когда ты улыбаешься, вокруг сразу становится светлее, уютнее и радостнее.',
    },
    {
      id: 'md_care',
      title: 'Волшебная забота',
      message: 'Спасибо за каждый вкусный завтрак, добрый совет и твою заботу обо мне.',
    },
    {
      id: 'md_walk',
      title: 'Время вдвоём',
      message: 'Очень люблю наши прогулки, секреты и смешные истории перед сном.',
    },
    {
      id: 'md_dream',
      title: 'Мечтай о чуде',
      message: 'Пусть у тебя всегда будет время для отдыха, любимых книг и твоих мечтаний!',
    },
    {
      id: 'md_sun',
      title: 'Главное солнышко',
      message: 'Ты — самое яркое солнце в моей вселенной! Люблю тебя всем сердцем.',
    },
  ],
  new_year: [
    {
      id: 'ny_magic',
      title: 'Волшебная ночь',
      message: 'Пусть под бой курантов исполнится самое заветное и доброе желание!',
    },
    {
      id: 'ny_snow',
      title: 'Искры снежинок',
      message: 'Желаю уютных зимних вечеров, пушистого снега и весёлых прогулок.',
    },
    {
      id: 'ny_gifts',
      title: 'Сюрприз под ёлкой',
      message: 'Пусть весь новый год будет полон приятных сюрпризов и счастливых моментов!',
    },
    {
      id: 'ny_friends',
      title: 'Смех и друзья',
      message: 'Пусть рядом всегда будут верные друзья, с которыми тепло в любой мороз.',
    },
    {
      id: 'ny_dreams',
      title: 'Полёт к мечтам',
      message: 'Смело загадывай самые яркие мечты — пусть они сбываются быстрее комет!',
    },
    {
      id: 'ny_cozy',
      title: 'Тепло дома',
      message: 'Пусть дома всегда пахнет мандаринами, звучит смех и царит согласие.',
    },
  ],
};

export const EXTRA_OCCASION_IDEAS: Partial<Record<OccasionId, StarIdeaItem[]>> = {
  birthday: [
    {
      id: 'bd_wish',
      title: 'Загадай желание',
      message: 'Пусть этот день принесёт миллион улыбок, подарков и самых ярких эмоций!',
    },
    {
      id: 'bd_shine',
      title: 'Сияй как звезда',
      message: 'Верь в себя и смело иди к мечтам — у тебя всё обязательно получится!',
    },
    {
      id: 'bd_fun',
      title: 'Море приключений',
      message: 'Пусть каждый месяц нового года будет интереснее и веселее предыдущего!',
    },
  ],
  teachers_day: [
    {
      id: 'td_light',
      title: 'Искра открытий',
      message: 'Спасибо, что учите нас не бояться сложных задач и радоваться новым знаниям!',
    },
    {
      id: 'td_thanks',
      title: 'Слова благодарности',
      message: 'От всей души желаем вдохновения, терпения и самых дружных учеников!',
    },
    {
      id: 'td_kind',
      title: 'Доброе сердце',
      message: 'Ваша поддержка и вера в нас помогают зажигать настоящие звёзды!',
    },
  ],
  custom: [
    {
      id: 'cu_shine',
      title: 'Звезда радости',
      message: 'Пусть каждый твой день начинается с хорошего настроения и светлой улыбки!',
    },
    {
      id: 'cu_heart',
      title: 'Спасибо, что рядом',
      message: 'Очень ценю наши тёплые разговоры, смех и поддержку в любую минуту.',
    },
    {
      id: 'cu_dream',
      title: 'Счастливый полёт',
      message: 'Пусть все добрые мечты сбываются легко и приносят настоящее счастье!',
    },
  ],
};

export function getStarIdeasForCategory(
  category: 'mothers_day' | 'new_year' | OccasionId,
): StarIdeaItem[] {
  if (category === 'mothers_day' || category === 'new_year') {
    return STAR_IDEAS_BY_OCCASION[category];
  }
  return EXTRA_OCCASION_IDEAS[category] ?? STAR_IDEAS_BY_OCCASION.mothers_day;
}

export function isPresetOrIdeaStarText(
  title: string,
  message: string,
): boolean {
  const t = title.trim();
  const m = message.trim();
  const defaultTitleMatch = /^Звезда\s+\d+$/.test(t);
  if ((!t || defaultTitleMatch) && !m) return true;

  for (const preset of OCCASION_PRESETS) {
    for (const st of preset.starterStars) {
      if ((t === st.title || !t || defaultTitleMatch) && (m === st.message || !m)) {
        return true;
      }
    }
  }

  const allIdeas = [
    ...STAR_IDEAS_BY_OCCASION.mothers_day,
    ...STAR_IDEAS_BY_OCCASION.new_year,
    ...(EXTRA_OCCASION_IDEAS.birthday ?? []),
    ...(EXTRA_OCCASION_IDEAS.teachers_day ?? []),
    ...(EXTRA_OCCASION_IDEAS.custom ?? []),
  ];
  for (const idea of allIdeas) {
    if ((t === idea.title || !t || defaultTitleMatch) && (m === idea.message || !m)) {
      return true;
    }
  }

  return false;
}

export function resolveStarShape(star: Partial<ConstellationStar>): StarShapeId {
  if (star.shape && VALID_STAR_SHAPES.has(star.shape)) {
    return star.shape;
  }
  return 'star';
}

export function makeConnectionId(a: string, b: string): string {
  const [first, second] = a < b ? [a, b] : [b, a];
  return `conn_${first}__${second}`;
}

export function hasConnection(
  connections: StarConnection[],
  a: string,
  b: string,
): boolean {
  return connections.some(
    (c) => (c.from === a && c.to === b) || (c.from === b && c.to === a),
  );
}

export function buildLegacySequentialConnections(
  stars: Pick<ConstellationStar, 'id'>[],
): StarConnection[] {
  const list: StarConnection[] = [];
  for (let i = 0; i < stars.length - 1; i++) {
    const from = stars[i].id;
    const to = stars[i + 1].id;
    if (from !== to && !hasConnection(list, from, to)) {
      list.push({ id: makeConnectionId(from, to), from, to });
    }
  }
  return list;
}

export function sanitizeConnections(
  connections: StarConnection[] | undefined,
  stars: Pick<ConstellationStar, 'id'>[],
): StarConnection[] {
  if (!Array.isArray(connections)) {
    return buildLegacySequentialConnections(stars);
  }
  const starIds = new Set(stars.map((s) => s.id));
  const seen = new Set<string>();
  const clean: StarConnection[] = [];

  for (const conn of connections) {
    if (!conn || !conn.from || !conn.to || conn.from === conn.to) continue;
    if (!starIds.has(conn.from) || !starIds.has(conn.to)) continue;
    const key = conn.from < conn.to ? `${conn.from}__${conn.to}` : `${conn.to}__${conn.from}`;
    if (seen.has(key)) continue;
    seen.add(key);
    clean.push({
      id: conn.id || `conn_${key}`,
      from: conn.from,
      to: conn.to,
    });
  }
  return clean;
}

function normalizeStarDeviceLayouts(star: ConstellationStar): StarDeviceLayouts {
  const normalizeEntry = (device: DeviceLayoutKey): StarDeviceLayoutEntry => ({
    text: resolveDeviceTextLayout(
      star.deviceLayouts?.[device]?.text,
      device,
      star.textStyle,
    ),
    illustration: resolveEffectiveIllustrationLayout(star, device),
    decor: resolveDeviceDecorLayout(
      star.deviceLayouts?.[device]?.decor,
      device,
      star.decor,
    ),
  });
  return {
    phone: normalizeEntry('phone'),
    desktop: normalizeEntry('desktop'),
  };
}

function normalizeProjectDeviceLayouts(
  project: ConstellationProject,
): ProjectDeviceLayouts {
  const normalizeEntry = (device: DeviceLayoutKey): ProjectDeviceLayoutEntry => ({
    constellation: resolveEffectiveConstellationLayout(project, device),
    card: resolveEffectiveCardLayout(project, device),
    finalText: resolveDeviceTextLayout(
      project.deviceLayouts?.[device]?.finalText,
      device,
      project.finalTextStyle,
    ),
    finalDecor: resolveDeviceDecorLayout(
      project.deviceLayouts?.[device]?.finalDecor,
      device,
      project.finalDecor,
    ),
  });
  return {
    phone: normalizeEntry('phone'),
    desktop: normalizeEntry('desktop'),
  };
}

/** Safe migration & normalization for both newly created and legacy IndexedDB projects */
export function normalizeProject(project: ConstellationProject): ConstellationProject {
  const cardTheme =
    project.cardTheme && VALID_CARD_THEME_IDS.has(project.cardTheme)
      ? project.cardTheme
      : undefined;
  const cardColors = sanitizeCardColors(project.cardColors);
  const needsLegacyMinimalistInkMigration =
    cardTheme === 'minimalist' && !cardColors?.surfaceBg && !cardColors?.textColor;

  const migrateLegacyTextStyle = (
    rawStyle?: StarTextStyle,
  ): StarTextStyle | undefined => {
    if (!rawStyle) return undefined;
    const resolved = resolveStarTextStyle(rawStyle);
    if (needsLegacyMinimalistInkMigration && isHexLight(resolved.color)) {
      return {
        ...resolved,
        color: CARD_THEMES.minimalist.defaultTextColor,
        shadow: resolved.shadow === 'soft' ? 'none' : resolved.shadow,
      };
    }
    return resolved;
  };

  const stars: ConstellationStar[] = (project.stars ?? []).map((s, idx) => ({
    ...s,
    order: typeof s.order === 'number' ? s.order : idx,
    shape: resolveStarShape(s),
    glowColor: s.glowColor ?? 'inherit',
    imageSettings: s.imageSettings ? resolveStarImageSettings(s) : undefined,
    illustrationLayout: s.illustrationLayout
      ? resolveStarIllustrationLayout(s.illustrationLayout)
      : undefined,
    textStyle: migrateLegacyTextStyle(s.textStyle),
    decor: s.decor ? resolveStarDecor(s.decor) : undefined,
    deviceLayouts: normalizeStarDeviceLayouts(s),
  }));

  const connections = sanitizeConnections(
    (project as Partial<ConstellationProject>).connections,
    stars,
  );

  const normalizedBase: ConstellationProject = {
    ...project,
    composition: project.composition ?? 'free',
    constellationAnimation: resolveConstellationAnimation(project),
    cardTheme,
    cardColors,
    envelopeSettings: sanitizeEnvelopeSettings(project.envelopeSettings),
    stars,
    connections,
    finalTextStyle: migrateLegacyTextStyle(project.finalTextStyle),
    finalDecor: project.finalDecor ? resolveStarDecor(project.finalDecor) : undefined,
  };

  return {
    ...normalizedBase,
    deviceLayouts: normalizeProjectDeviceLayouts(normalizedBase),
  };
}

export function applyCompositionPreset(
  stars: ConstellationStar[],
  presetId: CompositionPresetId,
): { stars: ConstellationStar[]; connections: StarConnection[] } {
  const count = stars.length;
  if (count === 0) {
    return { stars: [], connections: [] };
  }

  let nextPositions: StarPosition3D[] = [];
  const edgePairs: Array<[number, number]> = [];

  if (presetId === 'heart') {
    if (count <= 5) {
      // 4 symmetric heart outline stars + 1 glowing center star
      nextPositions = [
        { x: -2.25, y: 1.35, z: -0.35 },
        { x: 0, y: 0.72, z: 0.85 },
        { x: 2.25, y: 1.35, z: -0.35 },
        { x: 0, y: -2.25, z: 0.35 },
        { x: 0, y: -0.45, z: 1.15 },
      ];
      edgePairs.push([0, 1], [1, 2], [2, 3], [3, 0], [1, 4]);
    } else if (count === 6) {
      // 6 symmetric heart contour points
      nextPositions = [
        { x: 0, y: 0.78, z: 0.75 },
        { x: 1.85, y: 1.75, z: -0.3 },
        { x: 2.55, y: -0.15, z: 0.45 },
        { x: 0, y: -2.25, z: 0.25 },
        { x: -2.55, y: -0.15, z: 0.45 },
        { x: -1.85, y: 1.75, z: -0.3 },
      ];
      edgePairs.push([0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]);
    } else if (count === 7) {
      // 6 heart contour points + 1 center heart star
      nextPositions = [
        { x: 0, y: 0.78, z: 0.65 },
        { x: 1.85, y: 1.75, z: -0.3 },
        { x: 2.55, y: -0.15, z: 0.45 },
        { x: 0, y: -2.25, z: 0.25 },
        { x: -2.55, y: -0.15, z: 0.45 },
        { x: -1.85, y: 1.75, z: -0.3 },
        { x: 0, y: -0.45, z: 1.15 },
      ];
      edgePairs.push([0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [0, 6]);
    } else {
      // Parametric heart contour + 1 center star for 8..20 stars (scaled for extra room)
      const scaleBoost = 1 + Math.max(0, count - 7) * 0.055;
      const contourCount = count - 1;
      for (let i = 0; i < contourCount; i++) {
        const t = (i / contourCount) * Math.PI * 2;
        const hx = 16 * Math.pow(Math.sin(t), 3);
        const hy =
          13 * Math.cos(t) -
          5 * Math.cos(2 * t) -
          2 * Math.cos(3 * t) -
          Math.cos(4 * t);
        const x = Number(((hx / 16) * 2.95 * scaleBoost).toFixed(2));
        const y = Number((((hy + 2.2) / 15) * 2.5 * scaleBoost).toFixed(2));
        const z = Number((Math.cos(t * 2) * 0.55).toFixed(2));
        nextPositions.push({ x, y, z });
        edgePairs.push([i, (i + 1) % contourCount]);
      }
      nextPositions.push({ x: 0, y: -0.25, z: 1.15 });
      edgePairs.push([0, contourCount]);
    }
  } else if (presetId === 'flower') {
    const scaleBoost = 1 + Math.max(0, count - 7) * 0.06;
    const petalCount = count - 1;
    nextPositions.push({ x: 0, y: 0.05, z: 0.95 });
    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2 - Math.PI / 2;
      const x = Number((Math.cos(angle) * 2.85 * scaleBoost).toFixed(2));
      const y = Number((Math.sin(angle) * 2.25 * scaleBoost).toFixed(2));
      const z = Number((i % 2 === 0 ? -0.55 : 0.45).toFixed(2));
      nextPositions.push({ x, y, z });
      edgePairs.push([0, i + 1]);
      if (petalCount >= 3) {
        const nextPetal = ((i + 1) % petalCount) + 1;
        edgePairs.push([i + 1, nextPetal]);
      }
    }
  } else {
    // Free graceful constellation arc (expands cleanly up to 20 stars)
    for (let i = 0; i < count; i++) {
      const fallback = DEFAULT_STAR_POSITIONS[i] ?? {
        x: Number((Math.cos(i * 1.15) * (3.2 + Math.floor(i / 6) * 1.15)).toFixed(2)),
        y: Number((Math.sin(i * 1.15) * (2.1 + Math.floor(i / 6) * 0.72)).toFixed(2)),
        z: computeAutoDepthForIndex(i, i, 0),
      };
      nextPositions.push({ ...fallback });
      if (i < count - 1) {
        edgePairs.push([i, i + 1]);
      }
    }
  }

  const nextStars = stars.map((star, idx) => ({
    ...star,
    position: nextPositions[idx] ? { ...nextPositions[idx] } : { ...star.position },
  }));

  const nextConnections: StarConnection[] = [];
  for (const [aIdx, bIdx] of edgePairs) {
    const a = nextStars[aIdx]?.id;
    const b = nextStars[bIdx]?.id;
    if (a && b && a !== b && !hasConnection(nextConnections, a, b)) {
      nextConnections.push({ id: makeConnectionId(a, b), from: a, to: b });
    }
  }

  return { stars: nextStars, connections: nextConnections };
}

export function createNewProject(
  occasionId: OccasionId = 'birthday',
  customTitle?: string,
  customRecipient?: string,
  composition: CompositionPresetId = 'free',
): ConstellationProject {
  const preset = OCCASION_PRESETS.find((p) => p.id === occasionId) ?? OCCASION_PRESETS[2];
  const now = Date.now();
  const projectId = `proj_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

  const baseStars: ConstellationStar[] = preset.starterStars.map((item, idx) => ({
    id: `star_${idx + 1}_${Math.random().toString(36).slice(2, 6)}`,
    order: idx,
    title: item.title,
    message: item.message,
    illustration: { type: 'builtin', id: item.illustration },
    shape: item.shape ?? 'star',
    glowColor: 'inherit',
    position: { ...DEFAULT_STAR_POSITIONS[idx] },
    isDraft: true,
  }));

  const composed = applyCompositionPreset(baseStars, composition);

  const draft: ConstellationProject = {
    id: projectId,
    title: customTitle?.trim() || preset.defaultTitle,
    recipientName: customRecipient?.trim() || preset.defaultRecipient,
    occasion: preset.id,
    occasionLabel: preset.label,
    paletteId: preset.defaultPalette,
    globalGlowColor: preset.defaultGlow,
    composition,
    stars: composed.stars,
    connections: composed.connections,
    finalMessage: preset.defaultFinalMessage,
    constellationAnimation: 'rotation',
    musicTrackId: 'magical_cover',
    createdAt: now,
    updatedAt: now,
  };

  return normalizeProject(draft);
}

