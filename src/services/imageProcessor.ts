const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_SOURCE_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_SIDE_PX = 1200;
const TARGET_OUTPUT_BYTES = 300 * 1024; // 300 KB target

export interface ProcessedImageResult {
  blob: Blob;
  width: number;
  height: number;
  originalSize: number;
}

export async function processUploadedImage(file: File): Promise<ProcessedImageResult> {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error('Поддерживаются только изображения JPG, PNG и WebP.');
  }

  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('Размер файла не должен превышать 8 МБ.');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Не удалось прочитать изображение.'));
      el.src = objectUrl;
    });

    const scale = Math.min(1, MAX_SIDE_PX / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Не удалось обработать изображение на этом устройстве.');
    }

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    let quality = 0.82;
    let blob = await canvasToBlob(canvas, 'image/webp', quality);

    // Gently reduce quality if still above 300 KB
    while (blob && blob.type === 'image/webp' && blob.size > TARGET_OUTPUT_BYTES && quality > 0.54) {
      quality -= 0.08;
      blob = await canvasToBlob(canvas, 'image/webp', quality);
    }

    if (!blob || blob.type !== 'image/webp') {
      blob = await canvasToBlob(canvas, 'image/png', 0.9);
    }

    if (!blob) {
      throw new Error('Не удалось сжать изображение.');
    }

    return {
      blob,
      width,
      height,
      originalSize: file.size,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}
