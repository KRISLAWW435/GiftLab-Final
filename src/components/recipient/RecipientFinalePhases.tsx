import type React from 'react';
import {
  ArrowLeft,
  FastForward,
  Mail,
  MailOpen,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { EditableCardTarget, EditableTextField } from '../../preview/previewProtocol';
import {
  type CosmicPaletteConfig,
  type GlowColorConfig,
  buildProjectConstellationDevicePatch,
} from '../../scene/paletteConfig';
import type {
  ConstellationProject,
  DeviceConstellationLayout,
  DeviceLayoutKey,
} from '../../types/project';
import { FinalLetterCard } from '../FinalLetterCard';
import { type CanvasEditDragHandlers, RecipientFullscreenButton } from './recipientTypes';

interface BirthingPhaseProps {
  project: ConstellationProject;
  editMode: boolean;
  musicMuted: boolean;
  musicPlaying: boolean;
  audioBlocked: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onExitPreview?: () => void;
  onToggleSound: () => void;
  onAttemptPlayMusic: () => void;
  onSkipBirth: () => void;
}

export function RecipientBirthingPhase({
  project,
  editMode,
  musicMuted,
  musicPlaying,
  audioBlocked,
  isFullscreen,
  onToggleFullscreen,
  onExitPreview,
  onToggleSound,
  onAttemptPlayMusic,
  onSkipBirth,
}: BirthingPhaseProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pt-[max(1.5rem,env(safe-area-inset-top,0px))] sm:pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
      <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
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

        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
          {project.musicTrackId !== 'none' && (
            <button
              type="button"
              onClick={onToggleSound}
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

          {!editMode && (
            <RecipientFullscreenButton
              isFullscreen={isFullscreen}
              onToggle={onToggleFullscreen}
            />
          )}

          <button
            type="button"
            onClick={onSkipBirth}
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
            onClick={onAttemptPlayMusic}
            className="gl-btn-primary !min-h-[34px] !px-3 !py-1.5 text-xs"
          >
            Включить вручную
          </button>
        </div>
      )}
    </div>
  );
}

interface FinalRevealPhaseProps {
  project: ConstellationProject;
  editMode: boolean;
  musicMuted: boolean;
  musicPlaying: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onExitPreview?: () => void;
  onToggleSound: () => void;
  onSkipFinalReveal: () => void;
}

export function RecipientFinalRevealPhase({
  project,
  editMode,
  musicMuted,
  musicPlaying,
  isFullscreen,
  onToggleFullscreen,
  onExitPreview,
  onToggleSound,
  onSkipFinalReveal,
}: FinalRevealPhaseProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pt-[max(1.5rem,env(safe-area-inset-top,0px))] sm:pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
      <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
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

        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
          {project.musicTrackId !== 'none' && (
            <button
              type="button"
              onClick={onToggleSound}
              className="gl-btn-secondary !bg-gl-panel/88 hover:!bg-gl-card text-gl-text !px-3 !py-2 text-xs"
            >
              {musicMuted || !musicPlaying ? (
                <VolumeX className="w-3.5 h-3.5 text-amber-300" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-gl-accent-light" />
              )}
            </button>
          )}

          {!editMode && (
            <RecipientFullscreenButton
              isFullscreen={isFullscreen}
              onToggle={onToggleFullscreen}
            />
          )}

          <button
            type="button"
            onClick={onSkipFinalReveal}
            className="gl-btn-secondary !bg-gl-panel/88 hover:!bg-gl-card text-gl-text !px-3.5 !py-2 text-xs"
          >
            <FastForward className="w-3.5 h-3.5" />
            Пропустить
          </button>
        </div>
      </div>
    </div>
  );
}

interface ConstellationPhaseProps extends CanvasEditDragHandlers {
  project: ConstellationProject;
  palette: CosmicPaletteConfig;
  globalGlow: GlowColorConfig;
  signatureText: string;
  activeDevice: DeviceLayoutKey;
  constellationLayout: DeviceConstellationLayout;
  isPortrait: boolean;
  isCompactLandscape: boolean;
  reducedMotion: boolean;
  editMode: boolean;
  selectedTarget: EditableCardTarget | null;
  activeInlineField: EditableTextField | null;
  letterOpen: boolean;
  isFullscreen: boolean;
  finaleHeaderRef: React.RefObject<HTMLElement | null>;
  onToggleFullscreen: () => void;
  onExitPreview?: () => void;
  onToggleLetterOpen: () => void;
  onCloseLetter: () => void;
  onSelectTarget?: (target: EditableCardTarget | null, field?: EditableTextField) => void;
  onSetInlineField: (field: EditableTextField | null) => void;
  onPatchProject?: (patch: Partial<ConstellationProject>) => void;
}

export function RecipientConstellationPhase({
  project,
  palette,
  globalGlow,
  signatureText,
  activeDevice,
  constellationLayout,
  isPortrait,
  isCompactLandscape,
  reducedMotion,
  editMode,
  selectedTarget,
  activeInlineField,
  letterOpen,
  isFullscreen,
  finaleHeaderRef,
  onToggleFullscreen,
  onExitPreview,
  onToggleLetterOpen,
  onCloseLetter,
  onSelectTarget,
  onSetInlineField,
  onPatchProject,
  beginCanvasEdit,
  moveCanvasEdit,
  endCanvasEdit,
}: ConstellationPhaseProps) {
  return (
    <>
      {onExitPreview && (
        <div className="pointer-events-auto fixed top-[max(0.75rem,env(safe-area-inset-top,0px))] left-4 sm:top-[max(1.25rem,env(safe-area-inset-top,0px))] sm:left-6 z-30">
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
          className={`pointer-events-none fixed inset-x-0 top-0 z-20 flex flex-col items-center text-center ${
            !editMode
              ? 'px-24 sm:px-32 pt-[max(1rem,env(safe-area-inset-top,0px))] sm:pt-[max(1.25rem,env(safe-area-inset-top,0px))]'
              : 'px-16 sm:px-24 pt-[max(1rem,env(safe-area-inset-top,0px))] sm:pt-[max(1.25rem,env(safe-area-inset-top,0px))]'
          }`}
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
        <div className="pointer-events-auto fixed top-[max(0.75rem,env(safe-area-inset-top,0px))] right-4 sm:top-[max(1.25rem,env(safe-area-inset-top,0px))] sm:right-6 z-30 flex items-center gap-2">
          <RecipientFullscreenButton
            isFullscreen={isFullscreen}
            onToggle={onToggleFullscreen}
            pillStyle
          />

          <button
            type="button"
            data-testid="recipient-letter-toggle-btn"
            onClick={onToggleLetterOpen}
            aria-pressed={letterOpen}
            aria-label={
              letterOpen
                ? 'Скрыть письмо и любоваться созвездием'
                : 'Открыть финальное письмо'
            }
            title={letterOpen ? 'Скрыть письмо' : 'Открыть финальное письмо'}
            className={`inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full border backdrop-blur-md transition-all shadow-lg cursor-pointer shrink-0 ${
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
        onClose={onCloseLetter}
        editMode={editMode}
        selectedTarget={selectedTarget}
        activeInlineField={activeInlineField}
        onSelectTarget={(target, field) => {
          if (field) onSetInlineField(field);
          onSelectTarget?.(target, field);
        }}
        onCloseInlineEdit={() => onSetInlineField(null)}
        onPatchProject={onPatchProject}
        letterContainerRef={finaleHeaderRef}
        onBeginElementDrag={beginCanvasEdit}
        onMoveElementDrag={moveCanvasEdit}
        onEndElementDrag={endCanvasEdit}
      />
    </>
  );
}
