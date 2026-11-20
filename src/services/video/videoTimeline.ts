import type { ConstellationProject } from '../../types/project';

// Crisp mobile 9:16 portrait resolution & compact bitrate for lightweight iPhone/Telegram/WhatsApp sharing
export const VIDEO_WIDTH = 540;
export const VIDEO_HEIGHT = 960;
export const VIDEO_FPS = 24;
export const VIDEO_BITRATE = 1_650_000;
export const AUDIO_BITRATE = 96_000;
export const UI_SCALE = 1.28;

export interface VideoExportProgress {
  percent: number;
  stageLabel: string;
}

export interface VideoExportOptions {
  onProgress?: (progress: VideoExportProgress) => void;
  signal?: AbortSignal;
}

export interface VideoExportResult {
  blob: Blob;
  filename: string;
  sizeBytes: number;
  formattedSize: string;
  durationSec: number;
}

export type VideoSegmentKind =
  | 'sealed'
  | 'birthing'
  | 'star'
  | 'finalReveal'
  | 'constellation';

export interface VideoTimelineSegment {
  kind: VideoSegmentKind;
  starIndex?: number;
  startSec: number;
  endSec: number;
  durationSec: number;
}

export interface VideoTimeline {
  segments: VideoTimelineSegment[];
  totalDurationSec: number;
  totalFrames: number;
}

export type DrawableImage = HTMLImageElement | HTMLCanvasElement;

export function computeVideoTimeline(project: ConstellationProject): VideoTimeline {
  const segments: VideoTimelineSegment[] = [];
  let cursor = 0;

  // 1. Sealed 3D Envelope intro
  const sealedDuration = 1.65;
  segments.push({
    kind: 'sealed',
    startSec: cursor,
    endSec: cursor + sealedDuration,
    durationSec: sealedDuration,
  });
  cursor += sealedDuration;

  // 2. Envelope dissolve + first 3D star birth choreography (matches ConstellationEngine.birthDuration = 3.85s)
  const birthingDuration = 3.875;
  segments.push({
    kind: 'birthing',
    startSec: cursor,
    endSec: cursor + birthingDuration,
    durationSec: birthingDuration,
  });
  cursor += birthingDuration;

  // 3. Individual star story cards with real 3D star showcase & StarBirthBurst transitions
  const starCount = Math.max(1, project.stars.length);
  const perStarFloor = starCount > 7 ? 2.75 : 3.2;
  const perStarCeil = starCount > 7 ? 4.2 : 5.0;
  project.stars.forEach((star, idx) => {
    const msgLen = star.message.trim().length + star.title.trim().length;
    const starDuration = Number(
      Math.max(perStarFloor, Math.min(perStarCeil, 2.75 + msgLen / 72)).toFixed(2),
    );
    segments.push({
      kind: 'star',
      starIndex: idx,
      startSec: cursor,
      endSec: cursor + starDuration,
      durationSec: starDuration,
    });
    cursor += starDuration;
  });

  // 4. Final constellation reveal choreography (matches ConstellationEngine.finalRevealDuration = 4.35s)
  const finalRevealDuration = 4.375;
  segments.push({
    kind: 'finalReveal',
    startSec: cursor,
    endSec: cursor + finalRevealDuration,
    durationSec: finalRevealDuration,
  });
  cursor += finalRevealDuration;

  // 5. Rotating/animated 3D constellation + FinalLetterCard
  const finalLen = project.finalMessage.trim().length;
  const constellationDuration = Number(
    Math.max(5.4, Math.min(7.2, 4.7 + finalLen / 85)).toFixed(2),
  );
  segments.push({
    kind: 'constellation',
    startSec: cursor,
    endSec: cursor + constellationDuration,
    durationSec: constellationDuration,
  });
  cursor += constellationDuration;

  const totalDurationSec = Number(cursor.toFixed(2));
  const totalFrames = Math.max(1, Math.round(totalDurationSec * VIDEO_FPS));
  return { segments, totalDurationSec, totalFrames };
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

export function easeOutCubic(t: number): number {
  const x = clamp(t, 0, 1);
  return 1 - Math.pow(1 - x, 3);
}

export function easeOutExpoish(t: number): number {
  const x = clamp(t, 0, 1);
  return 1 - Math.pow(1 - x, 3.4);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return { r: 255, g: 255, b: 255 };
  return {
    r: parseInt(clean.slice(0, 2), 16) || 0,
    g: parseInt(clean.slice(2, 4), 16) || 0,
    b: parseInt(clean.slice(4, 6), 16) || 0,
  };
}

export function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1).toFixed(3)})`;
}

export function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('Экспорт видео отменён.', 'AbortError');
  }
}
