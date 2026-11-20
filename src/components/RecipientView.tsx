import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useCanvasEditGestures } from '../hooks/useCanvasEditGestures';
import { useFullscreen } from '../hooks/useFullscreen';
import type {
  EditableCardTarget,
  EditableTextField,
  PreviewJumpTarget,
} from '../preview/previewProtocol';
import {
  COSMIC_PALETTES,
  GLOW_COLORS,
  computeEnvelopeScreenGeometry,
  computeStoryCardPresentation,
  resolveEffectiveConstellationLayout,
  resolveEffectiveFinalTextStyle,
  resolveMusicTrackName,
  resolveViewportDeviceMode,
} from '../scene/paletteConfig';
import { resolveProjectMusicForPreview } from '../services/musicEngine';
import type {
  ConstellationProject,
  ConstellationStar,
  DeviceLayoutKey,
  RecipientPhase,
} from '../types/project';
import { Constellation3D, type Constellation3DHandle } from './Constellation3D';
import {
  RecipientBirthingPhase,
  RecipientConstellationPhase,
  RecipientFinalRevealPhase,
} from './recipient/RecipientFinalePhases';
import { RecipientSealedPhase } from './recipient/RecipientSealedPhase';
import { RecipientStoryPhase } from './recipient/RecipientStoryPhase';
import {
  INITIAL_SWIPE_STATE,
  SWIPE_HORIZONTAL_RATIO,
  SWIPE_MIN_DISTANCE_PX,
  type StoryNavigationIntent,
  type SwipeGestureState,
  hasActiveTextSelection,
  shouldIgnoreSwipeTarget,
} from './recipient/recipientTypes';

interface RecipientViewProps {
  project: ConstellationProject;
  deviceMode?: DeviceLayoutKey;
  onExitPreview?: () => void;
  editMode?: boolean;
  selectedTarget?: EditableCardTarget | null;
  jumpTo?: PreviewJumpTarget | null;
  onPhaseStateChange?: (phase: RecipientPhase, activeIndex: number) => void;
  onSelectTarget?: (target: EditableCardTarget | null, field?: EditableTextField) => void;
  onPatchStar?: (starId: string, patch: Partial<ConstellationStar>) => void;
  onPatchProject?: (patch: Partial<ConstellationProject>) => void;
}

