import { renderBuiltinIllustrationToBlob } from '../assets/illustrations';
import {
  MUSIC_TRACKS,
  resolveCardTheme,
  resolveMusicTrackName,
  resolveStarShape,
  resolveStarTextStyle,
  sanitizeConnections,
} from '../scene/paletteConfig';
import type { BuiltinIllustrationId, ConstellationProject } from '../types/project';
import { getAudioRecord, getImageBlob } from './database';
import { blobToDataUri, formatBytesRu } from './encoding';
import { bundleFontsInlineCss } from './localFonts';
import { resolveProjectMusicForExport } from './musicEngine';
import {
  STANDALONE_CSS,
  escapeHtmlText,
  safeJsonForScriptTag,
  sanitizeFileName,
} from './zipExporter';
import runtimeBundle from '../standalone/runtime.bundle.txt?raw';

export const HTML_LARGE_FILE_WARNING_BYTES = 15 * 1024 * 1024;

export interface StandaloneHtmlEstimate {
  estimatedBytes: number;
  formattedSize: string;
  isLarge: boolean;
  warningMessage: string | null;
  missingResources: string[];
}

export interface StandaloneHtmlExportResult {
  blob: Blob;
  filename: string;
  sizeBytes: number;
  formattedSize: string;
  embeddedSummary: {
    builtinImages: number;
    customImages: number;
    hasMusic: boolean;
    fontsCount: number;
  };
}

function collectUsedFontIds(project: ConstellationProject) {
  const usedFontIds = new Set(
    project.stars.map((s) => resolveStarTextStyle(s).fontId),
  );
  if (project.finalTextStyle) {
    usedFontIds.add(resolveStarTextStyle(project.finalTextStyle).fontId);
  }
  const activeCardTheme = resolveCardTheme(project.cardTheme);
  usedFontIds.add(activeCardTheme.defaultFontId);
  if (activeCardTheme.id === 'minimalist') {
    usedFontIds.add('manrope');
  }
  return usedFontIds;
}

function resolveBuiltinTrackEstimateBytes(trackId: ConstellationProject['musicTrackId']): number {
  if (trackId === 'none' || trackId === 'custom') return 0;
  if (trackId === 'cosmic_genesis') return 2_850_000;
  const isBuiltinMp3 = MUSIC_TRACKS.some((t) => t.id === trackId && Boolean(t.assetPath));
  if (isBuiltinMp3) return 2_650_000;
  return 710_000; // synthesized 16s WAV
}

