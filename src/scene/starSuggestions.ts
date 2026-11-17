import type { OccasionId, StarShapeId } from '../types/project';
import { EXTRA_OCCASION_IDEAS, OCCASION_PRESETS, STAR_IDEAS_BY_OCCASION } from './paletteConfig';

export type RecipientTone =
  | 'mom'
  | 'dad'
  | 'friend'
  | 'teacher'
  | 'birthday'
  | 'new_year'
  | 'warm';

export interface ShapeDisplayMeta {
  id: StarShapeId;
  label: string;
  shortLabel: string;
}

export const SHAPE_DISPLAY_META: Record<StarShapeId, ShapeDisplayMeta> = {
  star: {
    id: 'star',
    label: 'Пятиконечная звезда',
    shortLabel: 'Звезда',
  },
  heart: {
    id: 'heart',
    label: 'Сердце',
    shortLabel: 'Сердце',
  },
  flower: {
    id: 'flower',
    label: 'Цветок',
    shortLabel: 'Цветок',
  },
  moon: {
    id: 'moon',
    label: 'Полумесяц',
    shortLabel: 'Полумесяц',
  },
  comet: {
    id: 'comet',
    label: 'Комета',
    shortLabel: 'Комета',
  },
  planet: {
    id: 'planet',
    label: 'Планета',
    shortLabel: 'Планета',
  },
  spark: {
    id: 'spark',
    label: 'Четырёхконечная звезда',
    shortLabel: 'Искра',
  },
};

export const ORDERED_SHAPE_IDS: StarShapeId[] = [
  'star',
  'heart',
  'flower',
  'moon',
  'comet',
  'planet',
  'spark',
];

export function detectRecipientTone(
  occasion: OccasionId,
  recipientName?: string,
): RecipientTone {
  const lower = (recipientName ?? '').trim().toLowerCase();

  if (/(мам|мамул|мамоч|бабуш|бабул|матер)/.test(lower)) {
    return 'mom';
  }
  if (/(пап|папул|папоч|дедуш|дедул|отц)/.test(lower)) {
    return 'dad';
  }
  if (/(учител|преподав|наставн|тренер|воспитател)/.test(lower)) {
    return 'teacher';
  }
  if (/(друг|подруг|бро|однокласс|брат|сестр)/.test(lower)) {
    return 'friend';
  }

  if (occasion === 'mothers_day') return 'mom';
  if (occasion === 'teachers_day') return 'teacher';
  if (occasion === 'birthday') return 'birthday';
  if (occasion === 'new_year') return 'new_year';

  return 'warm';
}

export function getToneBadgeLabel(
  occasion: OccasionId,
  recipientName?: string,
): string {
  const tone = detectRecipientTone(occasion, recipientName);
  const cleanName = recipientName?.trim();

  if (tone === 'mom') return 'Для мамы и близких';
  if (tone === 'dad') return 'Для папы и дедушки';
  if (tone === 'teacher') return 'Для учителя';
  if (tone === 'friend') return 'Для друга или подруги';
  if (tone === 'birthday') {
    return cleanName ? `Ко дню рождения · ${cleanName}` : 'На день рождения';
  }
  if (tone === 'new_year') return 'К Новому году';
  return cleanName ? `Для: ${cleanName}` : 'Тёплые слова';
}

const SHAPE_BASE_NAMES: Record<StarShapeId, string[]> = {
  star: [
    'Путеводная звезда',
    'Самая яркая звезда',
    'Звезда желаний',
    'Звезда удачи',
    'Главная звезда',
  ],
  heart: [
    'Сердце тепла',
    'Доброе сердце',
    'Звезда любви',
    'Тёплые объятия',
    'Хранитель доброты',
  ],
  flower: [
    'Цветок нежности',
    'Цветок радости',
    'Расцвет улыбок',
    'Цветок вдохновения',
    'Весенний огонёк',
  ],
  moon: [
    'Уютная луна',
    'Лунный свет',
    'Тихая сказка',
    'Полумесяц снов',
    'Тепло вечеров',
  ],
  comet: [
    'Комета мечты',
    'Быстрая удача',
    'Полёт желаний',
    'Огонёк приключений',
    'Стрела вдохновения',
  ],
  planet: [
    'Планета чудес',
    'Мир доброты',
    'Твоя галактика',
    'Планета смеха',
    'Остров спокойствия',
  ],
  spark: [
    'Волшебная искра',
    'Искра смеха',
    'Огонёк радости',
    'Сияние момента',
    'Яркая вспышка',
  ],
};

