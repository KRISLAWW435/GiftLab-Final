import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Music,
  Pause,
  Play,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Type,
  Upload,
} from 'lucide-react';
import { CompositionPresetPreview } from '../assets/shapePreviews';
import {
  COMPOSITION_PRESETS,
  CONSTELLATION_ANIMATIONS,
  COSMIC_PALETTES,
  GLOW_COLORS,
  MUSIC_TRACKS,
  OCCASION_PRESETS,
  applyCompositionPreset,
  resolveConstellationAnimation,
  resolveMusicTrackName,
} from '../scene/paletteConfig';
import { saveAudioBlob } from '../services/database';
import {
  formatAudioTime,
  resolveProjectMusicForPreview,
  validateCustomAudioFile,
} from '../services/musicEngine';
import type {
  CompositionPresetId,
  ConstellationProject,
  CosmicPaletteId,
  GlowColorId,
  MusicTrackId,
  OccasionId,
} from '../types/project';
import { CardLibraryPanel } from './CardLibraryPanel';
import { TextStyleEditor } from './TextStyleEditor';

interface ConstellationSettingsProps {
  project: ConstellationProject;
  section?: 'constellation' | 'card' | 'atmosphere' | 'cosmos' | 'space' | 'all';
  selectedConnectionId?: string | null;
  reducedMotion?: boolean;
  onChange: (patch: Partial<ConstellationProject>) => void;
  onSelectConnection?: (connectionId: string | null) => void;
  onDeleteConnection?: (connectionId: string) => void;
  onToggleReducedMotion?: () => void;
}

