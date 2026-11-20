import type {
  CompositionPresetId,
  ConstellationProject,
  ConstellationStar,
  DeviceLayoutKey,
  OccasionId,
  ProjectDeviceLayoutEntry,
  ProjectDeviceLayouts,
  StarConnection,
  StarDeviceLayoutEntry,
  StarDeviceLayouts,
  StarPosition3D,
  StarTextStyle,
} from '../../types/project';
import {
  CARD_THEMES,
  VALID_CARD_THEME_IDS,
  isHexLight,
  resolveStarDecor,
  sanitizeCardColors,
} from './cardThemesAndDecor';
import {
  resolveDeviceDecorLayout,
  resolveDeviceTextLayout,
  resolveEffectiveCardLayout,
  resolveEffectiveConstellationLayout,
  resolveEffectiveIllustrationLayout,
  resolveStarIllustrationLayout,
  resolveStarImageSettings,
} from './deviceLayouts';
import { sanitizeEnvelopeSettings } from './envelopeLayout';
import { OCCASION_PRESETS } from './occasionsAndAudio';
import { resolveConstellationAnimation, resolveStarShape } from './palettes';
import { resolveStarTextStyle } from './textStyles';

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
      nextPositions = [
        { x: -2.25, y: 1.35, z: -0.35 },
        { x: 0, y: 0.72, z: 0.85 },
        { x: 2.25, y: 1.35, z: -0.35 },
        { x: 0, y: -2.25, z: 0.35 },
        { x: 0, y: -0.45, z: 1.15 },
      ];
      edgePairs.push([0, 1], [1, 2], [2, 3], [3, 0], [1, 4]);
    } else if (count === 6) {
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