const SHAPE_TONE_EXTRA_NAME: Record<
  StarShapeId,
  Partial<Record<RecipientTone, string>>
> = {
  star: {
    mom: 'Звезда маминой улыбки',
    dad: 'Звезда силы и опоры',
    friend: 'Звезда нашей дружбы',
    teacher: 'Звезда знаний',
    birthday: 'Звезда праздника',
    new_year: 'Новогодняя звезда',
  },
  heart: {
    mom: 'Мамино сердце',
    dad: 'Надёжное сердце',
    friend: 'Сердце дружбы',
    teacher: 'Сердце благодарности',
    birthday: 'Сердце праздника',
    new_year: 'Зимнее тепло',
  },
  flower: {
    mom: 'Цветы для мамы',
    friend: 'Цветок настроения',
    teacher: 'Цветок признательности',
    birthday: 'Цветок счастья',
    new_year: 'Зимний цветок',
  },
  moon: {
    mom: 'Мамина забота',
    friend: 'Вечера под луной',
    new_year: 'Снежный полумесяц',
    birthday: 'Лунная сказка',
  },
  comet: {
    mom: 'Мечты для тебя',
    friend: 'Комета веселья',
    teacher: 'Комета открытий',
    birthday: 'Комета сюрпризов',
    new_year: 'Новогодняя комета',
  },
  planet: {
    mom: 'Наш уютный мир',
    dad: 'Планета побед',
    friend: 'Планета дружбы',
    teacher: 'Мир новых знаний',
    birthday: 'Планета подарков',
    new_year: 'Планета чудес',
  },
  spark: {
    mom: 'Искра маминого тепла',
    friend: 'Искра приключений',
    teacher: 'Искра вдохновения',
    birthday: 'Праздничный огонёк',
    new_year: 'Новогодний огонёк',
  },
};

export function getShapeNameSuggestions(
  shape: StarShapeId,
  occasion: OccasionId,
  recipientName?: string,
): string[] {
  const tone = detectRecipientTone(occasion, recipientName);
  const extra = SHAPE_TONE_EXTRA_NAME[shape]?.[tone];
  const base = SHAPE_BASE_NAMES[shape] ?? SHAPE_BASE_NAMES.star;
  const combined = extra ? [extra, ...base] : [...base];

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const name of combined) {
    const clean = name.trim().slice(0, 30);
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      unique.push(clean);
    }
  }
  return unique.slice(0, 6);
}

export interface StarMessageSuggestion {
  id: string;
  tag: string;
  text: string;
}

const SHAPE_MESSAGE_FLAIR: Record<StarShapeId, StarMessageSuggestion> = {
  star: {
    id: 'shape_star',
    tag: 'Про форму звезды',
    text: 'Эта звезда сияет специально для тебя — верь в себя и смело загадывай желания!',
  },
  heart: {
    id: 'shape_heart',
    tag: 'Про сердце',
    text: 'В этом сердечке живёт моё самое большое спасибо за тепло, доброту и поддержку.',
  },
  flower: {
    id: 'shape_flower',
    tag: 'Про цветок',
    text: 'Пусть улыбка расцветает на твоём лице так же ярко и нежно, как этот космический цветок!',
  },
  moon: {
    id: 'shape_moon',
    tag: 'Про полумесяц',
    text: 'Пусть каждый твой вечер будет таким же тихим, уютным и добрым, как этот лунный свет.',
  },
  comet: {
    id: 'shape_comet',
    tag: 'Про комету',
    text: 'Пусть эта быстрая комета принесёт тебе удачу, смелые мечты и радостные события!',
  },
  planet: {
    id: 'shape_planet',
    tag: 'Про планету',
    text: 'На этой маленькой планете всегда царят уют, согласие и самые светлые воспоминания.',
  },
  spark: {
    id: 'shape_spark',
    tag: 'Про огонёк',
    text: 'Пусть эта волшебная искра напоминает о самых весёлых и счастливых минутах вместе!',
  },
};

