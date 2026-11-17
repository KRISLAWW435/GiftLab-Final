import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FastForward,
  Mail,
  MailOpen,
  Pencil,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type {
  EditableCardTarget,
  EditableTextField,
  PreviewJumpTarget,
} from '../preview/previewProtocol';
import {
  COSMIC_PALETTES,
  ENVELOPE_MAX_SCALE,
  ENVELOPE_MIN_SCALE,
  ENVELOPE_OFFSET_MAX,
  ENVELOPE_OFFSET_MIN,
  ENVELOPE_TEXT_OFFSET_MAX,
  ENVELOPE_TEXT_OFFSET_MIN,
  ENVELOPE_VISIBLE_WORLD_H,
  ENVELOPE_WORLD_H,
  ENVELOPE_WORLD_W,
  GLOW_COLORS,
  buildProjectCardDevicePatch,
  buildProjectConstellationDevicePatch,
  buildProjectFinalTextDevicePatch,
  buildStarIllustrationDevicePatch,
  buildStarTextDevicePatch,
  computeEnvelopeScreenOffsetYPx,
  computeEnvelopeTextTranslateYPx,
  computeTextBlockMarginLeftPct,
  resolveCardColors,
  resolveCardTheme,
  resolveContrastSafeCardTextColor,
  resolveEffectiveCardLayout,
  resolveEffectiveConstellationLayout,
  resolveEffectiveFinalTextStyle,
  resolveEffectiveIllustrationLayout,
  resolveEffectiveStarDecor,
  resolveEffectiveStarTextStyle,
  resolveEnvelopeEffectiveWorldScale,
  resolveEnvelopeOffsetY,
  resolveEnvelopeSettings,
  resolveEnvelopeTextOffsetY,
  resolveEnvelopeUserScale,
  resolveMessageFont,
  resolveMusicTrackName,
  resolveSafeCardDecorPresentation,
  resolveStarGlowHex,
  resolveTextShadowCss,
  resolveViewportDeviceMode,
} from '../scene/paletteConfig';
import { resolveProjectMusicForPreview } from '../services/musicEngine';
import type {
  ConstellationProject,
  ConstellationStar,
  DeviceLayoutKey,
  MessageTextAlign,
  RecipientPhase,
} from '../types/project';
import { CardDecorView } from './CardDecorView';
import { CardThemeBackdrop } from './CardThemeBackdrop';
import { Constellation3D, type Constellation3DHandle } from './Constellation3D';
import { FinalLetterCard, type FinalLetterDragKind } from './FinalLetterCard';
import { StarIllustrationView } from './StarIllustrationView';

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

type StoryNavigationIntent =
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'index'; index: number }
  | { type: 'constellation' };

interface SwipeGestureState {
  active: boolean;
  pointerId: number | null;
  pointerType: string;
  startX: number;
  startY: number;
  hasHorizontalIntent: boolean;
}

const INITIAL_SWIPE_STATE: SwipeGestureState = {
  active: false,
  pointerId: null,
  pointerType: '',
  startX: 0,
  startY: 0,
  hasHorizontalIntent: false,
};

const SWIPE_MIN_DISTANCE_PX = 65;
const SWIPE_HORIZONTAL_RATIO = 1.35;

