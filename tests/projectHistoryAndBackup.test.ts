import { describe, expect, test } from 'bun:test';
import { createNewProject } from '../src/scene/paletteConfig';
import {
  COALESCE_WINDOW_MS,
  MAX_PROJECT_HISTORY,
  collectHistoryReferencedAssetIds,
  createProjectHistory,
  pushProjectHistory,
  redoProjectHistory,
  undoProjectHistory,
} from '../src/scene/projectHistory';
import {
  BACKUP_FORMAT_ID,
  BACKUP_VERSION,
  MAX_SINGLE_IMAGE_BYTES,
  buildProjectBackupPayload,
  dataUriToBlob,
  parseAndValidateBackupJson,
  restoreProjectFromBackup,
} from '../src/services/projectBackup';
import type { ConstellationProject, StoredAudioRecord } from '../src/types/project';

describe('projectHistory', () => {
  test('ignores no-op updates including updatedAt-only changes', () => {
    const initial = createNewProject('birthday', 'Для Маши', 'Маша');
    const history = createProjectHistory(initial, 1000);

    const sameRef = pushProjectHistory(history, initial, 1200);
    expect(sameRef).toBe(history);

    const onlyTimestamp = pushProjectHistory(
      history,
      { ...initial, updatedAt: initial.updatedAt + 5000 },
      1300,
    );
    expect(onlyTimestamp).toBe(history);
    expect(onlyTimestamp.past).toHaveLength(0);
  });

  test('coalesces rapid text edits within window and separates discrete or structural edits', () => {
    const base = createNewProject('birthday', 'Начало', 'Маша');
    let h = createProjectHistory(base, 1000);

    // First edit commits baseline into past
    const edit1 = { ...base, title: 'Начало 1' };
    h = pushProjectHistory(h, edit1, 1100);
    expect(h.past).toHaveLength(1);
    expect(h.present.title).toBe('Начало 1');

    // Second edit within COALESCE_WINDOW_MS with same structural signature coalesces
    const edit2 = { ...edit1, title: 'Начало 12' };
    h = pushProjectHistory(h, edit2, 1100 + COALESCE_WINDOW_MS - 100);
    expect(h.past).toHaveLength(1);
    expect(h.present.title).toBe('Начало 12');

    // Structural change even within coalesce window creates a new undo step
    const edit3: ConstellationProject = {
      ...edit2,
      stars: edit2.stars.map((s, idx) =>
        idx === 0 ? { ...s, shape: 'spark' as const } : s,
      ),
    };
    h = pushProjectHistory(h, edit3, 1100 + COALESCE_WINDOW_MS - 50);
    expect(h.past).toHaveLength(2);

    // Edit after coalesce window creates a new undo step
    const edit4 = { ...edit3, title: 'Финальный заголовок' };
    h = pushProjectHistory(h, edit4, 5000);
    expect(h.past).toHaveLength(3);

    // Undo and redo round-trip
    h = undoProjectHistory(h);
    expect(h.present.title).toBe('Начало 12');
    expect(h.future).toHaveLength(1);

    h = redoProjectHistory(h);
    expect(h.present.title).toBe('Финальный заголовок');
    expect(h.future).toHaveLength(0);

    // Undo then new edit clears future branch
    h = undoProjectHistory(h);
    expect(h.future).toHaveLength(1);
    h = pushProjectHistory(h, { ...h.present, title: 'Новая ветка' }, 6000);
    expect(h.future).toHaveLength(0);
    expect(h.present.title).toBe('Новая ветка');
  });

  test('enforces MAX_PROJECT_HISTORY cap and collects referenced assets across past, present, and future', () => {
    const base = createNewProject('mothers_day');
    let h = createProjectHistory(base, 0);

    for (let i = 1; i <= MAX_PROJECT_HISTORY + 10; i++) {
      h = pushProjectHistory(
        h,
        { ...h.present, title: `Версия ${i}` },
        i * (COALESCE_WINDOW_MS + 100),
      );
    }

    expect(h.past.length).toBe(MAX_PROJECT_HISTORY);

    // Attach custom photo in past, custom music in future, and another custom photo in present
    const withPastImg: ConstellationProject = {
      ...base,
      stars: base.stars.map((s, i) =>
        i === 0 ? { ...s, illustration: { type: 'custom', id: 'img_past' } } : s,
      ),
    };
    let assetHistory = createProjectHistory(withPastImg, 0);

    const withPresentImgAndAudio: ConstellationProject = {
      ...withPastImg,
      musicTrackId: 'custom',
      customMusicId: 'aud_mid',
      stars: withPastImg.stars.map((s, i) =>
        i === 0 ? { ...s, illustration: { type: 'custom', id: 'img_present' } } : s,
      ),
    };
    assetHistory = pushProjectHistory(assetHistory, withPresentImgAndAudio, 2000);

    const withFutureAsset: ConstellationProject = {
      ...withPresentImgAndAudio,
      musicTrackId: 'custom',
      customMusicId: 'aud_future',
      stars: withPresentImgAndAudio.stars.map((s, i) =>
        i === 1 ? { ...s, illustration: { type: 'custom', id: 'img_future' } } : s,
      ),
    };
    assetHistory = pushProjectHistory(assetHistory, withFutureAsset, 4000);
    assetHistory = undoProjectHistory(assetHistory);

    const refs = collectHistoryReferencedAssetIds(assetHistory);
    expect(refs.imageIds.has('img_past')).toBe(true);
    expect(refs.imageIds.has('img_present')).toBe(true);
    expect(refs.imageIds.has('img_future')).toBe(true);
    expect(refs.audioIds.has('aud_mid')).toBe(true);
    expect(refs.audioIds.has('aud_future')).toBe(true);
  });
});