export function RecipientView({
  project,
  deviceMode,
  onExitPreview,
  editMode = false,
  selectedTarget = null,
  jumpTo = null,
  onPhaseStateChange,
  onSelectTarget,
  onPatchStar,
  onPatchProject,
}: RecipientViewProps) {
  const sceneRef = useRef<Constellation3DHandle | null>(null);
  const storyStageRef = useRef<HTMLDivElement | null>(null);
  const storyRightRef = useRef<HTMLDivElement | null>(null);
  const finaleHeaderRef = useRef<HTMLElement | null>(null);
  const storyInlineInputRef = useRef<HTMLInputElement | null>(null);
  const storyInlineTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isInternalPreview =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('giftlabPreview') === '1';
  const {
    isFullscreen,
    notice: fullscreenNotice,
    dismissNotice: dismissFullscreenNotice,
    toggleFullscreen,
  } = useFullscreen({
    autoOnFirstInteraction: !editMode && !isInternalPreview,
  });

  const [phase, setPhase] = useState<RecipientPhase>('sealed');
  const [activeIndex, setActiveIndex] = useState(0);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [finaleReached, setFinaleReached] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);
  const [quickLetterOpen, setQuickLetterOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [activeInlineField, setActiveInlineField] = useState<EditableTextField | null>(null);

  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 720,
  }));

  // Synchronous state snapshot & lock refs to prevent stale closures and double transitions
  const stateRef = useRef({
    phase,
    activeIndex,
    unlockedCount,
    finaleReached,
    reducedMotion,
    webglUnavailable,
  });
  stateRef.current = {
    phase,
    activeIndex,
    unlockedCount,
    finaleReached,
    reducedMotion,
    webglUnavailable,
  };

  const navLockRef = useRef(false);
  const lockTimerRef = useRef<number | null>(null);
  const swipeRef = useRef<SwipeGestureState>({ ...INITIAL_SWIPE_STATE });

  // Audio playback state
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicMuted, setMusicMuted] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [volume] = useState(0.58);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const releaseTransitionLock = useCallback(() => {
    if (lockTimerRef.current !== null) {
      window.clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
    navLockRef.current = false;
    setIsTransitioning(false);
  }, []);

  const acquireTransitionLock = useCallback(
    (durationMs: number) => {
      if (lockTimerRef.current !== null) {
        window.clearTimeout(lockTimerRef.current);
      }
      navLockRef.current = true;
      setIsTransitioning(true);
      lockTimerRef.current = window.setTimeout(() => {
        lockTimerRef.current = null;
        navLockRef.current = false;
        setIsTransitioning(false);
      }, durationMs);
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (lockTimerRef.current !== null) {
        window.clearTimeout(lockTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const syncViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', syncViewport);
    window.addEventListener('orientationchange', syncViewport);
    return () => {
      window.removeEventListener('resize', syncViewport);
      window.removeEventListener('orientationchange', syncViewport);
    };
  }, []);

  useEffect(() => {
    onPhaseStateChange?.(phase, activeIndex);
  }, [phase, activeIndex, onPhaseStateChange]);

  const lastHandledJumpNonceRef = useRef<number>(0);
  useEffect(() => {
    if (!jumpTo || jumpTo.nonce === lastHandledJumpNonceRef.current) return;
    lastHandledJumpNonceRef.current = jumpTo.nonce;

    releaseTransitionLock();
    const total = Math.max(1, project.stars.length);

    if (jumpTo.phase === 'sealed') {
      stateRef.current.phase = 'sealed';
      stateRef.current.activeIndex = 0;
      stateRef.current.unlockedCount = 0;
      stateRef.current.finaleReached = false;
      setLetterOpen(false);
      setQuickLetterOpen(false);
      setPhase('sealed');
      setActiveIndex(0);
      setUnlockedCount(0);
      setFinaleReached(false);
      return;
    }

    if (jumpTo.phase === 'constellation') {
      sceneRef.current?.skipFinalReveal();
      stateRef.current.unlockedCount = total;
      stateRef.current.finaleReached = true;
      stateRef.current.phase = 'constellation';
      setUnlockedCount(total);
      setFinaleReached(true);
      setLetterOpen(true);
      setQuickLetterOpen(false);
      setPhase('constellation');
      return;
    }

    // jumpTo.phase === 'starStory'
    const targetIdx = Math.max(0, Math.min(total - 1, jumpTo.starIndex ?? 0));
    if (stateRef.current.phase === 'sealed' || stateRef.current.phase === 'birthing') {
      sceneRef.current?.skipBirthSequence();
    } else if (stateRef.current.phase === 'finalReveal') {
      sceneRef.current?.skipFinalReveal();
    }
    const nextUnlocked = Math.max(stateRef.current.unlockedCount, targetIdx + 1);
    stateRef.current.unlockedCount = nextUnlocked;
    stateRef.current.activeIndex = targetIdx;
    stateRef.current.phase = 'starStory';
    setLetterOpen(false);
    setQuickLetterOpen(false);
    setUnlockedCount(nextUnlocked);
    setActiveIndex(targetIdx);
    setPhase('starStory');
  }, [jumpTo, project.stars.length, releaseTransitionLock]);

  useEffect(() => {
    if (
      editMode &&
      !jumpTo &&
      lastHandledJumpNonceRef.current === 0 &&
      (stateRef.current.phase === 'sealed' || stateRef.current.phase === 'birthing')
    ) {
      releaseTransitionLock();
      sceneRef.current?.skipBirthSequence();
      const total = Math.max(1, project.stars.length);
      const nextUnlocked = Math.min(total, Math.max(1, stateRef.current.unlockedCount));
      stateRef.current.unlockedCount = nextUnlocked;
      stateRef.current.activeIndex = 0;
      stateRef.current.phase = 'starStory';
      setLetterOpen(false);
      setQuickLetterOpen(false);
      setUnlockedCount(nextUnlocked);
      setActiveIndex(0);
      setPhase('starStory');
    }
  }, [editMode, jumpTo, phase, project.stars.length, releaseTransitionLock]);

  useEffect(() => {
    setActiveInlineField(null);
  }, [editMode, phase, activeIndex]);

  useEffect(() => {
    if (!editMode || !activeInlineField) return;
    if (phase === 'starStory') {
      if (activeInlineField === 'starMessage') {
        const el = storyInlineTextareaRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }
      } else if (activeInlineField === 'starTitle' || activeInlineField === 'senderName') {
        const el = storyInlineInputRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }
      }
    } else if (phase === 'sealed') {
      const el = storyInlineInputRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    }
  }, [editMode, phase, activeInlineField]);

  useEffect(() => {
    if (project.musicTrackId === 'none') {
      audioRef.current?.pause();
      audioRef.current = null;
      return;
    }

    let cancelled = false;
    let activeAudio: HTMLAudioElement | null = null;
    let revokeUrl: string | null = null;

    void resolveProjectMusicForPreview(project).then((resolved) => {
      if (cancelled) {
        if (resolved?.revokeOnDispose) {
          URL.revokeObjectURL(resolved.url);
        }
        return;
      }
      if (!resolved) return;

      if (resolved.revokeOnDispose) {
        revokeUrl = resolved.url;
      }

      const audio = new Audio(resolved.url);
      audio.loop = true;
      audio.volume = musicMuted ? 0 : volume;
      activeAudio = audio;
      audioRef.current = audio;
    });

    return () => {
      cancelled = true;
      if (activeAudio) {
        activeAudio.pause();
        activeAudio.src = '';
      }
      if (revokeUrl) {
        URL.revokeObjectURL(revokeUrl);
      }
      if (audioRef.current === activeAudio) {
        audioRef.current = null;
      }
    };
  }, [project.musicTrackId, project.customMusicId]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = musicMuted ? 0 : volume;
    }
  }, [volume, musicMuted]);

  const attemptPlayMusic = () => {
    const audio = audioRef.current;
    if (!audio || project.musicTrackId === 'none') return;

    audio.volume = musicMuted ? 0 : volume;
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise
        .then(() => {
          setMusicPlaying(true);
          setAudioBlocked(false);
        })
        .catch(() => {
          setMusicPlaying(false);
          setAudioBlocked(true);
        });
    }
  };

  const toggleSound = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!musicPlaying || audioBlocked) {
      setMusicMuted(false);
      attemptPlayMusic();
      return;
    }

    setMusicMuted((m) => !m);
  };

  const enterStarStoryAtFirst = useCallback(() => {
    releaseTransitionLock();
    stateRef.current.unlockedCount = Math.max(1, stateRef.current.unlockedCount);
    stateRef.current.activeIndex = 0;
    stateRef.current.phase = 'starStory';
    setUnlockedCount((prev) => Math.max(1, prev));
    setActiveIndex(0);
    setPhase('starStory');
  }, [releaseTransitionLock]);

  const handleOpenEnvelope = () => {
    if (editMode) {
      onSelectTarget?.('envelope');
      return;
    }
    if (stateRef.current.phase !== 'sealed' || navLockRef.current) return;

    attemptPlayMusic();
    setLetterOpen(false);
    setQuickLetterOpen(false);
    stateRef.current.unlockedCount = 1;
    stateRef.current.activeIndex = 0;
    setUnlockedCount(1);
    setActiveIndex(0);

    if (stateRef.current.webglUnavailable || stateRef.current.reducedMotion) {
      sceneRef.current?.skipBirthSequence();
      stateRef.current.phase = 'starStory';
      setPhase('starStory');
      acquireTransitionLock(90);
      return;
    }

    stateRef.current.phase = 'birthing';
    setPhase('birthing');
    sceneRef.current?.playBirthSequence();
  };

  const handleSkipBirth = () => {
    sceneRef.current?.skipBirthSequence();
    enterStarStoryAtFirst();
  };

  const handleBirthComplete = () => {
    enterStarStoryAtFirst();
  };

  const handleTriggerFinalReveal = useCallback(() => {
    const total = project.stars.length;
    stateRef.current.unlockedCount = total;
    setUnlockedCount(total);
    setQuickLetterOpen(false);

    if (stateRef.current.webglUnavailable || stateRef.current.reducedMotion) {
      sceneRef.current?.skipFinalReveal();
      stateRef.current.finaleReached = true;
      stateRef.current.phase = 'constellation';
      setFinaleReached(true);
      setLetterOpen(true);
      setPhase('constellation');
      acquireTransitionLock(100);
      return;
    }

    releaseTransitionLock();
    stateRef.current.phase = 'finalReveal';
    setPhase('finalReveal');
    sceneRef.current?.playFinalReveal();
  }, [project.stars.length, acquireTransitionLock, releaseTransitionLock]);

  const handleSkipFinalReveal = () => {
    releaseTransitionLock();
    sceneRef.current?.skipFinalReveal();
    stateRef.current.finaleReached = true;
    stateRef.current.phase = 'constellation';
    setFinaleReached(true);
    setQuickLetterOpen(false);
    setLetterOpen(true);
    setPhase('constellation');
  };

  const handleFinalRevealComplete = () => {
    releaseTransitionLock();
    stateRef.current.finaleReached = true;
    stateRef.current.phase = 'constellation';
    setFinaleReached(true);
    setQuickLetterOpen(false);
    setLetterOpen(true);
    setPhase('constellation');
  };

  /**
   * Unified transition handler used by swipes, compact arrows, progress stars, 3D star picks, and keyboard.
   */
  const navigateStory = useCallback(
    (intent: StoryNavigationIntent) => {
      const snap = stateRef.current;
      const total = project.stars.length;
      if (total === 0) return;
      if (navLockRef.current) return;
      if (snap.phase === 'sealed' || snap.phase === 'birthing' || snap.phase === 'finalReveal') {
        return;
      }

      const instant = snap.reducedMotion || snap.webglUnavailable;
      const lockDuration = instant ? 90 : 460;

      if (intent.type === 'constellation') {
        if (!snap.finaleReached || snap.phase === 'constellation') return;
        acquireTransitionLock(lockDuration);
        stateRef.current.phase = 'constellation';
        setQuickLetterOpen(false);
        setLetterOpen(true);
        setPhase('constellation');
        return;
      }

      if (snap.phase === 'constellation') {
        if (intent.type !== 'index') return;
        if (intent.index < 0 || intent.index >= total) return;
        acquireTransitionLock(lockDuration);
        stateRef.current.activeIndex = intent.index;
        stateRef.current.phase = 'starStory';
        setLetterOpen(false);
        setQuickLetterOpen(false);
        setActiveIndex(intent.index);
        setPhase('starStory');
        return;
      }

      // Phase === 'starStory'
      if (intent.type === 'next') {
        if (snap.activeIndex >= total - 1) {
          handleTriggerFinalReveal();
          return;
        }
        const nextIdx = snap.activeIndex + 1;
        const nextStar = project.stars[nextIdx];
        const isBrandNew = nextIdx >= snap.unlockedCount;

        acquireTransitionLock(lockDuration);
        stateRef.current.activeIndex = nextIdx;
        if (isBrandNew) {
          stateRef.current.unlockedCount = nextIdx + 1;
          setUnlockedCount(nextIdx + 1);
          if (nextStar && !instant) {
            sceneRef.current?.triggerStarBirth(nextStar.id);
          }
        }
        setActiveIndex(nextIdx);
        return;
      }

      if (intent.type === 'prev') {
        if (snap.activeIndex <= 0) return;
        const prevIdx = snap.activeIndex - 1;
        acquireTransitionLock(lockDuration);
        stateRef.current.activeIndex = prevIdx;
        setActiveIndex(prevIdx);
        return;
      }

      if (intent.type === 'index') {
        if (intent.index < 0 || intent.index >= total) return;
        // Strictly block premature access to unopened stars
        if (intent.index >= snap.unlockedCount && !snap.finaleReached) return;
        if (intent.index === snap.activeIndex) return;

        acquireTransitionLock(lockDuration);
        stateRef.current.activeIndex = intent.index;
        setActiveIndex(intent.index);
      }
    },
    [project.stars, acquireTransitionLock, handleTriggerFinalReveal],
  );

  // Keyboard navigation in StarStory & Escape to dismiss letter overlay
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !editMode) {
        if (quickLetterOpen) {
          setQuickLetterOpen(false);
          return;
        }
        if (stateRef.current.phase === 'constellation' && letterOpen) {
          setLetterOpen(false);
          return;
        }
      }
      if (stateRef.current.phase !== 'starStory' || quickLetterOpen) return;
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
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigateStory, editMode, quickLetterOpen, letterOpen]);

  const handleSelectStarFromScene = (starId: string) => {
    const idx = project.stars.findIndex((s) => s.id === starId);
    if (idx === -1) return;
    navigateStory({ type: 'index', index: idx });
  };

  // Pointer Events Swipe Handling (exclusively on story content region, never 3D canvas)
  const resetSwipeGesture = useCallback(() => {
    swipeRef.current = { ...INITIAL_SWIPE_STATE };
    setDragOffsetX(0);
  }, []);

  const handleStoryPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (editMode) return;
    if (stateRef.current.phase !== 'starStory') return;
    if (navLockRef.current) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    if (swipeRef.current.active && swipeRef.current.pointerId !== e.pointerId) {
      resetSwipeGesture();
      return;
    }

    if (shouldIgnoreSwipeTarget(e.target, e.pointerType)) return;
    if (hasActiveTextSelection()) return;

    swipeRef.current = {
      active: true,
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      startX: e.clientX,
      startY: e.clientY,
      hasHorizontalIntent: false,
    };
  };

  const handleStoryPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const gesture = swipeRef.current;
    if (!gesture.active || gesture.pointerId !== e.pointerId) return;

    if (navLockRef.current || hasActiveTextSelection()) {
      resetSwipeGesture();
      return;
    }

    const dx = e.clientX - gesture.startX;
    const dy = e.clientY - gesture.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (!gesture.hasHorizontalIntent && absY > 20 && absY >= absX * 1.05) {
      resetSwipeGesture();
      return;
    }

    if (!gesture.hasHorizontalIntent && absX > 16 && absX > absY * SWIPE_HORIZONTAL_RATIO) {
      gesture.hasHorizontalIntent = true;
    }

    if (gesture.hasHorizontalIntent && !stateRef.current.reducedMotion) {
      const clamped = Math.max(-26, Math.min(26, dx * 0.24));
      setDragOffsetX(clamped);
    }
  };

  const handleStoryPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const gesture = swipeRef.current;
    if (!gesture.active || gesture.pointerId !== e.pointerId) return;

    const dx = e.clientX - gesture.startX;
    const dy = e.clientY - gesture.startY;
    resetSwipeGesture();

    if (navLockRef.current || hasActiveTextSelection()) return;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absX >= SWIPE_MIN_DISTANCE_PX && absX > absY * SWIPE_HORIZONTAL_RATIO) {
      if (dx < 0) {
        navigateStory({ type: 'next' });
      } else {
        navigateStory({ type: 'prev' });
      }
    }
  };

  const totalStars = project.stars.length;
  const activeStar = project.stars[activeIndex] ?? project.stars[0] ?? null;
  const activeStarId =
    phase === 'starStory' || phase === 'birthing'
      ? activeStar?.id ?? null
      : null;

  const unlockedStarIds = project.stars
    .slice(0, Math.max(0, unlockedCount))
    .map((s) => s.id);

  const palette = COSMIC_PALETTES[project.paletteId];
  const globalGlow = GLOW_COLORS[project.globalGlowColor];
  const trackDisplayName = resolveMusicTrackName(project);

  const isPortrait = viewport.height > viewport.width || viewport.width < 540;
  const isCompactLandscape = !isPortrait && viewport.height < 520;
  const activeDevice: DeviceLayoutKey =
    deviceMode ?? resolveViewportDeviceMode(viewport.width, viewport.height);

  const constellationLayout = resolveEffectiveConstellationLayout(project, activeDevice);
  const finalTextStyle = resolveEffectiveFinalTextStyle(project, activeDevice);

  const storyPresentation = computeStoryCardPresentation(project, activeStar, {
    device: activeDevice,
    viewportWidth: viewport.width,
    isPortrait,
    isCompactLandscape,
    editMode,
  });

  const envelopeGeom = computeEnvelopeScreenGeometry(
    project,
    viewport.width,
    viewport.height,
    activeDevice,
    isPortrait,
  );

  const { isDraggingCanvas, beginCanvasEdit, moveCanvasEdit, endCanvasEdit } =
    useCanvasEditGestures({
      editMode,
      project,
      activeDevice,
      isPortrait,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      activeStar,
      storyPresentation,
      envelopeGeom,
      constellationLayout,
      finalTextStyle,
      storyStageRef,
      finaleHeaderRef,
      onSelectTarget,
      onPatchStar,
      onPatchProject,
      onSetActiveInlineField: setActiveInlineField,
    });

  const dragHandlers = {
    beginCanvasEdit,
    moveCanvasEdit,
    endCanvasEdit,
  };

  const handleToggleFullscreen = () => {
    void toggleFullscreen();
  };

  return (
    <div
      data-testid="recipient-view-root"
      data-active-device={activeDevice}
      data-constellation-offset-x={constellationLayout.offsetX}
      data-constellation-offset-y={constellationLayout.offsetY}
      data-constellation-scale={constellationLayout.scale}
      className="relative w-screen gl-h-screen overflow-hidden bg-gl-bg text-gl-text"
    >
      {/* Unified 3D Cosmic Scene (single persistent WebGL context) */}
      <Constellation3D
        ref={sceneRef}
        paletteId={project.paletteId}
        globalGlowColor={project.globalGlowColor}
        stars={project.stars}
        connections={project.connections}
        selectedStarId={activeStarId}
        visitedStarIds={unlockedStarIds}
        interactionMode="recipient"
        recipientPhase={phase}
        unlockedCount={unlockedCount}
        finaleActive={phase === 'finalReveal' || phase === 'constellation' || finaleReached}
        lowPerformance={viewport.width < 768}
        reducedMotion={reducedMotion}
        deviceMode={activeDevice}
        constellationLayout={constellationLayout}
        envelopeSettings={project.envelopeSettings}
        constellationAnimation={project.constellationAnimation ?? 'rotation'}
        startSealed={true}
        onOpenEnvelope={handleOpenEnvelope}
        onBirthComplete={handleBirthComplete}
        onFinalRevealComplete={handleFinalRevealComplete}
        onSelectStar={handleSelectStarFromScene}
        onWebGLFallback={() => setWebglUnavailable(true)}
      />

      {phase === 'sealed' && (
        <RecipientSealedPhase
          project={project}
          palette={palette}
          globalGlow={globalGlow}
          envelopeGeom={envelopeGeom}
          webglUnavailable={webglUnavailable}
          editMode={editMode}
          selectedTarget={selectedTarget}
          activeInlineField={activeInlineField}
          storyInlineInputRef={storyInlineInputRef}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          onExitPreview={onExitPreview}
          onOpenEnvelope={handleOpenEnvelope}
          onSelectTarget={onSelectTarget}
          onPatchProject={onPatchProject}
          onSetInlineField={setActiveInlineField}
          {...dragHandlers}
        />
      )}

      {phase === 'birthing' && (
        <RecipientBirthingPhase
          project={project}
          editMode={editMode}
          musicMuted={musicMuted}
          musicPlaying={musicPlaying}
          audioBlocked={audioBlocked}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          onExitPreview={onExitPreview}
          onToggleSound={toggleSound}
          onAttemptPlayMusic={attemptPlayMusic}
          onSkipBirth={handleSkipBirth}
        />
      )}

      {phase === 'starStory' && activeStar && (
        <RecipientStoryPhase
          project={project}
          activeStar={activeStar}
          activeIndex={activeIndex}
          totalStars={totalStars}
          unlockedCount={unlockedCount}
          finaleReached={finaleReached}
          isTransitioning={isTransitioning}
          isPortrait={isPortrait}
          isCompactLandscape={isCompactLandscape}
          activeDevice={activeDevice}
          reducedMotion={reducedMotion}
          editMode={editMode}
          selectedTarget={selectedTarget}
          activeInlineField={activeInlineField}
          quickLetterOpen={quickLetterOpen}
          musicPlaying={musicPlaying}
          musicMuted={musicMuted}
          audioBlocked={audioBlocked}
          trackDisplayName={trackDisplayName}
          dragOffsetX={dragOffsetX}
          isDraggingCanvas={isDraggingCanvas}
          isFullscreen={isFullscreen}
          presentation={storyPresentation}
          storyStageRef={storyStageRef}
          storyRightRef={storyRightRef}
          storyInlineInputRef={storyInlineInputRef}
          storyInlineTextareaRef={storyInlineTextareaRef}
          onToggleFullscreen={handleToggleFullscreen}
          onExitPreview={onExitPreview}
          onToggleSound={toggleSound}
          onAttemptPlayMusic={attemptPlayMusic}
          onSetQuickLetterOpen={(updater) => setQuickLetterOpen(updater)}
          onCloseQuickLetter={() => setQuickLetterOpen(false)}
          onToggleReducedMotion={() => setReducedMotion((v) => !v)}
          onNavigateStory={navigateStory}
          onStoryPointerDown={handleStoryPointerDown}
          onStoryPointerMove={handleStoryPointerMove}
          onStoryPointerUp={handleStoryPointerUp}
          onResetSwipe={resetSwipeGesture}
          onSelectTarget={onSelectTarget}
          onPatchStar={onPatchStar}
          onPatchProject={onPatchProject}
          onSetInlineField={setActiveInlineField}
          {...dragHandlers}
        />
      )}

      {phase === 'finalReveal' && (
        <RecipientFinalRevealPhase
          project={project}
          editMode={editMode}
          musicMuted={musicMuted}
          musicPlaying={musicPlaying}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          onExitPreview={onExitPreview}
          onToggleSound={toggleSound}
          onSkipFinalReveal={handleSkipFinalReveal}
        />
      )}

      {phase === 'constellation' && (
        <RecipientConstellationPhase
          project={project}
          palette={palette}
          globalGlow={globalGlow}
          signatureText={storyPresentation.signatureText}
          activeDevice={activeDevice}
          constellationLayout={constellationLayout}
          isPortrait={isPortrait}
          isCompactLandscape={isCompactLandscape}
          reducedMotion={reducedMotion}
          editMode={editMode}
          selectedTarget={selectedTarget}
          activeInlineField={activeInlineField}
          letterOpen={letterOpen}
          isFullscreen={isFullscreen}
          finaleHeaderRef={finaleHeaderRef}
          onToggleFullscreen={handleToggleFullscreen}
          onExitPreview={onExitPreview}
          onToggleLetterOpen={() => setLetterOpen((v) => !v)}
          onCloseLetter={() => setLetterOpen(false)}
          onSelectTarget={onSelectTarget}
          onSetInlineField={setActiveInlineField}
          onPatchProject={onPatchProject}
          {...dragHandlers}
        />
      )}

      {!editMode && fullscreenNotice && (
        <div
          role="status"
          aria-live="polite"
          data-testid="recipient-fullscreen-notice"
          className="pointer-events-auto fixed top-[max(3.5rem,calc(env(safe-area-inset-top,0px)+3rem))] right-4 sm:right-6 z-40 max-w-[calc(100vw-2rem)] sm:max-w-sm gl-hud !border-amber-300/40 px-3.5 py-2 flex items-center gap-2.5 text-xs text-amber-100 shadow-xl"
        >
          <span>{fullscreenNotice}</span>
          <button
            type="button"
            onClick={dismissFullscreenNotice}
            aria-label="Закрыть уведомление"
            className="rounded-full p-1 text-white/70 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
