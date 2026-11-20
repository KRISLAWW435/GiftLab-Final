import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Pause, Play, RotateCcw } from 'lucide-react';
import {
  COSMIC_PALETTES,
  createNewProject,
} from '../scene/paletteConfig';
import {
  ThreeDVideoSceneDriver,
  drawVideoOverlayForTime,
} from '../services/video/threeDVideoDriver';
import { preloadStarIllustrations } from '../services/video/videoCanvasPrimitives';
import {
  type DrawableImage,
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
  type VideoTimeline,
  clamp,
  computeVideoTimeline,
  rgba,
} from '../services/video/videoTimeline';
import type { ConstellationProject } from '../types/project';

type ChapterKey = 'sealed' | 'birthing' | 'star' | 'constellation';

interface ShowcaseChapter {
  key: ChapterKey;
  num: string;
  title: string;
  description: string;
  jumpTimeSec: number;
}

function buildShowcaseDemoProject(): ConstellationProject {
  const base = createNewProject(
    'mothers_day',
    'Моя вселенная для тебя',
    'Любимой мамы',
    'heart',
  );

  const showcaseStars = base.stars.slice(0, 3).map((star, idx) => {
    if (idx === 0) {
      return {
        ...star,
        shape: 'heart' as const,
        cardTheme: 'gentle_letter' as const,
        illustration: { type: 'builtin' as const, id: 'heart' as const },
        isDraft: false,
      };
    }
    if (idx === 1) {
      return {
        ...star,
        shape: 'flower' as const,
        cardTheme: 'floral' as const,
        illustration: { type: 'builtin' as const, id: 'flower' as const },
        isDraft: false,
      };
    }
    return {
      ...star,
      shape: 'moon' as const,
      cardTheme: 'cosmic_card' as const,
      illustration: { type: 'builtin' as const, id: 'moon' as const },
      isDraft: false,
    };
  });

  const connections =
    showcaseStars.length >= 3
      ? [
          { id: 'demo_c1', from: showcaseStars[0].id, to: showcaseStars[1].id },
          { id: 'demo_c2', from: showcaseStars[1].id, to: showcaseStars[2].id },
          { id: 'demo_c3', from: showcaseStars[2].id, to: showcaseStars[0].id },
        ]
      : [];

  return {
    ...base,
    id: 'showcase_demo',
    stars: showcaseStars,
    connections,
    cardTheme: 'gentle_letter',
    envelopeSettings: {
      shape: 'rounded',
      motif: 'moon',
      envelopeColor: '#E4DFF8',
      sealColor: '#D97706',
      glowIntensity: 0.9,
    },
  };
}

function formatTimeMmSs(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const mins = Math.floor(safe / 60);
  const rem = safe % 60;
  return `${mins}:${rem.toString().padStart(2, '0')}`;
}

function resolveChapterAtTime(
  timeline: VideoTimeline,
  timeSec: number,
): ChapterKey {
  const seg =
    timeline.segments.find(
      (s, i) =>
        timeSec >= s.startSec &&
        (timeSec < s.endSec || i === timeline.segments.length - 1),
    ) ?? timeline.segments[0];
  if (!seg) return 'sealed';
  if (seg.kind === 'sealed') return 'sealed';
  if (seg.kind === 'birthing') return 'birthing';
  if (seg.kind === 'star') return 'star';
  return 'constellation';
}

