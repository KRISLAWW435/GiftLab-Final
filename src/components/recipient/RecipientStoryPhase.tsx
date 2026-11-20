import type React from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Mail,
  MailOpen,
  Pencil,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { EditableCardTarget, EditableTextField } from '../../preview/previewProtocol';
import { GLOW_COLORS, type StoryCardPresentation, resolveStarGlowHex } from '../../scene/paletteConfig';
import type {
  ConstellationProject,
  ConstellationStar,
  DeviceLayoutKey,
} from '../../types/project';
import { CardDecorView } from '../CardDecorView';
import { CardThemeBackdrop } from '../CardThemeBackdrop';
import { FinalLetterCard } from '../FinalLetterCard';
import { StarIllustrationView } from '../StarIllustrationView';
import {
  type CanvasEditDragHandlers,
  RecipientFullscreenButton,
  SmallProgressStarIcon,
  type StoryNavigationIntent,
} from './recipientTypes';

interface RecipientStoryPhaseProps extends CanvasEditDragHandlers {
  project: ConstellationProject;
  activeStar: ConstellationStar;
  activeIndex: number;
  totalStars: number;
  unlockedCount: number;
  finaleReached: boolean;
  isTransitioning: boolean;
  isPortrait: boolean;
  isCompactLandscape: boolean;
  activeDevice: DeviceLayoutKey;
  reducedMotion: boolean;
  editMode: boolean;
  selectedTarget: EditableCardTarget | null;
  activeInlineField: EditableTextField | null;
  quickLetterOpen: boolean;
  musicPlaying: boolean;
  musicMuted: boolean;
  audioBlocked: boolean;
  trackDisplayName: string | null;
  dragOffsetX: number;
  isDraggingCanvas: boolean;
  isFullscreen: boolean;
  presentation: StoryCardPresentation;
  storyStageRef: React.RefObject<HTMLDivElement | null>;
  storyRightRef: React.RefObject<HTMLDivElement | null>;
  storyInlineInputRef: React.RefObject<HTMLInputElement | null>;
  storyInlineTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onToggleFullscreen: () => void;
  onExitPreview?: () => void;
  onToggleSound: () => void;
  onAttemptPlayMusic: () => void;
  onSetQuickLetterOpen: (updater: (v: boolean) => boolean) => void;
  onCloseQuickLetter: () => void;
  onToggleReducedMotion: () => void;
  onNavigateStory: (intent: StoryNavigationIntent) => void;
  onStoryPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onStoryPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onStoryPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onResetSwipe: () => void;
  onSelectTarget?: (target: EditableCardTarget | null, field?: EditableTextField) => void;
  onPatchStar?: (starId: string, patch: Partial<ConstellationStar>) => void;
  onPatchProject?: (patch: Partial<ConstellationProject>) => void;
  onSetInlineField: (field: EditableTextField | null) => void;
}

