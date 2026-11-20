import type { EditableCardTarget } from '../preview/previewProtocol';
import type {
  CanvasEditDragKind,
  CanvasEditDragState,
} from '../components/recipient/recipientTypes';
import {
  ENVELOPE_FOOTER_OFFSET_MAX,
  ENVELOPE_FOOTER_OFFSET_MIN,
  ENVELOPE_MAX_SCALE,
  ENVELOPE_MIN_SCALE,
  ENVELOPE_OFFSET_MAX,
  ENVELOPE_OFFSET_MIN,
  ENVELOPE_TEXT_OFFSET_MAX,
  ENVELOPE_TEXT_OFFSET_MIN,
  buildProjectCardDevicePatch,
  buildProjectConstellationDevicePatch,
  buildProjectFinalTextDevicePatch,
  buildStarIllustrationDevicePatch,
  buildStarTextDevicePatch,
} from '../scene/paletteConfig';
import type {
  ConstellationProject,
  ConstellationStar,
  DeviceCardLayout,
  DeviceConstellationLayout,
  DeviceLayoutKey,
  StarIllustrationLayout,
  StarTextStyle,
} from '../types/project';

export const CANVAS_EDIT_TARGET_MAP: Record<CanvasEditDragKind, EditableCardTarget> = {
  'text-move': 'text',
  'text-resize-right': 'text',
  'text-resize-left': 'text',
  'text-resize-nw': 'text',
  'text-resize-ne': 'text',
  'text-resize-sw': 'text',
  'text-resize-se': 'text',
  'card-resize-nw': 'card',
  'card-resize-ne': 'card',
  'card-resize-sw': 'card',
  'card-resize-se': 'card',
  'story-card-move': 'card',
  'illu-move': 'illustration',
  'illu-scale': 'illustration',
  'constellation-move': 'constellation',
  'envelope-move': 'envelope',
  'envelope-text-move': 'envelope',
  'envelope-footer-move': 'envelope',
  'envelope-resize-nw': 'envelope',
  'envelope-resize-ne': 'envelope',
  'envelope-resize-sw': 'envelope',
  'envelope-resize-se': 'envelope',
  'final-text-move': 'text',
  'final-text-resize-right': 'text',
  'final-text-resize-left': 'text',
  'final-text-resize-nw': 'text',
  'final-text-resize-ne': 'text',
  'final-text-resize-sw': 'text',
  'final-text-resize-se': 'text',
  'final-card-move': 'card',
  'final-card-resize-nw': 'card',
  'final-card-resize-ne': 'card',
  'final-card-resize-sw': 'card',
  'final-card-resize-se': 'card',
};

export interface CanvasDragOriginSnapshot {
  starTextStyle: StarTextStyle;
  finalTextStyle: StarTextStyle;
  cardLayout: DeviceCardLayout;
  illuLayout: StarIllustrationLayout;
  constellationLayout: DeviceConstellationLayout;
  envelopeOffsetY: number;
  envelopeTextOffsetY: number;
  envelopeFooterOffsetY: number;
  envelopeUserScale: number;
}

