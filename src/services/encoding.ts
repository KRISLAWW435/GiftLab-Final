const BASE64_CHUNK_BYTES = 8192;

/**
 * Encodes an ArrayBuffer into a Base64 string without overflowing the JS call stack.
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  if (bytes.byteLength === 0) return '';

  const parts: string[] = [];
  for (let offset = 0; offset < bytes.byteLength; offset += BASE64_CHUNK_BYTES) {
    const chunk = bytes.subarray(
      offset,
      Math.min(offset + BASE64_CHUNK_BYTES, bytes.byteLength),
    );
    parts.push(String.fromCharCode.apply(null, chunk as unknown as number[]));
  }
  return btoa(parts.join(''));
}

/**
 * Detects common image MIME types from leading magic bytes when Blob.type is missing or generic.
 */
export function detectImageMimeFromBytes(bytes: Uint8Array): string | null {
  if (bytes.length >= 8) {
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    ) {
      return 'image/png';
    }
  }
  if (bytes.length >= 3) {
    // JPEG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return 'image/jpeg';
    }
  }
  if (bytes.length >= 12) {
    // WEBP: "RIFF"...."WEBP"
    if (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return 'image/webp';
    }
  }
  if (bytes.length >= 6) {
    // GIF: GIF87a / GIF89a
    if (
      bytes[0] === 0x47 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x38
    ) {
      return 'image/gif';
    }
  }
  return null;
}

/**
 * Converts a non-empty Blob into an explicit Base64 Data URI safe for offline file:// HTML.
 */
export async function blobToDataUri(
  blob: Blob,
  fallbackMime: string,
  resourceLabel?: string,
): Promise<string> {
  if (!blob || blob.size === 0) {
    throw new Error(
      resourceLabel
        ? `Ресурс «${resourceLabel}» пуст или повреждён.`
        : 'Ресурс пуст или повреждён.',
    );
  }

  const buffer = await blob.arrayBuffer();
  if (buffer.byteLength === 0) {
    throw new Error(
      resourceLabel
        ? `Не удалось прочитать содержимое ресурса «${resourceLabel}».`
        : 'Не удалось прочитать содержимое ресурса.',
    );
  }

  const rawType = (blob.type || '').trim();
  let mime = rawType && rawType !== 'application/octet-stream' ? rawType : '';
  if (!mime && fallbackMime.startsWith('image/')) {
    mime = detectImageMimeFromBytes(new Uint8Array(buffer)) ?? '';
  }
  if (!mime) {
    mime = fallbackMime;
  }

  const base64 = arrayBufferToBase64(buffer);
  if (!base64) {
    throw new Error(
      resourceLabel
        ? `Не удалось закодировать ресурс «${resourceLabel}».`
        : 'Не удалось закодировать ресурс.',
    );
  }

  return `data:${mime};base64,${base64}`;
}

export function formatBytesRu(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 Б';
  if (bytes < 1024) return `${Math.round(bytes)} Б`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} КБ`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb >= 10 ? 1 : 2).replace('.', ',')} МБ`;
}