const TONE_MESSAGES: Record<RecipientTone, StarMessageSuggestion[]> = {
  mom: [
    {
      id: 'mom_1',
      tag: 'Для мамы',
      text: 'Спасибо за твои добрые объятия, заботу и тепло, которое согревает каждый день!',
    },
    {
      id: 'mom_2',
      tag: 'Улыбка',
      text: 'Пусть поводов для улыбки будет бесконечно много, а дома всегда будет спокойно и радостно.',
    },
    {
      id: 'mom_3',
      tag: 'Отдых и мечты',
      text: 'Желаю тебе больше свободного времени для любимых дел, прогулок и счастливого отдыха.',
    },
    {
      id: 'mom_4',
      tag: 'Рядом',
      text: 'Ты — самый родной человек в моей вселенной! Очень люблю наши разговоры и праздники вместе.',
    },
  ],
  dad: [
    {
      id: 'dad_1',
      tag: 'Поддержка',
      text: 'Спасибо за силу, добрые советы и за то, что на тебя всегда можно положиться!',
    },
    {
      id: 'dad_2',
      tag: 'Приключения',
      text: 'Желаю бодрости, новых успехов и побольше интересных прогулок и дел вместе.',
    },
    {
      id: 'dad_3',
      tag: 'Радость',
      text: 'Пусть каждый день приносит хорошее настроение, удачу и гордость за свои дела!',
    },
    {
      id: 'dad_4',
      tag: 'Семья',
      text: 'Рядом с тобой всегда спокойно и весело. Спасибо за всё, чему ты меня учишь!',
    },
  ],
  friend: [
    {
      id: 'friend_1',
      tag: 'Дружба',
      text: 'Спасибо, что с тобой можно и посмеяться от души, и поделиться любым секретом!',
    },
    {
      id: 'friend_2',
      tag: 'Веселье',
      text: 'Желаю крутых приключений, новых открытий и классного настроения каждый день!',
    },
    {
      id: 'friend_3',
      tag: 'Рядом',
      text: 'Классно, что мы дружим! Пусть впереди будет ещё много общих игр, шуток и побед.',
    },
    {
      id: 'friend_4',
      tag: 'Мечты',
      text: 'Пусть все твои идеи получаются, а задуманное сбывается легко и с радостью!',
    },
  ],
  teacher: [
    {
      id: 'teacher_1',
      tag: 'Знания',
      text: 'Спасибо, что делаете каждый урок интересным и помогаете не бояться сложных задач!',
    },
    {
      id: 'teacher_2',
      tag: 'Терпение',
      text: 'Благодарим за внимание, добрую поддержку и веру в каждого из нас.',
    },
    {
      id: 'teacher_3',
      tag: 'Вдохновение',
      text: 'От всей души желаем вам радости, здоровья, вдохновения и дружных учеников!',
    },
    {
      id: 'teacher_4',
      tag: 'Доброта',
      text: 'Пусть ваша доброта возвращается к вам светлыми улыбками каждый день!',
    },
  ],
  birthday: [
    {
      id: 'bd_1',
      tag: 'Праздник',
      text: 'С днём рождения! Пусть этот день подарит миллион улыбок, сюрпризов и тёплых слов!',
    },
    {
      id: 'bd_2',
      tag: 'Мечты',
      text: 'Загадывай самое заветное желание — пусть оно обязательно исполнится в этом году!',
    },
    {
      id: 'bd_3',
      tag: 'Приключения',
      text: 'Желаю верных друзей рядом, ярких путешествий и радостных открытий каждый день.',
    },
    {
      id: 'bd_4',
      tag: 'Таланты',
      text: 'Верь в себя и смело пробуй новое — у тебя обязательно всё получится!',
    },
  ],
  new_year: [
    {
      id: 'ny_1',
      tag: 'Волшебство',
      text: 'Пусть под бой курантов исполнится самое доброе и заветное новогоднее желание!',
    },
    {
      id: 'ny_2',
      tag: 'Уют',
      text: 'Желаю тёплых зимних вечеров, пушистого снега, мандаринов и уютного настроения.',
    },
    {
      id: 'ny_3',
      tag: 'Чудеса',
      text: 'Пусть весь новый год приносит приятные сюрпризы, смех и встречи с друзьями!',
    },
    {
      id: 'ny_4',
      tag: 'Надежды',
      text: 'Пусть в доме всегда царят свет, тепло и маленькие добрые чудеса!',
    },
  ],
  warm: [
    {
      id: 'warm_1',
      tag: 'Улыбка',
      text: 'Пусть каждый твой день начинается с хорошего настроения и светлой улыбки!',
    },
    {
      id: 'warm_2',
      tag: 'Благодарность',
      text: 'Очень ценю наши тёплые разговоры, смех и поддержку в любую минуту.',
    },
    {
      id: 'warm_3',
      tag: 'Мечты',
      text: 'Пусть все добрые мечты сбываются легко и приносят настоящее счастье!',
    },
    {
      id: 'warm_4',
      tag: 'Тепло',
      text: 'Пусть рядом всегда будут любимые люди, уют и повод порадоваться.',
    },
  ],
};

