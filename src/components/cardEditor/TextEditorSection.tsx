import { useState } from 'react';
import { AlignCenter, AlignLeft, AlignRight, CopyCheck, RotateCcw } from 'lucide-react';
import type { EditableTextField } from '../../preview/previewProtocol';
import {
  DARK_CARD_TEXT_COLORS,
  LIGHT_PAPER_TEXT_COLORS,
  MESSAGE_FONTS,
  MESSAGE_FONT_CATEGORIES,
  buildProjectFinalTextDevicePatch,
  buildStarTextDevicePatch,
  getDefaultDeviceTextLayout,
  resolveCardColors,
  resolveEffectiveFinalTextStyle,
  resolveEffectiveStarTextStyle,
} from '../../scene/paletteConfig';
import type {
  ConstellationProject,
  ConstellationStar,
  MessageTextAccent,
  MessageTextAlign,
  MessageTextShadow,
  MessageTextWeight,
  StarTextStyle,
} from '../../types/project';
import type { PreviewDeviceId } from '../LivePreviewStage';
import { FinalMessageIdeas } from './FinalMessageIdeas';

interface TextEditorSectionProps {
  project: ConstellationProject;
  device: PreviewDeviceId;
  isFinaleCard: boolean;
  activeStar: ConstellationStar | undefined;
  safeStarIndex: number;
  focusedField?: EditableTextField | null;
  onSelectCardTargetView: (
    phase: 'sealed' | 'constellation' | 'starStory',
    starIndex?: number,
  ) => void;
  onPatchProject: (patch: Partial<ConstellationProject>) => void;
  onPatchStar: (starId: string, patch: Partial<ConstellationStar>) => void;
}

export function TextEditorSection({
  project,
  device,
  isFinaleCard,
  activeStar,
  safeStarIndex,
  focusedField = null,
  onSelectCardTargetView,
  onPatchProject,
  onPatchStar,
}: TextEditorSectionProps) {
  const [appliedAllNotice, setAppliedAllNotice] = useState(false);

  const activeTextStyle = isFinaleCard
    ? resolveEffectiveFinalTextStyle(project, device)
    : resolveEffectiveStarTextStyle(activeStar, device);

  const resolvedCardColors = resolveCardColors(project);
  const orderedTextColors = resolvedCardColors.isLightPaper
    ? [...LIGHT_PAPER_TEXT_COLORS, ...DARK_CARD_TEXT_COLORS]
    : [...DARK_CARD_TEXT_COLORS, ...LIGHT_PAPER_TEXT_COLORS];

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

  return (
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

          <FinalMessageIdeas
            occasion={project.occasion}
            recipientName={project.recipientName}
            currentMessage={project.finalMessage}
            onSelectMessage={(finalMessage) => onPatchProject({ finalMessage })}
          />
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
  );
}