export function RecipientStoryPhase({
  project,
  activeStar,
  activeIndex,
  totalStars,
  unlockedCount,
  finaleReached,
  isTransitioning,
  isPortrait,
  isCompactLandscape,
  activeDevice,
  reducedMotion,
  editMode,
  selectedTarget,
  activeInlineField,
  quickLetterOpen,
  musicPlaying,
  musicMuted,
  audioBlocked,
  trackDisplayName,
  dragOffsetX,
  isDraggingCanvas,
  isFullscreen,
  presentation,
  storyStageRef,
  storyRightRef,
  storyInlineInputRef,
  storyInlineTextareaRef,
  onToggleFullscreen,
  onExitPreview,
  onToggleSound,
  onAttemptPlayMusic,
  onSetQuickLetterOpen,
  onCloseQuickLetter,
  onToggleReducedMotion,
  onNavigateStory,
  onStoryPointerDown,
  onStoryPointerMove,
  onStoryPointerUp,
  onResetSwipe,
  onSelectTarget,
  onPatchStar,
  onPatchProject,
  onSetInlineField,
  beginCanvasEdit,
  moveCanvasEdit,
  endCanvasEdit,
}: RecipientStoryPhaseProps) {
  const isLastStar = activeIndex >= totalStars - 1;
  const {
    signatureText,
    activeStarGlow,
    cardTheme,
    cardColors,
    hasExplicitCardTheme,
    isMinimalistTheme,
    cardLayout,
    textStyle: starTextStyle,
    fontMeta: starFontMeta,
    sansFontMeta,
    effectiveAlign,
    effectiveBodyPx,
    effectiveTitlePx,
    titleLineHeight,
    textMarginLeftPct,
    illuLeftGrow,
    illuRightGrow,
    effectiveIlluPx,
    spacers: { topOuterGrow, topInnerGrow, bottomInnerGrow },
    storyWidthClass,
    storyCardPaddingClass,
    storyCardOffsetY,
    storyCardScale,
    storyTextShiftY,
    starDecor,
    safeStarDecor,
    effectiveTextColor: effectiveStarTextColor,
    resolvedTextShadow,
    decorGlowHex: storyDecorGlowHex,
    decorCoreHex: storyDecorCoreHex,
  } = presentation;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col overflow-x-hidden pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
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
        className={`relative z-30 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 shrink-0 ${
          isCompactLandscape ? 'px-4 pt-2.5 pb-1' : 'px-4 sm:px-7 pt-3.5 sm:pt-4 pb-1.5'
        }`}
      >
        <div className="order-1 pointer-events-auto flex items-center gap-2.5 min-w-0">
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
        <div className="order-3 sm:order-2 w-full sm:w-auto pt-0.5 sm:pt-0 pointer-events-auto flex items-center justify-center gap-2 sm:gap-2.5 shrink-0">
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
                  onClick={() => onNavigateStory({ type: 'index', index: idx })}
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
        <div className="order-2 sm:order-3 pointer-events-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
          {finaleReached && (
            <button
              type="button"
              onClick={() => onNavigateStory({ type: 'constellation' })}
              className="gl-btn-secondary !bg-amber-500/20 hover:!bg-amber-500/35 !border-amber-300/35 text-amber-100 !px-2.5 sm:!px-3 !py-2 text-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">К созвездию</span>
            </button>
          )}

          {project.musicTrackId !== 'none' && (
            <button
              type="button"
              onClick={onToggleSound}
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
            <RecipientFullscreenButton
              isFullscreen={isFullscreen}
              onToggle={onToggleFullscreen}
            />
          )}

          {!editMode && (
            <button
              type="button"
              data-testid="recipient-letter-toggle-btn"
              onClick={() => onSetQuickLetterOpen((v) => !v)}
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
              onClick={onToggleReducedMotion}
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
            onClick={onAttemptPlayMusic}
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
          onPointerDown={onStoryPointerDown}
          onPointerMove={onStoryPointerMove}
          onPointerUp={onStoryPointerUp}
          onPointerCancel={onResetSwipe}
          onLostPointerCapture={onResetSwipe}
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
                dragOffsetX === 0 && !isDraggingCanvas
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
                            onSetInlineField(null);
                          }
                        }}
                        onBlur={() => onSetInlineField(null)}
                        style={{
                          fontFamily: starFontMeta.cssFamily,
                          fontSize: `${effectiveTitlePx}px`,
                          fontWeight: 600,
                          lineHeight: titleLineHeight,
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
                          lineHeight: titleLineHeight,
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
                          onSetInlineField(null);
                        }
                      }}
                      onBlur={() => onSetInlineField(null)}
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
                          onSetInlineField(null);
                        }
                      }}
                      onBlur={() => onSetInlineField(null)}
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
              onClick={() => onNavigateStory({ type: 'prev' })}
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
              onClick={() => onNavigateStory({ type: 'next' })}
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
          onClose={onCloseQuickLetter}
          editMode={false}
        />
      )}
    </div>
  );
}