export function getStarMessageSuggestions(
  occasion: OccasionId,
  recipientName: string | undefined,
  shape: StarShapeId,
): StarMessageSuggestion[] {
  const tone = detectRecipientTone(occasion, recipientName);
  const primary = TONE_MESSAGES[tone] ?? TONE_MESSAGES.warm;
  const shapeFlair = SHAPE_MESSAGE_FLAIR[shape] ?? SHAPE_MESSAGE_FLAIR.star;
  return [...primary, shapeFlair];
}

const KNOWN_TITLES = new Set<string>();
const KNOWN_MESSAGES = new Set<string>();

function ensureKnownSetsBuilt() {
  if (KNOWN_TITLES.size > 0) return;

  for (const preset of OCCASION_PRESETS) {
    for (const st of preset.starterStars) {
      KNOWN_TITLES.add(st.title.trim());
      KNOWN_MESSAGES.add(st.message.trim());
    }
  }
  for (const list of Object.values(STAR_IDEAS_BY_OCCASION)) {
    for (const idea of list) {
      KNOWN_TITLES.add(idea.title.trim());
      KNOWN_MESSAGES.add(idea.message.trim());
    }
  }
  for (const list of Object.values(EXTRA_OCCASION_IDEAS)) {
    if (!list) continue;
    for (const idea of list) {
      KNOWN_TITLES.add(idea.title.trim());
      KNOWN_MESSAGES.add(idea.message.trim());
    }
  }
  for (const list of Object.values(SHAPE_BASE_NAMES)) {
    for (const n of list) KNOWN_TITLES.add(n.trim());
  }
  for (const map of Object.values(SHAPE_TONE_EXTRA_NAME)) {
    for (const n of Object.values(map)) {
      if (n) KNOWN_TITLES.add(n.trim());
    }
  }
  for (const list of Object.values(TONE_MESSAGES)) {
    for (const m of list) KNOWN_MESSAGES.add(m.text.trim());
  }
  for (const m of Object.values(SHAPE_MESSAGE_FLAIR)) {
    KNOWN_MESSAGES.add(m.text.trim());
  }
}

export function isPresetOrSuggestedTitle(title: string): boolean {
  const t = title.trim();
  if (!t || /^Звезда\s+\d+$/.test(t)) return true;
  ensureKnownSetsBuilt();
  return KNOWN_TITLES.has(t);
}

export function isPresetOrSuggestedMessage(message: string): boolean {
  const m = message.trim();
  if (!m) return true;
  ensureKnownSetsBuilt();
  return KNOWN_MESSAGES.has(m);
}
