import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import { getBuiltinIllustrationSvgString } from '../assets/illustrations';
import { ConstellationEngine, type ConstellationSceneState } from '../scene/ConstellationEngine';
import { hasWebGL2Support } from '../scene/proceduralAssets';
import {
  COSMIC_PALETTES,
  GLOW_COLORS,
  MESSAGE_FONTS,
  computeEnvelopeTextTranslateYPx,
  computeTextBlockMarginLeftPct,
  isDefaultStarTextStyle,
  isHexLight,
  resolveCardColors,
  resolveCardTheme,
  resolveConstellationAnimation,
  resolveContrastSafeCardTextColor,
  resolveEffectiveCardLayout,
  resolveEffectiveConstellationLayout,
  resolveEffectiveFinalDecor,
  resolveEffectiveFinalTextStyle,
  resolveEffectiveIllustrationLayout,
  resolveEffectiveStarDecor,
  resolveEffectiveStarTextStyle,
  resolveEnvelopeSettings,
  resolveEnvelopeTextOffsetY,
  resolveMessageFont,
  resolveSafeCardDecorPresentation,
  resolveStarGlowHex,
  resolveStarImageSettings,
  sanitizeConnections,
  type CardThemeConfig,
} from '../scene/paletteConfig';
import type {
  BuiltinIllustrationId,
  CardDecorMotif,
  ConstellationProject,
  ConstellationStar,
  MessageTextAlign,
  StarTextStyle,
} from '../types/project';
import { getImageBlob } from './database';
import { formatBytesRu } from './encoding';
import { resolveProjectMusicForExport } from './musicEngine';
import { sanitizeFileName } from './zipExporter';

// Crisp mobile 9:16 portrait resolution & compact bitrate for lightweight iPhone/Telegram/WhatsApp sharing
export const VIDEO_WIDTH = 540;
export const VIDEO_HEIGHT = 960;
export const VIDEO_FPS = 24;
const VIDEO_BITRATE = 1_650_000;
const AUDIO_BITRATE = 96_000;
const UI_SCALE = 1.28;

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

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

function easeOutCubic(t: number): number {
  const x = clamp(t, 0, 1);
  return 1 - Math.pow(1 - x, 3);
}

function easeOutExpoish(t: number): number {
  const x = clamp(t, 0, 1);
  return 1 - Math.pow(1 - x, 3.4);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return { r: 255, g: 255, b: 255 };
  return {
    r: parseInt(clean.slice(0, 2), 16) || 0,
    g: parseInt(clean.slice(2, 4), 16) || 0,
    b: parseInt(clean.slice(4, 6), 16) || 0,
  };
}

