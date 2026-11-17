import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Hand,
  Monitor,
  MousePointer2,
  MoveVertical,
  Rotate3d,
  Smartphone,
  Sparkles,
  X,
  ZoomIn,
} from 'lucide-react';

export const CANVAS_TUTORIAL_STORAGE_KEY = 'giftlab_canvas_tutorial_done_v1';

export type TutorialStep = 'overview' | 'practice';

interface CanvasTutorialOverlayProps {
  open: boolean;
  step: TutorialStep;
  movedStar: boolean;
  rotatedScene: boolean;
  onStartPractice: () => void;
  onComplete: () => void;
  onDismiss: () => void;
}

function detectTouchViewport(): boolean {
  if (typeof window === 'undefined') return false;
  const coarse =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;
  return coarse || window.innerWidth < 1024;
}

const DESKTOP_CONTROLS = [
  {
    id: 'lmb',
    keyLabel: 'ЛКМ',
    title: 'Перемещение звезды',
    desc: 'Зажмите звезду левой кнопкой и перетащите в нужное место.',
    icon: MousePointer2,
  },
  {
    id: 'rmb',
    keyLabel: 'ПКМ',
    title: 'Вращение камеры',
    desc: 'Зажмите правую кнопку на сцене, чтобы осмотреть созвездие со всех сторон.',
    icon: Rotate3d,
  },
  {
    id: 'wheel',
    keyLabel: 'Колесо мыши',
    title: 'Масштабирование',
    desc: 'Крутите колесо мыши, чтобы приблизить или отдалить сцену.',
    icon: ZoomIn,
  },
  {
    id: 'shift',
    keyLabel: 'Shift + перетаскивание',
    title: 'Изменение глубины',
    desc: 'Удерживайте Shift и двигайте звезду вверх-вниз, чтобы выдвинуть её вперёд или вглубь.',
    icon: MoveVertical,
  },
] as const;

const TOUCH_CONTROLS = [
  {
    id: 'drag',
    keyLabel: '1 палец по звезде',
    title: 'Перемещение звезды',
    desc: 'В режиме «Расположение» коснитесь нужной звезды и перетащите её по небу.',
    icon: Hand,
  },
  {
    id: 'orbit',
    keyLabel: '1 палец по пустому небу',
    title: 'Вращение сцены',
    desc: 'Проведите одним пальцем по свободному месту на сцене, чтобы осмотреть созвездие.',
    icon: Rotate3d,
  },
  {
    id: 'pinch',
    keyLabel: '2 пальца',
    title: 'Масштабирование',
    desc: 'Сводите или разводите два пальца, чтобы приблизить или отдалить сцену.',
    icon: ZoomIn,
  },
  {
    id: 'select',
    keyLabel: 'Этап «Мои звёзды»',
    title: 'Выбор и настройка',
    desc: 'Переключайтесь между сценой и этапами мастерской на панели.',
    icon: Sparkles,
  },
] as const;

