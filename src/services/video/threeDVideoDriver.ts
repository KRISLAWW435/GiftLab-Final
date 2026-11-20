import { ConstellationEngine, type ConstellationSceneState } from '../../scene/ConstellationEngine';
import {
  resolveConstellationAnimation,
  resolveEffectiveConstellationLayout,
  sanitizeConnections,
} from '../../scene/paletteConfig';
import { hasWebGL2Support } from '../../scene/proceduralAssets';
import type { ConstellationProject } from '../../types/project';
import {
  drawConstellationFinaleOverlay,
  drawSealedOverlay,
  drawStoryOverlay,
} from './videoOverlays';
import {
  type DrawableImage,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
  type VideoTimeline,
  type VideoTimelineSegment,
  clamp,
  easeOutCubic,
} from './videoTimeline';

export class ThreeDVideoSceneDriver {
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

  public advanceSimulationOnly(
    timeline: VideoTimeline,
    timeSec: number,
    dt: number,
  ): void {
    let segIndex = timeline.segments.findIndex(
      (s, i) =>
        timeSec >= s.startSec &&
        (timeSec < s.endSec || i === timeline.segments.length - 1),
    );
    if (segIndex === -1) segIndex = timeline.segments.length - 1;

    while (this.activeSegmentIndex < segIndex) {
      this.activeSegmentIndex += 1;
      this.applySegmentTransition(timeline.segments[this.activeSegmentIndex]);
    }

    this.engine.stepSceneOnlyForExport(dt);
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

    drawVideoOverlayForTime(ctx, this.project, timeline, illustrations, timeSec, segIndex);
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

export function drawVideoOverlayForTime(
  ctx: CanvasRenderingContext2D,
  project: ConstellationProject,
  timeline: VideoTimeline,
  illustrations: Map<string, DrawableImage>,
  timeSec: number,
  explicitSegIndex?: number,
): void {
  let segIndex =
    typeof explicitSegIndex === 'number'
      ? explicitSegIndex
      : timeline.segments.findIndex(
          (s, i) =>
            timeSec >= s.startSec &&
            (timeSec < s.endSec || i === timeline.segments.length - 1),
        );
  if (segIndex === -1) segIndex = timeline.segments.length - 1;

  const seg = timeline.segments[segIndex];
  if (!seg) return;
  const localT = Math.max(0, timeSec - seg.startSec);

  if (seg.kind === 'sealed') {
    const fadeIn = easeOutCubic(localT / 0.45);
    drawSealedOverlay(ctx, project, fadeIn);
  } else if (seg.kind === 'birthing') {
    const fadeOut = 1 - clamp(localT / 0.28, 0, 1);
    drawSealedOverlay(ctx, project, fadeOut);
  } else if (seg.kind === 'star' && typeof seg.starIndex === 'number') {
    const star = project.stars[seg.starIndex];
    if (star) {
      drawStoryOverlay(
        ctx,
        project,
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
      project,
      localT,
      seg.durationSec,
      timeSec,
    );
  }
}