describe('projectBackup', () => {
  test('round-trips project with custom images and custom audio into fresh non-colliding IDs', async () => {
    const base = createNewProject('new_year', 'Годовщина', 'Аня');
    const sourceProject: ConstellationProject = {
      ...base,
      musicTrackId: 'custom',
      customMusicId: 'aud_orig_1',
      customMusicName: 'song.mp3',
      stars: base.stars.map((s, i) =>
        i === 0 ? { ...s, illustration: { type: 'custom', id: 'img_orig_1' } } : s,
      ),
    };

    const imageBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);
    const audioBytes = new Uint8Array([0x49, 0x44, 0x33, 0x03, 10, 20, 30]);

    const payload = await buildProjectBackupPayload(
      sourceProject,
      async (id) => (id === 'img_orig_1' ? new Blob([imageBytes], { type: 'image/png' }) : null),
      async (id): Promise<StoredAudioRecord | null> =>
        id === 'aud_orig_1'
          ? {
              id: 'aud_orig_1',
              projectId: sourceProject.id,
              blob: new Blob([audioBytes], { type: 'audio/mpeg' }),
              fileName: 'song.mp3',
              mimeType: 'audio/mpeg',
              size: audioBytes.byteLength,
              updatedAt: 1000,
            }
          : null,
    );

    expect(payload.format).toBe(BACKUP_FORMAT_ID);
    expect(payload.version).toBe(BACKUP_VERSION);
    expect(payload.images).toHaveLength(1);
    expect(payload.audio?.fileName).toBe('song.mp3');

    const validated = parseAndValidateBackupJson(JSON.stringify(payload));
    const savedImages = new Map<string, { projectId: string; bytes: Uint8Array; type: string }>();
    const savedAudio = new Map<string, { projectId: string; bytes: Uint8Array; fileName: string }>();
    let savedProject: ConstellationProject | null = null;

    const restored = await restoreProjectFromBackup(
      validated,
      async (imgId, projectId, blob) => {
        savedImages.set(imgId, {
          projectId,
          bytes: new Uint8Array(await blob.arrayBuffer()),
          type: blob.type,
        });
      },
      async (audId, projectId, blob, fileName) => {
        savedAudio.set(audId, {
          projectId,
          bytes: new Uint8Array(await blob.arrayBuffer()),
          fileName,
        });
      },
      async (proj) => {
        savedProject = proj;
        return proj;
      },
    );

    expect(restored.skippedMissingAssets).toHaveLength(0);
    expect(restored.project.id).not.toBe(sourceProject.id);
    expect(restored.project.title).toBe('Годовщина');
    expect(restored.project.recipientName).toBe('Аня');

    const newImgRef = restored.project.stars[0].illustration;
    expect(newImgRef.type).toBe('custom');
    expect(newImgRef.id).not.toBe('img_orig_1');
    const restoredImg = savedImages.get(newImgRef.id);
    expect(restoredImg).toBeDefined();
    expect(restoredImg?.projectId).toBe(restored.project.id);
    expect(restoredImg?.type).toBe('image/png');
    expect(Array.from(restoredImg!.bytes)).toEqual(Array.from(imageBytes));

    expect(restored.project.customMusicId).toBeDefined();
    expect(restored.project.customMusicId).not.toBe('aud_orig_1');
    const restoredAud = savedAudio.get(restored.project.customMusicId!);
    expect(restoredAud).toBeDefined();
    expect(restoredAud?.fileName).toBe('song.mp3');
    expect(Array.from(restoredAud!.bytes)).toEqual(Array.from(audioBytes));
    expect(savedProject).not.toBeNull();
  });

  test('falls back cleanly when custom image or audio binary is missing in backup', async () => {
    const base = createNewProject('birthday');
    const payload = await buildProjectBackupPayload(
      {
        ...base,
        musicTrackId: 'custom',
        customMusicId: 'aud_missing',
        customMusicName: 'missing.mp3',
        stars: base.stars.map((s, i) =>
          i === 0 ? { ...s, title: 'Моя фотка', illustration: { type: 'custom', id: 'img_missing' } } : s,
        ),
      },
      async () => null,
      async () => null,
    );

    const restored = await restoreProjectFromBackup(
      payload,
      async () => undefined,
      async () => undefined,
      async (p) => p,
    );

    expect(restored.skippedMissingAssets).toEqual(['missing.mp3', 'Моя фотка']);
    expect(restored.project.musicTrackId).toBe('magical_cover');
    expect(restored.project.customMusicId).toBeUndefined();
    expect(restored.project.stars[0].illustration).toEqual({ type: 'builtin', id: 'heart' });
  });

  test('rejects HTML files, wrong JSON payloads, empty star arrays, and unsafe SVG/corrupt data URIs', () => {
    expect(() => parseAndValidateBackupJson('<!DOCTYPE html><html></html>')).toThrow(
      /HTML-файл открытки/,
    );
    expect(() => parseAndValidateBackupJson('not json')).toThrow(/резервной копии/);
    expect(() =>
      parseAndValidateBackupJson(JSON.stringify({ format: 'other', version: 1 })),
    ).toThrow(/не является резервной копией/);
    expect(() =>
      parseAndValidateBackupJson(
        JSON.stringify({
          format: BACKUP_FORMAT_ID,
          version: BACKUP_VERSION,
          exportedAt: 1,
          project: { ...createNewProject('birthday'), stars: [] },
          images: [],
          audio: null,
        }),
      ),
    ).toThrow(/ни одной звезды/);

    const allowedImages = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    expect(() =>
      dataUriToBlob(
        'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
        allowedImages,
        MAX_SINGLE_IMAGE_BYTES,
        'svg',
      ),
    ).toThrow(/Недопустимый тип/);

    expect(() =>
      dataUriToBlob('data:image/png,notbase64', allowedImages, MAX_SINGLE_IMAGE_BYTES, 'raw'),
    ).toThrow(/Base64/);
  });
});
