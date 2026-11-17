import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type {
  EditableCardTarget,
  EditableTextField,
  IframeToParentMessage,
  ParentToIframeMessage,
  PreviewJumpTarget,
} from '../preview/previewProtocol';
import type {
  ConstellationProject,
  ConstellationStar,
  RecipientPhase,
} from '../types/project';

export type PreviewDeviceId = 'phone' | 'desktop';

export interface DevicePreset {
  id: PreviewDeviceId;
  label: string;
  width: number;
  height: number;
}

export const DEVICE_PRESETS: Record<PreviewDeviceId, DevicePreset> = {
  phone: {
    id: 'phone',
    label: 'Телефон',
    width: 390,
    height: 844,
  },
  desktop: {
    id: 'desktop',
    label: 'Компьютер',
    width: 1280,
    height: 720,
  },
};

export type PreviewProjectMap = Map<string, ConstellationProject>;

declare global {
  interface Window {
    __GIFTLAB_PREVIEW_PROJECTS__?: PreviewProjectMap;
  }
}

export function getPreviewProjectRegistry(): PreviewProjectMap {
  if (!window.__GIFTLAB_PREVIEW_PROJECTS__) {
    window.__GIFTLAB_PREVIEW_PROJECTS__ = new Map();
  }
  return window.__GIFTLAB_PREVIEW_PROJECTS__;
}

export function cloneProjectReadonly(project: ConstellationProject): ConstellationProject {
  if (typeof structuredClone === 'function') {
    return structuredClone(project);
  }
  return JSON.parse(JSON.stringify(project)) as ConstellationProject;
}

export function mergeStarDevicePatch(
  star: ConstellationStar,
  patch: Partial<ConstellationStar>,
): ConstellationStar {
  if (!patch.deviceLayouts) {
    return { ...star, ...patch };
  }
  return {
    ...star,
    ...patch,
    deviceLayouts: {
      phone: patch.deviceLayouts.phone
        ? { ...star.deviceLayouts?.phone, ...patch.deviceLayouts.phone }
        : star.deviceLayouts?.phone,
      desktop: patch.deviceLayouts.desktop
        ? { ...star.deviceLayouts?.desktop, ...patch.deviceLayouts.desktop }
        : star.deviceLayouts?.desktop,
    },
  };
}

export function mergeProjectDevicePatch(
  prev: ConstellationProject,
  patch: Partial<ConstellationProject>,
): ConstellationProject {
  if (!patch.deviceLayouts) {
    return { ...prev, ...patch };
  }
  return {
    ...prev,
    ...patch,
    deviceLayouts: {
      phone: patch.deviceLayouts.phone
        ? { ...prev.deviceLayouts?.phone, ...patch.deviceLayouts.phone }
        : prev.deviceLayouts?.phone,
      desktop: patch.deviceLayouts.desktop
        ? { ...prev.deviceLayouts?.desktop, ...patch.deviceLayouts.desktop }
        : prev.deviceLayouts?.desktop,
    },
  };
}

interface LivePreviewStageProps {
  project: ConstellationProject;
  device: PreviewDeviceId;
  editMode: boolean;
  selectedTarget?: EditableCardTarget | null;
  jumpTo?: PreviewJumpTarget | null;
  sessionKey?: number;
  frameTestId?: string;
  onPhaseStateChange?: (phase: RecipientPhase, activeIndex: number) => void;
  onSelectTarget?: (target: EditableCardTarget | null, field?: EditableTextField) => void;
  onPatchStar?: (starId: string, patch: Partial<ConstellationStar>) => void;
  onPatchProject?: (patch: Partial<ConstellationProject>) => void;
  onScaleChange?: (scale: number) => void;
}

