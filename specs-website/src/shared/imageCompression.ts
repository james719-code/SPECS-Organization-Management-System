/**
 * Shrink a photo in the browser before upload. Event images were stored as full-size camera files
 * (several hundred KB each) and shown in small cards, which dominated the landing page weight.
 * Returns the original file when it is not a compressible image, when the browser cannot decode it,
 * or when compressing would not make it smaller.
 */
export async function compressImage(file: File, maxSize = 1400, quality = 0.82): Promise<File> {
  const type = file?.type || '';
  if (!type.startsWith('image/') || type === 'image/gif' || type === 'image/svg+xml') return file;
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
    if (!blob || blob.type !== 'image/webp' || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'image'}.webp`, { type: 'image/webp' });
  } catch {
    return file;
  }
}
