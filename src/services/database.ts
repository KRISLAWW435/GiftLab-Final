import { normalizeProject } from '../scene/paletteConfig';
import type {
  ConstellationProject,
  StoredAudioRecord,
  StoredImageRecord,
} from '../types/project';

const DB_NAME = 'giftlab_db';
const DB_VERSION = 2;
const STORE_PROJECTS = 'projects';
const STORE_IMAGES = 'images';
const STORE_AUDIO = 'audio';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        const store = db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_IMAGES)) {
        const imgStore = db.createObjectStore(STORE_IMAGES, { keyPath: 'id' });
        imgStore.createIndex('projectId', 'projectId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_AUDIO)) {
        const audioStore = db.createObjectStore(STORE_AUDIO, { keyPath: 'id' });
        audioStore.createIndex('projectId', 'projectId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Не удалось открыть IndexedDB'));
  });
}

export async function listProjects(): Promise<ConstellationProject[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const store = tx.objectStore(STORE_PROJECTS);
    const req = store.getAll();
    req.onsuccess = () => {
      const rawItems = (req.result as ConstellationProject[]) ?? [];
      const items = rawItems.map((item) => normalizeProject(item));
      items.sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getProject(id: string): Promise<ConstellationProject | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const req = tx.objectStore(STORE_PROJECTS).get(id);
    req.onsuccess = () => {
      const rec = (req.result as ConstellationProject) ?? null;
      resolve(rec ? normalizeProject(rec) : null);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveProject(project: ConstellationProject): Promise<ConstellationProject> {
  const db = await openDatabase();
  const normalized = normalizeProject(project);
  const updated: ConstellationProject = {
    ...normalized,
    updatedAt: Date.now(),
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    tx.objectStore(STORE_PROJECTS).put(updated);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return updated;
}

export async function deleteProject(projectId: string): Promise<void> {
  const db = await openDatabase();
  const images = await listImagesForProject(projectId);
  const audioList = await listAudioForProject(projectId);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_PROJECTS, STORE_IMAGES, STORE_AUDIO], 'readwrite');
    tx.objectStore(STORE_PROJECTS).delete(projectId);
    const imgStore = tx.objectStore(STORE_IMAGES);
    for (const img of images) {
      imgStore.delete(img.id);
    }
    const audioStore = tx.objectStore(STORE_AUDIO);
    for (const aud of audioList) {
      audioStore.delete(aud.id);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveImageBlob(
  imageId: string,
  projectId: string,
  blob: Blob,
): Promise<StoredImageRecord> {
  const db = await openDatabase();
  const record: StoredImageRecord = {
    id: imageId,
    projectId,
    blob,
    mimeType: blob.type || 'image/webp',
    size: blob.size,
    updatedAt: Date.now(),
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_IMAGES, 'readwrite');
    tx.objectStore(STORE_IMAGES).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return record;
}

export async function getImageBlob(imageId: string): Promise<Blob | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_IMAGES, 'readonly');
    const req = tx.objectStore(STORE_IMAGES).get(imageId);
    req.onsuccess = () => {
      const rec = req.result as StoredImageRecord | undefined;
      resolve(rec ? rec.blob : null);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function listImagesForProject(projectId: string): Promise<StoredImageRecord[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_IMAGES, 'readonly');
    const index = tx.objectStore(STORE_IMAGES).index('projectId');
    const req = index.getAll(projectId);
    req.onsuccess = () => resolve((req.result as StoredImageRecord[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function saveAudioBlob(
  audioId: string,
  projectId: string,
  blob: Blob,
  fileName: string,
): Promise<StoredAudioRecord> {
  const db = await openDatabase();
  const record: StoredAudioRecord = {
    id: audioId,
    projectId,
    blob,
    fileName,
    mimeType: blob.type || (fileName.toLowerCase().endsWith('.wav') ? 'audio/wav' : 'audio/mpeg'),
    size: blob.size,
    updatedAt: Date.now(),
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_AUDIO, 'readwrite');
    tx.objectStore(STORE_AUDIO).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return record;
}

export async function getAudioRecord(audioId: string): Promise<StoredAudioRecord | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_AUDIO, 'readonly');
    const req = tx.objectStore(STORE_AUDIO).get(audioId);
    req.onsuccess = () => {
      const rec = req.result as StoredAudioRecord | undefined;
      resolve(rec ?? null);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getAudioBlob(audioId: string): Promise<Blob | null> {
  const rec = await getAudioRecord(audioId);
  return rec ? rec.blob : null;
}

export async function listAudioForProject(projectId: string): Promise<StoredAudioRecord[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_AUDIO, 'readonly');
    const index = tx.objectStore(STORE_AUDIO).index('projectId');
    const req = index.getAll(projectId);
    req.onsuccess = () => resolve((req.result as StoredAudioRecord[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function duplicateProject(source: ConstellationProject): Promise<ConstellationProject> {
  const normalizedSource = normalizeProject(source);
  const now = Date.now();
  const newProjectId = `proj_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const idMap = new Map<string, string>();

  const sourceImages = await listImagesForProject(normalizedSource.id);
  for (const img of sourceImages) {
    const newImgId = `img_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    idMap.set(img.id, newImgId);
    await saveImageBlob(newImgId, newProjectId, img.blob);
  }

  let clonedCustomMusicId = normalizedSource.customMusicId;
  if (normalizedSource.customMusicId) {
    const sourceAudio = await getAudioRecord(normalizedSource.customMusicId);
    if (sourceAudio) {
      clonedCustomMusicId = `aud_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      await saveAudioBlob(
        clonedCustomMusicId,
        newProjectId,
        sourceAudio.blob,
        sourceAudio.fileName,
      );
    }
  }

  const cloned: ConstellationProject = {
    ...normalizedSource,
    id: newProjectId,
    title: `${normalizedSource.title} (копия)`,
    customMusicId: clonedCustomMusicId,
    createdAt: now,
    updatedAt: now,
    stars: normalizedSource.stars.map((star) => ({
      ...star,
      illustration:
        star.illustration.type === 'custom'
          ? {
              type: 'custom',
              id: idMap.get(star.illustration.id) ?? star.illustration.id,
            }
          : { ...star.illustration },
      position: { ...star.position },
    })),
    connections: normalizedSource.connections.map((conn) => ({ ...conn })),
  };

  return saveProject(cloned);
}

export async function cleanupUnusedProjectImages(project: ConstellationProject): Promise<void> {
  const usedIds = new Set(
    project.stars
      .filter((s) => s.illustration.type === 'custom')
      .map((s) => s.illustration.id),
  );
  const existing = await listImagesForProject(project.id);
  const unused = existing.filter((img) => !usedIds.has(img.id));
  if (unused.length === 0) return;

  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_IMAGES, 'readwrite');
    const store = tx.objectStore(STORE_IMAGES);
    for (const img of unused) {
      store.delete(img.id);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function cleanupUnusedProjectAudio(project: ConstellationProject): Promise<void> {
  const usedId = project.customMusicId;
  const existing = await listAudioForProject(project.id);
  const unused = existing.filter((aud) => aud.id !== usedId);
  if (unused.length === 0) return;

  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_AUDIO, 'readwrite');
    const store = tx.objectStore(STORE_AUDIO);
    for (const aud of unused) {
      store.delete(aud.id);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
