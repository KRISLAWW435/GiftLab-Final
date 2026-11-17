import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  ConstellationEngine,
  type ConstellationSceneState,
} from '../scene/ConstellationEngine';
import type {
  ConstellationAnimationId,
  ConstellationStar,
  CosmicPaletteId,
  DeviceConstellationLayout,
  DeviceLayoutKey,
  EditorInteractionMode,
  EnvelopeSettings,
  GlowColorId,
  RecipientPhase,
  StarConnection,
  StarPosition3D,
} from '../types/project';
import { Constellation2DFallback } from './Constellation2DFallback';

export interface Constellation3DHandle {
  resetCamera: () => void;
  restoreCameraAfterCard: () => void;
  focusStar: (starId: string) => void;
  playIntro: () => void;
  playBirthSequence: () => void;
  skipBirthSequence: () => void;
  triggerStarBirth: (starId: string) => void;
  playFinalReveal: () => void;
  skipFinalReveal: () => void;
}

interface Constellation3DProps {
  paletteId: CosmicPaletteId;
  globalGlowColor: GlowColorId;
  stars: ConstellationStar[];
  connections?: StarConnection[];
  selectedStarId: string | null;
  selectedConnectionId?: string | null;
  pendingLinkStarId?: string | null;
  visitedStarIds?: string[];
  interactionMode: EditorInteractionMode | 'recipient';
  recipientPhase?: RecipientPhase;
  unlockedCount?: number;
  finaleActive?: boolean;
  lowPerformance?: boolean;
  reducedMotion?: boolean;
  deviceMode?: DeviceLayoutKey;
  constellationLayout?: DeviceConstellationLayout;
  envelopeSettings?: EnvelopeSettings;
  constellationAnimation?: ConstellationAnimationId;
  force2DFallback?: boolean;
  playIntroOnMount?: boolean;
  startSealed?: boolean;
  onSelectStar?: (starId: string) => void;
  onSelectConnection?: (connectionId: string | null) => void;
  onMoveStar?: (starId: string, position: StarPosition3D) => void;
  onDragStar?: (starId: string, position: StarPosition3D, isDepthDrag: boolean) => void;
  onDragEnd?: () => void;
  onIntroComplete?: () => void;
  onBirthComplete?: () => void;
  onFinalRevealComplete?: () => void;
  onOpenEnvelope?: () => void;
  onCameraOrbit?: () => void;
  onWebGLFallback?: () => void;
}