function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function buildStandaloneHtmlDocument(options: {
  title: string;
  fontFaceCss: string;
  payload: unknown;
  runtimeScript: string;
}): string {
  const safeTitle = escapeHtmlText(options.title.trim() || 'Моё созвездие');
  const safePayloadJson = safeJsonForScriptTag(options.payload);
  if (options.runtimeScript.includes('</script>')) {
    throw new Error('Встроенный код открытки содержит недопустимый тег скрипта.');
  }

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>${safeTitle} — GiftLab</title>
  <style>
  ${options.fontFaceCss}
  ${STANDALONE_CSS}
  </style>
</head>
<body>
  <div id="app"></div>
  <script>window.__GIFTLAB_PAYLOAD__ = ${safePayloadJson};</script>
  <script>${options.runtimeScript}</script>
</body>
</html>`;
}

/**
 * Estimates the resulting single-file standalone HTML size before export,
 * deduplicating shared assets and checking IndexedDB resources without mutating data.
 */
export async function estimateStandaloneHtmlSize(
  project: ConstellationProject,
): Promise<StandaloneHtmlEstimate> {
  let rawMediaBytes = 0;
  const seenCustomImages = new Set<string>();
  const seenBuiltinImages = new Set<string>();
  const missingResources: string[] = [];

  for (let i = 0; i < project.stars.length; i++) {
    const star = project.stars[i];
    if (star.illustration.type === 'builtin') {
      if (!seenBuiltinImages.has(star.illustration.id)) {
        seenBuiltinImages.add(star.illustration.id);
        rawMediaBytes += 32_000;
      }
    } else {
      if (!seenCustomImages.has(star.illustration.id)) {
        seenCustomImages.add(star.illustration.id);
        try {
          const blob = await getImageBlob(star.illustration.id);
          if (!blob || blob.size === 0) {
            missingResources.push(
              `Изображение звезды №${i + 1} («${star.title || 'без названия'}»)`,
            );
          } else {
            rawMediaBytes += blob.size;
          }
        } catch {
          missingResources.push(
            `Изображение звезды №${i + 1} («${star.title || 'без названия'}»)`,
          );
        }
      }
    }
  }

  if (project.musicTrackId === 'custom') {
    if (!project.customMusicId) {
      missingResources.push('Пользовательская музыка не найдена');
    } else {
      try {
        const rec = await getAudioRecord(project.customMusicId);
        if (!rec || !rec.blob || rec.blob.size === 0) {
          missingResources.push(
            `Музыка «${project.customMusicName || 'Своя музыка'}»`,
          );
        } else {
          rawMediaBytes += rec.blob.size;
        }
      } catch {
        missingResources.push(
          `Музыка «${project.customMusicName || 'Своя музыка'}»`,
        );
      }
    }
  } else if (project.musicTrackId !== 'none') {
    rawMediaBytes += resolveBuiltinTrackEstimateBytes(project.musicTrackId);
  }

  const usedFontIds = collectUsedFontIds(project);
  const estimatedFontsRawBytes = usedFontIds.size * 44_000;
  const base64OverheadBytes = Math.ceil(
    ((rawMediaBytes + estimatedFontsRawBytes) / 3) * 4,
  );
  const shellBytes =
    runtimeBundle.length +
    STANDALONE_CSS.length +
    JSON.stringify({
      title: project.title,
      finalMessage: project.finalMessage,
      stars: project.stars.length,
    }).length +
    project.stars.length * 600 +
    4096;

  const estimatedBytes = base64OverheadBytes + shellBytes;
  const formattedSize = formatBytesRu(estimatedBytes);
  const isLarge = estimatedBytes >= HTML_LARGE_FILE_WARNING_BYTES;

  return {
    estimatedBytes,
    formattedSize,
    isLarge,
    warningMessage: isLarge
      ? `Файл получится крупным (~${formattedSize}) из-за встроенных фото и музыки. Скачивание и отправка могут занять немного больше времени.`
      : null,
    missingResources,
  };
}

/**
 * Exports the complete postcard into a single self-contained UTF-8 HTML file
 * with all images, fonts, audio, styles, runtime JS, and project data embedded inline.
 * Works directly from file:// on Android without internet, unzipping, or external assets.
 */
export async function exportProjectToHtml(
  project: ConstellationProject,
): Promise<StandaloneHtmlExportResult> {
  if (!project.stars || project.stars.length === 0) {
    throw new Error('В проекте нет ни одной звезды для экспорта.');
  }

  const builtinDataUriCache = new Map<string, string>();
  const customDataUriCache = new Map<string, string>();
  const standaloneStars = [];

  for (let i = 0; i < project.stars.length; i++) {
    const star = project.stars[i];
    const starLabel = `Звезда №${i + 1} («${star.title || 'без названия'}»)`;
    let assetImagePath = '';

    if (star.illustration.type === 'builtin') {
      const builtinId = star.illustration.id as BuiltinIllustrationId;
      const cached = builtinDataUriCache.get(builtinId);
      if (cached) {
        assetImagePath = cached;
      } else {
        let rendered: { blob: Blob; ext: 'webp' | 'png' };
        try {
          rendered = await renderBuiltinIllustrationToBlob(builtinId, 640);
        } catch (err) {
          const reason = err instanceof Error ? err.message : 'ошибка рендера';
          throw new Error(
            `${starLabel}: не удалось подготовить встроенную иллюстрацию (${reason}).`,
          );
        }
        const fallbackMime = rendered.ext === 'png' ? 'image/png' : 'image/webp';
        assetImagePath = await blobToDataUri(
          rendered.blob,
          fallbackMime,
          `${starLabel} — встроенная иллюстрация`,
        );
        builtinDataUriCache.set(builtinId, assetImagePath);
      }
    } else {
      const customId = star.illustration.id;
      const cached = customDataUriCache.get(customId);
      if (cached) {
        assetImagePath = cached;
      } else {
        const customBlob = await getImageBlob(customId);
        if (!customBlob || customBlob.size === 0) {
          throw new Error(
            `${starLabel}: пользовательское изображение отсутствует в хранилище или повреждено. Выберите иллюстрацию заново.`,
          );
        }
        assetImagePath = await blobToDataUri(
          customBlob,
          'image/webp',
          `${starLabel} — изображение`,
        );
        customDataUriCache.set(customId, assetImagePath);
      }
    }

    standaloneStars.push({
      ...star,
      shape: resolveStarShape(star),
      assetImagePath,
    });

    await yieldToMainThread();
  }

  let musicPath: string | null = null;
  let musicName: string | null = null;

  if (project.musicTrackId === 'custom') {
    const label = project.customMusicName?.trim() || 'Своя музыка';
    if (!project.customMusicId) {
      throw new Error(
        `Выбранная музыка («${label}») не найдена в хранилище. Выберите аудиофайл заново.`,
      );
    }
    const record = await getAudioRecord(project.customMusicId);
    if (!record || !record.blob || record.blob.size === 0) {
      throw new Error(
        `Аудиофайл «${label}» отсутствует в хранилище или повреждён. Загрузите музыку заново.`,
      );
    }
    const lowerName = (record.fileName || '').toLowerCase();
    const fallbackMime =
      lowerName.endsWith('.wav') || (record.mimeType || '').includes('wav')
        ? 'audio/wav'
        : 'audio/mpeg';
    musicPath = await blobToDataUri(record.blob, fallbackMime, label);
    musicName = label;
    await yieldToMainThread();
  } else if (project.musicTrackId !== 'none') {
    const trackLabel = resolveMusicTrackName(project) ?? 'Фоновая музыка';
    const resolvedMusic = await resolveProjectMusicForExport(project);
    if (!resolvedMusic || !resolvedMusic.blob || resolvedMusic.blob.size === 0) {
      throw new Error(
        `Не удалось загрузить музыкальный трек «${trackLabel}». Проверьте выбор музыки или отключите её.`,
      );
    }
    const fallbackMime = resolvedMusic.fileName.toLowerCase().endsWith('.wav')
      ? 'audio/wav'
      : 'audio/mpeg';
    musicPath = await blobToDataUri(
      resolvedMusic.blob,
      fallbackMime,
      resolvedMusic.name,
    );
    musicName = resolvedMusic.name;
    await yieldToMainThread();
  }

  const usedFontIds = collectUsedFontIds(project);
  const fontFaceCss = await bundleFontsInlineCss(usedFontIds);

  const payload = {
    title: project.title,
    recipientName: project.recipientName,
    senderName: project.senderName ?? '',
    occasionLabel: project.occasionLabel,
    paletteId: project.paletteId,
    globalGlowColor: project.globalGlowColor,
    constellationAnimation: project.constellationAnimation ?? 'rotation',
    cardTheme: project.cardTheme,
    cardColors: project.cardColors,
    envelopeSettings: project.envelopeSettings,
    deviceLayouts: project.deviceLayouts,
    stars: standaloneStars,
    connections: sanitizeConnections(project.connections, project.stars),
    finalMessage: project.finalMessage,
    finalTextStyle: project.finalTextStyle,
    finalDecor: project.finalDecor,
    musicPath,
    musicName,
  };

  const html = buildStandaloneHtmlDocument({
    title: project.title,
    fontFaceCss,
    payload,
    runtimeScript: runtimeBundle,
  });

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const sizeBytes = blob.size;

  return {
    blob,
    filename: `${sanitizeFileName(project.title)}.html`,
    sizeBytes,
    formattedSize: formatBytesRu(sizeBytes),
    embeddedSummary: {
      builtinImages: builtinDataUriCache.size,
      customImages: customDataUriCache.size,
      hasMusic: Boolean(musicPath),
      fontsCount: usedFontIds.size,
    },
  };
}