export function resolveCanvasDragOrigin(
  kind: CanvasEditDragKind,
  snap: CanvasDragOriginSnapshot,
): {
  originX: number;
  originY: number;
  originValue: number;
  originFontSize?: number;
} {
  if (
    kind === 'text-move' ||
    kind === 'text-resize-right' ||
    kind === 'text-resize-left' ||
    kind === 'text-resize-nw' ||
    kind === 'text-resize-ne' ||
    kind === 'text-resize-sw' ||
    kind === 'text-resize-se'
  ) {
    return {
      originX: snap.starTextStyle.offsetX,
      originY: snap.starTextStyle.offsetY,
      originValue: snap.starTextStyle.widthPct,
      originFontSize: snap.starTextStyle.fontSize,
    };
  }
  if (
    kind === 'final-card-resize-nw' ||
    kind === 'final-card-resize-ne' ||
    kind === 'final-card-resize-sw' ||
    kind === 'final-card-resize-se' ||
    kind === 'card-resize-nw' ||
    kind === 'card-resize-ne' ||
    kind === 'card-resize-sw' ||
    kind === 'card-resize-se'
  ) {
    return {
      originX: 0,
      originY: 0,
      originValue: snap.cardLayout.scale ?? 1,
    };
  }
  if (kind === 'story-card-move' || kind === 'final-card-move') {
    return {
      originX: 0,
      originY: snap.cardLayout.offsetY,
      originValue: snap.cardLayout.offsetY,
    };
  }
  if (kind === 'illu-move' || kind === 'illu-scale') {
    return {
      originX: snap.illuLayout.offsetX,
      originY: snap.illuLayout.offsetY,
      originValue: snap.illuLayout.scale,
    };
  }
  if (kind === 'constellation-move') {
    return {
      originX: snap.constellationLayout.offsetX,
      originY: snap.constellationLayout.offsetY,
      originValue: snap.constellationLayout.scale,
    };
  }
  if (kind === 'envelope-move') {
    return { originX: 0, originY: snap.envelopeOffsetY, originValue: 1 };
  }
  if (kind === 'envelope-text-move') {
    return { originX: 0, originY: snap.envelopeTextOffsetY, originValue: 1 };
  }
  if (kind === 'envelope-footer-move') {
    return { originX: 0, originY: snap.envelopeFooterOffsetY, originValue: 1 };
  }
  if (kind.startsWith('envelope-resize-')) {
    return { originX: 0, originY: 0, originValue: snap.envelopeUserScale };
  }
  if (
    kind === 'final-text-move' ||
    kind === 'final-text-resize-right' ||
    kind === 'final-text-resize-left' ||
    kind === 'final-text-resize-nw' ||
    kind === 'final-text-resize-ne' ||
    kind === 'final-text-resize-sw' ||
    kind === 'final-text-resize-se'
  ) {
    return {
      originX: snap.finalTextStyle.offsetX,
      originY: snap.finalTextStyle.offsetY,
      originValue: snap.finalTextStyle.widthPct,
      originFontSize: snap.finalTextStyle.fontSize,
    };
  }
  return { originX: 0, originY: 0, originValue: 1 };
}

export type CanvasEditPatchResult =
  | { target: 'project'; patch: Partial<ConstellationProject> }
  | { target: 'star'; starId: string; patch: Partial<ConstellationStar> };

