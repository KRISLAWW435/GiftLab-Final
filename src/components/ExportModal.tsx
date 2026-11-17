import { useState } from 'react';
import { AlertCircle, CheckCircle2, Download, X } from 'lucide-react';
import { resolveMusicTrackName } from '../scene/paletteConfig';
import { exportProjectToZip } from '../services/zipExporter';
import {
  canExportProject,
  isStarFilled,
  type ConstellationProject,
} from '../types/project';

interface ExportModalProps {
  project: ConstellationProject;
  onClose: () => void;
  onSelectStar: (starId: string) => void;
}

export function ExportModal({
  project,
  onClose,
  onSelectStar,
}: ExportModalProps) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneFile, setDoneFile] = useState<string | null>(null);

  const totalStars = project.stars.length;
  const hasEnoughStars = totalStars >= 5;
  const unfilledStars = project.stars
    .map((s, idx) => ({ star: s, idx }))
    .filter((item) => !isStarFilled(item.star));
  const starsCheckOk = hasEnoughStars && unfilledStars.length === 0;
  const hasTitle = project.title.trim().length > 0;
  const hasFinal = project.finalMessage.trim().length > 0;
  const ready = canExportProject(project);

  const handleDownload = async () => {
    setExporting(true);
    setError(null);
    try {
      const { blob, filename } = await exportProjectToZip(project);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
      setDoneFile(filename);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Не удалось собрать ZIP-архив.',
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#06040a]/82"
    >
      <div className="w-full max-w-lg gl-card p-6 space-y-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-gl-text">
              Экспорт подарка в ZIP
            </h2>
            <p className="text-xs text-gl-text-muted mt-1">
              Подарок будет работать автономно в браузере без интернета
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно экспорта"
            className="gl-btn-icon !min-w-[36px] !min-h-[36px]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Readiness Checklist */}
        <div className="rounded-xl border border-white/10 bg-gl-input p-4 space-y-2.5 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            {hasTitle ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span className={hasTitle ? 'text-slate-200' : 'text-amber-200'}>
              Название созвездия указано
            </span>
          </div>

          <div className="flex items-center gap-2">
            {starsCheckOk ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span
              className={starsCheckOk ? 'text-slate-200' : 'text-amber-200'}
            >
              {hasEnoughStars
                ? `Заполнены все звёзды (${totalStars - unfilledStars.length}/${totalStars})`
                : `Добавьте минимум 5 звёзд (${totalStars}/5)`}
            </span>
          </div>

          {unfilledStars.length > 0 && (
            <div className="pl-6 space-y-2 pt-0.5">
              <p className="text-xs text-amber-200/90">
                Нельзя скачать архив, пока у всех звёзд не заполнены название и послание.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {unfilledStars.map(({ star, idx }) => (
                  <button
                    key={star.id}
                    type="button"
                    onClick={() => {
                      onSelectStar(star.id);
                      onClose();
                    }}
                    className="rounded-lg border border-amber-400/40 bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-100 hover:bg-amber-500/25 cursor-pointer"
                  >
                    Заполнить звезду {idx + 1}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            {hasFinal ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span className={hasFinal ? 'text-slate-200' : 'text-amber-200'}>
              Финальное поздравление написано
            </span>
          </div>
        </div>

        {/* Archive Contents Summary */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-1.5 text-xs text-slate-300">
          <div className="font-semibold text-white">Что попадёт в архив:</div>
          <p>• index.html — автономная 3D-сцена созвездия (без внешних ссылок)</p>
          <p>• assets/images/ — только выбранные иллюстрации звёзд</p>
          {project.musicTrackId !== 'none' && (
            <p>
              • assets/music/ — {resolveMusicTrackName(project)}
            </p>
          )}
          <p>• ИНСТРУКЦИЯ.txt — подсказка для получателя</p>
        </div>

        {error && <p className="text-xs text-rose-300">{error}</p>}

        {doneFile && (
          <div className="rounded-xl border border-emerald-400/35 bg-emerald-500/15 p-3 text-xs text-emerald-100">
            Архив <span className="font-semibold">{doneFile}</span> скачан!
            Распакуйте его перед отправкой или запуском, не отделяя index.html от
            папки assets.
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="gl-btn-secondary px-4"
          >
            Закрыть
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!ready || exporting}
            className="gl-btn-primary px-5"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Собираем архив...' : 'Скачать ZIP'}
          </button>
        </div>
      </div>
    </div>
  );
}
