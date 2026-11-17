import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Palette, RotateCcw } from 'lucide-react';
import {
  CARD_THEME_LIST,
  DARK_CARD_TEXT_COLORS,
  LIGHT_PAPER_TEXT_COLORS,
  applyCardThemeToProject,
  resolveCardColors,
  resolveCardTheme,
  resolveMessageFont,
  resolveStarTextStyle,
} from '../scene/paletteConfig';
import type {
  CardThemeCustomColors,
  CardThemeId,
  ConstellationProject,
} from '../types/project';
import { CardDecorView } from './CardDecorView';
import { CardThemeBackdrop } from './CardThemeBackdrop';

interface CardLibraryPanelProps {
  project: ConstellationProject;
  onChange: (patch: Partial<ConstellationProject>) => void;
  compact?: boolean;
  collapsibleColors?: boolean;
}

export function CardLibraryPanel({
  project,
  onChange,
  compact = false,
  collapsibleColors = false,
}: CardLibraryPanelProps) {
  const [colorsOpen, setColorsOpen] = useState(!collapsibleColors);
  const activeTheme = resolveCardTheme(project.cardTheme);
  const resolvedColors = resolveCardColors(project);
  const hasCustomColors = Boolean(
    project.cardColors && Object.keys(project.cardColors).length > 0,
  );

  const handleSelectTheme = (themeId: CardThemeId) => {
    const next = applyCardThemeToProject(project, themeId);
    onChange({
      cardTheme: next.cardTheme,
      cardColors: next.cardColors,
      stars: next.stars,
      finalTextStyle: next.finalTextStyle,
      finalDecor: next.finalDecor,
    });
  };

  const handleColorPatch = (patch: Partial<CardThemeCustomColors>) => {
    const nextColors: CardThemeCustomColors = {
      ...project.cardColors,
      ...patch,
    };

    const projectPatch: Partial<ConstellationProject> = {
      cardTheme: project.cardTheme ?? activeTheme.id,
      cardColors: nextColors,
    };

    if (patch.textColor) {
      const upper = patch.textColor.toUpperCase();
      projectPatch.stars = project.stars.map((s) => ({
        ...s,
        textStyle: {
          ...resolveStarTextStyle(s.textStyle),
          color: upper,
        },
      }));
      projectPatch.finalTextStyle = {
        ...resolveStarTextStyle(project.finalTextStyle),
        color: upper,
      };
    }

    onChange(projectPatch);
  };

  const handleResetColors = () => {
    onChange({
      cardColors: undefined,
      stars: project.stars.map((s) => ({
        ...s,
        textStyle: {
          ...resolveStarTextStyle(s.textStyle),
          color: activeTheme.defaultTextColor,
        },
      })),
      finalTextStyle: {
        ...resolveStarTextStyle(project.finalTextStyle),
        color: activeTheme.defaultTextColor,
      },
    });
  };

  const textPalette = resolvedColors.isLightPaper
    ? LIGHT_PAPER_TEXT_COLORS
    : DARK_CARD_TEXT_COLORS;

  return (
    <div className="space-y-3.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-sm font-semibold text-gl-text flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-gl-accent-light shrink-0" />
            Стиль открытки
          </h3>
          <p className="text-[11px] text-gl-text-muted mt-0.5 leading-snug">
            Тексты, картинки и звёзды при смене стиля сохраняются
          </p>
        </div>
      </div>

      {/* 5 Card Compositions Grid with Live Visual Miniatures */}
      <div className={`grid gap-2.5 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-1'}`}>
        {CARD_THEME_LIST.map((theme) => {
          const isSelected = activeTheme.id === theme.id;
          const fontMeta = resolveMessageFont(theme.defaultFontId);
          const previewBg = isSelected ? resolvedColors.surfaceBg : theme.defaultSurfaceBg;
          const previewBgAlt = isSelected ? resolvedColors.surfaceBgAlt : theme.surfaceBgAlt;
          const previewAccent = isSelected ? resolvedColors.accentColor : theme.defaultAccentColor;
          const previewText = isSelected ? resolvedColors.textColor : theme.defaultTextColor;
          const previewBadge = isSelected ? resolvedColors.badgeColor : theme.defaultBadgeColor;
          const previewBorder = isSelected ? resolvedColors.borderColor : theme.borderColor;

          return (
            <button
              key={theme.id}
              type="button"
              data-selected={isSelected}
              data-testid={`card-theme-${theme.id}`}
              onClick={() => handleSelectTheme(theme.id)}
              className={`group relative w-full text-left rounded-2xl border p-2.5 transition-all cursor-pointer ${
                isSelected
                  ? 'border-gl-accent-light bg-gl-accent/15 ring-1 ring-gl-accent-light/40'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]'
              }`}
            >
              {/* Miniature Visual Composition Preview */}
              <div
                className="relative h-24 w-full rounded-xl overflow-hidden border p-2.5 flex flex-col justify-between mb-2 backdrop-blur-md"
                style={{
                  background: theme.isLightPaper
                    ? `linear-gradient(145deg, ${previewBg} 0%, ${previewBgAlt} 100%)`
                    : `linear-gradient(145deg, ${previewBg}E8 0%, ${previewBgAlt}EC 100%)`,
                  borderColor: theme.isLightPaper
                    ? `${previewBorder}66`
                    : `${previewBorder}78`,
                  boxShadow: theme.isLightPaper
                    ? undefined
                    : 'inset 0 1px 0 rgba(255,255,255,0.3)',
                }}
              >
                {/* Theme pattern overlay */}
                <CardThemeBackdrop
                  pattern={theme.paperPattern}
                  accentColor={previewAccent}
                  badgeColor={previewBadge}
                  borderColor={previewBorder}
                  glowHex={previewAccent}
                  isLightPaper={theme.isLightPaper}
                  compact
                  reducedMotion
                />

                {/* Miniature Decor */}
                {theme.defaultDecorMotif !== 'none' && (
                  <div className="pointer-events-none absolute right-1.5 bottom-1 opacity-85">
                    <CardDecorView
                      motif={theme.defaultDecorMotif}
                      glowHex={previewAccent}
                      coreHex={previewBadge}
                      className="w-12 h-12"
                    />
                  </div>
                )}

                <div className={`relative z-10 flex items-center justify-between gap-2 ${theme.id === 'minimalist' ? 'pl-2' : ''}`}>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider truncate"
                    style={{ color: previewBadge }}
                  >
                    {theme.name}
                  </span>
                  {isSelected && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-gl-accent px-1.5 py-0.5 text-[10px] font-semibold text-white shrink-0">
                      <Check className="w-2.5 h-2.5" />
                      Выбрана
                    </span>
                  )}
                </div>

                <div className={`relative z-10 pr-10 space-y-0.5 ${theme.id === 'minimalist' ? 'pl-2' : ''}`}>
                  <div
                    className="h-0.5 w-8 rounded-full mb-1"
                    style={{ backgroundColor: previewAccent }}
                  />
                  <p
                    className="text-sm leading-tight truncate"
                    style={{
                      fontFamily: fontMeta.cssFamily,
                      color: previewText,
                    }}
                  >
                    С тёплыми пожеланиями
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 px-0.5">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-gl-text truncate">
                    {theme.name}
                  </div>
                  <p className="text-[11px] text-gl-text-muted leading-snug line-clamp-2">
                    {theme.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Theme Custom Color Controls */}
      <div className="rounded-xl border border-white/10 bg-white/[0.025] overflow-hidden">
        {collapsibleColors ? (
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <button
              type="button"
              onClick={() => setColorsOpen((o) => !o)}
              aria-expanded={colorsOpen}
              className="flex-1 flex items-center justify-between gap-2 text-xs font-medium text-gl-text-secondary hover:text-gl-text cursor-pointer text-left"
            >
              <span>Свои цвета открытки</span>
              {colorsOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-gl-text-muted shrink-0" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-gl-text-muted shrink-0" />
              )}
            </button>
            {hasCustomColors && (
              <button
                type="button"
                onClick={handleResetColors}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-gl-accent-light hover:text-gl-text cursor-pointer shrink-0 pl-2 border-l border-white/10"
              >
                <RotateCcw className="w-3 h-3" />
                Сброс
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 px-3 pt-3">
            <span className="text-xs font-semibold text-gl-text-secondary">
              Цвета композиции
            </span>
            {hasCustomColors && (
              <button
                type="button"
                onClick={handleResetColors}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-gl-accent-light hover:text-gl-text cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Сбросить
              </button>
            )}
          </div>
        )}

        {colorsOpen && (
          <div className={`p-3 space-y-3 ${collapsibleColors ? 'border-t border-white/10' : 'pt-2.5'}`}>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 cursor-pointer hover:border-white/25">
                <span className="text-[11px] text-gl-text-secondary">Фон листа</span>
                <input
                  type="color"
                  aria-label="Цвет фона открытки"
                  value={resolvedColors.surfaceBg}
                  onChange={(e) =>
                    handleColorPatch({ surfaceBg: e.target.value.toUpperCase() })
                  }
                  className="w-6 h-6 rounded border-0 bg-transparent p-0 cursor-pointer shrink-0"
                />
              </label>

              <label className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 cursor-pointer hover:border-white/25">
                <span className="text-[11px] text-gl-text-secondary">Акцент</span>
                <input
                  type="color"
                  aria-label="Акцентный цвет открытки"
                  value={resolvedColors.accentColor}
                  onChange={(e) =>
                    handleColorPatch({ accentColor: e.target.value.toUpperCase() })
                  }
                  className="w-6 h-6 rounded border-0 bg-transparent p-0 cursor-pointer shrink-0"
                />
              </label>

              <label className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 cursor-pointer hover:border-white/25">
                <span className="text-[11px] text-gl-text-secondary">Текст</span>
                <input
                  type="color"
                  aria-label="Цвет текста композиции"
                  value={resolvedColors.textColor}
                  onChange={(e) =>
                    handleColorPatch({ textColor: e.target.value.toUpperCase() })
                  }
                  className="w-6 h-6 rounded border-0 bg-transparent p-0 cursor-pointer shrink-0"
                />
              </label>

              <label className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 cursor-pointer hover:border-white/25">
                <span className="text-[11px] text-gl-text-secondary">Заголовок</span>
                <input
                  type="color"
                  aria-label="Цвет подписи и метки"
                  value={resolvedColors.badgeColor}
                  onChange={(e) =>
                    handleColorPatch({ badgeColor: e.target.value.toUpperCase() })
                  }
                  className="w-6 h-6 rounded border-0 bg-transparent p-0 cursor-pointer shrink-0"
                />
              </label>
            </div>

            {/* Contrast-safe quick text swatches */}
            <div className="space-y-1">
              <span className="text-[10px] text-gl-text-muted block">
                Оттенки для выбранного фона:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {textPalette.map((swatch) => {
                  const active =
                    resolvedColors.textColor.toUpperCase() === swatch.hex.toUpperCase();
                  return (
                    <button
                      key={swatch.hex}
                      type="button"
                      title={swatch.name}
                      aria-label={swatch.name}
                      onClick={() => handleColorPatch({ textColor: swatch.hex })}
                      className={`w-6 h-6 rounded-md border transition-transform cursor-pointer ${
                        active
                          ? 'border-gl-accent-light scale-110 ring-2 ring-gl-accent/45'
                          : 'border-white/25 hover:scale-105'
                      }`}
                      style={{ backgroundColor: swatch.hex }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
