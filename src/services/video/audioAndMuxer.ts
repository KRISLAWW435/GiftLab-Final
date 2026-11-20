import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import type { ConstellationProject } from '../../types/project';
import { resolveProjectMusicForExport } from '../musicEngine';
import { ThreeDVideoSceneDriver } from './threeDVideoDriver';
import {
  AUDIO_BITRATE,
  type DrawableImage,
  VIDEO_BITRATE,
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
  type VideoExportOptions,
  type VideoTimeline,
  clamp,
  delayMs,
  throwIfAborted,
} from './videoTimeline';

export async function prepareAudioTrackBuffer(
  project: ConstellationProject,
  targetDurationSec: number,
  targetSampleRate: number,
  targetChannels: number,
  signal?: AbortSignal,
): Promise<AudioBuffer | null> {
  if (project.musicTrackId === 'none') return null;

  const music = await resolveProjectMusicForExport(project);
  throwIfAborted(signal);

  if (!music) {
    if (project.musicTrackId === 'custom') {
      throw new Error(
        'Выбранная пользовательская музыка не найдена. Загрузите аудиофайл заново или выберите встроенную мелодию.',
      );
    }
    return null;
  }

  const rawBytes = await music.blob.arrayBuffer();
  throwIfAborted(signal);

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) {
    throw new Error('Браузер не поддерживает Web Audio API для обработки музыки.');
  }

  const decodeCtx = new AudioCtx();
  let decoded: AudioBuffer;
  try {
    decoded = await decodeCtx.decodeAudioData(rawBytes.slice(0));
  } catch {
    throw new Error(`Не удалось декодировать аудиофайл «${music.name}».`);
  } finally {
    await decodeCtx.close().catch(() => undefined);
  }

  throwIfAborted(signal);

  const totalFrames = Math.max(1, Math.ceil(targetDurationSec * targetSampleRate));
  const offline = new OfflineAudioContext(targetChannels, totalFrames, targetSampleRate);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.loop = true;

  const gain = offline.createGain();
  const fadeInEnd = Math.min(0.8, targetDurationSec * 0.15);
  const fadeOutStart = Math.max(fadeInEnd, targetDurationSec - 1.8);

  gain.gain.setValueAtTime(0.001, 0);
  gain.gain.linearRampToValueAtTime(0.82, fadeInEnd);
  gain.gain.setValueAtTime(0.82, fadeOutStart);
  gain.gain.linearRampToValueAtTime(0.0001, targetDurationSec);

  src.connect(gain);
  gain.connect(offline.destination);
  src.start(0);

  return await offline.startRendering();
}

export async function pickSupportedVideoConfig(): Promise<VideoEncoderConfig | null> {
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') {
    return null;
  }
  const codecs = [
    'avc1.42001f', // Baseline L3.1 (universal iOS Safari / Photos / Telegram)
    'avc1.42E01E', // Constrained Baseline L3.0
    'avc1.4d002a', // Main L4.2
    'avc1.640028', // High L4.0
  ];
  for (const codec of codecs) {
    try {
      const cfg: VideoEncoderConfig = {
        codec,
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
        bitrate: VIDEO_BITRATE,
        framerate: VIDEO_FPS,
        avc: { format: 'avc' },
      };
      const support = await VideoEncoder.isConfigSupported(cfg);
      if (support.supported) {
        return cfg;
      }
    } catch {
      // Try next H.264 profile
    }
  }
  return null;
}

export async function pickSupportedAudioConfig(): Promise<{
  sampleRate: number;
  numberOfChannels: number;
  bitrate: number;
} | null> {
  if (typeof AudioEncoder === 'undefined' || typeof AudioData === 'undefined') {
    return null;
  }
  const candidates = [
    { sampleRate: 48000, numberOfChannels: 2, bitrate: AUDIO_BITRATE },
    { sampleRate: 44100, numberOfChannels: 2, bitrate: AUDIO_BITRATE },
    { sampleRate: 48000, numberOfChannels: 1, bitrate: 72_000 },
    { sampleRate: 44100, numberOfChannels: 1, bitrate: 72_000 },
  ];
  for (const c of candidates) {
    try {
      const support = await AudioEncoder.isConfigSupported({
        codec: 'mp4a.40.2',
        sampleRate: c.sampleRate,
        numberOfChannels: c.numberOfChannels,
        bitrate: c.bitrate,
      });
      if (support.supported) {
        return c;
      }
    } catch {
      // Try next AAC config
    }
  }
  return null;
}

export function pickSupportedMediaRecorderMp4Mime(withAudio: boolean): string | null {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return null;
  }
  const candidates = withAudio
    ? [
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4;codecs=avc1.42001f,mp4a.40.2',
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4;codecs=h264,aac',
        'video/mp4',
      ]
    : [
        'video/mp4;codecs=avc1.42E01E',
        'video/mp4;codecs=avc1',
        'video/mp4',
      ];
  for (const mime of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(mime)) {
        return mime;
      }
    } catch {
      // continue
    }
  }
  return null;
}

