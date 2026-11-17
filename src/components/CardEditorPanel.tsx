import { useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  CopyCheck,
  Frame,
  Image as ImageIcon,
  ImagePlus,
  LayoutTemplate,
  Mail,
  Maximize,
  Minimize,
  Move,
  RotateCcw,
  Sparkles,
  Type,
} from 'lucide-react';
import { BUILTIN_ILLUSTRATIONS, BuiltinIllustration } from '../assets/illustrations';
import type { EditableCardTarget, EditableTextField } from '../preview/previewProtocol';
import {
  DARK_CARD_TEXT_COLORS,
  DEFAULT_CARD_LAYOUT,
  DEFAULT_ENVELOPE_TEXTS,
  DEFAULT_STAR_IMAGE_SETTINGS,
  ENVELOPE_COLOR_SWATCHES,
  ENVELOPE_MAX_SCALE,
  ENVELOPE_MIN_SCALE,
  ENVELOPE_OFFSET_MAX,
  ENVELOPE_OFFSET_MIN,
  ENVELOPE_TEXT_OFFSET_MAX,
  ENVELOPE_TEXT_OFFSET_MIN,
  GLOW_COLORS,
  LIGHT_PAPER_TEXT_COLORS,
  MESSAGE_FONTS,
  MESSAGE_FONT_CATEGORIES,
  SEAL_COLOR_SWATCHES,
  buildProjectCardDevicePatch,
  buildProjectFinalTextDevicePatch,
  buildStarIllustrationDevicePatch,
  buildStarTextDevicePatch,
  getDefaultDeviceIllustrationLayout,
  getDefaultDeviceTextLayout,
  resetDeviceLayoutInProject,
  resolveCardColors,
  resolveEffectiveCardLayout,
  resolveEffectiveFinalTextStyle,
  resolveEffectiveIllustrationLayout,
  resolveEffectiveStarTextStyle,
  resolveEnvelopeOffsetY,
  resolveEnvelopeSettings,
  resolveEnvelopeTextOffsetY,
  resolveEnvelopeUserScale,
  resolveStarImageSettings,
  sanitizeEnvelopeSettings,
} from '../scene/paletteConfig';
import { saveImageBlob } from '../services/database';
import { processUploadedImage } from '../services/imageProcessor';
import type {
  CardPaddingPreset,
  CardVerticalAlign,
  CardWidthPreset,
  ConstellationProject,
  ConstellationStar,
  DeviceCardLayout,
  EnvelopeSettings,
  MessageTextAccent,
  MessageTextAlign,
  MessageTextShadow,
  MessageTextWeight,
  RecipientPhase,
  StarIllustrationLayout,
  StarIllustrationRef,
  StarImageFitMode,
  StarImageSettings,
  StarTextStyle,
} from '../types/project';
import { CardLibraryPanel } from './CardLibraryPanel';
import type { PreviewDeviceId } from './LivePreviewStage';
import { StarIllustrationView } from './StarIllustrationView';

export type CardEditorTab = 'theme' | 'text' | 'illustration' | 'card';

interface CardEditorPanelProps {
  project: ConstellationProject;
  device: PreviewDeviceId;
  cardPhase: RecipientPhase;
  cardStarIndex: number;
  activeTab: CardEditorTab;
  focusedField?: EditableTextField | null;
  onChangeTab: (tab: CardEditorTab, target?: EditableCardTarget) => void;
  onSelectCardTargetView: (
    phase: 'sealed' | 'constellation' | 'starStory',
    starIndex?: number,
  ) => void;
  onPatchProject: (patch: Partial<ConstellationProject>) => void;
  onPatchStar: (starId: string, patch: Partial<ConstellationStar>) => void;
  onResetDeviceLayout: (nextProject: ConstellationProject) => void;
}

