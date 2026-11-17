import { useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  CopyCheck,
  Move,
  RotateCcw,
  Type,
} from 'lucide-react';
import {
  COSMIC_PALETTES,
  DARK_CARD_TEXT_COLORS,
  DEFAULT_STAR_TEXT_STYLE,
  GLOW_COLORS,
  LIGHT_PAPER_TEXT_COLORS,
  MESSAGE_FONTS,
  MESSAGE_FONT_CATEGORIES,
  computeTextBlockMarginLeftPct,
  isDefaultStarTextStyle,
  resolveCardColors,
  resolveMessageFont,
  resolveStarTextStyle,
  resolveTextShadowCss,
} from '../scene/paletteConfig';
import type {
  CardThemeCustomColors,
  CardThemeId,
  CosmicPaletteId,
  GlowColorId,
  MessageTextAccent,
  MessageTextAlign,
  MessageTextShadow,
  MessageTextWeight,
  StarTextStyle,
} from '../types/project';

interface TextStyleEditorProps {
  value?: StarTextStyle;
  paletteId: CosmicPaletteId;
  glowColorId: GlowColorId;
  cardTheme?: CardThemeId;
  cardColors?: CardThemeCustomColors;
  previewTitle: string;
  previewMessage: string;
  showLayoutControls?: boolean;
  onChange: (next: StarTextStyle | undefined) => void;
  onApplyToAll?: (style: StarTextStyle) => void;
}

