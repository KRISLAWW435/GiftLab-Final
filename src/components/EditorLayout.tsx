import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Mail,
  Orbit,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useFullscreen } from '../hooks/useFullscreen';
import type {
  EditableCardTarget,
  EditableTextField,
  PreviewJumpTarget,
} from '../preview/previewProtocol';
import {
  computeNextStarSpawnPosition,
  makeConnectionId,
} from '../scene/paletteConfig';
import {
  MAX_STARS,
  canExportProject,
  isStarComplete,
  type ConstellationProject,
  type ConstellationStar,
  type EditorInteractionMode,
  type RecipientPhase,
  type StarPosition3D,
} from '../types/project';
import {
  CANVAS_TUTORIAL_STORAGE_KEY,
  type TutorialStep,
} from './CanvasTutorialOverlay';
import { CardEditorPanel, type CardEditorTab } from './CardEditorPanel';
import type { Constellation3DHandle } from './Constellation3D';
import { ConstellationSettings } from './ConstellationSettings';
import { CardStageWorkspace } from './editor/CardStageWorkspace';
import { Scene3DStageWorkspace } from './editor/Scene3DStageWorkspace';
import {
  resolveCardStepNext,
  resolveCardStepPrev,
  type StepNavigationAction,
} from './editor/stepNavigation';
import { WORKSHOP_STEPS, WorkshopTopHeader } from './editor/WorkshopTopHeader';
import { ExportModal } from './ExportModal';
import {
  mergeProjectDevicePatch,
  mergeStarDevicePatch,
  type PreviewDeviceId,
} from './LivePreviewStage';
import { PreviewWorkspace } from './PreviewWorkspace';
import { StarEditor, type StarEditorSection } from './StarEditor';
import { StarList } from './StarList';

interface EditorLayoutProps {
  project: ConstellationProject;
  saveState: 'saved' | 'saving';
  onUpdateProject: (updater: (prev: ConstellationProject) => ConstellationProject) => void;
  onBackToProjects: () => void;
  onOpenPreview?: () => void;
}

export type WorkshopStepId =
  | 'stars'
  | 'constellation'
  | 'card'
  | 'preview';

type MobilePane = 'panel' | 'scene';