export async function encodeViaWebCodecsMp4(
  project: ConstellationProject,
  timeline: VideoTimeline,
  illustrations: Map<string, DrawableImage>,
  videoConfig: VideoEncoderConfig,
  audioConfig: { sampleRate: number; numberOfChannels: number; bitrate: number } | null,
  audioBuffer: AudioBuffer | null,
  options: VideoExportOptions,
): Promise<Blob> {
  const { onProgress, signal } = options;

  const canvas = document.createElement('canvas');
  canvas.width = VIDEO_WIDTH;
  canvas.height = VIDEO_HEIGHT;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Не удалось создать 2D-холст для рендера видео.');

  const driver = new ThreeDVideoSceneDriver(project);
  const target = new ArrayBufferTarget();
  const hasAudio = Boolean(audioConfig && audioBuffer);

  const muxer = new Muxer({
    target,
    video: {
      codec: 'avc',
      width: VIDEO_WIDTH,
      height: VIDEO_HEIGHT,
      frameRate: VIDEO_FPS,
    },
    ...(hasAudio && audioConfig
      ? {
          audio: {
            codec: 'aac',
            numberOfChannels: audioConfig.numberOfChannels,
            sampleRate: audioConfig.sampleRate,
          },
        }
      : {}),
    fastStart: 'in-memory',
  });

  let encoderError: Error | null = null;

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => {
      muxer.addVideoChunk(chunk, meta);
    },
    error: (err) => {
      encoderError = err instanceof Error ? err : new Error(String(err));
    },
  });
  videoEncoder.configure(videoConfig);

  let audioEncoder: AudioEncoder | null = null;
  if (hasAudio && audioConfig) {
    audioEncoder = new AudioEncoder({
      output: (chunk, meta) => {
        muxer.addAudioChunk(chunk, meta);
      },
      error: (err) => {
        encoderError = err instanceof Error ? err : new Error(String(err));
      },
    });
    audioEncoder.configure({
      codec: 'mp4a.40.2',
      sampleRate: audioConfig.sampleRate,
      numberOfChannels: audioConfig.numberOfChannels,
      bitrate: audioConfig.bitrate,
    });
  }

  try {
    const totalFrames = timeline.totalFrames;
    const dt = 1 / VIDEO_FPS;
    const frameDurationUs = Math.round(1_000_000 / VIDEO_FPS);
    const keyFrameInterval = VIDEO_FPS * 2;

    for (let f = 0; f < totalFrames; f++) {
      throwIfAborted(signal);
      if (encoderError) throw encoderError;

      const timeSec = f / VIDEO_FPS;
      driver.renderFrameAtTime(ctx, timeline, illustrations, timeSec, dt);

      const frame = new VideoFrame(canvas, {
        timestamp: f * frameDurationUs,
        duration: frameDurationUs,
      });
      try {
        videoEncoder.encode(frame, { keyFrame: f % keyFrameInterval === 0 });
      } finally {
        frame.close();
      }

      while (videoEncoder.encodeQueueSize > 8) {
        throwIfAborted(signal);
        if (encoderError) throw encoderError;
        await delayMs(6);
      }

      if (f % 6 === 0 || f === totalFrames - 1) {
        const videoPct = Math.round(((f + 1) / totalFrames) * (hasAudio ? 82 : 95));
        onProgress?.({
          percent: Math.max(8, videoPct),
          stageLabel: `Рендерим 3D-сцены открытки (${f + 1}/${totalFrames})...`,
        });
        await delayMs(0);
      }
    }

    if (audioEncoder && audioBuffer && audioConfig) {
      onProgress?.({
        percent: 85,
        stageLabel: 'Кодируем музыкальное сопровождение...',
      });
      const channels = audioConfig.numberOfChannels;
      const sampleRate = audioConfig.sampleRate;
      const totalSamples = audioBuffer.length;
      const chunkFrames = 1024;
      const channelArrays = Array.from({ length: channels }, (_, c) =>
        audioBuffer.getChannelData(Math.min(c, audioBuffer.numberOfChannels - 1)),
      );

      for (let offset = 0; offset < totalSamples; offset += chunkFrames) {
        throwIfAborted(signal);
        if (encoderError) throw encoderError;

        const frames = Math.min(chunkFrames, totalSamples - offset);
        const planar = new Float32Array(frames * channels);
        for (let c = 0; c < channels; c++) {
          planar.set(channelArrays[c].subarray(offset, offset + frames), c * frames);
        }

        const audioData = new AudioData({
          format: 'f32-planar',
          sampleRate,
          numberOfFrames: frames,
          numberOfChannels: channels,
          timestamp: Math.round((offset / sampleRate) * 1_000_000),
          data: planar,
        });
        try {
          audioEncoder.encode(audioData);
        } finally {
          audioData.close();
        }

        while (audioEncoder.encodeQueueSize > 16) {
          throwIfAborted(signal);
          if (encoderError) throw encoderError;
          await delayMs(4);
        }
      }
    }

    throwIfAborted(signal);
    onProgress?.({ percent: 94, stageLabel: 'Собираем компактный MP4 для iPhone...' });

    await videoEncoder.flush();
    if (audioEncoder) {
      await audioEncoder.flush();
    }
    if (encoderError) throw encoderError;

    muxer.finalize();
    onProgress?.({ percent: 100, stageLabel: 'Готово!' });

    return new Blob([target.buffer], { type: 'video/mp4' });
  } finally {
    driver.dispose();
    try {
      if (videoEncoder.state !== 'closed') videoEncoder.close();
    } catch {
      // ignore
    }
    try {
      if (audioEncoder && audioEncoder.state !== 'closed') audioEncoder.close();
    } catch {
      // ignore
    }
  }
}