export function LivePreviewStage({
  project,
  device,
  editMode,
  selectedTarget = null,
  jumpTo = null,
  sessionKey = 0,
  frameTestId = 'preview-device-frame',
  onPhaseStateChange,
  onSelectTarget,
  onPatchStar,
  onPatchProject,
  onScaleChange,
}: LivePreviewStageProps) {
  const reactId = useId();
  const previewKey = useMemo(
    () => `preview_${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}_${Date.now().toString(36)}`,
    [reactId],
  );

  const [iframeLoaded, setIframeLoaded] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [stageSize, setStageSize] = useState(() => ({
    width: typeof window !== 'undefined' ? Math.max(320, window.innerWidth - 540) : 740,
    height: typeof window !== 'undefined' ? Math.max(280, window.innerHeight - 120) : 600,
  }));

  useEffect(() => {
    setIframeLoaded(false);
  }, [sessionKey]);

  const snapshot = useMemo(() => cloneProjectReadonly(project), [project]);
  getPreviewProjectRegistry().set(previewKey, snapshot);

  useEffect(() => {
    const registry = getPreviewProjectRegistry();
    registry.set(previewKey, snapshot);
    return () => {
      registry.delete(previewKey);
    };
  }, [previewKey, snapshot]);

  const sendSyncToIframe = useCallback(
    (nextJump?: PreviewJumpTarget | null) => {
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      const msg: ParentToIframeMessage = {
        source: 'giftlab-preview-host',
        type: 'sync',
        project: snapshot,
        deviceMode: device,
        editMode,
        selectedTarget: editMode ? selectedTarget : null,
        jumpTo: nextJump ?? jumpTo,
      };
      win.postMessage(msg, window.location.origin);
    },
    [snapshot, device, editMode, selectedTarget, jumpTo],
  );

  const sendSyncToIframeRef = useRef(sendSyncToIframe);
  sendSyncToIframeRef.current = sendSyncToIframe;

  useEffect(() => {
    if (iframeLoaded) {
      sendSyncToIframe();
    }
  }, [iframeLoaded, sendSyncToIframe]);

  const callbacksRef = useRef({
    onPhaseStateChange,
    onSelectTarget,
    onPatchStar,
    onPatchProject,
  });
  callbacksRef.current = {
    onPhaseStateChange,
    onSelectTarget,
    onPatchStar,
    onPatchProject,
  };

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data as IframeToParentMessage | undefined;
      if (!data || data.source !== 'giftlab-preview-iframe') return;

      if (data.type === 'ready') {
        setIframeLoaded(true);
        callbacksRef.current.onPhaseStateChange?.(data.phase, data.activeIndex);
        sendSyncToIframeRef.current();
      } else if (data.type === 'state') {
        callbacksRef.current.onPhaseStateChange?.(data.phase, data.activeIndex);
      } else if (data.type === 'selectTarget') {
        callbacksRef.current.onSelectTarget?.(data.target, data.field);
      } else if (data.type === 'patchStar') {
        callbacksRef.current.onPatchStar?.(data.starId, data.patch);
      } else if (data.type === 'patchProject') {
        callbacksRef.current.onPatchProject?.(data.patch);
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const updateSize = () => {
      setStageSize({
        width: el.clientWidth,
        height: el.clientHeight,
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    window.addEventListener('resize', updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  const iframeSrc = useMemo(() => {
    if (typeof window === 'undefined') return '?giftlabPreview=1';
    const url = new URL(window.location.href);
    url.searchParams.set('giftlabPreview', '1');
    url.searchParams.set('previewKey', previewKey);
    url.searchParams.set('projectId', project.id);
    url.hash = '';
    return url.toString();
  }, [previewKey, project.id]);

  const preset = DEVICE_PRESETS[device];
  const isCompactHost = stageSize.width < 640;
  const stageMargin = device === 'phone' ? 8 : isCompactHost ? 12 : 20;
  const bezelAllowance = device === 'phone' ? 12 : isCompactHost ? 10 : 14;

  const availW = Math.max(120, stageSize.width - stageMargin - bezelAllowance);
  const availH = Math.max(120, stageSize.height - stageMargin - bezelAllowance);
  const scale = Math.max(0.2, Math.min(1, availW / preset.width, availH / preset.height));
  const scaledW = Math.floor(preset.width * scale);
  const scaledH = Math.floor(preset.height * scale);

  useEffect(() => {
    onScaleChange?.(scale);
  }, [scale, onScaleChange]);

  return (
    <div
      ref={stageRef}
      className="relative flex-1 w-full min-w-0 min-h-0 flex items-center justify-center overflow-hidden select-none"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(124, 58, 237, 0.16), transparent 60%)',
        }}
        aria-hidden="true"
      />

      <div
        data-testid={frameTestId}
        data-device={device}
        data-mode={editMode ? 'edit' : 'view'}
        data-logical-width={preset.width}
        data-logical-height={preset.height}
        className={`relative z-10 bg-[#0c1229] border border-white/15 shadow-[0_24px_80px_rgba(0,0,0,0.75)] transition-[border-radius] duration-200 ${
          isCompactHost || device === 'phone' ? 'p-1.5' : 'p-2'
        } ${device === 'phone' ? 'rounded-[24px]' : 'rounded-2xl'}`}
      >
        <div
          className={`relative overflow-hidden bg-gl-bg ${
            device === 'phone' ? 'rounded-[18px]' : 'rounded-xl'
          }`}
          style={{
            width: `${scaledW}px`,
            height: `${scaledH}px`,
          }}
        >
          {!iframeLoaded && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gl-bg text-xs text-gl-text-muted">
              Загружаем открытку...
            </div>
          )}

          <iframe
            key={sessionKey}
            ref={iframeRef}
            src={iframeSrc}
            title={`Предпросмотр: ${preset.label} ${preset.width}×${preset.height}`}
            allow="autoplay"
            onLoad={() => {
              setIframeLoaded(true);
              sendSyncToIframe();
            }}
            style={{
              width: `${preset.width}px`,
              height: `${preset.height}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              border: 0,
              display: 'block',
              backgroundColor: '#06040a',
            }}
          />
        </div>
      </div>
    </div>
  );
}
