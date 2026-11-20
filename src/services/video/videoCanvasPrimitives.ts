import { getBuiltinIllustrationSvgString } from '../../assets/illustrations';
import {
  type CardThemeConfig,
  MESSAGE_FONTS,
  type ResolvedCardColors,
  isHexLight,
} from '../../scene/paletteConfig';
import type {
  BuiltinIllustrationId,
  CardDecorMotif,
  ConstellationProject,
  StarTextStyle,
} from '../../types/project';
import { getImageBlob } from '../database';
import { type DrawableImage, clamp, rgba, throwIfAborted } from './videoTimeline';

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

export async function preloadStarIllustrations(
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

export async function ensureFontsLoaded(): Promise<void> {
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

export function drawRoundedRectPath(
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

export function drawFourPointStarPath(
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

export function drawCardShell(
  ctx: CanvasRenderingContext2D,
  theme: CardThemeConfig,
  colors: ResolvedCardColors,
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

export function resolveCanvasTextShadow(
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

export function drawFourPointProgressIcon(
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