export function TextStyleEditor({
  value,
  paletteId,
  glowColorId,
  cardTheme,
  cardColors,
  previewTitle,
  previewMessage,
  showLayoutControls = true,
  onChange,
  onApplyToAll,
}: TextStyleEditorProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [appliedAllNotice, setAppliedAllNotice] = useState(false);

  const dragRef = useRef<{
    mode: 'move' | 'resize';
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    originWidthPct: number;
    stageW: number;
    stageH: number;
  } | null>(null);

  const style = resolveStarTextStyle(value);
  const isDefault = isDefaultStarTextStyle(style);
  const fontMeta = resolveMessageFont(style.fontId);
  const palette = COSMIC_PALETTES[paletteId];
  const glow = GLOW_COLORS[glowColorId];
  const resolvedCard = resolveCardColors({ cardTheme, cardColors });
  const orderedColors = resolvedCard.isLightPaper
    ? [...LIGHT_PAPER_TEXT_COLORS, ...DARK_CARD_TEXT_COLORS]
    : [...DARK_CARD_TEXT_COLORS, ...LIGHT_PAPER_TEXT_COLORS];

  const updateStyle = (patch: Partial<StarTextStyle>) => {
    const next = resolveStarTextStyle({ ...style, ...patch });
    onChange(next);
  };

  const handleReset = () => {
    onChange(undefined);
  };

  const handleApplyAll = () => {
    if (!onApplyToAll) return;
    onApplyToAll({ ...style });
    setAppliedAllNotice(true);
    window.setTimeout(() => setAppliedAllNotice(false), 1600);
  };

  const startStagePointer = (
    mode: 'move' | 'resize',
    e: React.PointerEvent<HTMLElement>,
  ) => {
    e.stopPropagation();
    const stageEl = stageRef.current;
    if (!stageEl) return;
    const rect = stageEl.getBoundingClientRect();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      originX: style.offsetX,
      originY: style.offsetY,
      originWidthPct: style.widthPct,
      stageW: Math.max(120, rect.width),
      stageH: Math.max(80, rect.height),
    };
  };

  const moveStagePointer = (e: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (drag.mode === 'resize') {
      const dWidthPct = Math.round((dx / drag.stageW) * 100);
      const nextWidth = Math.max(56, Math.min(100, drag.originWidthPct + dWidthPct));
      updateStyle({ widthPct: nextWidth });
      return;
    }

    // Move mode within bounded safe stage
    let nextWidth = drag.originWidthPct;
    if (Math.abs(dx) > 6 && nextWidth > 90) {
      nextWidth = 84;
    }

    const dxNorm = Math.round((dx / Math.max(50, drag.stageW * 0.4)) * 100);
    const dyNorm = Math.round((dy / Math.max(36, drag.stageH * 0.36)) * 100);

    updateStyle({
      widthPct: nextWidth,
      offsetX: Math.max(-100, Math.min(100, drag.originX + dxNorm)),
      offsetY: Math.max(-100, Math.min(100, drag.originY + dyNorm)),
    });
  };

  const endStagePointer = (e: React.PointerEvent<HTMLElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }
  };

  const effectiveAlign: MessageTextAlign =
    style.textAlign === 'auto' ? 'left' : style.textAlign;
  const marginLeftPct = computeTextBlockMarginLeftPct(style.widthPct, style.offsetX);
  const topGrow = Math.max(0, 100 + style.offsetY);
  const bottomGrow = Math.max(0, 100 - style.offsetY);
  const previewFontPx = Math.max(
    11,
    Math.round((style.fontSize + fontMeta.opticalSizeBoost) * 0.72),
  );

  return (
    <div className="space-y-3 pt-2 border-t border-white/10">
      <div className="flex items-center justify-between gap-2">
        <span className="gl-label inline-flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5 text-gl-accent-light" />
          Оформление текста
        </span>
        <div className="flex items-center gap-2">
          {onApplyToAll && (
            <button
              type="button"
              onClick={handleApplyAll}
              title="Применить это оформление ко всем звёздам созвездия"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-200 hover:text-amber-100 cursor-pointer"
            >
              <CopyCheck className="w-3 h-3" />
              {appliedAllNotice ? 'Применено!' : 'Ко всем'}
            </button>
          )}
          <button
            type="button"
            onClick={handleReset}
            disabled={isDefault}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-gl-accent-light hover:text-gl-text disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Сброс
          </button>
        </div>
      </div>

      {/* 1. Font Categories & Selection */}
      <div className="space-y-1.5">
        <span className="text-xs text-gl-text-muted block">Шрифт послания</span>
        <div className="space-y-1.5">
          {MESSAGE_FONTS.map((font) => {
            const cat = MESSAGE_FONT_CATEGORIES.find((c) => c.id === font.category);
            const active = style.fontId === font.id;
            return (
              <button
                key={font.id}
                type="button"
                data-testid={`text-style-font-${font.id}`}
                data-selected={active}
                onClick={() => updateStyle({ fontId: font.id })}
                className="gl-choice w-full text-left px-3 py-2 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-gl-accent-light">
                      {cat?.name}
                    </span>
                    <span className="text-xs text-gl-text-muted">· {font.name}</span>
                  </div>
                  <p
                    className="text-sm text-gl-text truncate mt-0.5"
                    style={{ fontFamily: font.cssFamily }}
                  >
                    {font.sample}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Weight & Alignment */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-1">
          <span className="text-xs text-gl-text-muted block">Начертание</span>
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
                data-selected={style.fontWeight === w.id}
                onClick={() => updateStyle({ fontWeight: w.id })}
                className={`gl-choice py-1.5 px-1.5 text-xs ${
                  w.id === 'semibold' ? 'font-semibold' : 'font-normal'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-xs text-gl-text-muted block">Выравнивание</span>
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
                  data-selected={style.textAlign === al.id}
                  onClick={() => updateStyle({ textAlign: al.id })}
                  className="gl-choice py-1.5 flex items-center justify-center"
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Size & Line Height Sliders */}
      <div className="space-y-2.5 rounded-xl border border-white/10 bg-white/[0.025] p-3">
        <label className="block space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gl-text-secondary font-medium">Размер текста</span>
            <span className="text-gl-text-muted">
              {style.fontSize <= 15
                ? 'Мельче'
                : style.fontSize >= 21
                  ? 'Крупнее'
                  : 'Обычный'}
            </span>
          </div>
          <input
            type="range"
            min={14}
            max={24}
            step={1}
            value={style.fontSize}
            aria-label="Размер текста послания"
            onChange={(e) => updateStyle({ fontSize: Number(e.target.value) })}
            className="w-full accent-gl-accent cursor-pointer"
          />
        </label>

        <label className="block space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gl-text-secondary font-medium">Интервал строк</span>
            <span className="text-gl-text-muted">
              {style.lineHeight <= 1.35
                ? 'Плотнее'
                : style.lineHeight >= 1.75
                  ? 'Свободнее'
                  : 'Обычное'}
            </span>
          </div>
          <input
            type="range"
            min={1.2}
            max={2.0}
            step={0.05}
            value={style.lineHeight}
            aria-label="Расстояние между строками"
            onChange={(e) => updateStyle({ lineHeight: Number(e.target.value) })}
            className="w-full accent-gl-accent cursor-pointer"
          />
        </label>
      </div>

      {/* 4. Text Color */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gl-text-muted">Цвет текста</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {orderedColors.map((c) => {
            const active = style.color.toUpperCase() === c.hex.toUpperCase();
            return (
              <button
                key={c.hex}
                type="button"
                title={c.name}
                aria-label={c.name}
                data-selected={active}
                onClick={() => updateStyle({ color: c.hex })}
                className={`w-7 h-7 rounded-lg border transition-transform cursor-pointer ${
                  active
                    ? 'border-gl-accent-light scale-110 ring-2 ring-gl-accent/45'
                    : 'border-white/25 hover:scale-105'
                }`}
                style={{ backgroundColor: c.hex }}
              />
            );
          })}

          <label
            title="Свой цвет текста"
            className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/[0.04] px-2 h-7 text-xs text-gl-text-secondary cursor-pointer hover:border-white/30"
          >
            <input
              type="color"
              value={style.color}
              aria-label="Выбрать свой цвет текста"
              onChange={(e) => updateStyle({ color: e.target.value.toUpperCase() })}
              className="w-4 h-4 bg-transparent border-0 p-0 cursor-pointer"
            />
            <span>Свой</span>
          </label>
        </div>
      </div>

      {/* 5. Shadow & Decorative Accent */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-1">
          <span className="text-xs text-gl-text-muted block">Тень</span>
          <div className="grid grid-cols-3 gap-1">
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
                data-selected={style.shadow === s.id}
                onClick={() => updateStyle({ shadow: s.id })}
                className="gl-choice py-1.5 px-1 text-[11px] font-medium"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-xs text-gl-text-muted block">Акцент</span>
          <div className="grid grid-cols-2 gap-1">
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
                data-selected={style.accent === a.id}
                onClick={() => updateStyle({ accent: a.id })}
                className="gl-choice py-1 px-1.5 text-[11px] font-medium"
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 6. Interactive Bounded Position & Block Size */}
      {showLayoutControls && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-gl-text-secondary font-medium">
              Расположение текста
            </span>
            {(style.offsetX !== 0 || style.offsetY !== 0 || style.widthPct !== DEFAULT_STAR_TEXT_STYLE.widthPct) && (
              <button
                type="button"
                onClick={() =>
                  updateStyle({
                    offsetX: 0,
                    offsetY: 0,
                    widthPct: DEFAULT_STAR_TEXT_STYLE.widthPct,
                  })
                }
                className="text-[11px] font-medium text-gl-accent-light hover:text-gl-text cursor-pointer"
              >
                По центру
              </button>
            )}
          </div>

          <div
            className="relative rounded-xl border border-white/15 overflow-hidden p-2 select-none"
            style={{ background: palette.cssGradient }}
          >
            <div className="flex items-center justify-between text-[10px] text-white/55 mb-1.5 px-1">
              <span>Потяни текст или ручку справа</span>
            </div>

            <div
              ref={stageRef}
              style={{
                background: cardTheme
                  ? `linear-gradient(155deg, ${resolvedCard.surfaceBg} 0%, ${resolvedCard.surfaceBgAlt} 100%)`
                  : undefined,
                borderColor: cardTheme ? `${resolvedCard.borderColor}66` : undefined,
              }}
              className="relative h-40 w-full rounded-lg border border-dashed border-white/20 bg-black/20 p-2 flex flex-col overflow-hidden"
            >
              <div style={{ flexGrow: topGrow, flexBasis: 0 }} />

              <div
                onPointerDown={(e) => startStagePointer('move', e)}
                onPointerMove={moveStagePointer}
                onPointerUp={endStagePointer}
                onPointerCancel={endStagePointer}
                title="Перетащи блок в нужное место"
                style={{
                  width: `${style.widthPct}%`,
                  marginLeft: `${marginLeftPct}%`,
                  fontFamily: fontMeta.cssFamily,
                  fontWeight: style.fontWeight === 'semibold' ? 600 : 400,
                  textAlign: effectiveAlign,
                  lineHeight: style.lineHeight,
                  color: style.color,
                  textShadow: resolveTextShadowCss(
                    resolvedCard.isLightPaper && style.shadow !== 'glow' ? 'none' : style.shadow,
                    glow.hex,
                  ),
                  borderColor:
                    style.accent === 'frame'
                      ? `${resolvedCard.accentColor}66`
                      : style.accent === 'quote'
                        ? resolvedCard.accentColor
                        : resolvedCard.isLightPaper
                          ? `${resolvedCard.borderColor}66`
                          : undefined,
                  backgroundColor:
                    style.accent === 'frame'
                      ? resolvedCard.isLightPaper
                        ? 'rgba(255,255,255,0.65)'
                        : 'rgba(9,14,36,0.55)'
                      : resolvedCard.isLightPaper
                        ? 'rgba(255,255,255,0.28)'
                        : undefined,
                }}
                className={`relative shrink-0 cursor-grab active:cursor-grabbing touch-none transition-[border,background-color] ${
                  style.accent === 'frame'
                    ? 'rounded-lg border px-2.5 py-2'
                    : style.accent === 'quote'
                      ? effectiveAlign === 'right'
                        ? 'border-r-2 pr-2.5 py-1'
                        : 'border-l-2 pl-2.5 py-1'
                      : 'rounded-md border border-white/15 bg-white/[0.04] px-2 py-1.5'
                }`}
              >
                {style.accent === 'line' && (
                  <div
                    className="h-px w-10 mb-1 opacity-80"
                    style={{
                      background: glow.hex,
                      marginLeft:
                        effectiveAlign === 'center'
                          ? 'auto'
                          : effectiveAlign === 'right'
                            ? 'auto'
                            : 0,
                      marginRight: effectiveAlign === 'center' ? 'auto' : 0,
                    }}
                  />
                )}
                <div className="text-xs font-bold truncate" style={{ fontSize: `${Math.min(16, previewFontPx + 2)}px` }}>
                  {previewTitle || 'Название звезды'}
                </div>
                <p
                  className="line-clamp-2 overflow-hidden"
                  style={{ fontSize: `${previewFontPx}px` }}
                >
                  {previewMessage || 'Здесь будет отображаться тёплое пожелание...'}
                </p>

                <span className="pointer-events-none absolute top-1 right-1 text-white/45">
                  <Move className="w-2.5 h-2.5" />
                </span>

                {/* Right-edge resize handle */}
                <button
                  type="button"
                  onPointerDown={(e) => startStagePointer('resize', e)}
                  onPointerMove={moveStagePointer}
                  onPointerUp={endStagePointer}
                  onPointerCancel={endStagePointer}
                  title="Потяни, чтобы изменить ширину текста"
                  aria-label="Изменить ширину текстового блока"
                  className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-7 rounded-full bg-gl-accent border border-white/60 cursor-ew-resize touch-none shadow"
                />
              </div>

              <div style={{ flexGrow: bottomGrow, flexBasis: 0 }} />
            </div>
          </div>

          <div className="space-y-1.5 rounded-xl border border-white/10 bg-white/[0.025] p-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gl-text-muted">Ширина текста</span>
              <span className="text-gl-text-secondary">
                {style.widthPct <= 70 ? 'Узко' : style.widthPct >= 92 ? 'Широко' : 'Средне'}
              </span>
            </div>
            <input
              type="range"
              min={56}
              max={100}
              step={2}
              value={style.widthPct}
              aria-label="Ширина текстового блока"
              onChange={(e) => updateStyle({ widthPct: Number(e.target.value) })}
              className="w-full accent-gl-accent cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
}
