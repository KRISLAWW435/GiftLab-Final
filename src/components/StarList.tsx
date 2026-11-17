import { Check, Plus, Trash2 } from 'lucide-react';
import { StarShapePreview } from '../assets/shapePreviews';
import {
  GLOW_COLORS,
  resolveStarGlowHex,
  resolveStarShape,
} from '../scene/paletteConfig';
import {
  MAX_STARS,
  isStarComplete,
  isStarFilled,
  type ConstellationStar,
  type GlowColorId,
} from '../types/project';

interface StarListProps {
  stars: ConstellationStar[];
  selectedStarId: string;
  globalGlowColor: GlowColorId;
  layout?: 'sidebar' | 'strip';
  onSelectStar: (starId: string) => void;
  onAddStar: () => void;
  onRemoveStar: (starId: string) => void;
}

export function StarList({
  stars,
  selectedStarId,
  globalGlowColor,
  layout = 'sidebar',
  onSelectStar,
  onAddStar,
  onRemoveStar,
}: StarListProps) {
  const canAddMore = stars.length < MAX_STARS;
  const canDelete = stars.length > 5;

  if (layout === 'strip') {
    const activeStar = stars.find((s) => s.id === selectedStarId) ?? stars[0];

    return (
      <div className="border-b border-white/10 bg-[#070512]/60 px-3 py-2 space-y-2 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-gl-text truncate">
              Звёзды ({stars.length}/{MAX_STARS})
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {canDelete && activeStar && (
              <button
                type="button"
                onClick={() => onRemoveStar(activeStar.id)}
                title="Удалить выбранную звезду"
                aria-label="Удалить выбранную звезду"
                className="gl-btn-icon !min-w-[32px] !min-h-[32px] !w-8 !h-8 !p-0 text-gl-text-muted hover:text-rose-300 hover:border-rose-400/35"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onAddStar}
              disabled={!canAddMore}
              title={canAddMore ? 'Добавить звезду' : `Максимум ${MAX_STARS} звёзд`}
              className="gl-btn-primary !min-h-[32px] !px-2.5 !py-1 text-xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Добавить</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {stars.map((star, idx) => {
            const isSelected = star.id === selectedStarId;
            const complete = isStarComplete(star);
            const glowCfg = GLOW_COLORS[resolveStarGlowHex(star, globalGlowColor)];
            const shape = resolveStarShape(star);

            return (
              <button
                key={star.id}
                type="button"
                data-selected={isSelected}
                onClick={() => onSelectStar(star.id)}
                title={star.title.trim() || `Звезда ${idx + 1}`}
                className="gl-choice px-2 py-1.5 flex items-center gap-1.5 shrink-0"
              >
                <StarShapePreview
                  shape={shape}
                  color={glowCfg.hex}
                  coreColor={glowCfg.coreHex}
                  className="w-4 h-4 shrink-0"
                />
                <span className="text-xs font-semibold tabular-nums">
                  {idx + 1}
                </span>
                {complete ? (
                  <Check className="w-3 h-3 text-emerald-300 shrink-0" />
                ) : (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-amber-300 shrink-0"
                    aria-label={isStarFilled(star) ? 'Черновик' : 'Нужен текст'}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between gap-1.5 shrink-0">
        <div className="min-w-0">
          <h2 className="font-display text-xs font-semibold text-gl-text truncate">
            Звёзды ({stars.length}/{MAX_STARS})
          </h2>
        </div>

        <button
          type="button"
          onClick={onAddStar}
          disabled={!canAddMore}
          title={canAddMore ? 'Добавить звезду' : `Максимум ${MAX_STARS} звёзд`}
          className="gl-btn-primary !min-h-[30px] !px-2 !py-1 text-[11px] shrink-0"
        >
          <Plus className="w-3 h-3" />
          <span>Добавить</span>
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1 overscroll-contain">
        {stars.map((star, idx) => {
          const isSelected = star.id === selectedStarId;
          const complete = isStarComplete(star);
          const glowCfg = GLOW_COLORS[resolveStarGlowHex(star, globalGlowColor)];
          const shape = resolveStarShape(star);

          return (
            <div
              key={star.id}
              data-selected={isSelected}
              className="gl-choice group flex items-center gap-1 p-1.5"
            >
              <button
                type="button"
                onClick={() => onSelectStar(star.id)}
                className="flex-1 min-w-0 flex items-center gap-2 text-left cursor-pointer"
              >
                <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border border-white/10 bg-gl-input">
                  <StarShapePreview
                    shape={shape}
                    color={glowCfg.hex}
                    coreColor={glowCfg.coreHex}
                    className="w-5 h-5"
                  />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-semibold text-gl-text-secondary tabular-nums shrink-0">
                      {idx + 1}.
                    </span>
                    <span className="text-xs font-semibold text-white truncate">
                      {star.title.trim() || 'Без названия'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px]">
                    {complete ? (
                      <span className="inline-flex items-center gap-0.5 text-emerald-300">
                        <Check className="w-2.5 h-2.5 shrink-0" />
                        Готова
                      </span>
                    ) : isStarFilled(star) ? (
                      <span className="text-amber-300/90">Черновик</span>
                    ) : (
                      <span className="text-amber-300/90">Нужен текст</span>
                    )}
                  </div>
                </div>
              </button>

              {canDelete && (
                <button
                  type="button"
                  onClick={() => onRemoveStar(star.id)}
                  title="Удалить звезду"
                  aria-label={`Удалить ${star.title.trim() || `звезду ${idx + 1}`}`}
                  className="gl-btn-icon !min-w-[26px] !min-h-[26px] !w-[26px] !h-[26px] !p-0 border-transparent bg-transparent text-gl-text-muted hover:text-rose-300 hover:bg-rose-500/15 hover:border-rose-400/30 shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
