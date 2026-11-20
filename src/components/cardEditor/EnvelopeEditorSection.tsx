import { Mail, RotateCcw, Sparkles } from 'lucide-react';
import type { EditableTextField } from '../../preview/previewProtocol';
import {
  DEFAULT_ENVELOPE_TEXTS,
  ENVELOPE_COLOR_SWATCHES,
  ENVELOPE_FOOTER_OFFSET_MAX,
  ENVELOPE_FOOTER_OFFSET_MIN,
  ENVELOPE_GLOW_DEFAULT,
  ENVELOPE_GLOW_MAX,
  ENVELOPE_GLOW_MIN,
  ENVELOPE_MAX_SCALE,
  ENVELOPE_MIN_SCALE,
  ENVELOPE_MOTIFS,
  ENVELOPE_OFFSET_MAX,
  ENVELOPE_OFFSET_MIN,
  ENVELOPE_SHAPES,
  ENVELOPE_TEXT_OFFSET_MAX,
  ENVELOPE_TEXT_OFFSET_MIN,
  GLOW_COLORS,
  SEAL_COLOR_SWATCHES,
  getEnvelope2DSvgSpec,
  getEnvelopeMotifSvgElements,
  resolveEnvelopeFooterOffsetY,
  resolveEnvelopeGlowIntensity,
  resolveEnvelopeOffsetY,
  resolveEnvelopeSettings,
  resolveEnvelopeTextOffsetY,
  resolveEnvelopeUserScale,
  resolveSealPaletteColors,
  sanitizeEnvelopeSettings,
} from '../../scene/paletteConfig';
import type { ConstellationProject, EnvelopeSettings } from '../../types/project';
import type { PreviewDeviceId } from '../LivePreviewStage';

interface EnvelopeEditorSectionProps {
  project: ConstellationProject;
  device: PreviewDeviceId;
  focusedField?: EditableTextField | null;
  onPatchProject: (patch: Partial<ConstellationProject>) => void;
  onSelectCardTargetView: (
    phase: 'sealed' | 'constellation' | 'starStory',
    starIndex?: number,
  ) => void;
}

const SEAL_STAR_POINTS = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4 - Math.PI / 2;
  const r = i % 2 === 0 ? 7.5 : 3.2;
  return `${(12 + Math.cos(a) * r).toFixed(2)},${(12 + Math.sin(a) * r).toFixed(2)}`;
}).join(' ');

