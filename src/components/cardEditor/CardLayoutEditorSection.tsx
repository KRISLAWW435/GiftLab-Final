import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import {
  DEFAULT_CARD_LAYOUT,
  buildProjectCardDevicePatch,
  resetDeviceLayoutInProject,
  resolveEffectiveCardLayout,
} from '../../scene/paletteConfig';
import type {
  CardPaddingPreset,
  CardVerticalAlign,
  CardWidthPreset,
  ConstellationProject,
  DeviceCardLayout,
} from '../../types/project';
import type { PreviewDeviceId } from '../LivePreviewStage';

interface CardLayoutEditorSectionProps {
  project: ConstellationProject;
  device: PreviewDeviceId;
  onPatchProject: (patch: Partial<ConstellationProject>) => void;
  onResetDeviceLayout: (nextProject: ConstellationProject) => void;
}

export function CardLayoutEditorSection({
  project,
  device,
  onPatchProject,
  onResetDeviceLayout,
}: CardLayoutEditorSectionProps) {
  const [resetLayoutNotice, setResetLayoutNotice] = useState(false);

  const activeCardLayout = resolveEffectiveCardLayout(project, device);

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
            <span className="font-medium text-gl-text-secondary">Масштаб открытки</span>
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
            onChange={(e) => updateActiveCardLayout({ scale: Number(e.target.value) })}
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
            onChange={(e) => updateActiveCardLayout({ offsetY: Number(e.target.value) })}
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
  );
}