export function CanvasTutorialOverlay({
  open,
  step,
  movedStar,
  rotatedScene,
  onStartPractice,
  onComplete,
  onDismiss,
}: CanvasTutorialOverlayProps) {
  const [deviceTab, setDeviceTab] = useState<'desktop' | 'mobile'>(() =>
    detectTouchViewport() ? 'mobile' : 'desktop',
  );

  useEffect(() => {
    if (open && step === 'overview') {
      setDeviceTab(detectTouchViewport() ? 'mobile' : 'desktop');
    }
  }, [open, step]);

  if (!open) return null;

  const bothDone = movedStar && rotatedScene;

  if (step === 'practice') {
    return (
      <div className="pointer-events-none fixed md:absolute inset-x-3 top-28 md:top-3 md:inset-x-auto md:left-3 z-30 flex justify-start">
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-auto gl-hud !rounded-2xl w-full max-w-[330px] p-3.5 shadow-2xl border border-gl-accent/40 space-y-2.5"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gl-accent-light">
                Попробуй прямо сейчас
              </p>
              <h3 className="font-display text-sm font-bold text-gl-text leading-snug mt-0.5">
                {bothDone
                  ? 'Отлично! Управление освоено'
                  : 'Сделай два простых действия на сцене'}
              </h3>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Закрыть подсказку"
              className="gl-btn-icon !min-w-[28px] !min-h-[28px] !w-7 !h-7 !p-0 border-transparent bg-transparent text-gl-text-muted hover:text-white shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            <div
              data-done={movedStar}
              className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-xs transition-colors ${
                movedStar
                  ? 'border-emerald-400/45 bg-emerald-500/15 text-emerald-100'
                  : 'border-white/10 bg-white/[0.04] text-gl-text-secondary'
              }`}
            >
              {movedStar ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-gl-text-muted shrink-0" />
              )}
              <span className="leading-snug">
                {deviceTab === 'mobile'
                  ? 'Перемести любую звезду пальцем'
                  : 'Перемести звезду (ЛКМ + перетаскивание)'}
              </span>
            </div>

            <div
              data-done={rotatedScene}
              className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-xs transition-colors ${
                rotatedScene
                  ? 'border-emerald-400/45 bg-emerald-500/15 text-emerald-100'
                  : 'border-white/10 bg-white/[0.04] text-gl-text-secondary'
              }`}
            >
              {rotatedScene ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-gl-text-muted shrink-0" />
              )}
              <span className="leading-snug">
                {deviceTab === 'mobile'
                  ? 'Поверни сцену одним пальцем по пустому месту'
                  : 'Поверни сцену (ПКМ + перетаскивание)'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-0.5">
            <button
              type="button"
              onClick={bothDone ? onComplete : onDismiss}
              className={
                bothDone
                  ? 'gl-btn-primary !min-h-[34px] !px-3.5 !py-1.5 text-xs w-full'
                  : 'gl-btn-secondary !min-h-[32px] !px-3 !py-1 text-xs'
              }
            >
              {bothDone ? 'Готово' : 'Пропустить'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const controls = deviceTab === 'desktop' ? DESKTOP_CONTROLS : TOUCH_CONTROLS;

  return (
    <div
      className="pointer-events-auto fixed lg:absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-5 bg-[#06040a]/65 md:backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="canvas-tutorial-title"
    >
      <div className="gl-glass-panel !rounded-2xl w-full max-w-md border border-gl-accent/35 shadow-2xl p-4 sm:p-5 space-y-3.5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gl-accent-light">
              Управление 3D-холстом
            </p>
            <h2
              id="canvas-tutorial-title"
              className="font-display text-base sm:text-lg font-bold text-gl-text mt-0.5"
            >
              Как двигать звёзды и камеру
            </h2>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            aria-label="Закрыть обучение"
            className="gl-btn-icon !min-w-[32px] !min-h-[32px] !w-8 !h-8 !p-0 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Device Hint Switcher: Desktop mouse controls vs Touch gestures */}
        <div className="gl-tab-group grid-cols-2 rounded-xl border border-white/10">
          <button
            type="button"
            data-selected={deviceTab === 'desktop'}
            onClick={() => setDeviceTab('desktop')}
            className="gl-tab flex items-center justify-center gap-1.5 !min-h-[36px] text-xs"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Мышь</span>
          </button>
          <button
            type="button"
            data-selected={deviceTab === 'mobile'}
            onClick={() => setDeviceTab('mobile')}
            className="gl-tab flex items-center justify-center gap-1.5 !min-h-[36px] text-xs"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Телефон / сенсор</span>
          </button>
        </div>

        <div className="space-y-2">
          {controls.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
              >
                <div className="w-8 h-8 rounded-lg bg-gl-accent/18 border border-gl-accent/35 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-gl-accent-light" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-xs font-bold text-amber-300">
                      {item.keyLabel}
                    </span>
                    <span className="text-xs font-semibold text-gl-text">
                      — {item.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-gl-text-muted leading-relaxed mt-0.5">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={onDismiss}
            className="gl-btn-secondary !min-h-[38px] text-xs"
          >
            Понятно
          </button>
          <button
            type="button"
            onClick={onStartPractice}
            className="gl-btn-primary !min-h-[38px] text-xs flex-1 sm:flex-none"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Попробовать на сцене
          </button>
        </div>
      </div>
    </div>
  );
}
