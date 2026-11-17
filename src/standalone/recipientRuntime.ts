import { ConstellationEngine } from '../scene/ConstellationEngine';
import {
  COSMIC_PALETTES,
  ENVELOPE_VISIBLE_WORLD_H,
  ENVELOPE_WORLD_H,
  ENVELOPE_WORLD_W,
  GLOW_COLORS,
  computeEnvelopeScreenOffsetYPx,
  computeEnvelopeTextTranslateYPx,
  computeTextBlockMarginLeftPct,
  isDefaultStarTextStyle,
  resolveCardColors,
  resolveCardTheme,
  resolveContrastSafeCardTextColor,
  resolveEffectiveCardLayout,
  resolveEffectiveConstellationLayout,
  resolveEffectiveFinalDecor,
  resolveEffectiveFinalTextStyle,
  resolveEffectiveIllustrationLayout,
  resolveEffectiveStarDecor,
  resolveEffectiveStarTextStyle,
  resolveEnvelopeEffectiveWorldScale,
  resolveEnvelopeOffsetY,
  resolveEnvelopeSettings,
  resolveEnvelopeTextOffsetY,
  resolveMessageFont,
  resolveSafeCardDecorPresentation,
  resolveStarGlowHex,
  resolveStarImageSettings,
  resolveStarShape,
  resolveTextShadowCss,
  resolveViewportDeviceMode,
  sanitizeConnections,
} from '../scene/paletteConfig';
import type {
  CardDecorMotif,
  CardThemeCustomColors,
  CardThemeId,
  ConstellationAnimationId,
  ConstellationStar,
  CosmicPaletteId,
  DeviceLayoutKey,
  EnvelopeSettings,
  GlowColorId,
  MessageTextAlign,
  ProjectDeviceLayouts,
  RecipientPhase,
  StarConnection,
  StarDecorSettings,
  StarShapeId,
  StarTextStyle,
} from '../types/project';

interface StandaloneStar extends ConstellationStar {
  assetImagePath: string;
}

interface StandalonePayload {
  title: string;
  recipientName: string;
  senderName?: string;
  occasionLabel: string;
  paletteId: CosmicPaletteId;
  globalGlowColor: GlowColorId;
  constellationAnimation?: ConstellationAnimationId;
  cardTheme?: CardThemeId;
  cardColors?: CardThemeCustomColors;
  envelopeSettings?: EnvelopeSettings;
  deviceLayouts?: ProjectDeviceLayouts;
  stars: StandaloneStar[];
  connections?: StarConnection[];
  finalMessage: string;
  finalTextStyle?: StarTextStyle;
  finalDecor?: StarDecorSettings;
  musicPath: string | null;
  musicName: string | null;
}

type StoryIntent =
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'index'; index: number }
  | { type: 'constellation' };

declare global {
  interface Window {
    __GIFTLAB_PAYLOAD__?: StandalonePayload;
  }
}

const SWIPE_MIN_DISTANCE_PX = 65;
const SWIPE_HORIZONTAL_RATIO = 1.35;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

let progressStarUid = 0;

function createProgressStarSvg(lit: boolean, active: boolean): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const uid = String(++progressStarUid);
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', active ? '19' : '15');
  svg.setAttribute('height', active ? '19' : '15');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.filter = lit
    ? 'drop-shadow(0 0 6px rgba(103,232,249,0.55)) drop-shadow(0 3px 6px rgba(0,0,0,0.45))'
    : 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))';

  const defs = document.createElementNS(ns, 'defs');
  const grad = document.createElementNS(ns, 'linearGradient');
  grad.setAttribute('id', `gl-rt-prog-${uid}`);
  grad.setAttribute('x1', '3');
  grad.setAttribute('y1', '2');
  grad.setAttribute('x2', '21');
  grad.setAttribute('y2', '21');
  grad.setAttribute('gradientUnits', 'userSpaceOnUse');
  [
    ['0%', '#ffffff'],
    ['48%', '#67e8f9'],
    ['100%', '#e879f9'],
  ].forEach(([offset, stopColor]) => {
    const stop = document.createElementNS(ns, 'stop');
    stop.setAttribute('offset', offset);
    stop.setAttribute('stop-color', stopColor);
    grad.appendChild(stop);
  });
  defs.appendChild(grad);
  svg.appendChild(defs);

  const path = document.createElementNS(ns, 'path');
  path.setAttribute(
    'd',
    'M12 2.2l2.9 5.88 6.48.94-4.69 4.57 1.1 6.46L12 17l-5.79 3.05 1.1-6.46L2.62 9.02l6.48-.94L12 2.2z',
  );
  path.setAttribute('fill', lit ? `url(#gl-rt-prog-${uid})` : 'rgba(255,255,255,0.08)');
  path.setAttribute('stroke', lit ? 'rgba(255,255,255,0.9)' : 'currentColor');
  path.setAttribute('stroke-width', lit ? '1.1' : '1.45');
  path.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(path);

  if (lit) {
    const facet = document.createElementNS(ns, 'polygon');
    facet.setAttribute('points', '12,2.2 9.1,8.08 2.62,9.02 12,12');
    facet.setAttribute('fill', 'rgba(255,255,255,0.48)');
    const core = document.createElementNS(ns, 'circle');
    core.setAttribute('cx', '12');
    core.setAttribute('cy', '12');
    core.setAttribute('r', '2.1');
    core.setAttribute('fill', '#ffffff');
    svg.append(facet, core);
  }
  return svg;
}

function createEnvelopeSvg(open: boolean): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '15');
  svg.setAttribute('height', '15');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');

  if (open) {
    const p1 = document.createElementNS(ns, 'path');
    p1.setAttribute('d', 'M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z');
    const p2 = document.createElementNS(ns, 'path');
    p2.setAttribute('d', 'm22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10');
    svg.append(p1, p2);
  } else {
    const rect = document.createElementNS(ns, 'rect');
    rect.setAttribute('width', '20');
    rect.setAttribute('height', '16');
    rect.setAttribute('x', '2');
    rect.setAttribute('y', '4');
    rect.setAttribute('rx', '2');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', 'm22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7');
    svg.append(rect, path);
  }
  return svg;
}

let decorUidSeq = 0;

