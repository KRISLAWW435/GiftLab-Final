import { useCallback, useEffect, useRef, useState } from 'react';
import { CosmicBackdrop } from './components/CosmicBackdrop';
import { EditorLayout } from './components/EditorLayout';
import {
  PreviewWorkspace,
  type PreviewProjectMap,
} from './components/PreviewWorkspace';
import { ProjectStart } from './components/ProjectStart';
import { RecipientView } from './components/RecipientView';
import {
  cleanupUnusedProjectAudio,
  cleanupUnusedProjectImages,
  deleteProject,
  duplicateProject,
  getProject,
  listProjects,
  saveProject,
} from './services/database';
import type {
  EditableCardTarget,
  EditableTextField,
  IframeToParentMessage,
  ParentToIframeMessage,
  PreviewJumpTarget,
} from './preview/previewProtocol';
import type {
  ConstellationProject,
  ConstellationStar,
  DeviceLayoutKey,
  RecipientPhase,
} from './types/project';
import { resolveViewportDeviceMode } from './scene/paletteConfig';

function mergeStarPatchLocal(
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

function mergeProjectPatchLocal(
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

type AppScreen = 'start' | 'editor' | 'preview';

function getPreviewParams(): {
  isPreviewIframe: boolean;
  previewKey: string;
  projectId: string;
} {
  if (typeof window === 'undefined') {
    return { isPreviewIframe: false, previewKey: '', projectId: '' };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    isPreviewIframe: params.get('giftlabPreview') === '1',
    previewKey: params.get('previewKey') ?? '',
    projectId: params.get('projectId') ?? '',
  };
}

function readParentPreviewSnapshot(previewKey: string): ConstellationProject | null {
  if (!previewKey || typeof window === 'undefined') return null;
  try {
    const parentWin = window.parent as Window & {
      __GIFTLAB_PREVIEW_PROJECTS__?: PreviewProjectMap;
    };
    const found = parentWin?.__GIFTLAB_PREVIEW_PROJECTS__?.get(previewKey);
    return found ?? null;
  } catch {
    return null;
  }
}

function postToPreviewParent(msg: IframeToParentMessage) {
  if (typeof window === 'undefined' || window.parent === window) return;
  try {
    window.parent.postMessage(msg, window.location.origin);
  } catch {
    // ignore cross-origin safety errors
  }
}

function PreviewIframeHost({
  previewKey,
  projectId,
}: {
  previewKey: string;
  projectId: string;
}) {
  const [project, setProject] = useState<ConstellationProject | null>(() =>
    readParentPreviewSnapshot(previewKey),
  );
  const [deviceMode, setDeviceMode] = useState<DeviceLayoutKey>(() =>
    typeof window !== 'undefined'
      ? resolveViewportDeviceMode(window.innerWidth, window.innerHeight)
      : 'desktop',
  );
  const [editMode, setEditMode] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<EditableCardTarget | null>('text');
  const [jumpTo, setJumpTo] = useState<PreviewJumpTarget | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== window.parent) return;
      const data = event.data as ParentToIframeMessage | undefined;
      if (!data || data.source !== 'giftlab-preview-host' || data.type !== 'sync') {
        return;
      }
      const activeTestId =
        document.activeElement instanceof HTMLElement
          ? document.activeElement.getAttribute('data-testid')
          : null;
      const activeField = activeTestId?.startsWith('inline-edit-')
        ? activeTestId.slice('inline-edit-'.length)
        : null;

      setProject((prev) => {
        if (!prev || !activeField) return data.project;
        if (activeField === 'title') {
          return { ...data.project, title: prev.title };
        }
        if (activeField === 'recipientName') {
          return { ...data.project, recipientName: prev.recipientName };
        }
        if (activeField === 'senderName') {
          return { ...data.project, senderName: prev.senderName };
        }
        if (activeField === 'finalMessage') {
          return { ...data.project, finalMessage: prev.finalMessage };
        }
        if (activeField === 'occasionLabel') {
          return { ...data.project, occasionLabel: prev.occasionLabel };
        }
        if (activeField === 'starTitle' || activeField === 'starMessage') {
          const prevById = new Map(prev.stars.map((s) => [s.id, s]));
          return {
            ...data.project,
            stars: data.project.stars.map((s) => {
              const old = prevById.get(s.id);
              if (!old) return s;
              return activeField === 'starTitle'
                ? { ...s, title: old.title }
                : { ...s, message: old.message };
            }),
          };
        }
        if (activeField === 'envelopeKicker') {
          return {
            ...data.project,
            envelopeSettings: {
              ...data.project.envelopeSettings,
              kickerText: prev.envelopeSettings?.kickerText,
            },
          };
        }
        if (activeField === 'envelopeHeadline') {
          return {
            ...data.project,
            envelopeSettings: {
              ...data.project.envelopeSettings,
              headlineText: prev.envelopeSettings?.headlineText,
            },
          };
        }
        if (activeField === 'envelopeHint') {
          return {
            ...data.project,
            envelopeSettings: {
              ...data.project.envelopeSettings,
              hintText: prev.envelopeSettings?.hintText,
            },
          };
        }
        if (activeField === 'envelopeCta') {
          return {
            ...data.project,
            envelopeSettings: {
              ...data.project.envelopeSettings,
              ctaText: prev.envelopeSettings?.ctaText,
            },
          };
        }
        return data.project;
      });
      if (data.deviceMode === 'phone' || data.deviceMode === 'desktop') {
        setDeviceMode(data.deviceMode);
      }
      setEditMode(data.editMode);
      setSelectedTarget(data.selectedTarget);
      if (data.jumpTo) {
        setJumpTo(data.jumpTo);
      }
    };

    window.addEventListener('message', onMessage);
    postToPreviewParent({
      source: 'giftlab-preview-iframe',
      type: 'ready',
      phase: 'sealed',
      activeIndex: 0,
    });
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (project) return;
    if (!projectId) {
      setFailed(true);
      return;
    }
    let active = true;
    getProject(projectId)
      .then((loaded) => {
        if (!active) return;
        if (loaded) {
          setProject(loaded);
        } else {
          setFailed(true);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [project, projectId]);

  const handlePhaseStateChange = useCallback(
    (phase: RecipientPhase, activeIndex: number) => {
      postToPreviewParent({
        source: 'giftlab-preview-iframe',
        type: 'state',
        phase,
        activeIndex,
      });
    },
    [],
  );

  const handleSelectTarget = useCallback(
    (target: EditableCardTarget | null, field?: EditableTextField) => {
      setSelectedTarget(target);
      postToPreviewParent({
        source: 'giftlab-preview-iframe',
        type: 'selectTarget',
        target,
        field,
      });
    },
    [],
  );

  const handlePatchStar = useCallback(
    (starId: string, patch: Partial<ConstellationStar>) => {
      setProject((prev) =>
        prev
          ? {
              ...prev,
              stars: prev.stars.map((s) =>
                s.id === starId ? mergeStarPatchLocal(s, patch) : s,
              ),
            }
          : prev,
      );
      postToPreviewParent({
        source: 'giftlab-preview-iframe',
        type: 'patchStar',
        starId,
        patch,
      });
    },
    [],
  );

  const handlePatchProject = useCallback((patch: Partial<ConstellationProject>) => {
    setProject((prev) => (prev ? mergeProjectPatchLocal(prev, patch) : prev));
    postToPreviewParent({
      source: 'giftlab-preview-iframe',
      type: 'patchProject',
      patch,
    });
  }, []);

  if (failed) {
    return (
      <div className="w-screen gl-h-screen bg-gl-bg text-gl-text flex items-center justify-center p-6 text-center text-sm text-gl-text-secondary">
        Не удалось загрузить проект для предпросмотра.
      </div>
    );
  }

  if (!project) {
    return (
      <div className="w-screen gl-h-screen bg-gl-bg text-gl-text flex items-center justify-center p-6 text-center text-xs text-gl-text-muted">
        Загружаем предпросмотр...
      </div>
    );
  }

  return (
    <RecipientView
      project={project}
      deviceMode={deviceMode}
      editMode={editMode}
      selectedTarget={selectedTarget}
      jumpTo={jumpTo}
      onPhaseStateChange={handlePhaseStateChange}
      onSelectTarget={handleSelectTarget}
      onPatchStar={handlePatchStar}
      onPatchProject={handlePatchProject}
    />
  );
}

function StudioApp() {
  const [projects, setProjects] = useState<ConstellationProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<AppScreen>('start');
  const [activeProject, setActiveProject] = useState<ConstellationProject | null>(
    null,
  );
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved');
  const [dirtyTick, setDirtyTick] = useState(0);

  const saveTimerRef = useRef<number | null>(null);
  const editVersionRef = useRef(0);
  const previewReturnScreenRef = useRef<'start' | 'editor'>('start');

  const reloadProjects = useCallback(async () => {
    try {
      const items = await listProjects();
      setProjects(items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadProjects();
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [reloadProjects]);

  const flushSave = useCallback(
    async (proj: ConstellationProject) => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      const versionAtStart = editVersionRef.current;
      setDirtyTick(0);
      setSaveState('saving');
      const saved = await saveProject(proj);
      await cleanupUnusedProjectImages(saved);
      await cleanupUnusedProjectAudio(saved);
      setProjects((prev) => {
        const exists = prev.some((p) => p.id === saved.id);
        const next = exists
          ? prev.map((p) => (p.id === saved.id ? saved : p))
          : [saved, ...prev];
        return [...next].sort((a, b) => b.updatedAt - a.updatedAt);
      });
      if (editVersionRef.current === versionAtStart) {
        setSaveState('saved');
      }
    },
    [],
  );

  useEffect(() => {
    if (dirtyTick === 0 || !activeProject) return;
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      void flushSave(activeProject);
    }, 450);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [dirtyTick, activeProject, flushSave]);

  const handleCreateProject = async (project: ConstellationProject) => {
    const saved = await saveProject(project);
    setProjects((prev) => [saved, ...prev]);
    setDirtyTick(0);
    setActiveProject(saved);
    setSaveState('saved');
    setScreen('editor');
  };

  const handleOpenProject = (project: ConstellationProject) => {
    setDirtyTick(0);
    setActiveProject(project);
    setSaveState('saved');
    setScreen('editor');
  };

  const handlePreviewProject = (
    project: ConstellationProject,
    from: 'start' | 'editor',
  ) => {
    previewReturnScreenRef.current = from;
    setDirtyTick(0);
    setActiveProject(project);
    setScreen('preview');
  };

  const handleDuplicateProject = async (project: ConstellationProject) => {
    const cloned = await duplicateProject(project);
    setProjects((prev) => [cloned, ...prev]);
  };

  const handleDeleteProject = async (projectId: string) => {
    await deleteProject(projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    if (activeProject?.id === projectId) {
      setDirtyTick(0);
      setActiveProject(null);
      setScreen('start');
    }
  };

  const handleUpdateProject = useCallback(
    (updater: (prev: ConstellationProject) => ConstellationProject) => {
      editVersionRef.current += 1;
      setActiveProject((prev) => {
        if (!prev) return prev;
        return { ...updater(prev), updatedAt: Date.now() };
      });
      setSaveState('saving');
      setDirtyTick((t) => t + 1);
    },
    [],
  );

  const backdropPaletteId =
    screen === 'start' ? 'lavender' : (activeProject?.paletteId ?? 'lavender');

  return (
    <div className="relative min-h-screen w-full">
      <CosmicBackdrop paletteId={backdropPaletteId} />
      <div className="relative z-10">
        {screen === 'preview' && activeProject ? (
          <PreviewWorkspace
            project={activeProject}
            saveState={saveState}
            returnLabel={
              previewReturnScreenRef.current === 'editor' ? 'В редактор' : 'К проектам'
            }
            onExitPreview={async () => {
              if (saveTimerRef.current) {
                await flushSave(activeProject);
              }
              setScreen(previewReturnScreenRef.current);
            }}
          />
        ) : screen === 'editor' && activeProject ? (
          <EditorLayout
            project={activeProject}
            saveState={saveState}
            onUpdateProject={handleUpdateProject}
            onBackToProjects={async () => {
              await flushSave(activeProject);
              setScreen('start');
            }}
            onOpenPreview={async () => {
              await flushSave(activeProject);
              handlePreviewProject(activeProject, 'editor');
            }}
          />
        ) : (
          <ProjectStart
            projects={projects}
            loading={loading}
            onCreateProject={handleCreateProject}
            onOpenProject={handleOpenProject}
            onPreviewProject={(proj) => handlePreviewProject(proj, 'start')}
            onDuplicateProject={handleDuplicateProject}
            onDeleteProject={handleDeleteProject}
          />
        )}
      </div>
    </div>
  );
}

export default function App() {
  const { isPreviewIframe, previewKey, projectId } = getPreviewParams();
  if (isPreviewIframe) {
    return <PreviewIframeHost previewKey={previewKey} projectId={projectId} />;
  }
  return <StudioApp />;
}