export async function encodeViaMediaRecorderMp4(
  project: ConstellationProject,
  timeline: VideoTimeline,
  illustrations: Map<string, DrawableImage>,
  mimeType: string,
  audioBuffer: AudioBuffer | null,
  options: VideoExportOptions,
): Promise<Blob> {
  const { onProgress, signal } = options;

  const canvas = document.createElement('canvas');
  canvas.width = VIDEO_WIDTH;
  canvas.height = VIDEO_HEIGHT;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Не удалось создать 2D-холст для записи видео.');

  const driver = new ThreeDVideoSceneDriver(project);
  driver.renderFrameAtTime(ctx, timeline, illustrations, 0, 1 / VIDEO_FPS);

  const canvasStream = canvas.captureStream(VIDEO_FPS);
  let audioCtx: AudioContext | null = null;
  let audioSource: AudioBufferSourceNode | null = null;

  const combinedStream = new MediaStream(canvasStream.getVideoTracks());

  if (audioBuffer) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      audioCtx = new AudioCtx();
      const dest = audioCtx.createMediaStreamDestination();
      audioSource = audioCtx.createBufferSource();
      audioSource.buffer = audioBuffer;
      audioSource.connect(dest);
      dest.stream.getAudioTracks().forEach((track) => combinedStream.addTrack(track));
    }
  }

  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: VIDEO_BITRATE,
    ...(audioBuffer ? { audioBitsPerSecond: AUDIO_BITRATE } : {}),
  });

  recorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) {
      chunks.push(ev.data);
    }
  };

  const stoppedPromise = new Promise<void>((resolve, reject) => {
    recorder.onstop = () => resolve();
    recorder.onerror = () => reject(new Error('Ошибка при записи MP4-видео в браузере.'));
  });

  let rafId = 0;
  try {
    recorder.start(250);
    if (audioSource) {
      audioSource.start(0);
    }

    const startMs = performance.now();
    const totalMs = timeline.totalDurationSec * 1000;
    let prevTimeSec = 0;

    await new Promise<void>((resolve, reject) => {
      const tick = () => {
        if (signal?.aborted) {
          reject(new DOMException('Экспорт видео отменён.', 'AbortError'));
          return;
        }
        const elapsedMs = performance.now() - startMs;
        const timeSec = Math.min(timeline.totalDurationSec, elapsedMs / 1000);
        const dt = clamp(timeSec - prevTimeSec, 0.001, 0.08);
        prevTimeSec = timeSec;
        driver.renderFrameAtTime(ctx, timeline, illustrations, timeSec, dt);

        const pct = Math.min(96, Math.max(8, Math.round((elapsedMs / totalMs) * 92) + 4));
        onProgress?.({
          percent: pct,
          stageLabel: `Записываем 3D-видео MP4 (${Math.round(timeSec)}/${Math.round(
            timeline.totalDurationSec,
          )} с)...`,
        });

        if (elapsedMs >= totalMs) {
          resolve();
        } else {
          rafId = requestAnimationFrame(tick);
        }
      };
      rafId = requestAnimationFrame(tick);
    });

    if (recorder.state === 'recording') {
      recorder.stop();
    }
    await stoppedPromise;
    onProgress?.({ percent: 100, stageLabel: 'Готово!' });
    return new Blob(chunks, { type: 'video/mp4' });
  } finally {
    driver.dispose();
    if (rafId) cancelAnimationFrame(rafId);
    try {
      if (recorder.state === 'recording') recorder.stop();
    } catch {
      // ignore
    }
    combinedStream.getTracks().forEach((t) => t.stop());
    try {
      audioSource?.stop();
    } catch {
      // ignore
    }
    await audioCtx?.close().catch(() => undefined);
  }
}
