import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  CheckCircle2,
  FileCode2,
  Film,
  HardDriveDownload,
  Smartphone,
  X,
} from 'lucide-react';
import { resolveMusicTrackName } from '../scene/paletteConfig';
import {
  estimateStandaloneHtmlSize,
  exportProjectToHtml,
  type StandaloneHtmlEstimate,
} from '../services/htmlExporter';
import { formatBytesRu } from '../services/encoding';
import { exportProjectBackup } from '../services/projectBackup';
import {
  computeVideoTimeline,
  exportProjectToMp4,
  type VideoExportProgress,
} from '../services/videoExporter';
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

type ExportFormat = 'html' | 'zip' | 'mp4' | 'backup';

interface ExportDoneState {
  format: ExportFormat;
  filename: string;
  sizeText: string;
  durationSec?: number;
}

export function ExportModal({
  project,
  onClose,
  onSelectStar,
}: ExportModalProps) {
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(
    null,
  );
  const [videoProgress, setVideoProgress] = useState<VideoExportProgress | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [doneInfo, setDoneInfo] = useState<ExportDoneState | null>(null);
  const [htmlEstimate, setHtmlEstimate] =
    useState<StandaloneHtmlEstimate | null>(null);
  const mp4AbortRef = useRef<AbortController | null>(null);

  const estimatedVideoDuration = Math.round(
    computeVideoTimeline(project).totalDurationSec,
  );

  useEffect(() => {
    return () => {
      mp4AbortRef.current?.abort();
    };
  }, []);

  const totalStars = project.stars.length;
  const hasEnoughStars = totalStars >= 5;
  const unfilledStars = project.stars
    .map((s, idx) => ({ star: s, idx }))
    .filter((item) => !isStarFilled(item.star));
  const starsCheckOk = hasEnoughStars && unfilledStars.length === 0;
  const hasTitle = project.title.trim().length > 0;
  const hasFinal = project.finalMessage.trim().length > 0;
  const ready = canExportProject(project);
  const isBusy = exportingFormat !== null;

  useEffect(() => {
    let cancelled = false;
    void estimateStandaloneHtmlSize(project)
      .then((est) => {
        if (!cancelled) setHtmlEstimate(est);
      })
      .catch(() => {
        if (!cancelled) setHtmlEstimate(null);
      });
    return () => {
      cancelled = true;
    };
  }, [project]);

  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const handleDownloadZip = async () => {
    setExportingFormat('zip');
    setError(null);
    setDoneInfo(null);
    try {
      const { blob, filename } = await exportProjectToZip(project);
      triggerBlobDownload(blob, filename);
      setDoneInfo({
        format: 'zip',
        filename,
        sizeText: formatBytesRu(blob.size),
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Не удалось собрать ZIP-архив.',
      );
    } finally {
      setExportingFormat(null);
    }
  };

  const handleDownloadHtml = async () => {
    setExportingFormat('html');
    setError(null);
    setDoneInfo(null);
    try {
      const { blob, filename, formattedSize } = await exportProjectToHtml(
        project,
      );
      triggerBlobDownload(blob, filename);
      setDoneInfo({
        format: 'html',
        filename,
        sizeText: formattedSize,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Не удалось собрать автономный HTML-файл.',
      );
    } finally {
      setExportingFormat(null);
    }
  };

  const handleDownloadMp4 = async () => {
    const controller = new AbortController();
    mp4AbortRef.current = controller;
    setExportingFormat('mp4');
    setVideoProgress({ percent: 2, stageLabel: 'Готовим видеооткрытку...' });
    setError(null);
    setDoneInfo(null);
    try {
      const { blob, filename, formattedSize, durationSec } =
        await exportProjectToMp4(project, {
          signal: controller.signal,
          onProgress: (p) => setVideoProgress(p),
        });
      triggerBlobDownload(blob, filename);
      setDoneInfo({
        format: 'mp4',
        filename,
        sizeText: formattedSize,
        durationSec: Math.round(durationSec),
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Экспорт видео отменён.');
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'Не удалось создать MP4-видео.',
        );
      }
    } finally {
      mp4AbortRef.current = null;
      setExportingFormat(null);
      setVideoProgress(null);
    }
  };

  const handleDownloadBackup = async () => {
    setExportingFormat('backup');
    setError(null);
    setDoneInfo(null);
    try {
      const { blob, filename } = await exportProjectBackup(project);
      triggerBlobDownload(blob, filename);
      setDoneInfo({
        format: 'backup',
        filename,
        sizeText: formatBytesRu(blob.size),
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Не удалось сохранить резервную копию проекта.',
      );
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isBusy) onClose();
      }}
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#06040a]/82 overflow-y-auto"
    >
      <div className="w-full max-w-lg gl-card p-6 space-y-5 shadow-2xl my-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-gl-text">
              Скачать открытку
            </h2>
            <p className="text-xs text-gl-text-muted mt-1">
              Выберите формат: HTML для Android, видео MP4 для iPhone или ZIP-архив
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
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
                Нельзя скачать открытку, пока у всех звёзд не заполнены название и послание.
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

        {/* Embedded Contents Summary */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2 text-xs text-slate-300">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-white">Что будет в открытке:</span>
            {htmlEstimate && (
              <span
                data-testid="html-size-estimate"
                className="text-[11px] font-medium text-indigo-200 tabular-nums"
              >
                HTML ≈ {htmlEstimate.formattedSize}
              </span>
            )}
          </div>
          <p>• 3D-сцена созвездия, конверт, тексты, настройки и шрифты</p>
          <p>• Все выбранные иллюстрации и загруженные фото звёзд</p>
          {project.musicTrackId !== 'none' && (
            <p>• Музыка: {resolveMusicTrackName(project)}</p>
          )}
          <div className="pt-1 flex items-start gap-2 text-[11px] text-slate-400 border-t border-white/10">
            <Smartphone className="w-3.5 h-3.5 text-indigo-300 shrink-0 mt-0.5" />
            <span>
              Для Android и компьютера выберите{' '}
              <strong className="text-slate-200">HTML</strong>, а для{' '}
              <strong className="text-slate-200">iPhone и мессенджеров</strong> —{' '}
              <strong className="text-slate-200">видео MP4</strong>: оно сразу открывается в «Фото», Telegram и WhatsApp.
            </span>
          </div>
        </div>

        {htmlEstimate && htmlEstimate.missingResources.length > 0 && (
          <div className="rounded-xl border border-rose-400/40 bg-rose-500/15 p-3 text-xs text-rose-100 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Обнаружены недостающие ресурсы:
            </div>
            {htmlEstimate.missingResources.map((item) => (
              <p key={item} className="pl-5">
                • {item}
              </p>
            ))}
          </div>
        )}

        {htmlEstimate?.warningMessage && (
          <div className="rounded-xl border border-amber-400/35 bg-amber-500/12 p-3 text-xs text-amber-100 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
            <span>{htmlEstimate.warningMessage}</span>
          </div>
        )}

        {error && (
          <div
            data-testid="export-error-banner"
            className="rounded-xl border border-rose-400/40 bg-rose-500/15 p-3 text-xs text-rose-100 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {exportingFormat === 'mp4' && videoProgress && (
          <div
            data-testid="mp4-progress-banner"
            className="rounded-xl border border-indigo-400/35 bg-indigo-500/15 p-3.5 text-xs text-indigo-100 space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium truncate">{videoProgress.stageLabel}</span>
              <span className="font-semibold tabular-nums shrink-0">
                {videoProgress.percent}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-400 via-purple-400 to-sky-400 transition-all duration-150"
                style={{ width: `${Math.max(4, Math.min(100, videoProgress.percent))}%` }}
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => mp4AbortRef.current?.abort()}
                className="text-[11px] text-indigo-200 hover:text-white underline cursor-pointer"
              >
                Отменить рендер
              </button>
            </div>
          </div>
        )}

        {doneInfo && (
          <div
            data-testid="export-success-banner"
            className="rounded-xl border border-emerald-400/35 bg-emerald-500/15 p-3 text-xs text-emerald-100 space-y-1"
          >
            <p>
              Файл <span className="font-semibold">{doneInfo.filename}</span> ({doneInfo.sizeText}
              {doneInfo.durationSec ? `, ~${doneInfo.durationSec} с` : ''}) скачан!
            </p>
            {doneInfo.format === 'html' ? (
              <p className="text-emerald-200/90">
                Отправьте этот файл получателю — он откроется прямо в браузере на Android или компьютере без интернета и дополнительных папок.
              </p>
            ) : doneInfo.format === 'mp4' ? (
              <p className="text-emerald-200/90">
                Видео готово для iPhone — отправьте его в Telegram, WhatsApp или сохраните в «Фото» без интернета.
              </p>
            ) : doneInfo.format === 'backup' ? (
              <p className="text-emerald-200/90">
                Резервная копия сохранена. Вы сможете загрузить её на стартовом экране на любом устройстве, чтобы продолжить редактирование.
              </p>
            ) : (
              <p className="text-emerald-200/90">
                Распакуйте ZIP-архив перед запуском, не отделяя index.html от папки assets.
              </p>
            )}
          </div>
        )}

        <div className="space-y-2.5 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              data-testid="export-html-btn"
              onClick={() => void handleDownloadHtml()}
              disabled={!ready || isBusy}
              className="gl-btn-primary w-full justify-center px-4 !py-3 text-left"
            >
              <FileCode2 className="w-4 h-4 shrink-0" />
              <span className="flex flex-col leading-tight">
                <span>
                  {exportingFormat === 'html' ? 'Собираем HTML...' : 'Скачать как HTML'}
                </span>
                <span className="text-[10px] font-normal opacity-85">
                  {htmlEstimate
                    ? `Для Android (${htmlEstimate.formattedSize})`
                    : 'Один файл для Android'}
                </span>
              </span>
            </button>

            <button
              type="button"
              data-testid="export-mp4-btn"
              onClick={() => void handleDownloadMp4()}
              disabled={!ready || isBusy}
              className="gl-btn-secondary w-full justify-center px-4 !py-3 text-left border-indigo-400/35"
            >
              <Film className="w-4 h-4 shrink-0 text-pink-300" />
              <span className="flex flex-col leading-tight">
                <span>
                  {exportingFormat === 'mp4'
                    ? `Рендерим MP4 (${videoProgress?.percent ?? 0}%)...`
                    : 'Скачать как видео (MP4)'}
                </span>
                <span className="text-[10px] font-normal text-gl-text-muted">
                  Для iPhone и мессенджеров (~{estimatedVideoDuration} с)
                </span>
              </span>
            </button>
          </div>

          <button
            type="button"
            data-testid="export-zip-btn"
            onClick={() => void handleDownloadZip()}
            disabled={!ready || isBusy}
            className="gl-btn-secondary w-full justify-center px-4 !py-2.5 text-left"
          >
            <Archive className="w-4 h-4 shrink-0" />
            <span className="flex flex-col leading-tight">
              <span>
                {exportingFormat === 'zip' ? 'Собираем архив...' : 'Скачать как архив'}
              </span>
              <span className="text-[10px] font-normal text-gl-text-muted">
                ZIP-архив (index.html + assets)
              </span>
            </span>
          </button>

          <div className="pt-2 mt-1 border-t border-white/10 space-y-2">
            <button
              type="button"
              data-testid="export-backup-btn"
              onClick={() => void handleDownloadBackup()}
              disabled={isBusy}
              className="gl-btn-secondary w-full justify-center px-4 !py-2.5 text-left border-violet-300/25"
            >
              <HardDriveDownload className="w-4 h-4 shrink-0 text-violet-300" />
              <span className="flex flex-col leading-tight">
                <span>
                  {exportingFormat === 'backup'
                    ? 'Сохраняем копию...'
                    : 'Резервная копия проекта (.giftlab.json)'}
                </span>
                <span className="text-[10px] font-normal text-gl-text-muted">
                  Для переноса в другой браузер и продолжения правки (доступно даже для черновиков)
                </span>
              </span>
            </button>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="gl-btn-secondary px-4 !min-h-[36px] text-xs"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