function render2DFallbackBackground(
  ctx: CanvasRenderingContext2D,
  project: ConstellationProject,
  timeSec: number,
): void {
  const pal = COSMIC_PALETTES[project.paletteId] ?? COSMIC_PALETTES.dawn;
  const bg = ctx.createLinearGradient(0, 0, VIDEO_WIDTH * 0.4, VIDEO_HEIGHT);
  bg.addColorStop(0, pal.deepColor);
  bg.addColorStop(0.52, pal.midColor);
  bg.addColorStop(1, pal.deepColor);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

  const nebula = ctx.createRadialGradient(
    VIDEO_WIDTH * 0.52,
    VIDEO_HEIGHT * 0.34,
    24,
    VIDEO_WIDTH * 0.52,
    VIDEO_HEIGHT * 0.34,
    VIDEO_WIDTH * 0.72,
  );
  nebula.addColorStop(0, rgba(pal.nebulaPrimary, 0.28));
  nebula.addColorStop(0.6, rgba(pal.nebulaSecondary, 0.14));
  nebula.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = nebula;
  ctx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

  for (let i = 0; i < 42; i++) {
    const px = ((i * 137.5) % 100) * 0.01 * VIDEO_WIDTH;
    const py = ((i * 73.1) % 100) * 0.01 * VIDEO_HEIGHT;
    const twinkle = 0.28 + 0.55 * (0.5 + 0.5 * Math.sin(timeSec * 1.9 + i * 1.7));
    const r = (i % 3 === 0 ? 1.8 : 1.1);
    ctx.fillStyle = `rgba(255, 255, 255, ${twinkle.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

interface HeroVideoShowcaseProps {
  onUseDemoTemplate?: () => void;
}

export function HeroVideoShowcase({ onUseDemoTemplate }: HeroVideoShowcaseProps) {
  const demoProject = useMemo(() => buildShowcaseDemoProject(), []);
  const timeline = useMemo(() => computeVideoTimeline(demoProject), [demoProject]);

  const chapters = useMemo<ShowcaseChapter[]>(() => {
    const sealedSeg = timeline.segments.find((s) => s.kind === 'sealed');
    const birthSeg = timeline.segments.find((s) => s.kind === 'birthing');
    const firstStarSeg = timeline.segments.find((s) => s.kind === 'star');
    const finaleSeg =
      timeline.segments.find((s) => s.kind === 'constellation') ??
      timeline.segments.find((s) => s.kind === 'finalReveal');

    return [
      {
        key: 'sealed',
        num: '01',
        title: 'Соберите запечатанный 3D-конверт',
        description:
          'Выберите цвет бумаги, сургучную печать, арочный или классический клапан и штамп — от полумесяца до цветов.',
        jumpTimeSec: (sealedSeg?.startSec ?? 0) + 0.45,
      },
      {
        key: 'birthing',
        num: '02',
        title: 'Настройте сцену и форму созвездия',
        description:
          'Подберите космическое небо, сияние, фоновую мелодию и композицию, в которую выстроятся звёзды при открытии.',
        jumpTimeSec: (birthSeg?.startSec ?? 1.65) + 0.85,
      },
      {
        key: 'star',
        num: '03',
        title: 'Наполните каждую звезду историями и фото',
        description:
          'Подпишите звёзды, добавьте картинки или свои фотографии, выберите шрифты и стиль карточек для телефона и ПК.',
        jumpTimeSec: (firstStarSeg?.startSec ?? 5.5) + 0.65,
      },
      {
        key: 'constellation',
        num: '04',
        title: 'Отправьте готовый подарок или MP4-видео',
        description:
          'В финале откроется всё созвездие с главным посланием. Скачайте автономный файл-открытку или видео 9:16.',
        jumpTimeSec: (finaleSeg?.startSec ?? timeline.totalDurationSec - 5) + 0.85,
      },
    ];
  }, [timeline]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const driverRef = useRef<ThreeDVideoSceneDriver | null>(null);
  const illustrationsRef = useRef<Map<string, DrawableImage>>(new Map());
  const useFallback2DRef = useRef(false);
  const simTimeRef = useRef(0.35);

  const [isVisible, setIsVisible] = useState(true);
  const [isPlaying, setIsPlaying] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  const [currentTime, setCurrentTime] = useState(0.35);
  const [driverReady, setDriverReady] = useState(false);

  const initDriver = useCallback((): ThreeDVideoSceneDriver | null => {
    if (driverRef.current) {
      driverRef.current.dispose();
      driverRef.current = null;
    }
    try {
      const driver = new ThreeDVideoSceneDriver(demoProject);
      driverRef.current = driver;
      useFallback2DRef.current = false;
      return driver;
    } catch {
      useFallback2DRef.current = true;
      return null;
    }
  }, [demoProject]);

  const drawFrameAt = useCallback(
    (targetTime: number, forceSeekReset = false) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const clampedTarget = clamp(targetTime, 0, Math.max(0.05, timeline.totalDurationSec - 0.04));

      if (useFallback2DRef.current) {
        render2DFallbackBackground(ctx, demoProject, clampedTarget);
        drawVideoOverlayForTime(
          ctx,
          demoProject,
          timeline,
          illustrationsRef.current,
          clampedTarget,
        );
        simTimeRef.current = clampedTarget;
        return;
      }

      let driver = driverRef.current;
      if (!driver || forceSeekReset || clampedTarget < simTimeRef.current) {
        driver = initDriver();
        simTimeRef.current = 0;
      }

      if (!driver) {
        render2DFallbackBackground(ctx, demoProject, clampedTarget);
        drawVideoOverlayForTime(
          ctx,
          demoProject,
          timeline,
          illustrationsRef.current,
          clampedTarget,
        );
        simTimeRef.current = clampedTarget;
        return;
      }

      const delta = clampedTarget - simTimeRef.current;
      if (delta > 0.08) {
        const step = 1 / 18;
        let t = simTimeRef.current;
        while (t + step < clampedTarget) {
          t += step;
          driver.advanceSimulationOnly(timeline, t, step);
        }
        const tailDt = Math.max(1 / 60, clampedTarget - t);
        driver.renderFrameAtTime(
          ctx,
          timeline,
          illustrationsRef.current,
          clampedTarget,
          tailDt,
        );
      } else {
        driver.renderFrameAtTime(
          ctx,
          timeline,
          illustrationsRef.current,
          clampedTarget,
          Math.max(1 / 60, delta),
        );
      }
      simTimeRef.current = clampedTarget;
    },
    [demoProject, initDriver, timeline],
  );

  // Preload builtin SVG illustrations and render initial frame
  useEffect(() => {
    let active = true;
    const ctrl = new AbortController();

    preloadStarIllustrations(demoProject, ctrl.signal)
      .then((map) => {
        if (!active) return;
        illustrationsRef.current = map;
        drawFrameAt(simTimeRef.current, true);
        setDriverReady(true);
      })
      .catch(() => {
        if (!active) return;
        drawFrameAt(simTimeRef.current, true);
        setDriverReady(true);
      });

    return () => {
      active = false;
      ctrl.abort();
      if (driverRef.current) {
        driverRef.current.dispose();
        driverRef.current = null;
      }
    };
  }, [demoProject, drawFrameAt]);

  // Pause rendering when scrolled offscreen
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setIsVisible(entry.isIntersecting);
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Playback loop synced to existing video timeline
  useEffect(() => {
    if (!driverReady || !isPlaying || !isVisible) return;

    let rafId = 0;
    let lastNow = performance.now();
    let acc = 0;
    const frameInterval = 1 / VIDEO_FPS;

    const tick = (now: number) => {
      if (document.hidden) {
        lastNow = now;
        rafId = requestAnimationFrame(tick);
        return;
      }

      const elapsed = Math.min(0.12, (now - lastNow) / 1000);
      lastNow = now;
      acc += elapsed;

      if (acc >= frameInterval) {
        const stepDt = acc;
        acc = 0;
        let nextTime = simTimeRef.current + stepDt;
        let looped = false;
        if (nextTime >= timeline.totalDurationSec - 0.05) {
          nextTime = 0;
          looped = true;
        }
        drawFrameAt(nextTime, looped);
        setCurrentTime(nextTime);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [driverReady, drawFrameAt, isPlaying, isVisible, timeline.totalDurationSec]);

  const handleSeek = useCallback(
    (targetTime: number) => {
      const safe = clamp(targetTime, 0, Math.max(0.05, timeline.totalDurationSec - 0.05));
      drawFrameAt(safe, safe < simTimeRef.current);
      setCurrentTime(safe);
    },
    [drawFrameAt, timeline.totalDurationSec],
  );

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    handleSeek(ratio * timeline.totalDurationSec);
  };

  const activeChapter = resolveChapterAtTime(timeline, currentTime);
  const progressPct =
    timeline.totalDurationSec > 0
      ? clamp((currentTime / timeline.totalDurationSec) * 100, 0, 100)
      : 0;

  return (
    <section
      ref={containerRef}
      data-testid="hero-video-showcase"
      className="gl-card p-5 sm:p-7 lg:p-8 space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-white/10 pb-4">
        <div className="space-y-1">
          <h2 className="gl-title-display font-display text-xl sm:text-2xl font-bold text-white">
            Как выглядит подарок и что можно настроить
          </h2>
          <p className="text-sm sm:text-base text-gl-text-secondary">
            Живой пример в формате видеооткрытки 9:16 — нажмите на любой этап, чтобы перейти к нему.
          </p>
        </div>
        <div className="text-xs sm:text-sm text-gl-text-muted whitespace-nowrap shrink-0 tabular-nums">
          <span>Видео-превью 9:16</span>
          <span aria-hidden="true"> · </span>
          <span>{formatTimeMmSs(timeline.totalDurationSec)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-9 items-center">
        {/* Left: Real 9:16 Video Preview Player */}
        <div className="lg:col-span-5 flex flex-col items-center gap-3.5">
          <div className="relative w-full max-w-[272px] sm:max-w-[292px] rounded-[28px] p-2 bg-slate-950/85 border border-white/15 shadow-[0_24px_60px_rgba(6,3,18,0.65)]">
            <div className="relative w-full aspect-[9/16] rounded-[20px] overflow-hidden bg-[#070411]">
              <canvas
                ref={canvasRef}
                width={VIDEO_WIDTH}
                height={VIDEO_HEIGHT}
                onClick={() => setIsPlaying((p) => !p)}
                className="w-full h-full block cursor-pointer"
                aria-label="Видео-превью готового подарка GiftLab"
              />
            </div>
          </div>

          {/* Video Transport Controls */}
          <div className="w-full max-w-[292px] space-y-2.5">
            <div
              role="slider"
              tabIndex={0}
              aria-label="Позиция видео-превью"
              aria-valuemin={0}
              aria-valuemax={Math.round(timeline.totalDurationSec)}
              aria-valuenow={Math.round(currentTime)}
              onClick={handleTimelineClick}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') handleSeek(currentTime + 1.5);
                if (e.key === 'ArrowLeft') handleSeek(currentTime - 1.5);
              }}
              className="h-2.5 w-full rounded-full bg-white/12 hover:bg-white/18 cursor-pointer overflow-hidden flex items-center"
            >
              <div
                className="h-full bg-gradient-to-r from-violet-400 to-amber-300 rounded-full transition-[width] duration-75"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="showcase-play-toggle"
                  onClick={() => setIsPlaying((p) => !p)}
                  className="gl-btn-secondary !min-h-[38px] !px-3.5 text-xs sm:text-sm whitespace-nowrap shrink-0"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      Пауза
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      Смотреть
                    </>
                  )}
                </button>
                <button
                  type="button"
                  data-testid="showcase-restart"
                  onClick={() => {
                    handleSeek(0);
                    setIsPlaying(true);
                  }}
                  title="Начать сначала"
                  aria-label="Начать сначала"
                  className="gl-btn-icon !w-[38px] !h-[38px] !min-h-[38px] shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              <span className="text-xs sm:text-sm text-gl-text-muted tabular-nums whitespace-nowrap shrink-0">
                {formatTimeMmSs(currentTime)} / {formatTimeMmSs(timeline.totalDurationSec)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Interactive 4-Step Guide synced to video chapters */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-5">
          <div className="divide-y divide-white/10">
            {chapters.map((chapter) => {
              const active = activeChapter === chapter.key;
              return (
                <button
                  key={chapter.key}
                  type="button"
                  data-testid={`showcase-step-${chapter.key}`}
                  onClick={() => handleSeek(chapter.jumpTimeSec)}
                  className={`w-full text-left py-4 px-4 -mx-1 rounded-2xl transition-colors cursor-pointer flex items-start gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
                    active
                      ? 'bg-white/[0.08] border border-violet-300/35'
                      : 'border border-transparent hover:bg-white/[0.04]'
                  }`}
                >
                  <span
                    className={`font-display text-base sm:text-lg font-bold tabular-nums shrink-0 pt-0.5 ${
                      active ? 'text-amber-300' : 'text-violet-300/75'
                    }`}
                  >
                    {chapter.num}.
                  </span>
                  <div className="space-y-1 min-w-0">
                    <div className="text-sm sm:text-base font-semibold text-white">
                      {chapter.title}
                    </div>
                    <p className="text-xs sm:text-sm text-gl-text-secondary leading-relaxed">
                      {chapter.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {onUseDemoTemplate && (
            <div className="pt-1 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs sm:text-sm text-gl-text-muted">
                Создание занимает 3–5 минут прямо в браузере.
              </p>
              <button
                type="button"
                onClick={onUseDemoTemplate}
                className="gl-btn-primary !min-h-[44px] px-5 text-sm whitespace-nowrap shrink-0"
              >
                Собрать свой подарок
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
