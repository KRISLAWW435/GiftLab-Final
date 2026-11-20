import type React from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import type { EditableCardTarget, EditableTextField } from '../../preview/previewProtocol';
import {
  getEnvelope2DSvgSpec,
  getEnvelopeMotifSvgElements,
  hexWithAlpha,
  resolveEnvelopeGlowFactors,
  resolveEnvelopePaletteColors,
  resolveSealPaletteColors,
  type CosmicPaletteConfig,
  type EnvelopeScreenGeometry,
  type GlowColorConfig,
} from '../../scene/paletteConfig';
import type { ConstellationProject } from '../../types/project';
import { type CanvasEditDragHandlers, RecipientFullscreenButton } from './recipientTypes';

const SEAL_STAR_POINTS_2D = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4 - Math.PI / 2;
  const r = i % 2 === 0 ? 11 : 4.6;
  return `${(16 + Math.cos(a) * r).toFixed(2)},${(16 + Math.sin(a) * r).toFixed(2)}`;
}).join(' ');

interface RecipientSealedPhaseProps extends CanvasEditDragHandlers {
  project: ConstellationProject;
  palette: CosmicPaletteConfig;
  globalGlow: GlowColorConfig;
  envelopeGeom: EnvelopeScreenGeometry;
  webglUnavailable: boolean;
  editMode: boolean;
  selectedTarget: EditableCardTarget | null;
  activeInlineField: EditableTextField | null;
  storyInlineInputRef: React.RefObject<HTMLInputElement | null>;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onExitPreview?: () => void;
  onOpenEnvelope: () => void;
  onSelectTarget?: (target: EditableCardTarget | null, field?: EditableTextField) => void;
  onPatchProject?: (patch: Partial<ConstellationProject>) => void;
  onSetInlineField: (field: EditableTextField | null) => void;
}

