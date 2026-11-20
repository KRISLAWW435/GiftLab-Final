import { normalizeProject } from '../scene/paletteConfig';
import { sanitizeFileName } from './zipExporter';
import { blobToDataUri } from './encoding';
import {
  getAudioRecord,
  getImageBlob,
  saveAudioBlob,
  saveImageBlob,
  saveProject,
} from './database';
import {
  MAX_STARS,
  type ConstellationProject,
  type StoredAudioRecord,
} from '../types/project';

export const BACKUP_FORMAT_ID = 'giftlab-backup';
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_FILE_BYTES = 35 * 1024 * 1024;
export const MAX_SINGLE_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_SINGLE_AUDIO_BYTES = 14 * 1024 * 1024;

const ALLOWED_BACKUP_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const ALLOWED_BACKUP_AUDIO_MIMES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/ogg',
  'audio/webm',
  'audio/mp4',
  'audio/aac',
]);

export interface BackupImageEntry {
  id: string;
  mimeType: string;
  dataUri: string;
}

export interface BackupAudioEntry {
  id: string;
  fileName: string;
  mimeType: string;
  dataUri: string;
}

export interface GiftLabBackupPayload {
  format: typeof BACKUP_FORMAT_ID;
  version: typeof BACKUP_VERSION;
  exportedAt: number;
  project: ConstellationProject;
  images: BackupImageEntry[];
  audio: BackupAudioEntry | null;
}

export interface RestoreBackupResult {
  project: ConstellationProject;
  skippedMissingAssets: string[];
}

