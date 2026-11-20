import type React from 'react';
import { useRef, useState } from 'react';
import { ImagePlus, Maximize, Minimize, Move, RotateCcw } from 'lucide-react';
import { BUILTIN_ILLUSTRATIONS, BuiltinIllustration } from '../../assets/illustrations';
import {
  DEFAULT_STAR_IMAGE_SETTINGS,
  buildStarIllustrationDevicePatch,
  getDefaultDeviceIllustrationLayout,
  resolveEffectiveIllustrationLayout,
  resolveStarImageSettings,
} from '../../scene/paletteConfig';
import { saveImageBlob } from '../../services/database';
import { processUploadedImage } from '../../services/imageProcessor';
import type {
  ConstellationStar,
  StarIllustrationLayout,
  StarIllustrationRef,
  StarImageFitMode,
  StarImageSettings,
} from '../../types/project';
import type { PreviewDeviceId } from '../LivePreviewStage';
import { StarIllustrationView } from '../StarIllustrationView';

interface IllustrationEditorSectionProps {
  projectId: string;
  activeStar: ConstellationStar;
  safeStarIndex: number;
  isFinaleCard: boolean;
  device: PreviewDeviceId;
  onSelectCardTargetView: (
    phase: 'sealed' | 'constellation' | 'starStory',
    starIndex?: number,
  ) => void;
  onPatchStar: (starId: string, patch: Partial<ConstellationStar>) => void;
}

export function IllustrationEditorSection({
  projectId,
  activeStar,
  safeStarIndex,
  isFinaleCard,
  device,
  onSelectCardTargetView,
  onPatchStar,
}: IllustrationEditorSectionProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cropDragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const activeIlluLayout = resolveEffectiveIllustrationLayout(activeStar, device);
  const activeImgSettings = resolveStarImageSettings(activeStar);

  const updateActiveIllustrationLayout = (patch: Partial<StarIllustrationLayout>) => {
    onPatchStar(activeStar.id, buildStarIllustrationDevicePatch(activeStar, device, patch));
  };

  const updateActiveImageSettings = (patch: Partial<StarImageSettings>) => {
    onPatchStar(activeStar.id, {
      imageSettings: resolveStarImageSettings({
        imageSettings: { ...activeImgSettings, ...patch },
      }),
    });
  };

  const resetActiveIllustration = () => {
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
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const processed = await processUploadedImage(file);
      const imageId = `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      await saveImageBlob(imageId, projectId, processed.blob);
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

  return (
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
  );
}