function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1).toFixed(3)})`;
}

export function wrapCanvasTextLines(
  measureFn: (str: string) => number,
  text: string,
  maxWidth: number,
): string[] {
  const safeMax = Math.max(40, maxWidth);
  const paragraphs = text.replace(/\r\n/g, '\n').split('\n');
  const lines: string[] = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) {
      lines.push('');
      continue;
    }

    const words = trimmed.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (measureFn(candidate) <= safeMax) {
        currentLine = candidate;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = '';
        }
        if (measureFn(word) <= safeMax) {
          currentLine = word;
        } else {
          const chars = Array.from(word);
          let chunk = '';
          for (const ch of chars) {
            if (chunk && measureFn(chunk + ch) > safeMax) {
              lines.push(chunk);
              chunk = ch;
            } else {
              chunk += ch;
            }
          }
          currentLine = chunk;
        }
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines.length > 0 ? lines : [''];
}

function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('Экспорт видео отменён.', 'AbortError');
  }
}

async function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Не удалось декодировать изображение.'));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function renderBuiltinToCanvas(id: BuiltinIllustrationId): Promise<HTMLCanvasElement> {
  const size = 512;
  const svg = getBuiltinIllustrationSvgString(id, size);
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const img = await loadImageFromBlob(svgBlob);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  ctx.drawImage(img, 0, 0, size, size);
  return canvas;
}

type DrawableImage = HTMLImageElement | HTMLCanvasElement;

async function preloadStarIllustrations(
  project: ConstellationProject,
  signal?: AbortSignal,
): Promise<Map<string, DrawableImage>> {
  const result = new Map<string, DrawableImage>();
  const builtinCache = new Map<BuiltinIllustrationId, HTMLCanvasElement>();

  for (let i = 0; i < project.stars.length; i++) {
    throwIfAborted(signal);
    const star = project.stars[i];
    if (star.illustration.type === 'custom') {
      const blob = await getImageBlob(star.illustration.id);
      if (!blob || blob.size === 0) {
        throw new Error(
          `Фото для звезды «${star.title || `#${i + 1}`}» не найдено. Загрузите изображение заново.`,
        );
      }
      const img = await loadImageFromBlob(blob);
      result.set(star.id, img);
    } else {
      const bId = star.illustration.id as BuiltinIllustrationId;
      let cached = builtinCache.get(bId);
      if (!cached) {
        cached = await renderBuiltinToCanvas(bId);
        builtinCache.set(bId, cached);
      }
      result.set(star.id, cached);
    }
  }

  return result;
}

async function ensureFontsLoaded(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  const loads: Promise<unknown>[] = [];
  for (const font of MESSAGE_FONTS) {
    loads.push(document.fonts.load(`400 22px "${font.name}"`));
    loads.push(document.fonts.load(`600 22px "${font.name}"`));
    loads.push(document.fonts.load(`700 26px "${font.name}"`));
    loads.push(document.fonts.load(`800 32px "${font.name}"`));
  }
  await Promise.allSettled(loads);
  await document.fonts.ready;
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
): void {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawHeartPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
): void {
  const s = size / 16;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 12 * s);
  ctx.bezierCurveTo(cx - 16 * s, cy + 2 * s, cx - 16 * s, cy - 12 * s, cx - 6 * s, cy - 12 * s);
  ctx.bezierCurveTo(cx - 2 * s, cy - 12 * s, cx, cy - 8 * s, cx, cy - 6.5 * s);
  ctx.bezierCurveTo(cx, cy - 8 * s, cx + 2 * s, cy - 12 * s, cx + 6 * s, cy - 12 * s);
  ctx.bezierCurveTo(cx + 16 * s, cy - 12 * s, cx + 16 * s, cy + 2 * s, cx, cy + 12 * s);
  ctx.closePath();
}

function drawFourPointStarPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
): void {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = -Math.PI / 2 + (i * Math.PI) / 4;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawStarburstFlare(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  coreColor: string,
  rayColor: string,
  opacity = 0.85,
): void {
  ctx.save();
  ctx.globalAlpha *= opacity;

  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  halo.addColorStop(0, rgba(coreColor, 0.72));
  halo.addColorStop(0.32, rgba(rayColor, 0.34));
  halo.addColorStop(1, rgba(rayColor, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = rgba(coreColor, 0.86);
  drawFourPointStarPath(ctx, cx, cy, radius * 0.68, radius * 0.08);
  ctx.fill();

  ctx.fillStyle = rgba(rayColor, 0.65);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 4);
  drawFourPointStarPath(ctx, 0, 0, radius * 0.38, radius * 0.05);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

function drawCardDecorMotif(
  ctx: CanvasRenderingContext2D,
  motif: CardDecorMotif,
  x: number,
  y: number,
  size: number,
  glowHex: string,
  coreHex: string,
  opacity: number,
): void {
  if (motif === 'none') return;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha *= clamp(opacity, 0.25, 1);

  if (motif === 'sparkles') {
    ctx.fillStyle = coreHex;
    drawFourPointStarPath(ctx, 0, -size * 0.12, size * 0.36, size * 0.08);
    ctx.fill();
    ctx.fillStyle = glowHex;
    drawFourPointStarPath(ctx, size * 0.3, size * 0.2, size * 0.17, size * 0.045);
    ctx.fill();
    drawFourPointStarPath(ctx, -size * 0.26, size * 0.28, size * 0.12, size * 0.035);
    ctx.fill();
  } else if (motif === 'magic_rays') {
    ctx.strokeStyle = rgba(glowHex, 0.52);
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.36, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = rgba(coreHex, 0.65);
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.44);
    ctx.lineTo(0, size * 0.44);
    ctx.moveTo(-size * 0.44, 0);
    ctx.lineTo(size * 0.44, 0);
    ctx.stroke();
    ctx.fillStyle = coreHex;
    drawFourPointStarPath(ctx, 0, 0, size * 0.28, size * 0.07);
    ctx.fill();
  } else if (motif === 'hearts') {
    ctx.strokeStyle = glowHex;
    ctx.fillStyle = rgba(coreHex, 0.34);
    ctx.lineWidth = 1.8;
    drawHeartPath(ctx, -size * 0.08, -size * 0.04, size * 0.3);
    ctx.fill();
    ctx.stroke();
    drawHeartPath(ctx, size * 0.26, size * 0.2, size * 0.15);
    ctx.fill();
    ctx.stroke();
  } else if (motif === 'orbital') {
    ctx.strokeStyle = glowHex;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.44, size * 0.17, -0.42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = rgba(coreHex, 0.58);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.31, size * 0.11, 0.48, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = coreHex;
    ctx.beginPath();
    ctx.arc(size * 0.34, -size * 0.16, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (motif === 'soft_flowers' || motif === 'petals' || motif === 'floral_corners') {
    if (motif === 'floral_corners') {
      ctx.strokeStyle = rgba(glowHex, 0.72);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-size * 0.38, -size * 0.34);
      ctx.quadraticCurveTo(0, -size * 0.36, size * 0.36, -size * 0.06);
      ctx.stroke();
    }
    for (let k = 0; k < 6; k++) {
      ctx.save();
      ctx.rotate((k * Math.PI * 2) / 6);
      ctx.fillStyle = rgba(glowHex, 0.34);
      ctx.strokeStyle = rgba(glowHex, 0.75);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(size * 0.14, -size * 0.24, 0, -size * 0.34);
      ctx.quadraticCurveTo(-size * 0.14, -size * 0.24, 0, 0);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = coreHex;
    ctx.beginPath();
    ctx.arc(0, 0, 4.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (motif === 'corners') {
    ctx.strokeStyle = glowHex;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-size * 0.34, -size * 0.08);
    ctx.lineTo(-size * 0.34, -size * 0.34);
    ctx.lineTo(-size * 0.08, -size * 0.34);
    ctx.moveTo(size * 0.34, size * 0.08);
    ctx.lineTo(size * 0.34, size * 0.34);
    ctx.lineTo(size * 0.08, size * 0.34);
    ctx.stroke();
    ctx.fillStyle = coreHex;
    drawFourPointStarPath(ctx, size * 0.22, -size * 0.22, size * 0.1, size * 0.025);
    ctx.fill();
  }

  ctx.restore();
}

function drawCardBackdropPattern(
  ctx: CanvasRenderingContext2D,
  pattern: CardThemeConfig['paperPattern'],
  x: number,
  y: number,
  w: number,
  h: number,
  accentColor: string,
  badgeColor: string,
  borderColor: string,
  glowHex: string,
  isLightPaper: boolean,
  timeSec: number,
): void {
  ctx.save();
  drawRoundedRectPath(ctx, x, y, w, h, 28);
  ctx.clip();

  if (pattern === 'paper') {
    ctx.strokeStyle = 'rgba(140, 108, 80, 0.045)';
    ctx.lineWidth = 1;
    for (let ly = y + 26; ly < y + h - 16; ly += 24) {
      ctx.beginPath();
      ctx.moveTo(x + 16, ly);
      ctx.lineTo(x + w - 16, ly);
      ctx.stroke();
    }
    drawRoundedRectPath(ctx, x + 11, y + 11, w - 22, h - 22, 18);
    ctx.strokeStyle = rgba(accentColor, 0.26);
    ctx.stroke();
  } else if (pattern === 'stars') {
    const g1 = ctx.createRadialGradient(x + w * 0.85, y + h * 0.18, 6, x + w * 0.85, y + h * 0.18, w * 0.65);
    g1.addColorStop(0, rgba(accentColor, 0.18));
    g1.addColorStop(1, rgba(accentColor, 0));
    ctx.fillStyle = g1;
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = rgba(accentColor, 0.32);
    for (let px = x + 20; px < x + w - 14; px += 30) {
      for (let py = y + 20; py < y + h - 14; py += 30) {
        ctx.beginPath();
        ctx.arc(px, py, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    drawRoundedRectPath(ctx, x + 11, y + 11, w - 22, h - 22, 18);
    ctx.strokeStyle = rgba(borderColor, 0.25);
    ctx.lineWidth = 1;
    ctx.stroke();

    drawStarburstFlare(ctx, x + w - 42, y + 46, 36, '#FFFBEB', accentColor, 0.72);
  } else if (pattern === 'botanical') {
    const g1 = ctx.createRadialGradient(x + w * 0.12, y + h * 0.12, 4, x + w * 0.12, y + h * 0.12, w * 0.5);
    g1.addColorStop(0, rgba(accentColor, 0.16));
    g1.addColorStop(1, rgba(accentColor, 0));
    ctx.fillStyle = g1;
    ctx.fillRect(x, y, w, h);

    drawRoundedRectPath(ctx, x + 11, y + 11, w - 22, h - 22, 18);
    ctx.strokeStyle = rgba(accentColor, 0.32);
    ctx.lineWidth = 1.1;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
  } else if (pattern === 'aurora') {
    const gTop = ctx.createRadialGradient(x + w * 0.16, y + h * 0.14, 6, x + w * 0.16, y + h * 0.14, w * 0.65);
    gTop.addColorStop(0, 'rgba(255,255,255,0.20)');
    gTop.addColorStop(0.35, rgba(accentColor, 0.18));
    gTop.addColorStop(1, rgba(accentColor, 0));
    ctx.fillStyle = gTop;
    ctx.fillRect(x, y, w, h);

    const gCenter = ctx.createRadialGradient(x + w * 0.5, y + h * 0.52, 6, x + w * 0.5, y + h * 0.52, w * 0.58);
    gCenter.addColorStop(0, rgba(accentColor, 0.16));
    gCenter.addColorStop(0.5, rgba(glowHex, 0.08));
    gCenter.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gCenter;
    ctx.fillRect(x, y, w, h);

    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(-0.32 + timeSec * 0.08);
    ctx.strokeStyle = rgba(accentColor, 0.34);
    ctx.lineWidth = 1.1;
    ctx.setLineDash([3, 6]);
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.42, h * 0.3, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    drawRoundedRectPath(ctx, x + 12, y + 12, w - 24, h - 24, 18);
    ctx.strokeStyle = rgba(borderColor, 0.34);
    ctx.lineWidth = 1.1;
    ctx.stroke();

    drawStarburstFlare(ctx, x + w - 38, y + 40, 32, '#FFFFFF', badgeColor, 0.72);
  } else {
    // 'minimal' — architectural stationery composition
    const inkLine = isLightPaper ? borderColor : accentColor;
    const sideGrad = ctx.createLinearGradient(x + w * 0.66, y, x + w, y + h);
    sideGrad.addColorStop(0, rgba(accentColor, 0.08));
    sideGrad.addColorStop(1, rgba(accentColor, 0.03));
    ctx.fillStyle = sideGrad;
    ctx.fillRect(x + w * 0.66, y, w * 0.34, h);

    drawRoundedRectPath(ctx, x + 13, y + 13, w - 26, h - 26, 14);
    ctx.strokeStyle = rgba(inkLine, 0.42);
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.strokeStyle = rgba(accentColor, 0.48);
    ctx.beginPath();
    ctx.moveTo(x + 25, y + 14);
    ctx.lineTo(x + 25, y + h - 14);
    ctx.stroke();

    ctx.fillStyle = rgba(accentColor, 0.75);
    ctx.beginPath();
    ctx.arc(x + w - 24, y + 24, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Iridescent top rim specular for dark frosted cards
  if (!isLightPaper) {
    const rimGrad = ctx.createLinearGradient(x + 28, y, x + w - 28, y);
    rimGrad.addColorStop(0, 'rgba(255,255,255,0)');
    rimGrad.addColorStop(0.5, 'rgba(255,255,255,0.68)');
    rimGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = rimGrad;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x + 28, y + 1);
    ctx.lineTo(x + w - 28, y + 1);
    ctx.stroke();
  }

  ctx.restore();
}

function drawCardShell(
  ctx: CanvasRenderingContext2D,
  project: ConstellationProject,
  x: number,
  y: number,
  w: number,
  h: number,
  glowHex: string,
  decorMotif: CardDecorMotif,
  decorXPct: number,
  decorYPct: number,
  decorScale: number,
  decorOpacity: number,
  timeSec: number,
): void {
  const theme = resolveCardTheme(project.cardTheme);
  const colors = resolveCardColors(project);

  ctx.save();
  ctx.shadowColor = colors.isLightPaper ? 'rgba(4, 7, 20, 0.45)' : 'rgba(4, 3, 18, 0.65)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 14;

  drawRoundedRectPath(ctx, x, y, w, h, 28);
  const fillGrad = ctx.createLinearGradient(x, y, x + w * 0.6, y + h);
  if (colors.isLightPaper) {
    fillGrad.addColorStop(0, rgba(colors.surfaceBg, 0.96));
    fillGrad.addColorStop(1, rgba(colors.surfaceBgAlt, 0.95));
  } else {
    fillGrad.addColorStop(0, rgba(colors.surfaceBg, 0.84));
    fillGrad.addColorStop(1, rgba(colors.surfaceBgAlt, 0.91));
  }
  ctx.fillStyle = fillGrad;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = colors.isLightPaper
    ? rgba(colors.borderColor, 0.55)
    : rgba(colors.borderColor, 0.48);
  ctx.stroke();

  drawCardBackdropPattern(
    ctx,
    theme.paperPattern,
    x,
    y,
    w,
    h,
    colors.accentColor,
    colors.badgeColor,
    colors.borderColor,
    glowHex,
    colors.isLightPaper,
    timeSec,
  );

  if (decorMotif !== 'none') {
    ctx.save();
    drawRoundedRectPath(ctx, x, y, w, h, 28);
    ctx.clip();
    const dx = x + (clamp(decorXPct, 6, 94) / 100) * w;
    const dy = y + (clamp(decorYPct, 6, 88) / 100) * h;
    drawCardDecorMotif(
      ctx,
      decorMotif,
      dx,
      dy,
      Math.round(78 * clamp(decorScale, 0.6, 1.4)),
      colors.isLightPaper ? colors.accentColor : glowHex,
      colors.badgeColor || '#FFFBEB',
      decorOpacity,
    );
    ctx.restore();
  }

  ctx.restore();
}

function resolveCanvasTextShadow(
  ctx: CanvasRenderingContext2D,
  shadow: StarTextStyle['shadow'],
  colorHex: string,
  glowHex: string,
  isLightPaper: boolean,
): void {
  if (isLightPaper && shadow !== 'glow') {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    return;
  }
  if (shadow === 'none') {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  } else if (shadow === 'glow') {
    ctx.shadowColor = rgba(glowHex, 0.72);
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 1;
  } else if (isHexLight(colorHex)) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.76)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;
  }
}

function drawFourPointProgressIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  colorHex: string,
  lit: boolean,
  active: boolean,
): void {
  ctx.save();
  if (active) {
    ctx.shadowColor = colorHex;
    ctx.shadowBlur = 10;
  }
  ctx.globalAlpha *= lit ? (active ? 1 : 0.85) : 0.3;
  ctx.fillStyle = lit ? colorHex : '#94A3B8';
  drawFourPointStarPath(ctx, cx, cy, active ? r * 1.25 : r, active ? r * 0.48 : r * 0.38);
  ctx.fill();
  ctx.restore();
}

function drawSealedOverlay(
  ctx: CanvasRenderingContext2D,
  project: ConstellationProject,
  alpha: number,
): void {
  if (alpha <= 0.01) return;
  const env = resolveEnvelopeSettings(project);
  const textOffsetY = resolveEnvelopeTextOffsetY(project.envelopeSettings, 'phone');
  const translateYPx = computeEnvelopeTextTranslateYPx(textOffsetY, VIDEO_HEIGHT, true);

  ctx.save();
  ctx.globalAlpha *= clamp(alpha, 0, 1);

  const headerY = 26 * UI_SCALE + translateYPx;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  ctx.font = `500 ${Math.round(13 * UI_SCALE)}px "Manrope", system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(226, 232, 240, 0.92)';
  ctx.shadowColor = 'rgba(4, 6, 20, 0.78)';
  ctx.shadowBlur = 8;
  ctx.fillText(env.kickerText, VIDEO_WIDTH / 2, headerY);

  const headFontPx = Math.round(24 * UI_SCALE);
  ctx.font = `800 ${headFontPx}px "Manrope", system-ui, sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowBlur = 16;
  const headLines = wrapCanvasTextLines(
    (s) => ctx.measureText(s).width,
    env.headlineText,
    VIDEO_WIDTH - 68,
  ).slice(0, 3);
  const lineStep = Math.round(headFontPx * 1.18);
  const headStartY = headerY + Math.round(22 * UI_SCALE);
  headLines.forEach((line, i) => {
    ctx.fillText(line, VIDEO_WIDTH / 2, headStartY + i * lineStep);
  });

  // Bottom hint & frosted pearl CTA button matching RecipientView
  const ctaH = Math.round(44 * UI_SCALE);
  const ctaW = Math.min(VIDEO_WIDTH - 76, Math.round(238 * UI_SCALE));
  const ctaY = VIDEO_HEIGHT - Math.round(32 * UI_SCALE) - ctaH;
  const ctaX = (VIDEO_WIDTH - ctaW) / 2;

  ctx.font = `500 ${Math.round(12.5 * UI_SCALE)}px "Manrope", system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(226, 232, 240, 0.88)';
  ctx.shadowBlur = 10;
  ctx.fillText(env.hintText, VIDEO_WIDTH / 2, ctaY - Math.round(24 * UI_SCALE));

  ctx.save();
  ctx.shadowColor = 'rgba(109, 84, 181, 0.56)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  drawRoundedRectPath(ctx, ctaX, ctaY, ctaW, ctaH, ctaH / 2);
  const btnGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX, ctaY + ctaH);
  btnGrad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
  btnGrad.addColorStop(1, 'rgba(232, 226, 252, 0.94)');
  ctx.fillStyle = btnGrad;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Sparkle icon inside button
  ctx.fillStyle = '#5B3FC4';
  drawFourPointStarPath(ctx, ctaX + Math.round(28 * UI_SCALE), ctaY + ctaH / 2, 7, 2.5);
  ctx.fill();

  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#181236';
  ctx.font = `600 ${Math.round(14 * UI_SCALE)}px "Manrope", system-ui, sans-serif`;
  ctx.fillText(env.ctaText, VIDEO_WIDTH / 2 + 6, ctaY + ctaH / 2 + 0.5);
  ctx.restore();

  ctx.restore();
}