function makeFreshId(prefix: 'proj' | 'img' | 'aud'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function dataUriToBlob(
  dataUri: string,
  allowedMimes: Set<string>,
  maxBytes: number,
  resourceLabel: string,
): Blob {
  if (typeof dataUri !== 'string' || !dataUri.startsWith('data:')) {
    throw new Error(`Некорректные данные ресурса «${resourceLabel}».`);
  }

  const commaIdx = dataUri.indexOf(',');
  if (commaIdx <= 5) {
    throw new Error(`Повреждённый формат ресурса «${resourceLabel}».`);
  }

  const header = dataUri.slice(5, commaIdx);
  const parts = header.split(';');
  const mimeType = (parts[0] || '').trim().toLowerCase();
  const isBase64 = parts.some((p) => p.trim().toLowerCase() === 'base64');

  if (!isBase64) {
    throw new Error(`Ресурс «${resourceLabel}» должен быть закодирован в Base64.`);
  }
  if (!allowedMimes.has(mimeType)) {
    throw new Error(`Недопустимый тип ресурса «${resourceLabel}» (${mimeType || 'неизвестен'}).`);
  }

  const base64Body = dataUri.slice(commaIdx + 1).replace(/\s+/g, '');
  if (!base64Body) {
    throw new Error(`Ресурс «${resourceLabel}» пуст.`);
  }

  const estimatedBytes = Math.floor((base64Body.length * 3) / 4);
  if (estimatedBytes > maxBytes) {
    throw new Error(`Ресурс «${resourceLabel}» превышает допустимый размер.`);
  }

  let binary: string;
  try {
    binary = atob(base64Body);
  } catch {
    throw new Error(`Не удалось декодировать данные ресурса «${resourceLabel}».`);
  }

  if (binary.length === 0 || binary.length > maxBytes) {
    throw new Error(`Недопустимый размер ресурса «${resourceLabel}».`);
  }

  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export async function buildProjectBackupPayload(
  project: ConstellationProject,
  resolveImageBlob: (imageId: string) => Promise<Blob | null>,
  resolveAudioRecord: (audioId: string) => Promise<StoredAudioRecord | null>,
): Promise<GiftLabBackupPayload> {
  const normalized = normalizeProject(project);
  const images: BackupImageEntry[] = [];
  const seenImageIds = new Set<string>();

  for (let i = 0; i < normalized.stars.length; i++) {
    const star = normalized.stars[i];
    if (star.illustration.type !== 'custom' || !star.illustration.id) continue;
    if (seenImageIds.has(star.illustration.id)) continue;
    seenImageIds.add(star.illustration.id);

    const blob = await resolveImageBlob(star.illustration.id);
    if (!blob || blob.size === 0) continue;

    const fallbackMime = blob.type && ALLOWED_BACKUP_IMAGE_MIMES.has(blob.type)
      ? blob.type
      : 'image/webp';
    const dataUri = await blobToDataUri(blob, fallbackMime, star.title || `Звезда ${i + 1}`);
    images.push({
      id: star.illustration.id,
      mimeType: blob.type || fallbackMime,
      dataUri,
    });
  }

  let audio: BackupAudioEntry | null = null;
  if (normalized.musicTrackId === 'custom' && normalized.customMusicId) {
    const rec = await resolveAudioRecord(normalized.customMusicId);
    if (rec && rec.blob && rec.blob.size > 0) {
      const fallbackMime = rec.mimeType || 'audio/mpeg';
      const dataUri = await blobToDataUri(rec.blob, fallbackMime, rec.fileName || 'Музыка');
      audio = {
        id: rec.id,
        fileName: rec.fileName || 'music.mp3',
        mimeType: rec.mimeType || fallbackMime,
        dataUri,
      };
    }
  }

  return {
    format: BACKUP_FORMAT_ID,
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    project: normalized,
    images,
    audio,
  };
}

export async function exportProjectBackup(
  project: ConstellationProject,
): Promise<{ blob: Blob; filename: string }> {
  const payload = await buildProjectBackupPayload(
    project,
    getImageBlob,
    getAudioRecord,
  );
  const json = JSON.stringify(payload, null, 2);
  return {
    blob: new Blob([json], { type: 'application/json;charset=utf-8' }),
    filename: `${sanitizeFileName(payload.project.title)}.giftlab.json`,
  };
}

export function parseAndValidateBackupJson(rawText: string): GiftLabBackupPayload {
  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new Error('Выбранный файл пуст.');
  }
  if (trimmed.startsWith('<')) {
    throw new Error(
      'Это HTML-файл открытки для получателя. Для загрузки в редактор выберите файл резервной копии (.giftlab.json).',
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error('Не удалось прочитать файл: он должен быть в формате резервной копии GiftLab (.giftlab.json).');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Неверная структура файла резервной копии.');
  }

  const rec = parsed as Record<string, unknown>;
  if (rec.format !== BACKUP_FORMAT_ID) {
    throw new Error('Этот JSON-файл не является резервной копией проекта GiftLab.');
  }
  if (rec.version !== BACKUP_VERSION) {
    throw new Error('Версия этого файла резервной копии не поддерживается.');
  }
  if (!rec.project || typeof rec.project !== 'object' || Array.isArray(rec.project)) {
    throw new Error('В резервной копии отсутствуют данные проекта.');
  }

  const rawProject = rec.project as ConstellationProject;
  if (!Array.isArray(rawProject.stars) || rawProject.stars.length === 0) {
    throw new Error('В резервной копии не найдено ни одной звезды.');
  }
  if (rawProject.stars.length > MAX_STARS) {
    throw new Error(`Количество звёзд в файле превышает допустимый лимит (${MAX_STARS}).`);
  }

  const normalizedProject = normalizeProject({
    ...rawProject,
    stars: rawProject.stars.slice(0, MAX_STARS),
  });

  const images: BackupImageEntry[] = [];
  if (Array.isArray(rec.images)) {
    for (const item of rec.images) {
      if (!item || typeof item !== 'object') continue;
      const entry = item as Record<string, unknown>;
      if (typeof entry.id === 'string' && typeof entry.dataUri === 'string') {
        images.push({
          id: entry.id,
          mimeType: typeof entry.mimeType === 'string' ? entry.mimeType : 'image/webp',
          dataUri: entry.dataUri,
        });
      }
    }
  }

  let audio: BackupAudioEntry | null = null;
  if (rec.audio && typeof rec.audio === 'object' && !Array.isArray(rec.audio)) {
    const a = rec.audio as Record<string, unknown>;
    if (typeof a.id === 'string' && typeof a.dataUri === 'string') {
      audio = {
        id: a.id,
        fileName: typeof a.fileName === 'string' ? a.fileName.slice(0, 120) : 'music.mp3',
        mimeType: typeof a.mimeType === 'string' ? a.mimeType : 'audio/mpeg',
        dataUri: a.dataUri,
      };
    }
  }

  return {
    format: BACKUP_FORMAT_ID,
    version: BACKUP_VERSION,
    exportedAt: typeof rec.exportedAt === 'number' ? rec.exportedAt : Date.now(),
    project: normalizedProject,
    images,
    audio,
  };
}

export async function restoreProjectFromBackup(
  payload: GiftLabBackupPayload,
  persistImage: (imageId: string, projectId: string, blob: Blob) => Promise<unknown>,
  persistAudio: (
    audioId: string,
    projectId: string,
    blob: Blob,
    fileName: string,
  ) => Promise<unknown>,
  persistProject: (project: ConstellationProject) => Promise<ConstellationProject>,
): Promise<RestoreBackupResult> {
  const newProjectId = makeFreshId('proj');
  const now = Date.now();
  const imageIdMap = new Map<string, string>();
  const skippedMissingAssets: string[] = [];

  for (const img of payload.images) {
    const blob = dataUriToBlob(
      img.dataUri,
      ALLOWED_BACKUP_IMAGE_MIMES,
      MAX_SINGLE_IMAGE_BYTES,
      img.id,
    );
    const freshImgId = makeFreshId('img');
    await persistImage(freshImgId, newProjectId, blob);
    imageIdMap.set(img.id, freshImgId);
  }

  let newCustomMusicId: string | undefined;
  let nextMusicTrackId = payload.project.musicTrackId;
  let nextCustomMusicName = payload.project.customMusicName;

  if (payload.project.musicTrackId === 'custom') {
    if (payload.audio) {
      const audioBlob = dataUriToBlob(
        payload.audio.dataUri,
        ALLOWED_BACKUP_AUDIO_MIMES,
        MAX_SINGLE_AUDIO_BYTES,
        payload.audio.fileName || 'Музыка',
      );
      newCustomMusicId = makeFreshId('aud');
      await persistAudio(
        newCustomMusicId,
        newProjectId,
        audioBlob,
        payload.audio.fileName || 'music.mp3',
      );
    } else {
      skippedMissingAssets.push(payload.project.customMusicName || 'Своя музыка');
      nextMusicTrackId = 'magical_cover';
      nextCustomMusicName = undefined;
    }
  } else {
    newCustomMusicId = undefined;
  }

  const remappedStars = payload.project.stars.map((star) => {
    if (star.illustration.type === 'custom') {
      const mappedId = imageIdMap.get(star.illustration.id);
      if (mappedId) {
        return {
          ...star,
          illustration: { type: 'custom' as const, id: mappedId },
        };
      }
      skippedMissingAssets.push(star.title || 'Фото звезды');
      return {
        ...star,
        illustration: { type: 'builtin' as const, id: 'heart' as const },
      };
    }
    return star;
  });

  const restored = normalizeProject({
    ...payload.project,
    id: newProjectId,
    createdAt: now,
    updatedAt: now,
    musicTrackId: nextMusicTrackId,
    customMusicId: newCustomMusicId,
    customMusicName: nextCustomMusicName,
    stars: remappedStars,
  });

  const saved = await persistProject(restored);
  return { project: saved, skippedMissingAssets };
}

export async function importProjectBackupFile(
  file: File,
): Promise<RestoreBackupResult> {
  if (!file || file.size === 0) {
    throw new Error('Выбранный файл пуст.');
  }
  if (file.size > MAX_BACKUP_FILE_BYTES) {
    throw new Error('Размер файла резервной копии не должен превышать 35 МБ.');
  }

  const lower = file.name.toLowerCase();
  if (lower.endsWith('.zip')) {
    throw new Error(
      'Это ZIP-архив для получателя. Для загрузки в редактор выберите файл резервной копии (.giftlab.json).',
    );
  }
  if (lower.endsWith('.html') || lower.endsWith('.htm')) {
    throw new Error(
      'Это готовая HTML-открытка для получателя. Для редактирования выберите файл резервной копии (.giftlab.json).',
    );
  }

  const rawText = await file.text();
  const payload = parseAndValidateBackupJson(rawText);
  return restoreProjectFromBackup(
    payload,
    saveImageBlob,
    saveAudioBlob,
    saveProject,
  );
}
