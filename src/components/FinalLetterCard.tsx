import { useEffect, useRef, type RefObject } from 'react';
import { Pencil, Sparkles, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { EditableCardTarget, EditableTextField } from '../preview/previewProtocol';
import {
  GLOW_COLORS,
  computeTextBlockMarginLeftPct,
  isDefaultStarTextStyle,
  resolveCardColors,
  resolveCardTheme,
  resolveContrastSafeCardTextColor,
  resolveEffectiveCardLayout,
  resolveEffectiveFinalDecor,
  resolveEffectiveFinalTextStyle,
  resolveMessageFont,
  resolveSafeCardDecorPresentation,
  resolveTextShadowCss,
} from '../scene/paletteConfig';
import type {
  ConstellationProject,
  DeviceLayoutKey,
  MessageTextAlign,
} from '../types/project';
import { CardDecorView } from './CardDecorView';
import { CardThemeBackdrop } from './CardThemeBackdrop';

export type FinalLetterDragKind =
  | 'final-text-move'
  | 'final-text-resize-left'
  | 'final-text-resize-right'
  | 'final-text-resize-nw'
  | 'final-text-resize-ne'
  | 'final-text-resize-sw'
  | 'final-text-resize-se'
  | 'final-card-move'
  | 'final-card-resize-nw'
  | 'final-card-resize-ne'
  | 'final-card-resize-sw'
  | 'final-card-resize-se';

interface FinalLetterCardProps {
  project: ConstellationProject;
  deviceMode?: DeviceLayoutKey;
  signatureText: string;
  isPortrait: boolean;
  isCompactLandscape: boolean;
  reducedMotion: boolean;
  isOpen: boolean;
  onClose: () => void;
  editMode?: boolean;
  selectedTarget?: EditableCardTarget | null;
  activeInlineField?: EditableTextField | null;
  onSelectTarget?: (target: EditableCardTarget | null, field?: EditableTextField) => void;
  onCloseInlineEdit?: () => void;
  onPatchProject?: (patch: Partial<ConstellationProject>) => void;
  letterContainerRef?: RefObject<HTMLElement | null>;
  onBeginElementDrag?: (
    kind: FinalLetterDragKind,
    e: React.PointerEvent<HTMLElement>,
  ) => void;
  onMoveElementDrag?: (e: React.PointerEvent<HTMLElement>) => void;
  onEndElementDrag?: (e: React.PointerEvent<HTMLElement>) => void;
}

const CARD_CORNERS: Array<{
  kind:
    | 'final-card-resize-nw'
    | 'final-card-resize-ne'
    | 'final-card-resize-sw'
    | 'final-card-resize-se';
  pos: string;
  cursor: string;
  label: string;
}> = [
  {
    kind: 'final-card-resize-nw',
    pos: '-top-2.5 -left-2.5',
    cursor: 'cursor-nwse-resize',
    label: 'Уменьшить или увеличить открытку (верхний левый угол)',
  },
  {
    kind: 'final-card-resize-ne',
    pos: '-top-2.5 -right-2.5',
    cursor: 'cursor-nesw-resize',
    label: 'Уменьшить или увеличить открытку (верхний правый угол)',
  },
  {
    kind: 'final-card-resize-sw',
    pos: '-bottom-2.5 -left-2.5',
    cursor: 'cursor-nesw-resize',
    label: 'Уменьшить или увеличить открытку (нижний левый угол)',
  },
  {
    kind: 'final-card-resize-se',
    pos: '-bottom-2.5 -right-2.5',
    cursor: 'cursor-nwse-resize',
    label: 'Уменьшить или увеличить открытку (нижний правый угол)',
  },
];

const TEXT_CORNERS: Array<{
  kind:
    | 'final-text-resize-nw'
    | 'final-text-resize-ne'
    | 'final-text-resize-sw'
    | 'final-text-resize-se';
  pos: string;
  cursor: string;
  label: string;
}> = [
  {
    kind: 'final-text-resize-nw',
    pos: '-top-1.5 -left-1.5',
    cursor: 'cursor-nwse-resize',
    label: 'Изменить размер текста (верхний левый угол)',
  },
  {
    kind: 'final-text-resize-ne',
    pos: '-top-1.5 -right-1.5',
    cursor: 'cursor-nesw-resize',
    label: 'Изменить размер текста (верхний правый угол)',
  },
  {
    kind: 'final-text-resize-sw',
    pos: '-bottom-1.5 -left-1.5',
    cursor: 'cursor-nesw-resize',
    label: 'Изменить размер текста (нижний левый угол)',
  },
  {
    kind: 'final-text-resize-se',
    pos: '-bottom-1.5 -right-1.5',
    cursor: 'cursor-nwse-resize',
    label: 'Изменить размер текста (нижний правый угол)',
  },
];

export function FinalLetterCard({
  project,
  deviceMode,
  signatureText,
  isPortrait,
  isCompactLandscape,
  reducedMotion,
  isOpen,
  onClose,
  editMode = false,
  selectedTarget = null,
  activeInlineField = null,
  onSelectTarget,
  onCloseInlineEdit,
  onPatchProject,
  letterContainerRef,
  onBeginElementDrag,
  onMoveElementDrag,
  onEndElementDrag,
}: FinalLetterCardProps) {
  const inlineInputRef = useRef<HTMLInputElement | null>(null);
  const inlineTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const bodyScrollRef = useRef<HTMLDivElement | null>(null);
  const swipeCloseRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    scrollTopAtStart: number;
  }>({ active: false, pointerId: null, startX: 0, startY: 0, scrollTopAtStart: 0 });

  useEffect(() => {
    if (!editMode || !activeInlineField) return;
    if (activeInlineField === 'finalMessage') {
      const el = inlineTextareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    } else {
      const el = inlineInputRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    }
  }, [editMode, activeInlineField]);

  const activeDevice: DeviceLayoutKey =
    deviceMode ?? (isPortrait || isCompactLandscape ? 'phone' : 'desktop');

  const cardTheme = resolveCardTheme(project.cardTheme);
  const cardColors = resolveCardColors(project);
  const globalGlow = GLOW_COLORS[project.globalGlowColor];
  const isMinimalist = cardTheme.id === 'minimalist';
  const isFrostedDark = !cardColors.isLightPaper;

  const resolvedText = resolveEffectiveFinalTextStyle(project, activeDevice);
  const isDefaultSharedText =
    !project.finalTextStyle || isDefaultStarTextStyle(resolvedText);

  const fontMeta = resolveMessageFont(resolvedText.fontId);
  const sansFontMeta = resolveMessageFont('manrope');

  const effectiveAlign: Exclude<MessageTextAlign, 'auto'> =
    resolvedText.textAlign !== 'auto'
      ? resolvedText.textAlign
      : isMinimalist
        ? 'left'
        : 'center';

  const rawTextColor =
    project.finalTextStyle && !isDefaultSharedText
      ? resolvedText.color
      : project.cardColors?.textColor ??
        (project.cardTheme ? cardColors.textColor : resolvedText.color);
  const effectiveTextColor = resolveContrastSafeCardTextColor(
    rawTextColor,
    project,
    cardColors,
  );

  const effectiveShadow =
    cardColors.isLightPaper && resolvedText.shadow === 'soft' && !project.finalTextStyle
      ? 'none'
      : cardColors.isLightPaper && resolvedText.shadow !== 'glow'
        ? 'none'
        : resolvedText.shadow;

  const textShadowCss = resolveTextShadowCss(effectiveShadow, globalGlow.hex);
  const finalDecor = resolveEffectiveFinalDecor(project, activeDevice);
  const safeDecor = resolveSafeCardDecorPresentation(finalDecor, {
    editMode: false,
    textLength: (project.finalMessage || '').length,
    compactViewport: isPortrait || isCompactLandscape,
  });
  const cardLayout = resolveEffectiveCardLayout(project, activeDevice);

  const bodyPx = Math.min(
    isCompactLandscape ? 19 : isPortrait ? 24 : 30,
    Math.max(
      12,
      Math.round((resolvedText.fontSize + fontMeta.opticalSizeBoost) * 1.15),
    ),
  );
  const headerPx = Math.max(
    12,
    Math.min(isPortrait ? 15 : 20, Math.round(bodyPx * 0.68)),
  );
  const signaturePx = Math.max(15, Math.min(24, Math.round(bodyPx * 0.8)));

  const effectiveAccent = resolvedText.accent;
  const accentStroke = cardColors.accentColor || globalGlow.hex;
  const crestGlowHex = cardColors.isLightPaper ? cardColors.accentColor : globalGlow.hex;
  const crestCoreHex = cardColors.isLightPaper ? cardColors.badgeColor : globalGlow.coreHex;

  const widthClass = cardLayout.customWidthPx
    ? 'max-w-[94vw]'
    : isCompactLandscape
      ? 'max-w-xl'
      : activeDevice === 'phone'
        ? cardLayout.width === 'compact'
          ? 'max-w-[min(86vw,330px)]'
          : cardLayout.width === 'wide'
            ? 'max-w-[min(96vw,440px)]'
            : 'max-w-[min(92vw,390px)]'
        : cardLayout.width === 'compact'
          ? 'max-w-[min(92vw,440px)]'
          : cardLayout.width === 'wide'
            ? 'max-w-[min(92vw,680px)]'
            : 'max-w-[min(92vw,540px)]';

  const hasDecorSafeMargin = finalDecor.motif !== 'none' && !editMode;

  const headerPadClass = isMinimalist
    ? cardLayout.padding === 'compact'
      ? 'pl-8 sm:pl-11 pr-5 sm:pr-7 pt-4 pb-2'
      : 'pl-9 sm:pl-12 pr-6 sm:pr-8 pt-5 sm:pt-6 pb-2.5'
    : cardLayout.padding === 'compact'
      ? 'px-4 sm:px-5 pt-3 pb-1.5'
      : cardLayout.padding === 'spacious'
        ? 'px-6 sm:px-9 pt-5 sm:pt-6 pb-3'
        : 'px-5 sm:px-7 pt-4 sm:pt-5 pb-2';

  const bodyPadClass = isMinimalist
    ? cardLayout.padding === 'compact'
      ? isCompactLandscape
        ? 'max-h-[42dvh] pl-8 sm:pl-11 pr-5 sm:pr-8 py-3.5'
        : isPortrait
          ? 'max-h-[48dvh] pl-8 pr-6 py-4'
          : 'max-h-[52dvh] pl-11 pr-9 py-5'
      : isCompactLandscape
        ? 'max-h-[46dvh] pl-9 sm:pl-12 pr-6 sm:pr-9 py-4'
        : isPortrait
          ? 'max-h-[52dvh] pl-8 pr-6 py-5'
          : 'max-h-[58dvh] pl-12 pr-10 py-7 sm:py-8'
    : cardLayout.padding === 'compact'
      ? isCompactLandscape
        ? 'max-h-[42dvh] px-4 py-2.5'
        : isPortrait
          ? 'max-h-[48dvh] px-4 py-3'
          : 'max-h-[50dvh] px-5 py-3.5'
      : cardLayout.padding === 'spacious'
        ? isCompactLandscape
          ? 'max-h-[46dvh] px-6 py-4'
          : isPortrait
            ? 'max-h-[54dvh] px-6 py-5'
            : 'max-h-[58dvh] px-9 py-6 sm:py-7'
        : isCompactLandscape
          ? 'max-h-[44dvh] px-5 py-3'
          : isPortrait
            ? `max-h-[50dvh] ${hasDecorSafeMargin ? 'px-6' : 'px-5'} py-4`
            : `max-h-[54dvh] ${hasDecorSafeMargin ? 'px-7 sm:px-10' : 'px-5 sm:px-8'} py-5 sm:py-6`;

  const footerPadClass = isMinimalist
    ? cardLayout.padding === 'compact'
      ? 'pl-8 sm:pl-11 pr-5 sm:pr-7 pb-4 pt-1.5'
      : 'pl-9 sm:pl-12 pr-6 sm:pr-8 pb-5 sm:pb-6 pt-2'
    : cardLayout.padding === 'compact'
      ? 'px-4 sm:px-5 pb-2.5 pt-1'
      : cardLayout.padding === 'spacious'
        ? 'px-6 sm:px-9 pb-5 pt-2'
        : 'px-5 sm:px-7 pb-3.5 sm:pb-4 pt-1';

  const alignItemsClass =
    cardLayout.verticalAlign === 'top' ? 'items-start' : 'items-center';

  const cardShiftY = Math.round(cardLayout.offsetY * 1.4);
  const cardScale = cardLayout.scale ?? 1;
  const textMarginLeftPct = computeTextBlockMarginLeftPct(
    resolvedText.widthPct,
    resolvedText.offsetX,
  );
  const textShiftY = Math.round(resolvedText.offsetY * 0.25);

  const topPadClass =
    cardLayout.verticalAlign === 'top'
      ? isCompactLandscape
        ? 'pt-14 pb-3'
        : 'pt-16 sm:pt-20 pb-4'
      : isCompactLandscape
        ? 'pt-8 pb-3'
        : 'pt-10 sm:pt-12 pb-4';

  const handleRecipientSwipeDown = (e: React.PointerEvent<HTMLElement>) => {
    if (editMode) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('button, a, input, textarea, select')) return;
    const sel = window.getSelection?.();
    if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) return;

    swipeCloseRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      scrollTopAtStart: bodyScrollRef.current?.scrollTop ?? 0,
    };
  };

  const handleRecipientSwipeUp = (e: React.PointerEvent<HTMLElement>) => {
    const s = swipeCloseRef.current;
    if (!s.active || s.pointerId !== e.pointerId) return;
    swipeCloseRef.current = { active: false, pointerId: null, startX: 0, startY: 0, scrollTopAtStart: 0 };

    const sel = window.getSelection?.();
    if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) return;

    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    const isHorizontalSwipe = absX >= 55 && absX > absY * 1.2;
    const isDownwardSwipe = dy >= 65 && absY > absX * 1.2 && s.scrollTopAtStart <= 2;
    if (isHorizontalSwipe || isDownwardSwipe) {
      onClose();
    }
  };

  const resetRecipientSwipe = () => {
    swipeCloseRef.current = { active: false, pointerId: null, startX: 0, startY: 0, scrollTopAtStart: 0 };
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className={`pointer-events-none fixed inset-x-0 top-0 bottom-0 z-[25] flex ${alignItemsClass} justify-center px-3 sm:px-6 ${topPadClass}`}
        >
          <motion.article
            ref={letterContainerRef}
            role="dialog"
            aria-modal="false"
            aria-label="Финальное поздравительное письмо"
            data-testid="final-letter-card"
            data-device={activeDevice}
            data-card-width={cardLayout.width}
            data-card-padding={cardLayout.padding}
            data-card-scale={cardScale}
            initial={
              reducedMotion
                ? { opacity: 0, y: cardShiftY, scale: cardScale }
                : { opacity: 0, y: cardShiftY + 145, scale: cardScale * 0.86 }
            }
            animate={
              reducedMotion
                ? { opacity: 1, y: cardShiftY, scale: cardScale }
                : { opacity: 1, y: cardShiftY, scale: cardScale }
            }
            exit={
              reducedMotion
                ? { opacity: 0, y: cardShiftY, scale: cardScale }
                : { opacity: 0, y: cardShiftY + 115, scale: cardScale * 0.9 }
            }
            transition={{
              duration: reducedMotion ? 0.1 : 0.65,
              ease: [0.16, 1, 0.3, 1],
            }}
            onPointerDown={handleRecipientSwipeDown}
            onPointerUp={handleRecipientSwipeUp}
            onPointerCancel={resetRecipientSwipe}
            onClick={(e) => {
              if (editMode && e.target === e.currentTarget) {
                onSelectTarget?.('card');
              }
            }}
            style={{
              transformOrigin: 'center center',
              width: cardLayout.customWidthPx ? `${cardLayout.customWidthPx}px` : undefined,
              minHeight: cardLayout.customHeightPx ? `${cardLayout.customHeightPx}px` : undefined,
              background: isFrostedDark
                ? `linear-gradient(155deg, ${cardColors.surfaceBg}D9 0%, ${cardColors.surfaceBgAlt}EA 100%)`
                : `linear-gradient(155deg, ${cardColors.surfaceBg} 0%, ${cardColors.surfaceBgAlt} 100%)`,
              borderColor: isFrostedDark
                ? `${cardColors.borderColor}7A`
                : `${cardColors.borderColor}88`,
              boxShadow: isFrostedDark
                ? `0 24px 72px rgba(4, 3, 18, 0.72), 0 0 44px ${cardColors.accentColor}22, inset 0 1px 0 rgba(255,255,255,0.42)`
                : `0 24px 64px rgba(4, 7, 20, 0.55), 0 0 0 1px ${cardColors.accentColor}26, inset 0 1px 0 rgba(255,255,255,0.65)`,
            }}
            className={`pointer-events-auto relative w-full ${widthClass} rounded-[26px] border flex flex-col justify-between ${
              isFrostedDark ? 'backdrop-blur-2xl gl-card-holo-rim' : ''
            } ${
              editMode && selectedTarget === 'card'
                ? 'ring-2 ring-dashed ring-amber-300/95'
                : editMode
                  ? 'ring-1 ring-dashed ring-amber-300/55 hover:ring-amber-300/85'
                  : ''
            }`}
          >
            {/* 4 Golden/White Corner Scale Handles for Entire Final Card */}
            {editMode && onBeginElementDrag && (
              <>
                {CARD_CORNERS.map((corner) => (
                  <button
                    key={corner.kind}
                    type="button"
                    data-testid={corner.kind}
                    aria-label={corner.label}
                    title="Потяни за уголок, чтобы уменьшить или увеличить открытку"
                    onPointerDown={(e) => onBeginElementDrag(corner.kind, e)}
                    onPointerMove={onMoveElementDrag}
                    onPointerUp={onEndElementDrag}
                    onPointerCancel={onEndElementDrag}
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute ${corner.pos} w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-400 border-2 border-white ${corner.cursor} touch-none shadow-[0_2px_10px_rgba(0,0,0,0.65)] z-30 transition-transform hover:scale-110 flex items-center justify-center`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#181236]" />
                  </button>
                ))}
              </>
            )}

            {/* Inner clipped background layer for backdrop artwork & theme ornament */}
            <div className="pointer-events-none absolute inset-0 rounded-[26px] overflow-hidden">
              <CardThemeBackdrop
                pattern={cardTheme.paperPattern}
                accentColor={cardColors.accentColor}
                badgeColor={cardColors.badgeColor}
                borderColor={cardColors.borderColor}
                glowHex={globalGlow.hex}
                isLightPaper={cardColors.isLightPaper}
                reducedMotion={reducedMotion}
              />

              {finalDecor.motif !== 'none' && (
                <div
                  data-testid="finale-card-decor"
                  style={{
                    left: `${safeDecor.xPct}%`,
                    top: `${safeDecor.yPct}%`,
                    transform: `translate(-50%, -50%) scale(${safeDecor.scale})`,
                    opacity: safeDecor.opacity,
                  }}
                  className="pointer-events-none absolute z-0"
                >
                  <CardDecorView
                    motif={finalDecor.motif}
                    glowHex={crestGlowHex}
                    coreHex={crestCoreHex}
                    className={isPortrait ? 'w-20 h-20' : 'w-24 h-24'}
                  />
                </div>
              )}
            </div>

            {/* Letter Sheet Header: draggable handle for whole card vertical placement + click-to-edit recipient/title */}
            <div
              onPointerDown={
                editMode && onBeginElementDrag
                  ? (e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest('button, input, textarea')) return;
                      onBeginElementDrag('final-card-move', e);
                    }
                  : undefined
              }
              onPointerMove={editMode ? onMoveElementDrag : undefined}
              onPointerUp={editMode ? onEndElementDrag : undefined}
              onPointerCancel={editMode ? onEndElementDrag : undefined}
              onClick={
                editMode
                  ? (e) => {
                      if ((e.target as HTMLElement).closest('button, input, textarea, [data-inline-field]')) return;
                      e.stopPropagation();
                      onSelectTarget?.('card');
                    }
                  : undefined
              }
              className={`relative z-10 flex items-start justify-between gap-2.5 sm:gap-3 ${headerPadClass} shrink-0 ${
                editMode ? 'cursor-grab active:cursor-grabbing touch-none' : ''
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                {isMinimalist ? (
                  <span
                    className="mt-1 inline-block w-2.5 h-2.5 rotate-45 border shrink-0"
                    style={{
                      borderColor: cardColors.accentColor,
                      backgroundColor: `${cardColors.accentColor}26`,
                    }}
                    aria-hidden="true"
                  />
                ) : (
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 rounded-full shrink-0 border"
                    style={{
                      borderColor: `${cardColors.accentColor}55`,
                      backgroundColor: `${cardColors.accentColor}1c`,
                      color: cardColors.accentColor,
                    }}
                    aria-hidden="true"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </span>
                )}

                {editMode ? (
                  <div
                    className="flex flex-wrap items-center gap-1 min-w-0 flex-1 font-semibold tracking-wide"
                    style={{ color: cardColors.badgeColor, fontSize: `${headerPx}px` }}
                  >
                    {activeInlineField === 'recipientName' ? (
                      <input
                        ref={inlineInputRef}
                        type="text"
                        maxLength={40}
                        value={project.recipientName}
                        placeholder="Имя получателя"
                        data-testid="inline-edit-recipientName"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onPatchProject?.({ recipientName: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === 'Escape') {
                            e.preventDefault();
                            onCloseInlineEdit?.();
                          }
                        }}
                        onBlur={() => onCloseInlineEdit?.()}
                        style={{
                          color: cardColors.badgeColor,
                          borderColor: `${cardColors.accentColor}88`,
                          fontSize: `${headerPx}px`,
                        }}
                        className="w-32 sm:w-40 rounded-md border bg-white/15 px-1.5 py-0.5 font-semibold outline-none"
                      />
                    ) : (
                      <span
                        data-inline-field="recipientName"
                        data-testid="card-text-recipientName"
                        title="Нажми, чтобы изменить имя получателя"
                        className="inline-flex items-center gap-1 rounded px-1 -mx-0.5 py-0.5 cursor-text hover:bg-black/10 transition-colors whitespace-normal break-words [overflow-wrap:anywhere] leading-snug"
                      >
                        {project.recipientName.trim()
                          ? `Для ${project.recipientName}`
                          : 'Для кого?'}
                      </span>
                    )}

                    <span className="opacity-60">·</span>

                    {activeInlineField === 'title' ? (
                      <input
                        ref={inlineInputRef}
                        type="text"
                        maxLength={50}
                        value={project.title}
                        placeholder="Название открытки"
                        data-testid="inline-edit-title"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onPatchProject?.({ title: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === 'Escape') {
                            e.preventDefault();
                            onCloseInlineEdit?.();
                          }
                        }}
                        onBlur={() => onCloseInlineEdit?.()}
                        style={{
                          color: cardColors.badgeColor,
                          borderColor: `${cardColors.accentColor}88`,
                          fontSize: `${headerPx}px`,
                        }}
                        className="min-w-[120px] flex-1 rounded-md border bg-white/15 px-1.5 py-0.5 font-semibold outline-none"
                      />
                    ) : (
                      <span
                        data-inline-field="title"
                        data-testid="card-text-title"
                        title="Нажми, чтобы изменить заголовок открытки"
                        className="inline-flex items-center gap-1 rounded px-1 py-0.5 cursor-text hover:bg-black/10 transition-colors whitespace-normal break-words [overflow-wrap:anywhere] leading-snug"
                      >
                        {project.title.trim() || 'Название открытки'}
                      </span>
                    )}
                  </div>
                ) : (
                  <p
                    data-testid="final-letter-header-text"
                    className={`min-w-0 flex-1 whitespace-normal break-words [overflow-wrap:anywhere] leading-snug font-semibold ${
                      isMinimalist
                        ? 'uppercase tracking-[0.1em]'
                        : 'tracking-wide'
                    }`}
                    style={{
                      color: cardColors.badgeColor,
                      fontSize: `${headerPx}px`,
                      fontFamily: isMinimalist ? sansFontMeta.cssFamily : undefined,
                    }}
                  >
                    {project.recipientName
                      ? `Для ${project.recipientName} · ${project.title}`
                      : project.title}
                  </p>
                )}
              </div>

              {!editMode && (
                <button
                  type="button"
                  onClick={onClose}
                  title="Скрыть письмо и любоваться созвездием"
                  aria-label="Скрыть письмо"
                  data-testid="close-final-letter-btn"
                  style={{
                    color: cardColors.badgeColor,
                    borderColor: `${cardColors.borderColor}66`,
                    backgroundColor: cardColors.isLightPaper
                      ? 'rgba(255,255,255,0.65)'
                      : 'rgba(255,255,255,0.08)',
                  }}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full border transition-transform hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Subtle Hatched / Diamond / Hairline Divider */}
            <div
              className={`relative z-10 ${
                isMinimalist ? 'pl-8 sm:pl-11 pr-5 sm:pr-7' : 'px-5 sm:px-7'
              } shrink-0`}
            >
              {cardTheme.paperPattern === 'aurora' ? (
                <div className="h-2.5 w-full rounded-sm border-y border-white/15 gl-diamond-band opacity-75" />
              ) : cardTheme.paperPattern === 'stars' ? (
                <div className="h-2 w-full rounded-sm border-y border-white/10 gl-hatched-divider opacity-80" />
              ) : (
                <div
                  className="h-px w-full opacity-40"
                  style={{
                    background: isMinimalist
                      ? cardColors.borderColor
                      : `linear-gradient(90deg, transparent, ${cardColors.accentColor}, transparent)`,
                  }}
                />
              )}
            </div>

            {/* Scrollable Body for Short or Long Greeting Text */}
            <div ref={bodyScrollRef} className={`relative z-10 flex-1 overflow-y-auto overscroll-contain ${bodyPadClass}`}>
              <div
                data-testid="finale-text-block"
                data-selected={editMode && selectedTarget === 'text'}
                onPointerDown={
                  editMode && onBeginElementDrag
                    ? (e) => {
                        if ((e.target as HTMLElement).closest('input, textarea, button')) return;
                        onBeginElementDrag('final-text-move', e);
                      }
                    : undefined
                }
                onPointerMove={editMode ? onMoveElementDrag : undefined}
                onPointerUp={editMode ? onEndElementDrag : undefined}
                onPointerCancel={editMode ? onEndElementDrag : undefined}
                onClick={
                  editMode
                    ? (e) => {
                        if ((e.target as HTMLElement).closest('input, textarea, button')) return;
                        e.stopPropagation();
                        onSelectTarget?.('text');
                      }
                    : undefined
                }
                style={{
                  width: `${resolvedText.widthPct}%`,
                  marginLeft: `${textMarginLeftPct}%`,
                  transform: textShiftY !== 0 ? `translateY(${textShiftY}px)` : undefined,
                  textAlign: effectiveAlign,
                  fontFamily: fontMeta.cssFamily,
                  borderColor:
                    effectiveAccent === 'frame'
                      ? `${accentStroke}55`
                      : effectiveAccent === 'quote'
                        ? accentStroke
                        : undefined,
                }}
                className={`relative max-w-full space-y-3 ${
                  effectiveAccent === 'frame'
                    ? 'rounded-2xl border px-4 py-3.5 sm:px-5 sm:py-4'
                    : effectiveAccent === 'quote'
                      ? effectiveAlign === 'right'
                        ? 'border-r-2 pr-4 py-0.5'
                        : 'border-l-2 pl-4 py-0.5'
                      : ''
                } ${
                  editMode
                    ? `cursor-grab active:cursor-grabbing touch-none rounded-xl transition-[box-shadow] ${
                        selectedTarget === 'text'
                          ? 'ring-2 ring-violet-400'
                          : 'ring-1 ring-dashed ring-current/25 hover:ring-violet-400/60'
                      }`
                    : ''
                }`}
              >
                {editMode && selectedTarget === 'text' && onBeginElementDrag && (
                  <>
                    {TEXT_CORNERS.map((corner) => (
                      <button
                        key={corner.kind}
                        type="button"
                        data-testid={corner.kind}
                        aria-label={corner.label}
                        onPointerDown={(e) => onBeginElementDrag(corner.kind, e)}
                        onPointerMove={onMoveElementDrag}
                        onPointerUp={onEndElementDrag}
                        onPointerCancel={onEndElementDrag}
                        className={`absolute ${corner.pos} w-3.5 h-3.5 rounded-full bg-violet-400 border-2 border-white ${corner.cursor} touch-none shadow z-20 transition-transform hover:scale-125`}
                      />
                    ))}
                    <button
                      type="button"
                      data-testid="finale-text-resize-left"
                      aria-label="Изменить ширину текста слева"
                      onPointerDown={(e) => onBeginElementDrag('final-text-resize-left', e)}
                      onPointerMove={onMoveElementDrag}
                      onPointerUp={onEndElementDrag}
                      onPointerCancel={onEndElementDrag}
                      className="absolute top-1/2 -left-2 -translate-y-1/2 w-3 h-6 rounded-full bg-violet-500/90 border border-white cursor-ew-resize touch-none shadow z-20"
                    />
                    <button
                      type="button"
                      data-testid="finale-text-resize-right"
                      aria-label="Изменить ширину текста справа"
                      onPointerDown={(e) => onBeginElementDrag('final-text-resize-right', e)}
                      onPointerMove={onMoveElementDrag}
                      onPointerUp={onEndElementDrag}
                      onPointerCancel={onEndElementDrag}
                      className="absolute top-1/2 -right-2 -translate-y-1/2 w-3 h-6 rounded-full bg-violet-500/90 border border-white cursor-ew-resize touch-none shadow z-20"
                    />
                  </>
                )}

                {effectiveAccent === 'line' && (
                  <div
                    className="h-0.5 w-16 rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${cardColors.accentColor}, ${cardColors.badgeColor})`,
                      marginLeft: effectiveAlign === 'left' ? 0 : 'auto',
                      marginRight: effectiveAlign === 'center' ? 'auto' : 0,
                    }}
                  />
                )}

                {editMode && activeInlineField === 'finalMessage' ? (
                  <textarea
                    ref={inlineTextareaRef}
                    rows={4}
                    maxLength={800}
                    value={project.finalMessage}
                    placeholder="Напиши финальное поздравление..."
                    data-testid="inline-edit-finalMessage"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onPatchProject?.({ finalMessage: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        onCloseInlineEdit?.();
                      }
                    }}
                    onBlur={() => onCloseInlineEdit?.()}
                    style={{
                      fontFamily: fontMeta.cssFamily,
                      fontWeight: resolvedText.fontWeight === 'semibold' ? 600 : 400,
                      fontSize: `${bodyPx}px`,
                      lineHeight: Math.min(1.85, resolvedText.lineHeight),
                      color: effectiveTextColor,
                      textShadow: textShadowCss,
                      textAlign: effectiveAlign,
                      borderColor: `${cardColors.accentColor}88`,
                    }}
                    className="w-full rounded-xl border bg-black/15 px-2.5 py-1.5 outline-none resize-y"
                  />
                ) : (
                  <p
                    data-selectable-text={editMode ? undefined : 'true'}
                    data-inline-field={editMode ? 'finalMessage' : undefined}
                    data-testid="card-text-finalMessage"
                    title={editMode ? 'Нажми, чтобы изменить текст поздравления' : undefined}
                    style={{
                      fontFamily: fontMeta.cssFamily,
                      fontWeight: resolvedText.fontWeight === 'semibold' ? 600 : 400,
                      fontSize: `${bodyPx}px`,
                      lineHeight: Math.min(1.85, resolvedText.lineHeight),
                      color: effectiveTextColor,
                      textShadow: textShadowCss,
                    }}
                    className={`whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${
                      editMode
                        ? 'select-none cursor-text rounded-lg px-1 -mx-1 hover:bg-black/10 transition-colors'
                        : 'select-text'
                    }`}
                  >
                    {project.finalMessage ||
                      'Пусть это созвездие всегда напоминает о самом светлом и добром!'}
                  </p>
                )}

                {editMode && activeInlineField === 'senderName' ? (
                  <input
                    ref={inlineInputRef}
                    type="text"
                    maxLength={40}
                    value={project.senderName ?? ''}
                    placeholder="Твоё имя"
                    data-testid="inline-edit-senderName"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onPatchProject?.({ senderName: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Escape') {
                        e.preventDefault();
                        onCloseInlineEdit?.();
                      }
                    }}
                    onBlur={() => onCloseInlineEdit?.()}
                    style={{
                      fontFamily: fontMeta.cssFamily,
                      fontSize: `${signaturePx}px`,
                      color: effectiveTextColor,
                      textShadow: textShadowCss,
                      textAlign: effectiveAlign,
                      borderColor: `${cardColors.accentColor}88`,
                    }}
                    className="w-48 max-w-full rounded-lg border bg-black/15 px-2 py-0.5 italic outline-none"
                  />
                ) : (signatureText || editMode) ? (
                  <p
                    data-selectable-text={editMode ? undefined : 'true'}
                    data-inline-field={editMode ? 'senderName' : undefined}
                    data-testid="card-text-senderName"
                    title={editMode ? 'Нажми, чтобы изменить подпись' : undefined}
                    style={{
                      fontFamily: fontMeta.cssFamily,
                      fontSize: `${signaturePx}px`,
                      color: effectiveTextColor,
                      opacity: signatureText ? 0.84 : 0.54,
                      textShadow: textShadowCss,
                    }}
                    className={`pt-1.5 italic ${
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
            </div>

            <div className={`relative z-10 ${footerPadClass} shrink-0`} aria-hidden="true" />
          </motion.article>
        </div>
      )}
    </AnimatePresence>
  );
}
