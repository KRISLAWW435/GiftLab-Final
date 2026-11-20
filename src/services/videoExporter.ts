import type { ConstellationProject } from '../types/project';
import { formatBytesRu } from './encoding';
import {
  encodeViaMediaRecorderMp4,
  encodeViaWebCodecsMp4,
  pickSupportedAudioConfig,
  pickSupportedMediaRecorderMp4Mime,
  pickSupportedVideoConfig,
  prepareAudioTrackBuffer,
} from './video/audioAndMuxer';
import {
  ensureFontsLoaded,
  preloadStarIllustrations,
  wrapCanvasTextLines,
} from './video/videoCanvasPrimitives';
import {
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
  type VideoExportOptions,
  type VideoExportProgress,
  type VideoExportResult,
  type VideoSegmentKind,
  type VideoTimeline,
  type VideoTimelineSegment,
  computeVideoTimeline,
  throwIfAborted,
} from './video/videoTimeline';
import { sanitizeFileName } from './zipExporter';

export {
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
  computeVideoTimeline,
  wrapCanvasTextLines,
  type VideoExportOptions,
  type VideoExportProgress,
  type VideoExportResult,
  type VideoSegmentKind,
  type VideoTimeline,
  type VideoTimelineSegment,
};

export async function exportProjectToMp4(
  project: ConstellationProject,
  options: VideoExportOptions = {},
): Promise<VideoExportResult> {
  const { onProgress, signal } = options;
  throwIfAborted(signal);

  const wantsMusic = project.musicTrackId !== 'none';
  const [videoConfig, audioConfig] = await Promise.all([
    pickSupportedVideoConfig(),
    wantsMusic ? pickSupportedAudioConfig() : Promise.resolve(null),
  ]);

  const canUseWebCodecs = Boolean(videoConfig && (!wantsMusic || audioConfig));
  const mediaRecorderMime = canUseWebCodecs
    ? null
    : pickSupportedMediaRecorderMp4Mime(wantsMusic);

  if (!canUseWebCodecs && !mediaRecorderMime) {
    throw new Error(
      'Этот браузер не поддерживает кодирование MP4 (H.264/AAC) для iPhone. Откройте редактор в современном Chrome, Edge или Safari.',
    );
  }

  onProgress?.({ percent: 3, stageLabel: 'Подготавливаем 3D-сцену, шрифты и фото...' });
  await ensureFontsLoaded();
  throwIfAborted(signal);

  const illustrations = await preloadStarIllustrations(project, signal);
  const timeline = computeVideoTimeline(project);

  let audioBuffer: AudioBuffer | null = null;
  if (wantsMusic) {
    onProgress?.({ percent: 6, stageLabel: 'Подготавливаем фоновую музыку...' });
    const sr = audioConfig?.sampleRate ?? 48000;
    const ch = audioConfig?.numberOfChannels ?? 2;
    audioBuffer = await prepareAudioTrackBuffer(
      project,
      timeline.totalDurationSec,
      sr,
      ch,
      signal,
    );
  }

  const blob =
    canUseWebCodecs && videoConfig
      ? await encodeViaWebCodecsMp4(
          project,
          timeline,
          illustrations,
          videoConfig,
          audioConfig,
          audioBuffer,
          options,
        )
      : await encodeViaMediaRecorderMp4(
          project,
          timeline,
          illustrations,
          mediaRecorderMime!,
          audioBuffer,
          options,
        );

  const baseName = sanitizeFileName(project.title || 'Моя_открытка');
  return {
    blob,
    filename: `${baseName}.mp4`,
    sizeBytes: blob.size,
    formattedSize: formatBytesRu(blob.size),
    durationSec: timeline.totalDurationSec,
  };
}
