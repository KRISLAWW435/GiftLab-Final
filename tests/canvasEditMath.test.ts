import { describe, expect, test } from 'bun:test';
import {
  CANVAS_EDIT_TARGET_MAP,
  computeCanvasEditPatch,
  resolveCanvasDragOrigin,
} from '../src/hooks/canvasEditMath';
import {
  DEFAULT_STAR_TEXT_STYLE,
  createNewProject,
  resolveEffectiveCardLayout,
  resolveEffectiveConstellationLayout,
  resolveEffectiveIllustrationLayout,
  resolveEffectiveStarTextStyle,
} from '../src/scene/paletteConfig';

describe('canvasEditMath', () => {
  test('resolveCanvasDragOrigin returns expected origin snapshot for each element group', () => {
    const originSnap = {
      starTextStyle: { ...DEFAULT_STAR_TEXT_STYLE, offsetX: 12, offsetY: -18, widthPct: 72, fontSize: 19 },
      finalTextStyle: { ...DEFAULT_STAR_TEXT_STYLE, offsetX: -5, offsetY: 14, widthPct: 80, fontSize: 21 },
      cardLayout: { padding: 'normal' as const, verticalAlign: 'center' as const, width: 'standard' as const, offsetY: 22, scale: 1.1 },
      illuLayout: { offsetX: -40, offsetY: 15, scale: 1.25 },
      constellationLayout: { offsetX: 8, offsetY: -12, scale: 0.9 },
      envelopeOffsetY: 30,
      envelopeTextOffsetY: -20,
      envelopeFooterOffsetY: -15,
      envelopeUserScale: 1.15,
    };

    expect(resolveCanvasDragOrigin('text-move', originSnap)).toEqual({
      originX: 12,
      originY: -18,
      originValue: 72,
      originFontSize: 19,
    });
    expect(resolveCanvasDragOrigin('card-resize-se', originSnap)).toEqual({
      originX: 0,
      originY: 0,
      originValue: 1.1,
    });
    expect(resolveCanvasDragOrigin('illu-move', originSnap)).toEqual({
      originX: -40,
      originY: 15,
      originValue: 1.25,
    });
    expect(resolveCanvasDragOrigin('constellation-move', originSnap)).toEqual({
      originX: 8,
      originY: -12,
      originValue: 0.9,
    });
    expect(resolveCanvasDragOrigin('envelope-footer-move', originSnap)).toEqual({
      originX: 0,
      originY: -15,
      originValue: 1,
    });
    expect(resolveCanvasDragOrigin('envelope-resize-nw', originSnap)).toEqual({
      originX: 0,
      originY: 0,
      originValue: 1.15,
    });
    expect(resolveCanvasDragOrigin('final-text-move', originSnap)).toEqual({
      originX: -5,
      originY: 14,
      originValue: 80,
      originFontSize: 21,
    });
  });

  test('CANVAS_EDIT_TARGET_MAP maps all kinds to valid EditableCardTarget values', () => {
    expect(CANVAS_EDIT_TARGET_MAP['story-card-move']).toBe('card');
    expect(CANVAS_EDIT_TARGET_MAP['envelope-text-move']).toBe('envelope');
    expect(CANVAS_EDIT_TARGET_MAP['envelope-footer-move']).toBe('envelope');
    expect(CANVAS_EDIT_TARGET_MAP['final-text-resize-se']).toBe('text');
    expect(CANVAS_EDIT_TARGET_MAP['illu-scale']).toBe('illustration');
    expect(CANVAS_EDIT_TARGET_MAP['constellation-move']).toBe('constellation');
  });

  test('computeCanvasEditPatch updates and clamps star text width & position', () => {
    const project = createNewProject('birthday');
    const star = project.stars[0];

    const moveRes = computeCanvasEditPatch(
      {
        kind: 'text-move',
        startX: 100,
        startY: 100,
        containerW: 400,
        containerH: 400,
        originX: 0,
        originY: 0,
        originValue: 100,
        starId: star.id,
      },
      170,
      140,
      { project, activeDevice: 'desktop', isPortrait: false, activeStar: star },
    );

    expect(moveRes?.target).toBe('star');
    if (moveRes?.target === 'star') {
      const merged = { ...star, ...moveRes.patch };
      const text = resolveEffectiveStarTextStyle(merged, 'desktop');
      expect(text.widthPct).toBe(84); // auto-narrows full-width blocks when dragged horizontally
      expect(text.offsetX).toBeGreaterThan(0);
      expect(text.offsetY).toBeGreaterThan(0);
    }

    const resizeRes = computeCanvasEditPatch(
      {
        kind: 'text-resize-right',
        startX: 0,
        startY: 0,
        containerW: 400,
        containerH: 400,
        originX: 0,
        originY: 0,
        originValue: 80,
        starId: star.id,
      },
      -300,
      0,
      { project, activeDevice: 'desktop', isPortrait: false, activeStar: star },
    );
    if (resizeRes?.target === 'star') {
      const text = resolveEffectiveStarTextStyle({ ...star, ...resizeRes.patch }, 'desktop');
      expect(text.widthPct).toBe(38); // clamped floor
    }
  });

  test('computeCanvasEditPatch clamps card scale, envelope offset, constellation, and illustration', () => {
    const project = createNewProject('birthday');
    const star = project.stars[0];

    const cardScaleRes = computeCanvasEditPatch(
      {
        kind: 'final-card-resize-se',
        startX: 100,
        startY: 100,
        containerW: 400,
        containerH: 400,
        originX: 0,
        originY: 0,
        originValue: 1,
      },
      600,
      600,
      { project, activeDevice: 'phone', isPortrait: true, activeStar: star },
    );
    expect(cardScaleRes?.target).toBe('project');
    if (cardScaleRes?.target === 'project') {
      expect(resolveEffectiveCardLayout({ ...project, ...cardScaleRes.patch }, 'phone').scale).toBe(1.25);
    }

    const constellationRes = computeCanvasEditPatch(
      {
        kind: 'constellation-move',
        startX: 200,
        startY: 200,
        containerW: 500,
        containerH: 500,
        originX: 0,
        originY: 0,
        originValue: 1,
      },
      250,
      150,
      { project, activeDevice: 'desktop', isPortrait: false, activeStar: star },
    );
    if (constellationRes?.target === 'project') {
      const layout = resolveEffectiveConstellationLayout(
        { ...project, ...constellationRes.patch },
        'desktop',
      );
      expect(layout.offsetX).toBeGreaterThan(0);
      expect(layout.offsetY).toBeGreaterThan(0); // negative screen dy -> positive 3D Y
    }

    const illuRes = computeCanvasEditPatch(
      {
        kind: 'illu-scale',
        startX: 100,
        startY: 100,
        containerW: 400,
        containerH: 400,
        originX: 0,
        originY: 0,
        originValue: 1,
        starId: star.id,
      },
      500,
      500,
      { project, activeDevice: 'desktop', isPortrait: false, activeStar: star },
    );
    if (illuRes?.target === 'star') {
      expect(
        resolveEffectiveIllustrationLayout({ ...star, ...illuRes.patch }, 'desktop').scale,
      ).toBe(1.45);
    }

    const envRes = computeCanvasEditPatch(
      {
        kind: 'envelope-move',
        startX: 100,
        startY: 100,
        containerW: 400,
        containerH: 600,
        originX: 0,
        originY: 0,
        originValue: 1,
      },
      100,
      500,
      { project, activeDevice: 'phone', isPortrait: true, activeStar: star },
    );
    expect(envRes?.target).toBe('project');
    if (envRes?.target === 'project') {
      expect(envRes.patch.envelopeSettings?.phoneOffsetY).toBe(100);
    }

    const envFooterRes = computeCanvasEditPatch(
      {
        kind: 'envelope-footer-move',
        startX: 100,
        startY: 500,
        containerW: 400,
        containerH: 600,
        originX: 0,
        originY: 0,
        originValue: 1,
      },
      100,
      200,
      { project, activeDevice: 'phone', isPortrait: true, activeStar: star },
    );
    expect(envFooterRes?.target).toBe('project');
    if (envFooterRes?.target === 'project') {
      expect(envFooterRes.patch.envelopeSettings?.phoneFooterOffsetY).toBe(-100);
    }
  });

  test('computeCanvasEditPatch returns null for star-scoped edits when starId is missing', () => {
    const project = createNewProject('birthday');
    const res = computeCanvasEditPatch(
      {
        kind: 'text-move',
        startX: 0,
        startY: 0,
        containerW: 400,
        containerH: 400,
        originX: 0,
        originY: 0,
        originValue: 100,
      },
      50,
      50,
      { project, activeDevice: 'desktop', isPortrait: false, activeStar: null },
    );
    expect(res).toBeNull();
  });
});
