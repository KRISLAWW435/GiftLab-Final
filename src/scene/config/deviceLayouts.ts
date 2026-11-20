import type {
  CardPaddingPreset,
  CardVerticalAlign,
  CardWidthPreset,
  ConstellationProject,
  ConstellationStar,
  DeviceCardLayout,
  DeviceConstellationLayout,
  DeviceDecorLayout,
  DeviceLayoutKey,
  DeviceTextLayout,
  MessageTextAlign,
  ProjectDeviceLayoutEntry,
  StarDecorSettings,
  StarDeviceLayoutEntry,
  StarIllustrationLayout,
  StarImageSettings,
  StarTextStyle,
} from '../../types/project';
import {
  resolveCardColors,
  resolveCardTheme,
  resolveStarDecor,
} from './cardThemesAndDecor';
import { resolveStarTextStyle } from './textStyles';

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