export function RecipientSealedPhase({
  project,
  palette,
  globalGlow,
  envelopeGeom,
  webglUnavailable,
  editMode,
  selectedTarget,
  activeInlineField,
  storyInlineInputRef,
  isFullscreen,
  onToggleFullscreen,
  onExitPreview,
  onOpenEnvelope,
  onSelectTarget,
  onPatchProject,
  onSetInlineField,
  beginCanvasEdit,
  moveCanvasEdit,
  endCanvasEdit,
}: RecipientSealedPhaseProps) {
  const {
    resolvedEnvelope,
    boxW: envelopeBoxW,
    boxH: envelopeBoxH,
    textTranslateYPx: envelopeTextTranslateYPx,
    footerTranslateYPx: envelopeFooterTranslateYPx,
    screenOffsetYPx: envelopeScreenOffsetYPx,
  } = envelopeGeom;

  const envColors = resolveEnvelopePaletteColors(resolvedEnvelope.envelopeColor, palette);
  const sealColors = resolveSealPaletteColors(resolvedEnvelope.sealColor, globalGlow);
  const glowFactors = resolveEnvelopeGlowFactors(
    resolvedEnvelope.glowIntensity,
    envColors,
    sealColors,
  );
  const svgSpec = getEnvelope2DSvgSpec(resolvedEnvelope.shape);
  const motifElements = getEnvelopeMotifSvgElements(resolvedEnvelope.motif);

  return (
    <>
      {/* 2D fallback frosted sealed envelope when WebGL2 is unavailable */}
      {webglUnavailable && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center p-4"
          style={{
            background: `radial-gradient(ellipse 68% 54% at 50% 54%, ${hexWithAlpha(
              envColors.bodyHex,
              glowFactors.fallbackGlowAlpha,
            )} 0%, ${palette.midColor}E6 48%, ${palette.deepColor} 100%)`,
          }}
        >
          <div
            onClick={editMode ? () => onSelectTarget?.('envelope') : onOpenEnvelope}
            className={`relative border backdrop-blur-2xl flex flex-col items-center justify-center overflow-hidden shadow-[0_28px_80px_rgba(6,4,18,0.75)] cursor-pointer transition-transform hover:scale-[1.02] ${
              editMode && selectedTarget === 'envelope'
                ? 'ring-2 ring-amber-400/90 border-white/65'
                : 'border-white/45'
            }`}
            style={{
              width: `${envelopeBoxW}px`,
              height: `${envelopeBoxH}px`,
              borderRadius: `${svgSpec.borderRadiusPx}px`,
              transform:
                envelopeScreenOffsetYPx !== 0
                  ? `translateY(${envelopeScreenOffsetYPx}px)`
                  : undefined,
              background: `linear-gradient(155deg, ${envColors.bodyHex} 0%, ${envColors.pocketHex} 100%)`,
              boxShadow:
                '0 24px 60px rgba(8,4,24,0.62), inset 0 1px 0 rgba(255,255,255,0.65)',
            }}
          >
            <svg
              viewBox="0 0 320 192"
              fill="none"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 w-full h-full"
              aria-hidden="true"
            >
              <path
                d={svgSpec.pocketPath}
                fill={envColors.pocketHex}
                fillOpacity="0.88"
                stroke={envColors.borderHex}
                strokeOpacity="0.48"
                strokeWidth="1.6"
              />
              <path
                d={svgSpec.flapPath}
                fill={envColors.flapHex}
                fillOpacity="0.92"
                stroke={envColors.borderHex}
                strokeOpacity="0.78"
                strokeWidth="2"
              />
            </svg>

            {motifElements.length > 0 && (
              <div
                className="pointer-events-none absolute bottom-3 right-3.5 z-10 w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  color: envColors.motifInkHex,
                  border: `1.5px dashed ${envColors.motifInkHex}88`,
                  background: envColors.isLightBody
                    ? 'rgba(45,27,78,0.06)'
                    : 'rgba(255,255,255,0.1)',
                }}
                aria-hidden="true"
              >
                <svg viewBox="0 0 48 48" className="w-7 h-7">
                  {motifElements.map((elSpec, idx) => {
                    if (elSpec.tag === 'path') return <path key={idx} {...elSpec.attrs} />;
                    if (elSpec.tag === 'circle') return <circle key={idx} {...elSpec.attrs} />;
                    if (elSpec.tag === 'polygon') return <polygon key={idx} {...elSpec.attrs} />;
                    if (elSpec.tag === 'line') return <line key={idx} {...elSpec.attrs} />;
                    return <ellipse key={idx} {...elSpec.attrs} />;
                  })}
                </svg>
              </div>
            )}

            <div
              className="relative z-10 w-14 h-14 rounded-full flex items-center justify-center border-[2.5px]"
              style={{
                marginTop: `${svgSpec.sealTopOffsetPx}px`,
                backgroundColor: sealColors.discHex,
                borderColor: sealColors.rimHex,
                boxShadow: `0 6px 20px rgba(0,0,0,0.4), 0 0 24px ${hexWithAlpha(
                  sealColors.haloHex,
                  glowFactors.sealShadowHaloAlpha,
                )}`,
              }}
            >
              <svg viewBox="0 0 32 32" className="w-8 h-8" aria-hidden="true">
                <polygon points={SEAL_STAR_POINTS_2D} fill={sealColors.starHex} />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 1: Sealed Envelope */}
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
        } fixed inset-0 z-20 flex flex-col justify-between px-5 sm:px-8 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pt-[max(1.5rem,env(safe-area-inset-top,0px))] sm:pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]`}
      >
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

        <header className="relative z-20 flex items-start justify-between gap-2 sm:gap-4">
          <div className="pointer-events-auto w-9 sm:w-20 shrink-0 flex items-start">
            {onExitPreview && (
              <button
                type="button"
                onClick={onExitPreview}
                aria-label="В редактор"
                title="В редактор"
                className="gl-btn-secondary !bg-gl-panel/85 hover:!bg-gl-card text-gl-text !px-2.5 sm:!px-3 !py-2 text-xs whitespace-nowrap"
              >
                <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">В редактор</span>
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
                    onSetInlineField(null);
                  }
                }}
                onBlur={() => onSetInlineField(null)}
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
                    onSetInlineField(null);
                  }
                }}
                onBlur={() => onSetInlineField(null)}
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

          <div className="pointer-events-auto w-9 sm:w-20 shrink-0 flex items-start justify-end">
            {!editMode && (
              <RecipientFullscreenButton
                isFullscreen={isFullscreen}
                onToggle={onToggleFullscreen}
                pillStyle
              />
            )}
          </div>
        </header>

        <div
          data-testid="envelope-footer-block"
          onPointerDown={
            editMode ? (e) => beginCanvasEdit('envelope-footer-move', e) : undefined
          }
          onPointerMove={editMode ? moveCanvasEdit : undefined}
          onPointerUp={editMode ? endCanvasEdit : undefined}
          onPointerCancel={editMode ? endCanvasEdit : undefined}
          style={{
            transform:
              envelopeFooterTranslateYPx !== 0
                ? `translateY(${envelopeFooterTranslateYPx}px)`
                : undefined,
          }}
          title={
            editMode
              ? 'Нажми на текст или кнопку для правки, либо перетащи блок выше/ниже'
              : undefined
          }
          className={`relative z-20 pointer-events-auto flex flex-col items-center gap-3 pb-4 sm:pb-6 mx-auto ${
            editMode
              ? 'cursor-grab active:cursor-grabbing touch-none rounded-2xl px-4 pt-2 border border-transparent hover:border-amber-300/50 hover:bg-white/[0.03] transition-colors'
              : ''
          }`}
        >
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
                  onSetInlineField(null);
                }
              }}
              onBlur={() => onSetInlineField(null)}
              className="w-80 max-w-full rounded-lg border border-amber-300/70 bg-black/40 px-2.5 py-1 text-center text-xs sm:text-sm text-white outline-none"
            />
          ) : (
            <p
              data-testid="envelope-hint-text"
              data-inline-field="envelopeHint"
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
                  onSetInlineField(null);
                }
              }}
              onBlur={() => onSetInlineField(null)}
              className="w-64 rounded-full border border-amber-300 bg-white/95 px-6 py-3 text-center text-sm sm:text-base font-semibold text-[#181236] outline-none shadow-xl"
            />
          ) : (
            <button
              type="button"
              data-testid="open-envelope-cta-btn"
              data-inline-field="envelopeCta"
              onClick={editMode ? undefined : onOpenEnvelope}
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
    </>
  );
}