export function ConstellationSettings({
  project,
  section = 'all',
  selectedConnectionId = null,
  reducedMotion = false,
  onChange,
  onSelectConnection,
  onDeleteConnection,
  onToggleReducedMotion,
}: ConstellationSettingsProps) {
  const [cardAdvancedOpen, setCardAdvancedOpen] = useState(false);
  const [atmosphereAdvancedOpen, setAtmosphereAdvancedOpen] = useState(false);
  const [finalStyleOpen, setFinalStyleOpen] = useState(false);

  // Music audition player state
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const playOnLoadRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);

  // Load audio element whenever active track or custom music ID changes
  useEffect(() => {
    let cancelled = false;

    const cleanupAudio = () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };

    cleanupAudio();
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setAudioError(null);

    if (project.musicTrackId === 'none') {
      playOnLoadRef.current = false;
      setAudioLoading(false);
      return cleanupAudio;
    }

    setAudioLoading(true);
    void resolveProjectMusicForPreview(project).then((resolved) => {
      if (cancelled) {
        if (resolved?.revokeOnDispose) {
          URL.revokeObjectURL(resolved.url);
        }
        return;
      }

      if (!resolved) {
        setAudioLoading(false);
        playOnLoadRef.current = false;
        return;
      }

      if (resolved.revokeOnDispose) {
        objectUrlRef.current = resolved.url;
      }

      const audio = new Audio(resolved.url);
      audio.preload = 'metadata';
      audio.volume = 0.6;
      audioRef.current = audio;

      const onMeta = () => {
        if (cancelled) return;
        setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      };
      const onTime = () => {
        if (cancelled) return;
        setCurrentTime(Number.isFinite(audio.currentTime) ? audio.currentTime : 0);
      };
      const onEnded = () => {
        if (cancelled) return;
        setIsPlaying(false);
        setCurrentTime(0);
      };
      const onPlay = () => {
        if (!cancelled) setIsPlaying(true);
      };
      const onPause = () => {
        if (!cancelled) setIsPlaying(false);
      };
      const onError = () => {
        if (!cancelled) {
          setAudioError('Не удалось воспроизвести аудиофайл');
          setIsPlaying(false);
        }
      };

      audio.addEventListener('loadedmetadata', onMeta);
      audio.addEventListener('durationchange', onMeta);
      audio.addEventListener('timeupdate', onTime);
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('play', onPlay);
      audio.addEventListener('pause', onPause);
      audio.addEventListener('error', onError);

      setAudioLoading(false);

      if (playOnLoadRef.current) {
        playOnLoadRef.current = false;
        audio.play().catch(() => {
          if (!cancelled) setIsPlaying(false);
        });
      }
    });

    return () => {
      cancelled = true;
      cleanupAudio();
    };
  }, [project.musicTrackId, project.customMusicId]);

  const handleTogglePlay = () => {
    const audio = audioRef.current;
    if (!audio || project.musicTrackId === 'none') return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {
        setAudioError('Нажми ещё раз, чтобы воспроизвести');
        setIsPlaying(false);
      });
    }
  };

  const handleSelectAndPlayTrack = (trackId: MusicTrackId) => {
    if (trackId === 'none') {
      playOnLoadRef.current = false;
      onChange({ musicTrackId: 'none' });
      return;
    }

    if (project.musicTrackId === trackId) {
      handleTogglePlay();
      return;
    }

    playOnLoadRef.current = true;
    onChange({ musicTrackId: trackId });
  };

  const handleSeek = (nextSec: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(nextSec)) return;
    audio.currentTime = nextSec;
    setCurrentTime(nextSec);
  };

  const handleUploadAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (audioInputRef.current) audioInputRef.current.value = '';
    if (!file) return;

    setAudioError(null);
    const validationError = validateCustomAudioFile(file);
    if (validationError) {
      setAudioError(validationError);
      return;
    }

    setUploadingAudio(true);
    try {
      const audioId = `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      await saveAudioBlob(audioId, project.id, file, file.name);
      playOnLoadRef.current = true;
      onChange({
        musicTrackId: 'custom',
        customMusicId: audioId,
        customMusicName: file.name,
      });
    } catch (err) {
      setAudioError(
        err instanceof Error ? err.message : 'Не удалось сохранить аудиофайл.',
      );
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleRemoveCustomMusic = () => {
    playOnLoadRef.current = false;
    onChange({
      musicTrackId: project.musicTrackId === 'custom' ? 'magical_cover' : project.musicTrackId,
      customMusicId: undefined,
      customMusicName: undefined,
    });
  };

  const handleApplyComposition = (presetId: CompositionPresetId) => {
    const composed = applyCompositionPreset(project.stars, presetId);
    onChange({
      composition: presetId,
      stars: composed.stars,
      connections: composed.connections,
    });
  };

  const starTitleById = new Map(
    project.stars.map((s, idx) => [s.id, s.title.trim() || `Звезда ${idx + 1}`]),
  );

  const showConstellation =
    section === 'all' || section === 'constellation' || section === 'cosmos';
  const showCard = section === 'all' || section === 'space' || section === 'card';
  const showAtmosphere =
    section === 'all' ||
    section === 'space' ||
    section === 'atmosphere' ||
    section === 'cosmos';

  const activeAnim = resolveConstellationAnimation(project);
  const activeTrackName = resolveMusicTrackName(project);
  const hasCustomTrack = Boolean(project.customMusicId);

  return (
    <div className="space-y-4">
      {showConstellation && (
        <>
          <div>
            <h3 className="font-display text-sm font-semibold text-gl-text">
              Сборка созвездия
            </h3>
            <p className="text-[11px] text-gl-text-muted mt-0.5">
              Расставь звёзды, соедини линиями и выбери характер движения
            </p>
          </div>

          {/* Constellation Composition Presets */}
          <div className="space-y-2">
            <span className="gl-label block">Готовая форма</span>
            <div className="grid grid-cols-3 gap-2">
              {COMPOSITION_PRESETS.map((preset) => {
                const active = (project.composition ?? 'free') === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    data-selected={active}
                    title={preset.description}
                    onClick={() => handleApplyComposition(preset.id)}
                    className="gl-choice px-2 py-2.5 flex flex-col items-center gap-1.5 text-center"
                  >
                    <CompositionPresetPreview
                      preset={preset.id}
                      color={COSMIC_PALETTES[project.paletteId].lineTint}
                      className="w-10 h-8"
                    />
                    <span className="text-[11px] font-semibold leading-tight">
                      {preset.name === 'Свободная композиция' ? 'Свободная' : preset.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Star Connections & Connection List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="gl-label tabular-nums">
                Линии между звёздами ({project.connections.length})
              </span>
            </div>

            {project.connections.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/12 bg-white/[0.02] px-3 py-2.5 text-xs text-gl-text-muted leading-relaxed">
                Линий пока нет. Выбери готовую форму выше или включи «Связи» на панели внизу сцены и нажми на две звезды.
              </p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-0.5">
                {project.connections.map((conn) => {
                  const isSelected = conn.id === selectedConnectionId;
                  const fromName = starTitleById.get(conn.from) ?? 'Звезда';
                  const toName = starTitleById.get(conn.to) ?? 'Звезда';
                  return (
                    <div
                      key={conn.id}
                      className={`flex items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 text-xs transition-colors ${
                        isSelected
                          ? 'border-amber-300/70 bg-amber-500/15 text-amber-100'
                          : 'border-white/10 bg-white/[0.03] text-gl-text-secondary'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectConnection?.(isSelected ? null : conn.id)}
                        className="flex-1 min-w-0 text-left truncate cursor-pointer"
                      >
                        {fromName} ↔ {toName}
                      </button>
                      {onDeleteConnection && (
                        <button
                          type="button"
                          onClick={() => onDeleteConnection(conn.id)}
                          title="Удалить связь"
                          aria-label={`Удалить связь ${fromName} — ${toName}`}
                          className="gl-btn-icon !min-w-[28px] !min-h-[28px] !w-7 !h-7 !p-0 border-transparent bg-transparent text-gl-text-muted hover:text-rose-300 hover:bg-rose-500/15 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Constellation Animation Presets */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-gl-accent-light shrink-0" />
              <span className="gl-label block">Анимация созвездия</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {CONSTELLATION_ANIMATIONS.map((anim) => {
                const active = activeAnim === anim.id;
                return (
                  <button
                    key={anim.id}
                    type="button"
                    data-testid={`constellation-anim-${anim.id}`}
                    data-selected={active}
                    onClick={() => onChange({ constellationAnimation: anim.id })}
                    className="gl-choice p-2.5 text-left space-y-0.5"
                  >
                    <div className="text-xs font-semibold text-gl-text leading-snug">
                      {anim.name}
                    </div>
                    <p className="text-[10px] text-gl-text-muted leading-snug">
                      {anim.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {showCard && (
        <>
          <CardLibraryPanel
            project={project}
            onChange={onChange}
            compact
            collapsibleColors
          />

          {/* Final Greeting Message */}
          <label className="block space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="gl-label">Текст финального письма</span>
              <span className="text-gl-text-muted tabular-nums">
                {project.finalMessage.length}/800
              </span>
            </div>
            <textarea
              rows={4}
              maxLength={800}
              value={project.finalMessage}
              onChange={(e) => onChange({ finalMessage: e.target.value })}
              placeholder="Главное поздравление появится на открытке, когда откроются все звёзды..."
              className="gl-textarea resize-y leading-relaxed"
            />
          </label>

          {/* Recipient & Sender */}
          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1">
              <span className="text-[11px] text-gl-text-muted block">Кому</span>
              <input
                type="text"
                maxLength={40}
                value={project.recipientName}
                onChange={(e) => onChange({ recipientName: e.target.value })}
                placeholder="Имя получателя"
                className="gl-input"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-[11px] text-gl-text-muted block">От кого</span>
              <input
                type="text"
                maxLength={40}
                value={project.senderName ?? ''}
                onChange={(e) => onChange({ senderName: e.target.value })}
                placeholder="Твоё имя"
                className="gl-input"
              />
            </label>
          </div>

          {/* Collapsible Advanced Card Options */}
          <div className="rounded-xl border border-white/10 bg-white/[0.025] overflow-hidden">
            <button
              type="button"
              onClick={() => setCardAdvancedOpen((o) => !o)}
              aria-expanded={cardAdvancedOpen}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-xs font-semibold text-gl-text-secondary hover:text-gl-text hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              <span className="inline-flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-gl-accent-light shrink-0" />
                Дополнительно
              </span>
              {cardAdvancedOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-gl-text-muted shrink-0" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-gl-text-muted shrink-0" />
              )}
            </button>

            {cardAdvancedOpen && (
              <div className="border-t border-white/10 p-3 space-y-3">
                <label className="block space-y-1">
                  <span className="text-[11px] text-gl-text-muted block">
                    Название подарка
                  </span>
                  <input
                    type="text"
                    maxLength={50}
                    value={project.title}
                    onChange={(e) => onChange({ title: e.target.value })}
                    className="gl-input"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-[11px] text-gl-text-muted block">Повод</span>
                  <select
                    value={project.occasion}
                    onChange={(e) => {
                      const occId = e.target.value as OccasionId;
                      const found = OCCASION_PRESETS.find((p) => p.id === occId);
                      onChange({
                        occasion: occId,
                        occasionLabel: found?.label ?? 'Свой повод',
                      });
                    }}
                    className="gl-select"
                  >
                    {OCCASION_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setFinalStyleOpen((o) => !o)}
                    aria-expanded={finalStyleOpen}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium text-gl-text-secondary hover:text-gl-text hover:bg-white/[0.04] transition-colors cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-gl-accent-light shrink-0" />
                      Шрифт и вид финального текста
                    </span>
                    {finalStyleOpen ? (
                      <ChevronUp className="w-3.5 h-3.5 text-gl-text-muted shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-gl-text-muted shrink-0" />
                    )}
                  </button>

                  {finalStyleOpen && (
                    <div className="border-t border-white/10 p-3 pt-1">
                      <TextStyleEditor
                        value={project.finalTextStyle}
                        paletteId={project.paletteId}
                        glowColorId={project.globalGlowColor}
                        cardTheme={project.cardTheme}
                        cardColors={project.cardColors}
                        previewTitle={project.title}
                        previewMessage={project.finalMessage}
                        showLayoutControls={false}
                        onChange={(finalTextStyle) => onChange({ finalTextStyle })}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {showAtmosphere && (
        <>
          <div className={showConstellation ? 'pt-2 border-t border-white/10' : undefined}>
            <h3 className="font-display text-sm font-semibold text-gl-text">
              Атмосфера и музыка
            </h3>
            <p className="text-[11px] text-gl-text-muted mt-0.5">
              Выбери фон неба, цвет сияния звёзд и мелодию для открытки
            </p>
          </div>

          {/* 4 Cosmic Gradient Backgrounds */}
          <div className="space-y-2">
            <span className="gl-label block">Космический фон</span>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(COSMIC_PALETTES) as CosmicPaletteId[]).map((pid) => {
                const pal = COSMIC_PALETTES[pid];
                const active = project.paletteId === pid;
                return (
                  <button
                    key={pid}
                    type="button"
                    data-selected={active}
                    onClick={() => onChange({ paletteId: pid })}
                    className="gl-choice p-2 text-left"
                  >
                    <div
                      className="h-8 w-full rounded-lg mb-1.5 border border-white/15"
                      style={{ background: pal.cssGradient }}
                    />
                    <div className="text-xs font-semibold text-gl-text leading-snug">
                      {pal.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Global Glow Color Palette */}
          <div className="space-y-2">
            <span className="gl-label block">Цвет сияния звёзд</span>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(GLOW_COLORS) as GlowColorId[]).map((gid) => {
                const g = GLOW_COLORS[gid];
                const active = project.globalGlowColor === gid;
                return (
                  <button
                    key={gid}
                    type="button"
                    data-selected={active}
                    onClick={() => onChange({ globalGlowColor: gid })}
                    className="gl-choice inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium"
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0 border border-white/25"
                      style={{ backgroundColor: g.hex }}
                    />
                    {g.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Music Selector + Inline Player + Custom Upload */}
          <div className="space-y-2.5 pt-1 border-t border-white/10">
            <span className="gl-label block">Музыка</span>

            {/* Inline Audio Player when a track is selected */}
            {project.musicTrackId !== 'none' && (
              <div
                data-testid="music-inline-player"
                className="rounded-xl border border-gl-accent/35 bg-white/[0.04] p-2.5 space-y-2"
              >
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    data-testid="music-player-toggle"
                    disabled={audioLoading}
                    onClick={handleTogglePlay}
                    title={isPlaying ? 'Пауза' : 'Прослушать'}
                    aria-label={isPlaying ? 'Пауза' : 'Прослушать'}
                    className="gl-btn-primary !min-w-[34px] !min-h-[34px] !w-[34px] !h-[34px] !p-0 !rounded-lg shrink-0"
                  >
                    {isPlaying ? (
                      <Pause className="w-3.5 h-3.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5 ml-0.5" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-semibold text-gl-text truncate">
                        {activeTrackName}
                      </span>
                      <span className="text-gl-text-muted tabular-nums shrink-0">
                        {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
                      </span>
                    </div>

                    <input
                      type="range"
                      min={0}
                      max={duration > 0 ? duration : 1}
                      step={0.1}
                      value={Math.min(currentTime, duration > 0 ? duration : 1)}
                      disabled={audioLoading || duration <= 0}
                      aria-label="Перемотка мелодии"
                      onChange={(e) => handleSeek(Number(e.target.value))}
                      className="w-full h-1.5 accent-gl-accent cursor-pointer disabled:opacity-45"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Built-in + Custom Tracks List */}
            <div className="space-y-1.5">
              {MUSIC_TRACKS.map((track) => {
                const active = project.musicTrackId === track.id;
                const playingThis = active && isPlaying;
                return (
                  <div
                    key={track.id}
                    data-selected={active}
                    data-testid={`music-track-${track.id}`}
                    className="gl-choice flex items-center justify-between gap-2 px-3 py-2"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        playOnLoadRef.current = false;
                        onChange({ musicTrackId: track.id });
                      }}
                      className="flex-1 min-w-0 text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold text-gl-text">
                        <Music className="w-3.5 h-3.5 text-gl-accent-light shrink-0" />
                        <span className="truncate">{track.name}</span>
                      </div>
                      <p className="text-[11px] text-gl-text-muted truncate mt-0.5">
                        {track.mood}
                      </p>
                    </button>

                    {track.id !== 'none' && (
                      <button
                        type="button"
                        onClick={() => handleSelectAndPlayTrack(track.id)}
                        title={playingThis ? 'Пауза' : 'Прослушать'}
                        className="gl-btn-icon !min-w-[32px] !min-h-[32px] !w-8 !h-8 !p-0 shrink-0"
                      >
                        {playingThis ? (
                          <Pause className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Custom uploaded audio item (if uploaded) */}
              {hasCustomTrack && (
                <div
                  data-selected={project.musicTrackId === 'custom'}
                  data-testid="music-track-custom"
                  className="gl-choice flex items-center justify-between gap-2 px-3 py-2"
                >
                  <button
                    type="button"
                    onClick={() => {
                      playOnLoadRef.current = false;
                      onChange({ musicTrackId: 'custom' });
                    }}
                    className="flex-1 min-w-0 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold text-gl-text">
                      <Music className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      <span className="truncate">
                        {project.customMusicName || 'Своя музыка'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gl-text-muted truncate mt-0.5">
                      Загруженный аудиофайл
                    </p>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSelectAndPlayTrack('custom')}
                      title={project.musicTrackId === 'custom' && isPlaying ? 'Пауза' : 'Прослушать'}
                      className="gl-btn-icon !min-w-[32px] !min-h-[32px] !w-8 !h-8 !p-0"
                    >
                      {project.musicTrackId === 'custom' && isPlaying ? (
                        <Pause className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      data-testid="music-remove-custom"
                      onClick={handleRemoveCustomMusic}
                      title="Удалить свою музыку"
                      aria-label="Удалить свою музыку"
                      className="gl-btn-icon !min-w-[32px] !min-h-[32px] !w-8 !h-8 !p-0 text-gl-text-muted hover:text-rose-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Custom Upload Button */}
            <input
              ref={audioInputRef}
              type="file"
              accept=".mp3,.wav,audio/mpeg,audio/wav"
              onChange={handleUploadAudio}
              className="hidden"
            />
            <button
              type="button"
              data-testid="music-upload-btn"
              disabled={uploadingAudio}
              onClick={() => audioInputRef.current?.click()}
              className="gl-btn-secondary w-full !min-h-[38px] text-xs font-medium"
            >
              <Upload className="w-3.5 h-3.5 shrink-0 text-gl-accent-light" />
              <span>
                {uploadingAudio
                  ? 'Сохранение аудио...'
                  : hasCustomTrack
                    ? 'Заменить свою музыку (MP3, WAV до 10 МБ)'
                    : 'Загрузить свою музыку (MP3, WAV до 10 МБ)'}
              </span>
            </button>

            {audioError && (
              <p className="text-xs text-rose-300 leading-snug" role="alert">
                {audioError}
              </p>
            )}
          </div>

          {/* Collapsible Advanced Scene Motion */}
          {onToggleReducedMotion && (
            <div className="rounded-xl border border-white/10 bg-white/[0.025] overflow-hidden">
              <button
                type="button"
                onClick={() => setAtmosphereAdvancedOpen((o) => !o)}
                aria-expanded={atmosphereAdvancedOpen}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-xs font-semibold text-gl-text-secondary hover:text-gl-text hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                <span className="inline-flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-gl-accent-light shrink-0" />
                  Дополнительно
                </span>
                {atmosphereAdvancedOpen ? (
                  <ChevronUp className="w-3.5 h-3.5 text-gl-text-muted shrink-0" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-gl-text-muted shrink-0" />
                )}
              </button>

              {atmosphereAdvancedOpen && (
                <div className="border-t border-white/10 p-3 space-y-2">
                  <button
                    type="button"
                    data-selected={!reducedMotion}
                    onClick={onToggleReducedMotion}
                    className="gl-choice w-full px-3 py-2 text-xs font-medium text-center"
                  >
                    {reducedMotion
                      ? 'Плавное движение сцены: выключено'
                      : 'Плавное движение сцены: включено'}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