export const Constellation3D = forwardRef<Constellation3DHandle, Constellation3DProps>(
  function Constellation3D(
    {
      paletteId,
      globalGlowColor,
      stars,
      connections,
      selectedStarId,
      selectedConnectionId = null,
      pendingLinkStarId = null,
      visitedStarIds = [],
      interactionMode,
      recipientPhase,
      unlockedCount,
      finaleActive = false,
      lowPerformance = false,
      reducedMotion = false,
      deviceMode,
      constellationLayout,
      envelopeSettings,
      constellationAnimation = 'rotation',
      force2DFallback = false,
      playIntroOnMount = false,
      startSealed = false,
      onSelectStar,
      onSelectConnection,
      onMoveStar,
      onDragStar,
      onDragEnd,
      onIntroComplete,
      onBirthComplete,
      onFinalRevealComplete,
      onOpenEnvelope,
      onCameraOrbit,
      onWebGLFallback,
    }: Constellation3DProps,
    ref,
  ) {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const engineRef = useRef<ConstellationEngine | null>(null);
    const [webglUnavailable, setWebglUnavailable] = useState(false);

    const callbacksRef = useRef({
      onSelectStar,
      onSelectConnection,
      onMoveStar,
      onDragStar,
      onDragEnd,
      onIntroComplete,
      onBirthComplete,
      onFinalRevealComplete,
      onOpenEnvelope,
      onCameraOrbit,
      onWebGLFallback,
    });
    callbacksRef.current = {
      onSelectStar,
      onSelectConnection,
      onMoveStar,
      onDragStar,
      onDragEnd,
      onIntroComplete,
      onBirthComplete,
      onFinalRevealComplete,
      onOpenEnvelope,
      onCameraOrbit,
      onWebGLFallback,
    };

    const sceneState: ConstellationSceneState = {
      paletteId,
      globalGlowColor,
      stars,
      connections,
      selectedStarId,
      selectedConnectionId,
      pendingLinkStarId,
      visitedStarIds,
      interactionMode,
      recipientPhase,
      unlockedCount,
      finaleActive,
      lowPerformance,
      reducedMotion,
      deviceMode,
      constellationLayout,
      envelopeSettings,
      constellationAnimation,
    };

    const initialStateRef = useRef(sceneState);
    initialStateRef.current = sceneState;

    useImperativeHandle(
      ref,
      () => ({
        resetCamera: () => engineRef.current?.resetCamera(),
        restoreCameraAfterCard: () => engineRef.current?.restoreCameraAfterCard(),
        focusStar: (starId: string) => engineRef.current?.focusOnStar(starId),
        playIntro: () => engineRef.current?.playIntro(),
        playBirthSequence: () => engineRef.current?.playBirthSequence(),
        skipBirthSequence: () => engineRef.current?.skipBirthSequence(),
        triggerStarBirth: (starId: string) => engineRef.current?.triggerStarBirth(starId),
        playFinalReveal: () => engineRef.current?.playFinalReveal(),
        skipFinalReveal: () => engineRef.current?.skipFinalReveal(),
      }),
      [],
    );

    useEffect(() => {
      if (force2DFallback) return;
      const container = mountRef.current;
      if (!container) return;

      const engine = new ConstellationEngine(
        container,
        initialStateRef.current,
        {
          onSelectStar: (id) => callbacksRef.current.onSelectStar?.(id),
          onSelectConnection: (id) => callbacksRef.current.onSelectConnection?.(id),
          onMoveStar: (id, pos) => callbacksRef.current.onMoveStar?.(id, pos),
          onDragStar: (id, pos, isDepth) => callbacksRef.current.onDragStar?.(id, pos, isDepth),
          onDragEnd: () => callbacksRef.current.onDragEnd?.(),
          onIntroComplete: () => callbacksRef.current.onIntroComplete?.(),
          onBirthComplete: () => callbacksRef.current.onBirthComplete?.(),
          onFinalRevealComplete: () => callbacksRef.current.onFinalRevealComplete?.(),
          onOpenEnvelope: () => callbacksRef.current.onOpenEnvelope?.(),
          onCameraOrbit: () => callbacksRef.current.onCameraOrbit?.(),
          onWebGLUnavailable: () => {
            setWebglUnavailable(true);
            callbacksRef.current.onWebGLFallback?.();
          },
        },
        { playIntroOnStart: playIntroOnMount, startSealed },
      );
      engineRef.current = engine;

      return () => {
        engine.dispose();
        engineRef.current = null;
      };
      // Mount once per 3D/2D mode toggle so React UI updates never rebuild WebGL
    }, [force2DFallback, playIntroOnMount, startSealed]);

    useEffect(() => {
      engineRef.current?.updateState(sceneState);
    });

    if (force2DFallback || webglUnavailable) {
      return (
        <Constellation2DFallback
          paletteId={paletteId}
          globalGlowColor={globalGlowColor}
          stars={stars}
          connections={connections}
          selectedStarId={selectedStarId}
          selectedConnectionId={selectedConnectionId}
          pendingLinkStarId={pendingLinkStarId}
          visitedStarIds={visitedStarIds}
          interactionMode={interactionMode}
          recipientPhase={recipientPhase}
          unlockedCount={unlockedCount}
          finaleActive={finaleActive}
          reducedMotion={reducedMotion}
          constellationLayout={constellationLayout}
          constellationAnimation={constellationAnimation}
          onSelectStar={onSelectStar}
          onSelectConnection={onSelectConnection}
          onMoveStar={onMoveStar}
        />
      );
    }

    return (
      <div className="relative w-full h-full overflow-hidden select-none">
        <div
          ref={mountRef}
          className="relative w-full h-full overflow-hidden select-none"
          aria-label="Трёхмерное созвездие"
        />
        <div
          className="pointer-events-none absolute inset-0 z-[1] gl-scene-edge-blend"
          aria-hidden="true"
        />
      </div>
    );
  },
);