export function EditorLayout({
  project,
  saveState,
  onUpdateProject,
  onBackToProjects,
}: EditorLayoutProps) {
  const sceneRef = useRef<Constellation3DHandle | null>(null);
  const jumpNonceRef = useRef(1);
  const {
    isFullscreen,
    notice: fullscreenNotice,
    dismissNotice: dismissFullscreenNotice,
    toggleFullscreen,
  } = useFullscreen();

  const [selectedStarId, setSelectedStarId] = useState<string>(
    project.stars[0]?.id ?? '',
  );
  const [activeStep, setActiveStep] = useState<WorkshopStepId>('stars');
  const [lastEditStep, setLastEditStep] =
    useState<Exclude<WorkshopStepId, 'preview'>>('stars');
  const [interactionMode, setInteractionMode] =
    useState<EditorInteractionMode>('arrange');
  const [pendingLinkStarId, setPendingLinkStarId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(
    null,
  );
  const [connectNotice, setConnectNotice] = useState<string | null>(null);
  const [mobilePane, setMobilePane] = useState<MobilePane>('panel');
  const [zenMode, setZenMode] = useState(false);
  const [isDesktopMd, setIsDesktopMd] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true,
  );
  const [reducedMotion, setReducedMotion] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [dragReadout, setDragReadout] = useState<{
    starId: string;
    position: StarPosition3D;
    isDepthDrag: boolean;
  } | null>(null);

  const [cardDevice, setCardDevice] = useState<PreviewDeviceId>(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'phone' : 'desktop',
  );
  const [requestedStarSection, setRequestedStarSection] = useState<{
    key: number;
    section: StarEditorSection;
  } | null>(null);

  const [cardTab, setCardTab] = useState<CardEditorTab>('theme');
  const [cardSelectedTarget, setCardSelectedTarget] =
    useState<EditableCardTarget | null>('envelope');
  const [cardFocusedField, setCardFocusedField] =
    useState<EditableTextField | null>(null);
  const [cardIframePhase, setCardIframePhase] =
    useState<RecipientPhase>('sealed');
  const [cardIframeStarIndex, setCardIframeStarIndex] = useState(0);
  const [cardJumpTo, setCardJumpTo] = useState<PreviewJumpTarget | null>({
    nonce: 1,
    phase: 'sealed',
  });

  const [tutorialOpen, setTutorialOpen] = useState<boolean>(false);
  const [tutorialStep, setTutorialStep] = useState<TutorialStep>('overview');
  const [practiceMovedStar, setPracticeMovedStar] = useState(false);
  const [practiceRotatedScene, setPracticeRotatedScene] = useState(false);

  const markTutorialCompleted = () => {
    try {
      window.localStorage.setItem(CANVAS_TUTORIAL_STORAGE_KEY, '1');
    } catch {
      // ignore storage quota / privacy mode errors
    }
  };

  const handleOpenTutorial = () => {
    setMobilePane('scene');
    setTutorialStep('overview');
    setPracticeMovedStar(false);
    setPracticeRotatedScene(false);
    setTutorialOpen(true);
  };

  const handleDismissTutorial = () => {
    markTutorialCompleted();
    setTutorialOpen(false);
  };

  const handleCompleteTutorial = () => {
    markTutorialCompleted();
    setTutorialOpen(false);
  };

  const activeStarIndex = Math.max(
    0,
    project.stars.findIndex((s) => s.id === selectedStarId),
  );
  const activeStar = project.stars[activeStarIndex] ?? project.stars[0];

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(min-width: 768px)');
    const syncViewport = () => {
      setIsDesktopMd(mq.matches);
      if (!mq.matches) {
        setZenMode(false);
      }
    };
    syncViewport();
    mq.addEventListener('change', syncViewport);
    return () => mq.removeEventListener('change', syncViewport);
  }, []);

  const switchMode = (nextMode: EditorInteractionMode) => {
    setInteractionMode(nextMode);
    if (nextMode !== 'connect') {
      setPendingLinkStarId(null);
      setSelectedConnectionId(null);
      setConnectNotice(null);
    }
  };

  const goToStep = (nextStep: WorkshopStepId) => {
    if (activeStep === 'constellation' && nextStep !== 'constellation') {
      if (interactionMode === 'connect') {
        switchMode('arrange');
      } else {
        setPendingLinkStarId(null);
        setSelectedConnectionId(null);
        setConnectNotice(null);
      }
    }
    if (nextStep === 'preview' && activeStep !== 'preview') {
      setLastEditStep(activeStep);
    } else if (nextStep !== 'preview') {
      setLastEditStep(nextStep);
    }
    if (nextStep === 'card' && activeStep !== 'card') {
      jumpNonceRef.current += 1;
      setCardJumpTo({
        nonce: jumpNonceRef.current,
        phase: 'sealed',
      });
      setCardIframePhase('sealed');
      setCardSelectedTarget('envelope');
      setCardFocusedField(null);
    }
    if (nextStep === 'constellation' && activeStep !== 'constellation') {
      try {
        if (window.localStorage.getItem(CANVAS_TUTORIAL_STORAGE_KEY) !== '1') {
          setTutorialStep('overview');
          setPracticeMovedStar(false);
          setPracticeRotatedScene(false);
          setTutorialOpen(true);
        }
      } catch {
        // ignore storage quota / privacy mode errors
      }
    }
    setActiveStep(nextStep);
  };

  const handleCardSelectTarget = (
    target: EditableCardTarget | null,
    field?: EditableTextField,
  ) => {
    setCardSelectedTarget(target);
    setCardFocusedField(field ?? null);
    if (target === 'text') setCardTab('text');
    else if (target === 'illustration') setCardTab('illustration');
    else if (target === 'decor') setCardTab('theme');
    else if (target === 'card' && cardTab !== 'theme') setCardTab('card');
  };

  const handleCardSelectTargetView = (
    phase: 'sealed' | 'constellation' | 'starStory',
    starIndex = 0,
  ) => {
    jumpNonceRef.current += 1;
    setCardIframePhase(phase);
    if (phase === 'starStory') {
      setCardIframeStarIndex(starIndex);
    }
    if (phase === 'sealed') {
      setCardSelectedTarget('envelope');
      setCardFocusedField(null);
    } else if (cardSelectedTarget === 'envelope') {
      setCardSelectedTarget('text');
      setCardFocusedField(null);
    }
    setCardJumpTo({
      nonce: jumpNonceRef.current,
      phase,
      starIndex,
    });
  };

  const handleCardPatchStar = (
    starId: string,
    patch: Partial<ConstellationStar>,
  ) => {
    onUpdateProject((prev) => ({
      ...prev,
      stars: prev.stars.map((s) =>
        s.id === starId ? mergeStarDevicePatch(s, patch) : s,
      ),
    }));
  };

  const handleCardPatchProject = (patch: Partial<ConstellationProject>) => {
    onUpdateProject((prev) => mergeProjectDevicePatch(prev, patch));
  };

  const handleSelectStarFromList = (starId: string) => {
    setSelectedStarId(starId);
    if (activeStep !== 'stars') {
      goToStep('stars');
    }
  };

  const handleSelectStarOnScene = (starId: string) => {
    if (interactionMode !== 'connect') {
      setSelectedStarId(starId);
      return;
    }

    setSelectedConnectionId(null);

    if (!pendingLinkStarId) {
      setPendingLinkStarId(starId);
      setSelectedStarId(starId);
      setConnectNotice(null);
      return;
    }

    if (pendingLinkStarId === starId) {
      setPendingLinkStarId(null);
      setConnectNotice('Нельзя соединить звезду саму с собой');
      return;
    }

    const existing = project.connections.find(
      (c) =>
        (c.from === pendingLinkStarId && c.to === starId) ||
        (c.from === starId && c.to === pendingLinkStarId),
    );

    if (existing) {
      setPendingLinkStarId(null);
      setSelectedConnectionId(existing.id);
      setConnectNotice('Такая связь уже существует — можно удалить её ниже');
      return;
    }

    const fromId = pendingLinkStarId;
    const newConnId = makeConnectionId(fromId, starId);
    onUpdateProject((prev) => ({
      ...prev,
      connections: [
        ...prev.connections,
        { id: newConnId, from: fromId, to: starId },
      ],
    }));
    setPendingLinkStarId(null);
    setSelectedStarId(starId);
    setConnectNotice(null);
  };

  const handleSelectConnection = (connectionId: string | null) => {
    setSelectedConnectionId(connectionId);
    if (connectionId) {
      setPendingLinkStarId(null);
      setConnectNotice(null);
    }
  };

  const handleDeleteConnection = (connectionId: string) => {
    onUpdateProject((prev) => ({
      ...prev,
      connections: prev.connections.filter((c) => c.id !== connectionId),
    }));
    if (selectedConnectionId === connectionId) {
      setSelectedConnectionId(null);
    }
    setConnectNotice(null);
  };

  const handleMoveStar = (starId: string, position: StarPosition3D) => {
    if (tutorialOpen && tutorialStep === 'practice') {
      setPracticeMovedStar(true);
    }
    onUpdateProject((prev) => ({
      ...prev,
      stars: prev.stars.map((s) => (s.id === starId ? { ...s, position } : s)),
    }));
  };

  const handleUpdateStar = (patch: Partial<ConstellationStar>) => {
    if (!activeStar) return;
    onUpdateProject((prev) => ({
      ...prev,
      stars: prev.stars.map((s) =>
        s.id === activeStar.id ? { ...s, ...patch } : s,
      ),
    }));
  };

  const handleAddStar = () => {
    if (project.stars.length >= MAX_STARS) return;
    const idx = project.stars.length;
    const position = computeNextStarSpawnPosition(project.stars, idx);

    const newStar: ConstellationStar = {
      id: `star_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      order: idx,
      title: `Звезда ${idx + 1}`,
      message: '',
      illustration: { type: 'builtin', id: 'comet' },
      shape: 'star',
      glowColor: 'inherit',
      position,
    };

    onUpdateProject((prev) => ({
      ...prev,
      stars: [...prev.stars, newStar],
    }));
    setSelectedStarId(newStar.id);
    if (activeStep !== 'stars') {
      goToStep('stars');
    }
  };

  const handleRemoveStar = (starId: string) => {
    if (project.stars.length <= 5) return;
    if (pendingLinkStarId === starId) setPendingLinkStarId(null);

    const remaining = project.stars.filter((s) => s.id !== starId);
    if (selectedStarId === starId && remaining[0]) {
      setSelectedStarId(remaining[0].id);
    }
    if (selectedConnectionId) {
      const stillExists = project.connections.some(
        (c) =>
          c.id === selectedConnectionId &&
          c.from !== starId &&
          c.to !== starId,
      );
      if (!stillExists) {
        setSelectedConnectionId(null);
      }
    }

    onUpdateProject((prev) => {
      const filtered = prev.stars
        .filter((s) => s.id !== starId)
        .map((s, idx) => ({ ...s, order: idx }));
      const nextConnections = prev.connections.filter(
        (c) => c.from !== starId && c.to !== starId,
      );
      return { ...prev, stars: filtered, connections: nextConnections };
    });
  };

  const starTitleById = new Map(
    project.stars.map((s, idx) => [s.id, s.title.trim() || `Звезда ${idx + 1}`]),
  );
  const selectedConnection = selectedConnectionId
    ? project.connections.find((c) => c.id === selectedConnectionId) ?? null
    : null;
  const pendingSourceTitle = pendingLinkStarId
    ? starTitleById.get(pendingLinkStarId) ?? 'Звезда'
    : null;

  const hasTitle = project.title.trim().length > 0;
  const hasFinalMessage = project.finalMessage.trim().length > 0;
  const readyToExport = canExportProject(project);

  const stepCompleted: Record<WorkshopStepId, boolean> = {
    stars: project.stars.length >= 5 && project.stars.every(isStarComplete),
    constellation: project.connections.length > 0,
    card: hasTitle && hasFinalMessage,
    preview: readyToExport,
  };

  const activeStepIndex = WORKSHOP_STEPS.findIndex((s) => s.id === activeStep);
  const prevStep = activeStepIndex > 0 ? WORKSHOP_STEPS[activeStepIndex - 1] : null;
  const nextStep =
    activeStepIndex >= 0 && activeStepIndex < WORKSHOP_STEPS.length - 1
      ? WORKSHOP_STEPS[activeStepIndex + 1]
      : null;

  const applyStepNavAction = (action: StepNavigationAction) => {
    if (action.kind === 'step') {
      goToStep(action.step);
    } else if (action.kind === 'cardView') {
      handleCardSelectTargetView(action.phase, action.starIndex ?? 0);
    }
  };

  const handleFooterPrev = () => {
    if (activeStep === 'card') {
      applyStepNavAction(
        resolveCardStepPrev(cardIframePhase, cardIframeStarIndex, project.stars.length),
      );
      return;
    }
    if (prevStep) {
      goToStep(prevStep.id);
    }
  };

  const handleFooterNext = () => {
    if (activeStep === 'card') {
      applyStepNavAction(
        resolveCardStepNext(cardIframePhase, cardIframeStarIndex, project.stars.length),
      );
      return;
    }
    if (nextStep) {
      goToStep(nextStep.id);
    }
  };

  return (
    <div
      data-palette={project.paletteId}
      className="gl-h-screen w-screen overflow-hidden bg-transparent text-gl-text flex flex-col"
    >
      {/* Compact Top Studio Header + Inline Step Progress Bar (hidden in fullscreen Preview) */}
      {activeStep !== 'preview' && (
        <WorkshopTopHeader
          projectTitle={project.title}
          saveState={saveState}
          activeStep={activeStep}
          stepCompleted={stepCompleted}
          isFullscreen={isFullscreen}
          onBackToProjects={onBackToProjects}
          onGoToStep={goToStep}
          onToggleFullscreen={() => void toggleFullscreen()}
          onOpenExport={() => setShowExport(true)}
        />
      )}

      {/* Main Workspace: Embedded Preview on Step 4 OR strict 3-Column Flex */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row relative overflow-hidden">
        {activeStep === 'preview' ? (
          <div
            data-testid="workshop-embedded-preview"
            className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden"
          >
            <PreviewWorkspace
              embedded
              project={project}
              initialDevice={cardDevice}
              saveState={saveState}
              returnLabel="Вернуться к редактированию"
              onExitPreview={() => goToStep(lastEditStep)}
            />
          </div>
        ) : (
          <>
            {/* Column 1 (lg+): Left Sidebar — Stars List Only */}
            <aside
              data-testid="workshop-left-sidebar"
              data-zen={zenMode}
              aria-hidden={zenMode}
              inert={zenMode && isDesktopMd ? true : undefined}
              className={`hidden lg:flex gl-editor-sidebar-left-shell shrink-0 flex-col border-r gl-glass-panel min-h-0 overflow-hidden ${
                zenMode ? 'pointer-events-none' : 'pointer-events-auto'
              }`}
            >
              <div
                data-testid="workshop-star-sidebar"
                className={`gl-editor-sidebar-left-inner flex-1 min-h-0 flex flex-col bg-[#070512]/58 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
                  zenMode ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'
                }`}
              >
                <StarList
                  stars={project.stars}
                  selectedStarId={activeStar?.id ?? ''}
                  globalGlowColor={project.globalGlowColor}
                  onSelectStar={handleSelectStarFromList}
                  onAddStar={handleAddStar}
                  onRemoveStar={handleRemoveStar}
                />
              </div>
            </aside>

            {/* Column 2: Center Area — Live Card Editor on Step 3 OR Live 3D Scene */}
            {activeStep === 'card' ? (
              <CardStageWorkspace
                project={project}
                visibleOnMobile={mobilePane === 'scene'}
                cardDevice={cardDevice}
                cardIframePhase={cardIframePhase}
                cardIframeStarIndex={cardIframeStarIndex}
                cardSelectedTarget={cardSelectedTarget}
                cardJumpTo={cardJumpTo}
                zenMode={zenMode}
                onSelectCardTargetView={handleCardSelectTargetView}
                onChangeDevice={setCardDevice}
                onToggleZenMode={() => setZenMode((z) => !z)}
                onPhaseStateChange={(phase, idx) => {
                  setCardIframePhase(phase);
                  setCardIframeStarIndex(idx);
                }}
                onSelectTarget={handleCardSelectTarget}
                onPatchStar={handleCardPatchStar}
                onPatchProject={handleCardPatchProject}
              />
            ) : (
              <Scene3DStageWorkspace
                sceneRef={sceneRef}
                project={project}
                activeStep={activeStep}
                visibleOnMobile={mobilePane === 'scene'}
                activeStarId={activeStar?.id ?? null}
                selectedConnectionId={selectedConnectionId}
                selectedConnection={selectedConnection}
                pendingLinkStarId={pendingLinkStarId}
                pendingSourceTitle={pendingSourceTitle}
                interactionMode={interactionMode}
                reducedMotion={reducedMotion}
                zenMode={zenMode}
                dragReadout={dragReadout}
                connectNotice={connectNotice}
                starTitleById={starTitleById}
                tutorialOpen={tutorialOpen}
                tutorialStep={tutorialStep}
                practiceMovedStar={practiceMovedStar}
                practiceRotatedScene={practiceRotatedScene}
                onSelectStar={handleSelectStarOnScene}
                onSelectConnection={handleSelectConnection}
                onCancelPendingLink={() => setPendingLinkStarId(null)}
                onDeleteConnection={handleDeleteConnection}
                onMoveStar={handleMoveStar}
                onDragStar={(starId, position, isDepthDrag) =>
                  setDragReadout({ starId, position, isDepthDrag })
                }
                onDragEnd={() => setDragReadout(null)}
                onCameraOrbit={() => {
                  if (tutorialOpen && tutorialStep === 'practice') {
                    setPracticeRotatedScene(true);
                  }
                }}
                onOpenTutorial={handleOpenTutorial}
                onToggleReducedMotion={() => setReducedMotion((r) => !r)}
                onToggleZenMode={() => setZenMode((z) => !z)}
                onStartPractice={() => {
                  setPracticeMovedStar(false);
                  setPracticeRotatedScene(false);
                  setTutorialStep('practice');
                  markTutorialCompleted();
                }}
                onCompleteTutorial={handleCompleteTutorial}
                onDismissTutorial={handleDismissTutorial}
                onSwitchMode={switchMode}
              />
            )}

            {/* Column 3: Right Panel — Step-driven Workshop Content */}
            <aside
              data-testid="workshop-right-panel"
              data-zen={zenMode}
              aria-hidden={isDesktopMd ? zenMode : undefined}
              inert={zenMode && isDesktopMd ? true : undefined}
              className={`${
                mobilePane === 'panel' ? 'flex' : 'hidden'
              } md:flex gl-editor-sidebar-right-shell shrink-0 flex-col md:border-l gl-glass-panel min-h-0 flex-1 md:flex-none overflow-hidden ${
                zenMode ? 'md:pointer-events-none' : 'md:pointer-events-auto'
              }`}
            >
              <div
                className={`gl-editor-sidebar-right-inner flex-1 min-h-0 flex flex-col md:transition-[transform,opacity] md:duration-300 md:ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
                  zenMode ? 'md:translate-x-full md:opacity-0' : 'md:translate-x-0 md:opacity-100'
                }`}
              >
                {/* Compact Horizontal Star Strip on Step 1 for < lg screens */}
                {activeStep === 'stars' && (
                  <div className="lg:hidden shrink-0">
                    <StarList
                      layout="strip"
                      stars={project.stars}
                      selectedStarId={activeStar?.id ?? ''}
                      globalGlowColor={project.globalGlowColor}
                      onSelectStar={handleSelectStarFromList}
                      onAddStar={handleAddStar}
                      onRemoveStar={handleRemoveStar}
                    />
                  </div>
                )}

                {/* Step Body */}
                <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-4 overscroll-contain">
                  {activeStep === 'stars' &&
                    (activeStar ? (
                      <StarEditor
                        projectId={project.id}
                        occasion={project.occasion}
                        recipientName={project.recipientName}
                        star={activeStar}
                        starIndex={activeStarIndex}
                        globalGlowColor={project.globalGlowColor}
                        requestedSection={requestedStarSection}
                        onChange={handleUpdateStar}
                      />
                    ) : (
                      <div
                        data-testid="stars-empty-state"
                        className="rounded-2xl border border-dashed border-white/15 bg-white/[0.025] p-6 text-center space-y-3"
                      >
                        <p className="text-sm text-gl-text-secondary leading-relaxed">
                          У вас пока нет звезд. Нажмите +, чтобы добавить
                        </p>
                        <button
                          type="button"
                          onClick={handleAddStar}
                          className="gl-btn-primary !min-h-[40px] !px-4 text-xs"
                        >
                          + Добавить звезду
                        </button>
                      </div>
                    ))}

                  {activeStep === 'card' && (
                    <CardEditorPanel
                      project={project}
                      device={cardDevice}
                      cardPhase={cardIframePhase}
                      cardStarIndex={cardIframeStarIndex}
                      activeTab={cardTab}
                      focusedField={cardFocusedField}
                      onChangeTab={(tab, target) => {
                        setCardTab(tab);
                        setCardFocusedField(null);
                        if (target) setCardSelectedTarget(target);
                      }}
                      onSelectCardTargetView={handleCardSelectTargetView}
                      onPatchProject={handleCardPatchProject}
                      onPatchStar={handleCardPatchStar}
                      onResetDeviceLayout={(nextProject) =>
                        onUpdateProject(() => nextProject)
                      }
                    />
                  )}

                  {activeStep === 'constellation' && (
                    <ConstellationSettings
                      project={project}
                      section="cosmos"
                      selectedConnectionId={selectedConnectionId}
                      reducedMotion={reducedMotion}
                      onChange={(patch) =>
                        onUpdateProject((prev) => ({ ...prev, ...patch }))
                      }
                      onSelectConnection={handleSelectConnection}
                      onDeleteConnection={handleDeleteConnection}
                      onToggleReducedMotion={() => setReducedMotion((r) => !r)}
                    />
                  )}
                </div>

                {/* Step Navigation Footer: Назад / Далее */}
                <div className="gl-workshop-footer shrink-0 border-t border-white/10 bg-black/10 px-3.5 py-2.5 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    data-testid="editor-step-prev-btn"
                    onClick={handleFooterPrev}
                    disabled={!prevStep}
                    className="gl-btn-secondary !min-h-[38px] !px-3 text-xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                    <span>Назад</span>
                  </button>

                  {nextStep ? (
                    <button
                      type="button"
                      data-testid="editor-step-next-btn"
                      onClick={handleFooterNext}
                      className="gl-btn-primary !min-h-[38px] !px-3.5 text-xs"
                    >
                      <span>Далее</span>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      data-testid="editor-step-download-btn"
                      onClick={() => setShowExport(true)}
                      className="gl-btn-primary !min-h-[38px] !px-3.5 text-xs"
                    >
                      <Download className="w-3.5 h-3.5 shrink-0" />
                      <span>Скачать</span>
                    </button>
                  )}
                </div>
              </div>
            </aside>
          </>
        )}
      </div>

      {/* Mobile Compact 2-Pane Switcher (< md only on Steps 1-3) */}
      {activeStep !== 'preview' && (
        <nav
          aria-label="Переключение между настройками и результатом"
          className="md:hidden shrink-0 border-t gl-glass-panel gl-safe-bottom grid grid-cols-2 p-1.5 gap-1.5"
        >
          <button
            type="button"
            data-testid="mobile-pane-panel"
            onClick={() => setMobilePane('panel')}
            data-selected={mobilePane === 'panel'}
            className="gl-tab !min-h-[40px] flex items-center justify-center gap-1.5"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
            <span>Настройки</span>
          </button>

          <button
            type="button"
            data-testid="mobile-pane-stage"
            onClick={() => setMobilePane('scene')}
            data-selected={mobilePane === 'scene'}
            className="gl-tab !min-h-[40px] flex items-center justify-center gap-1.5"
          >
            {activeStep === 'card' ? (
              <>
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span>Открытка</span>
              </>
            ) : (
              <>
                <Orbit className="w-3.5 h-3.5 shrink-0" />
                <span>3D-результат</span>
              </>
            )}
          </button>
        </nav>
      )}

      {showExport && (
        <ExportModal
          project={project}
          onClose={() => setShowExport(false)}
          onSelectStar={(starId) => {
            const target = project.stars.find((s) => s.id === starId);
            const targetSection: StarEditorSection =
              target && target.title.trim().length === 0 ? 'basics' : 'message';
            setSelectedStarId(starId);
            jumpNonceRef.current += 1;
            setRequestedStarSection({
              key: jumpNonceRef.current,
              section: targetSection,
            });
            goToStep('stars');
            setMobilePane('panel');
          }}
        />
      )}

      {fullscreenNotice && activeStep !== 'preview' && (
        <div
          role="status"
          aria-live="polite"
          data-testid="editor-fullscreen-notice"
          className="fixed bottom-16 md:bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-[92vw] sm:max-w-md gl-hud !border-amber-300/40 px-3.5 py-2 flex items-center gap-2.5 text-xs text-amber-100 shadow-xl"
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