export function EnvelopeEditorSection({
  project,
  device,
  focusedField = null,
  onPatchProject,
  onSelectCardTargetView,
}: EnvelopeEditorSectionProps) {
  const resolvedEnvelope = resolveEnvelopeSettings(project);
  const activeEnvelopeScale = resolveEnvelopeUserScale(project.envelopeSettings, device);
  const activeEnvelopeTextOffsetY = resolveEnvelopeTextOffsetY(
    project.envelopeSettings,
    device,
  );
  const activeEnvelopeFooterOffsetY = resolveEnvelopeFooterOffsetY(
    project.envelopeSettings,
    device,
  );
  const activeEnvelopeOffsetY = resolveEnvelopeOffsetY(project.envelopeSettings, device);
  const activeEnvelopeGlow = resolveEnvelopeGlowIntensity(project.envelopeSettings);
  const paletteGlow = GLOW_COLORS[project.globalGlowColor] ?? GLOW_COLORS.gold;

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

  return (
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
              Форма, рисунок, цвета, печать и текст
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

      {/* 4 Envelope Shapes + Corner Motif */}
      <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.025] p-3.5">
        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-gl-text block">Вид конверта</span>
          <div className="grid grid-cols-2 gap-1.5">
            {ENVELOPE_SHAPES.map((item) => {
              const selected = resolvedEnvelope.shape === item.id;
              const svgSpec = getEnvelope2DSvgSpec(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`envelope-shape-${item.id}`}
                  data-selected={selected}
                  onClick={() => updateEnvelopeSettings({ shape: item.id })}
                  title={item.description}
                  className="gl-choice p-2 flex items-center gap-2 text-left"
                >
                  <svg
                    viewBox="0 0 320 192"
                    className="w-10 h-6 shrink-0 rounded-[4px] border border-white/25 bg-white/[0.06]"
                    aria-hidden="true"
                  >
                    <path
                      d={svgSpec.pocketPath}
                      fill="rgba(255,255,255,0.08)"
                      stroke="rgba(255,255,255,0.45)"
                      strokeWidth="10"
                    />
                    <path
                      d={svgSpec.flapPath}
                      fill="rgba(196,181,253,0.22)"
                      stroke="rgba(255,255,255,0.85)"
                      strokeWidth="10"
                    />
                  </svg>
                  <span className="text-[11px] font-semibold text-gl-text truncate">
                    {item.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-white/10">
          <span className="text-xs font-medium text-gl-text-secondary block">
            Картинка на конверте
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            {ENVELOPE_MOTIFS.map((item) => {
              const selected = resolvedEnvelope.motif === item.id;
              const elements = getEnvelopeMotifSvgElements(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`envelope-motif-${item.id}`}
                  data-selected={selected}
                  onClick={() => updateEnvelopeSettings({ motif: item.id })}
                  className="gl-choice px-2 py-1.5 flex flex-col items-center justify-center gap-1 text-[10px] font-medium"
                >
                  {item.id === 'none' ? (
                    <span className="w-5 h-5 rounded-full border border-dashed border-white/35 flex items-center justify-center text-[10px] text-gl-text-muted">
                      —
                    </span>
                  ) : (
                    <svg
                      viewBox="0 0 48 48"
                      className="w-5 h-5 text-amber-200"
                      aria-hidden="true"
                    >
                      {elements.map((elSpec, idx) => {
                        if (elSpec.tag === 'path') {
                          return <path key={idx} {...elSpec.attrs} />;
                        }
                        if (elSpec.tag === 'circle') {
                          return <circle key={idx} {...elSpec.attrs} />;
                        }
                        if (elSpec.tag === 'polygon') {
                          return <polygon key={idx} {...elSpec.attrs} />;
                        }
                        if (elSpec.tag === 'line') {
                          return <line key={idx} {...elSpec.attrs} />;
                        }
                        return <ellipse key={idx} {...elSpec.attrs} />;
                      })}
                    </svg>
                  )}
                  <span className="truncate max-w-full">{item.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Colors */}
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
                Из палитры неба
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
                  className={`w-7 h-7 rounded-lg border transition-transform cursor-pointer shadow-inner ${
                    active
                      ? 'border-amber-300 scale-110 ring-2 ring-amber-300/55'
                      : 'border-white/40 hover:scale-105'
                  }`}
                  style={{
                    background: `linear-gradient(155deg, ${sw.hex} 0%, ${sw.hex}CC 100%)`,
                  }}
                />
              );
            })}
            <label className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/[0.04] px-2 h-7 text-[11px] text-gl-text-secondary cursor-pointer hover:border-white/30">
              <input
                type="color"
                value={project.envelopeSettings?.envelopeColor ?? '#E4DFF8'}
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
              const pair = resolveSealPaletteColors(sw.hex, paletteGlow);
              return (
                <button
                  key={sw.hex}
                  type="button"
                  title={sw.name}
                  aria-label={sw.name}
                  data-testid={`seal-color-${sw.hex.slice(1)}`}
                  data-selected={active}
                  onClick={() => updateEnvelopeSettings({ sealColor: sw.hex })}
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-transform cursor-pointer ${
                    active
                      ? 'scale-110 ring-2 ring-amber-300/65'
                      : 'hover:scale-105'
                  }`}
                  style={{
                    backgroundColor: pair.discHex,
                    borderColor: pair.rimHex,
                  }}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                    <polygon points={SEAL_STAR_POINTS} fill={pair.starHex} />
                  </svg>
                </button>
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

        <label className="block space-y-1 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-xs font-medium text-gl-text-secondary">
              Свечение конверта
            </span>
            <div className="flex items-center gap-2">
              {activeEnvelopeGlow !== ENVELOPE_GLOW_DEFAULT && (
                <button
                  type="button"
                  onClick={() =>
                    updateEnvelopeSettings({ glowIntensity: ENVELOPE_GLOW_DEFAULT })
                  }
                  className="text-[11px] font-medium text-gl-accent-light hover:text-gl-text cursor-pointer"
                >
                  Сбросить
                </button>
              )}
              <span className="text-gl-text-muted tabular-nums">
                {Math.round(activeEnvelopeGlow * 100)}%
              </span>
            </div>
          </div>
          <input
            type="range"
            min={ENVELOPE_GLOW_MIN}
            max={ENVELOPE_GLOW_MAX}
            step={0.05}
            value={activeEnvelopeGlow}
            data-testid="envelope-glow-slider"
            aria-label="Свечение конверта"
            onChange={(e) =>
              updateEnvelopeSettings({ glowIntensity: Number(e.target.value) })
            }
            className="w-full accent-gl-accent cursor-pointer"
          />
          <p className="text-[10.5px] text-gl-text-muted leading-snug">
            Можно убавить до 0%, если конверт или печать кажутся слишком яркими.
          </p>
        </label>
      </div>

      {/* Size & Position */}
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

      {/* Texts */}
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

        <label className="block space-y-1 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-xs text-gl-text-secondary font-medium">
              Кнопка и подпись снизу по высоте
            </span>
            {activeEnvelopeFooterOffsetY !== 0 ? (
              <button
                type="button"
                onClick={() =>
                  updateEnvelopeSettings({
                    [device === 'phone' ? 'phoneFooterOffsetY' : 'desktopFooterOffsetY']: 0,
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
            min={ENVELOPE_FOOTER_OFFSET_MIN}
            max={ENVELOPE_FOOTER_OFFSET_MAX}
            step={2}
            value={activeEnvelopeFooterOffsetY}
            data-testid="envelope-footer-offset-y-slider"
            aria-label="Положение кнопки и текста снизу по высоте"
            onChange={(e) =>
              updateEnvelopeSettings({
                [device === 'phone' ? 'phoneFooterOffsetY' : 'desktopFooterOffsetY']: Number(
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

      <button
        type="button"
        onClick={() => onSelectCardTargetView('constellation')}
        className="gl-btn-secondary w-full !min-h-[40px] text-xs"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
        Настроить финальную открытку
      </button>
    </div>
  );
}