function createCardDecorSvg(
  motif: CardDecorMotif,
  glowHex: string,
  coreHex: string,
): SVGSVGElement | null {
  if (motif === 'none') return null;
  const uid = String(++decorUidSeq);
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 120 120');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('class', 'gl-card-decor-svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.filter = `drop-shadow(0 3px 10px ${glowHex}44)`;

  const mk = (tag: string, attrs: Record<string, string>, parent: Element = svg) => {
    const node = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    parent.appendChild(node);
    return node;
  };

  const addLinearGrad = (
    defs: Element,
    id: string,
    coords: { x1: string; y1: string; x2: string; y2: string },
    stops: Array<{ offset: string; color: string; opacity: string }>,
  ) => {
    const g = mk('linearGradient', { id, ...coords }, defs);
    for (const s of stops) {
      mk('stop', { offset: s.offset, 'stop-color': s.color, 'stop-opacity': s.opacity }, g);
    }
  };

  const addRadialGrad = (
    defs: Element,
    id: string,
    coords: { cx: string; cy: string; r: string },
    stops: Array<{ offset: string; color: string; opacity: string }>,
  ) => {
    const g = mk('radialGradient', { id, ...coords }, defs);
    for (const s of stops) {
      mk('stop', { offset: s.offset, 'stop-color': s.color, 'stop-opacity': s.opacity }, g);
    }
  };

  if (motif === 'sparkles') {
    const defs = mk('defs', {});
    const gId = `gl_sp_${uid}`;
    addRadialGrad(defs, gId, { cx: '50%', cy: '50%', r: '50%' }, [
      { offset: '0%', color: coreHex, opacity: '0.98' },
      { offset: '70%', color: glowHex, opacity: '0.82' },
      { offset: '100%', color: glowHex, opacity: '0.2' },
    ]);
    mk('path', { d: 'M54 14L58.5 34.5L79 39L58.5 43.5L54 64L49.5 43.5L29 39L49.5 34.5L54 14Z', fill: `url(#${gId})` });
    mk('path', { d: 'M88 58L90.8 69.2L102 72L90.8 74.8L88 86L85.2 74.8L74 72L85.2 69.2L88 58Z', fill: glowHex, 'fill-opacity': '0.88' });
    mk('path', { d: 'M32 76L33.8 83.2L41 85L33.8 86.8L32 94L30.2 86.8L23 85L30.2 83.2L32 76Z', fill: coreHex, 'fill-opacity': '0.78' });
    mk('circle', { cx: '88', cy: '27', r: '2.2', fill: coreHex, 'fill-opacity': '0.88' });
    mk('circle', { cx: '24', cy: '48', r: '1.8', fill: glowHex, 'fill-opacity': '0.72' });
  } else if (motif === 'orbital') {
    const defs = mk('defs', {});
    const gId = `gl_orb_${uid}`;
    addLinearGrad(defs, gId, { x1: '0%', y1: '0%', x2: '100%', y2: '100%' }, [
      { offset: '0%', color: coreHex, opacity: '0.92' },
      { offset: '100%', color: glowHex, opacity: '0.35' },
    ]);
    mk('ellipse', { cx: '60', cy: '60', rx: '44', ry: '17', transform: 'rotate(-24 60 60)', stroke: `url(#${gId})`, 'stroke-width': '1.4', 'stroke-dasharray': '3.5 4.5' });
    mk('ellipse', { cx: '60', cy: '60', rx: '31', ry: '11', transform: 'rotate(28 60 60)', stroke: coreHex, 'stroke-width': '1', 'stroke-opacity': '0.58' });
    mk('circle', { cx: '96', cy: '43', r: '3.8', fill: coreHex });
    mk('circle', { cx: '96', cy: '43', r: '6.5', stroke: glowHex, 'stroke-width': '0.7', 'stroke-opacity': '0.45' });
    mk('path', { d: 'M31 32C26 35 23 41 24 47C25 53 31 57 37 56C32 55 29 50 29 45C29 40 31 35 35 32C33.5 31.6 32.2 31.6 31 32Z', fill: glowHex, 'fill-opacity': '0.9' });
  } else if (motif === 'hearts') {
    const defs = mk('defs', {});
    const gId = `gl_hrt_${uid}`;
    addLinearGrad(defs, gId, { x1: '25%', y1: '20%', x2: '80%', y2: '85%' }, [
      { offset: '0%', color: coreHex, opacity: '0.42' },
      { offset: '100%', color: glowHex, opacity: '0.16' },
    ]);
    mk('path', { d: 'M52 72C52 72 28 57 28 40C28 32 34 26 41.5 26C46.2 26 50.2 28.6 52 32.3C53.8 28.6 57.8 26 62.5 26C70 26 76 32 76 40C76 57 52 72 52 72Z', stroke: glowHex, 'stroke-width': '1.9', fill: `url(#${gId})` });
    mk('path', { d: 'M86 86C86 86 73 78 73 69C73 64.8 76.2 61.6 80.2 61.6C82.8 61.6 84.9 63 86 65C87.1 63 89.2 61.6 91.8 61.6C95.8 61.6 99 64.8 99 69C99 78 86 86 86 86Z', stroke: coreHex, 'stroke-width': '1.6', fill: coreHex, 'fill-opacity': '0.22' });
    mk('circle', { cx: '88', cy: '36', r: '2', fill: coreHex, 'fill-opacity': '0.85' });
    mk('circle', { cx: '28', cy: '82', r: '2.2', fill: glowHex, 'fill-opacity': '0.75' });
  } else if (motif === 'soft_flowers') {
    const defs = mk('defs', {});
    const pOuter = `gl_sfpo_${uid}`;
    const pInner = `gl_sfpi_${uid}`;
    const leafGrad = `gl_sflf_${uid}`;
    const coreGrad = `gl_sfcr_${uid}`;
    addRadialGrad(defs, pOuter, { cx: '50%', cy: '30%', r: '72%' }, [
      { offset: '0%', color: coreHex, opacity: '0.52' },
      { offset: '65%', color: glowHex, opacity: '0.34' },
      { offset: '100%', color: glowHex, opacity: '0.12' },
    ]);
    addRadialGrad(defs, pInner, { cx: '50%', cy: '35%', r: '70%' }, [
      { offset: '0%', color: '#FFFFFF', opacity: '0.48' },
      { offset: '100%', color: coreHex, opacity: '0.32' },
    ]);
    addLinearGrad(defs, leafGrad, { x1: '0%', y1: '0%', x2: '100%', y2: '100%' }, [
      { offset: '0%', color: glowHex, opacity: '0.32' },
      { offset: '100%', color: coreHex, opacity: '0.14' },
    ]);
    addRadialGrad(defs, coreGrad, { cx: '45%', cy: '40%', r: '60%' }, [
      { offset: '0%', color: '#FEF3C7', opacity: '0.98' },
      { offset: '60%', color: coreHex, opacity: '0.9' },
      { offset: '100%', color: glowHex, opacity: '0.85' },
    ]);

    mk('path', { d: 'M22 102C32 82 47 64 74 42', stroke: glowHex, 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-opacity': '0.72' });
    mk('path', { d: 'M44 74C52 78 63 82 72 80', stroke: glowHex, 'stroke-width': '1.2', 'stroke-linecap': 'round', 'stroke-opacity': '0.55' });
    mk('path', { d: 'M43 73C29 69 24 56 30 46C38 44 47 54 45 70Z', fill: `url(#${leafGrad})`, stroke: glowHex, 'stroke-width': '1.15', 'stroke-opacity': '0.72' });
    mk('path', { d: 'M32 51C36 58 40 65 43 71', stroke: glowHex, 'stroke-width': '0.75', 'stroke-opacity': '0.5', 'stroke-linecap': 'round' });
    mk('path', { d: 'M60 54C73 59 86 55 90 46C85 38 71 42 62 52Z', fill: `url(#${leafGrad})`, stroke: glowHex, 'stroke-width': '1.1', 'stroke-opacity': '0.68' });
    mk('path', { d: 'M64 52C72 50 80 48 87 46', stroke: glowHex, 'stroke-width': '0.75', 'stroke-opacity': '0.45', 'stroke-linecap': 'round' });

    const gMain = mk('g', { transform: 'translate(76 38)' });
    for (let deg = 0; deg < 360; deg += 60) {
      mk('path', { d: 'M0 0C-6 -6 -9 -17 0 -22C9 -17 6 -6 0 0Z', transform: `rotate(${deg})`, fill: `url(#${pOuter})`, stroke: glowHex, 'stroke-width': '1', 'stroke-opacity': '0.68' }, gMain);
    }
    for (let deg = 30; deg < 360; deg += 60) {
      mk('path', { d: 'M0 0C-4.5 -4 -6.5 -12 0 -15.5C6.5 -12 4.5 -4 0 0Z', transform: `rotate(${deg})`, fill: `url(#${pInner})`, stroke: coreHex, 'stroke-width': '0.75', 'stroke-opacity': '0.5' }, gMain);
    }
    mk('circle', { cx: '0', cy: '0', r: '4.8', fill: `url(#${coreGrad})` }, gMain);
    mk('circle', { cx: '-1.5', cy: '-1.2', r: '0.9', fill: '#FFFBEB', 'fill-opacity': '0.9' }, gMain);
    mk('circle', { cx: '1.8', cy: '1.1', r: '0.8', fill: '#FFFBEB', 'fill-opacity': '0.85' }, gMain);
    mk('circle', { cx: '1.2', cy: '-1.8', r: '0.7', fill: '#FFFBEB', 'fill-opacity': '0.8' }, gMain);

    const gSub = mk('g', { transform: 'translate(36 86)' });
    for (let deg = 0; deg < 360; deg += 72) {
      mk('path', { d: 'M0 0C-4.2 -4 -6 -11.5 0 -14.5C6 -11.5 4.2 -4 0 0Z', transform: `rotate(${deg})`, fill: `url(#${pOuter})`, stroke: glowHex, 'stroke-width': '0.95', 'stroke-opacity': '0.62' }, gSub);
    }
    mk('circle', { cx: '0', cy: '0', r: '3', fill: `url(#${coreGrad})` }, gSub);

    const gBud = mk('g', { transform: 'translate(76 78) rotate(28)' });
    mk('path', { d: 'M0 4C-4 -1 -4 -8 0 -11C4 -8 4 -1 0 4Z', fill: `url(#${pOuter})`, stroke: glowHex, 'stroke-width': '0.95', 'stroke-opacity': '0.68' }, gBud);
    mk('circle', { cx: '48', cy: '28', r: '1.4', fill: coreHex, 'fill-opacity': '0.7' });
    mk('circle', { cx: '98', cy: '64', r: '1.2', fill: glowHex, 'fill-opacity': '0.6' });
  } else if (motif === 'petals') {
    const defs = mk('defs', {});
    const ptA = `gl_pta_${uid}`;
    const ptB = `gl_ptb_${uid}`;
    addLinearGrad(defs, ptA, { x1: '15%', y1: '10%', x2: '85%', y2: '90%' }, [
      { offset: '0%', color: '#FFFFFF', opacity: '0.52' },
      { offset: '45%', color: coreHex, opacity: '0.4' },
      { offset: '100%', color: glowHex, opacity: '0.24' },
    ]);
    addLinearGrad(defs, ptB, { x1: '0%', y1: '20%', x2: '100%', y2: '85%' }, [
      { offset: '0%', color: coreHex, opacity: '0.48' },
      { offset: '100%', color: glowHex, opacity: '0.18' },
    ]);
    mk('path', { d: 'M27 25C36 17 50 22 52 34C53 43 44 50 34 48C26 46 21 33 27 25Z', fill: `url(#${ptA})`, stroke: glowHex, 'stroke-width': '1.15', 'stroke-opacity': '0.72' });
    mk('path', { d: 'M31 30C36 35 39 40 41 45', stroke: coreHex, 'stroke-width': '0.75', 'stroke-opacity': '0.45', 'stroke-linecap': 'round' });
    mk('path', { d: 'M80 20C91 23 94 37 86 46C79 52 67 48 66 37C65 28 72 18 80 20Z', fill: `url(#${ptB})`, stroke: glowHex, 'stroke-width': '1.1', 'stroke-opacity': '0.68' });
    mk('path', { d: 'M78 26C77 32 76 38 74 44', stroke: glowHex, 'stroke-width': '0.7', 'stroke-opacity': '0.42', 'stroke-linecap': 'round' });
    mk('path', { d: 'M55 54C68 50 79 62 73 77C67 86 52 84 46 73C42 64 47 56 55 54Z', fill: `url(#${ptA})`, stroke: glowHex, 'stroke-width': '1.2', 'stroke-opacity': '0.76' });
    mk('path', { d: 'M55 60C58 66 59 72 58 79', stroke: coreHex, 'stroke-width': '0.75', 'stroke-opacity': '0.45', 'stroke-linecap': 'round' });
    mk('path', { d: 'M21 79C28 70 40 72 40 82C38 91 26 93 20 85C18 83 19 81 21 79Z', fill: `url(#${ptB})`, stroke: glowHex, 'stroke-width': '1', 'stroke-opacity': '0.62' });
    mk('path', { d: 'M89 75C98 76 102 86 95 93C89 98 80 94 79 86C79 80 84 75 89 75Z', fill: `url(#${ptA})`, stroke: glowHex, 'stroke-width': '1', 'stroke-opacity': '0.62' });
    mk('circle', { cx: '60', cy: '39', r: '1.8', fill: coreHex, 'fill-opacity': '0.78' });
    mk('circle', { cx: '88', cy: '59', r: '1.5', fill: glowHex, 'fill-opacity': '0.68' });
    mk('circle', { cx: '42', cy: '96', r: '1.3', fill: coreHex, 'fill-opacity': '0.65' });
  } else if (motif === 'floral_corners') {
    const defs = mk('defs', {});
    const fcPetal = `gl_fcpt_${uid}`;
    const fcLeaf = `gl_fclf_${uid}`;
    addRadialGrad(defs, fcPetal, { cx: '45%', cy: '35%', r: '65%' }, [
      { offset: '0%', color: '#FFFFFF', opacity: '0.5' },
      { offset: '55%', color: coreHex, opacity: '0.44' },
      { offset: '100%', color: glowHex, opacity: '0.22' },
    ]);
    addLinearGrad(defs, fcLeaf, { x1: '0%', y1: '0%', x2: '100%', y2: '100%' }, [
      { offset: '0%', color: glowHex, opacity: '0.34' },
      { offset: '100%', color: coreHex, opacity: '0.14' },
    ]);
    mk('path', { d: 'M16 18C44 16 74 26 98 52', stroke: glowHex, 'stroke-width': '1.35', 'stroke-linecap': 'round', 'stroke-opacity': '0.72' });
    mk('path', { d: 'M104 102C76 104 46 94 22 68', stroke: glowHex, 'stroke-width': '1.35', 'stroke-linecap': 'round', 'stroke-opacity': '0.72' });
    mk('path', { d: 'M42 20C36 10 44 4 52 10C53 16 47 20 42 20Z', fill: `url(#${fcLeaf})`, stroke: glowHex, 'stroke-width': '0.95', 'stroke-opacity': '0.68' });
    mk('path', { d: 'M84 36C94 31 102 36 98 44C91 47 85 42 84 36Z', fill: `url(#${fcLeaf})`, stroke: glowHex, 'stroke-width': '0.95', 'stroke-opacity': '0.68' });
    const gTop = mk('g', { transform: 'translate(68 25)' });
    for (let deg = 0; deg < 360; deg += 72) {
      mk('path', { d: 'M0 0C-3.8 -3.8 -5.4 -10.5 0 -13.2C5.4 -10.5 3.8 -3.8 0 0Z', transform: `rotate(${deg})`, fill: `url(#${fcPetal})`, stroke: glowHex, 'stroke-width': '0.9', 'stroke-opacity': '0.7' }, gTop);
    }
    mk('circle', { cx: '0', cy: '0', r: '2.8', fill: coreHex, 'fill-opacity': '0.92' }, gTop);

    mk('path', { d: 'M78 100C84 110 76 116 68 110C67 104 73 100 78 100Z', fill: `url(#${fcLeaf})`, stroke: glowHex, 'stroke-width': '0.95', 'stroke-opacity': '0.68' });
    mk('path', { d: 'M36 84C26 89 18 84 22 76C29 73 35 78 36 84Z', fill: `url(#${fcLeaf})`, stroke: glowHex, 'stroke-width': '0.95', 'stroke-opacity': '0.68' });
    const gBot = mk('g', { transform: 'translate(52 95)' });
    for (let deg = 0; deg < 360; deg += 72) {
      mk('path', { d: 'M0 0C-3.8 -3.8 -5.4 -10.5 0 -13.2C5.4 -10.5 3.8 -3.8 0 0Z', transform: `rotate(${deg})`, fill: `url(#${fcPetal})`, stroke: glowHex, 'stroke-width': '0.9', 'stroke-opacity': '0.7' }, gBot);
    }
    mk('circle', { cx: '0', cy: '0', r: '2.8', fill: coreHex, 'fill-opacity': '0.92' }, gBot);
    mk('circle', { cx: '96', cy: '58', r: '1.7', fill: coreHex, 'fill-opacity': '0.78' });
    mk('circle', { cx: '24', cy: '62', r: '1.7', fill: coreHex, 'fill-opacity': '0.78' });
  } else if (motif === 'magic_rays') {
    const defs = mk('defs', {});
    const rayGrad = `gl_mr_${uid}`;
    addRadialGrad(defs, rayGrad, { cx: '50%', cy: '50%', r: '50%' }, [
      { offset: '0%', color: coreHex, opacity: '0.96' },
      { offset: '55%', color: glowHex, opacity: '0.7' },
      { offset: '100%', color: glowHex, opacity: '0' },
    ]);
    mk('circle', { cx: '60', cy: '60', r: '31', stroke: glowHex, 'stroke-width': '0.9', 'stroke-dasharray': '2.5 5', 'stroke-opacity': '0.58' });
    mk('circle', { cx: '60', cy: '60', r: '19', stroke: coreHex, 'stroke-width': '0.75', 'stroke-opacity': '0.4' });
    mk('line', { x1: '60', y1: '10', x2: '60', y2: '110', stroke: coreHex, 'stroke-width': '1.2', 'stroke-opacity': '0.65', 'stroke-linecap': 'round' });
    mk('line', { x1: '10', y1: '60', x2: '110', y2: '60', stroke: coreHex, 'stroke-width': '1.2', 'stroke-opacity': '0.65', 'stroke-linecap': 'round' });
    mk('line', { x1: '26', y1: '26', x2: '94', y2: '94', stroke: glowHex, 'stroke-width': '1', 'stroke-opacity': '0.48', 'stroke-linecap': 'round' });
    mk('line', { x1: '94', y1: '26', x2: '26', y2: '94', stroke: glowHex, 'stroke-width': '1', 'stroke-opacity': '0.48', 'stroke-linecap': 'round' });
    mk('path', { d: 'M60 32L64.5 55.5L88 60L64.5 64.5L60 88L55.5 64.5L32 60L55.5 55.5L60 32Z', fill: `url(#${rayGrad})`, stroke: coreHex, 'stroke-width': '1.1' });
    mk('circle', { cx: '91', cy: '29', r: '2', fill: coreHex, 'fill-opacity': '0.88' });
    mk('circle', { cx: '29', cy: '91', r: '2', fill: glowHex, 'fill-opacity': '0.82' });
    mk('circle', { cx: '29', cy: '29', r: '1.4', fill: coreHex, 'fill-opacity': '0.65' });
    mk('circle', { cx: '91', cy: '91', r: '1.4', fill: glowHex, 'fill-opacity': '0.65' });
  } else if (motif === 'corners') {
    mk('path', { d: 'M16 44V22C16 18.7 18.7 16 22 16H44', stroke: glowHex, 'stroke-width': '1.8', 'stroke-linecap': 'round' });
    mk('path', { d: 'M22 38V24C22 22.9 22.9 22 24 22H38', stroke: coreHex, 'stroke-width': '1', 'stroke-opacity': '0.65', 'stroke-linecap': 'round' });
    mk('path', { d: 'M104 76V98C104 101.3 101.3 104 98 104H76', stroke: glowHex, 'stroke-width': '1.8', 'stroke-linecap': 'round' });
    mk('path', { d: 'M98 82V96C98 97.1 97.1 98 96 98H82', stroke: coreHex, 'stroke-width': '1', 'stroke-opacity': '0.65', 'stroke-linecap': 'round' });
    mk('path', { d: 'M84 22L86 30L94 32L86 34L84 42L82 34L74 32L82 30L84 22Z', fill: coreHex, 'fill-opacity': '0.9' });
    mk('path', { d: 'M36 78L38 86L46 88L38 90L36 98L34 90L26 88L34 86L36 78Z', fill: coreHex, 'fill-opacity': '0.82' });
  }
  return svg;
}

function createStarburstWrap(
  coreColor: string,
  rayColor: string,
  className: string,
): HTMLDivElement {
  const ns = 'http://www.w3.org/2000/svg';
  const uid = String(++decorUidSeq);
  const wrap = el('div', `gl-starburst-wrap gl-starburst-pulse ${className}`);
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 160 160');
  svg.setAttribute('fill', 'none');
  svg.style.width = '100%';
  svg.style.height = '100%';
  svg.style.overflow = 'visible';

  const mk = (tag: string, attrs: Record<string, string>, parent: Element = svg) => {
    const node = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    parent.appendChild(node);
    return node;
  };

  const defs = mk('defs', {});
  const haloId = `gl_sb_h_${uid}`;
  const rayHId = `gl_sb_rh_${uid}`;
  const rayVId = `gl_sb_rv_${uid}`;

  const rg = mk('radialGradient', { id: haloId, cx: '50%', cy: '50%', r: '50%' }, defs);
  for (const [o, c, op] of [
    ['0%', coreColor, '0.96'],
    ['16%', rayColor, '0.62'],
    ['48%', rayColor, '0.16'],
    ['100%', rayColor, '0'],
  ]) {
    mk('stop', { offset: o, 'stop-color': c, 'stop-opacity': op }, rg);
  }
  const lgh = mk('linearGradient', { id: rayHId, x1: '0%', y1: '50%', x2: '100%', y2: '50%' }, defs);
  for (const [o, c, op] of [
    ['0%', rayColor, '0'],
    ['50%', coreColor, '0.95'],
    ['100%', rayColor, '0'],
  ]) {
    mk('stop', { offset: o, 'stop-color': c, 'stop-opacity': op }, lgh);
  }
  const lgv = mk('linearGradient', { id: rayVId, x1: '50%', y1: '0%', x2: '50%', y2: '100%' }, defs);
  for (const [o, c, op] of [
    ['0%', rayColor, '0'],
    ['50%', coreColor, '0.95'],
    ['100%', rayColor, '0'],
  ]) {
    mk('stop', { offset: o, 'stop-color': c, 'stop-opacity': op }, lgv);
  }

  mk('circle', { cx: '80', cy: '80', r: '64', fill: `url(#${haloId})` });
  const g1 = mk('g', { opacity: '0.72', transform: 'rotate(28 80 80)' });
  mk('line', { x1: '80', y1: '24', x2: '80', y2: '136', stroke: `url(#${rayVId})`, 'stroke-width': '1', 'stroke-linecap': 'round' }, g1);
  mk('line', { x1: '24', y1: '80', x2: '136', y2: '80', stroke: `url(#${rayHId})`, 'stroke-width': '1', 'stroke-linecap': 'round' }, g1);
  const g2 = mk('g', { opacity: '0.58', transform: 'rotate(-24 80 80)' });
  mk('line', { x1: '80', y1: '30', x2: '80', y2: '130', stroke: `url(#${rayVId})`, 'stroke-width': '0.85', 'stroke-linecap': 'round' }, g2);
  mk('line', { x1: '30', y1: '80', x2: '130', y2: '80', stroke: `url(#${rayHId})`, 'stroke-width': '0.85', 'stroke-linecap': 'round' }, g2);

  mk('path', { d: 'M80 12L82.4 76.2L148 80L82.4 83.8L80 148L77.6 83.8L12 80L77.6 76.2Z', fill: coreColor, 'fill-opacity': '0.86' });
  mk('path', { d: 'M80 34L83.8 75.5L126 80L83.8 84.5L80 126L76.2 84.5L34 80L76.2 75.5Z', fill: rayColor, 'fill-opacity': '0.45' });
  mk('circle', { cx: '80', cy: '80', r: '5.5', fill: coreColor });
  mk('circle', { cx: '48', cy: '46', r: '1.4', fill: rayColor, 'fill-opacity': '0.88' });
  mk('circle', { cx: '116', cy: '52', r: '1.2', fill: coreColor, 'fill-opacity': '0.85' });
  mk('circle', { cx: '54', cy: '116', r: '1.1', fill: coreColor, 'fill-opacity': '0.8' });
  mk('circle', { cx: '112', cy: '112', r: '1.5', fill: rayColor, 'fill-opacity': '0.9' });
  wrap.appendChild(svg);
  return wrap;
}

function appendCardThemeBackdropNodes(
  container: HTMLElement,
  pattern: 'paper' | 'stars' | 'botanical' | 'aurora' | 'minimal',
  accentColor: string,
  badgeColor: string,
  borderColor: string,
  glowHex: string,
  isLightPaper: boolean,
): void {
  const ns = 'http://www.w3.org/2000/svg';
  const uid = String(++decorUidSeq);

  if (pattern === 'paper') {
    const tex = el('div', 'gl-letter-pattern');
    tex.style.opacity = '0.5';
    tex.style.backgroundImage =
      'repeating-linear-gradient(0deg, rgba(140,108,80,0.032) 0px, rgba(140,108,80,0.032) 1px, transparent 1px, transparent 24px)';
    const frame = el('div', 'gl-letter-frame-inner');
    frame.style.borderColor = `${accentColor}40`;
    container.append(tex, frame);
    return;
  }

  if (pattern === 'stars') {
    const sheen = el('div', 'gl-letter-pattern');
    sheen.style.background = [
      `radial-gradient(ellipse 85% 65% at 86% 18%, ${accentColor}26 0%, transparent 64%)`,
      `radial-gradient(ellipse 75% 60% at 15% 88%, ${glowHex}22 0%, transparent 65%)`,
      'linear-gradient(165deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 38%, rgba(12,10,30,0.28) 100%)',
    ].join(', ');
    const stars = el('div', 'gl-letter-pattern');
    stars.style.opacity = '0.35';
    stars.style.backgroundImage = `radial-gradient(${accentColor}77 1px, transparent 1px)`;
    stars.style.backgroundSize = '28px 28px';
    const topRim = el('div', 'gl-card-top-rim');
    topRim.style.background = `linear-gradient(90deg, transparent, rgba(255,255,255,0.85) 35%, ${badgeColor} 65%, transparent)`;
    const frame = el('div', 'gl-letter-frame-inner');
    frame.style.borderColor = `${borderColor}38`;
    frame.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.22)';
    const burst = createStarburstWrap('#FFFBEB', accentColor, 'gl-starburst-stars');
    container.append(sheen, stars, topRim, frame, burst);
    return;
  }

  if (pattern === 'botanical') {
    const glowPat = el('div', 'gl-letter-pattern');
    glowPat.style.opacity = '0.65';
    glowPat.style.background = `radial-gradient(circle at 10% 10%, ${accentColor}26, transparent 44%), radial-gradient(circle at 90% 90%, ${accentColor}24, transparent 44%)`;
    const frame = el('div', 'gl-letter-frame-inner');
    frame.style.borderStyle = 'dashed';
    frame.style.borderColor = `${accentColor}4c`;
    const cornerSvg = document.createElementNS(ns, 'svg');
    cornerSvg.setAttribute('viewBox', '0 0 100 100');
    cornerSvg.setAttribute('preserveAspectRatio', 'none');
    cornerSvg.setAttribute('class', 'gl-letter-pattern');
    cornerSvg.style.opacity = '0.35';
    const cp = document.createElementNS(ns, 'path');
    cp.setAttribute('d', 'M4 18C7 10 12 6 20 4M96 82C93 90 88 94 80 96');
    cp.setAttribute('stroke', accentColor);
    cp.setAttribute('stroke-width', '0.45');
    cp.setAttribute('fill', 'none');
    cp.setAttribute('stroke-linecap', 'round');
    cornerSvg.appendChild(cp);
    container.append(glowPat, frame, cornerSvg);
    return;
  }

  if (pattern === 'aurora') {
    const nebulaPat = el('div', 'gl-letter-pattern');
    nebulaPat.style.background = [
      `radial-gradient(ellipse 74% 62% at 16% 12%, ${accentColor}38 0%, transparent 66%)`,
      `radial-gradient(ellipse 68% 58% at 86% 88%, ${badgeColor}28 0%, transparent 64%)`,
      `radial-gradient(ellipse 56% 48% at 88% 14%, ${glowHex}24 0%, transparent 68%)`,
    ].join(', ');

    const textGlow = el('div', 'gl-letter-pattern');
    textGlow.style.background = `radial-gradient(ellipse 66% 52% at 50% 52%, ${accentColor}26 0%, ${glowHex}12 42%, transparent 74%)`;

    const orbitCwWrap = el('div', 'gl-aurora-orbit-wrap gl-aurora-orbit-cw');
    const svgCw = document.createElementNS(ns, 'svg');
    svgCw.setAttribute('viewBox', '0 0 240 240');
    svgCw.setAttribute('fill', 'none');
    svgCw.style.width = '100%';
    svgCw.style.height = '100%';
    const defsCw = document.createElementNS(ns, 'defs');
    const gradCw = document.createElementNS(ns, 'linearGradient');
    const gCwId = `gl_au_${uid}`;
    gradCw.setAttribute('id', gCwId);
    gradCw.setAttribute('x1', '0%');
    gradCw.setAttribute('y1', '0%');
    gradCw.setAttribute('x2', '100%');
    gradCw.setAttribute('y2', '100%');
    for (const st of [
      ['0%', accentColor, '0.65'],
      ['50%', badgeColor, '0.42'],
      ['100%', accentColor, '0.15'],
    ]) {
      const s = document.createElementNS(ns, 'stop');
      s.setAttribute('offset', st[0]);
      s.setAttribute('stop-color', st[1]);
      s.setAttribute('stop-opacity', st[2]);
      gradCw.appendChild(s);
    }
    defsCw.appendChild(gradCw);
    svgCw.appendChild(defsCw);
    const ellCw = document.createElementNS(ns, 'ellipse');
    ellCw.setAttribute('cx', '120');
    ellCw.setAttribute('cy', '120');
    ellCw.setAttribute('rx', '106');
    ellCw.setAttribute('ry', '76');
    ellCw.setAttribute('transform', 'rotate(-18 120 120)');
    ellCw.setAttribute('stroke', `url(#${gCwId})`);
    ellCw.setAttribute('stroke-width', '0.7');
    ellCw.setAttribute('stroke-dasharray', '2.5 5.5');
    const dotA = document.createElementNS(ns, 'circle');
    dotA.setAttribute('cx', '218');
    dotA.setAttribute('cy', '88');
    dotA.setAttribute('r', '2.1');
    dotA.setAttribute('fill', badgeColor);
    dotA.setAttribute('fill-opacity', '0.9');
    const dotB = document.createElementNS(ns, 'circle');
    dotB.setAttribute('cx', '22');
    dotB.setAttribute('cy', '152');
    dotB.setAttribute('r', '1.6');
    dotB.setAttribute('fill', accentColor);
    dotB.setAttribute('fill-opacity', '0.85');
    svgCw.append(ellCw, dotA, dotB);
    orbitCwWrap.appendChild(svgCw);

    const orbitCcwWrap = el('div', 'gl-aurora-orbit-wrap gl-aurora-orbit-ccw');
    const svgCcw = document.createElementNS(ns, 'svg');
    svgCcw.setAttribute('viewBox', '0 0 240 240');
    svgCcw.setAttribute('fill', 'none');
    svgCcw.style.width = '100%';
    svgCcw.style.height = '100%';
    const ellCcw = document.createElementNS(ns, 'ellipse');
    ellCcw.setAttribute('cx', '120');
    ellCcw.setAttribute('cy', '120');
    ellCcw.setAttribute('rx', '92');
    ellCcw.setAttribute('ry', '62');
    ellCcw.setAttribute('transform', 'rotate(24 120 120)');
    ellCcw.setAttribute('stroke', badgeColor);
    ellCcw.setAttribute('stroke-width', '0.55');
    ellCcw.setAttribute('stroke-opacity', '0.48');
    const starCcw = document.createElementNS(ns, 'path');
    starCcw.setAttribute('d', 'M42 74L43.5 78.5L48 80L43.5 81.5L42 86L40.5 81.5L36 80L40.5 78.5Z');
    starCcw.setAttribute('fill', badgeColor);
    starCcw.setAttribute('fill-opacity', '0.85');
    svgCcw.append(ellCcw, starCcw);
    orbitCcwWrap.appendChild(svgCcw);

    const frame = el('div', 'gl-letter-frame-inner gl-card-holo-rim');
    frame.style.borderColor = `${borderColor}55`;

    const topRim = el('div', 'gl-card-top-rim');
    topRim.style.background =
      'linear-gradient(90deg, transparent, rgba(255,255,255,0.92) 30%, rgba(216,180,254,0.85) 70%, transparent)';

    const burst = createStarburstWrap('#FFFFFF', badgeColor, 'gl-starburst-aurora');

    const symSvg = document.createElementNS(ns, 'svg');
    symSvg.setAttribute('viewBox', '0 0 400 300');
    symSvg.setAttribute('preserveAspectRatio', 'none');
    symSvg.setAttribute('fill', 'none');
    symSvg.setAttribute('class', 'gl-letter-pattern');
    symSvg.style.opacity = '0.8';
    const sp1 = document.createElementNS(ns, 'path');
    sp1.setAttribute('d', 'M36 42L38 48L44 50L38 52L36 58L34 52L28 50L34 48Z');
    sp1.setAttribute('fill', '#FFFFFF');
    sp1.setAttribute('fill-opacity', '0.82');
    const sp2 = document.createElementNS(ns, 'path');
    sp2.setAttribute('d', 'M366 244L368 250L374 252L368 254L366 260L364 254L358 252L364 250Z');
    sp2.setAttribute('fill', badgeColor);
    sp2.setAttribute('fill-opacity', '0.85');
    const topDiamond = document.createElementNS(ns, 'path');
    topDiamond.setAttribute('d', 'M200 10L203 16L209 18L203 20L200 26L197 20L191 18L197 16Z');
    topDiamond.setAttribute('fill', badgeColor);
    topDiamond.setAttribute('fill-opacity', '0.72');
    const botDiamond = document.createElementNS(ns, 'path');
    botDiamond.setAttribute('d', 'M200 274L203 280L209 282L203 284L200 290L197 284L191 282L197 280Z');
    botDiamond.setAttribute('fill', accentColor);
    botDiamond.setAttribute('fill-opacity', '0.68');
    symSvg.append(sp1, sp2, topDiamond, botDiamond);

    container.append(nebulaPat, textGlow, topRim, orbitCwWrap, orbitCcwWrap, frame, burst, symSvg);
    return;
  }

  // 'minimal' — Editorial architectural stationery composition
  const inkLine = isLightPaper ? borderColor : accentColor;
  const asymTint = el('div', 'gl-letter-pattern');
  asymTint.style.left = 'auto';
  asymTint.style.width = '34%';
  asymTint.style.opacity = '0.35';
  asymTint.style.background = `linear-gradient(180deg, ${accentColor}18 0%, transparent 65%, ${accentColor}12 100%)`;

  const outerFrame = el('div', 'gl-letter-frame-inner');
  outerFrame.style.inset = '12px';
  outerFrame.style.borderRadius = '14px';
  outerFrame.style.borderColor = `${inkLine}66`;

  const leftGuide = el('div', 'gl-letter-pattern');
  leftGuide.style.left = '24px';
  leftGuide.style.right = 'auto';
  leftGuide.style.top = '12px';
  leftGuide.style.bottom = '12px';
  leftGuide.style.width = '1px';
  leftGuide.style.opacity = '0.45';
  leftGuide.style.backgroundColor = accentColor;

  const topDot = el('div', 'gl-letter-pattern');
  topDot.style.left = 'auto';
  topDot.style.bottom = 'auto';
  topDot.style.right = '22px';
  topDot.style.top = '22px';
  topDot.style.width = '8px';
  topDot.style.height = '8px';
  topDot.style.borderRadius = '999px';
  topDot.style.opacity = '0.75';
  topDot.style.backgroundColor = accentColor;

  const botRule = el('div', 'gl-letter-pattern');
  botRule.style.left = 'auto';
  botRule.style.top = 'auto';
  botRule.style.right = '22px';
  botRule.style.bottom = '22px';
  botRule.style.width = '24px';
  botRule.style.height = '1px';
  botRule.style.opacity = '0.6';
  botRule.style.backgroundColor = badgeColor;

  container.append(asymTint, outerFrame, leftGuide, topDot, botRule);
}

function shouldIgnoreSwipeTarget(
  target: EventTarget | null,
  pointerType: string,
): boolean {
  if (!(target instanceof Element)) return false;
  if (
    target.closest(
      'button, a, input, textarea, select, [role="button"], [data-no-swipe="true"]',
    )
  ) {
    return true;
  }
  if (
    pointerType === 'mouse' &&
    target.closest('[data-selectable-text="true"]')
  ) {
    return true;
  }
  return false;
}

function hasActiveTextSelection(): boolean {
  if (!window.getSelection) return false;
  const sel = window.getSelection();
  return Boolean(sel && !sel.isCollapsed && sel.toString().trim().length > 0);
}

function bootGiftLabRecipient(): void {
  const rawPayload = window.__GIFTLAB_PAYLOAD__;
  const root = document.getElementById('app');
  if (!rawPayload || !root) return;
  const payload: StandalonePayload = rawPayload;

  const palette = COSMIC_PALETTES[payload.paletteId] ?? COSMIC_PALETTES.lavender;
  const globalGlow = GLOW_COLORS[payload.globalGlowColor] ?? GLOW_COLORS.gold;
  const cardTheme = resolveCardTheme(payload.cardTheme);
  const cardColors = resolveCardColors(payload);
  const hasExplicitCardTheme = Boolean(payload.cardTheme || payload.cardColors);
  const isMinimalistTheme = cardTheme.id === 'minimalist';
  const sansFontMeta = resolveMessageFont('manrope');
  const normalizedStars: StandaloneStar[] = payload.stars.map((s) => ({
    ...s,
    shape: resolveStarShape(s),
  }));
  const resolvedConnections = sanitizeConnections(
    payload.connections,
    normalizedStars,
  );
  document.body.style.background = palette.deepColor;

  let phase: RecipientPhase = 'sealed';
  let activeIndex = 0;
  let unlockedCount = 0;
  let finaleReached = false;
  let letterOpen = false;
  let quickLetterOpen = false;
  let reducedMotion =
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  let engine: ConstellationEngine | null = null;
  let using2DFallback = false;

  // Unified transition lock
  let isTransitionLocked = false;
  let lockTimerId: number | null = null;

  function releaseLock(): void {
    if (lockTimerId !== null) {
      window.clearTimeout(lockTimerId);
      lockTimerId = null;
    }
    isTransitionLocked = false;
  }

  function acquireLock(ms: number): void {
    if (lockTimerId !== null) {
      window.clearTimeout(lockTimerId);
    }
    isTransitionLocked = true;
    lockTimerId = window.setTimeout(() => {
      lockTimerId = null;
      isTransitionLocked = false;
    }, ms);
  }

  const signatureText =
    payload.senderName?.trim() ||
    (payload.recipientName ? `Для ${payload.recipientName}` : '');
  const resolvedEnvelope = resolveEnvelopeSettings(payload);
  const sealHex = resolvedEnvelope.sealColor ?? globalGlow.hex;
  const sealCoreHex = resolvedEnvelope.sealColor ?? globalGlow.coreHex;

  // Stage container
  const stage = el('div', 'gl-stage');
  if (reducedMotion) stage.classList.add('gl-reduced');
  const canvasHost = el('div', 'gl-canvas');
  stage.appendChild(canvasHost);

  // 2D Sealed envelope fallback layer (frosted translucent envelope + indigo glow)
  const sealed2DOverlay = el('div', 'gl-2d-sealed gl-hidden');
  sealed2DOverlay.style.background = palette.cssGradient;
  const sealed2DGlow = el('div', 'gl-2d-sealed-glow');
  sealed2DGlow.style.background = `radial-gradient(ellipse 68% 52% at 50% 56%, ${
    resolvedEnvelope.envelopeColor ?? palette.nebulaPrimary
  }55 0%, rgba(167,139,250,0.22) 38%, transparent 74%)`;
  const sealed2DBox = el('div', 'gl-2d-envelope');
  if (resolvedEnvelope.envelopeColor) {
    sealed2DBox.style.background = `linear-gradient(155deg, ${resolvedEnvelope.envelopeColor}CC 0%, ${resolvedEnvelope.envelopeColor}78 100%)`;
  }
  const flapSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  flapSvg.setAttribute('viewBox', '0 0 320 192');
  flapSvg.setAttribute('class', 'gl-2d-envelope-flap');
  flapSvg.setAttribute('aria-hidden', 'true');
  const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p1.setAttribute('d', 'M0 0L160 112L320 0');
  p1.setAttribute('fill', 'rgba(255,255,255,0.18)');
  p1.setAttribute('stroke', 'rgba(255,255,255,0.68)');
  p1.setAttribute('stroke-width', '1.6');
  const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p2.setAttribute('d', 'M0 192L122 96M320 192L198 96');
  p2.setAttribute('stroke', 'rgba(255,255,255,0.36)');
  p2.setAttribute('stroke-width', '1.4');
  flapSvg.append(p1, p2);
  const sealed2DSeal = el('div', 'gl-2d-seal');
  sealed2DSeal.style.background = `radial-gradient(circle, #FFFFFF 8%, ${sealCoreHex} 58%, ${sealHex} 100%)`;
  sealed2DSeal.style.boxShadow = `0 0 28px ${sealHex}`;
  sealed2DBox.append(flapSvg, sealed2DSeal);
  sealed2DOverlay.append(sealed2DGlow, sealed2DBox);
  stage.appendChild(sealed2DOverlay);

  // PHASE 1: Sealed Envelope UI
  const sealedUi = el('div', 'gl-sealed-ui');
  const sealedAmbient = el('div', 'gl-2d-sealed-glow');
  sealedAmbient.style.background = `radial-gradient(ellipse 64% 48% at 50% 56%, ${
    resolvedEnvelope.envelopeColor ?? palette.nebulaPrimary
  }42 0%, transparent 72%)`;
  const sealedHeader = el('div', 'gl-sealed-head');
  const sealedKicker = el('div', 'gl-kicker', resolvedEnvelope.kickerText);
  const sealedTitle = el('h1', 'gl-title', resolvedEnvelope.headlineText);
  sealedHeader.append(sealedKicker, sealedTitle);

  const sealedFooter = el('div', 'gl-sealed-foot');
  const sealedSub = el('p', 'gl-sealed-sub', resolvedEnvelope.hintText);
  const openBtn = el(
    'button',
    'gl-btn gl-open-btn gl-open-btn-pearl',
    `✦ ${resolvedEnvelope.ctaText}`,
  );
  openBtn.type = 'button';
  sealedFooter.append(sealedSub, openBtn);
  sealedUi.append(sealedAmbient, sealedHeader, sealedFooter);
  stage.appendChild(sealedUi);

  function applySealedComposition(): void {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    const isPortrait = h > w || w < 540;
    const activeDevice = resolveViewportDeviceMode(w, h);
    const textOffsetY = resolveEnvelopeTextOffsetY(payload.envelopeSettings, activeDevice);
    const textOffsetPx = computeEnvelopeTextTranslateYPx(textOffsetY, h, isPortrait);
    sealedHeader.style.transform = textOffsetPx !== 0 ? `translateY(${textOffsetPx}px)` : '';

    const aspect = Math.max(0.25, w / h);
    const worldScale = resolveEnvelopeEffectiveWorldScale(
      payload.envelopeSettings,
      aspect,
      activeDevice,
    );
    const pxPerUnit = h / ENVELOPE_VISIBLE_WORLD_H;
    const boxW = Math.round(ENVELOPE_WORLD_W * worldScale * pxPerUnit);
    const boxH = Math.round(ENVELOPE_WORLD_H * worldScale * pxPerUnit);
    const envOffsetY = resolveEnvelopeOffsetY(payload.envelopeSettings, activeDevice);
    const envOffsetPx = computeEnvelopeScreenOffsetYPx(envOffsetY, w, h);
    sealed2DBox.style.width = `${boxW}px`;
    sealed2DBox.style.height = `${boxH}px`;
    sealed2DBox.style.transform = envOffsetPx !== 0 ? `translateY(${envOffsetPx}px)` : '';
  }
  applySealedComposition();

  // PHASE 2 & 4: Skip + Sound Bar during Birthing / FinalReveal
  const transUi = el('div', 'gl-birth-ui gl-hidden');
  const transTopRight = el('div', 'gl-birth-actions');
  const transSoundBtn = el('button', 'gl-btn gl-btn-ghost gl-hidden', 'Звук вкл');
  transSoundBtn.type = 'button';
  const skipBtn = el('button', 'gl-btn gl-btn-ghost', 'Пропустить');
  skipBtn.type = 'button';
  transTopRight.append(transSoundBtn, skipBtn);

  const audioBlockedBanner = el('div', 'gl-audio-banner gl-hidden');
  const audioBlockedText = el('span', '', 'Нажмите, чтобы включить музыку');
  const audioManualBtn = el('button', 'gl-btn gl-btn-primary', 'Включить');
  audioManualBtn.type = 'button';
  audioBlockedBanner.append(audioBlockedText, audioManualBtn);
  transUi.append(transTopRight, audioBlockedBanner);
  stage.appendChild(transUi);

  // PHASE 3: Swipeable Borderless Star Story Experience
  const storyUi = el('div', 'gl-story-ui gl-hidden');
  const storyScrim = el('div', 'gl-story-scrim');
  const storyTop = el('header', 'gl-story-top');
  const storyBrand = el('div', 'gl-story-brand', payload.title);

  const storyProgressWrap = el('div', 'gl-story-progress');
  const dotsContainer = el('div', 'gl-dots');
  dotsContainer.setAttribute('role', 'navigation');
  dotsContainer.setAttribute('aria-label', 'Открытые звёзды');
  const progressText = el('span', 'gl-progress-txt', `1 / ${normalizedStars.length}`);
  storyProgressWrap.append(dotsContainer, progressText);

  const storyUtils = el('div', 'gl-story-utils');
  const backToConstBtn = el('button', 'gl-btn gl-btn-amber gl-hidden', 'К созвездию');
  backToConstBtn.type = 'button';
  const storySoundBtn = el('button', 'gl-btn gl-btn-ghost gl-hidden', 'Звук вкл');
  storySoundBtn.type = 'button';
  const storyLetterBtn = el('button', 'gl-icon-btn');
  storyLetterBtn.type = 'button';
  storyLetterBtn.setAttribute('aria-label', 'Открыть финальное письмо');
  storyLetterBtn.title = 'Открыть финальное письмо';
  storyLetterBtn.appendChild(createEnvelopeSvg(false));
  storyUtils.append(backToConstBtn, storySoundBtn, storyLetterBtn);

  storyTop.append(storyBrand, storyProgressWrap, storyUtils);

  const storyGrid = el('div', 'gl-story-grid');
  const storyLeft = el('div', 'gl-story-left');
  const storyRight = el('div', 'gl-story-right');
  const storyMotionWrap = el('div', 'gl-story-motion-wrap');
  if (hasExplicitCardTheme) {
    storyMotionWrap.classList.add('gl-story-paper');
    if (cardColors.isLightPaper) storyMotionWrap.classList.add('gl-paper-light');
    storyMotionWrap.style.background = cardColors.isLightPaper
      ? `linear-gradient(155deg, ${cardColors.surfaceBg}F5 0%, ${cardColors.surfaceBgAlt}F2 100%)`
      : `linear-gradient(155deg, ${cardColors.surfaceBg}CC 0%, ${cardColors.surfaceBgAlt}C4 100%)`;
    storyMotionWrap.style.borderColor = `${cardColors.borderColor}70`;
    appendCardThemeBackdropNodes(
      storyMotionWrap,
      cardTheme.paperPattern,
      cardColors.accentColor,
      cardColors.badgeColor,
      cardColors.borderColor,
      globalGlow.hex,
      cardColors.isLightPaper,
    );
  }
  const storyContent = el('article', 'gl-story-content');

  const storyCardDecor = el('div', 'gl-card-decor gl-hidden');

  const topOuterSpacer = el('div', 'gl-story-spacer');
  const illuRow = el('div', 'gl-illu-row');
  const illuLeftSpacer = el('div', 'gl-story-spacer');
  const illuWrap = el('div', 'gl-illu-wrap');
  const illuGlow = el('div', 'gl-illu-glow');
  const illuFrame = el('div', 'gl-illu-frame');
  const illuImg = document.createElement('img');
  illuImg.className = 'gl-illu-img';
  illuFrame.appendChild(illuImg);
  illuWrap.append(illuGlow, illuFrame);
  const illuRightSpacer = el('div', 'gl-story-spacer');
  illuRow.append(illuLeftSpacer, illuWrap, illuRightSpacer);

  const topInnerSpacer = el('div', 'gl-story-spacer');
  const storyBlock = el('div', 'gl-story-block');
  const storyAccentLine = el('div', 'gl-story-accent-line gl-hidden');

  const storyOrd = el('p', 'gl-story-ord');
  const storyTitle = el('h2', 'gl-story-title');
  storyTitle.setAttribute('data-selectable-text', 'true');
  const storyMsg = el('p', 'gl-story-msg');
  storyMsg.setAttribute('data-selectable-text', 'true');
  const storySign = el('p', 'gl-story-sign', signatureText ? `— ${signatureText}` : '');
  storySign.setAttribute('data-selectable-text', 'true');
  if (!signatureText) storySign.classList.add('gl-hidden');

  storyBlock.append(storyAccentLine, storyOrd, storyTitle, storyMsg, storySign);
  const bottomInnerSpacer = el('div', 'gl-story-spacer');

  storyContent.append(
    topOuterSpacer,
    illuRow,
    topInnerSpacer,
    storyBlock,
    bottomInnerSpacer,
  );
  storyMotionWrap.append(storyCardDecor, storyContent);

  // Stably mounted secondary arrows + unobtrusive swipe hint
  const storyNav = el('div', 'gl-story-nav');
  storyNav.setAttribute('data-no-swipe', 'true');

  const prevArrowBtn = el('button', 'gl-nav-arrow', '‹');
  prevArrowBtn.type = 'button';
  prevArrowBtn.setAttribute('aria-label', 'Предыдущая звезда');

  const swipeHint = el('div', 'gl-swipe-hint');
  const swipeHintArrow = el('span', 'gl-swipe-arrow', '‹');
  const swipeHintText = el('span', '', 'Свайп влево — следующая звезда');
  swipeHint.append(swipeHintArrow, swipeHintText);

  const nextArrowBtn = el('button', 'gl-nav-arrow', '›');
  nextArrowBtn.type = 'button';
  nextArrowBtn.setAttribute('aria-label', 'Следующая звезда');

  storyNav.append(prevArrowBtn, swipeHint, nextArrowBtn);
  storyRight.append(storyMotionWrap, storyNav);
  storyGrid.append(storyLeft, storyRight);
  storyUi.append(storyScrim, storyTop, storyGrid);
  stage.appendChild(storyUi);

  // PHASE 5: Final Rotating Constellation Emerging Paper Letter & Dock
  const letterBackdrop = el('div', 'gl-letter-backdrop gl-hidden');
  const letterCard = el('article', 'gl-letter-card');
  letterCard.setAttribute('role', 'dialog');
  letterCard.setAttribute('aria-label', 'Финальное поздравительное письмо');
  letterCard.style.background = `linear-gradient(155deg, ${cardColors.surfaceBg} 0%, ${cardColors.surfaceBgAlt} 100%)`;
  letterCard.style.borderColor = `${cardColors.borderColor}88`;
  letterCard.style.boxShadow = cardColors.isLightPaper
    ? `0 24px 64px rgba(4,7,20,0.55), 0 0 0 1px ${cardColors.accentColor}26`
    : `0 24px 70px rgba(3,5,16,0.78), 0 0 42px ${cardColors.accentColor}24`;

  appendCardThemeBackdropNodes(
    letterCard,
    cardTheme.paperPattern,
    cardColors.accentColor,
    cardColors.badgeColor,
    cardColors.borderColor,
    globalGlow.hex,
    cardColors.isLightPaper,
  );

  const finaleDecorEl = el('div', 'gl-card-decor gl-hidden');
  const letterHead = el('div', 'gl-letter-head');
  const letterKicker = el(
    'p',
    `gl-letter-kicker${isMinimalistTheme ? ' gl-minimal-kicker' : ''}`,
    payload.recipientName ? `Для ${payload.recipientName} · ${payload.title}` : payload.title,
  );
  letterKicker.style.color = cardColors.badgeColor;
  if (isMinimalistTheme) letterKicker.style.fontFamily = sansFontMeta.cssFamily;

  const letterCloseBtn = el('button', 'gl-letter-close', '×');
  letterCloseBtn.type = 'button';
  letterCloseBtn.setAttribute('aria-label', 'Скрыть письмо');
  letterCloseBtn.title = 'Скрыть письмо';
  letterCloseBtn.style.color = cardColors.badgeColor;
  letterCloseBtn.style.borderColor = `${cardColors.borderColor}66`;
  letterCloseBtn.style.backgroundColor = cardColors.isLightPaper
    ? 'rgba(255,255,255,0.65)'
    : 'rgba(255,255,255,0.08)';
  letterHead.append(letterKicker, letterCloseBtn);

  const letterDivider = el('div', 'gl-letter-divider');
  if (cardTheme.paperPattern === 'aurora') {
    letterDivider.classList.add('gl-diamond-band');
  } else if (cardTheme.paperPattern === 'stars') {
    letterDivider.classList.add(
      cardColors.isLightPaper ? 'gl-hatched-divider-light' : 'gl-hatched-divider',
    );
  } else {
    letterDivider.style.background = isMinimalistTheme
      ? cardColors.borderColor
      : `linear-gradient(90deg, transparent, ${cardColors.accentColor}, transparent)`;
  }

  const letterBody = el('div', 'gl-letter-body');
  const letterInner = el('div', 'gl-letter-inner');
  const finaleAccentLine = el('div', 'gl-story-accent-line gl-hidden');
  const letterMsg = el(
    'p',
    'gl-letter-msg',
    payload.finalMessage ||
      'Пусть это созвездие всегда напоминает о самом светлом и добром!',
  );
  letterMsg.setAttribute('data-selectable-text', 'true');
  const letterSign = el('p', 'gl-letter-sign', signatureText ? `— ${signatureText}` : '');
  letterSign.setAttribute('data-selectable-text', 'true');
  if (!signatureText) letterSign.classList.add('gl-hidden');
  letterInner.append(finaleAccentLine, letterMsg, letterSign);
  letterBody.appendChild(letterInner);

  const finaleSpacerFoot = el('div', 'gl-letter-foot');
  letterCard.append(finaleDecorEl, letterHead, letterDivider, letterBody, finaleSpacerFoot);
  letterBackdrop.appendChild(letterCard);

  // PHASE 5: Cosmic Constellation Title & Envelope Toggle Button
  const constellationTitleWrap = el('div', 'gl-constellation-title-wrap gl-hidden');
  const constellationEyebrow = el('span', 'gl-constellation-eyebrow', '✦ Созвездие ✦');
  constellationEyebrow.style.color = palette.lineTint;
  const constellationTitleEl = el(
    'h2',
    'gl-constellation-title',
    payload.title.trim() || 'Моё созвездие',
  );
  constellationTitleEl.style.textShadow = `0 2px 16px rgba(4, 6, 20, 0.9), 0 0 22px ${globalGlow.hex}66`;
  const constellationRule = el('div', 'gl-constellation-rule');
  constellationRule.style.background = `linear-gradient(90deg, transparent, ${globalGlow.hex}, transparent)`;
  constellationTitleWrap.append(constellationEyebrow, constellationTitleEl, constellationRule);

  const constellationLetterBtn = el('button', 'gl-icon-btn gl-letter-fab gl-hidden');
  constellationLetterBtn.type = 'button';
  constellationLetterBtn.setAttribute('aria-label', 'Открыть финальное письмо');
  constellationLetterBtn.title = 'Открыть финальное письмо';
  constellationLetterBtn.appendChild(createEnvelopeSvg(true));

  stage.append(constellationTitleWrap, constellationLetterBtn, letterBackdrop);

  function getActiveDevice(): DeviceLayoutKey {
    return resolveViewportDeviceMode(window.innerWidth, window.innerHeight);
  }

  function applyFinaleTextFormatting(): void {
    const activeDevice = getActiveDevice();
    const isPortrait = window.innerHeight > window.innerWidth || window.innerWidth < 540;
    const isCompactLandscape = !isPortrait && window.innerHeight < 520;
    const cardLayout = resolveEffectiveCardLayout(payload, activeDevice);
    const fDecor = resolveEffectiveFinalDecor(payload, activeDevice);
    const safeFDecor = resolveSafeCardDecorPresentation(fDecor, {
      editMode: false,
      textLength: (payload.finalMessage || '').length,
      compactViewport: isPortrait || isCompactLandscape,
    });
    const decorGlowHex = cardColors.isLightPaper ? cardColors.accentColor : globalGlow.hex;
    const decorCoreHex = cardColors.isLightPaper ? cardColors.badgeColor : globalGlow.coreHex;
    finaleDecorEl.innerHTML = '';
    if (fDecor.motif !== 'none') {
      const svg = createCardDecorSvg(fDecor.motif, decorGlowHex, decorCoreHex);
      if (svg) finaleDecorEl.appendChild(svg);
      finaleDecorEl.classList.remove('gl-hidden');
      finaleDecorEl.style.left = `${safeFDecor.xPct}%`;
      finaleDecorEl.style.top = `${safeFDecor.yPct}%`;
      finaleDecorEl.style.transform = `translate(-50%, -50%) scale(${safeFDecor.scale})`;
      finaleDecorEl.style.opacity = String(safeFDecor.opacity);
    } else {
      finaleDecorEl.classList.add('gl-hidden');
    }

    letterBackdrop.style.alignItems =
      cardLayout.verticalAlign === 'top' ? 'flex-start' : 'center';
    letterBackdrop.style.paddingTop =
      cardLayout.verticalAlign === 'top'
        ? isCompactLandscape
          ? '56px'
          : '74px'
        : '';
    letterCard.style.width = cardLayout.customWidthPx
      ? `min(92vw, ${cardLayout.customWidthPx}px)`
      : '100%';
    letterCard.style.maxWidth = cardLayout.customWidthPx
      ? `min(92vw, ${cardLayout.customWidthPx}px)`
      : isCompactLandscape
        ? 'min(92vw, 576px)'
        : activeDevice === 'phone'
          ? cardLayout.width === 'compact'
            ? 'min(86vw, 330px)'
            : cardLayout.width === 'wide'
              ? 'min(96vw, 440px)'
              : 'min(92vw, 390px)'
          : cardLayout.width === 'compact'
            ? 'min(92vw, 440px)'
            : cardLayout.width === 'wide'
              ? 'min(92vw, 680px)'
              : 'min(92vw, 540px)';
    letterCard.style.minHeight = cardLayout.customHeightPx
      ? `${cardLayout.customHeightPx}px`
      : '';
    const cardShiftY = Math.round(cardLayout.offsetY * 1.4);
    const cardScale = cardLayout.scale ?? 1;
    letterCard.style.translate = cardShiftY !== 0 ? `0 ${cardShiftY}px` : '';
    letterCard.style.scale = cardScale !== 1 ? String(cardScale) : '';
    letterCard.style.transformOrigin = 'center center';

    if (isMinimalistTheme) {
      letterHead.style.padding = cardLayout.padding === 'compact' ? '16px 22px 8px 36px' : '22px 28px 10px 42px';
      letterDivider.style.margin = '0 22px 0 42px';
      letterBody.style.padding = isPortrait ? '18px 24px 20px 36px' : '24px 36px 26px 44px';
      finaleSpacerFoot.style.padding = cardLayout.padding === 'compact' ? '6px 22px' : '10px 28px';
    } else if (cardLayout.padding === 'compact') {
      letterHead.style.padding = '12px 18px 6px';
      letterBody.style.padding = isCompactLandscape ? '10px 16px' : '12px 18px';
      finaleSpacerFoot.style.padding = '4px 18px';
    } else if (cardLayout.padding === 'spacious') {
      letterHead.style.padding = isPortrait ? '18px 22px 10px' : '22px 32px 12px';
      letterBody.style.padding = isPortrait ? '20px 24px' : '26px 36px';
      finaleSpacerFoot.style.padding = isPortrait ? '8px 22px' : '10px 32px';
    } else {
      letterHead.style.padding = '';
      letterBody.style.padding = fDecor.motif !== 'none' ? '20px 32px' : '';
      finaleSpacerFoot.style.padding = '';
    }

    const style = resolveEffectiveFinalTextStyle(payload, activeDevice);
    const isDefault = !payload.finalTextStyle || isDefaultStarTextStyle(style);
    const fontMeta = resolveMessageFont(style.fontId);
    const align: Exclude<MessageTextAlign, 'auto'> =
      style.textAlign !== 'auto'
        ? style.textAlign
        : isMinimalistTheme
          ? 'left'
          : 'center';
    const rawTextColor =
      payload.finalTextStyle && !isDefault
        ? style.color
        : payload.cardColors?.textColor ??
          (payload.cardTheme ? cardColors.textColor : style.color);
    const textColor = resolveContrastSafeCardTextColor(rawTextColor, payload, cardColors);
    const shadowMode =
      cardColors.isLightPaper && style.shadow !== 'glow' ? 'none' : style.shadow;
    const shadowCss = resolveTextShadowCss(shadowMode, globalGlow.hex);

    letterInner.classList.remove(
      'gl-story-block-frame',
      'gl-story-block-frame-light',
      'gl-story-block-quote-left',
      'gl-story-block-quote-right',
    );
    letterInner.style.width = `${style.widthPct}%`;
    letterInner.style.marginLeft = `${computeTextBlockMarginLeftPct(style.widthPct, style.offsetX)}%`;
    const textShiftY = Math.round(style.offsetY * 0.25);
    letterInner.style.translate = textShiftY !== 0 ? `0 ${textShiftY}px` : '';
    letterInner.style.textAlign = align;
    letterInner.style.fontFamily = fontMeta.cssFamily;
    letterInner.style.borderColor = '';
    letterInner.style.padding = '';
    letterInner.style.borderRadius = '';
    letterInner.style.border = '';

    if (style.accent === 'frame') {
      letterInner.style.border = `1px solid ${cardColors.accentColor}55`;
      letterInner.style.borderRadius = '16px';
      letterInner.style.padding = '14px 18px';
    } else if (style.accent === 'quote') {
      letterInner.classList.add(
        align === 'right' ? 'gl-story-block-quote-right' : 'gl-story-block-quote-left',
      );
      letterInner.style.borderColor = cardColors.accentColor || globalGlow.hex;
    }

    if (style.accent === 'line') {
      finaleAccentLine.classList.remove('gl-hidden');
      finaleAccentLine.style.background = `linear-gradient(90deg, ${cardColors.accentColor}, ${cardColors.badgeColor})`;
      finaleAccentLine.style.marginLeft = align === 'left' ? '0' : 'auto';
      finaleAccentLine.style.marginRight = align === 'center' ? 'auto' : '0';
    } else {
      finaleAccentLine.classList.add('gl-hidden');
    }

    const finalePx = Math.min(
      isCompactLandscape ? 19 : isPortrait ? 24 : 30,
      Math.max(12, Math.round((style.fontSize + fontMeta.opticalSizeBoost) * 1.15)),
    );
    const headerPx = Math.max(
      12,
      Math.min(isPortrait ? 15 : 20, Math.round(finalePx * 0.68)),
    );
    const signaturePx = Math.max(15, Math.min(24, Math.round(finalePx * 0.8)));

    letterKicker.style.fontSize = `${headerPx}px`;
    letterMsg.style.fontFamily = fontMeta.cssFamily;
    letterMsg.style.fontWeight = style.fontWeight === 'semibold' ? '600' : '400';
    letterMsg.style.fontSize = `${finalePx}px`;
    letterMsg.style.lineHeight = String(Math.min(1.85, style.lineHeight));
    letterMsg.style.color = textColor;
    letterMsg.style.textShadow = shadowCss;

    if (signatureText) {
      letterSign.style.fontFamily = fontMeta.cssFamily;
      letterSign.style.fontSize = `${signaturePx}px`;
      letterSign.style.color = textColor;
      letterSign.style.textShadow = shadowCss;
    }
  }
  applyFinaleTextFormatting();

  function syncLetterToggleUI(): void {
    const isOpenNow =
      (phase === 'constellation' && letterOpen) ||
      (phase === 'starStory' && quickLetterOpen);
    letterBackdrop.classList.toggle('gl-hidden', !isOpenNow);
    storyGrid.classList.toggle('gl-story-dimmed', phase === 'starStory' && quickLetterOpen);

    storyLetterBtn.innerHTML = '';
    storyLetterBtn.appendChild(createEnvelopeSvg(quickLetterOpen));
    storyLetterBtn.classList.toggle('gl-icon-btn-active', quickLetterOpen);
    storyLetterBtn.setAttribute('aria-pressed', String(quickLetterOpen));
    storyLetterBtn.setAttribute(
      'aria-label',
      quickLetterOpen ? 'Вернуться к звёздам' : 'Открыть финальное письмо',
    );
    storyLetterBtn.title = quickLetterOpen
      ? 'Вернуться к звёздам'
      : 'Открыть финальное письмо';

    constellationLetterBtn.innerHTML = '';
    constellationLetterBtn.appendChild(createEnvelopeSvg(letterOpen));
    constellationLetterBtn.classList.toggle('gl-icon-btn-active', letterOpen);
    constellationLetterBtn.setAttribute('aria-pressed', String(letterOpen));
    constellationLetterBtn.setAttribute(
      'aria-label',
      letterOpen ? 'Скрыть письмо и любоваться созвездием' : 'Открыть финальное письмо',
    );
    constellationLetterBtn.title = letterOpen
      ? 'Скрыть письмо'
      : 'Открыть финальное письмо';
  }

  function setLetterOpen(open: boolean): void {
    letterOpen = open;
    syncLetterToggleUI();
  }

  function setQuickLetterOpen(open: boolean): void {
    quickLetterOpen = open;
    syncLetterToggleUI();
  }

  storyLetterBtn.addEventListener('click', () => {
    if (phase === 'starStory') setQuickLetterOpen(!quickLetterOpen);
  });

  constellationLetterBtn.addEventListener('click', () => {
    if (phase === 'constellation') setLetterOpen(!letterOpen);
  });

  letterCloseBtn.addEventListener('click', () => {
    if (phase === 'starStory') {
      setQuickLetterOpen(false);
    } else {
      setLetterOpen(false);
    }
  });

  // Swipe horizontal or downward on letterCard to dismiss back to stars / constellation
  let letterSwipeActive = false;
  let letterSwipePointerId: number | null = null;
  let letterSwipeStartX = 0;
  let letterSwipeStartY = 0;
  let letterSwipeScrollTop = 0;

  letterCard.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (shouldIgnoreSwipeTarget(e.target, e.pointerType)) return;
    if (hasActiveTextSelection()) return;
    letterSwipeActive = true;
    letterSwipePointerId = e.pointerId;
    letterSwipeStartX = e.clientX;
    letterSwipeStartY = e.clientY;
    letterSwipeScrollTop = letterBody.scrollTop;
  });

  letterCard.addEventListener('pointerup', (e) => {
    if (!letterSwipeActive || letterSwipePointerId !== e.pointerId) return;
    letterSwipeActive = false;
    letterSwipePointerId = null;
    if (hasActiveTextSelection()) return;

    const dx = e.clientX - letterSwipeStartX;
    const dy = e.clientY - letterSwipeStartY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const isHorizontalSwipe = absX >= 55 && absX > absY * 1.2;
    const isDownwardSwipe = dy >= 65 && absY > absX * 1.2 && letterSwipeScrollTop <= 2;
    if (isHorizontalSwipe || isDownwardSwipe) {
      if (phase === 'starStory') {
        setQuickLetterOpen(false);
      } else {
        setLetterOpen(false);
      }
    }
  });

  const resetLetterSwipe = () => {
    letterSwipeActive = false;
    letterSwipePointerId = null;
  };
  letterCard.addEventListener('pointercancel', resetLetterSwipe);

  // Audio player
  let audioEl: HTMLAudioElement | null = null;
  let musicPlaying = false;
  let musicMuted = false;
  let audioBlocked = false;
  const volume = 0.58;

  if (payload.musicPath) {
    audioEl = document.createElement('audio');
    audioEl.src = payload.musicPath;
    audioEl.loop = true;
    audioEl.volume = volume;

    transSoundBtn.classList.remove('gl-hidden');
    storySoundBtn.classList.remove('gl-hidden');

    transSoundBtn.addEventListener('click', toggleSound);
    storySoundBtn.addEventListener('click', toggleSound);
    audioManualBtn.addEventListener('click', () => {
      musicMuted = false;
      attemptPlayMusic();
    });
  }

  function syncSoundLabels(): void {
    const label = audioBlocked
      ? 'Включить музыку'
      : musicMuted || !musicPlaying
        ? 'Звук выкл'
        : 'Звук вкл';
    transSoundBtn.textContent = label;
    storySoundBtn.textContent = label;
    audioBlockedBanner.classList.toggle('gl-hidden', !audioBlocked || phase === 'sealed');
  }

  function attemptPlayMusic(): void {
    if (!audioEl) return;
    audioEl.volume = musicMuted ? 0 : volume;
    const p = audioEl.play();
    if (p && typeof p.then === 'function') {
      p.then(() => {
        musicPlaying = true;
        audioBlocked = false;
        syncSoundLabels();
      }).catch(() => {
        musicPlaying = false;
        audioBlocked = true;
        syncSoundLabels();
      });
    }
  }

  function toggleSound(): void {
    if (!audioEl) return;
    if (!musicPlaying || audioBlocked) {
      musicMuted = false;
      attemptPlayMusic();
      return;
    }
    musicMuted = !musicMuted;
    audioEl.volume = musicMuted ? 0 : volume;
    syncSoundLabels();
  }

  root.appendChild(stage);

  function applyStoryTextFormatting(): void {
    const star = normalizedStars[activeIndex] ?? normalizedStars[0];
    if (!star) return;
    const activeDevice = getActiveDevice();
    const cardLayout = resolveEffectiveCardLayout(payload, activeDevice);
    const glow = GLOW_COLORS[resolveStarGlowHex(star, payload.globalGlowColor)];
    const style = resolveEffectiveStarTextStyle(star, activeDevice);
    const fontMeta = resolveMessageFont(style.fontId);

    const w = window.innerWidth;
    const h = window.innerHeight;
    const isPortrait = h > w || w < 540;
    const isCompactLandscape = !isPortrait && h < 520;

    storyMotionWrap.style.maxWidth = cardLayout.customWidthPx
      ? `min(94vw, ${cardLayout.customWidthPx}px)`
      : isPortrait
        ? cardLayout.width === 'compact'
          ? '330px'
          : cardLayout.width === 'wide'
            ? '100%'
            : '374px'
        : cardLayout.width === 'compact'
          ? '448px'
          : cardLayout.width === 'wide'
            ? '672px'
            : '576px';
    storyMotionWrap.style.minHeight = cardLayout.customHeightPx
      ? `${cardLayout.customHeightPx}px`
      : '';
    const storyShiftY = Math.round(cardLayout.offsetY * 0.7);
    const cardScale = cardLayout.scale ?? 1;
    storyMotionWrap.style.translate = storyShiftY !== 0 ? `0 ${storyShiftY}px` : '';
    storyMotionWrap.style.scale = cardScale !== 1 ? String(cardScale) : '';
    storyMotionWrap.style.transformOrigin = 'center center';
    if (hasExplicitCardTheme) {
      if (isMinimalistTheme) {
        storyMotionWrap.style.padding =
          cardLayout.padding === 'compact'
            ? isPortrait
              ? '14px 18px 14px 34px'
              : '18px 24px 18px 40px'
            : cardLayout.padding === 'spacious'
              ? isPortrait
                ? '20px 24px 20px 38px'
                : '26px 36px 26px 46px'
              : isPortrait
                ? '16px 20px 16px 36px'
                : '20px 28px 20px 42px';
      } else {
        storyMotionWrap.style.padding =
          cardLayout.padding === 'compact'
            ? isPortrait
              ? '8px 12px'
              : '12px 16px'
            : cardLayout.padding === 'spacious'
              ? isPortrait
                ? '16px 20px'
                : '24px 32px'
              : isPortrait
                ? '12px 16px'
                : '16px 24px';
      }
    } else {
      storyMotionWrap.style.padding =
        cardLayout.padding === 'compact'
          ? '2px'
          : cardLayout.padding === 'spacious'
            ? isPortrait
              ? '8px 12px'
              : '12px 20px'
            : '0';
    }

    const effectiveAlign: Exclude<MessageTextAlign, 'auto'> =
      style.textAlign === 'auto'
        ? isMinimalistTheme
          ? 'left'
          : isPortrait
            ? 'center'
            : 'left'
        : style.textAlign;
    const bodyPx = Math.min(
      style.fontSize + fontMeta.opticalSizeBoost,
      isCompactLandscape ? 16 : isPortrait ? 20 : 26,
    );
    const titlePx = Math.round(
      Math.min(isCompactLandscape ? 25 : isPortrait ? 31 : 38, bodyPx * 1.48),
    );
    const marginLeftPct = computeTextBlockMarginLeftPct(style.widthPct, style.offsetX);

    const illuLayout = resolveEffectiveIllustrationLayout(star, activeDevice);
    const illuLeftGrow = Number(((illuLayout.offsetX + 100) / 200).toFixed(3));
    const illuRightGrow = Number((1 - illuLeftGrow).toFixed(3));
    illuLeftSpacer.style.flexGrow = String(illuLeftGrow);
    illuRightSpacer.style.flexGrow = String(illuRightGrow);

    const clampedIlluScale = Math.min(isPortrait ? 1.28 : 1.45, illuLayout.scale);
    const baseIlluPx = isCompactLandscape
      ? 80
      : isPortrait
        ? w >= 640
          ? 156
          : 118
        : w >= 1024
          ? 196
          : 158;
    const effectiveIlluPx = Math.round(baseIlluPx * clampedIlluScale);
    illuFrame.style.width = `${effectiveIlluPx}px`;
    illuFrame.style.height = `${effectiveIlluPx}px`;

    const imgSettings = star.imageSettings ? resolveStarImageSettings(star) : null;
    if (imgSettings) {
      illuImg.style.objectFit = imgSettings.fit;
      illuImg.style.transform = `translate(${imgSettings.offsetX}%, ${imgSettings.offsetY}%) scale(${imgSettings.scale})`;
      illuImg.style.transformOrigin = 'center center';
    } else {
      illuImg.style.objectFit = 'contain';
      illuImg.style.transform = '';
    }

    const illuYShift = illuLayout.offsetY / 100;
    const textYShift = style.offsetY / 100;
    const spacerBase = isPortrait || isCompactLandscape ? 0.35 : 0.9;
    const rawTopOuterGrow = Math.max(
      0,
      Math.min(
        2.0,
        spacerBase * (1 + illuYShift * 0.85) - Math.max(0, -textYShift) * 0.45,
      ),
    );
    const rawTopInnerGrow = Math.max(
      0.06,
      Math.min(
        2.2,
        0.14 + Math.max(0, textYShift) * 1.4 + Math.max(0, -illuYShift) * 0.7,
      ),
    );
    const rawBottomInnerGrow = Math.max(
      0,
      Math.min(
        2.4,
        spacerBase + Math.max(0, -textYShift) * 1.35 - Math.max(0, textYShift) * 0.65,
      ),
    );

    const topOuterGrow = Number(
      (cardLayout.verticalAlign === 'top'
        ? rawTopOuterGrow * 0.2
        : cardLayout.verticalAlign === 'spread'
          ? rawTopOuterGrow * 0.4
          : rawTopOuterGrow
      ).toFixed(3),
    );
    const topInnerGrow = Number(
      (cardLayout.verticalAlign === 'spread'
        ? rawTopInnerGrow + 0.75
        : rawTopInnerGrow
      ).toFixed(3),
    );
    const bottomInnerGrow = Number(
      (cardLayout.verticalAlign === 'top'
        ? rawBottomInnerGrow + 1.15
        : cardLayout.verticalAlign === 'spread'
          ? rawBottomInnerGrow * 0.4
          : rawBottomInnerGrow
      ).toFixed(3),
    );

    topOuterSpacer.style.flexGrow = String(topOuterGrow);
    topInnerSpacer.style.flexGrow = String(topInnerGrow);
    bottomInnerSpacer.style.flexGrow = String(bottomInnerGrow);

    const starDecor = resolveEffectiveStarDecor(star, activeDevice);
    const safeStarDecor = resolveSafeCardDecorPresentation(starDecor, {
      editMode: false,
      textLength: (star.message || '').length,
      compactViewport: isPortrait || isCompactLandscape,
    });
    storyCardDecor.innerHTML = '';
    if (starDecor.motif !== 'none') {
      const dGlowHex = cardColors.isLightPaper ? cardColors.accentColor : glow.hex;
      const dCoreHex = cardColors.isLightPaper ? cardColors.badgeColor : glow.coreHex;
      const decorSvg = createCardDecorSvg(starDecor.motif, dGlowHex, dCoreHex);
      if (decorSvg) storyCardDecor.appendChild(decorSvg);
      storyCardDecor.classList.remove('gl-hidden');
      storyCardDecor.style.left = `${safeStarDecor.xPct}%`;
      storyCardDecor.style.top = `${safeStarDecor.yPct}%`;
      storyCardDecor.style.transform = `translate(-50%, -50%) scale(${safeStarDecor.scale})`;
      storyCardDecor.style.opacity = String(safeStarDecor.opacity);
    } else {
      storyCardDecor.classList.add('gl-hidden');
    }

    const rawTextColor =
      star.textStyle || !cardColors.isLightPaper ? style.color : cardColors.textColor;
    const effectiveTextColor = resolveContrastSafeCardTextColor(
      rawTextColor,
      payload,
      cardColors,
    );
    const effectiveShadowMode =
      cardColors.isLightPaper && style.shadow !== 'glow' ? 'none' : style.shadow;
    const shadowCss = resolveTextShadowCss(effectiveShadowMode, glow.hex);

    storyBlock.style.width = `${style.widthPct}%`;
    storyBlock.style.marginLeft = `${marginLeftPct}%`;
    const textShiftY = Math.round(style.offsetY * 0.32);
    storyBlock.style.translate = textShiftY !== 0 ? `0 ${textShiftY}px` : '';
    storyBlock.style.textAlign = effectiveAlign;
    storyBlock.style.fontFamily = fontMeta.cssFamily;
    storyBlock.style.borderColor = '';
    storyBlock.classList.remove(
      'gl-story-block-frame',
      'gl-story-block-frame-light',
      'gl-story-block-quote-left',
      'gl-story-block-quote-right',
    );
    if (style.accent === 'frame') {
      storyBlock.classList.add('gl-story-block-frame');
      if (cardColors.isLightPaper) storyBlock.classList.add('gl-story-block-frame-light');
      storyBlock.style.borderColor = `${cardColors.isLightPaper ? cardColors.accentColor : glow.hex}44`;
    } else if (style.accent === 'quote') {
      storyBlock.classList.add(
        effectiveAlign === 'right'
          ? 'gl-story-block-quote-right'
          : 'gl-story-block-quote-left',
      );
      storyBlock.style.borderColor = cardColors.isLightPaper ? cardColors.accentColor : glow.hex;
    }

    if (style.accent === 'line') {
      storyAccentLine.classList.remove('gl-hidden');
      storyAccentLine.style.background = cardColors.isLightPaper
        ? `linear-gradient(90deg, ${cardColors.accentColor}, ${cardColors.badgeColor})`
        : `linear-gradient(90deg, ${glow.hex}, ${glow.coreHex})`;
      storyAccentLine.style.marginLeft = effectiveAlign === 'left' ? '0' : 'auto';
      storyAccentLine.style.marginRight = effectiveAlign === 'center' ? 'auto' : '0';
    } else {
      storyAccentLine.classList.add('gl-hidden');
    }

    storyTitle.style.fontFamily = fontMeta.cssFamily;
    storyTitle.style.fontSize = `${titlePx}px`;
    storyTitle.style.fontWeight = '600';
    storyTitle.style.lineHeight = String(
      Math.min(1.4, Math.max(1.12, Number((style.lineHeight * 0.78).toFixed(2)))),
    );
    storyTitle.style.color = effectiveTextColor;
    storyTitle.style.textShadow = shadowCss;

    storyMsg.style.fontFamily = fontMeta.cssFamily;
    storyMsg.style.fontSize = `${bodyPx}px`;
    storyMsg.style.fontWeight = style.fontWeight === 'semibold' ? '600' : '400';
    storyMsg.style.lineHeight = String(style.lineHeight);
    storyMsg.style.color = effectiveTextColor;
    storyMsg.style.textShadow = shadowCss;

    if (signatureText) {
      storySign.style.color = effectiveTextColor;
      storySign.style.fontSize = `${Math.max(14, Math.min(22, Math.round(bodyPx * 0.8)))}px`;
      storySign.style.opacity = '0.82';
      storySign.style.textShadow = shadowCss;
    }
  }

  function renderStoryUI(): void {
    const star = normalizedStars[activeIndex] ?? normalizedStars[0];
    if (!star) return;
    const total = normalizedStars.length;
    const glow = GLOW_COLORS[resolveStarGlowHex(star, payload.globalGlowColor)];

    progressText.textContent = `${activeIndex + 1} / ${total}`;
    dotsContainer.innerHTML = '';
    normalizedStars.forEach((s, idx) => {
      const isUnlocked = idx < unlockedCount || finaleReached;
      const isCurrent = idx === activeIndex;
      const dot = el(
        'button',
        `gl-star-dot${isCurrent ? ' gl-star-dot-active' : ''}`,
      );
      dot.type = 'button';
      dot.disabled = !isUnlocked;
      const hex = GLOW_COLORS[resolveStarGlowHex(s, payload.globalGlowColor)].hex;
      dot.style.color = isUnlocked ? hex : '#94a3b8';
      if (isCurrent) {
        dot.style.filter = `drop-shadow(0 0 8px ${hex})`;
        dot.setAttribute('aria-current', 'step');
      }
      dot.title = isUnlocked
        ? s.title || `Звезда ${idx + 1}`
        : `Звезда ${idx + 1} ещё не открыта`;
      dot.setAttribute(
        'aria-label',
        isUnlocked
          ? `Открыть звезду ${idx + 1}: ${s.title || ''}`
          : `Звезда ${idx + 1} закрыта`,
      );
      dot.appendChild(createProgressStarSvg(isUnlocked, isCurrent));
      if (isUnlocked) {
        dot.addEventListener('click', () => {
          navigateStory({ type: 'index', index: idx });
        });
      }
      dotsContainer.appendChild(dot);
    });

    illuGlow.style.background = `radial-gradient(circle, ${glow.hex}3a 0%, transparent 70%)`;
    illuImg.src = star.assetImagePath;
    illuImg.alt = star.title;

    if (hasExplicitCardTheme && isMinimalistTheme) {
      storyOrd.className = 'gl-story-ord gl-minimal-kicker';
      storyOrd.style.fontFamily = sansFontMeta.cssFamily;
      storyOrd.textContent = `Звезда ${String(activeIndex + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
    } else {
      storyOrd.className = 'gl-story-ord';
      storyOrd.style.fontFamily = '';
      storyOrd.textContent = `Звезда ${activeIndex + 1} из ${total}`;
    }
    storyOrd.style.color = cardColors.isLightPaper ? cardColors.badgeColor : glow.coreHex;
    storyTitle.textContent = star.title || `Звезда ${activeIndex + 1}`;
    storyMsg.textContent = star.message || 'Здесь хранится особое тёплое пожелание.';
    applyStoryTextFormatting();

    prevArrowBtn.disabled = activeIndex <= 0;
    backToConstBtn.classList.toggle('gl-hidden', !finaleReached);

    const isLast = activeIndex >= total - 1;
    nextArrowBtn.textContent = isLast ? '✦' : '›';
    nextArrowBtn.classList.toggle('gl-nav-arrow-finale', isLast);
    nextArrowBtn.setAttribute(
      'aria-label',
      isLast ? 'Завершить и зажечь созвездие' : 'Следующая звезда',
    );
    swipeHint.classList.toggle('gl-swipe-hint-finale', isLast);
    swipeHintText.textContent = isLast
      ? 'Свайп влево завершит создание созвездия'
      : 'Свайп влево — следующая звезда';

    storyUi.classList.remove('gl-story-anim');
    void storyUi.offsetWidth;
    storyUi.classList.add('gl-story-anim');
  }

  function updateEngine(): void {
    const activeStar = normalizedStars[activeIndex];
    const activeId =
      phase === 'starStory' || phase === 'birthing' ? activeStar?.id ?? null : null;
    const activeDevice = getActiveDevice();

    engine?.updateState({
      paletteId: payload.paletteId,
      globalGlowColor: payload.globalGlowColor,
      envelopeSettings: payload.envelopeSettings,
      stars: normalizedStars,
      connections: resolvedConnections,
      selectedStarId: activeId,
      visitedStarIds: normalizedStars
        .slice(0, Math.max(0, unlockedCount))
        .map((s) => s.id),
      interactionMode: 'recipient',
      recipientPhase: phase,
      unlockedCount,
      finaleActive: phase === 'finalReveal' || phase === 'constellation' || finaleReached,
      deviceMode: activeDevice,
      constellationLayout: resolveEffectiveConstellationLayout(payload, activeDevice),
      constellationAnimation: payload.constellationAnimation ?? 'rotation',
      lowPerformance: window.innerWidth < 768,
      reducedMotion,
    });
  }

  function setPhase(next: RecipientPhase): void {
    phase = next;
    sealedUi.classList.toggle('gl-hidden', next !== 'sealed');
    sealed2DOverlay.classList.toggle('gl-hidden', !(next === 'sealed' && using2DFallback));
    transUi.classList.toggle('gl-hidden', next !== 'birthing' && next !== 'finalReveal');
    storyUi.classList.toggle('gl-hidden', next !== 'starStory');
    constellationTitleWrap.classList.toggle('gl-hidden', next !== 'constellation');
    constellationLetterBtn.classList.toggle('gl-hidden', next !== 'constellation');
    quickLetterOpen = false;
    if (next === 'constellation') {
      setLetterOpen(true);
    } else {
      setLetterOpen(false);
    }

    if (next === 'starStory') {
      renderStoryUI();
    }
    syncSoundLabels();
    updateEngine();
    if (using2DFallback) refresh2DFallback();
  }

  function handleOpenEnvelope(): void {
    if (phase !== 'sealed' || isTransitionLocked) return;
    attemptPlayMusic();
    unlockedCount = 1;
    activeIndex = 0;

    if (using2DFallback || reducedMotion) {
      engine?.skipBirthSequence();
      acquireLock(90);
      setPhase('starStory');
      return;
    }

    setPhase('birthing');
    engine?.playBirthSequence();
  }

  function handleTriggerFinalReveal(): void {
    unlockedCount = normalizedStars.length;
    if (using2DFallback || reducedMotion) {
      engine?.skipFinalReveal();
      finaleReached = true;
      acquireLock(100);
      setPhase('constellation');
      return;
    }
    releaseLock();
    setPhase('finalReveal');
    engine?.playFinalReveal();
  }

  /**
   * Unified transition handler for swipes, arrows, star progress buttons, 3D star clicks, and keyboard.
   */
  function navigateStory(intent: StoryIntent): void {
    const total = normalizedStars.length;
    if (total === 0) return;
    if (isTransitionLocked) return;
    if (phase === 'sealed' || phase === 'birthing' || phase === 'finalReveal') return;

    const instant = reducedMotion || using2DFallback;
    const lockMs = instant ? 90 : 460;

    if (intent.type === 'constellation') {
      if (!finaleReached || phase === 'constellation') return;
      acquireLock(lockMs);
      setPhase('constellation');
      return;
    }

    if (phase === 'constellation') {
      if (intent.type !== 'index') return;
      if (intent.index < 0 || intent.index >= total) return;
      acquireLock(lockMs);
      activeIndex = intent.index;
      setPhase('starStory');
      return;
    }

    // phase === 'starStory'
    if (intent.type === 'next') {
      if (activeIndex >= total - 1) {
        handleTriggerFinalReveal();
        return;
      }
      const nextIdx = activeIndex + 1;
      const nextStar = normalizedStars[nextIdx];
      const isBrandNew = nextIdx >= unlockedCount;

      acquireLock(lockMs);
      if (isBrandNew) unlockedCount = nextIdx + 1;
      activeIndex = nextIdx;

      renderStoryUI();
      updateEngine();
      if (using2DFallback) refresh2DFallback();

      if (isBrandNew && nextStar && !instant) {
        engine?.triggerStarBirth(nextStar.id);
      }
      return;
    }

    if (intent.type === 'prev') {
      if (activeIndex <= 0) return;
      acquireLock(lockMs);
      activeIndex -= 1;
      renderStoryUI();
      updateEngine();
      if (using2DFallback) refresh2DFallback();
      return;
    }

    if (intent.type === 'index') {
      if (intent.index < 0 || intent.index >= total) return;
      if (intent.index >= unlockedCount && !finaleReached) return;
      if (intent.index === activeIndex) return;

      acquireLock(lockMs);
      activeIndex = intent.index;
      renderStoryUI();
      updateEngine();
      if (using2DFallback) refresh2DFallback();
    }
  }

  openBtn.addEventListener('click', handleOpenEnvelope);

  skipBtn.addEventListener('click', () => {
    releaseLock();
    if (phase === 'birthing') {
      engine?.skipBirthSequence();
      unlockedCount = Math.max(1, unlockedCount);
      activeIndex = 0;
      setPhase('starStory');
    } else if (phase === 'finalReveal') {
      engine?.skipFinalReveal();
      finaleReached = true;
      setPhase('constellation');
    }
  });

  prevArrowBtn.addEventListener('click', () => navigateStory({ type: 'prev' }));
  nextArrowBtn.addEventListener('click', () => navigateStory({ type: 'next' }));
  backToConstBtn.addEventListener('click', () => navigateStory({ type: 'constellation' }));

  // Pointer Events swipe handler on story content container ONLY (independent of 3D canvas OrbitControls)
  let swipeActive = false;
  let swipePointerId: number | null = null;
  let swipeStartX = 0;
  let swipeStartY = 0;
  let swipeHasHorizontalIntent = false;

  function resetSwipe(): void {
    swipeActive = false;
    swipePointerId = null;
    swipeHasHorizontalIntent = false;
    storyMotionWrap.style.transform = '';
  }

  storyRight.addEventListener('pointerdown', (e) => {
    if (phase !== 'starStory' || isTransitionLocked) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    if (swipeActive && swipePointerId !== e.pointerId) {
      resetSwipe();
      return;
    }
    if (shouldIgnoreSwipeTarget(e.target, e.pointerType)) return;
    if (hasActiveTextSelection()) return;

    swipeActive = true;
    swipePointerId = e.pointerId;
    swipeStartX = e.clientX;
    swipeStartY = e.clientY;
    swipeHasHorizontalIntent = false;
  });

  storyRight.addEventListener('pointermove', (e) => {
    if (!swipeActive || swipePointerId !== e.pointerId) return;
    if (isTransitionLocked || hasActiveTextSelection()) {
      resetSwipe();
      return;
    }

    const dx = e.clientX - swipeStartX;
    const dy = e.clientY - swipeStartY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (!swipeHasHorizontalIntent && absY > 20 && absY >= absX * 1.05) {
      resetSwipe();
      return;
    }

    if (!swipeHasHorizontalIntent && absX > 16 && absX > absY * SWIPE_HORIZONTAL_RATIO) {
      swipeHasHorizontalIntent = true;
    }

    if (swipeHasHorizontalIntent && !reducedMotion) {
      const clamped = Math.max(-26, Math.min(26, dx * 0.24));
      storyMotionWrap.style.transform = `translate3d(${clamped}px, 0, 0)`;
    }
  });

  storyRight.addEventListener('pointerup', (e) => {
    if (!swipeActive || swipePointerId !== e.pointerId) return;

    const dx = e.clientX - swipeStartX;
    const dy = e.clientY - swipeStartY;
    resetSwipe();

    if (isTransitionLocked || hasActiveTextSelection()) return;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (absX >= SWIPE_MIN_DISTANCE_PX && absX > absY * SWIPE_HORIZONTAL_RATIO) {
      if (dx < 0) {
        navigateStory({ type: 'next' });
      } else {
        navigateStory({ type: 'prev' });
      }
    }
  });

  storyRight.addEventListener('pointercancel', resetSwipe);
  storyRight.addEventListener('lostpointercapture', resetSwipe);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (phase === 'starStory' && quickLetterOpen) {
        setQuickLetterOpen(false);
        return;
      }
      if (phase === 'constellation' && letterOpen) {
        setLetterOpen(false);
        return;
      }
    }
    if (phase !== 'starStory' || quickLetterOpen) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable)
    ) {
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      navigateStory({ type: 'next' });
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      navigateStory({ type: 'prev' });
    }
  });

  // Keyboard & gesture listeners only (clean recipient experience)

  function create2DShapeSvg(shape: StarShapeId, hex: string, coreHex: string, sizePx: number): SVGSVGElement {
    const ns = 'http://www.w3.org/2000/svg';
    const uid = String(++decorUidSeq);
    const bodyId = `gl-rt-cry-body-${uid}`;
    const glossId = `gl-rt-cry-gloss-${uid}`;
    const coreId = `gl-rt-cry-core-${uid}`;

    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 48 48');
    svg.setAttribute('width', String(sizePx));
    svg.setAttribute('height', String(sizePx));
    svg.setAttribute('fill', 'none');
    svg.style.filter = `drop-shadow(0 0 8px ${hex}88) drop-shadow(0 5px 10px rgba(0,0,0,0.45))`;

    const mk = (tag: string, attrs: Record<string, string>, parent: Element = svg) => {
      const node = document.createElementNS(ns, tag);
      for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
      parent.appendChild(node);
      return node;
    };

    const defs = mk('defs', {});
    const bodyGrad = mk('linearGradient', { id: bodyId, x1: '6', y1: '6', x2: '42', y2: '42', gradientUnits: 'userSpaceOnUse' }, defs);
    mk('stop', { offset: '0%', 'stop-color': '#a5f3fc', 'stop-opacity': '0.94' }, bodyGrad);
    mk('stop', { offset: '48%', 'stop-color': hex, 'stop-opacity': '0.86' }, bodyGrad);
    mk('stop', { offset: '100%', 'stop-color': '#d946ef', 'stop-opacity': '0.8' }, bodyGrad);

    const glossGrad = mk('linearGradient', { id: glossId, x1: '10', y1: '6', x2: '30', y2: '28', gradientUnits: 'userSpaceOnUse' }, defs);
    mk('stop', { offset: '0%', 'stop-color': '#ffffff', 'stop-opacity': '0.85' }, glossGrad);
    mk('stop', { offset: '100%', 'stop-color': '#ffffff', 'stop-opacity': '0' }, glossGrad);

    const coreGrad = mk('radialGradient', { id: coreId, cx: '50%', cy: '45%', r: '55%' }, defs);
    mk('stop', { offset: '0%', 'stop-color': '#ffffff', 'stop-opacity': '1' }, coreGrad);
    mk('stop', { offset: '48%', 'stop-color': coreHex, 'stop-opacity': '0.9' }, coreGrad);
    mk('stop', { offset: '100%', 'stop-color': hex, 'stop-opacity': '0' }, coreGrad);

    if (shape === 'heart') {
      mk('path', {
        d: 'M24 40C24 40 8 30 8 18.6C8 13.2 12.2 9 17.4 9C20.5 9 22.8 10.6 24 12.8C25.2 10.6 27.5 9 30.6 9C35.8 9 40 13.2 40 18.6C40 30 24 40 24 40Z',
        fill: `url(#${bodyId})`,
        stroke: 'rgba(255,255,255,0.84)',
        'stroke-width': '1.6',
        'stroke-linejoin': 'round',
      });
      mk('path', {
        d: 'M24 12.8C22.8 10.6 20.5 9 17.4 9C12.2 9 8 13.2 8 18.6C8 24.4 13.4 30.2 18.6 34.8L24 22.4V12.8Z',
        fill: `url(#${glossId})`,
      });
      mk('circle', { cx: '24', cy: '22', r: '6.8', fill: `url(#${coreId})` });
    } else if (shape === 'flower') {
      for (let d = 0; d < 360; d += 60) {
        const g = mk('g', { transform: `rotate(${d} 24 24)` });
        mk('polygon', {
          points: '24,4.5 29,12.5 24,20.5 19,12.5',
          fill: `url(#${bodyId})`,
          stroke: 'rgba(255,255,255,0.8)',
          'stroke-width': '1.3',
          'stroke-linejoin': 'round',
        }, g);
        mk('polygon', { points: '24,4.5 24,20.5 19,12.5', fill: `url(#${glossId})` }, g);
      }
      mk('circle', { cx: '24', cy: '24', r: '7.2', fill: `url(#${coreId})` });
      mk('circle', { cx: '24', cy: '24', r: '4', fill: '#ffffff', 'fill-opacity': '0.92' });
    } else if (shape === 'moon') {
      mk('path', {
        d: 'M30 8.5C20.5 9.2 13 16.9 13 26C13 35.1 20.6 42.3 30 42.3C33.5 42.3 36.8 41.2 39.5 39.2C32.3 39.1 26.4 33.4 26.4 25.6C26.4 18.2 31.3 12.1 38.2 10.8C35.7 9.2 32.9 8.3 30 8.5Z',
        fill: `url(#${bodyId})`,
        stroke: 'rgba(255,255,255,0.84)',
        'stroke-width': '1.6',
        'stroke-linejoin': 'round',
      });
      mk('path', {
        d: 'M30 8.5C20.5 9.2 13 16.9 13 26C13 30.8 15.2 35.1 18.7 38.1L22.5 25.5L30 8.5Z',
        fill: `url(#${glossId})`,
      });
      mk('polygon', {
        points: '35,14.5 36.4,18.2 40,19.5 36.4,20.8 35,24.5 33.6,20.8 30,19.5 33.6,18.2',
        fill: '#ffffff',
      });
    } else if (shape === 'comet') {
      mk('path', {
        d: 'M29 19L7.5 39.5M26.5 15L10.5 27.5M33 22L20.5 38',
        stroke: `url(#${bodyId})`,
        'stroke-width': '2.4',
        'stroke-linecap': 'round',
      });
      mk('polygon', {
        points: '32,7.5 40.5,16 32,24.5 23.5,16',
        fill: `url(#${bodyId})`,
        stroke: 'rgba(255,255,255,0.88)',
        'stroke-width': '1.5',
        'stroke-linejoin': 'round',
      });
      mk('polygon', { points: '32,7.5 32,16 23.5,16', fill: `url(#${glossId})` });
      mk('circle', { cx: '32', cy: '16', r: '5.5', fill: `url(#${coreId})` });
    } else if (shape === 'planet') {
      mk('circle', {
        cx: '24',
        cy: '24',
        r: '9.8',
        fill: `url(#${bodyId})`,
        stroke: 'rgba(255,255,255,0.84)',
        'stroke-width': '1.5',
      });
      mk('ellipse', {
        cx: '24',
        cy: '24',
        rx: '19',
        ry: '5.8',
        transform: 'rotate(-22 24 24)',
        stroke: 'rgba(255,255,255,0.9)',
        'stroke-width': '2',
      });
      mk('circle', { cx: '24', cy: '24', r: '5.2', fill: `url(#${coreId})` });
    } else if (shape === 'spark') {
      mk('polygon', {
        points: '24,4 29,19 44,24 29,29 24,44 19,29 4,24 19,19',
        fill: `url(#${bodyId})`,
        stroke: 'rgba(255,255,255,0.85)',
        'stroke-width': '1.5',
        'stroke-linejoin': 'round',
      });
      mk('polygon', { points: '24,4 24,24 4,24 19,19', fill: `url(#${glossId})` });
      mk('circle', { cx: '24', cy: '24', r: '6.8', fill: `url(#${coreId})` });
      mk('circle', { cx: '24', cy: '24', r: '2.5', fill: '#ffffff' });
    } else {
      mk('polygon', {
        points: '24,4.5 29.5,16.2 42.5,18 32.8,26.9 35.4,39.8 24,33.4 12.6,39.8 15.2,26.9 5.5,18 18.5,16.2',
        fill: `url(#${bodyId})`,
        stroke: 'rgba(255,255,255,0.84)',
        'stroke-width': '1.5',
        'stroke-linejoin': 'round',
      });
      mk('polygon', { points: '24,4.5 18.5,16.2 5.5,18 15.2,26.9 24,23.5', fill: `url(#${glossId})` });
      mk('path', {
        d: 'M24 5.5V33M18.5 16.5L24 23.5L29.5 16.5M6.5 18.2L24 23.5L41.5 18.2',
        stroke: 'rgba(255,255,255,0.44)',
        'stroke-width': '0.95',
        'stroke-linecap': 'round',
      });
      mk('circle', { cx: '24', cy: '23.5', r: '6.8', fill: `url(#${coreId})` });
      mk('circle', { cx: '24', cy: '23.5', r: '2.5', fill: '#ffffff' });
    }
    return svg;
  }

  // 2D fallback renderer if WebGL2 is unavailable
  let fallbackSvg: SVGSVGElement | null = null;
  const fallbackLines: Array<{
    from: StandaloneStar;
    to: StandaloneStar;
    line: SVGLineElement;
  }> = [];
  const fallbackButtons = new Map<string, { btn: HTMLButtonElement; label: HTMLSpanElement; iconWrap: HTMLSpanElement }>();

  const extentX = Math.max(
    5.2,
    ...normalizedStars.map((s) => Math.abs(s.position.x) * 1.12),
  );
  const extentY = Math.max(
    3.4,
    ...normalizedStars.map((s) => Math.abs(s.position.y) * 1.15),
  );

  function toPct(
    x: number,
    y: number,
    constLayout?: { offsetX: number; offsetY: number; scale: number },
  ): { left: number; top: number } {
    const scale = constLayout?.scale ?? 1;
    const shiftX = ((constLayout?.offsetX ?? 0) / 100) * 18;
    const shiftY = ((constLayout?.offsetY ?? 0) / 100) * 18;
    return {
      left: Math.max(10, Math.min(90, 50 + ((x * scale) / extentX) * 40 + shiftX)),
      top: Math.max(14, Math.min(86, 50 - ((y * scale) / extentY) * 38 + shiftY)),
    };
  }

  function mount2DFallback(): void {
    using2DFallback = true;
    canvasHost.innerHTML = '';
    canvasHost.style.background = palette.cssGradient;

    if (phase === 'sealed') {
      sealed2DOverlay.classList.remove('gl-hidden');
    }

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('class', 'gl-2d-lines');
    fallbackSvg = svg;

    const starMap = new Map(normalizedStars.map((s) => [s.id, s]));
    const constLayout = resolveEffectiveConstellationLayout(payload, getActiveDevice());
    fallbackLines.length = 0;
    for (const conn of resolvedConnections) {
      const fromStar = starMap.get(conn.from);
      const toStar = starMap.get(conn.to);
      if (!fromStar || !toStar) continue;
      const p1 = toPct(fromStar.position.x, fromStar.position.y, constLayout);
      const p2 = toPct(toStar.position.x, toStar.position.y, constLayout);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(p1.left));
      line.setAttribute('y1', String(p1.top));
      line.setAttribute('x2', String(p2.left));
      line.setAttribute('y2', String(p2.top));
      line.setAttribute('stroke', palette.lineTint);
      line.setAttribute('stroke-width', '0.45');
      line.setAttribute('stroke-opacity', '0.78');
      svg.appendChild(line);
      fallbackLines.push({ from: fromStar, to: toStar, line });
    }
    canvasHost.appendChild(svg);

    normalizedStars.forEach((star, idx) => {
      const p = toPct(star.position.x, star.position.y, constLayout);
      const glow = GLOW_COLORS[resolveStarGlowHex(star, payload.globalGlowColor)];
      const btn = el('button', 'gl-2d-star');
      btn.type = 'button';
      btn.style.left = `${p.left}%`;
      btn.style.top = `${p.top}%`;

      const iconWrap = el('span');
      iconWrap.style.filter = `drop-shadow(0 0 12px ${glow.hex})`;
      iconWrap.appendChild(
        create2DShapeSvg(resolveStarShape(star), glow.hex, glow.coreHex, 34),
      );
      const lbl = el('span', 'gl-2d-label', star.title);
      btn.append(iconWrap, lbl);
      btn.addEventListener('click', () => navigateStory({ type: 'index', index: idx }));
      canvasHost.appendChild(btn);
      fallbackButtons.set(star.id, { btn, label: lbl, iconWrap });
    });

    refresh2DFallback();
  }

  function refresh2DFallback(): void {
    if (!using2DFallback) return;
    const isStory = phase === 'starStory';
    const isPortrait = window.innerHeight > window.innerWidth || window.innerWidth < 540;
    const constLayout = resolveEffectiveConstellationLayout(payload, getActiveDevice());
    if (fallbackSvg) {
      fallbackSvg.style.display = phase === 'constellation' || phase === 'finalReveal' ? 'block' : 'none';
      for (const item of fallbackLines) {
        const p1 = toPct(item.from.position.x, item.from.position.y, constLayout);
        const p2 = toPct(item.to.position.x, item.to.position.y, constLayout);
        item.line.setAttribute('x1', String(p1.left));
        item.line.setAttribute('y1', String(p1.top));
        item.line.setAttribute('x2', String(p2.left));
        item.line.setAttribute('y2', String(p2.top));
      }
    }

    normalizedStars.forEach((star, idx) => {
      const slot = fallbackButtons.get(star.id);
      if (!slot) return;
      if (idx >= unlockedCount) {
        slot.btn.style.display = 'none';
        return;
      }
      slot.btn.style.display = 'flex';
      const isHero = isStory && idx === activeIndex;
      const p = isHero
        ? isPortrait
          ? { left: 50, top: 20 }
          : { left: 22, top: 50 }
        : toPct(star.position.x, star.position.y, constLayout);

      slot.btn.style.left = `${p.left}%`;
      slot.btn.style.top = `${p.top}%`;
      slot.btn.style.opacity = isStory && !isHero ? '0.52' : '1';
      slot.btn.style.transform = `translate(-50%, -50%) scale(${isHero ? 2.15 : 1})`;
      slot.label.style.display = isHero ? 'none' : 'block';
    });
  }

  const handleViewportUpdate = () => {
    applySealedComposition();
    if (phase === 'starStory') applyStoryTextFormatting();
    applyFinaleTextFormatting();
    updateEngine();
    if (using2DFallback) refresh2DFallback();
  };
  window.addEventListener('resize', handleViewportUpdate);
  window.addEventListener('orientationchange', handleViewportUpdate);

  engine = new ConstellationEngine(
    canvasHost,
    {
      paletteId: payload.paletteId,
      globalGlowColor: payload.globalGlowColor,
      envelopeSettings: payload.envelopeSettings,
      stars: normalizedStars,
      connections: resolvedConnections,
      selectedStarId: null,
      visitedStarIds: [],
      interactionMode: 'recipient',
      recipientPhase: 'sealed',
      unlockedCount: 0,
      finaleActive: false,
      deviceMode: getActiveDevice(),
      constellationLayout: resolveEffectiveConstellationLayout(payload, getActiveDevice()),
      constellationAnimation: payload.constellationAnimation ?? 'rotation',
      lowPerformance: window.innerWidth < 768,
      reducedMotion,
    },
    {
      onSelectStar: (id) => {
        const idx = normalizedStars.findIndex((s) => s.id === id);
        if (idx !== -1) navigateStory({ type: 'index', index: idx });
      },
      onOpenEnvelope: () => handleOpenEnvelope(),
      onBirthComplete: () => {
        releaseLock();
        unlockedCount = Math.max(1, unlockedCount);
        activeIndex = 0;
        setPhase('starStory');
      },
      onFinalRevealComplete: () => {
        releaseLock();
        finaleReached = true;
        setPhase('constellation');
      },
      onWebGLUnavailable: () => {
        engine = null;
        mount2DFallback();
      },
    },
    { startSealed: true },
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootGiftLabRecipient);
} else {
  bootGiftLabRecipient();
}