function SmallProgressStarIcon({ lit, active }: { lit: boolean; active: boolean }) {
  const uid = useId().replace(/:/g, '');
  const gradId = `gl-prog-cry-${uid}`;

  return (
    <svg
      viewBox="0 0 24 24"
      className={`gl-icon-3d transition-transform duration-200 ${
        active ? 'w-5 h-5 scale-110' : 'w-4 h-4'
      }`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="3" y1="2" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#e879f9" />
        </linearGradient>
      </defs>
      <path
        d="M12 2.2l2.9 5.88 6.48.94-4.69 4.57 1.1 6.46L12 17l-5.79 3.05 1.1-6.46L2.62 9.02l6.48-.94L12 2.2z"
        fill={lit ? `url(#${gradId})` : 'rgba(255,255,255,0.08)'}
        stroke={lit ? 'rgba(255,255,255,0.92)' : 'currentColor'}
        strokeWidth={lit ? '1.1' : '1.45'}
        strokeLinejoin="round"
      />
      {lit && (
        <>
          <polygon points="12,2.2 9.1,8.08 2.62,9.02 12,12" fill="rgba(255,255,255,0.48)" />
          <circle cx="12" cy="12" r="2.2" fill="#ffffff" />
        </>
      )}
    </svg>
  );
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
  if (typeof window === 'undefined' || !window.getSelection) return false;
  const sel = window.getSelection();
  return Boolean(sel && !sel.isCollapsed && sel.toString().trim().length > 0);
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

  const canvasEditDragRef = useRef<{
    kind:
      | 'text-move'
      | 'text-resize-right'
      | 'text-resize-left'
      | 'text-resize-nw'
      | 'text-resize-ne'
      | 'text-resize-sw'
      | 'text-resize-se'
      | 'card-resize-nw'
      | 'card-resize-ne'
      | 'card-resize-sw'
      | 'card-resize-se'
      | 'story-card-move'
      | 'illu-move'
      | 'illu-scale'
      | 'constellation-move'
      | 'envelope-move'
      | 'envelope-text-move'
      | 'envelope-resize-nw'
      | 'envelope-resize-ne'
      | 'envelope-resize-sw'
      | 'envelope-resize-se'
      | FinalLetterDragKind;
    pointerId: number;
    startX: number;
    startY: number;
    containerW: number;
    containerH: number;
    originX: number;
    originY: number;
    originValue: number;
    originFontSize?: number;
    originCardW?: number;
    originCardH?: number;
    starId?: string;
    hasMoved: boolean;
    pendingInlineField?: EditableTextField;
  } | null>(null);

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
  const [volume, setVolume] = useState(0.58);
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

    // Cancel cleanly on multi-touch
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

    // Yield immediately to vertical scrolling when vertical gesture dominates
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
  const activeStarGlow = activeStar
    ? GLOW_COLORS[resolveStarGlowHex(activeStar, project.globalGlowColor)]
    : globalGlow;

  const signatureText =
    project.senderName?.trim() ||
    (project.recipientName ? `Для ${project.recipientName}` : '');

  const isLastStar = activeIndex >= totalStars - 1;
  const isPortrait = viewport.height > viewport.width || viewport.width < 540;
  const isCompactLandscape = !isPortrait && viewport.height < 520;
  const activeDevice: DeviceLayoutKey =
    deviceMode ?? resolveViewportDeviceMode(viewport.width, viewport.height);

  const constellationLayout = resolveEffectiveConstellationLayout(project, activeDevice);
  const cardLayout = resolveEffectiveCardLayout(project, activeDevice);
  const starTextStyle = resolveEffectiveStarTextStyle(activeStar ?? undefined, activeDevice);
  const starFontMeta = resolveMessageFont(starTextStyle.fontId);
  const sansFontMeta = resolveMessageFont('manrope');
  const cardTheme = resolveCardTheme(project.cardTheme);
  const cardColors = resolveCardColors(project);
  const hasExplicitCardTheme = Boolean(project.cardTheme || project.cardColors);
  const isMinimalistTheme = hasExplicitCardTheme && cardTheme.id === 'minimalist';
  const effectiveAlign: Exclude<MessageTextAlign, 'auto'> =
    starTextStyle.textAlign === 'auto'
      ? isMinimalistTheme
        ? 'left'
        : isPortrait
          ? 'center'
          : 'left'
      : starTextStyle.textAlign;
  const effectiveBodyPx = Math.min(
    starTextStyle.fontSize + starFontMeta.opticalSizeBoost,
    isCompactLandscape ? 16 : isPortrait ? 20 : 26,
  );
  const effectiveTitlePx = Math.round(
    Math.min(isCompactLandscape ? 25 : isPortrait ? 31 : 38, effectiveBodyPx * 1.48),
  );
  const textMarginLeftPct = computeTextBlockMarginLeftPct(
    starTextStyle.widthPct,
    starTextStyle.offsetX,
  );

  const illuLayout = resolveEffectiveIllustrationLayout(activeStar ?? undefined, activeDevice);
  const illuLeftGrow = Number(((illuLayout.offsetX + 100) / 200).toFixed(3));
  const illuRightGrow = Number((1 - illuLeftGrow).toFixed(3));
  const clampedIlluScale = Math.min(isPortrait ? 1.28 : 1.45, illuLayout.scale);
  const baseIlluPx = isCompactLandscape
    ? 80
    : isPortrait
      ? viewport.width >= 640
        ? 156
        : 118
      : viewport.width >= 1024
        ? 196
        : 158;
  const effectiveIlluPx = Math.round(baseIlluPx * clampedIlluScale);

  const illuYShift = illuLayout.offsetY / 100;
  const textYShift = starTextStyle.offsetY / 100;
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
    Math.min(2.4, spacerBase + Math.max(0, -textYShift) * 1.35 - Math.max(0, textYShift) * 0.65),
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

  const storyWidthClass = isPortrait
    ? cardLayout.width === 'compact'
      ? 'max-w-[330px]'
      : cardLayout.width === 'wide'
        ? 'max-w-full'
        : 'max-w-[374px]'
    : cardLayout.width === 'compact'
      ? 'max-w-md'
      : cardLayout.width === 'wide'
        ? 'max-w-2xl'
        : 'max-w-xl';

  const storyCardPaddingClass = isMinimalistTheme
    ? cardLayout.padding === 'compact'
      ? 'pl-7 pr-4 py-3 sm:pl-9 sm:pr-6 sm:py-4'
      : cardLayout.padding === 'spacious'
        ? 'pl-9 pr-6 py-5 sm:pl-12 sm:pr-9 sm:py-7'
        : 'pl-8 pr-5 py-4 sm:pl-10 sm:pr-7 sm:py-5'
    : cardLayout.padding === 'compact'
      ? 'px-3.5 py-2.5 sm:px-4 sm:py-3'
      : cardLayout.padding === 'spacious'
        ? 'px-5 py-4 sm:px-8 sm:py-6'
        : 'px-4 py-3.5 sm:px-6 sm:py-5';

  const storyCardOffsetY = Math.round(cardLayout.offsetY * 0.7);
  const storyCardScale = cardLayout.scale ?? 1;
  const storyTextShiftY = Math.round(starTextStyle.offsetY * 0.32);

  const starDecor = resolveEffectiveStarDecor(activeStar ?? undefined, activeDevice);
  const safeStarDecor = resolveSafeCardDecorPresentation(starDecor, {
    editMode,
    textLength: (activeStar?.message || '').length,
    compactViewport: isPortrait || isCompactLandscape,
  });
  const rawStarTextColor =
    activeStar?.textStyle || !cardColors.isLightPaper
      ? starTextStyle.color
      : cardColors.textColor;
  const effectiveStarTextColor = resolveContrastSafeCardTextColor(
    rawStarTextColor,
    project,
    cardColors,
  );
  const effectiveStarShadowMode =
    cardColors.isLightPaper && starTextStyle.shadow !== 'glow'
      ? 'none'
      : starTextStyle.shadow;
  const resolvedTextShadow = resolveTextShadowCss(
    effectiveStarShadowMode,
    activeStarGlow.hex,
  );
  const storyDecorGlowHex = cardColors.isLightPaper
    ? cardColors.accentColor
    : activeStarGlow.hex;
  const storyDecorCoreHex = cardColors.isLightPaper
    ? cardColors.badgeColor
    : activeStarGlow.coreHex;

  const finalTextStyle = resolveEffectiveFinalTextStyle(project, activeDevice);
  const resolvedEnvelope = resolveEnvelopeSettings(project);
  const envelopeAspect = Math.max(
    0.25,
    viewport.width / Math.max(1, viewport.height),
  );
  const envelopeUserScale = resolveEnvelopeUserScale(
    project.envelopeSettings,
    activeDevice,
  );
  const envelopeWorldScale = resolveEnvelopeEffectiveWorldScale(
    project.envelopeSettings,
    envelopeAspect,
    activeDevice,
  );
  const envelopePxPerUnit =
    Math.max(1, viewport.height) / ENVELOPE_VISIBLE_WORLD_H;
  const envelopeBoxW = Math.round(
    ENVELOPE_WORLD_W * envelopeWorldScale * envelopePxPerUnit,
  );
  const envelopeBoxH = Math.round(
    ENVELOPE_WORLD_H * envelopeWorldScale * envelopePxPerUnit,
  );

  const envelopeTextOffsetY = resolveEnvelopeTextOffsetY(
    project.envelopeSettings,
    activeDevice,
  );
  const envelopeTextTranslateYPx = computeEnvelopeTextTranslateYPx(
    envelopeTextOffsetY,
    viewport.height,
    isPortrait,
  );
  const envelopeOffsetY = resolveEnvelopeOffsetY(
    project.envelopeSettings,
    activeDevice,
  );
  const envelopeScreenOffsetYPx = computeEnvelopeScreenOffsetYPx(
    envelopeOffsetY,
    viewport.width,
    viewport.height,
  );

  // Interactive visual card design pointer handlers (only active in PreviewWorkspace editMode)
  const beginCanvasEdit = (
    kind:
      | 'text-move'
      | 'text-resize-right'
      | 'text-resize-left'
      | 'text-resize-nw'
      | 'text-resize-ne'
      | 'text-resize-sw'
      | 'text-resize-se'
      | 'card-resize-nw'
      | 'card-resize-ne'
      | 'card-resize-sw'
      | 'card-resize-se'
      | 'story-card-move'
      | 'illu-move'
      | 'illu-scale'
      | 'constellation-move'
      | 'envelope-move'
      | 'envelope-text-move'
      | 'envelope-resize-nw'
      | 'envelope-resize-ne'
      | 'envelope-resize-sw'
      | 'envelope-resize-se'
      | FinalLetterDragKind,
    e: React.PointerEvent<HTMLElement>,
  ) => {
    if (!editMode) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if ((e.target as HTMLElement | null)?.closest('input, textarea, select')) return;
    e.stopPropagation();

    const targetMap: Record<typeof kind, EditableCardTarget> = {
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
    onSelectTarget?.(targetMap[kind]);

    const isEnvelopeResize = kind.startsWith('envelope-resize-');
    const isEnvelopeDrag =
      isEnvelopeResize || kind === 'envelope-move' || kind === 'envelope-text-move';
    const stageEl =
      kind === 'constellation-move' || isEnvelopeDrag
        ? undefined
        : kind.startsWith('final-')
          ? finaleHeaderRef.current
          : storyStageRef.current;
    const stageRect = stageEl?.getBoundingClientRect();

    const containerW = isEnvelopeResize
      ? Math.max(80, envelopeBoxW)
      : Math.max(160, stageRect?.width ?? viewport.width);
    const containerH = isEnvelopeResize
      ? Math.max(60, envelopeBoxH)
      : Math.max(140, stageRect?.height ?? viewport.height);

    let originX = 0;
    let originY = 0;
    let originValue = 1;
    let originFontSize: number | undefined;
    let originCardW: number | undefined;
    let originCardH: number | undefined;

    if (
      kind === 'text-move' ||
      kind === 'text-resize-right' ||
      kind === 'text-resize-left' ||
      kind === 'text-resize-nw' ||
      kind === 'text-resize-ne' ||
      kind === 'text-resize-sw' ||
      kind === 'text-resize-se'
    ) {
      originX = starTextStyle.offsetX;
      originY = starTextStyle.offsetY;
      originValue = starTextStyle.widthPct;
      originFontSize = starTextStyle.fontSize;
    } else if (
      kind === 'final-card-resize-nw' ||
      kind === 'final-card-resize-ne' ||
      kind === 'final-card-resize-sw' ||
      kind === 'final-card-resize-se' ||
      kind === 'card-resize-nw' ||
      kind === 'card-resize-ne' ||
      kind === 'card-resize-sw' ||
      kind === 'card-resize-se'
    ) {
      originValue = cardLayout.scale ?? 1;
    } else if (kind === 'story-card-move') {
      originX = 0;
      originY = cardLayout.offsetY;
      originValue = cardLayout.offsetY;
    } else if (kind === 'illu-move' || kind === 'illu-scale') {
      originX = illuLayout.offsetX;
      originY = illuLayout.offsetY;
      originValue = illuLayout.scale;
    } else if (kind === 'constellation-move') {
      originX = constellationLayout.offsetX;
      originY = constellationLayout.offsetY;
      originValue = constellationLayout.scale;
    } else if (kind === 'envelope-move') {
      originY = envelopeOffsetY;
    } else if (kind === 'envelope-text-move') {
      originY = envelopeTextOffsetY;
    } else if (kind.startsWith('envelope-resize-')) {
      originValue = envelopeUserScale;
    } else if (
      kind === 'final-text-move' ||
      kind === 'final-text-resize-right' ||
      kind === 'final-text-resize-left' ||
      kind === 'final-text-resize-nw' ||
      kind === 'final-text-resize-ne' ||
      kind === 'final-text-resize-sw' ||
      kind === 'final-text-resize-se'
    ) {
      originX = finalTextStyle.offsetX;
      originY = finalTextStyle.offsetY;
      originValue = finalTextStyle.widthPct;
      originFontSize = finalTextStyle.fontSize;
    } else if (kind === 'final-card-move') {
      originX = 0;
      originY = cardLayout.offsetY;
      originValue = cardLayout.offsetY;
    }

    const inlineTargetEl = (e.target as HTMLElement | null)?.closest(
      '[data-inline-field]',
    ) as HTMLElement | null;
    const pendingInlineField = (inlineTargetEl?.getAttribute('data-inline-field') ??
      undefined) as EditableTextField | undefined;

    e.currentTarget.setPointerCapture(e.pointerId);
    canvasEditDragRef.current = {
      kind,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      containerW,
      containerH,
      originX,
      originY,
      originValue,
      originFontSize,
      originCardW,
      originCardH,
      starId: activeStar?.id,
      hasMoved: false,
      pendingInlineField,
    };
  };

  const moveCanvasEdit = (e: React.PointerEvent<HTMLElement>) => {
    const drag = canvasEditDragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    e.stopPropagation();

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (!drag.hasMoved) {
      if (Math.hypot(dx, dy) < 4) {
        return;
      }
      drag.hasMoved = true;
      setActiveInlineField(null);
    }

    if (drag.kind === 'constellation-move') {
      const dxNorm = Math.round((dx / Math.max(140, drag.containerW * 0.42)) * 100);
      const dyNorm = Math.round((-dy / Math.max(140, drag.containerH * 0.42)) * 100);
      onPatchProject?.(
        buildProjectConstellationDevicePatch(project, activeDevice, {
          offsetX: Math.max(-100, Math.min(100, drag.originX + dxNorm)),
          offsetY: Math.max(-100, Math.min(100, drag.originY + dyNorm)),
        }),
      );
      return;
    }

    if (drag.kind === 'envelope-move') {
      const maxRangePx = Math.max(40, drag.containerH * (isPortrait ? 0.16 : 0.11));
      const dyNorm = Math.round((dy / maxRangePx) * 100);
      const nextOffsetY = Math.max(
        ENVELOPE_OFFSET_MIN,
        Math.min(ENVELOPE_OFFSET_MAX, drag.originY + dyNorm),
      );
      onPatchProject?.({
        envelopeSettings: {
          ...project.envelopeSettings,
          [activeDevice === 'phone' ? 'phoneOffsetY' : 'desktopOffsetY']: nextOffsetY,
        },
      });
      return;
    }

    if (drag.kind === 'envelope-text-move') {
      const maxDownPx = Math.max(40, drag.containerH * (isPortrait ? 0.25 : 0.14));
      const dyNorm = Math.round((dy / maxDownPx) * 100);
      const nextTextOffsetY = Math.max(
        ENVELOPE_TEXT_OFFSET_MIN,
        Math.min(ENVELOPE_TEXT_OFFSET_MAX, drag.originY + dyNorm),
      );
      onPatchProject?.({
        envelopeSettings: {
          ...project.envelopeSettings,
          [activeDevice === 'phone' ? 'phoneTextOffsetY' : 'desktopTextOffsetY']:
            nextTextOffsetY,
        },
      });
      return;
    }

    if (drag.kind.startsWith('envelope-resize-')) {
      const signX = drag.kind.endsWith('-ne') || drag.kind.endsWith('-se') ? 1 : -1;
      const signY = drag.kind.endsWith('-sw') || drag.kind.endsWith('-se') ? 1 : -1;
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
      onPatchProject?.({
        envelopeSettings: {
          ...project.envelopeSettings,
          [activeDevice === 'phone' ? 'phoneScale' : 'desktopScale']: nextScale,
        },
      });
      return;
    }

    if (drag.kind === 'final-card-move') {
      const nextY = Math.max(-60, Math.min(60, Math.round(drag.originY + dy / 1.4)));
      onPatchProject?.(
        buildProjectCardDevicePatch(project, activeDevice, { offsetY: nextY }),
      );
      return;
    }

    if (
      drag.kind === 'final-card-resize-nw' ||
      drag.kind === 'final-card-resize-ne' ||
      drag.kind === 'final-card-resize-sw' ||
      drag.kind === 'final-card-resize-se'
    ) {
      const signX = drag.kind.endsWith('-ne') || drag.kind.endsWith('-se') ? 1 : -1;
      const signY = drag.kind.endsWith('-sw') || drag.kind.endsWith('-se') ? 1 : -1;
      const halfW = Math.max(80, drag.containerW / 2);
      const halfH = Math.max(80, drag.containerH / 2);
      const ratioDelta = ((dx * signX) / halfW + (dy * signY) / halfH) / 2;
      const nextScale = Math.max(
        0.55,
        Math.min(1.25, Number((drag.originValue * (1 + ratioDelta)).toFixed(2))),
      );
      onPatchProject?.(
        buildProjectCardDevicePatch(project, activeDevice, {
          scale: nextScale,
        }),
      );
      return;
    }

    if (drag.kind === 'story-card-move') {
      const nextY = Math.max(-60, Math.min(60, Math.round(drag.originY + dy / 0.7)));
      onPatchProject?.(
        buildProjectCardDevicePatch(project, activeDevice, { offsetY: nextY }),
      );
      return;
    }

    if (
      drag.kind === 'card-resize-nw' ||
      drag.kind === 'card-resize-ne' ||
      drag.kind === 'card-resize-sw' ||
      drag.kind === 'card-resize-se'
    ) {
      const signX = drag.kind.endsWith('-ne') || drag.kind.endsWith('-se') ? 1 : -1;
      const signY = drag.kind.endsWith('-sw') || drag.kind.endsWith('-se') ? 1 : -1;
      const halfW = Math.max(80, drag.containerW / 2);
      const halfH = Math.max(80, drag.containerH / 2);
      const ratioDelta = ((dx * signX) / halfW + (dy * signY) / halfH) / 2;
      const nextScale = Math.max(
        0.55,
        Math.min(1.25, Number((drag.originValue * (1 + ratioDelta)).toFixed(2))),
      );
      onPatchProject?.(
        buildProjectCardDevicePatch(project, activeDevice, {
          scale: nextScale,
        }),
      );
      return;
    }

    if (drag.kind === 'final-text-move') {
      let nextWidth = drag.originValue;
      if (Math.abs(dx) > 6 && nextWidth > 90) {
        nextWidth = 84;
      }
      const dxNorm = Math.round((dx / Math.max(60, drag.containerW * 0.35)) * 100);
      const dyNorm = Math.round((dy / Math.max(50, drag.containerH * 0.25)) * 100);
      onPatchProject?.(
        buildProjectFinalTextDevicePatch(project, activeDevice, {
          widthPct: nextWidth,
          offsetX: Math.max(-100, Math.min(100, drag.originX + dxNorm)),
          offsetY: Math.max(-100, Math.min(100, drag.originY + dyNorm)),
        }),
      );
      return;
    }

    if (
      drag.kind === 'final-text-resize-right' ||
      drag.kind === 'final-text-resize-left'
    ) {
      const signedDx = drag.kind === 'final-text-resize-right' ? dx : -dx;
      const dWidthPct = Math.round((signedDx / drag.containerW) * 100);
      const nextWidth = Math.max(38, Math.min(100, drag.originValue + dWidthPct));
      onPatchProject?.(
        buildProjectFinalTextDevicePatch(project, activeDevice, {
          widthPct: nextWidth,
        }),
      );
      return;
    }

    if (
      drag.kind === 'final-text-resize-nw' ||
      drag.kind === 'final-text-resize-ne' ||
      drag.kind === 'final-text-resize-sw' ||
      drag.kind === 'final-text-resize-se'
    ) {
      const signX = drag.kind.endsWith('-ne') || drag.kind.endsWith('-se') ? 1 : -1;
      const signY = drag.kind.endsWith('-sw') || drag.kind.endsWith('-se') ? 1 : -1;
      const dWidthPct = Math.round(((dx * signX) / drag.containerW) * 100);
      const nextWidth = Math.max(38, Math.min(100, drag.originValue + dWidthPct));
      const dFont = Math.round((dy * signY) / 14);
      const nextFont = Math.max(12, Math.min(28, (drag.originFontSize ?? 17) + dFont));
      onPatchProject?.(
        buildProjectFinalTextDevicePatch(project, activeDevice, {
          widthPct: nextWidth,
          fontSize: nextFont,
        }),
      );
      return;
    }

    const starId = drag.starId;
    if (!starId) return;
    const targetStar = project.stars.find((s) => s.id === starId) ?? activeStar;
    if (!targetStar) return;

    if (drag.kind === 'text-move') {
      let nextWidth = drag.originValue;
      if (Math.abs(dx) > 6 && nextWidth > 90) {
        nextWidth = 84;
      }
      const dxNorm = Math.round((dx / Math.max(60, drag.containerW * 0.35)) * 100);
      const dyNorm = Math.round((dy / Math.max(60, drag.containerH * 0.32)) * 100);
      onPatchStar?.(
        starId,
        buildStarTextDevicePatch(targetStar, activeDevice, {
          widthPct: nextWidth,
          offsetX: Math.max(-100, Math.min(100, drag.originX + dxNorm)),
          offsetY: Math.max(-100, Math.min(100, drag.originY + dyNorm)),
        }),
      );
    } else if (drag.kind === 'text-resize-right' || drag.kind === 'text-resize-left') {
      const signedDx = drag.kind === 'text-resize-right' ? dx : -dx;
      const dWidthPct = Math.round((signedDx / drag.containerW) * 100);
      const nextWidth = Math.max(38, Math.min(100, drag.originValue + dWidthPct));
      onPatchStar?.(
        starId,
        buildStarTextDevicePatch(targetStar, activeDevice, {
          widthPct: nextWidth,
        }),
      );
    } else if (
      drag.kind === 'text-resize-nw' ||
      drag.kind === 'text-resize-ne' ||
      drag.kind === 'text-resize-sw' ||
      drag.kind === 'text-resize-se'
    ) {
      const signX = drag.kind.endsWith('-ne') || drag.kind.endsWith('-se') ? 1 : -1;
      const signY = drag.kind.endsWith('-sw') || drag.kind.endsWith('-se') ? 1 : -1;
      const dWidthPct = Math.round(((dx * signX) / drag.containerW) * 100);
      const nextWidth = Math.max(38, Math.min(100, drag.originValue + dWidthPct));
      const dFont = Math.round((dy * signY) / 14);
      const nextFont = Math.max(12, Math.min(28, (drag.originFontSize ?? 16) + dFont));
      onPatchStar?.(
        starId,
        buildStarTextDevicePatch(targetStar, activeDevice, {
          widthPct: nextWidth,
          fontSize: nextFont,
        }),
      );
    } else if (drag.kind === 'illu-move') {
      const dxNorm = Math.round((dx / Math.max(60, drag.containerW * 0.42)) * 100);
      const dyNorm = Math.round((dy / Math.max(60, drag.containerH * 0.34)) * 100);
      onPatchStar?.(
        starId,
        buildStarIllustrationDevicePatch(targetStar, activeDevice, {
          offsetX: Math.max(-100, Math.min(100, drag.originX + dxNorm)),
          offsetY: Math.max(-100, Math.min(100, drag.originY + dyNorm)),
        }),
      );
    } else if (drag.kind === 'illu-scale') {
      const delta = (dx + dy) / 140;
      const nextScale = Math.max(0.65, Math.min(1.45, Number((drag.originValue + delta).toFixed(2))));
      onPatchStar?.(
        starId,
        buildStarIllustrationDevicePatch(targetStar, activeDevice, {
          scale: nextScale,
        }),
      );
    }
  };

  const endCanvasEdit = (e: React.PointerEvent<HTMLElement>) => {
    const drag = canvasEditDragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    canvasEditDragRef.current = null;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }

    if (!drag.hasMoved && drag.pendingInlineField) {
      setActiveInlineField(drag.pendingInlineField);
      onSelectTarget?.(
        drag.kind === 'envelope-text-move' ? 'envelope' : 'text',
        drag.pendingInlineField,
      );
    }
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

      {/* 2D fallback frosted sealed envelope when WebGL2 is unavailable */}
      {phase === 'sealed' && webglUnavailable && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center p-4"
          style={{
            background: `radial-gradient(ellipse 68% 54% at 50% 54%, ${
              resolvedEnvelope.envelopeColor ?? palette.nebulaPrimary
            }66 0%, ${palette.midColor}E6 48%, ${palette.deepColor} 100%)`,
          }}
        >
          <div
            onClick={editMode ? () => onSelectTarget?.('envelope') : handleOpenEnvelope}
            className={`relative rounded-[24px] border backdrop-blur-2xl flex flex-col items-center justify-center overflow-hidden shadow-[0_28px_80px_rgba(6,4,18,0.75)] cursor-pointer transition-transform hover:scale-[1.02] ${
              editMode && selectedTarget === 'envelope'
                ? 'ring-2 ring-amber-400/90 border-white/55'
                : 'border-white/35'
            }`}
            style={{
              width: `${envelopeBoxW}px`,
              height: `${envelopeBoxH}px`,
              transform:
                envelopeScreenOffsetYPx !== 0
                  ? `translateY(${envelopeScreenOffsetYPx}px)`
                  : undefined,
              background: resolvedEnvelope.envelopeColor
                ? `linear-gradient(155deg, ${resolvedEnvelope.envelopeColor}EE 0%, ${resolvedEnvelope.envelopeColor}AA 100%)`
                : 'linear-gradient(155deg, rgba(255,255,255,0.88) 0%, rgba(226,220,250,0.45) 55%, rgba(167,139,250,0.28) 100%)',
              boxShadow:
                '0 24px 60px rgba(76,29,149,0.52), inset 0 1px 0 rgba(255,255,255,0.78)',
            }}
          >
            {/* Diagonal folded V-flap lines echoing frosted Reference #2 */}
            <svg
              viewBox="0 0 320 192"
              fill="none"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 w-full h-full"
              aria-hidden="true"
            >
              <path
                d="M0 0L160 110L320 0"
                stroke="rgba(255,255,255,0.78)"
                strokeWidth="2"
                fill="rgba(255,255,255,0.16)"
              />
              <path
                d="M0 192L122 96M320 192L198 96"
                stroke="rgba(255,255,255,0.36)"
                strokeWidth="1.4"
              />
            </svg>
            <div
              className="relative z-10 mt-5 w-14 h-14 rounded-full flex items-center justify-center border border-white/75"
              style={{
                background: `radial-gradient(circle, #FFFFFF 8%, ${
                  resolvedEnvelope.sealColor ?? globalGlow.coreHex
                } 58%, ${resolvedEnvelope.sealColor ?? globalGlow.hex} 100%)`,
                boxShadow: `0 0 28px ${resolvedEnvelope.sealColor ?? globalGlow.hex}`,
              }}
            >
              <Sparkles className="w-6 h-6 text-[#1E143B]" />
            </div>
          </div>
        </div>
      )}

      {/* PHASE 1: Sealed Envelope */}
      {phase === 'sealed' && (
        <div
          onClick={
            editMode
              ? (e) => {
                  if (e.target === e.currentTarget) {
                    onSelectTarget?.('envelope');
                  }
                }
              : undefined
          }
          className={`${
            editMode ? 'pointer-events-auto' : 'pointer-events-none'
          } fixed inset-0 z-20 flex flex-col justify-between p-5 sm:p-8 gl-safe-top gl-safe-bottom`}
        >
          {/* Ambient radial indigo luminescence behind 3D/2D sealed envelope (Reference #2) */}
          <div
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background: `radial-gradient(ellipse 64% 48% at 50% 56%, ${
                resolvedEnvelope.envelopeColor ?? palette.nebulaPrimary
              }42 0%, transparent 72%)`,
            }}
            aria-hidden="true"
          />

          {editMode && (
            <div
              data-testid="envelope-resize-frame"
              data-selected={selectedTarget === 'envelope'}
              onPointerDown={(e) => beginCanvasEdit('envelope-move', e)}
              onPointerMove={moveCanvasEdit}
              onPointerUp={endCanvasEdit}
              onPointerCancel={endCanvasEdit}
              onClick={(e) => {
                e.stopPropagation();
                onSelectTarget?.('envelope');
              }}
              style={{
                width: `${envelopeBoxW}px`,
                height: `${envelopeBoxH}px`,
                transform: `translate(-50%, calc(-50% + ${envelopeScreenOffsetYPx}px))`,
              }}
              title="Потяни конверт вверх или вниз, либо за золотые уголки для размера"
              className={`pointer-events-auto absolute left-1/2 top-1/2 z-10 rounded-2xl border-2 border-dashed transition-colors cursor-grab active:cursor-grabbing touch-none ${
                selectedTarget === 'envelope'
                  ? 'border-amber-300/90 bg-amber-400/[0.04]'
                  : 'border-amber-300/60 hover:border-amber-300/90'
              }`}
            >
              {(
                [
                  {
                    kind: 'envelope-resize-nw',
                    pos: '-top-3 -left-3',
                    cursor: 'cursor-nwse-resize',
                    label: 'Изменить размер конверта (верхний левый угол)',
                  },
                  {
                    kind: 'envelope-resize-ne',
                    pos: '-top-3 -right-3',
                    cursor: 'cursor-nesw-resize',
                    label: 'Изменить размер конверта (верхний правый угол)',
                  },
                  {
                    kind: 'envelope-resize-sw',
                    pos: '-bottom-3 -left-3',
                    cursor: 'cursor-nesw-resize',
                    label: 'Изменить размер конверта (нижний левый угол)',
                  },
                  {
                    kind: 'envelope-resize-se',
                    pos: '-bottom-3 -right-3',
                    cursor: 'cursor-nwse-resize',
                    label: 'Изменить размер конверта (нижний правый угол)',
                  },
                ] as const
              ).map((corner) => (
                <button
                  key={corner.kind}
                  type="button"
                  data-testid={corner.kind}
                  aria-label={corner.label}
                  title="Потяни за угол, чтобы изменить размер конверта"
                  onPointerDown={(e) => beginCanvasEdit(corner.kind, e)}
                  onPointerMove={moveCanvasEdit}
                  onPointerUp={endCanvasEdit}
                  onPointerCancel={endCanvasEdit}
                  onClick={(e) => e.stopPropagation()}
                  className={`absolute ${corner.pos} w-6 h-6 rounded-full bg-amber-400 border-2 border-white ${corner.cursor} touch-none shadow-[0_2px_10px_rgba(0,0,0,0.65)] hover:scale-110 transition-transform flex items-center justify-center`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#181236]" />
                </button>
              ))}
            </div>
          )}

          <header className="relative z-20 flex items-start justify-between gap-4">
            <div className="pointer-events-auto">
              {onExitPreview && (
                <button
                  type="button"
                  onClick={onExitPreview}
                  className="gl-btn-secondary !bg-gl-panel/85 hover:!bg-gl-card text-gl-text !px-3 !py-2 text-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  В редактор
                </button>
              )}
            </div>

            <div
              data-testid="envelope-header-block"
              onPointerDown={
                editMode ? (e) => beginCanvasEdit('envelope-text-move', e) : undefined
              }
              onPointerMove={editMode ? moveCanvasEdit : undefined}
              onPointerUp={editMode ? endCanvasEdit : undefined}
              onPointerCancel={editMode ? endCanvasEdit : undefined}
              style={{
                transform:
                  envelopeTextTranslateYPx !== 0
                    ? `translateY(${envelopeTextTranslateYPx}px)`
                    : undefined,
              }}
              title={
                editMode
                  ? 'Нажми на текст для правки или перетащи блок выше/ниже'
                  : undefined
              }
              className={`pointer-events-auto text-center flex-1 max-w-2xl mx-auto ${
                editMode
                  ? 'cursor-grab active:cursor-grabbing touch-none rounded-2xl px-2 py-1 border border-transparent hover:border-amber-300/50 hover:bg-white/[0.03] transition-colors'
                  : ''
              }`}
            >
              {editMode && activeInlineField === 'envelopeKicker' ? (
                <input
                  ref={storyInlineInputRef}
                  type="text"
                  maxLength={80}
                  value={project.envelopeSettings?.kickerText ?? resolvedEnvelope.kickerText}
                  data-testid="inline-edit-envelopeKicker"
                  onChange={(e) =>
                    onPatchProject?.({
                      envelopeSettings: {
                        ...project.envelopeSettings,
                        kickerText: e.target.value,
                      },
                    })
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') {
                      e.preventDefault();
                      setActiveInlineField(null);
                    }
                  }}
                  onBlur={() => setActiveInlineField(null)}
                  className="mb-1.5 w-64 max-w-full rounded-lg border border-amber-300/70 bg-black/40 px-2.5 py-1 text-center text-xs sm:text-sm text-white outline-none"
                />
              ) : (
                <p
                  data-testid="envelope-kicker-text"
                  data-inline-field="envelopeKicker"
                  className={`text-xs sm:text-sm text-gl-text-secondary font-medium mb-1 ${
                    editMode ? 'cursor-text rounded-lg px-2 py-0.5 inline-block hover:bg-white/10' : ''
                  }`}
                >
                  {resolvedEnvelope.kickerText}
                </p>
              )}

              {editMode && activeInlineField === 'envelopeHeadline' ? (
                <input
                  ref={storyInlineInputRef}
                  type="text"
                  maxLength={120}
                  value={project.envelopeSettings?.headlineText ?? resolvedEnvelope.headlineText}
                  data-testid="inline-edit-envelopeHeadline"
                  onChange={(e) =>
                    onPatchProject?.({
                      envelopeSettings: {
                        ...project.envelopeSettings,
                        headlineText: e.target.value,
                      },
                    })
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') {
                      e.preventDefault();
                      setActiveInlineField(null);
                    }
                  }}
                  onBlur={() => setActiveInlineField(null)}
                  className="w-full max-w-lg rounded-xl border border-amber-300/70 bg-black/45 px-3 py-1.5 text-center text-xl sm:text-3xl font-extrabold text-white outline-none"
                />
              ) : (
                <h1
                  data-testid="envelope-headline-text"
                  data-inline-field="envelopeHeadline"
                  className={`gl-title-display text-2xl sm:text-4xl font-extrabold text-white leading-tight [text-wrap:balance] ${
                    editMode ? 'cursor-text rounded-xl px-2 py-0.5 hover:bg-white/10' : ''
                  }`}
                >
                  {resolvedEnvelope.headlineText}
                </h1>
              )}
            </div>

            <div className="w-20 hidden sm:block" />
          </header>

          <div className="relative z-20 pointer-events-auto flex flex-col items-center gap-3 pb-4 sm:pb-6">
            {editMode && activeInlineField === 'envelopeHint' ? (
              <input
                ref={storyInlineInputRef}
                type="text"
                maxLength={120}
                value={project.envelopeSettings?.hintText ?? resolvedEnvelope.hintText}
                data-testid="inline-edit-envelopeHint"
                onChange={(e) =>
                  onPatchProject?.({
                    envelopeSettings: {
                      ...project.envelopeSettings,
                      hintText: e.target.value,
                    },
                  })
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') {
                    e.preventDefault();
                    setActiveInlineField(null);
                  }
                }}
                onBlur={() => setActiveInlineField(null)}
                className="w-80 max-w-full rounded-lg border border-amber-300/70 bg-black/40 px-2.5 py-1 text-center text-xs sm:text-sm text-white outline-none"
              />
            ) : (
              <p
                data-testid="envelope-hint-text"
                onClick={
                  editMode
                    ? () => {
                        setActiveInlineField('envelopeHint');
                        onSelectTarget?.('envelope', 'envelopeHint');
                      }
                    : undefined
                }
                className={`text-xs sm:text-sm text-gl-text-secondary text-center ${
                  editMode ? 'cursor-text rounded-lg px-2 py-0.5 hover:bg-white/10' : ''
                }`}
              >
                {resolvedEnvelope.hintText}
              </p>
            )}

            {editMode && activeInlineField === 'envelopeCta' ? (
              <input
                ref={storyInlineInputRef}
                type="text"
                maxLength={50}
                value={project.envelopeSettings?.ctaText ?? resolvedEnvelope.ctaText}
                data-testid="inline-edit-envelopeCta"
                onChange={(e) =>
                  onPatchProject?.({
                    envelopeSettings: {
                      ...project.envelopeSettings,
                      ctaText: e.target.value,
                    },
                  })
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') {
                    e.preventDefault();
                    setActiveInlineField(null);
                  }
                }}
                onBlur={() => setActiveInlineField(null)}
                className="w-64 rounded-full border border-amber-300 bg-white/95 px-6 py-3 text-center text-sm sm:text-base font-semibold text-[#181236] outline-none shadow-xl"
              />
            ) : (
              <button
                type="button"
                data-testid="open-envelope-cta-btn"
                onClick={() => {
                  if (editMode) {
                    setActiveInlineField('envelopeCta');
                    onSelectTarget?.('envelope', 'envelopeCta');
                  } else {
                    handleOpenEnvelope();
                  }
                }}
                className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5 text-sm sm:text-base font-semibold text-[#181236] cursor-pointer transition-transform hover:scale-[1.03] active:scale-[0.98] border border-white/80"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(232,226,252,0.94) 100%)',
                  boxShadow:
                    '0 14px 36px rgba(109, 84, 181, 0.52), 0 0 28px rgba(255, 255, 255, 0.32)',
                }}
              >
                <Sparkles className="w-4 h-4 text-[#5B3FC4]" />
                {resolvedEnvelope.ctaText}
              </button>
            )}
          </div>
        </div>
      )}

      {/* PHASE 2: Envelope Dissolve & First Star Birth */}
      {phase === 'birthing' && (
        <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-6 gl-safe-top gl-safe-bottom">
          <div className="flex items-start justify-between gap-3">
            <div className="pointer-events-auto">
              {onExitPreview && (
                <button
                  type="button"
                  onClick={onExitPreview}
                  className="gl-btn-secondary !bg-gl-panel/85 hover:!bg-gl-card text-gl-text !px-3 !py-2 text-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  В редактор
                </button>
              )}
            </div>

            <div className="pointer-events-auto flex items-center gap-2">
              {project.musicTrackId !== 'none' && (
                <button
                  type="button"
                  onClick={toggleSound}
                  className="gl-btn-secondary !bg-gl-panel/88 hover:!bg-gl-card text-gl-text !px-3 !py-2 text-xs"
                >
                  {musicMuted || !musicPlaying ? (
                    <VolumeX className="w-3.5 h-3.5 text-amber-300" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-gl-accent-light" />
                  )}
                  <span className="hidden sm:inline">
                    {audioBlocked
                      ? 'Запустить музыку'
                      : musicMuted
                        ? 'Включить звук'
                        : 'Звук вкл'}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSkipBirth}
                className="gl-btn-secondary !bg-gl-panel/88 hover:!bg-gl-card text-gl-text !px-3.5 !py-2 text-xs"
              >
                <FastForward className="w-3.5 h-3.5" />
                Пропустить
              </button>
            </div>
          </div>

          {audioBlocked && project.musicTrackId !== 'none' && (
            <div className="pointer-events-auto gl-hud !border-amber-300/40 mx-auto mb-4 px-4 py-2.5 flex items-center gap-3 text-xs text-amber-100">
              <span>Браузер ограничил автозапуск музыки</span>
              <button
                type="button"
                onClick={attemptPlayMusic}
                className="gl-btn-primary !min-h-[34px] !px-3 !py-1.5 text-xs"
              >
                Включить вручную
              </button>
            </div>
          )}
        </div>
      )}

      {/* PHASE 3: Sequential Star Story (Swipe + Orientation Adaptive Layout) */}
      {phase === 'starStory' && activeStar && (
        <div className="pointer-events-none fixed inset-0 z-20 flex flex-col overflow-x-hidden gl-safe-top gl-safe-bottom">
          {/* Atmospheric readability scrim adapted to portrait vs landscape */}
          <div
            className={`pointer-events-none absolute inset-0 ${
              isPortrait
                ? 'bg-gradient-to-t from-[#070B1A]/90 via-[#070B1A]/44 to-transparent'
                : 'bg-gradient-to-l from-[#070B1A]/78 via-[#070B1A]/36 to-transparent'
            }`}
            aria-hidden="true"
          />

          {/* Compact Top Bar: Exit, Star Progress Indicator, Utility Toggles */}
          <header
            className={`relative z-30 flex items-center justify-between gap-2 shrink-0 ${
              isCompactLandscape ? 'px-4 pt-2.5 pb-1' : 'px-4 sm:px-7 pt-3.5 sm:pt-4 pb-1.5'
            }`}
          >
            <div className="pointer-events-auto flex items-center gap-2.5 min-w-0">
              {onExitPreview && (
                <button
                  type="button"
                  onClick={onExitPreview}
                  className="gl-btn-secondary !bg-gl-panel/75 hover:!bg-gl-card/90 text-gl-text !px-3 !py-2 text-xs shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">В редактор</span>
                </button>
              )}
              {!isPortrait && !isCompactLandscape && (
                <span className="hidden lg:inline text-xs sm:text-sm text-gl-text-secondary/90 font-medium truncate">
                  {project.title}
                </span>
              )}
            </div>

            {/* Star-shaped progress indicator (5-7+ small stars) */}
            <div className="pointer-events-auto flex items-center gap-2 sm:gap-2.5 shrink-0">
              <div
                className="flex items-center gap-1 sm:gap-1.5"
                role="navigation"
                aria-label="Открытые звёзды"
              >
                {project.stars.map((s, idx) => {
                  const isUnlocked = idx < unlockedCount || finaleReached;
                  const isCurrent = idx === activeIndex;
                  const starGlow =
                    GLOW_COLORS[resolveStarGlowHex(s, project.globalGlowColor)].hex;

                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={!isUnlocked || isTransitioning}
                      onClick={() => navigateStory({ type: 'index', index: idx })}
                      title={
                        isUnlocked
                          ? s.title || `Звезда ${idx + 1}`
                          : `Звезда ${idx + 1} ещё не открыта`
                      }
                      aria-label={
                        isUnlocked
                          ? `Открыть звезду ${idx + 1}: ${s.title || ''}`
                          : `Звезда ${idx + 1} закрыта`
                      }
                      aria-current={isCurrent ? 'step' : undefined}
                      className={`p-0.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
                        isUnlocked
                          ? 'cursor-pointer hover:scale-110'
                          : 'cursor-default opacity-25'
                      }`}
                      style={{
                        color: isUnlocked ? starGlow : '#94a3b8',
                        filter: isCurrent
                          ? `drop-shadow(0 0 8px ${starGlow})`
                          : undefined,
                      }}
                    >
                      <SmallProgressStarIcon lit={isUnlocked} active={isCurrent} />
                    </button>
                  );
                })}
              </div>

              <span className="text-xs font-semibold text-gl-text-secondary tabular-nums whitespace-nowrap">
                {activeIndex + 1} / {totalStars}
              </span>
            </div>

            {/* Compact Utility Controls */}
            <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
              {finaleReached && (
                <button
                  type="button"
                  onClick={() => navigateStory({ type: 'constellation' })}
                  className="gl-btn-secondary !bg-amber-500/20 hover:!bg-amber-500/35 !border-amber-300/35 text-amber-100 !px-2.5 sm:!px-3 !py-2 text-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">К созвездию</span>
                </button>
              )}

              {project.musicTrackId !== 'none' && (
                <button
                  type="button"
                  onClick={toggleSound}
                  title={trackDisplayName || 'Музыка'}
                  aria-label={musicMuted || !musicPlaying ? 'Включить звук' : 'Выключить звук'}
                  className="gl-btn-secondary !bg-gl-panel/75 hover:!bg-gl-card/90 text-gl-text !px-2.5 sm:!px-3 !py-2 text-xs"
                >
                  {musicMuted || !musicPlaying ? (
                    <VolumeX className="w-3.5 h-3.5 text-amber-300" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-gl-accent-light" />
                  )}
                </button>
              )}

              {!editMode && (
                <button
                  type="button"
                  data-testid="recipient-letter-toggle-btn"
                  onClick={() => setQuickLetterOpen((v) => !v)}
                  aria-pressed={quickLetterOpen}
                  aria-label={
                    quickLetterOpen
                      ? 'Вернуться к звёздам'
                      : 'Открыть финальное письмо'
                  }
                  title={
                    quickLetterOpen
                      ? 'Вернуться к звёздам'
                      : 'Открыть финальное письмо'
                  }
                  className={`gl-btn-secondary !px-2.5 sm:!px-3 !py-2 text-xs transition-all ${
                    quickLetterOpen
                      ? '!bg-amber-400/25 !border-amber-300/60 text-amber-100 hover:!bg-amber-400/35'
                      : '!bg-gl-panel/75 hover:!bg-gl-card/90 text-gl-text'
                  }`}
                >
                  {quickLetterOpen ? (
                    <MailOpen className="w-3.5 h-3.5 text-amber-200" />
                  ) : (
                    <Mail className="w-3.5 h-3.5 text-gl-text" />
                  )}
                </button>
              )}

              {editMode && (
                <button
                  type="button"
                  onClick={() => setReducedMotion((v) => !v)}
                  className="hidden sm:inline-flex gl-btn-secondary !bg-gl-panel/65 hover:!bg-gl-card/85 !px-2.5 !py-2 text-xs font-medium"
                >
                  {reducedMotion ? 'Обычное движение' : 'Меньше движения'}
                </button>
              )}
            </div>
          </header>

          {audioBlocked && project.musicTrackId !== 'none' && (
            <div className="pointer-events-auto relative z-20 gl-hud mx-auto mt-1 px-3.5 py-1.5 flex items-center gap-2.5 text-xs text-amber-100">
              <span>Музыка на паузе</span>
              <button
                type="button"
                onClick={attemptPlayMusic}
                className="gl-btn-primary !min-h-[32px] !px-2.5 !py-1 text-xs"
              >
                Включить
              </button>
            </div>
          )}

          {/* Orientation-adaptive split: Portrait (top 3D / bottom story) vs Landscape (left 3D / right story) */}
          <div
            className={`relative z-10 flex-1 min-h-0 overflow-hidden transition-opacity duration-300 ${
              quickLetterOpen && !editMode ? 'opacity-10 pointer-events-none' : ''
            } ${
              isPortrait ? 'flex flex-col' : 'grid grid-cols-[44%_56%]'
            }`}
          >
            {/* Open 3D Canvas Zone (pointer-events-none so user can independently rotate 3D scene with OrbitControls) */}
            <div
              className={
                isPortrait
                  ? 'h-[32vh] min-h-[190px] max-h-[290px] shrink-0 pointer-events-none'
                  : 'min-h-0 pointer-events-none'
              }
              aria-hidden="true"
            />

            {/* Story / Swipeable Area (pointer-events-auto, isolated from 3D OrbitControls) */}
            <div
              ref={storyRightRef}
              onPointerDown={handleStoryPointerDown}
              onPointerMove={handleStoryPointerMove}
              onPointerUp={handleStoryPointerUp}
              onPointerCancel={resetSwipeGesture}
              onLostPointerCapture={resetSwipeGesture}
              onClick={(e) => {
                if (editMode && e.target === e.currentTarget) {
                  onSelectTarget?.(null);
                }
              }}
              style={{ touchAction: editMode ? 'none' : 'pan-y' }}
              className={`relative pointer-events-auto min-h-0 flex flex-col overflow-visible ${
                isPortrait
                  ? 'flex-1 px-5 pb-4 pt-4 justify-between items-center text-center'
                  : isCompactLandscape
                    ? 'px-6 pb-3 pt-3 justify-between items-start text-left'
                    : 'px-7 sm:px-10 lg:pr-12 lg:pl-5 pb-5 pt-4 justify-between items-start text-left'
              }`}
            >
              {/* Animated Story Content inside bounded stage (styled by selected CardTheme + device CardLayout) */}
              <div
                ref={storyStageRef}
                data-testid="story-card-stage"
                data-device={activeDevice}
                data-card-width={cardLayout.width}
                data-card-padding={cardLayout.padding}
                data-card-scale={storyCardScale}
                onPointerDown={
                  editMode
                    ? (e) => {
                        const target = e.target as HTMLElement;
                        if (
                          target.closest(
                            'button, input, textarea, [data-testid="story-illustration-box"], [data-testid="story-text-block"]',
                          )
                        ) {
                          return;
                        }
                        beginCanvasEdit('story-card-move', e);
                      }
                    : undefined
                }
                onPointerMove={editMode ? moveCanvasEdit : undefined}
                onPointerUp={editMode ? endCanvasEdit : undefined}
                onPointerCancel={editMode ? endCanvasEdit : undefined}
                onClick={(e) => {
                  if (editMode && e.target === e.currentTarget) {
                    onSelectTarget?.('card');
                  }
                }}
                style={{
                  transformOrigin: 'center center',
                  width: cardLayout.customWidthPx ? `${cardLayout.customWidthPx}px` : undefined,
                  minHeight: cardLayout.customHeightPx ? `${cardLayout.customHeightPx}px` : undefined,
                  transform:
                    dragOffsetX !== 0 || storyCardOffsetY !== 0 || storyCardScale !== 1
                      ? `translate3d(${dragOffsetX}px, ${storyCardOffsetY}px, 0) scale(${storyCardScale})`
                      : undefined,
                  transition:
                    dragOffsetX === 0 && !canvasEditDragRef.current
                      ? 'transform 220ms ease-out'
                      : undefined,
                  ...(hasExplicitCardTheme
                    ? {
                        background: cardColors.isLightPaper
                          ? `linear-gradient(155deg, ${cardColors.surfaceBg}F5 0%, ${cardColors.surfaceBgAlt}F2 100%)`
                          : `linear-gradient(155deg, ${cardColors.surfaceBg}D8 0%, ${cardColors.surfaceBgAlt}E8 100%)`,
                        borderColor: `${cardColors.borderColor}7A`,
                        boxShadow: cardColors.isLightPaper
                          ? '0 20px 50px rgba(4, 7, 20, 0.45)'
                          : `0 20px 54px rgba(4, 3, 18, 0.62), 0 0 36px ${cardColors.accentColor}22, inset 0 1px 0 rgba(255,255,255,0.4)`,
                      }
                    : {}),
                }}
                className={`relative z-10 max-h-full w-full ${
                  cardLayout.verticalAlign === 'top' ? 'mb-auto' : 'my-auto'
                } ${
                  cardLayout.customWidthPx ? 'max-w-full' : storyWidthClass
                } flex flex-col ${isPortrait ? 'mx-auto' : ''} rounded-[26px] ${
                  hasExplicitCardTheme
                    ? `border ${cardColors.isLightPaper ? '' : 'backdrop-blur-2xl gl-card-holo-rim'}`
                    : ''
                } ${
                  editMode
                    ? selectedTarget === 'card'
                      ? 'cursor-grab active:cursor-grabbing ring-2 ring-dashed ring-amber-300/95'
                      : 'cursor-grab active:cursor-grabbing ring-1 ring-dashed ring-amber-300/55 hover:ring-amber-300/85'
                    : ''
                }`}
              >
                {/* 4 Golden/White Corner Scale Handles for Star Card (matching FinalLetterCard) */}
                {editMode && (
                  <>
                    {(
                      [
                        { kind: 'card-resize-nw', pos: '-top-2.5 -left-2.5', cursor: 'cursor-nwse-resize', label: 'Уменьшить или увеличить карточку звезды (верхний левый угол)' },
                        { kind: 'card-resize-ne', pos: '-top-2.5 -right-2.5', cursor: 'cursor-nesw-resize', label: 'Уменьшить или увеличить карточку звезды (верхний правый угол)' },
                        { kind: 'card-resize-sw', pos: '-bottom-2.5 -left-2.5', cursor: 'cursor-nesw-resize', label: 'Уменьшить или увеличить карточку звезды (нижний левый угол)' },
                        { kind: 'card-resize-se', pos: '-bottom-2.5 -right-2.5', cursor: 'cursor-nwse-resize', label: 'Уменьшить или увеличить карточку звезды (нижний правый угол)' },
                      ] as const
                    ).map((corner) => (
                      <button
                        key={corner.kind}
                        type="button"
                        data-testid={corner.kind}
                        aria-label={corner.label}
                        title="Потяни за уголок, чтобы уменьшить или увеличить карточку"
                        onPointerDown={(e) => beginCanvasEdit(corner.kind, e)}
                        onPointerMove={moveCanvasEdit}
                        onPointerUp={endCanvasEdit}
                        onPointerCancel={endCanvasEdit}
                        onClick={(e) => e.stopPropagation()}
                        className={`absolute ${corner.pos} w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-400 border-2 border-white ${corner.cursor} touch-none shadow-[0_2px_10px_rgba(0,0,0,0.65)] z-30 transition-transform hover:scale-110 flex items-center justify-center`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#181236]" />
                      </button>
                    ))}
                  </>
                )}

                {/* Clipped inner background layer for theme backdrop & passive theme decor */}
                {hasExplicitCardTheme && (
                  <div className="pointer-events-none absolute inset-0 rounded-[26px] overflow-hidden">
                    <CardThemeBackdrop
                      pattern={cardTheme.paperPattern}
                      accentColor={cardColors.accentColor}
                      badgeColor={cardColors.badgeColor}
                      borderColor={cardColors.borderColor}
                      glowHex={activeStarGlow.hex}
                      isLightPaper={cardColors.isLightPaper}
                      reducedMotion={reducedMotion}
                    />

                    {starDecor.motif !== 'none' && (
                      <div
                        data-testid="story-card-decor"
                        style={{
                          left: `${safeStarDecor.xPct}%`,
                          top: `${safeStarDecor.yPct}%`,
                          transform: `translate(-50%, -50%) scale(${safeStarDecor.scale})`,
                          opacity: safeStarDecor.opacity,
                        }}
                        className="pointer-events-none absolute z-0"
                      >
                        <CardDecorView
                          motif={starDecor.motif}
                          glowHex={storyDecorGlowHex}
                          coreHex={storyDecorCoreHex}
                          className={isPortrait ? 'w-20 h-20' : 'w-24 h-24 sm:w-28 sm:h-28'}
                        />
                      </div>
                    )}
                  </div>
                )}

                <AnimatePresence mode="wait" initial={false}>
                  <motion.article
                    key={activeStar.id}
                    initial={
                      reducedMotion
                        ? { opacity: 1 }
                        : { opacity: 0, y: 12 }
                    }
                    animate={{ opacity: 1, y: 0 }}
                    exit={
                      reducedMotion
                        ? { opacity: 0 }
                        : { opacity: 0, y: -8 }
                    }
                    transition={{
                      duration: reducedMotion ? 0.06 : 0.24,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className={`relative z-10 flex-1 min-h-0 w-full flex flex-col overflow-y-auto overflow-x-hidden overscroll-contain rounded-[26px] ${storyCardPaddingClass}`}
                  >
                    <div style={{ flexGrow: topOuterGrow, flexBasis: 0 }} />

                    {/* Borderless Floating Illustration with Safe Horizontal Positioning & Scale */}
                    <div className="w-full flex items-center shrink-0">
                      <div style={{ flexGrow: illuLeftGrow, flexBasis: 0 }} />
                      <div
                        data-testid="story-illustration-box"
                        data-selected={editMode && selectedTarget === 'illustration'}
                        onPointerDown={editMode ? (e) => beginCanvasEdit('illu-move', e) : undefined}
                        onPointerMove={editMode ? moveCanvasEdit : undefined}
                        onPointerUp={editMode ? endCanvasEdit : undefined}
                        onPointerCancel={editMode ? endCanvasEdit : undefined}
                        onClick={
                          editMode
                            ? (e) => {
                                e.stopPropagation();
                                onSelectTarget?.('illustration');
                              }
                            : undefined
                        }
                        className={`relative shrink-0 flex items-center justify-center py-0.5 ${
                          editMode
                            ? `cursor-grab active:cursor-grabbing touch-none rounded-2xl p-1.5 transition-[box-shadow,background-color] ${
                                selectedTarget === 'illustration'
                                  ? 'ring-2 ring-sky-400 bg-sky-500/10'
                                  : 'ring-1 ring-dashed ring-white/25 hover:ring-sky-400/75'
                              }`
                            : ''
                        }`}
                      >
                        <div
                          className="pointer-events-none absolute inset-0 -m-5 rounded-full opacity-55"
                          style={{
                            background: `radial-gradient(circle, ${activeStarGlow.hex}36 0%, transparent 70%)`,
                          }}
                          aria-hidden="true"
                        />
                        <div
                          style={{
                            width: `${effectiveIlluPx}px`,
                            height: `${effectiveIlluPx}px`,
                            maxWidth: '100%',
                          }}
                          className="relative flex items-center justify-center"
                        >
                          <StarIllustrationView
                            illustration={activeStar.illustration}
                            imageSettings={activeStar.imageSettings}
                            alt={activeStar.title || `Звезда ${activeIndex + 1}`}
                            className="w-full h-full relative object-contain drop-shadow-[0_14px_34px_rgba(0,0,0,0.45)]"
                          />
                        </div>
                        {editMode && selectedTarget === 'illustration' && (
                          <button
                            type="button"
                            data-testid="illu-scale-handle"
                            aria-label="Изменить масштаб иллюстрации"
                            onPointerDown={(e) => beginCanvasEdit('illu-scale', e)}
                            onPointerMove={moveCanvasEdit}
                            onPointerUp={endCanvasEdit}
                            onPointerCancel={endCanvasEdit}
                            className="absolute -bottom-1.5 -right-1.5 w-4 h-4 rounded-full bg-sky-400 border-2 border-white cursor-nwse-resize touch-none shadow"
                          />
                        )}
                      </div>
                      <div style={{ flexGrow: illuRightGrow, flexBasis: 0 }} />
                    </div>

                    <div style={{ flexGrow: topInnerGrow, flexBasis: 0 }} />

                    {/* Bounded Customizable Message Block (Заголовок + Послание + Подпись) */}
                    <div
                      data-testid="story-text-block"
                      data-selected={editMode && selectedTarget === 'text'}
                      title={
                        editMode
                          ? 'Потяни мышкой, чтобы сдвинуть текст внутри карточки, или нажми для правки'
                          : undefined
                      }
                      onPointerDown={
                        editMode
                          ? (e) => {
                              if ((e.target as HTMLElement).closest('input, textarea')) return;
                              beginCanvasEdit('text-move', e);
                            }
                          : undefined
                      }
                      onPointerMove={editMode ? moveCanvasEdit : undefined}
                      onPointerUp={editMode ? endCanvasEdit : undefined}
                      onPointerCancel={editMode ? endCanvasEdit : undefined}
                      onClick={
                        editMode
                          ? (e) => {
                              if ((e.target as HTMLElement).closest('input, textarea')) return;
                              e.stopPropagation();
                              onSelectTarget?.('text');
                            }
                          : undefined
                      }
                      style={{
                        width: `${starTextStyle.widthPct}%`,
                        marginLeft: `${textMarginLeftPct}%`,
                        transform:
                          storyTextShiftY !== 0
                            ? `translateY(${storyTextShiftY}px)`
                            : undefined,
                        textAlign: effectiveAlign,
                        fontFamily: starFontMeta.cssFamily,
                        borderColor:
                          starTextStyle.accent === 'frame'
                            ? `${cardColors.isLightPaper ? cardColors.accentColor : activeStarGlow.hex}44`
                            : starTextStyle.accent === 'quote'
                              ? cardColors.isLightPaper
                                ? cardColors.accentColor
                                : activeStarGlow.hex
                              : undefined,
                        backgroundColor:
                          starTextStyle.accent === 'frame'
                            ? cardColors.isLightPaper
                              ? 'rgba(255,255,255,0.62)'
                              : 'rgba(7,11,26,0.62)'
                            : undefined,
                      }}
                      className={`relative shrink-0 min-w-0 max-w-full box-border space-y-2 ${
                        starTextStyle.accent === 'frame'
                          ? 'rounded-2xl border backdrop-blur-md px-4 py-3.5 sm:px-5 sm:py-4 shadow-xl'
                          : starTextStyle.accent === 'quote'
                            ? effectiveAlign === 'right'
                              ? 'border-r-2 pr-3.5 py-0.5'
                              : 'border-l-2 pl-3.5 py-0.5'
                            : ''
                      } ${
                        editMode
                          ? `cursor-grab active:cursor-grabbing touch-none rounded-xl transition-[box-shadow] ${
                              selectedTarget === 'text'
                                ? 'ring-2 ring-violet-400 ring-offset-2 ring-offset-transparent'
                                : 'ring-1 ring-dashed ring-violet-300/45 hover:ring-violet-300/85'
                            }`
                          : ''
                      }`}
                    >
                      {editMode && selectedTarget === 'text' && (
                        <>
                          {(
                            [
                              { kind: 'text-resize-nw', pos: '-top-1.5 -left-1.5', cursor: 'cursor-nwse-resize', label: 'Изменить размер текста (верхний левый угол)' },
                              { kind: 'text-resize-ne', pos: '-top-1.5 -right-1.5', cursor: 'cursor-nesw-resize', label: 'Изменить размер текста (верхний правый угол)' },
                              { kind: 'text-resize-sw', pos: '-bottom-1.5 -left-1.5', cursor: 'cursor-nesw-resize', label: 'Изменить размер текста (нижний левый угол)' },
                              { kind: 'text-resize-se', pos: '-bottom-1.5 -right-1.5', cursor: 'cursor-nwse-resize', label: 'Изменить размер текста (нижний правый угол)' },
                            ] as const
                          ).map((corner) => (
                            <button
                              key={corner.kind}
                              type="button"
                              data-testid={corner.kind}
                              aria-label={corner.label}
                              onPointerDown={(e) => beginCanvasEdit(corner.kind, e)}
                              onPointerMove={moveCanvasEdit}
                              onPointerUp={endCanvasEdit}
                              onPointerCancel={endCanvasEdit}
                              className={`absolute ${corner.pos} w-3.5 h-3.5 rounded-full bg-violet-400 border-2 border-white ${corner.cursor} touch-none shadow z-20 transition-transform hover:scale-125`}
                            />
                          ))}
                          <button
                            type="button"
                            data-testid="text-resize-left"
                            aria-label="Изменить ширину текста слева"
                            onPointerDown={(e) => beginCanvasEdit('text-resize-left', e)}
                            onPointerMove={moveCanvasEdit}
                            onPointerUp={endCanvasEdit}
                            onPointerCancel={endCanvasEdit}
                            className="absolute top-1/2 -left-2 -translate-y-1/2 w-3 h-6 rounded-full bg-violet-500/90 border border-white cursor-ew-resize touch-none shadow z-20"
                          />
                          <button
                            type="button"
                            data-testid="text-resize-right"
                            aria-label="Изменить ширину текста справа"
                            onPointerDown={(e) => beginCanvasEdit('text-resize-right', e)}
                            onPointerMove={moveCanvasEdit}
                            onPointerUp={endCanvasEdit}
                            onPointerCancel={endCanvasEdit}
                            className="absolute top-1/2 -right-2 -translate-y-1/2 w-3 h-6 rounded-full bg-violet-500/90 border border-white cursor-ew-resize touch-none shadow z-20"
                          />
                        </>
                      )}

                      {starTextStyle.accent === 'line' && (
                        <div
                          className="h-0.5 w-16 rounded-full"
                          style={{
                            background: cardColors.isLightPaper
                              ? `linear-gradient(90deg, ${cardColors.accentColor}, ${cardColors.badgeColor})`
                              : `linear-gradient(90deg, ${activeStarGlow.hex}, ${activeStarGlow.coreHex})`,
                            marginLeft: effectiveAlign === 'left' ? 0 : 'auto',
                            marginRight: effectiveAlign === 'center' ? 'auto' : 0,
                          }}
                        />
                      )}

                      {/* Star Ordinal & Title */}
                      <div className="space-y-1 w-full">
                        <p
                          className={`tabular-nums ${
                            isMinimalistTheme
                              ? 'text-[11px] font-semibold uppercase tracking-[0.16em]'
                              : 'text-xs sm:text-sm font-medium tracking-wide'
                          }`}
                          style={{
                            fontFamily: isMinimalistTheme ? sansFontMeta.cssFamily : undefined,
                            color: cardColors.isLightPaper
                              ? cardColors.badgeColor
                              : activeStarGlow.coreHex,
                          }}
                        >
                          {isMinimalistTheme
                            ? `Звезда ${String(activeIndex + 1).padStart(2, '0')} / ${String(totalStars).padStart(2, '0')}`
                            : `Звезда ${activeIndex + 1} из ${totalStars}`}
                        </p>
                        {editMode && activeInlineField === 'starTitle' ? (
                          <input
                            ref={storyInlineInputRef}
                            type="text"
                            maxLength={30}
                            value={activeStar.title}
                            placeholder={`Звезда ${activeIndex + 1}`}
                            data-testid="inline-edit-starTitle"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              onPatchStar?.(activeStar.id, {
                                title: e.target.value,
                                isDraft: false,
                              })
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === 'Escape') {
                                e.preventDefault();
                                setActiveInlineField(null);
                              }
                            }}
                            onBlur={() => setActiveInlineField(null)}
                            style={{
                              fontFamily: starFontMeta.cssFamily,
                              fontSize: `${effectiveTitlePx}px`,
                              fontWeight: 600,
                              lineHeight: Math.min(
                                1.4,
                                Math.max(1.12, Number((starTextStyle.lineHeight * 0.78).toFixed(2))),
                              ),
                              color: effectiveStarTextColor,
                              textShadow: resolvedTextShadow,
                              textAlign: effectiveAlign,
                              borderColor: `${cardColors.accentColor}88`,
                            }}
                            className="w-full rounded-xl border bg-black/20 px-2.5 py-1 outline-none"
                          />
                        ) : (
                          <h2
                            data-selectable-text={editMode ? undefined : 'true'}
                            data-inline-field={editMode ? 'starTitle' : undefined}
                            data-testid="card-text-starTitle"
                            title={editMode ? 'Нажми, чтобы изменить название звезды' : undefined}
                            style={{
                              fontFamily: starFontMeta.cssFamily,
                              fontSize: `${effectiveTitlePx}px`,
                              fontWeight: 600,
                              lineHeight: Math.min(
                                1.4,
                                Math.max(1.12, Number((starTextStyle.lineHeight * 0.78).toFixed(2))),
                              ),
                              color: effectiveStarTextColor,
                              textShadow: resolvedTextShadow,
                            }}
                            className={`leading-tight [text-wrap:balance] break-words [overflow-wrap:anywhere] ${
                              editMode
                                ? 'select-none cursor-text rounded-lg px-1 -mx-1 hover:bg-black/10 transition-colors'
                                : 'select-text'
                            }`}
                          >
                            {activeStar.title || `Звезда ${activeIndex + 1}`}
                          </h2>
                        )}
                      </div>

                      {/* Personal Wish Message */}
                      {editMode && activeInlineField === 'starMessage' ? (
                        <textarea
                          ref={storyInlineTextareaRef}
                          rows={4}
                          maxLength={180}
                          value={activeStar.message}
                          placeholder="Напиши пожелание для этой звезды..."
                          data-testid="inline-edit-starMessage"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            onPatchStar?.(activeStar.id, {
                              message: e.target.value,
                              isDraft: false,
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              setActiveInlineField(null);
                            }
                          }}
                          onBlur={() => setActiveInlineField(null)}
                          style={{
                            fontFamily: starFontMeta.cssFamily,
                            fontSize: `${effectiveBodyPx}px`,
                            fontWeight: starTextStyle.fontWeight === 'semibold' ? 600 : 400,
                            lineHeight: starTextStyle.lineHeight,
                            color: effectiveStarTextColor,
                            textShadow: resolvedTextShadow,
                            textAlign: effectiveAlign,
                            borderColor: `${cardColors.accentColor}88`,
                          }}
                          className="w-full rounded-xl border bg-black/20 px-2.5 py-1.5 outline-none resize-y"
                        />
                      ) : (
                        <p
                          data-selectable-text={editMode ? undefined : 'true'}
                          data-inline-field={editMode ? 'starMessage' : undefined}
                          data-testid="card-text-starMessage"
                          title={editMode ? 'Нажми, чтобы изменить текст звезды' : undefined}
                          style={{
                            fontFamily: starFontMeta.cssFamily,
                            fontSize: `${effectiveBodyPx}px`,
                            fontWeight: starTextStyle.fontWeight === 'semibold' ? 600 : 400,
                            lineHeight: starTextStyle.lineHeight,
                            color: effectiveStarTextColor,
                            textShadow: resolvedTextShadow,
                          }}
                          className={`whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${
                            editMode
                              ? 'select-none cursor-text rounded-lg px-1 -mx-1 hover:bg-black/10 transition-colors'
                              : 'select-text'
                          }`}
                        >
                          {activeStar.message || 'Здесь хранится особое тёплое пожелание.'}
                        </p>
                      )}

                      {/* Signature Attribution */}
                      {editMode && activeInlineField === 'senderName' ? (
                        <input
                          ref={storyInlineInputRef}
                          type="text"
                          maxLength={40}
                          value={project.senderName ?? ''}
                          placeholder="Твоё имя"
                          data-testid="inline-edit-senderName"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            onPatchProject?.({ senderName: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Escape') {
                              e.preventDefault();
                              setActiveInlineField(null);
                            }
                          }}
                          onBlur={() => setActiveInlineField(null)}
                          style={{
                            color: effectiveStarTextColor,
                            fontSize: `${Math.max(14, Math.min(22, Math.round(effectiveBodyPx * 0.8)))}px`,
                            textShadow: resolvedTextShadow,
                            textAlign: effectiveAlign,
                            borderColor: `${cardColors.accentColor}88`,
                          }}
                          className="w-48 max-w-full rounded-lg border bg-black/20 px-2 py-0.5 italic outline-none"
                        />
                      ) : (signatureText || editMode) ? (
                        <p
                          data-selectable-text={editMode ? undefined : 'true'}
                          data-inline-field={editMode ? 'senderName' : undefined}
                          data-testid="card-text-senderName"
                          title={editMode ? 'Нажми, чтобы изменить подпись' : undefined}
                          style={{
                            color: effectiveStarTextColor,
                            fontSize: `${Math.max(14, Math.min(22, Math.round(effectiveBodyPx * 0.8)))}px`,
                            opacity: signatureText ? 0.82 : 0.54,
                            textShadow: resolvedTextShadow,
                          }}
                          className={`italic tracking-wide ${
                            editMode
                              ? 'select-none cursor-text rounded-lg px-1 -mx-1 hover:bg-black/10 transition-colors inline-flex items-center gap-1'
                              : 'select-text'
                          }`}
                        >
                          {signatureText ? (
                            `— ${signatureText}`
                          ) : (
                            <>
                              <Pencil className="w-3.5 h-3.5 opacity-70" />
                              <span>— Добавить подпись</span>
                            </>
                          )}
                        </p>
                      ) : null}
                    </div>

                    <div style={{ flexGrow: bottomInnerGrow, flexBasis: 0 }} />
                  </motion.article>
                </AnimatePresence>
              </div>

              {/* Stably Mounted Secondary Controls + Unobtrusive Swipe Hint */}
              <div
                data-no-swipe="true"
                className={`w-full max-w-xl pt-3 shrink-0 flex items-center gap-3 ${
                  isPortrait ? 'mx-auto justify-between' : 'justify-between'
                }`}
              >
                <button
                  type="button"
                  disabled={activeIndex <= 0 || isTransitioning}
                  onClick={() => navigateStory({ type: 'prev' })}
                  aria-label="Предыдущая звезда"
                  className="gl-btn-icon !rounded-full !bg-gl-panel/75 hover:!bg-gl-card text-gl-text"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Unobtrusive Animated Swipe Guidance */}
                <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-gl-text-secondary/90 text-center px-1 select-none">
                  <span
                    className={`inline-flex items-center ${
                      reducedMotion ? '' : 'animate-nudge-left'
                    }`}
                    aria-hidden="true"
                  >
                    <ChevronLeft
                      className={`w-3.5 h-3.5 ${
                        isLastStar ? 'text-amber-300' : 'text-gl-accent-light'
                      }`}
                    />
                  </span>
                  <span className={isLastStar ? 'text-amber-100/95 font-medium' : ''}>
                    {isLastStar
                      ? 'Свайп влево завершит создание созвездия'
                      : 'Свайп влево — следующая звезда'}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={isTransitioning}
                  onClick={() => navigateStory({ type: 'next' })}
                  aria-label={
                    isLastStar ? 'Завершить и зажечь созвездие' : 'Следующая звезда'
                  }
                  title={
                    isLastStar ? 'Зажечь всё созвездие' : 'Следующая звезда'
                  }
                  className={`gl-btn-icon !rounded-full ${
                    isLastStar
                      ? '!border-amber-300/45 !bg-amber-500/20 hover:!bg-amber-500/35 text-amber-200'
                      : '!bg-gl-panel/75 hover:!bg-gl-card text-gl-text'
                  }`}
                >
                  {isLastStar ? (
                    <Sparkles className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {!editMode && (
            <FinalLetterCard
              project={project}
              deviceMode={activeDevice}
              signatureText={signatureText}
              isPortrait={isPortrait}
              isCompactLandscape={isCompactLandscape}
              reducedMotion={reducedMotion}
              isOpen={quickLetterOpen}
              onClose={() => setQuickLetterOpen(false)}
              editMode={false}
            />
          )}
        </div>
      )}

      {/* PHASE 4: Final Constellation Birth Choreography */}
      {phase === 'finalReveal' && (
        <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-6 gl-safe-top gl-safe-bottom">
          <div className="flex items-start justify-between gap-3">
            <div className="pointer-events-auto">
              {onExitPreview && (
                <button
                  type="button"
                  onClick={onExitPreview}
                  className="gl-btn-secondary !bg-gl-panel/85 hover:!bg-gl-card text-gl-text !px-3 !py-2 text-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  В редактор
                </button>
              )}
            </div>

            <div className="pointer-events-auto flex items-center gap-2">
              {project.musicTrackId !== 'none' && (
                <button
                  type="button"
                  onClick={toggleSound}
                  className="gl-btn-secondary !bg-gl-panel/88 hover:!bg-gl-card text-gl-text !px-3 !py-2 text-xs"
                >
                  {musicMuted || !musicPlaying ? (
                    <VolumeX className="w-3.5 h-3.5 text-amber-300" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-gl-accent-light" />
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={handleSkipFinalReveal}
                className="gl-btn-secondary !bg-gl-panel/88 hover:!bg-gl-card text-gl-text !px-3.5 !py-2 text-xs"
              >
                <FastForward className="w-3.5 h-3.5" />
                Пропустить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 5: Final Rotating 3D Constellation + Emerging Paper Letter */}
      {phase === 'constellation' && (
        <>
          {onExitPreview && (
            <div className="pointer-events-auto fixed top-4 left-4 sm:top-5 sm:left-6 z-30 gl-safe-top">
              <button
                type="button"
                onClick={onExitPreview}
                className="gl-btn-secondary !bg-gl-panel/85 hover:!bg-gl-card text-gl-text !px-3 !py-2 text-xs shadow-lg"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                В редактор
              </button>
            </div>
          )}

          {!(editMode && selectedTarget === 'constellation') && (
            <div
              data-testid="constellation-finale-title"
              className="pointer-events-none fixed inset-x-0 top-0 z-20 flex flex-col items-center text-center px-16 sm:px-24 pt-4 sm:pt-5 gl-safe-top"
            >
              <span
                className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] opacity-80"
                style={{ color: palette.lineTint }}
              >
                ✦ Созвездие ✦
              </span>
              <h2
                className="mt-0.5 text-base sm:text-xl md:text-2xl font-bold tracking-tight text-white max-w-[min(80vw,540px)] whitespace-normal break-words [overflow-wrap:anywhere] leading-snug"
                style={{
                  textShadow: `0 2px 16px rgba(4, 6, 20, 0.9), 0 0 22px ${globalGlow.hex}66`,
                }}
              >
                {project.title.trim() || 'Моё созвездие'}
              </h2>
              <div
                className="mt-1.5 h-px w-24 sm:w-32 opacity-75"
                style={{
                  background: `linear-gradient(90deg, transparent, ${globalGlow.hex}, transparent)`,
                }}
                aria-hidden="true"
              />
            </div>
          )}

          {!editMode && (
            <div className="pointer-events-auto fixed top-4 right-4 sm:top-5 sm:right-6 z-30 gl-safe-top flex items-center gap-2">
              <button
                type="button"
                data-testid="recipient-letter-toggle-btn"
                onClick={() => setLetterOpen((v) => !v)}
                aria-pressed={letterOpen}
                aria-label={
                  letterOpen
                    ? 'Скрыть письмо и любоваться созвездием'
                    : 'Открыть финальное письмо'
                }
                title={letterOpen ? 'Скрыть письмо' : 'Открыть финальное письмо'}
                className={`inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full border backdrop-blur-md transition-all shadow-lg cursor-pointer ${
                  letterOpen
                    ? 'bg-amber-400/25 border-amber-300/60 text-amber-100 hover:bg-amber-400/35'
                    : 'bg-[#0b0816]/60 border-white/25 text-white hover:bg-[#0b0816]/80 hover:border-white/45'
                }`}
              >
                {letterOpen ? (
                  <MailOpen className="w-4 h-4" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
              </button>
            </div>
          )}

          {/* Direct drag & scale sky surface when editing Constellation layout in editMode */}
          {editMode && selectedTarget === 'constellation' && (
            <div
              data-testid="constellation-layout-overlay"
              onPointerDown={(e) => beginCanvasEdit('constellation-move', e)}
              onPointerMove={moveCanvasEdit}
              onPointerUp={endCanvasEdit}
              onPointerCancel={endCanvasEdit}
              onWheel={(e) => {
                e.preventDefault();
                const delta = e.deltaY < 0 ? 0.06 : -0.06;
                const nextScale = Math.max(
                  0.55,
                  Math.min(1.45, Number((constellationLayout.scale + delta).toFixed(2))),
                );
                onPatchProject?.(
                  buildProjectConstellationDevicePatch(project, activeDevice, {
                    scale: nextScale,
                  }),
                );
              }}
              className="fixed inset-x-0 top-0 bottom-0 z-20 cursor-grab active:cursor-grabbing touch-none flex flex-col items-center justify-between pt-4 pb-3 px-4"
            >
              <div
                onPointerDown={(e) => e.stopPropagation()}
                className="gl-hud px-3.5 py-2 flex items-center gap-2.5 text-xs text-gl-text shadow-xl max-w-[92vw]"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="truncate">
                  Перетаскивай созвездие по небу
                </span>
                <div className="flex items-center gap-1 shrink-0 pl-1 border-l border-white/15">
                  <button
                    type="button"
                    aria-label="Уменьшить созвездие"
                    onClick={() =>
                      onPatchProject?.(
                        buildProjectConstellationDevicePatch(project, activeDevice, {
                          scale: Math.max(
                            0.55,
                            Number((constellationLayout.scale - 0.08).toFixed(2)),
                          ),
                        }),
                      )
                    }
                    className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center justify-center cursor-pointer"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    aria-label="Увеличить созвездие"
                    onClick={() =>
                      onPatchProject?.(
                        buildProjectConstellationDevicePatch(project, activeDevice, {
                          scale: Math.min(
                            1.45,
                            Number((constellationLayout.scale + 0.08).toFixed(2)),
                          ),
                        }),
                      )
                    }
                    className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onPatchProject?.(
                        buildProjectConstellationDevicePatch(project, activeDevice, {
                          offsetX: 0,
                          offsetY: activeDevice === 'phone' ? 8 : 0,
                          scale: activeDevice === 'phone' ? 0.78 : 1,
                        }),
                      )
                    }
                    className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-[11px] font-medium cursor-pointer"
                  >
                    По центру
                  </button>
                </div>
              </div>
            </div>
          )}

          <FinalLetterCard
            project={project}
            deviceMode={activeDevice}
            signatureText={signatureText}
            isPortrait={isPortrait}
            isCompactLandscape={isCompactLandscape}
            reducedMotion={reducedMotion}
            isOpen={letterOpen && !(editMode && selectedTarget === 'constellation')}
            onClose={() => setLetterOpen(false)}
            editMode={editMode}
            selectedTarget={selectedTarget}
            activeInlineField={activeInlineField}
            onSelectTarget={(target, field) => {
              if (field) setActiveInlineField(field);
              onSelectTarget?.(target, field);
            }}
            onCloseInlineEdit={() => setActiveInlineField(null)}
            onPatchProject={onPatchProject}
            letterContainerRef={finaleHeaderRef}
            onBeginElementDrag={beginCanvasEdit}
            onMoveElementDrag={moveCanvasEdit}
            onEndElementDrag={endCanvasEdit}
          />
        </>
      )}
    </div>
  );
}
