import { useState } from 'react';
import {
  Copy,
  Eye,
  FolderOpen,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { CompositionPresetPreview } from '../assets/shapePreviews';
import {
  COMPOSITION_PRESETS,
  COSMIC_PALETTES,
  OCCASION_PRESETS,
  createNewProject,
} from '../scene/paletteConfig';
import {
  isStarComplete,
  type CompositionPresetId,
  type ConstellationProject,
  type OccasionId,
} from '../types/project';

interface ProjectStartProps {
  projects: ConstellationProject[];
  loading: boolean;
  onCreateProject: (project: ConstellationProject) => void;
  onOpenProject: (project: ConstellationProject) => void;
  onPreviewProject: (project: ConstellationProject) => void;
  onDuplicateProject: (project: ConstellationProject) => void;
  onDeleteProject: (projectId: string) => void;
}

export function ProjectStart({
  projects,
  loading,
  onCreateProject,
  onOpenProject,
  onPreviewProject,
  onDuplicateProject,
  onDeleteProject,
}: ProjectStartProps) {
  const [selectedOccasion, setSelectedOccasion] = useState<OccasionId>('birthday');
  const [selectedComposition, setSelectedComposition] =
    useState<CompositionPresetId>('free');
  const [titleInput, setTitleInput] = useState('');
  const [recipientInput, setRecipientInput] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const activePreset =
    OCCASION_PRESETS.find((p) => p.id === selectedOccasion) ?? OCCASION_PRESETS[2];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const project = createNewProject(
      selectedOccasion,
      titleInput.trim() || activePreset.defaultTitle,
      recipientInput.trim() || activePreset.defaultRecipient,
      selectedComposition,
    );
    onCreateProject(project);
  };

  const formatDate = (ts: number) =>
    new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(ts);

  return (
    <div className="gl-min-h-screen bg-transparent text-gl-text flex flex-col">
      {/* Top Bar */}
      <header className="relative z-10 gl-glass-header border-b gl-safe-top">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-4 sm:py-5 flex items-center justify-between gap-6">
          <span className="font-display text-xl sm:text-2xl font-bold tracking-tight text-gl-text whitespace-nowrap shrink-0">
            GiftLab
          </span>
          <span className="text-sm sm:text-base text-gl-text-muted truncate">
            Мастерская космических 3D-подарков
          </span>
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-5 sm:px-8 py-8 sm:py-12 space-y-10">
        {/* Hero + Create Project Split */}
        <section className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            <div className="lg:col-span-5 space-y-5 pt-1">
              <p className="text-base font-medium text-violet-300/90">
                Шаблон «Созвездие пожеланий»
              </p>
              <h1 className="gl-title-display font-display text-4xl sm:text-5xl lg:text-[3.15rem] font-extrabold leading-[1.2] tracking-[-0.025em] [text-wrap:balance] text-white">
                Создай собственную вселенную с пожеланиями
              </h1>
              <p className="text-gl-text-secondary text-base sm:text-lg leading-relaxed">
                Расставь звёзды в трёхмерном пространстве, выбери космическую палитру,
                добавь картинки и тёплые слова. Готовый подарок можно скачать одним
                архивом — он откроется в браузере даже без интернета.
              </p>
            </div>

            {/* Creator Quick-Start Form */}
            <form
              onSubmit={handleCreate}
              className="lg:col-span-7 gl-card p-6 sm:p-7 space-y-6"
            >
              <div className="space-y-1">
                <h2 className="gl-title-display font-display text-xl sm:text-2xl font-bold text-gl-text">
                  Новый подарок
                </h2>
                <p className="text-base text-gl-text-secondary leading-relaxed">
                  Выберите повод — мы подготовим вдохновляющие идеи для пяти звёзд,
                  которые легко изменить по-своему.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {OCCASION_PRESETS.map((preset) => {
                  const active = preset.id === selectedOccasion;
                  const pal = COSMIC_PALETTES[preset.defaultPalette];
                  const isLastSpan = preset.id === 'custom';
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      data-selected={active}
                      onClick={() => {
                        setSelectedOccasion(preset.id);
                      }}
                      className={`gl-choice h-full flex flex-col justify-between text-left p-3.5 ${
                        isLastSpan ? 'col-span-2 sm:col-span-2' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/30"
                          style={{ background: pal.nebulaPrimary }}
                        />
                        <span className="text-sm sm:text-[15px] font-semibold truncate">
                          {preset.label}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gl-text-muted line-clamp-1">
                        {preset.defaultTitle}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block space-y-2">
                  <span className="gl-label block">
                    Название созвездия
                  </span>
                  <input
                    type="text"
                    maxLength={50}
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    placeholder={`Например: ${activePreset.defaultTitle}`}
                    className="gl-input"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="gl-label block">
                    Для кого подарок
                  </span>
                  <input
                    type="text"
                    maxLength={40}
                    value={recipientInput}
                    onChange={(e) => setRecipientInput(e.target.value)}
                    placeholder={`Например: ${activePreset.defaultRecipient}`}
                    className="gl-input"
                  />
                </label>
              </div>

              <div className="space-y-2.5">
                <span className="gl-label block">
                  Начальная форма созвездия
                </span>
                <div className="grid grid-cols-3 gap-3">
                  {COMPOSITION_PRESETS.map((comp) => {
                    const active = comp.id === selectedComposition;
                    return (
                      <button
                        key={comp.id}
                        type="button"
                        data-selected={active}
                        onClick={() => setSelectedComposition(comp.id)}
                        className="gl-choice flex items-center gap-2.5 p-3 text-left"
                      >
                        <CompositionPresetPreview
                          preset={comp.id}
                          className="w-10 h-8 shrink-0 gl-icon-3d"
                        />
                        <span className="text-xs sm:text-sm font-semibold leading-tight">
                          {comp.name === 'Свободная композиция' ? 'Свободная' : comp.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end pt-1">
                <button
                  type="submit"
                  className="gl-btn-primary px-7"
                >
                  <Plus className="w-4 h-4" />
                  Создать созвездие
                </button>
              </div>
            </form>
          </div>

          {/* Calm frosted notice placed cleanly below creation form */}
          <div className="gl-hud px-5 py-4 text-sm sm:text-base text-slate-200/90 leading-relaxed">
            Проекты и загруженные картинки хранятся в памяти этого браузера на вашем
            устройстве. Чтобы не потерять подарок при очистке данных браузера,
            сохраняйте готовый результат в ZIP.
          </div>
        </section>

        {/* Saved Projects List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="gl-title-display font-display text-xl sm:text-2xl font-bold text-white">
              Мои сохранённые проекты
            </h2>
            <span className="text-sm text-gl-text-muted tabular-nums">
              {projects.length === 0 ? 'Пока нет проектов' : `Всего: ${projects.length}`}
            </span>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-gl-card/55 p-6 text-center text-base text-gl-text-secondary">
              Загружаем созвездия из памяти устройства...
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-gl-card/45 px-5 py-4 flex flex-col sm:flex-row items-center justify-center gap-3 text-center sm:text-left">
              <Sparkles className="w-5 h-5 text-violet-300 shrink-0" />
              <div className="space-y-0.5">
                <p className="text-base text-slate-100 font-medium">
                  Здесь появятся ваши созвездия
                </p>
                <p className="text-sm sm:text-base text-gl-text-secondary">
                  Создайте первый проект выше — все изменения будут сохраняться автоматически.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((proj) => {
                const pal = COSMIC_PALETTES[proj.paletteId];
                const completedCount = proj.stars.filter(isStarComplete).length;
                return (
                  <article
                    key={proj.id}
                    className="gl-card gl-card-interactive overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <div
                        className="h-24 p-4 flex flex-col justify-between relative"
                        style={{ background: pal.cssGradient }}
                      >
                        <div className="text-xs text-white/80 font-medium truncate">
                          {proj.occasionLabel} · {proj.recipientName || 'Получатель'}
                        </div>
                        <h3 className="font-display text-base font-bold text-white truncate drop-shadow">
                          {proj.title}
                        </h3>
                      </div>

                      <div className="p-4 flex items-center justify-between text-xs sm:text-sm text-gl-text-muted tabular-nums">
                        <span>
                          Звёзды: {completedCount}/{proj.stars.length} заполнено
                        </span>
                        <span>{formatDate(proj.updatedAt)}</span>
                      </div>
                    </div>

                    <div className="px-4 pb-4 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenProject(proj)}
                        className="gl-btn-primary flex-1 !min-h-[42px] px-3.5 text-sm"
                      >
                        <FolderOpen className="w-4 h-4" />
                        Редактировать
                      </button>
                      <button
                        type="button"
                        onClick={() => onPreviewProject(proj)}
                        title="Открыть как получатель"
                        className="gl-btn-icon"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDuplicateProject(proj)}
                        title="Создать копию"
                        className="gl-btn-icon"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      {confirmDeleteId === proj.id ? (
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteProject(proj.id);
                            setConfirmDeleteId(null);
                          }}
                          className="min-h-[42px] rounded-[14px] bg-rose-600 hover:bg-rose-500 px-3 py-2 text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
                        >
                          Удалить?
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(proj.id)}
                          title="Удалить проект"
                          className="gl-btn-icon hover:bg-rose-500/20 hover:border-rose-400/40 hover:text-rose-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
