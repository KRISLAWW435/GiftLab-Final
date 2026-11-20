import {
  Mail,
  Maximize2,
  Minimize2,
  Monitor,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import type {
  EditableCardTarget,
  EditableTextField,
  PreviewJumpTarget,
} from '../../preview/previewProtocol';
import type {
  ConstellationProject,
  ConstellationStar,
  RecipientPhase,
} from '../../types/project';
import { LivePreviewStage, type PreviewDeviceId } from '../LivePreviewStage';

interface CardStageWorkspaceProps {
  project: ConstellationProject;
  visibleOnMobile: boolean;
  cardDevice: PreviewDeviceId;
  cardIframePhase: RecipientPhase;
  cardIframeStarIndex: number;
  cardSelectedTarget: EditableCardTarget | null;
  cardJumpTo: PreviewJumpTarget | null;
  zenMode: boolean;
  onSelectCardTargetView: (
    phase: 'sealed' | 'constellation' | 'starStory',
    starIndex?: number,
  ) => void;
  onChangeDevice: (device: PreviewDeviceId) => void;
  onToggleZenMode: () => void;
  onPhaseStateChange: (phase: RecipientPhase, starIndex: number) => void;
  onSelectTarget: (target: EditableCardTarget | null, field?: EditableTextField) => void;
  onPatchStar: (starId: string, patch: Partial<ConstellationStar>) => void;
  onPatchProject: (patch: Partial<ConstellationProject>) => void;
}

export function CardStageWorkspace({
  project,
  visibleOnMobile,
  cardDevice,
  cardIframePhase,
  cardIframeStarIndex,
  cardSelectedTarget,
  cardJumpTo,
  zenMode,
  onSelectCardTargetView,
  onChangeDevice,
  onToggleZenMode,
  onPhaseStateChange,
  onSelectTarget,
  onPatchStar,
  onPatchProject,
}: CardStageWorkspaceProps) {
  return (
    <main
      data-testid="workshop-card-main"
      className={`${
        visibleOnMobile ? 'flex' : 'hidden'
      } md:flex flex-1 min-w-0 min-h-0 relative flex-col bg-transparent`}
    >
      <div className="shrink-0 border-b border-white/10 bg-black/25 backdrop-blur-md px-2.5 sm:px-3 py-1.5 flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto">
          <button
            type="button"
            data-testid="card-stage-envelope-btn"
            data-selected={cardIframePhase === 'sealed'}
            onClick={() => onSelectCardTargetView('sealed')}
            className="gl-choice px-2.5 py-1 text-[11px] font-semibold inline-flex items-center gap-1 shrink-0"
          >
            <Mail className="w-3 h-3 text-violet-300" />
            <span>Конверт</span>
          </button>

          {project.stars.map((s, idx) => {
            const active = cardIframePhase === 'starStory' && cardIframeStarIndex === idx;
            return (
              <button
                key={s.id}
                type="button"
                data-testid={`card-stage-star-${idx}`}
                data-selected={active}
                onClick={() => onSelectCardTargetView('starStory', idx)}
                title={s.title || `Звезда ${idx + 1}`}
                className="gl-choice px-2 py-1 text-[11px] font-semibold shrink-0 tabular-nums"
              >
                ★ {idx + 1}
              </button>
            );
          })}

          <button
            type="button"
            data-testid="card-stage-finale-btn"
            data-selected={
              cardIframePhase === 'constellation' || cardIframePhase === 'finalReveal'
            }
            onClick={() => onSelectCardTargetView('constellation')}
            className="gl-choice px-2.5 py-1 text-[11px] font-semibold inline-flex items-center gap-1 shrink-0"
          >
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>Финал</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div
            role="group"
            aria-label="Экран открытки"
            className="inline-flex items-center gap-1 p-0.5 rounded-xl bg-gl-input border border-white/10"
          >
            <button
              type="button"
              data-testid="card-device-phone"
              data-selected={cardDevice === 'phone'}
              onClick={() => onChangeDevice('phone')}
              className="gl-tab !min-h-[30px] !px-2 text-[11px] inline-flex items-center gap-1"
            >
              <Smartphone className="w-3 h-3 shrink-0" />
              <span>Телефон</span>
            </button>

            <button
              type="button"
              data-testid="card-device-desktop"
              data-selected={cardDevice === 'desktop'}
              onClick={() => onChangeDevice('desktop')}
              className="gl-tab !min-h-[30px] !px-2 text-[11px] inline-flex items-center gap-1"
            >
              <Monitor className="w-3 h-3 shrink-0" />
              <span>Компьютер</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleZenMode}
            aria-pressed={zenMode}
            title={zenMode ? 'Показать панели' : 'Скрыть панели'}
            aria-label={zenMode ? 'Показать панели' : 'Скрыть панели'}
            className="hidden md:inline-flex gl-btn-icon !min-w-[32px] !min-h-[32px] !w-[32px] !h-[32px] !p-0"
          >
            {zenMode ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        <LivePreviewStage
          project={project}
          device={cardDevice}
          editMode={true}
          selectedTarget={cardSelectedTarget}
          jumpTo={cardJumpTo}
          frameTestId="card-editor-frame"
          onPhaseStateChange={onPhaseStateChange}
          onSelectTarget={onSelectTarget}
          onPatchStar={onPatchStar}
          onPatchProject={onPatchProject}
        />
      </div>

      <div className="hidden sm:flex items-center justify-center px-3 py-1 border-t border-white/8 bg-gl-input/55 text-[11px] text-gl-text-muted">
        {cardIframePhase === 'sealed'
          ? 'Нажми на надпись для правки, перетащи текст или конверт по высоте и тяни за уголки для размера'
          : 'Нажми на текст открытки для правки или потяни за уголки открытки и текста, чтобы изменить размер'}
      </div>
    </main>
  );
}
