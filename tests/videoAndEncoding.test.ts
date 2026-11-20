import { describe, expect, test } from 'bun:test';
import { createNewProject } from '../src/scene/paletteConfig';
import {
  arrayBufferToBase64,
  blobToDataUri,
  detectImageMimeFromBytes,
  formatBytesRu,
} from '../src/services/encoding';
import { wrapCanvasTextLines } from '../src/services/video/videoCanvasPrimitives';
import {
  VIDEO_FPS,
  clamp,
  computeVideoTimeline,
  hexToRgb,
  lerp,
  rgba,
} from '../src/services/video/videoTimeline';

describe('videoTimeline & canvas primitives', () => {
  test('computeVideoTimeline builds contiguous segments covering all stars and phases', () => {
    const project = createNewProject('birthday');
    const timeline = computeVideoTimeline(project);

    expect(timeline.segments.length).toBe(project.stars.length + 4);
    expect(timeline.segments[0].kind).toBe('sealed');
    expect(timeline.segments[1].kind).toBe('birthing');
    expect(timeline.segments[timeline.segments.length - 2].kind).toBe('finalReveal');
    expect(timeline.segments[timeline.segments.length - 1].kind).toBe('constellation');

    for (let i = 1; i < timeline.segments.length; i++) {
      expect(timeline.segments[i].startSec).toBeCloseTo(timeline.segments[i - 1].endSec, 5);
    }

    expect(timeline.totalDurationSec).toBeCloseTo(
      timeline.segments[timeline.segments.length - 1].endSec,
      2,
    );
    expect(timeline.totalFrames).toBe(Math.round(timeline.totalDurationSec * VIDEO_FPS));
  });

  test('math & color helpers clamp and convert hex cleanly', () => {
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(lerp(10, 20, 0.25)).toBe(12.5);
    expect(hexToRgb('#FF8040')).toEqual({ r: 255, g: 128, b: 64 });
    expect(rgba('#FF0000', 0.5)).toBe('rgba(255, 0, 0, 0.500)');
  });

  test('wrapCanvasTextLines preserves paragraphs and splits long words without overflow', () => {
    const monospaceMeasure = (s: string) => s.length * 10;
    const lines = wrapCanvasTextLines(
      monospaceMeasure,
      'Привет мир\n\nСупердлинноеслово',
      80,
    );

    expect(lines).toEqual(['Привет', 'мир', '', 'Супердли', 'нноеслов', 'о']);
  });
});

describe('encoding helpers', () => {
  test('arrayBufferToBase64 encodes empty and multi-byte buffers accurately', () => {
    expect(arrayBufferToBase64(new Uint8Array([]).buffer)).toBe('');
    const bytes = new TextEncoder().encode('GiftLab');
    expect(arrayBufferToBase64(bytes.buffer as ArrayBuffer)).toBe(btoa('GiftLab'));
  });

  test('detectImageMimeFromBytes identifies PNG, JPEG, WEBP, and GIF signatures', () => {
    expect(
      detectImageMimeFromBytes(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    ).toBe('image/png');
    expect(detectImageMimeFromBytes(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(
      'image/jpeg',
    );
    expect(
      detectImageMimeFromBytes(
        new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
      ),
    ).toBe('image/webp');
    expect(
      detectImageMimeFromBytes(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])),
    ).toBe('image/gif');
    expect(detectImageMimeFromBytes(new Uint8Array([1, 2, 3, 4]))).toBeNull();
  });

  test('blobToDataUri sniffs MIME when generic and rejects empty blobs', async () => {
    const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const genericBlob = new Blob([pngHeader], { type: 'application/octet-stream' });
    const dataUri = await blobToDataUri(genericBlob, 'image/jpeg', 'фото');
    expect(dataUri.startsWith('data:image/png;base64,')).toBe(true);

    const emptyBlob = new Blob([]);
    await expect(blobToDataUri(emptyBlob, 'image/png', 'пустой')).rejects.toThrow('пуст');
  });

  test('formatBytesRu formats bytes, KB, and MB cleanly', () => {
    expect(formatBytesRu(0)).toBe('0 Б');
    expect(formatBytesRu(512)).toBe('512 Б');
    expect(formatBytesRu(2048)).toBe('2.0 КБ');
    expect(formatBytesRu(1024 * 1024 * 2.5)).toBe('2,50 МБ');
  });
});