export function CardEditorPanel({
  project,
  device,
  cardPhase,
  cardStarIndex,
  activeTab,
  focusedField = null,
  onChangeTab,
  onSelectCardTargetView,
  onPatchProject,
  onPatchStar,
  onResetDeviceLayout,
}: CardEditorPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cropDragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [appliedAllNotice, setAppliedAllNotice] = useState(false);
  const [resetLayoutNotice, setResetLayoutNotice] = useState(false);

  const isEnvelopePhase = cardPhase === 'sealed';
  const isFinaleCard = cardPhase === 'constellation' || cardPhase === 'finalReveal';
  const safeStarIndex = Math.max(
    0,
    Math.min(Math.max(0, project.stars.length - 1), cardStarIndex),
  );
  const activeStar = project.stars[safeStarIndex] ?? project.stars[0];

  const activeTextStyle = isFinaleCard
    ? resolveEffectiveFinalTextStyle(project, device)
    : resolveEffectiveStarTextStyle(activeStar, device);

  const activeIlluLayout = resolveEffectiveIllustrationLayout(activeStar, device);
  const activeImgSettings = resolveStarImageSettings(activeStar);
  const activeCardLayout = resolveEffectiveCardLayout(project, device);
  const resolvedEnvelope = resolveEnvelopeSettings(project);
  const activeEnvelopeScale = resolveEnvelopeUserScale(project.envelopeSettings, device);
  const activeEnvelopeTextOffsetY = resolveEnvelopeTextOffsetY(
    project.envelopeSettings,
    device,
  );
  const activeEnvelopeOffsetY = resolveEnvelopeOffsetY(
    project.envelopeSettings,
    device,
  );
  const paletteGlow = GLOW_COLORS[project.globalGlowColor] ?? GLOW_COLORS.gold;

  const resolvedCardColors = resolveCardColors(project);
  const orderedTextColors = resolvedCardColors.isLightPaper
    ? [...LIGHT_PAPER_TEXT_COLORS, ...DARK_CARD_TEXT_COLORS]
    : [...DARK_CARD_TEXT_COLORS, ...LIGHT_PAPER_TEXT_COLORS];

  const updateEnvelopeSettings = (patch: Partial<EnvelopeSettings>) => {
    const next: EnvelopeSettings = {
      ...project.envelopeSettings,
      ...patch,
    };
    onPatchProject({ envelopeSettings: next });
  };

  const resetEnvelopeSettings = () => {
    onPatchProject({ envelopeSettings: sanitizeEnvelopeSettings(undefined) });
  };

  const updateActiveTextStyle = (patch: Partial<StarTextStyle>) => {
    if (isFinaleCard) {
      onPatchProject(buildProjectFinalTextDevicePatch(project, device, patch));
    } else if (activeStar) {
      onPatchStar(activeStar.id, buildStarTextDevicePatch(activeStar, device, patch));
    }
  };

  const resetActiveTextLayout = () => {
    updateActiveTextStyle(getDefaultDeviceTextLayout(device));
  };

  const applyActiveTextStyleToAllStars = () => {
    const devText = getDefaultDeviceTextLayout(device);
    const activeDevText = {
      fontSize: activeTextStyle.fontSize,
      textAlign: activeTextStyle.textAlign,
      lineHeight: activeTextStyle.lineHeight,
      offsetX: activeTextStyle.offsetX,
      offsetY: activeTextStyle.offsetY,
      widthPct: activeTextStyle.widthPct,
    };
    onPatchProject({
      stars: project.stars.map((s) => ({
        ...s,
        textStyle: {
          ...activeTextStyle,
          ...devText,
        },
        deviceLayouts: {
          ...s.deviceLayouts,
          [device]: {
            ...s.deviceLayouts?.[device],
            text: activeDevText,
          },
        },
      })),
    });
    setAppliedAllNotice(true);
    window.setTimeout(() => setAppliedAllNotice(false), 1500);
  };

  const updateActiveIllustrationLayout = (patch: Partial<StarIllustrationLayout>) => {
    if (!activeStar) return;
    onPatchStar(activeStar.id, buildStarIllustrationDevicePatch(activeStar, device, patch));
  };

  const updateActiveImageSettings = (patch: Partial<StarImageSettings>) => {
    if (!activeStar) return;
    onPatchStar(activeStar.id, {
      imageSettings: resolveStarImageSettings({
        imageSettings: { ...activeImgSettings, ...patch },
      }),
    });
  };

  const resetActiveIllustration = () => {
    if (!activeStar) return;
    onPatchStar(activeStar.id, {
      ...buildStarIllustrationDevicePatch(
        activeStar,
        device,
        getDefaultDeviceIllustrationLayout(device),
      ),
      imageSettings: { ...DEFAULT_STAR_IMAGE_SETTINGS },
    });
  };

  const handleCropPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    cropDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: activeImgSettings.offsetX,
      originY: activeImgSettings.offsetY,
    };
  };

  const handleCropPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = cropDragRef.current;
    if (!drag) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const dxPct = Math.round(((e.clientX - drag.startX) / Math.max(80, rect.width)) * 100);
    const dyPct = Math.round(((e.clientY - drag.startY) / Math.max(80, rect.height)) * 100);
    updateActiveImageSettings({
      offsetX: Math.max(-50, Math.min(50, drag.originX + dxPct)),
      offsetY: Math.max(-50, Math.min(50, drag.originY + dyPct)),
    });
  };

  const handleCropPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cropDragRef.current) return;
    cropDragRef.current = null;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeStar) return;
    setUploadError(null);
    setUploading(true);
    try {
      const processed = await processUploadedImage(file);
      const imageId = `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      await saveImageBlob(imageId, project.id, processed.blob);
      const nextIll: StarIllustrationRef = { type: 'custom', id: imageId };
      onPatchStar(activeStar.id, {
        illustration: nextIll,
        imageSettings: { ...DEFAULT_STAR_IMAGE_SETTINGS },
      });
      if (isFinaleCard) {
        onSelectCardTargetView('starStory', safeStarIndex);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Не удалось загрузить фото.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const updateActiveCardLayout = (patch: Partial<DeviceCardLayout>) => {
    onPatchProject(buildProjectCardDevicePatch(project, device, patch));
  };

  const resetActiveCardLayout = () => {
    onPatchProject(
      buildProjectCardDevicePatch(project, device, {
        ...DEFAULT_CARD_LAYOUT[device],
        customWidthPx: undefined,
        customHeightPx: undefined,
      }),
    );
  };

  const handleResetDeviceLayout = () => {
    onResetDeviceLayout(resetDeviceLayoutInProject(project, device));
    setResetLayoutNotice(true);
    window.setTimeout(() => setResetLayoutNotice(false), 1600);
  };

  return (
    <div className="space-y-3.5">
      {/* 4 Clean Card Editing Tabs (shown when editing Final Card or Star Cards) */}
      {!isEnvelopePhase && (
        <div
          data-testid="card-editor-tabs"
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-1.5 grid grid-cols-4 gap-1"
        >
          {(
            [
              { id: 'theme', label: 'Темы', icon: LayoutTemplate, target: 'card' as EditableCardTarget },
              { id: 'text', label: 'Текст', icon: Type, target: 'text' as EditableCardTarget },
              { id: 'illustration', label: 'Фото', icon: ImageIcon, target: 'illustration' as EditableCardTarget },
              { id: 'card', label: 'Макет', icon: Frame, target: 'card' as EditableCardTarget },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-testid={`card-tab-${tab.id}`}
                data-selected={selected}
                onClick={() => {
                  onChangeTab(tab.id, tab.target);
                  if (tab.id === 'illustration' && isFinaleCard) {
                    onSelectCardTargetView('starStory', safeStarIndex);
                  }
                }}
                className="gl-tab !min-h-[42px] !px-1 !py-1.5 flex flex-col items-center justify-center gap-0.5 text-[11px]"
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-full">{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ENVELOPE MODE: Customization of the Sealed Greeting Screen */}
      {isEnvelopePhase && (
        <div data-testid="envelope-editor-panel" className="space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-violet-500/20 border border-violet-300/30 flex items-center justify-center shrink-0">
                <Mail className="w-3.5 h-3.5 text-violet-200" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-sm font-semibold text-gl-text truncate">
                  Настройки конверта
                </h3>
                <p className="text-[11px] text-gl-text-muted truncate">
                  Тексты, цвета, сургуч и размер
                </p>
              </div>
            </div>
            <button
              type="button"
              data-testid="envelope-reset-btn"
              onClick={resetEnvelopeSettings}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-gl-accent-light hover:text-gl-text cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              Сброс
            </button>
          </div>

          <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.025] p-3">
            <label className="block space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-xs font-semibold text-gl-text">
                  Размер конверта ({device === 'phone' ? 'Телефон' : 'Компьютер'})
                </span>
                <span className="text-gl-text-muted tabular-nums">
                  {Math.round(activeEnvelopeScale * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={ENVELOPE_MIN_SCALE}
                max={ENVELOPE_MAX_SCALE}
                step={0.05}
                value={activeEnvelopeScale}
                data-testid="envelope-scale-slider"
                aria-label="Размер конверта на экране"
                onChange={(e) =>
                  updateEnvelopeSettings({
                    [device === 'phone' ? 'phoneScale' : 'desktopScale']: Number(
                      e.target.value,
                    ),
                  })
                }
                className="w-full accent-gl-accent cursor-pointer"
              />
            </label>

            <label className="block space-y-1 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-xs font-semibold text-gl-text">
                  Положение конверта по высоте
                </span>
                {activeEnvelopeOffsetY !== 0 ? (
                  <button
                    type="button"
                    onClick={() =>
                      updateEnvelopeSettings({
                        [device === 'phone' ? 'phoneOffsetY' : 'desktopOffsetY']: 0,
                      })
                    }
                    className="text-[11px] font-medium text-gl-accent-light hover:text-gl-text cursor-pointer"
                  >
                    По центру
                  </button>
                ) : (
                  <span className="text-gl-text-muted">Выше — Ниже</span>
                )}
              </div>
              <input
                type="range"
                min={ENVELOPE_OFFSET_MIN}
                max={ENVELOPE_OFFSET_MAX}
                step={4}
                value={activeEnvelopeOffsetY}
                data-testid="envelope-offset-y-slider"
                aria-label="Положение конверта по высоте"
                onChange={(e) =>
                  updateEnvelopeSettings({
                    [device === 'phone' ? 'phoneOffsetY' : 'desktopOffsetY']: Number(
                      e.target.value,
                    ),
                  })
                }
                className="w-full accent-gl-accent cursor-pointer"
              />
            </label>

            <p className="text-[11px] text-gl-text-muted leading-snug">
              Конверт можно двигать вверх-вниз и менять его размер за золотые уголки на превью.
            </p>
          </div>

          <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.025] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-gl-text">Тексты на конверте</span>
            </div>

            <label className="block space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-xs text-gl-text-secondary font-medium">
                  Положение текста по высоте
                </span>
                {activeEnvelopeTextOffsetY !== 0 ? (
                  <button
                    type="button"
                    onClick={() =>
                      updateEnvelopeSettings({
                        [device === 'phone' ? 'phoneTextOffsetY' : 'desktopTextOffsetY']: 0,
                      })
                    }
                    className="text-[11px] font-medium text-gl-accent-light hover:text-gl-text cursor-pointer"
                  >
                    Сбросить
                  </button>
                ) : (
                  <span className="text-gl-text-muted">Выше — Ниже</span>
                )}
              </div>
              <input
                type="range"
                min={ENVELOPE_TEXT_OFFSET_MIN}
                max={ENVELOPE_TEXT_OFFSET_MAX}
                step={2}
                value={activeEnvelopeTextOffsetY}
                data-testid="envelope-text-offset-y-slider"
                aria-label="Положение текста по высоте"
                onChange={(e) =>
                  updateEnvelopeSettings({
                    [device === 'phone' ? 'phoneTextOffsetY' : 'desktopTextOffsetY']: Number(
                      e.target.value,
                    ),
                  })
                }
                className="w-full accent-gl-accent cursor-pointer"
              />
            </label>

            <label className="block space-y-1 pt-1 border-t border-white/10">
              <span className="text-xs text-gl-text-muted block">Подпись сверху</span>
              <input
                type="text"
                maxLength={80}
                value={project.envelopeSettings?.kickerText ?? ''}
                data-testid="envelope-input-kicker"
                onChange={(e) => updateEnvelopeSettings({ kickerText: e.target.value })}
                placeholder={resolvedEnvelope.kickerText}
                className={`gl-input text-[13px] ${
                  focusedField === 'envelopeKicker' ? 'ring-2 ring-gl-accent-light' : ''
                }`}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs text-gl-text-muted block">Заголовок конверта</span>
              <input
                type="text"
                maxLength={120}
                value={project.envelopeSettings?.headlineText ?? ''}
                data-testid="envelope-input-headline"
                onChange={(e) => updateEnvelopeSettings({ headlineText: e.target.value })}
                placeholder={resolvedEnvelope.headlineText}
                className={`gl-input text-[13px] ${
                  focusedField === 'envelopeHeadline' ? 'ring-2 ring-gl-accent-light' : ''
                }`}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs text-gl-text-muted block">Подпись внизу</span>
              <input
                type="text"
                maxLength={120}
                value={project.envelopeSettings?.hintText ?? ''}
                data-testid="envelope-input-hint"
                onChange={(e) => updateEnvelopeSettings({ hintText: e.target.value })}
                placeholder={DEFAULT_ENVELOPE_TEXTS.hintText}
                className={`gl-input text-[13px] ${
                  focusedField === 'envelopeHint' ? 'ring-2 ring-gl-accent-light' : ''
                }`}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs text-gl-text-muted block">Текст на кнопке</span>
              <input
                type="text"
                maxLength={50}
                value={project.envelopeSettings?.ctaText ?? ''}
                data-testid="envelope-input-cta"
                onChange={(e) => updateEnvelopeSettings({ ctaText: e.target.value })}
                placeholder={DEFAULT_ENVELOPE_TEXTS.ctaText}
                className={`gl-input text-[13px] ${
                  focusedField === 'envelopeCta' ? 'ring-2 ring-gl-accent-light' : ''
                }`}
              />
            </label>
          </div>

          <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.025] p-3.5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-gl-text-secondary">Цвет конверта</span>
                {project.envelopeSettings?.envelopeColor && (
                  <button
                    type="button"
                    onClick={() => updateEnvelopeSettings({ envelopeColor: undefined })}
                    className="text-[11px] text-gl-accent-light hover:text-gl-text cursor-pointer"
                  >
                    По умолчанию
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {ENVELOPE_COLOR_SWATCHES.map((sw) => {
                  const active =
                    (project.envelopeSettings?.envelopeColor ?? '').toUpperCase() ===
                    sw.hex.toUpperCase();
                  return (
                    <button
                      key={sw.hex}
                      type="button"
                      title={sw.name}
                      aria-label={sw.name}
                      data-testid={`envelope-color-${sw.hex.slice(1)}`}
                      data-selected={active}
                      onClick={() => updateEnvelopeSettings({ envelopeColor: sw.hex })}
                      className={`w-7 h-7 rounded-lg border transition-transform cursor-pointer ${
                        active
                          ? 'border-gl-accent-light scale-110 ring-2 ring-gl-accent/45'
                          : 'border-white/25 hover:scale-105'
                      }`}
                      style={{ backgroundColor: sw.hex }}
                    />
                  );
                })}
                <label className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/[0.04] px-2 h-7 text-[11px] text-gl-text-secondary cursor-pointer hover:border-white/30">
                  <input
                    type="color"
                    value={project.envelopeSettings?.envelopeColor ?? '#ECEAF8'}
                    aria-label="Свой цвет конверта"
                    onChange={(e) =>
                      updateEnvelopeSettings({ envelopeColor: e.target.value.toUpperCase() })
                    }
                    className="w-4 h-4 bg-transparent border-0 p-0 cursor-pointer"
                  />
                  <span>Свой</span>
                </label>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-gl-text-secondary">
                  Печать и звёздочка
                </span>
                {project.envelopeSettings?.sealColor && (
                  <button
                    type="button"
                    onClick={() => updateEnvelopeSettings({ sealColor: undefined })}
                    className="text-[11px] text-gl-accent-light hover:text-gl-text cursor-pointer"
                  >
                    Из палитры
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {SEAL_COLOR_SWATCHES.map((sw) => {
                  const active =
                    (project.envelopeSettings?.sealColor ?? '').toUpperCase() ===
                    sw.hex.toUpperCase();
                  return (
                    <button
                      key={sw.hex}
                      type="button"
                      title={sw.name}
                      aria-label={sw.name}
                      data-testid={`seal-color-${sw.hex.slice(1)}`}
                      data-selected={active}
                      onClick={() => updateEnvelopeSettings({ sealColor: sw.hex })}
                      className={`w-7 h-7 rounded-lg border transition-transform cursor-pointer ${
                        active
                          ? 'border-gl-accent-light scale-110 ring-2 ring-gl-accent/45'
                          : 'border-white/25 hover:scale-105'
                      }`}
                      style={{ backgroundColor: sw.hex }}
                    />
                  );
                })}
                <label className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/[0.04] px-2 h-7 text-[11px] text-gl-text-secondary cursor-pointer hover:border-white/30">
                  <input
                    type="color"
                    value={project.envelopeSettings?.sealColor ?? paletteGlow.hex}
                    aria-label="Свой цвет печати конверта"
                    onChange={(e) =>
                      updateEnvelopeSettings({ sealColor: e.target.value.toUpperCase() })
                    }
                    className="w-4 h-4 bg-transparent border-0 p-0 cursor-pointer"
                  />
                  <span>Свой</span>
                </label>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelectCardTargetView('constellation')}
            className="gl-btn-secondary w-full !min-h-[40px] text-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Настроить финальную открытку
          </button>
        </div>
      )}

      {/* TAB 1: Темы и цвета открытки */}
      {!isEnvelopePhase && activeTab === 'theme' && (
        <CardLibraryPanel
          project={project}
          onChange={onPatchProject}
          compact
        />
      )}

      {/* TAB 2: Тексты и оформление */}
      {!isEnvelopePhase && activeTab === 'text' && (
        <div className="space-y-3.5">
          <div className="rounded-xl border border-gl-accent/25 bg-gl-accent/10 px-3 py-2.5 text-xs text-gl-text-secondary leading-snug">
            Нажми на любой текст прямо на открытке слева, чтобы исправить его, или настрой ниже.
          </div>

          {isFinaleCard ? (
            <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.025] p-3.5">
              <div className="grid grid-cols-2 gap-2.5">
                <label className="block space-y-1">
                  <span className="text-xs text-gl-text-muted block">Кому</span>
                  <input
                    type="text"
                    maxLength={40}
                    value={project.recipientName}
                    data-testid="card-input-recipientName"
                    onChange={(e) => onPatchProject({ recipientName: e.target.value })}
                    placeholder="Имя получателя"
                    className={`gl-input text-[13px] ${
                      focusedField === 'recipientName' ? 'ring-2 ring-gl-accent-light' : ''
                    }`}
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs text-gl-text-muted block">От кого</span>
                  <input
                    type="text"
                    maxLength={40}
                    value={project.senderName ?? ''}
                    data-testid="card-input-senderName"
                    onChange={(e) => onPatchProject({ senderName: e.target.value })}
                    placeholder="Твоё имя"
                    className={`gl-input text-[13px] ${
                      focusedField === 'senderName' ? 'ring-2 ring-gl-accent-light' : ''
                    }`}
                  />
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-xs text-gl-text-muted block">Заголовок открытки</span>
                <input
                  type="text"
                  maxLength={50}
                  value={project.title}
                  data-testid="card-input-title"
                  onChange={(e) => onPatchProject({ title: e.target.value })}
                  placeholder="Название подарка"
                  className={`gl-input text-[13px] ${
                    focusedField === 'title' ? 'ring-2 ring-gl-accent-light' : ''
                  }`}
                />
              </label>

              <label className="block space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gl-text-muted">Финальное письмо</span>
                  <span className="text-gl-text-muted tabular-nums">
                    {project.finalMessage.length}/800
                  </span>
                </div>
                <textarea
                  rows={4}
                  maxLength={800}
                  value={project.finalMessage}
                  data-testid="card-input-finalMessage"
                  onChange={(e) => onPatchProject({ finalMessage: e.target.value })}
                  placeholder="Тёплые слова, которые появятся в конце..."
                  className={`gl-textarea resize-y text-[13px] leading-relaxed ${
                    focusedField === 'finalMessage' ? 'ring-2 ring-gl-accent-light' : ''
                  }`}
                />
              </label>
            </div>
          ) : activeStar ? (
            <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.025] p-3.5">
              <div className="flex items-center justify-between gap-2 text-xs font-semibold text-gl-text">
                <span>Карточка звезды {safeStarIndex + 1}</span>
                <button
                  type="button"
                  onClick={() => onSelectCardTargetView('constellation')}
                  className="text-xs font-medium text-gl-accent-light hover:text-gl-text cursor-pointer"
                >
                  К финалу
                </button>
              </div>

              <label className="block space-y-1">
                <span className="text-xs text-gl-text-muted block">Заголовок звезды</span>
                <input
                  type="text"
                  maxLength={30}
                  value={activeStar.title}
                  data-testid="card-input-starTitle"
                  onChange={(e) =>
                    onPatchStar(activeStar.id, { title: e.target.value, isDraft: false })
                  }
                  className={`gl-input text-[13px] ${
                    focusedField === 'starTitle' ? 'ring-2 ring-gl-accent-light' : ''
                  }`}
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs text-gl-text-muted block">Послание</span>
                <textarea
                  rows={3}
                  maxLength={180}
                  value={activeStar.message}
                  data-testid="card-input-starMessage"
                  onChange={(e) =>
                    onPatchStar(activeStar.id, { message: e.target.value, isDraft: false })
                  }
                  className={`gl-textarea resize-none text-[13px] leading-relaxed ${
                    focusedField === 'starMessage' ? 'ring-2 ring-gl-accent-light' : ''
                  }`}
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs text-gl-text-muted block">Подпись (От кого)</span>
                <input
                  type="text"
                  maxLength={40}
                  value={project.senderName ?? ''}
                  onChange={(e) => onPatchProject({ senderName: e.target.value })}
                  placeholder="Твоё имя"
                  className="gl-input text-[13px]"
                />
              </label>
            </div>
          ) : null}

          {/* Font, Alignment, Size, Color, Width */}
          <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.025] p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-gl-text-secondary">
                Шрифт и стиль текста
              </span>
              <div className="flex items-center gap-2">
                {!isFinaleCard && (
                  <button
                    type="button"
                    onClick={applyActiveTextStyleToAllStars}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-200 hover:text-amber-100 cursor-pointer"
                  >
                    <CopyCheck className="w-3 h-3" />
                    {appliedAllNotice ? 'Готово!' : 'Ко всем'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={resetActiveTextLayout}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-gl-accent-light hover:text-gl-text cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Сброс
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              {MESSAGE_FONTS.map((font) => {
                const cat = MESSAGE_FONT_CATEGORIES.find((c) => c.id === font.category);
                const active = activeTextStyle.fontId === font.id;
                return (
                  <button
                    key={font.id}
                    type="button"
                    data-testid={`card-font-${font.id}`}
                    data-selected={active}
                    onClick={() => updateActiveTextStyle({ fontId: font.id })}
                    className="gl-choice w-full text-left px-2.5 py-1.5"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gl-accent-light">
                        {cat?.name}
                      </span>
                      <span className="text-[11px] text-gl-text-muted">· {font.name}</span>
                    </div>
                    <p
                      className="text-sm text-gl-text truncate"
                      style={{ fontFamily: font.cssFamily }}
                    >
                      {font.sample}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[11px] text-gl-text-muted block">Начертание</span>
                <div className="grid grid-cols-2 gap-1">
                  {(
                    [
                      { id: 'normal', label: 'Обычный' },
                      { id: 'semibold', label: 'Жирный' },
                    ] as Array<{ id: MessageTextWeight; label: string }>
                  ).map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      data-selected={activeTextStyle.fontWeight === w.id}
                      onClick={() => updateActiveTextStyle({ fontWeight: w.id })}
                      className={`gl-choice py-1.5 px-1 text-[11px] ${
                        w.id === 'semibold' ? 'font-semibold' : 'font-normal'
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-gl-text-muted block">Выравнивание</span>
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      { id: 'left', label: 'Слева', icon: AlignLeft },
                      { id: 'center', label: 'По центру', icon: AlignCenter },
                      { id: 'right', label: 'Справа', icon: AlignRight },
                    ] as Array<{
                      id: MessageTextAlign;
                      label: string;
                      icon: typeof AlignLeft;
                    }>
                  ).map((al) => {
                    const Icon = al.icon;
                    return (
                      <button
                        key={al.id}
                        type="button"
                        title={al.label}
                        aria-label={al.label}
                        data-testid={`card-text-align-${al.id}`}
                        data-selected={activeTextStyle.textAlign === al.id}
                        onClick={() => updateActiveTextStyle({ textAlign: al.id })}
                        className="gl-choice py-1.5 flex items-center justify-center"
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <label className="block space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-gl-text-secondary font-medium">Размер букв</span>
                <span className="text-gl-text-muted">Мельче — Крупнее</span>
              </div>
              <input
                type="range"
                min={12}
                max={28}
                step={1}
                value={activeTextStyle.fontSize}
                aria-label="Размер текста на открытке"
                onChange={(e) => updateActiveTextStyle({ fontSize: Number(e.target.value) })}
                className="w-full accent-gl-accent cursor-pointer"
              />
            </label>

            <label className="block space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-gl-text-secondary font-medium">Интервал строк</span>
                <span className="text-gl-text-muted">Плотнее — Свободнее</span>
              </div>
              <input
                type="range"
                min={1.2}
                max={2.0}
                step={0.05}
                value={activeTextStyle.lineHeight}
                aria-label="Межстрочный интервал на открытке"
                onChange={(e) => updateActiveTextStyle({ lineHeight: Number(e.target.value) })}
                className="w-full accent-gl-accent cursor-pointer"
              />
            </label>

            <label className="block space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-gl-text-secondary font-medium">Ширина текстового блока</span>
                <span className="text-gl-text-muted">Узко — Широко</span>
              </div>
              <input
                type="range"
                min={38}
                max={100}
                step={2}
                value={activeTextStyle.widthPct}
                aria-label="Ширина текстового блока на открытке"
                onChange={(e) => updateActiveTextStyle({ widthPct: Number(e.target.value) })}
                className="w-full accent-gl-accent cursor-pointer"
              />
            </label>

            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-gl-text-muted">Положение блока</span>
              <button
                type="button"
                onClick={() => updateActiveTextStyle({ offsetX: 0, offsetY: 0 })}
                className="gl-choice px-2.5 py-1 text-[11px] font-medium"
              >
                Вернуть в центр
              </button>
            </div>

            <div className="space-y-1.5 pt-1 border-t border-white/10">
              <span className="text-[11px] text-gl-text-muted block">Цвет текста</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {orderedTextColors.map((c) => {
                  const active = activeTextStyle.color.toUpperCase() === c.hex.toUpperCase();
                  return (
                    <button
                      key={c.hex}
                      type="button"
                      title={c.name}
                      aria-label={c.name}
                      data-selected={active}
                      onClick={() => updateActiveTextStyle({ color: c.hex })}
                      className={`w-7 h-7 rounded-lg border transition-transform cursor-pointer ${
                        active
                          ? 'border-gl-accent-light scale-110 ring-2 ring-gl-accent/45'
                          : 'border-white/25 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  );
                })}
                <label className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/[0.04] px-2 h-7 text-[11px] text-gl-text-secondary cursor-pointer hover:border-white/30">
                  <input
                    type="color"
                    value={activeTextStyle.color}
                    aria-label="Свой цвет текста на открытке"
                    onChange={(e) =>
                      updateActiveTextStyle({ color: e.target.value.toUpperCase() })
                    }
                    className="w-4 h-4 bg-transparent border-0 p-0 cursor-pointer"
                  />
                  <span>Свой</span>
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-gl-text-muted block">Тень текста</span>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: 'soft', label: 'Мягкая' },
                    { id: 'glow', label: 'Сияние' },
                    { id: 'none', label: 'Нет' },
                  ] as Array<{ id: MessageTextShadow; label: string }>
                ).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    data-selected={activeTextStyle.shadow === s.id}
                    onClick={() => updateActiveTextStyle({ shadow: s.id })}
                    className="gl-choice py-1.5 text-[11px] font-medium"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-1 border-t border-white/10">
              <span className="text-[11px] text-gl-text-muted block">Оформление блока</span>
              <div className="grid grid-cols-4 gap-1.5">
                {(
                  [
                    { id: 'none', label: 'Нет' },
                    { id: 'line', label: 'Линия' },
                    { id: 'frame', label: 'Рамка' },
                    { id: 'quote', label: 'Черта' },
                  ] as Array<{ id: MessageTextAccent; label: string }>
                ).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    data-selected={activeTextStyle.accent === a.id}
                    onClick={() => updateActiveTextStyle({ accent: a.id })}
                    className="gl-choice py-1.5 px-1 text-[11px] font-medium"
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Иллюстрация и загрузка фото на открытку */}
      {!isEnvelopePhase && activeTab === 'illustration' && activeStar && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-gl-text-muted leading-snug">
              Выбери картинку или фото для звезды {safeStarIndex + 1} — двигай её прямо на открытке!
            </span>
            <button
              type="button"
              onClick={resetActiveIllustration}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-gl-accent-light hover:text-gl-text cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              Сброс
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {BUILTIN_ILLUSTRATIONS.map((item) => {
              const active =
                activeStar.illustration.type === 'builtin' &&
                activeStar.illustration.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`card-illu-${item.id}`}
                  data-selected={active}
                  title={item.meaning}
                  onClick={() => {
                    onPatchStar(activeStar.id, {
                      illustration: { type: 'builtin', id: item.id },
                    });
                    if (isFinaleCard) onSelectCardTargetView('starStory', safeStarIndex);
                  }}
                  className="gl-choice min-h-[76px] p-2 flex flex-col items-center justify-center gap-1"
                >
                  <div className="w-9 h-9 flex items-center justify-center">
                    <BuiltinIllustration id={item.id} className="w-full h-full object-contain" />
                  </div>
                  <span className="text-[10px] font-medium text-gl-text text-center leading-tight line-clamp-2">
                    {item.name}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              data-testid="card-illu-upload-btn"
              data-selected={activeStar.illustration.type === 'custom'}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gl-choice min-h-[76px] p-2 flex flex-col items-center justify-center gap-1"
            >
              {activeStar.illustration.type === 'custom' ? (
                <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/[0.04]">
                  <StarIllustrationView
                    illustration={activeStar.illustration}
                    imageSettings={activeImgSettings}
                    alt={activeStar.title || 'Своё фото'}
                    className="w-full h-full"
                  />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-lg bg-white/[0.05] border border-dashed border-white/25 flex items-center justify-center text-gl-accent-light">
                  <ImagePlus className="w-4 h-4" />
                </div>
              )}
              <span className="text-[10px] font-medium text-gl-text text-center leading-tight">
                {uploading ? 'Сжатие...' : activeStar.illustration.type === 'custom' ? 'Своё фото' : 'Загрузить'}
              </span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleUploadPhoto}
            className="hidden"
          />

          {uploadError && <p className="text-xs text-rose-300">{uploadError}</p>}

          <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.025] p-3">
            <label className="block space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-gl-text-secondary font-medium">Размер картинки</span>
                <span className="text-gl-text-muted">Меньше — Больше</span>
              </div>
              <input
                type="range"
                min={0.65}
                max={1.45}
                step={0.05}
                value={activeIlluLayout.scale}
                aria-label="Размер иллюстрации на открытке"
                onChange={(e) =>
                  updateActiveIllustrationLayout({ scale: Number(e.target.value) })
                }
                className="w-full accent-gl-accent cursor-pointer"
              />
            </label>

            <div className="space-y-1.5">
              <span className="text-[11px] text-gl-text-muted block">
                Положение по горизонтали
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { label: 'Слева', value: -100 },
                    { label: 'По центру', value: 0 },
                    { label: 'Справа', value: 100 },
                  ] as const
                ).map((pos) => (
                  <button
                    key={pos.label}
                    type="button"
                    data-selected={Math.abs(activeIlluLayout.offsetX - pos.value) < 25}
                    onClick={() => updateActiveIllustrationLayout({ offsetX: pos.value })}
                    className="gl-choice py-1.5 text-[11px] font-medium"
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] text-gl-text-muted block">
                Положение по высоте
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { label: 'Выше', value: -55 },
                    { label: 'Середина', value: 0 },
                    { label: 'Ниже', value: 55 },
                  ] as const
                ).map((pos) => (
                  <button
                    key={pos.label}
                    type="button"
                    data-selected={Math.abs(activeIlluLayout.offsetY - pos.value) < 25}
                    onClick={() => updateActiveIllustrationLayout({ offsetY: pos.value })}
                    className="gl-choice py-1.5 text-[11px] font-medium"
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.025] p-3.5">
            <span className="text-xs font-medium text-gl-text-secondary block">
              Кадрирование внутри рамки
            </span>
            <div className="flex items-center gap-3">
              <div
                onPointerDown={handleCropPointerDown}
                onPointerMove={handleCropPointerMove}
                onPointerUp={handleCropPointerUp}
                onPointerCancel={handleCropPointerUp}
                title="Потяните картинку внутри рамки для смещения"
                className="relative w-20 h-20 shrink-0 rounded-xl border border-white/15 bg-gl-input overflow-hidden cursor-grab active:cursor-grabbing touch-none"
              >
                <StarIllustrationView
                  illustration={activeStar.illustration}
                  imageSettings={activeImgSettings}
                  alt={activeStar.title || 'Предпросмотр кадрирования'}
                  className="w-full h-full"
                />
                <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/55 p-0.5 text-white/75">
                  <Move className="w-2.5 h-2.5" />
                </span>
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: 'cover', label: 'Заполнить', icon: Maximize },
                      { id: 'contain', label: 'Вписать', icon: Minimize },
                    ] as Array<{ id: StarImageFitMode; label: string; icon: typeof Maximize }>
                  ).map((fitMode) => {
                    const Icon = fitMode.icon;
                    return (
                      <button
                        key={fitMode.id}
                        type="button"
                        data-selected={activeImgSettings.fit === fitMode.id}
                        onClick={() => updateActiveImageSettings({ fit: fitMode.id })}
                        className="gl-choice py-1.5 text-xs font-medium inline-flex items-center justify-center gap-1"
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {fitMode.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-gl-text-muted leading-snug">
                  Двигай картинку внутри рамки.
                </p>
              </div>
            </div>

            <label className="block space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gl-text-muted">Приблизить фото</span>
                <span className="text-gl-text-muted">Дальше — Ближе</span>
              </div>
              <input
                type="range"
                min={1}
                max={2.5}
                step={0.05}
                value={activeImgSettings.scale}
                aria-label="Приближение картинки внутри рамки"
                onChange={(e) =>
                  updateActiveImageSettings({ scale: Number(e.target.value) })
                }
                className="w-full accent-gl-accent cursor-pointer"
              />
            </label>
          </div>
        </div>
      )}

      {/* TAB 4: Макет и размеры открытки */}
      {!isEnvelopePhase && activeTab === 'card' && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-gl-text-muted">
              Настройки только для режима «{device === 'phone' ? 'Телефон' : 'Компьютер'}»
            </span>
            <button
              type="button"
              onClick={resetActiveCardLayout}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-gl-accent-light hover:text-gl-text cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              Сброс
            </button>
          </div>

          <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.025] p-3">
            <span className="text-[11px] font-medium text-gl-text-secondary block">
              Отступы внутри открытки
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'compact', label: 'Компактно' },
                  { id: 'normal', label: 'Обычно' },
                  { id: 'spacious', label: 'Просторно' },
                ] as Array<{ id: CardPaddingPreset; label: string }>
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  data-testid={`card-padding-${opt.id}`}
                  data-selected={activeCardLayout.padding === opt.id}
                  onClick={() => updateActiveCardLayout({ padding: opt.id })}
                  className="gl-choice py-2 text-[11px] font-medium"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.025] p-3">
            <label className="block space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-gl-text-secondary">
                  Масштаб открытки
                </span>
                <span className="text-gl-text-muted tabular-nums">
                  {Math.round((activeCardLayout.scale ?? 1) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.55}
                max={1.25}
                step={0.05}
                value={activeCardLayout.scale ?? 1}
                data-testid="card-scale-slider"
                aria-label="Общий масштаб открытки"
                onChange={(e) =>
                  updateActiveCardLayout({ scale: Number(e.target.value) })
                }
                className="w-full accent-gl-accent cursor-pointer"
              />
            </label>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
              <span className="text-[11px] font-medium text-gl-text-secondary">
                Ширина открытки
              </span>
              {(activeCardLayout.customWidthPx !== undefined ||
                activeCardLayout.customHeightPx !== undefined) && (
                <button
                  type="button"
                  onClick={() =>
                    updateActiveCardLayout({
                      customWidthPx: undefined,
                      customHeightPx: undefined,
                    })
                  }
                  className="text-[11px] text-gl-accent-light hover:text-gl-text cursor-pointer"
                >
                  Сбросить ручной размер
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'compact', label: 'Узкая' },
                  { id: 'standard', label: 'Обычная' },
                  { id: 'wide', label: 'Широкая' },
                ] as Array<{ id: CardWidthPreset; label: string }>
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  data-testid={`card-width-${opt.id}`}
                  data-selected={
                    activeCardLayout.width === opt.id &&
                    activeCardLayout.customWidthPx === undefined
                  }
                  onClick={() =>
                    updateActiveCardLayout({
                      width: opt.id,
                      customWidthPx: undefined,
                      customHeightPx: undefined,
                    })
                  }
                  className="gl-choice py-2 text-[11px] font-medium"
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {(activeCardLayout.customWidthPx !== undefined ||
              activeCardLayout.customHeightPx !== undefined) && (
              <p className="text-[11px] text-amber-200/85 tabular-nums">
                Размер задан на холсте:{' '}
                {activeCardLayout.customWidthPx
                  ? `${activeCardLayout.customWidthPx}px`
                  : 'авто'}{' '}
                ×{' '}
                {activeCardLayout.customHeightPx
                  ? `${activeCardLayout.customHeightPx}px`
                  : 'авто'}
              </p>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.025] p-3">
            <span className="text-[11px] font-medium text-gl-text-secondary block">
              Композиция по высоте
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'top', label: 'Сверху' },
                  { id: 'center', label: 'По центру' },
                  { id: 'spread', label: 'Свободнее' },
                ] as Array<{ id: CardVerticalAlign; label: string }>
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  data-testid={`card-align-${opt.id}`}
                  data-selected={activeCardLayout.verticalAlign === opt.id}
                  onClick={() => updateActiveCardLayout({ verticalAlign: opt.id })}
                  className="gl-choice py-2 text-[11px] font-medium"
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <label className="block space-y-1 pt-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-gl-text-muted">Положение открытки</span>
                <span className="text-gl-text-muted">Выше — Ниже</span>
              </div>
              <input
                type="range"
                min={-50}
                max={50}
                step={5}
                value={activeCardLayout.offsetY}
                aria-label="Вертикальное положение открытки"
                onChange={(e) =>
                  updateActiveCardLayout({ offsetY: Number(e.target.value) })
                }
                className="w-full accent-gl-accent cursor-pointer"
              />
            </label>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
              <button
                type="button"
                data-testid="reset-device-layout-btn"
                onClick={handleResetDeviceLayout}
                title={`Сбросить всё для режима «${device === 'phone' ? 'Телефон' : 'Компьютер'}»`}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-gl-text-muted hover:text-gl-text cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{resetLayoutNotice ? 'Сброшено!' : 'Сбросить всё для экрана'}</span>
              </button>

              <button
                type="button"
                onClick={() => updateActiveCardLayout({ offsetY: 0 })}
                className="gl-choice px-2.5 py-1 text-[11px] font-medium"
              >
                Вернуть в центр
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