function drawStoryOverlay(
  ctx: CanvasRenderingContext2D,
  project: ConstellationProject,
  star: ConstellationStar,
  starIndex: number,
  image: DrawableImage | undefined,
  localT: number,
  duration: number,
  globalTimeSec: number,
): void {
  const fadeIn = easeOutCubic(localT / 0.36);
  const fadeOut = 1 - clamp((localT - (duration - 0.28)) / 0.28, 0, 1);
  const alpha = fadeIn * fadeOut;
  if (alpha <= 0.01) return;

  const totalStars = project.stars.length;
  const globalGlow = GLOW_COLORS[project.globalGlowColor] ?? GLOW_COLORS.gold;
  const activeStarGlow = GLOW_COLORS[resolveStarGlowHex(star, project.globalGlowColor)] ?? globalGlow;
  const cardTheme = resolveCardTheme(project.cardTheme);
  const cardColors = resolveCardColors(project);
  const hasExplicitCardTheme = Boolean(project.cardTheme || project.cardColors);
  const isMinimalistTheme = hasExplicitCardTheme && cardTheme.id === 'minimalist';
  const cardLayout = resolveEffectiveCardLayout(project, 'phone');
  const textStyle = resolveEffectiveStarTextStyle(star, 'phone');
  const fontMeta = resolveMessageFont(textStyle.fontId);
  const illuLayout = resolveEffectiveIllustrationLayout(star, 'phone');
  const starDecor = resolveEffectiveStarDecor(star, 'phone');
  const safeDecor = resolveSafeCardDecorPresentation(starDecor, {
    editMode: false,
    textLength: (star.message || '').length,
    compactViewport: true,
  });

  // Portrait readability scrim matching RecipientView (leaving upper sky open for 3D star)
  ctx.save();
  ctx.globalAlpha *= alpha;
  const scrim = ctx.createLinearGradient(0, VIDEO_HEIGHT, 0, 0);
  scrim.addColorStop(0, 'rgba(7, 11, 26, 0.90)');
  scrim.addColorStop(0.54, 'rgba(7, 11, 26, 0.44)');
  scrim.addColorStop(1, 'rgba(7, 11, 26, 0)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

  // Top progress stars bar
  const barY = Math.round(28 * UI_SCALE);
  const dotStep = Math.min(24, 210 / Math.max(1, totalStars));
  const counterW = 46;
  const rowW = (totalStars - 1) * dotStep + counterW;
  const dotsStartX = VIDEO_WIDTH / 2 - rowW / 2 + 8;

  for (let i = 0; i < totalStars; i++) {
    const s = project.stars[i];
    const g = GLOW_COLORS[resolveStarGlowHex(s, project.globalGlowColor)] ?? globalGlow;
    drawFourPointProgressIcon(
      ctx,
      dotsStartX + i * dotStep,
      barY,
      6.5,
      g.hex,
      i <= starIndex,
      i === starIndex,
    );
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(12 * UI_SCALE)}px "Manrope", system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(226, 232, 240, 0.85)';
  ctx.fillText(
    `${starIndex + 1} / ${totalStars}`,
    dotsStartX + (totalStars - 1) * dotStep + 14,
    barY + 0.5,
  );

  // Story stage below upper ~30.5% 3D crystal star viewport
  const stageTop = Math.round(VIDEO_HEIGHT * 0.305);
  const stageBottom = VIDEO_HEIGHT - 22;
  const stageAvailH = stageBottom - stageTop;

  const targetW = cardLayout.customWidthPx
    ? clamp(Math.round(cardLayout.customWidthPx * UI_SCALE), 270, VIDEO_WIDTH - 24)
    : cardLayout.width === 'compact'
      ? 406
      : cardLayout.width === 'wide'
        ? 504
        : 462;
  const cardW = Math.min(VIDEO_WIDTH - 24, targetW);
  const cardScale = cardLayout.scale ?? 1;
  const cardOffsetY = Math.round(cardLayout.offsetY * 0.7 * UI_SCALE);
  const slideY = (1 - fadeIn) * 20;

  const padH = isMinimalistTheme
    ? cardLayout.padding === 'compact'
      ? 34
      : cardLayout.padding === 'spacious'
        ? 46
        : 40
    : cardLayout.padding === 'compact'
      ? 22
      : cardLayout.padding === 'spacious'
        ? 34
        : 26;
  const padRight = cardLayout.padding === 'compact' ? 22 : cardLayout.padding === 'spacious' ? 34 : 26;
  const padV = cardLayout.padding === 'compact' ? 18 : cardLayout.padding === 'spacious' ? 28 : 22;

  const innerW = cardW - padH - padRight;

  const effectiveAlign: Exclude<MessageTextAlign, 'auto'> =
    textStyle.textAlign === 'auto'
      ? isMinimalistTheme
        ? 'left'
        : 'center'
      : textStyle.textAlign;

  const textBlockW = Math.max(120, Math.round(innerW * (textStyle.widthPct / 100)));
  const marginLeftPct = computeTextBlockMarginLeftPct(textStyle.widthPct, textStyle.offsetX);
  const textBlockRelX = Math.round(innerW * (marginLeftPct / 100));

  const bodyPxBase = Math.round(
    Math.min(20, textStyle.fontSize + fontMeta.opticalSizeBoost) * UI_SCALE,
  );
  const titlePx = Math.round(Math.min(31 * UI_SCALE, bodyPxBase * 1.48));
  const titleLineH = Math.round(titlePx * clamp(textStyle.lineHeight * 0.78, 1.12, 1.4));

  const titleText = star.title.trim() || `Звезда ${starIndex + 1}`;
  const msgText = star.message.trim() || 'Здесь хранится особое тёплое пожелание.';
  const signatureText =
    project.senderName?.trim() || (project.recipientName ? `Для ${project.recipientName}` : '');

  ctx.font = `600 ${titlePx}px ${fontMeta.cssFamily}`;
  const titleLines = wrapCanvasTextLines((s) => ctx.measureText(s).width, titleText, textBlockW).slice(0, 3);

  let bodyPx = bodyPxBase;
  let msgLines: string[] = [];
  let bodyLineH = bodyPx * textStyle.lineHeight;
  let illuSize = Math.round(118 * UI_SCALE * Math.min(1.28, illuLayout.scale));

  const maxCardH = Math.min(stageAvailH - 8, cardLayout.customHeightPx ? Math.round(cardLayout.customHeightPx * UI_SCALE) : stageAvailH - 8);
  const measureTotalContent = (imgPx: number, bPx: number) => {
    ctx.font = `${textStyle.fontWeight === 'semibold' ? '600' : '400'} ${bPx}px ${fontMeta.cssFamily}`;
    const wrapW = textBlockW - (textStyle.accent === 'frame' ? 28 : textStyle.accent === 'quote' ? 18 : 4);
    const lines = wrapCanvasTextLines((s) => ctx.measureText(s).width, msgText, wrapW);
    const lh = bPx * textStyle.lineHeight;
    const ordH = Math.round(15 * UI_SCALE);
    const sigH = signatureText ? Math.round(22 * UI_SCALE) : 0;
    const textH = ordH + titleLines.length * titleLineH + 10 + lines.length * lh + sigH + (textStyle.accent === 'frame' ? 26 : 0);
    return { lines, lh, textH, totalH: imgPx + 18 + textH + padV * 2 };
  };

  let measured = measureTotalContent(illuSize, bodyPx);
  if (measured.totalH > maxCardH) {
    // Smoothly compact illustration slightly first, then font size if unusually long message
    illuSize = Math.max(92, Math.round(illuSize * 0.8));
    measured = measureTotalContent(illuSize, bodyPx);
    while (measured.totalH > maxCardH && bodyPx > 14) {
      bodyPx -= 1;
      measured = measureTotalContent(illuSize, bodyPx);
    }
  }
  msgLines = measured.lines;
  bodyLineH = measured.lh;

  const minNeededH = Math.min(maxCardH, Math.max(300, measured.totalH + 22));
  const cardH = cardLayout.customHeightPx
    ? clamp(Math.round(cardLayout.customHeightPx * UI_SCALE), minNeededH, maxCardH)
    : minNeededH;

  const cardX = Math.round((VIDEO_WIDTH - cardW) / 2);
  const cardBaseY =
    cardLayout.verticalAlign === 'top'
      ? stageTop + 6
      : Math.round(stageTop + (stageAvailH - cardH) / 2);

  // Apply card scale & vertical offset cleanly around card center
  ctx.save();
  const cx = cardX + cardW / 2;
  const cy = cardBaseY + cardH / 2 + cardOffsetY + slideY;
  ctx.translate(cx, cy);
  ctx.scale(cardScale, cardScale);
  ctx.translate(-cx, -cy);

  if (hasExplicitCardTheme) {
    drawCardShell(
      ctx,
      project,
      cardX,
      cardBaseY,
      cardW,
      cardH,
      activeStarGlow.hex,
      starDecor.motif,
      safeDecor.xPct,
      safeDecor.yPct,
      safeDecor.scale,
      safeDecor.opacity,
      globalTimeSec,
    );
  }

  // Compute flexible inner spacing matching RecipientView (lines 919-962)
  const illuYShift = illuLayout.offsetY / 100;
  const textYShift = textStyle.offsetY / 100;
  const spacerBase = 0.35;
  const rawTopOuterGrow = clamp(spacerBase * (1 + illuYShift * 0.85) - Math.max(0, -textYShift) * 0.45, 0, 2.0);
  const rawTopInnerGrow = clamp(0.14 + Math.max(0, textYShift) * 1.4 + Math.max(0, -illuYShift) * 0.7, 0.06, 2.2);
  const rawBottomInnerGrow = clamp(spacerBase + Math.max(0, -textYShift) * 1.35 - Math.max(0, textYShift) * 0.65, 0, 2.4);

  const topOuterGrow =
    cardLayout.verticalAlign === 'top'
      ? rawTopOuterGrow * 0.2
      : cardLayout.verticalAlign === 'spread'
        ? rawTopOuterGrow * 0.4
        : rawTopOuterGrow;
  const topInnerGrow = cardLayout.verticalAlign === 'spread' ? rawTopInnerGrow + 0.75 : rawTopInnerGrow;
  const bottomInnerGrow =
    cardLayout.verticalAlign === 'top'
      ? rawBottomInnerGrow + 1.15
      : cardLayout.verticalAlign === 'spread'
        ? rawBottomInnerGrow * 0.4
        : rawBottomInnerGrow;

  const slackH = Math.max(0, cardH - padV * 2 - illuSize - measured.textH);
  const growSum = Math.max(0.01, topOuterGrow + topInnerGrow + bottomInnerGrow);
  const topOuterPx = slackH * (topOuterGrow / growSum);
  const topInnerPx = Math.max(10, slackH * (topInnerGrow / growSum));

  const innerX = cardX + padH;
  const illuCenterRatio = (illuLayout.offsetX + 100) / 200;
  const illuX = Math.round(innerX + Math.max(0, innerW - illuSize) * illuCenterRatio);
  const illuY = Math.round(cardBaseY + padV + topOuterPx);

  // Soft aura behind illustration
  const illuAura = ctx.createRadialGradient(
    illuX + illuSize / 2,
    illuY + illuSize / 2,
    4,
    illuX + illuSize / 2,
    illuY + illuSize / 2,
    illuSize * 0.72,
  );
  illuAura.addColorStop(0, rgba(activeStarGlow.hex, 0.24));
  illuAura.addColorStop(1, rgba(activeStarGlow.hex, 0));
  ctx.fillStyle = illuAura;
  ctx.beginPath();
  ctx.arc(illuX + illuSize / 2, illuY + illuSize / 2, illuSize * 0.72, 0, Math.PI * 2);
  ctx.fill();

  if (image) {
    const imgSettings = resolveStarImageSettings(star);
    const iw = image instanceof HTMLCanvasElement ? image.width : image.naturalWidth || image.width;
    const ih = image instanceof HTMLCanvasElement ? image.height : image.naturalHeight || image.height;
    if (iw > 0 && ih > 0) {
      ctx.save();
      drawRoundedRectPath(ctx, illuX, illuY, illuSize, illuSize, star.illustration.type === 'custom' ? 20 : 12);
      ctx.clip();

      if (star.illustration.type === 'custom') {
        ctx.fillStyle = cardColors.isLightPaper ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)';
        ctx.fillRect(illuX, illuY, illuSize, illuSize);
      }

      const fitScale =
        imgSettings.fit === 'cover'
          ? Math.max(illuSize / iw, illuSize / ih)
          : Math.min(illuSize / iw, illuSize / ih);
      const finalScale = fitScale * imgSettings.scale;
      const drawW = iw * finalScale;
      const drawH = ih * finalScale;
      const dx = illuX + (illuSize - drawW) / 2 + (imgSettings.offsetX / 100) * (illuSize * 0.5);
      const dy = illuY + (illuSize - drawH) / 2 + (imgSettings.offsetY / 100) * (illuSize * 0.5);
      ctx.drawImage(image, dx, dy, drawW, drawH);
      ctx.restore();

      if (star.illustration.type === 'custom') {
        ctx.save();
        drawRoundedRectPath(ctx, illuX, illuY, illuSize, illuSize, 20);
        ctx.strokeStyle = rgba(cardColors.accentColor, 0.45);
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // Message block anchored accurately inside card
  const storyTextShiftY = Math.round(textStyle.offsetY * 0.32 * UI_SCALE);
  const textX = innerX + textBlockRelX;
  const textY = Math.round(illuY + illuSize + topInnerPx + storyTextShiftY);

  const rawTextColor = star.textStyle || !cardColors.isLightPaper ? textStyle.color : cardColors.textColor;
  const resolvedTextColor = resolveContrastSafeCardTextColor(rawTextColor, project, cardColors);

  ctx.save();
  if (textStyle.accent === 'frame') {
    drawRoundedRectPath(ctx, textX, textY - 8, textBlockW, measured.textH + 4, 16);
    ctx.fillStyle = cardColors.isLightPaper ? 'rgba(255,255,255,0.62)' : 'rgba(7,11,26,0.62)';
    ctx.fill();
    ctx.strokeStyle = rgba(cardColors.isLightPaper ? cardColors.accentColor : activeStarGlow.hex, 0.35);
    ctx.lineWidth = 1.2;
    ctx.stroke();
  } else if (textStyle.accent === 'quote') {
    ctx.fillStyle = cardColors.isLightPaper ? cardColors.accentColor : activeStarGlow.hex;
    const barX = effectiveAlign === 'right' ? textX + textBlockW - 3 : textX;
    ctx.fillRect(barX, textY + 2, 3, measured.textH - 10);
  }

  const innerTextPad = textStyle.accent === 'frame' ? 14 : textStyle.accent === 'quote' ? 14 : 0;
  const drawTextX =
    effectiveAlign === 'left'
      ? textX + innerTextPad
      : effectiveAlign === 'right'
        ? textX + textBlockW - innerTextPad
        : textX + textBlockW / 2;

  let curY = textY + (textStyle.accent === 'frame' ? 8 : 0);

  if (textStyle.accent === 'line') {
    const lineGrad = ctx.createLinearGradient(textX, curY, textX + 64, curY);
    lineGrad.addColorStop(0, cardColors.isLightPaper ? cardColors.accentColor : activeStarGlow.hex);
    lineGrad.addColorStop(1, cardColors.isLightPaper ? cardColors.badgeColor : activeStarGlow.coreHex);
    ctx.fillStyle = lineGrad;
    const lx =
      effectiveAlign === 'left'
        ? textX
        : effectiveAlign === 'right'
          ? textX + textBlockW - 64
          : textX + (textBlockW - 64) / 2;
    drawRoundedRectPath(ctx, lx, curY, 64, 2.5, 1.5);
    ctx.fill();
    curY += 10;
  }

  // Ordinal line
  ctx.textAlign = effectiveAlign;
  ctx.textBaseline = 'top';
  ctx.fillStyle = cardColors.isLightPaper ? cardColors.badgeColor : activeStarGlow.coreHex;
  ctx.font = isMinimalistTheme
    ? `600 ${Math.round(10.5 * UI_SCALE)}px "Manrope", system-ui, sans-serif`
    : `500 ${Math.round(12 * UI_SCALE)}px ${fontMeta.cssFamily}`;
  const ordText = isMinimalistTheme
    ? `ЗВЕЗДА ${String(starIndex + 1).padStart(2, '0')} / ${String(totalStars).padStart(2, '0')}`
    : `Звезда ${starIndex + 1} из ${totalStars}`;
  ctx.fillText(ordText, drawTextX, curY);
  curY += Math.round(17 * UI_SCALE);

  // Star Title
  ctx.fillStyle = resolvedTextColor;
  resolveCanvasTextShadow(ctx, textStyle.shadow, resolvedTextColor, activeStarGlow.hex, cardColors.isLightPaper);
  ctx.font = `600 ${titlePx}px ${fontMeta.cssFamily}`;
  titleLines.forEach((line) => {
    ctx.fillText(line, drawTextX, curY);
    curY += titleLineH;
  });
  curY += 8;

  // Star Message
  ctx.font = `${textStyle.fontWeight === 'semibold' ? '600' : '400'} ${bodyPx}px ${fontMeta.cssFamily}`;
  msgLines.forEach((line) => {
    ctx.fillText(line, drawTextX, curY);
    curY += bodyLineH;
  });

  // Signature
  if (signatureText) {
    curY += 6;
    ctx.save();
    ctx.globalAlpha *= 0.82;
    const sigPx = clamp(Math.round(bodyPx * 0.8), 14, 22);
    ctx.font = `italic 400 ${sigPx}px ${fontMeta.cssFamily}`;
    ctx.fillText(`— ${signatureText}`, drawTextX, curY);
    ctx.restore();
  }

  ctx.restore();
  ctx.restore();
  ctx.restore();
}

function drawConstellationFinaleOverlay(
  ctx: CanvasRenderingContext2D,
  project: ConstellationProject,
  localT: number,
  duration: number,
  globalTimeSec: number,
): void {
  const palette = COSMIC_PALETTES[project.paletteId] ?? COSMIC_PALETTES.lavender;
  const globalGlow = GLOW_COLORS[project.globalGlowColor] ?? GLOW_COLORS.gold;

  const headerFade = easeOutCubic(localT / 0.55);
  const endFade = 1 - clamp((localT - (duration - 0.5)) / 0.5, 0, 1);

  // Top Finale Title (matches RecipientView lines 2987-3016)
  ctx.save();
  ctx.globalAlpha *= headerFade * endFade;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = palette.lineTint;
  ctx.font = `600 ${Math.round(10.5 * UI_SCALE)}px "Manrope", system-ui, sans-serif`;
  ctx.fillText('✦  СОЗВЕЗДИЕ  ✦', VIDEO_WIDTH / 2, Math.round(18 * UI_SCALE));

  const titleFontPx = Math.round(19 * UI_SCALE);
  ctx.font = `700 ${titleFontPx}px "Manrope", system-ui, sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(4, 6, 20, 0.9)';
  ctx.shadowBlur = 16;
  const finaleTitle = project.title.trim() || 'Моё созвездие';
  const titleLines = wrapCanvasTextLines((s) => ctx.measureText(s).width, finaleTitle, VIDEO_WIDTH - 120).slice(0, 2);
  const titleTopY = Math.round(34 * UI_SCALE);
  titleLines.forEach((line, idx) => {
    ctx.fillText(line, VIDEO_WIDTH / 2, titleTopY + idx * Math.round(titleFontPx * 1.18));
  });

  const lineY = titleTopY + titleLines.length * Math.round(titleFontPx * 1.18) + 7;
  const divGrad = ctx.createLinearGradient(VIDEO_WIDTH / 2 - 64, lineY, VIDEO_WIDTH / 2 + 64, lineY);
  divGrad.addColorStop(0, 'rgba(255,255,255,0)');
  divGrad.addColorStop(0.5, globalGlow.hex);
  divGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(VIDEO_WIDTH / 2 - 64, lineY);
  ctx.lineTo(VIDEO_WIDTH / 2 + 64, lineY);
  ctx.stroke();
  ctx.restore();

  // FinalLetterCard emerges gracefully after 1.15s of unobstructed 3D rotating constellation
  const letterDelay = 1.15;
  if (localT <= letterDelay) return;

  const appear = easeOutExpoish((localT - letterDelay) / 0.72);
  if (appear <= 0.01) return;

  const cardTheme = resolveCardTheme(project.cardTheme);
  const cardColors = resolveCardColors(project);
  const isMinimalist = cardTheme.id === 'minimalist';
  const finalStyle = resolveEffectiveFinalTextStyle(project, 'phone');
  const isDefaultSharedText = !project.finalTextStyle || isDefaultStarTextStyle(finalStyle);
  const fontMeta = resolveMessageFont(finalStyle.fontId);
  const finalDecor = resolveEffectiveFinalDecor(project, 'phone');
  const safeDecor = resolveSafeCardDecorPresentation(finalDecor, {
    editMode: false,
    textLength: (project.finalMessage || '').length,
    compactViewport: true,
  });
  const cardLayout = resolveEffectiveCardLayout(project, 'phone');

  const cardW = cardLayout.customWidthPx
    ? clamp(Math.round(cardLayout.customWidthPx * UI_SCALE), 270, VIDEO_WIDTH - 24)
    : cardLayout.width === 'compact'
      ? 406
      : cardLayout.width === 'wide'
        ? 500
        : 462;

  const bodyPxBase = clamp(
    Math.round((finalStyle.fontSize + fontMeta.opticalSizeBoost) * 1.15 * UI_SCALE),
    14,
    Math.round(24 * UI_SCALE),
  );
  const headerPx = clamp(Math.round(bodyPxBase * 0.68), 14, Math.round(15 * UI_SCALE));
  const signaturePx = clamp(Math.round(bodyPxBase * 0.8), 16, Math.round(24 * UI_SCALE));

  const padH = isMinimalist ? 34 : cardLayout.padding === 'compact' ? 22 : cardLayout.padding === 'spacious' ? 32 : 26;
  const innerW = cardW - padH * 2;
  const textBlockW = Math.max(120, Math.round(innerW * (finalStyle.widthPct / 100)));
  const marginLeftPct = computeTextBlockMarginLeftPct(finalStyle.widthPct, finalStyle.offsetX);
  const textBlockRelX = Math.round(innerW * (marginLeftPct / 100));

  const effectiveAlign: Exclude<MessageTextAlign, 'auto'> =
    finalStyle.textAlign !== 'auto'
      ? finalStyle.textAlign
      : isMinimalist
        ? 'left'
        : 'center';

  const finalMsgText = project.finalMessage.trim() || 'С любовью и тёплыми пожеланиями.';
  let bodyPx = bodyPxBase;
  let msgLines: string[] = [];
  let lineH = bodyPx * finalStyle.lineHeight;
  const maxBodyH = 440;

  while (bodyPx >= 14) {
    ctx.font = `${finalStyle.fontWeight === 'semibold' ? '600' : '400'} ${bodyPx}px ${fontMeta.cssFamily}`;
    const wrapW = textBlockW - (finalStyle.accent === 'frame' ? 28 : finalStyle.accent === 'quote' ? 18 : 4);
    msgLines = wrapCanvasTextLines((s) => ctx.measureText(s).width, finalMsgText, wrapW);
    lineH = bodyPx * finalStyle.lineHeight;
    if (msgLines.length * lineH <= maxBodyH) break;
    bodyPx -= 1;
  }

  const signatureText =
    project.senderName?.trim() || (project.recipientName ? `Для ${project.recipientName}` : '');
  const headerBlockH = Math.round(44 * UI_SCALE);
  const footerBlockH = signatureText ? Math.round(42 * UI_SCALE) : 16;
  const bodyPadV = cardLayout.padding === 'compact' ? 26 : cardLayout.padding === 'spacious' ? 40 : 34;
  const bodyBlockH = Math.round(msgLines.length * lineH + bodyPadV + (finalStyle.accent === 'frame' ? 24 : 0));

  const computedCardH = clamp(headerBlockH + bodyBlockH + footerBlockH, 240, 680);
  const cardH = cardLayout.customHeightPx
    ? clamp(Math.round(cardLayout.customHeightPx * UI_SCALE), computedCardH, 700)
    : computedCardH;

  const cardX = Math.round((VIDEO_WIDTH - cardW) / 2);
  const baseTop =
    cardLayout.verticalAlign === 'top'
      ? lineY + 24
      : Math.max(lineY + 22, Math.round((VIDEO_HEIGHT - cardH) * 0.56));
  const cardShiftY = Math.round(cardLayout.offsetY * 1.4 * UI_SCALE);
  const animY = (1 - appear) * 145;
  const cardScale = (cardLayout.scale ?? 1) * lerp(0.86, 1.0, appear);

  ctx.save();
  ctx.globalAlpha *= appear * endFade;
  const cx = cardX + cardW / 2;
  const cy = baseTop + cardH / 2 + cardShiftY + animY;
  ctx.translate(cx, cy);
  ctx.scale(cardScale, cardScale);
  ctx.translate(-cx, -cy);

  drawCardShell(
    ctx,
    project,
    cardX,
    baseTop,
    cardW,
    cardH,
    globalGlow.hex,
    finalDecor.motif,
    safeDecor.xPct,
    safeDecor.yPct,
    safeDecor.scale,
    safeDecor.opacity,
    globalTimeSec,
  );

  // Header badge + "Для ... · Название"
  const headX = cardX + padH;
  const headY = baseTop + Math.round(16 * UI_SCALE);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = cardColors.accentColor;
  if (isMinimalist) {
    ctx.save();
    ctx.translate(headX + 6, headY + 12);
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = cardColors.accentColor;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(-4, -4, 8, 8);
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.arc(headX + 12, headY + 12, 12, 0, Math.PI * 2);
    ctx.fillStyle = rgba(cardColors.accentColor, 0.14);
    ctx.fill();
    ctx.strokeStyle = rgba(cardColors.accentColor, 0.48);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = cardColors.accentColor;
    drawFourPointStarPath(ctx, headX + 12, headY + 12, 6, 2);
    ctx.fill();
  }

  ctx.fillStyle = cardColors.badgeColor;
  ctx.font = `600 ${headerPx}px "Manrope", system-ui, sans-serif`;
  const recLabel = project.recipientName.trim() ? `Для ${project.recipientName.trim()}` : 'Поздравление';
  const headerLabel = `${recLabel} · ${finaleTitle}`;
  ctx.fillText(headerLabel, headX + 32, headY + 12, innerW - 36);

  // Subtle horizontal divider below header
  const divY = baseTop + headerBlockH;
  const hGrad = ctx.createLinearGradient(cardX + padH, divY, cardX + cardW - padH, divY);
  hGrad.addColorStop(0, 'rgba(0,0,0,0)');
  hGrad.addColorStop(0.5, rgba(cardColors.accentColor, 0.36));
  hGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.strokeStyle = hGrad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + padH, divY);
  ctx.lineTo(cardX + cardW - padH, divY);
  ctx.stroke();

  // Body message block
  const rawTextColor =
    project.finalTextStyle && !isDefaultSharedText
      ? finalStyle.color
      : project.cardColors?.textColor ??
        (project.cardTheme ? cardColors.textColor : finalStyle.color);
  const resolvedTextColor = resolveContrastSafeCardTextColor(rawTextColor, project, cardColors);

  const textShiftY = Math.round(finalStyle.offsetY * 0.25 * UI_SCALE);
  const textX = cardX + padH + textBlockRelX;
  const textY = divY + Math.round(bodyPadV * 0.5) + textShiftY;

  ctx.save();
  if (finalStyle.accent === 'frame') {
    drawRoundedRectPath(ctx, textX, textY - 8, textBlockW, msgLines.length * lineH + 22, 16);
    ctx.fillStyle = cardColors.isLightPaper ? 'rgba(255,255,255,0.58)' : 'rgba(6,8,20,0.52)';
    ctx.fill();
    ctx.strokeStyle = rgba(cardColors.accentColor, 0.35);
    ctx.lineWidth = 1.2;
    ctx.stroke();
  } else if (finalStyle.accent === 'quote') {
    ctx.fillStyle = cardColors.accentColor;
    const barX = effectiveAlign === 'right' ? textX + textBlockW - 3 : textX;
    ctx.fillRect(barX, textY, 3, msgLines.length * lineH);
  }

  let curY = textY + (finalStyle.accent === 'frame' ? 4 : 0);
  if (finalStyle.accent === 'line') {
    ctx.fillStyle = cardColors.accentColor;
    const lx =
      effectiveAlign === 'left'
        ? textX
        : effectiveAlign === 'right'
          ? textX + textBlockW - 64
          : textX + (textBlockW - 64) / 2;
    drawRoundedRectPath(ctx, lx, curY - 8, 64, 2.5, 1.5);
    ctx.fill();
  }

  const innerTextPad = finalStyle.accent === 'frame' ? 14 : finalStyle.accent === 'quote' ? 14 : 0;
  const drawTextX =
    effectiveAlign === 'left'
      ? textX + innerTextPad
      : effectiveAlign === 'right'
        ? textX + textBlockW - innerTextPad
        : textX + textBlockW / 2;

  ctx.textAlign = effectiveAlign;
  ctx.textBaseline = 'top';
  ctx.fillStyle = resolvedTextColor;
  resolveCanvasTextShadow(ctx, finalStyle.shadow, resolvedTextColor, globalGlow.hex, cardColors.isLightPaper);
  ctx.font = `${finalStyle.fontWeight === 'semibold' ? '600' : '400'} ${bodyPx}px ${fontMeta.cssFamily}`;
  msgLines.forEach((line) => {
    ctx.fillText(line, drawTextX, curY);
    curY += lineH;
  });
  ctx.restore();

  // Footer signature
  if (signatureText) {
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = cardColors.badgeColor;
    ctx.font = `italic 600 ${signaturePx}px "Cormorant Garamond", Georgia, serif`;
    ctx.fillText(`— ${signatureText}`, cardX + cardW - padH, baseTop + cardH - Math.round(14 * UI_SCALE));
  }

  ctx.restore();
}

class ThreeDVideoSceneDriver {
  private host: HTMLDivElement;
  private engine: ConstellationEngine;
  private baseState: ConstellationSceneState;
  private project: ConstellationProject;
  private activeSegmentIndex = -1;

  constructor(project: ConstellationProject) {
    if (!hasWebGL2Support()) {
      throw new Error('Для рендера 3D-видео требуется поддержка WebGL2 в браузере.');
    }

    this.project = project;
    this.host = document.createElement('div');
    this.host.style.cssText = [
      'position:fixed',
      'left:-9999px',
      'top:0',
      `width:${VIDEO_WIDTH}px`,
      `height:${VIDEO_HEIGHT}px`,
      'pointer-events:none',
      'opacity:0',
      'z-index:-1',
    ].join(';');
    document.body.appendChild(this.host);

    let webglFailed = false;
    const phoneConstellationLayout = resolveEffectiveConstellationLayout(project, 'phone');
    const cleanConnections = sanitizeConnections(project.connections, project.stars);

    this.baseState = {
      paletteId: project.paletteId,
      globalGlowColor: project.globalGlowColor,
      stars: project.stars,
      connections: cleanConnections,
      selectedStarId: null,
      visitedStarIds: [],
      interactionMode: 'recipient',
      recipientPhase: 'sealed',
      unlockedCount: 0,
      finaleActive: false,
      lowPerformance: false,
      reducedMotion: false,
      deviceMode: 'phone',
      constellationLayout: phoneConstellationLayout,
      envelopeSettings: project.envelopeSettings,
      constellationAnimation: resolveConstellationAnimation(project),
    };

    this.engine = new ConstellationEngine(
      this.host,
      this.baseState,
      {
        onWebGLUnavailable: () => {
          webglFailed = true;
        },
      },
      { startSealed: true, manualStep: true },
    );

    if (webglFailed) {
      this.dispose();
      throw new Error('Не удалось запустить 3D WebGL-движок для записи видео.');
    }
  }

  private applySegmentTransition(seg: VideoTimelineSegment): void {
    const stars = this.project.stars;
    const allIds = stars.map((s) => s.id);

    if (seg.kind === 'sealed') {
      this.engine.updateState({
        ...this.baseState,
        recipientPhase: 'sealed',
        unlockedCount: 0,
        visitedStarIds: [],
        selectedStarId: null,
        finaleActive: false,
      });
      return;
    }

    if (seg.kind === 'birthing') {
      this.engine.updateState({
        ...this.baseState,
        recipientPhase: 'birthing',
        unlockedCount: 1,
        visitedStarIds: stars[0] ? [stars[0].id] : [],
        selectedStarId: stars[0]?.id ?? null,
        finaleActive: false,
      });
      this.engine.playBirthSequence();
      return;
    }

    if (seg.kind === 'star' && typeof seg.starIndex === 'number') {
      const idx = clamp(seg.starIndex, 0, Math.max(0, stars.length - 1));
      const targetStar = stars[idx];
      this.engine.updateState({
        ...this.baseState,
        recipientPhase: 'starStory',
        unlockedCount: idx + 1,
        visitedStarIds: stars.slice(0, idx + 1).map((s) => s.id),
        selectedStarId: targetStar?.id ?? null,
        finaleActive: false,
      });
      if (idx >= 1 && targetStar) {
        this.engine.triggerStarBirth(targetStar.id);
      }
      return;
    }

    if (seg.kind === 'finalReveal') {
      this.engine.updateState({
        ...this.baseState,
        recipientPhase: 'finalReveal',
        unlockedCount: stars.length,
        visitedStarIds: allIds,
        selectedStarId: null,
        finaleActive: true,
      });
      this.engine.playFinalReveal();
      return;
    }

    this.engine.updateState({
      ...this.baseState,
      recipientPhase: 'constellation',
      unlockedCount: stars.length,
      visitedStarIds: allIds,
      selectedStarId: null,
      finaleActive: true,
    });
  }

  public renderFrameAtTime(
    ctx: CanvasRenderingContext2D,
    timeline: VideoTimeline,
    illustrations: Map<string, DrawableImage>,
    timeSec: number,
    dt: number,
  ): void {
    let segIndex = timeline.segments.findIndex(
      (s, i) =>
        timeSec >= s.startSec &&
        (timeSec < s.endSec || i === timeline.segments.length - 1),
    );
    if (segIndex === -1) segIndex = timeline.segments.length - 1;

    // Trigger every missed intermediate transition sequentially in real-time fallback mode
    while (this.activeSegmentIndex < segIndex) {
      this.activeSegmentIndex += 1;
      this.applySegmentTransition(timeline.segments[this.activeSegmentIndex]);
    }

    const webglCanvas = this.engine.stepAndRenderForExport(dt);
    if (webglCanvas) {
      ctx.drawImage(webglCanvas, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
    } else {
      ctx.fillStyle = '#070411';
      ctx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
    }

    const seg = timeline.segments[segIndex];
    const localT = Math.max(0, timeSec - seg.startSec);

    if (seg.kind === 'sealed') {
      const fadeIn = easeOutCubic(localT / 0.45);
      drawSealedOverlay(ctx, this.project, fadeIn);
    } else if (seg.kind === 'birthing') {
      // Fade out envelope headline & CTA swiftly as 3D seal ignites and envelope bursts open
      const fadeOut = 1 - clamp(localT / 0.28, 0, 1);
      drawSealedOverlay(ctx, this.project, fadeOut);
    } else if (seg.kind === 'star' && typeof seg.starIndex === 'number') {
      const star = this.project.stars[seg.starIndex];
      if (star) {
        drawStoryOverlay(
          ctx,
          this.project,
          star,
          seg.starIndex,
          illustrations.get(star.id),
          localT,
          seg.durationSec,
          timeSec,
        );
      }
    } else if (seg.kind === 'constellation') {
      drawConstellationFinaleOverlay(
        ctx,
        this.project,
        localT,
        seg.durationSec,
        timeSec,
      );
    }
  }

  public dispose(): void {
    try {
      this.engine.dispose();
    } catch {
      // ignore disposal errors
    }
    this.host.remove();
  }
}

async function prepareAudioTrackBuffer(
  project: ConstellationProject,
  targetDurationSec: number,
  targetSampleRate: number,
  targetChannels: number,
  signal?: AbortSignal,
): Promise<AudioBuffer | null> {
  if (project.musicTrackId === 'none') return null;

  const music = await resolveProjectMusicForExport(project);
  throwIfAborted(signal);

  if (!music) {
    if (project.musicTrackId === 'custom') {
      throw new Error(
        'Выбранная пользовательская музыка не найдена. Загрузите аудиофайл заново или выберите встроенную мелодию.',
      );
    }
    return null;
  }

  const rawBytes = await music.blob.arrayBuffer();
  throwIfAborted(signal);

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) {
    throw new Error('Браузер не поддерживает Web Audio API для обработки музыки.');
  }

  const decodeCtx = new AudioCtx();
  let decoded: AudioBuffer;
  try {
    decoded = await decodeCtx.decodeAudioData(rawBytes.slice(0));
  } catch {
    throw new Error(`Не удалось декодировать аудиофайл «${music.name}».`);
  } finally {
    await decodeCtx.close().catch(() => undefined);
  }

  throwIfAborted(signal);

  const totalFrames = Math.max(1, Math.ceil(targetDurationSec * targetSampleRate));
  const offline = new OfflineAudioContext(targetChannels, totalFrames, targetSampleRate);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.loop = true;

  const gain = offline.createGain();
  const fadeInEnd = Math.min(0.8, targetDurationSec * 0.15);
  const fadeOutStart = Math.max(fadeInEnd, targetDurationSec - 1.8);

  gain.gain.setValueAtTime(0.001, 0);
  gain.gain.linearRampToValueAtTime(0.82, fadeInEnd);
  gain.gain.setValueAtTime(0.82, fadeOutStart);
  gain.gain.linearRampToValueAtTime(0.0001, targetDurationSec);

  src.connect(gain);
  gain.connect(offline.destination);
  src.start(0);

  return await offline.startRendering();
}

async function pickSupportedVideoConfig(): Promise<VideoEncoderConfig | null> {
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') {
    return null;
  }
  const codecs = [
    'avc1.42001f', // Baseline L3.1 (universal iOS Safari / Photos / Telegram)
    'avc1.42E01E', // Constrained Baseline L3.0
    'avc1.4d002a', // Main L4.2
    'avc1.640028', // High L4.0
  ];
  for (const codec of codecs) {
    try {
      const cfg: VideoEncoderConfig = {
        codec,
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
        bitrate: VIDEO_BITRATE,
        framerate: VIDEO_FPS,
        avc: { format: 'avc' },
      };
      const support = await VideoEncoder.isConfigSupported(cfg);
      if (support.supported) {
        return cfg;
      }
    } catch {
      // Try next H.264 profile
    }
  }
  return null;
}

async function pickSupportedAudioConfig(): Promise<{
  sampleRate: number;
  numberOfChannels: number;
  bitrate: number;
} | null> {
  if (typeof AudioEncoder === 'undefined' || typeof AudioData === 'undefined') {
    return null;
  }
  const candidates = [
    { sampleRate: 48000, numberOfChannels: 2, bitrate: AUDIO_BITRATE },
    { sampleRate: 44100, numberOfChannels: 2, bitrate: AUDIO_BITRATE },
    { sampleRate: 48000, numberOfChannels: 1, bitrate: 72_000 },
    { sampleRate: 44100, numberOfChannels: 1, bitrate: 72_000 },
  ];
  for (const c of candidates) {
    try {
      const support = await AudioEncoder.isConfigSupported({
        codec: 'mp4a.40.2',
        sampleRate: c.sampleRate,
        numberOfChannels: c.numberOfChannels,
        bitrate: c.bitrate,
      });
      if (support.supported) {
        return c;
      }
    } catch {
      // Try next AAC config
    }
  }
  return null;
}

function pickSupportedMediaRecorderMp4Mime(withAudio: boolean): string | null {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return null;
  }
  const candidates = withAudio
    ? [
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4;codecs=avc1.42001f,mp4a.40.2',
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4;codecs=h264,aac',
        'video/mp4',
      ]
    : [
        'video/mp4;codecs=avc1.42E01E',
        'video/mp4;codecs=avc1',
        'video/mp4',
      ];
  for (const mime of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(mime)) {
        return mime;
      }
    } catch {
      // continue
    }
  }
  return null;
}

async function encodeViaWebCodecsMp4(
  project: ConstellationProject,
  timeline: VideoTimeline,
  illustrations: Map<string, DrawableImage>,
  videoConfig: VideoEncoderConfig,
  audioConfig: { sampleRate: number; numberOfChannels: number; bitrate: number } | null,
  audioBuffer: AudioBuffer | null,
  options: VideoExportOptions,
): Promise<Blob> {
  const { onProgress, signal } = options;

  const canvas = document.createElement('canvas');
  canvas.width = VIDEO_WIDTH;
  canvas.height = VIDEO_HEIGHT;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Не удалось создать 2D-холст для рендера видео.');

  const driver = new ThreeDVideoSceneDriver(project);
  const target = new ArrayBufferTarget();
  const hasAudio = Boolean(audioConfig && audioBuffer);

  const muxer = new Muxer({
    target,
    video: {
      codec: 'avc',
      width: VIDEO_WIDTH,
      height: VIDEO_HEIGHT,
      frameRate: VIDEO_FPS,
    },
    ...(hasAudio && audioConfig
      ? {
          audio: {
            codec: 'aac',
            numberOfChannels: audioConfig.numberOfChannels,
            sampleRate: audioConfig.sampleRate,
          },
        }
      : {}),
    fastStart: 'in-memory',
  });

  let encoderError: Error | null = null;

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => {
      muxer.addVideoChunk(chunk, meta);
    },
    error: (err) => {
      encoderError = err instanceof Error ? err : new Error(String(err));
    },
  });
  videoEncoder.configure(videoConfig);

  let audioEncoder: AudioEncoder | null = null;
  if (hasAudio && audioConfig) {
    audioEncoder = new AudioEncoder({
      output: (chunk, meta) => {
        muxer.addAudioChunk(chunk, meta);
      },
      error: (err) => {
        encoderError = err instanceof Error ? err : new Error(String(err));
      },
    });
    audioEncoder.configure({
      codec: 'mp4a.40.2',
      sampleRate: audioConfig.sampleRate,
      numberOfChannels: audioConfig.numberOfChannels,
      bitrate: audioConfig.bitrate,
    });
  }

  try {
    const totalFrames = timeline.totalFrames;
    const dt = 1 / VIDEO_FPS;
    const frameDurationUs = Math.round(1_000_000 / VIDEO_FPS);
    const keyFrameInterval = VIDEO_FPS * 2;

    for (let f = 0; f < totalFrames; f++) {
      throwIfAborted(signal);
      if (encoderError) throw encoderError;

      const timeSec = f / VIDEO_FPS;
      driver.renderFrameAtTime(ctx, timeline, illustrations, timeSec, dt);

      const frame = new VideoFrame(canvas, {
        timestamp: f * frameDurationUs,
        duration: frameDurationUs,
      });
      try {
        videoEncoder.encode(frame, { keyFrame: f % keyFrameInterval === 0 });
      } finally {
        frame.close();
      }

      while (videoEncoder.encodeQueueSize > 8) {
        throwIfAborted(signal);
        if (encoderError) throw encoderError;
        await delayMs(6);
      }

      if (f % 6 === 0 || f === totalFrames - 1) {
        const videoPct = Math.round(((f + 1) / totalFrames) * (hasAudio ? 82 : 95));
        onProgress?.({
          percent: Math.max(8, videoPct),
          stageLabel: `Рендерим 3D-сцены открытки (${f + 1}/${totalFrames})...`,
        });
        await delayMs(0);
      }
    }

    if (audioEncoder && audioBuffer && audioConfig) {
      onProgress?.({
        percent: 85,
        stageLabel: 'Кодируем музыкальное сопровождение...',
      });
      const channels = audioConfig.numberOfChannels;
      const sampleRate = audioConfig.sampleRate;
      const totalSamples = audioBuffer.length;
      const chunkFrames = 1024;
      const channelArrays = Array.from({ length: channels }, (_, c) =>
        audioBuffer.getChannelData(Math.min(c, audioBuffer.numberOfChannels - 1)),
      );

      for (let offset = 0; offset < totalSamples; offset += chunkFrames) {
        throwIfAborted(signal);
        if (encoderError) throw encoderError;

        const frames = Math.min(chunkFrames, totalSamples - offset);
        const planar = new Float32Array(frames * channels);
        for (let c = 0; c < channels; c++) {
          planar.set(channelArrays[c].subarray(offset, offset + frames), c * frames);
        }

        const audioData = new AudioData({
          format: 'f32-planar',
          sampleRate,
          numberOfFrames: frames,
          numberOfChannels: channels,
          timestamp: Math.round((offset / sampleRate) * 1_000_000),
          data: planar,
        });
        try {
          audioEncoder.encode(audioData);
        } finally {
          audioData.close();
        }

        while (audioEncoder.encodeQueueSize > 16) {
          throwIfAborted(signal);
          if (encoderError) throw encoderError;
          await delayMs(4);
        }
      }
    }

    throwIfAborted(signal);
    onProgress?.({ percent: 94, stageLabel: 'Собираем компактный MP4 для iPhone...' });

    await videoEncoder.flush();
    if (audioEncoder) {
      await audioEncoder.flush();
    }
    if (encoderError) throw encoderError;

    muxer.finalize();
    onProgress?.({ percent: 100, stageLabel: 'Готово!' });

    return new Blob([target.buffer], { type: 'video/mp4' });
  } finally {
    driver.dispose();
    try {
      if (videoEncoder.state !== 'closed') videoEncoder.close();
    } catch {
      // ignore
    }
    try {
      if (audioEncoder && audioEncoder.state !== 'closed') audioEncoder.close();
    } catch {
      // ignore
    }
  }
}

async function encodeViaMediaRecorderMp4(
  project: ConstellationProject,
  timeline: VideoTimeline,
  illustrations: Map<string, DrawableImage>,
  mimeType: string,
  audioBuffer: AudioBuffer | null,
  options: VideoExportOptions,
): Promise<Blob> {
  const { onProgress, signal } = options;

  const canvas = document.createElement('canvas');
  canvas.width = VIDEO_WIDTH;
  canvas.height = VIDEO_HEIGHT;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Не удалось создать 2D-холст для записи видео.');

  const driver = new ThreeDVideoSceneDriver(project);
  driver.renderFrameAtTime(ctx, timeline, illustrations, 0, 1 / VIDEO_FPS);

  const canvasStream = canvas.captureStream(VIDEO_FPS);
  let audioCtx: AudioContext | null = null;
  let audioSource: AudioBufferSourceNode | null = null;

  const combinedStream = new MediaStream(canvasStream.getVideoTracks());

  if (audioBuffer) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      audioCtx = new AudioCtx();
      const dest = audioCtx.createMediaStreamDestination();
      audioSource = audioCtx.createBufferSource();
      audioSource.buffer = audioBuffer;
      audioSource.connect(dest);
      dest.stream.getAudioTracks().forEach((track) => combinedStream.addTrack(track));
    }
  }

  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: VIDEO_BITRATE,
    ...(audioBuffer ? { audioBitsPerSecond: AUDIO_BITRATE } : {}),
  });

  recorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) {
      chunks.push(ev.data);
    }
  };

  const stoppedPromise = new Promise<void>((resolve, reject) => {
    recorder.onstop = () => resolve();
    recorder.onerror = () => reject(new Error('Ошибка при записи MP4-видео в браузере.'));
  });

  let rafId = 0;
  try {
    recorder.start(250);
    if (audioSource) {
      audioSource.start(0);
    }

    const startMs = performance.now();
    const totalMs = timeline.totalDurationSec * 1000;
    let prevTimeSec = 0;

    await new Promise<void>((resolve, reject) => {
      const tick = () => {
        if (signal?.aborted) {
          reject(new DOMException('Экспорт видео отменён.', 'AbortError'));
          return;
        }
        const elapsedMs = performance.now() - startMs;
        const timeSec = Math.min(timeline.totalDurationSec, elapsedMs / 1000);
        const dt = clamp(timeSec - prevTimeSec, 0.001, 0.08);
        prevTimeSec = timeSec;
        driver.renderFrameAtTime(ctx, timeline, illustrations, timeSec, dt);

        const pct = Math.min(96, Math.max(8, Math.round((elapsedMs / totalMs) * 92) + 4));
        onProgress?.({
          percent: pct,
          stageLabel: `Записываем 3D-видео MP4 (${Math.round(timeSec)}/${Math.round(
            timeline.totalDurationSec,
          )} с)...`,
        });

        if (elapsedMs >= totalMs) {
          resolve();
        } else {
          rafId = requestAnimationFrame(tick);
        }
      };
      rafId = requestAnimationFrame(tick);
    });

    if (recorder.state === 'recording') {
      recorder.stop();
    }
    await stoppedPromise;
    onProgress?.({ percent: 100, stageLabel: 'Готово!' });
    return new Blob(chunks, { type: 'video/mp4' });
  } finally {
    driver.dispose();
    if (rafId) cancelAnimationFrame(rafId);
    try {
      if (recorder.state === 'recording') recorder.stop();
    } catch {
      // ignore
    }
    combinedStream.getTracks().forEach((t) => t.stop());
    try {
      audioSource?.stop();
    } catch {
      // ignore
    }
    await audioCtx?.close().catch(() => undefined);
  }
}

export async function exportProjectToMp4(
  project: ConstellationProject,
  options: VideoExportOptions = {},
): Promise<VideoExportResult> {
  const { onProgress, signal } = options;
  throwIfAborted(signal);

  const wantsMusic = project.musicTrackId !== 'none';
  const [videoConfig, audioConfig] = await Promise.all([
    pickSupportedVideoConfig(),
    wantsMusic ? pickSupportedAudioConfig() : Promise.resolve(null),
  ]);

  const canUseWebCodecs = Boolean(videoConfig && (!wantsMusic || audioConfig));
  const mediaRecorderMime = canUseWebCodecs
    ? null
    : pickSupportedMediaRecorderMp4Mime(wantsMusic);

  if (!canUseWebCodecs && !mediaRecorderMime) {
    throw new Error(
      'Этот браузер не поддерживает кодирование MP4 (H.264/AAC) для iPhone. Откройте редактор в современном Chrome, Edge или Safari.',
    );
  }

  onProgress?.({ percent: 3, stageLabel: 'Подготавливаем 3D-сцену, шрифты и фото...' });
  await ensureFontsLoaded();
  throwIfAborted(signal);

  const illustrations = await preloadStarIllustrations(project, signal);
  const timeline = computeVideoTimeline(project);

  let audioBuffer: AudioBuffer | null = null;
  if (wantsMusic) {
    onProgress?.({ percent: 6, stageLabel: 'Подготавливаем фоновую музыку...' });
    const sr = audioConfig?.sampleRate ?? 48000;
    const ch = audioConfig?.numberOfChannels ?? 2;
    audioBuffer = await prepareAudioTrackBuffer(
      project,
      timeline.totalDurationSec,
      sr,
      ch,
      signal,
    );
  }

  const blob = canUseWebCodecs && videoConfig
    ? await encodeViaWebCodecsMp4(
        project,
        timeline,
        illustrations,
        videoConfig,
        audioConfig,
        audioBuffer,
        options,
      )
    : await encodeViaMediaRecorderMp4(
        project,
        timeline,
        illustrations,
        mediaRecorderMime!,
        audioBuffer,
        options,
      );

  const baseName = sanitizeFileName(project.title || 'Моя_открытка');
  return {
    blob,
    filename: `${baseName}.mp4`,
    sizeBytes: blob.size,
    formattedSize: formatBytesRu(blob.size),
    durationSec: timeline.totalDurationSec,
  };
}
