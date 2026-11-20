import type {
  BuiltinIllustrationId,
  ConstellationProject,
  CosmicPaletteId,
  GlowColorId,
  MusicTrackId,
  OccasionId,
  StarShapeId,
} from '../../types/project';

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
    defaultRecipient: 'Любимой мамы',
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