export function computeCanvasEditPatch(
  drag: Pick<
    CanvasEditDragState,
    | 'kind'
    | 'startX'
    | 'startY'
    | 'containerW'
    | 'containerH'
    | 'originX'
    | 'originY'
    | 'originValue'
    | 'originFontSize'
    | 'starId'
  >,
  clientX: number,
  clientY: number,
  ctx: {
    project: ConstellationProject;
    activeDevice: DeviceLayoutKey;
    isPortrait: boolean;
    activeStar: ConstellationStar | null | undefined;
  },
): CanvasEditPatchResult | null {
  const { project, activeDevice, isPortrait, activeStar } = ctx;
  const dx = clientX - drag.startX;
  const dy = clientY - drag.startY;
  const kind = drag.kind;

  if (kind === 'constellation-move') {
    const dxNorm = Math.round((dx / Math.max(140, drag.containerW * 0.42)) * 100);
    const dyNorm = Math.round((-dy / Math.max(140, drag.containerH * 0.42)) * 100);
    return {
      target: 'project',
      patch: buildProjectConstellationDevicePatch(project, activeDevice, {
        offsetX: Math.max(-100, Math.min(100, drag.originX + dxNorm)),
        offsetY: Math.max(-100, Math.min(100, drag.originY + dyNorm)),
      }),
    };
  }

  if (kind === 'envelope-move') {
    const maxRangePx = Math.max(40, drag.containerH * (isPortrait ? 0.16 : 0.11));
    const dyNorm = Math.round((dy / maxRangePx) * 100);
    const nextOffsetY = Math.max(
      ENVELOPE_OFFSET_MIN,
      Math.min(ENVELOPE_OFFSET_MAX, drag.originY + dyNorm),
    );
    return {
      target: 'project',
      patch: {
        envelopeSettings: {
          ...project.envelopeSettings,
          [activeDevice === 'phone' ? 'phoneOffsetY' : 'desktopOffsetY']: nextOffsetY,
        },
      },
    };
  }

  if (kind === 'envelope-text-move') {
    const maxDownPx = Math.max(40, drag.containerH * (isPortrait ? 0.25 : 0.14));
    const dyNorm = Math.round((dy / maxDownPx) * 100);
    const nextTextOffsetY = Math.max(
      ENVELOPE_TEXT_OFFSET_MIN,
      Math.min(ENVELOPE_TEXT_OFFSET_MAX, drag.originY + dyNorm),
    );
    return {
      target: 'project',
      patch: {
        envelopeSettings: {
          ...project.envelopeSettings,
          [activeDevice === 'phone' ? 'phoneTextOffsetY' : 'desktopTextOffsetY']:
            nextTextOffsetY,
        },
      },
    };
  }

  if (kind === 'envelope-footer-move') {
    const maxUpPx = Math.max(40, drag.containerH * (isPortrait ? 0.25 : 0.16));
    const dyNorm = Math.round((dy / maxUpPx) * 100);
    const nextFooterOffsetY = Math.max(
      ENVELOPE_FOOTER_OFFSET_MIN,
      Math.min(ENVELOPE_FOOTER_OFFSET_MAX, drag.originY + dyNorm),
    );
    return {
      target: 'project',
      patch: {
        envelopeSettings: {
          ...project.envelopeSettings,
          [activeDevice === 'phone' ? 'phoneFooterOffsetY' : 'desktopFooterOffsetY']:
            nextFooterOffsetY,
        },
      },
    };
  }

  if (kind.startsWith('envelope-resize-')) {
    const signX = kind.endsWith('-ne') || kind.endsWith('-se') ? 1 : -1;
    const signY = kind.endsWith('-sw') || kind.endsWith('-se') ? 1 : -1;
    const halfW = Math.max(40, drag.containerW / 2);
    const halfH = Math.max(30, drag.containerH / 2);
    const ratioDelta = ((dx * signX) / halfW + (dy * signY) / halfH) / 2;
    const nextScale = Math.max(
      ENVELOPE_MIN_SCALE,
      Math.min(
        ENVELOPE_MAX_SCALE,
        Number((drag.originValue * (1 + ratioDelta)).toFixed(2)),
      ),
    );
    return {
      target: 'project',
      patch: {
        envelopeSettings: {
          ...project.envelopeSettings,
          [activeDevice === 'phone' ? 'phoneScale' : 'desktopScale']: nextScale,
        },
      },
    };
  }

  if (kind === 'final-card-move') {
    const nextY = Math.max(-60, Math.min(60, Math.round(drag.originY + dy / 1.4)));
    return {
      target: 'project',
      patch: buildProjectCardDevicePatch(project, activeDevice, { offsetY: nextY }),
    };
  }

  if (
    kind === 'final-card-resize-nw' ||
    kind === 'final-card-resize-ne' ||
    kind === 'final-card-resize-sw' ||
    kind === 'final-card-resize-se' ||
    kind === 'card-resize-nw' ||
    kind === 'card-resize-ne' ||
    kind === 'card-resize-sw' ||
    kind === 'card-resize-se'
  ) {
    const signX = kind.endsWith('-ne') || kind.endsWith('-se') ? 1 : -1;
    const signY = kind.endsWith('-sw') || kind.endsWith('-se') ? 1 : -1;
    const halfW = Math.max(80, drag.containerW / 2);
    const halfH = Math.max(80, drag.containerH / 2);
    const ratioDelta = ((dx * signX) / halfW + (dy * signY) / halfH) / 2;
    const nextScale = Math.max(
      0.55,
      Math.min(1.25, Number((drag.originValue * (1 + ratioDelta)).toFixed(2))),
    );
    return {
      target: 'project',
      patch: buildProjectCardDevicePatch(project, activeDevice, { scale: nextScale }),
    };
  }

  if (kind === 'story-card-move') {
    const nextY = Math.max(-60, Math.min(60, Math.round(drag.originY + dy / 0.7)));
    return {
      target: 'project',
      patch: buildProjectCardDevicePatch(project, activeDevice, { offsetY: nextY }),
    };
  }

  if (kind === 'final-text-move') {
    let nextWidth = drag.originValue;
    if (Math.abs(dx) > 6 && nextWidth > 90) {
      nextWidth = 84;
    }
    const dxNorm = Math.round((dx / Math.max(60, drag.containerW * 0.35)) * 100);
    const dyNorm = Math.round((dy / Math.max(50, drag.containerH * 0.25)) * 100);
    return {
      target: 'project',
      patch: buildProjectFinalTextDevicePatch(project, activeDevice, {
        widthPct: nextWidth,
        offsetX: Math.max(-100, Math.min(100, drag.originX + dxNorm)),
        offsetY: Math.max(-100, Math.min(100, drag.originY + dyNorm)),
      }),
    };
  }

  if (kind === 'final-text-resize-right' || kind === 'final-text-resize-left') {
    const signedDx = kind === 'final-text-resize-right' ? dx : -dx;
    const dWidthPct = Math.round((signedDx / drag.containerW) * 100);
    const nextWidth = Math.max(38, Math.min(100, drag.originValue + dWidthPct));
    return {
      target: 'project',
      patch: buildProjectFinalTextDevicePatch(project, activeDevice, {
        widthPct: nextWidth,
      }),
    };
  }

  if (
    kind === 'final-text-resize-nw' ||
    kind === 'final-text-resize-ne' ||
    kind === 'final-text-resize-sw' ||
    kind === 'final-text-resize-se'
  ) {
    const signX = kind.endsWith('-ne') || kind.endsWith('-se') ? 1 : -1;
    const signY = kind.endsWith('-sw') || kind.endsWith('-se') ? 1 : -1;
    const dWidthPct = Math.round(((dx * signX) / drag.containerW) * 100);
    const nextWidth = Math.max(38, Math.min(100, drag.originValue + dWidthPct));
    const dFont = Math.round((dy * signY) / 14);
    const nextFont = Math.max(12, Math.min(28, (drag.originFontSize ?? 17) + dFont));
    return {
      target: 'project',
      patch: buildProjectFinalTextDevicePatch(project, activeDevice, {
        widthPct: nextWidth,
        fontSize: nextFont,
      }),
    };
  }

  const starId = drag.starId;
  if (!starId) return null;
  const targetStar = project.stars.find((s) => s.id === starId) ?? activeStar;
  if (!targetStar) return null;

  if (kind === 'text-move') {
    let nextWidth = drag.originValue;
    if (Math.abs(dx) > 6 && nextWidth > 90) {
      nextWidth = 84;
    }
    const dxNorm = Math.round((dx / Math.max(60, drag.containerW * 0.35)) * 100);
    const dyNorm = Math.round((dy / Math.max(60, drag.containerH * 0.32)) * 100);
    return {
      target: 'star',
      starId,
      patch: buildStarTextDevicePatch(targetStar, activeDevice, {
        widthPct: nextWidth,
        offsetX: Math.max(-100, Math.min(100, drag.originX + dxNorm)),
        offsetY: Math.max(-100, Math.min(100, drag.originY + dyNorm)),
      }),
    };
  }

  if (kind === 'text-resize-right' || kind === 'text-resize-left') {
    const signedDx = kind === 'text-resize-right' ? dx : -dx;
    const dWidthPct = Math.round((signedDx / drag.containerW) * 100);
    const nextWidth = Math.max(38, Math.min(100, drag.originValue + dWidthPct));
    return {
      target: 'star',
      starId,
      patch: buildStarTextDevicePatch(targetStar, activeDevice, {
        widthPct: nextWidth,
      }),
    };
  }

  if (
    kind === 'text-resize-nw' ||
    kind === 'text-resize-ne' ||
    kind === 'text-resize-sw' ||
    kind === 'text-resize-se'
  ) {
    const signX = kind.endsWith('-ne') || kind.endsWith('-se') ? 1 : -1;
    const signY = kind.endsWith('-sw') || kind.endsWith('-se') ? 1 : -1;
    const dWidthPct = Math.round(((dx * signX) / drag.containerW) * 100);
    const nextWidth = Math.max(38, Math.min(100, drag.originValue + dWidthPct));
    const dFont = Math.round((dy * signY) / 14);
    const nextFont = Math.max(12, Math.min(28, (drag.originFontSize ?? 16) + dFont));
    return {
      target: 'star',
      starId,
      patch: buildStarTextDevicePatch(targetStar, activeDevice, {
        widthPct: nextWidth,
        fontSize: nextFont,
      }),
    };
  }

  if (kind === 'illu-move') {
    const dxNorm = Math.round((dx / Math.max(60, drag.containerW * 0.42)) * 100);
    const dyNorm = Math.round((dy / Math.max(60, drag.containerH * 0.34)) * 100);
    return {
      target: 'star',
      starId,
      patch: buildStarIllustrationDevicePatch(targetStar, activeDevice, {
        offsetX: Math.max(-100, Math.min(100, drag.originX + dxNorm)),
        offsetY: Math.max(-100, Math.min(100, drag.originY + dyNorm)),
      }),
    };
  }

  if (kind === 'illu-scale') {
    const delta = (dx + dy) / 140;
    const nextScale = Math.max(
      0.65,
      Math.min(1.45, Number((drag.originValue + delta).toFixed(2))),
    );
    return {
      target: 'star',
      starId,
      patch: buildStarIllustrationDevicePatch(targetStar, activeDevice, {
        scale: nextScale,
      }),
    };
  }

  return null;
}
