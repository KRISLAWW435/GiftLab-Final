import { useState } from 'react';
import {
  ArrowLeft,
  Maximize,
  Minimize,
  Monitor,
  RotateCcw,
  Smartphone,
  X,
} from 'lucide-react';
import { useFullscreen } from '../hooks/useFullscreen';
import type { ConstellationProject } from '../types/project';
import {
  LivePreviewStage,
  getPreviewProjectRegistry,
  type PreviewDeviceId,
  type PreviewProjectMap,
} from './LivePreviewStage';

export { getPreviewProjectRegistry, type PreviewDeviceId, type PreviewProjectMap };

interface PreviewWorkspaceProps {
  project: ConstellationProject;
  initialDevice?: PreviewDeviceId;
  saveState?: 'saved' | 'saving';
  returnLabel: string;
  embedded?: boolean;
  onExitPreview: () => void;
}

export function PreviewWorkspace({
  project,
  initialDevice,
  returnLabel,
  embedded = false,
  onExitPreview,
}: PreviewWorkspaceProps) {
  const [device, setDevice] = useState<PreviewDeviceId>(() =>
    initialDevice ??
    (typeof window !== 'undefined' && window.innerWidth < 768 ? 'phone' : 'desktop'),
  );
  const [sessionKey, setSessionKey] = useState(0);
  const { isFullscreen, notice, dismissNotice, toggleFullscreen } = useFullscreen();

  const handleRestartScenario = () => {
    setSessionKey((k) => k + 1);
  };

  return (
    <div
      data-testid="preview-workspace-root"
      data-palette={project.paletteId}
      className={
        embedded
          ? 'relative h-full w-full min-h-0 flex-1 overflow-hidden bg-transparent text-gl-text'
          : 'relative gl-h-screen w-screen overflow-hidden bg-transparent text-gl-text'
      }
    >
      {/* Floating Glassmorphism Controls over Cosmos (0px layout height) */}
      <div
        data-testid="preview-floating-controls"
        className="pointer-events-none absolute inset-x-0 top-0 z-30 gl-safe-top px-3 sm:px-5 pt-2.5 sm:pt-3.5 flex items-center justify-between gap-2"
      >
        {/* Top-Left: Return to Editor */}
        <div className="pointer-events-auto flex items-center min-w-0">
          <button
            type="button"
            data-testid="preview-return-btn"
            onClick={onExitPreview}
            className="inline-flex items-center gap-1.5 min-h-[34px] px-3 py-1.5 rounded-full backdrop-blur-md bg-[#0b0816]/45 hover:bg-[#0b0816]/68 border border-white/15 hover:border-white/30 text-xs font-medium text-white/95 shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-all cursor-pointer max-w-[42vw] sm:max-w-none"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{returnLabel}</span>
          </button>
        </div>

        {/* Top-Right: Icon-only Device Switcher + Restart + Icon-only Fullscreen */}
        <div className="pointer-events-auto flex items-center gap-1.5 shrink-0">
          <div
            role="group"
            aria-label="Выбор устройства для предпросмотра"
            className="inline-flex items-center gap-0.5 p-1 rounded-full backdrop-blur-md bg-[#0b0816]/45 border border-white/15 shadow-[0_8px_24px_rgba(0,0,0,0.4)] shrink-0"
          >
            <button
              type="button"
              data-testid="preview-device-phone"
              onClick={() => setDevice('phone')}
              aria-pressed={device === 'phone'}
              data-selected={device === 'phone'}
              aria-label="Телефон"
              title="Телефон"
              className={`w-7 h-7 rounded-full inline-flex items-center justify-center transition-all cursor-pointer ${
                device === 'phone'
                  ? 'bg-gradient-to-r from-violet-600/85 to-purple-500/85 text-white shadow-[0_2px_10px_rgba(139,92,246,0.45)]'
                  : 'text-white/75 hover:text-white hover:bg-white/10'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 shrink-0" />
            </button>

            <button
              type="button"
              data-testid="preview-device-desktop"
              onClick={() => setDevice('desktop')}
              aria-pressed={device === 'desktop'}
              data-selected={device === 'desktop'}
              aria-label="Компьютер"
              title="Компьютер"
              className={`w-7 h-7 rounded-full inline-flex items-center justify-center transition-all cursor-pointer ${
                device === 'desktop'
                  ? 'bg-gradient-to-r from-violet-600/85 to-purple-500/85 text-white shadow-[0_2px_10px_rgba(139,92,246,0.45)]'
                  : 'text-white/75 hover:text-white hover:bg-white/10'
              }`}
            >
              <Monitor className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>

          <button
            type="button"
            data-testid="preview-restart-btn"
            onClick={handleRestartScenario}
            title="Запустить сценарий подарка с начала"
            className="inline-flex items-center justify-center gap-1.5 min-h-[34px] px-2.5 sm:px-3 py-1.5 rounded-full backdrop-blur-md bg-[#0b0816]/45 hover:bg-[#0b0816]/68 border border-white/15 hover:border-white/30 text-xs font-medium text-white/95 shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-all cursor-pointer shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">С начала</span>
          </button>

          <button
            type="button"
            data-testid="preview-fullscreen-btn"
            data-fullscreen-toggle="true"
            onClick={() => void toggleFullscreen()}
            aria-pressed={isFullscreen}
            aria-label={isFullscreen ? 'Выйти из полного экрана' : 'На весь экран'}
            title={isFullscreen ? 'Выйти из полного экрана' : 'На весь экран'}
            className="inline-flex items-center justify-center w-[34px] h-[34px] rounded-full backdrop-blur-md bg-[#0b0816]/45 hover:bg-[#0b0816]/68 border border-white/15 hover:border-white/30 text-white/95 shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-all cursor-pointer shrink-0"
          >
            {isFullscreen ? (
              <Minimize className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Maximize className="w-3.5 h-3.5 shrink-0" />
            )}
          </button>
        </div>
      </div>

      {notice && (
        <div
          role="status"
          aria-live="polite"
          data-testid="preview-fullscreen-notice"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-[92vw] sm:max-w-md gl-hud !border-amber-300/40 px-3.5 py-2 flex items-center gap-2.5 text-xs text-amber-100 shadow-xl"
        >
          <span>{notice}</span>
          <button
            type="button"
            onClick={dismissNotice}
            aria-label="Закрыть уведомление"
            className="rounded-full p-1 text-white/70 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Fullscreen Pure Recipient Walkthrough Stage */}
      <main className="w-full h-full min-w-0 min-h-0 flex overflow-hidden">
        <LivePreviewStage
          project={project}
          device={device}
          editMode={false}
          sessionKey={sessionKey}
        />
      </main>
    </div>
  );
}
