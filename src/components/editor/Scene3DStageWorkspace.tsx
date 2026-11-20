import { useState } from 'react';
import type React from 'react';
import {
  Activity,
  Hand,
  HelpCircle,
  Link2,
  Maximize2,
  Minimize2,
  Orbit,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import {
  isStarFilled,
  isStarUnsignedAndEmpty,
  type ConstellationProject,
  type EditorInteractionMode,
  type StarConnection,
  type StarPosition3D,
} from '../../types/project';
import { CanvasTutorialOverlay, type TutorialStep } from '../CanvasTutorialOverlay';
import { Constellation3D, type Constellation3DHandle } from '../Constellation3D';
import type { WorkshopStepId } from '../EditorLayout';

interface Scene3DStageWorkspaceProps {
  sceneRef: React.RefObject<Constellation3DHandle | null>;
  project: ConstellationProject;
  activeStep: WorkshopStepId;
  visibleOnMobile: boolean;
  activeStarId: string | null;
  selectedConnectionId: string | null;
  selectedConnection: StarConnection | null;
  pendingLinkStarId: string | null;
  pendingSourceTitle: string | null;
  interactionMode: EditorInteractionMode;
  reducedMotion: boolean;
  zenMode: boolean;
  dragReadout: {
    starId: string;
    position: StarPosition3D;
    isDepthDrag: boolean;
  } | null;
  connectNotice: string | null;
  starTitleById: Map<string, string>;
  tutorialOpen: boolean;
  tutorialStep: TutorialStep;
  practiceMovedStar: boolean;
  practiceRotatedScene: boolean;
  onSelectStar: (starId: string) => void;
  onSelectConnection: (connectionId: string | null) => void;
  onCancelPendingLink: () => void;
  onDeleteConnection: (connectionId: string) => void;
  onMoveStar: (starId: string, position: StarPosition3D) => void;
  onDragStar: (starId: string, position: StarPosition3D, isDepthDrag: boolean) => void;
  onDragEnd: () => void;
  onCameraOrbit: () => void;
  onOpenTutorial: () => void;
  onToggleReducedMotion: () => void;
  onToggleZenMode: () => void;
  onStartPractice: () => void;
  onCompleteTutorial: () => void;
  onDismissTutorial: () => void;
  onSwitchMode: (mode: EditorInteractionMode) => void;
}

export function Scene3DStageWorkspace({
  sceneRef,
  project,
  activeStep,
  visibleOnMobile,
  activeStarId,
  selectedConnectionId,
  selectedConnection,
  pendingLinkStarId,
  pendingSourceTitle,
  interactionMode,
  reducedMotion,
  zenMode,
  dragReadout,
  connectNotice,
  starTitleById,
  tutorialOpen,
  tutorialStep,
  practiceMovedStar,
  practiceRotatedScene,
  onSelectStar,
  onSelectConnection,
  onCancelPendingLink,
  onDeleteConnection,
  onMoveStar,
  onDragStar,
  onDragEnd,
  onCameraOrbit,
  onOpenTutorial,
  onToggleReducedMotion,
  onToggleZenMode,
  onStartPractice,
  onCompleteTutorial,
  onDismissTutorial,
  onSwitchMode,
}: Scene3DStageWorkspaceProps) {
  const [hoveredStarInfo, setHoveredStarInfo] = useState<{
    starId: string;
    x: number;
    y: number;
  } | null>(null);

  const hoveredStar =
    hoveredStarInfo && !dragReadout
      ? project.stars.find((s) => s.id === hoveredStarInfo.starId) ?? null
      : null;
  const hoveredNeedsFill = hoveredStar
    ? isStarUnsignedAndEmpty(hoveredStar) || !isStarFilled(hoveredStar)
    : false;

  return (
    <main
      data-testid="workshop-3d-main"
      className={`${
        visibleOnMobile ? 'flex' : 'hidden'
      } md:flex flex-1 min-w-0 min-h-0 relative flex-col bg-transparent`}
    >
      {activeStep === 'stars' && (
        <div className="shrink-0 border-b border-white/10 bg-black/25 backdrop-blur-md px-2.5 sm:px-3 py-1.5 flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1 p-0.5 rounded-xl bg-gl-input border border-white/10">
            <button
              type="button"
              data-testid="stars-center-3d"
              data-selected={true}
              className="gl-tab !min-h-[30px] !px-2.5 text-xs inline-flex items-center gap-1.5"
            >
              <Orbit className="w-3.5 h-3.5 shrink-0" />
              <span>3D-сцена</span>
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 relative w-full h-full overflow-hidden">
        <Constellation3D
          ref={sceneRef}
          paletteId={project.paletteId}
          globalGlowColor={project.globalGlowColor}
          stars={project.stars}
          connections={project.connections}
          selectedStarId={activeStarId}
          selectedConnectionId={selectedConnectionId}
          pendingLinkStarId={pendingLinkStarId}
          interactionMode={interactionMode}
          finaleActive={activeStep === 'constellation'}
          constellationAnimation={project.constellationAnimation ?? 'rotation'}
          lowPerformance={typeof window !== 'undefined' && window.innerWidth < 768}
          reducedMotion={reducedMotion}
          onSelectStar={onSelectStar}
          onHoverStar={(starId, pos) => {
            if (starId && pos) {
              setHoveredStarInfo({ starId, x: pos.x, y: pos.y });
            } else {
              setHoveredStarInfo(null);
            }
          }}
          onSelectConnection={onSelectConnection}
          onMoveStar={onMoveStar}
          onDragStar={onDragStar}
          onDragEnd={onDragEnd}
          onCameraOrbit={onCameraOrbit}
        />

        {/* Hover warning tooltip when a star is unsigned & empty */}
        {hoveredStarInfo && hoveredStar && hoveredNeedsFill && (
          <div
            data-testid="scene-star-hover-hint"
            role="status"
            style={{
              left: `${hoveredStarInfo.x}px`,
              top: `${Math.max(52, hoveredStarInfo.y - 26)}px`,
            }}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full z-20 gl-hud !rounded-xl !border-amber-300/45 bg-[#0f0b1d]/90 px-3 py-1.5 text-xs text-amber-100 shadow-xl whitespace-nowrap max-w-[90%]"
          >
            {isStarUnsignedAndEmpty(hoveredStar)
              ? 'Звезда не подписана и текст пустой — стоит заполнить'
              : 'У звезды пустой текст — стоит заполнить'}
          </div>
        )}

        {/* Live Star Movement HUD during 3D Drag */}
        {dragReadout && interactionMode === 'arrange' && (
          <div
            aria-live="polite"
            className={`pointer-events-none absolute top-14 xl:top-3 left-3 z-10 gl-hud !rounded-xl px-3 py-1.5 text-xs flex flex-wrap items-center gap-x-2 gap-y-0.5 max-w-[calc(100%-24px)] xl:max-w-[calc(100%-340px)] ${
              dragReadout.isDepthDrag ? '!border-amber-300/50' : '!border-gl-accent/45'
            }`}
          >
            <span className="font-semibold text-gl-text truncate max-w-[160px]">
              {starTitleById.get(dragReadout.starId) ?? 'Звезда'}
            </span>
            <span
              className={
                dragReadout.isDepthDrag ? 'text-amber-200' : 'text-gl-text-secondary'
              }
            >
              {dragReadout.isDepthDrag
                ? 'Двигаем ближе или дальше (Shift)'
                : 'Двигаем звезду по небу'}
            </span>
          </div>
        )}

        {/* Contextual Connect-Mode Helper */}
        {interactionMode === 'connect' && (
          <div className="pointer-events-none absolute top-14 xl:top-3 left-3 z-10 flex flex-col items-start gap-2 max-w-[calc(100%-24px)] xl:max-w-[calc(100%-340px)]">
            <div className="gl-hud !rounded-xl px-3 py-1.5 text-[11px] sm:text-xs text-gl-text-secondary">
              {pendingSourceTitle
                ? `Выберите вторую звезду для соединения с «${pendingSourceTitle}»`
                : 'Выберите две звезды для линии или нажмите на связь'}
            </div>

            {(pendingLinkStarId || selectedConnection || connectNotice) && (
              <div className="pointer-events-auto gl-hud !rounded-xl !border-amber-300/35 flex flex-wrap items-center gap-2 px-3 py-1.5 text-xs">
                {connectNotice && !selectedConnection && (
                  <span className="text-amber-200">{connectNotice}</span>
                )}

                {pendingLinkStarId && (
                  <button
                    type="button"
                    onClick={onCancelPendingLink}
                    className="inline-flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/20 px-2.5 py-1 font-medium text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    Отменить выбор
                  </button>
                )}

                {selectedConnection && (
                  <>
                    <span className="text-amber-100 font-medium">
                      {starTitleById.get(selectedConnection.from) ?? 'Звезда'} ↔{' '}
                      {starTitleById.get(selectedConnection.to) ?? 'Звезда'}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteConnection(selectedConnection.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-rose-600 hover:bg-rose-500 px-2.5 py-1 font-semibold text-white cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Удалить связь
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectConnection(null)}
                      className="rounded-lg px-2 py-1 text-slate-300 hover:text-white cursor-pointer"
                      title="Снять выделение"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Compact Secondary Scene Controls (top-right bar) */}
        <div className="pointer-events-auto gl-hud absolute top-3 right-3 z-10 !rounded-xl p-1 flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenTutorial}
            title="Открыть обучение управлению холстом"
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 h-[34px] text-xs font-medium text-gl-text-secondary hover:text-gl-text hover:bg-white/[0.08] whitespace-nowrap transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-gl-accent-light shrink-0" />
            <span>Как управлять?</span>
          </button>

          <button
            type="button"
            onClick={onToggleReducedMotion}
            aria-pressed={!reducedMotion}
            title={
              reducedMotion
                ? 'Включить плавное движение сцены'
                : 'Уменьшить движение сцены'
            }
            aria-label={
              reducedMotion
                ? 'Включить плавное движение сцены'
                : 'Уменьшить движение сцены'
            }
            className={`gl-btn-icon !min-w-[34px] !min-h-[34px] !w-[34px] !h-[34px] !p-0 !border-transparent ${
              reducedMotion
                ? '!bg-transparent text-gl-text-muted hover:!bg-white/[0.08]'
                : '!bg-white/[0.08] text-gl-accent-light'
            }`}
          >
            <Activity className="w-4 h-4" />
          </button>

          <button
            type="button"
            data-testid="toggle-zen-mode"
            onClick={onToggleZenMode}
            aria-pressed={zenMode}
            title={zenMode ? 'Показать панели' : 'Скрыть панели'}
            aria-label={zenMode ? 'Показать панели' : 'Скрыть панели'}
            className="hidden md:inline-flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3 h-[34px] text-xs font-semibold text-gl-text hover:bg-white/[0.1] whitespace-nowrap transition-colors cursor-pointer"
          >
            {zenMode ? (
              <Minimize2 className="w-3.5 h-3.5 text-gl-accent-light shrink-0" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 text-gl-accent-light shrink-0" />
            )}
            <span>{zenMode ? 'Показать панели' : 'Скрыть панели'}</span>
          </button>
        </div>

        <CanvasTutorialOverlay
          open={tutorialOpen}
          step={tutorialStep}
          movedStar={practiceMovedStar}
          rotatedScene={practiceRotatedScene}
          onStartPractice={onStartPractice}
          onComplete={onCompleteTutorial}
          onDismiss={onDismissTutorial}
        />

        {/* Bottom Single-Row Primary Dock (Arrange, Connect, Reset Camera) */}
        <div className="pointer-events-auto gl-hud absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex flex-nowrap items-center gap-1 !rounded-2xl p-1.5 max-w-[96%] overflow-x-auto">
          <button
            type="button"
            onClick={() => onSwitchMode('arrange')}
            data-selected={interactionMode === 'arrange'}
            className="gl-tab inline-flex items-center gap-1.5 !min-h-[36px] sm:!min-h-[38px] !px-2.5 sm:!px-3 shrink-0"
          >
            <Hand className="w-3.5 h-3.5 shrink-0" />
            <span>Расположение</span>
          </button>

          <button
            type="button"
            onClick={() => onSwitchMode('connect')}
            data-selected={interactionMode === 'connect'}
            className="gl-tab inline-flex items-center gap-1.5 !min-h-[36px] sm:!min-h-[38px] !px-2.5 sm:!px-3 shrink-0"
          >
            <Link2 className="w-3.5 h-3.5 shrink-0" />
            <span>Связи</span>
          </button>

          <button
            type="button"
            onClick={() => sceneRef.current?.resetCamera()}
            title="Вернуть камеру в исходное положение"
            className="gl-btn-secondary !bg-transparent !border-transparent hover:!bg-white/[0.08] !min-h-[36px] sm:!min-h-[38px] !px-2.5 sm:!px-3 !py-1.5 text-xs font-medium shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            <span>Сброс</span>
          </button>
        </div>
      </div>
    </main>
  );
}
