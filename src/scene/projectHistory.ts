import type { ConstellationProject } from '../types/project';

export const MAX_PROJECT_HISTORY = 40;
export const COALESCE_WINDOW_MS = 750;

export interface ProjectHistoryState {
  past: ConstellationProject[];
  present: ConstellationProject;
  future: ConstellationProject[];
  lastCommitAt: number;
  lastShapeSignature: string;
}

function buildShapeSignature(project: ConstellationProject): string {
  const starSig = project.stars
    .map(
      (s) =>
        `${s.id}:${s.shape}:${s.glowColor}:${s.illustration.type}:${s.illustration.id}:${s.decor?.motif ?? ''}`,
    )
    .join('|');
  const connSig = project.connections.map((c) => `${c.from}->${c.to}`).join('|');
  return [
    project.occasion,
    project.paletteId,
    project.globalGlowColor,
    project.composition ?? '',
    project.cardTheme ?? '',
    project.constellationAnimation ?? '',
    project.musicTrackId,
    project.customMusicId ?? '',
    project.envelopeSettings?.shape ?? 'classic',
    project.envelopeSettings?.motif ?? 'none',
    starSig,
    connSig,
  ].join('::');
}

function areProjectsFunctionallyEqual(
  a: ConstellationProject,
  b: ConstellationProject,
): boolean {
  if (a === b) return true;
  const { updatedAt: _ua, ...restA } = a;
  const { updatedAt: _ub, ...restB } = b;
  return JSON.stringify(restA) === JSON.stringify(restB);
}

export function createProjectHistory(
  initialProject: ConstellationProject,
  nowMs = Date.now(),
): ProjectHistoryState {
  return {
    past: [],
    present: initialProject,
    future: [],
    lastCommitAt: nowMs,
    lastShapeSignature: buildShapeSignature(initialProject),
  };
}

export function pushProjectHistory(
  state: ProjectHistoryState,
  nextProject: ConstellationProject,
  nowMs = Date.now(),
): ProjectHistoryState {
  if (areProjectsFunctionallyEqual(state.present, nextProject)) {
    return state;
  }

  const nextSignature = buildShapeSignature(nextProject);
  const canCoalesce =
    state.past.length > 0 &&
    nowMs - state.lastCommitAt < COALESCE_WINDOW_MS &&
    nextSignature === state.lastShapeSignature;

  if (canCoalesce) {
    return {
      past: state.past,
      present: nextProject,
      future: [],
      lastCommitAt: nowMs,
      lastShapeSignature: nextSignature,
    };
  }

  const nextPast =
    state.past.length >= MAX_PROJECT_HISTORY
      ? [...state.past.slice(state.past.length - MAX_PROJECT_HISTORY + 1), state.present]
      : [...state.past, state.present];

  return {
    past: nextPast,
    present: nextProject,
    future: [],
    lastCommitAt: nowMs,
    lastShapeSignature: nextSignature,
  };
}

export function undoProjectHistory(
  state: ProjectHistoryState,
): ProjectHistoryState {
  if (state.past.length === 0) return state;
  const previous = state.past[state.past.length - 1];
  const nextPast = state.past.slice(0, -1);
  return {
    past: nextPast,
    present: previous,
    future: [state.present, ...state.future].slice(0, MAX_PROJECT_HISTORY),
    lastCommitAt: 0,
    lastShapeSignature: buildShapeSignature(previous),
  };
}

export function redoProjectHistory(
  state: ProjectHistoryState,
): ProjectHistoryState {
  if (state.future.length === 0) return state;
  const next = state.future[0];
  const nextFuture = state.future.slice(1);
  return {
    past: [...state.past, state.present].slice(-MAX_PROJECT_HISTORY),
    present: next,
    future: nextFuture,
    lastCommitAt: 0,
    lastShapeSignature: buildShapeSignature(next),
  };
}

export function collectHistoryReferencedAssetIds(
  state: ProjectHistoryState | null,
): { imageIds: Set<string>; audioIds: Set<string> } {
  const imageIds = new Set<string>();
  const audioIds = new Set<string>();
  if (!state) return { imageIds, audioIds };

  const allSnapshots = [...state.past, state.present, ...state.future];
  for (const snap of allSnapshots) {
    for (const star of snap.stars) {
      if (star.illustration.type === 'custom' && star.illustration.id) {
        imageIds.add(star.illustration.id);
      }
    }
    if (snap.customMusicId) {
      audioIds.add(snap.customMusicId);
    }
  }

  return { imageIds, audioIds };
}
