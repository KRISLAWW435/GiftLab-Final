import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  Eye,
  Mail,
  Maximize,
  Minimize,
  Sparkles,
  Star,
} from 'lucide-react';
import type { WorkshopStepId } from '../EditorLayout';

export interface WorkshopStepMeta {
  id: WorkshopStepId;
  num: number;
  label: string;
  icon: typeof Star;
}

export const WORKSHOP_STEPS: WorkshopStepMeta[] = [
  { id: 'stars', num: 1, label: 'Мои звёзды', icon: Star },
  { id: 'constellation', num: 2, label: 'Созвездие и атмосфера', icon: Sparkles },
  { id: 'card', num: 3, label: 'Открытка', icon: Mail },
  { id: 'preview', num: 4, label: 'Предпросмотр', icon: Eye },
];

interface WorkshopTopHeaderProps {
  projectTitle: string;
  saveState: 'saved' | 'saving';
  activeStep: WorkshopStepId;
  stepCompleted: Record<WorkshopStepId, boolean>;
  isFullscreen: boolean;
  onBackToProjects: () => void;
  onGoToStep: (step: WorkshopStepId) => void;
  onToggleFullscreen: () => void;
  onOpenExport: () => void;
}

export function WorkshopTopHeader({
  projectTitle,
  saveState,
  activeStep,
  stepCompleted,
  isFullscreen,
  onBackToProjects,
  onGoToStep,
  onToggleFullscreen,
  onOpenExport,
}: WorkshopTopHeaderProps) {
  return (
    <header className="gl-workshop-header relative z-30 shrink-0 border-b gl-glass-header pt-[env(safe-area-inset-top,0px)]">
      <div className="min-h-[44px] px-3 sm:px-4 py-1.5 flex flex-wrap lg:flex-nowrap items-center justify-between gap-x-2.5 gap-y-1.5">
        {/* Left: Back button + Project title + Saved indicator */}
        <div className="order-1 flex items-center gap-2 min-w-0 flex-1 lg:flex-none lg:max-w-[260px] xl:max-w-[300px]">
          <button
            type="button"
            onClick={onBackToProjects}
            title="К списку проектов"
            aria-label="К списку проектов"
            className="gl-btn-secondary !min-h-[32px] !px-2.5 !py-1 text-xs shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Проекты</span>
          </button>

          <div className="flex items-baseline gap-2 min-w-0">
            <h1 className="font-display text-xs sm:text-sm font-bold text-gl-text truncate">
              {projectTitle || 'Новое созвездие'}
            </h1>
            <span className="text-[11px] text-gl-text-muted shrink-0 hidden xl:inline">
              {saveState === 'saving' ? 'Сохранение...' : 'Сохранено'}
            </span>
          </div>
        </div>

        {/* Center: Horizontal Step Progress Bar */}
        <nav
          data-testid="workshop-top-nav"
          aria-label="Этапы создания подарка"
          className="gl-workshop-stepper order-3 lg:order-2 w-full lg:w-auto lg:flex-1 lg:min-w-0 border-t border-white/[0.07] bg-white/[0.02] pt-1.5 pb-1 lg:border-t-0 lg:bg-transparent lg:p-0 overflow-x-auto"
        >
          <div className="flex items-center justify-start md:justify-center gap-1 xl:gap-1.5 min-w-max mx-auto">
            {WORKSHOP_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isCurrent = activeStep === step.id;
              const isDone = stepCompleted[step.id];

              return (
                <div key={step.id} className="flex items-center gap-1 xl:gap-1.5 shrink-0">
                  <button
                    type="button"
                    data-step={step.id}
                    data-selected={isCurrent}
                    aria-current={isCurrent ? 'step' : undefined}
                    onClick={() => onGoToStep(step.id)}
                    className={`gl-workshop-step min-h-[30px] px-2 xl:px-2.5 py-1 rounded-xl border text-[11px] xl:text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                      isCurrent
                        ? 'border-violet-300/70 bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-[0_0_16px_-4px_rgba(139,92,246,0.65)]'
                        : isDone
                          ? 'border-emerald-400/25 bg-emerald-500/12 text-emerald-100 hover:bg-emerald-500/20'
                          : 'border-white/10 bg-white/[0.035] text-gl-text-secondary hover:bg-white/[0.08] hover:text-gl-text'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold tabular-nums shrink-0 ${
                        isCurrent
                          ? 'bg-white/22 text-white'
                          : isDone
                            ? 'bg-emerald-500/25 text-emerald-200'
                            : 'bg-white/10 text-gl-text-muted'
                      }`}
                    >
                      {step.num}
                    </span>
                    <Icon className="w-3 h-3 shrink-0 opacity-90 sm:hidden 2xl:inline" />
                    <span>{step.label}</span>
                    {isDone && (
                      <Check
                        className={`w-3 h-3 shrink-0 ${
                          isCurrent ? 'text-emerald-200' : 'text-emerald-300'
                        }`}
                        aria-label="Этап заполнен"
                      />
                    )}
                  </button>

                  {idx < WORKSHOP_STEPS.length - 1 && (
                    <ArrowRight
                      aria-hidden="true"
                      className="w-3 h-3 text-violet-300/60 shrink-0"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Right: Fullscreen + Preview + Download */}
        <div className="order-2 lg:order-3 flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            data-testid="editor-fullscreen-btn"
            data-fullscreen-toggle="true"
            onClick={onToggleFullscreen}
            aria-pressed={isFullscreen}
            aria-label={isFullscreen ? 'Выйти из полного экрана' : 'На весь экран'}
            title={isFullscreen ? 'Выйти из полного экрана' : 'На весь экран'}
            className="gl-btn-icon !min-w-[32px] !min-h-[32px] !w-[32px] !h-[32px] !p-0 text-gl-text shrink-0"
          >
            {isFullscreen ? (
              <Minimize className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Maximize className="w-3.5 h-3.5 shrink-0" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onGoToStep('preview')}
            title="Перейти к предпросмотру подарка"
            className="gl-btn-secondary !min-h-[32px] !px-2.5 !py-1 text-xs text-gl-text"
          >
            <Eye className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Предпросмотр</span>
          </button>

          <button
            type="button"
            data-testid="editor-download-btn"
            onClick={onOpenExport}
            title="Скачать готовую открытку"
            className="gl-btn-primary !min-h-[32px] !px-3 !py-1 text-xs"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Скачать</span>
          </button>
        </div>
      </div>
    </header>
  );
}
