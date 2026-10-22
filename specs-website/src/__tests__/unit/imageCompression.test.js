import { describe, it, expect } from 'vitest';
import { compressImage } from '../../shared/imageCompression';

describe('compressImage', () => {
  it('returns non-image files untouched', async () => {
    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    expect(await compressImage(file)).toBe(file);
  });

  it('leaves GIFs and SVGs alone because canvas would flatten them', async () => {
    const gif = new File(['x'], 'anim.gif', { type: 'image/gif' });
    const svg = new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' });
    expect(await compressImage(gif)).toBe(gif);
    expect(await compressImage(svg)).toBe(svg);
  });

  it('falls back to the original file when the browser cannot decode images', async () => {
    const original = globalThis.createImageBitmap;
    globalThis.createImageBitmap = undefined;
    try {
      const photo = new File(['not really a jpeg'], 'photo.jpg', { type: 'image/jpeg' });
      expect(await compressImage(photo)).toBe(photo);
    } finally {
      globalThis.createImageBitmap = original;
    }
  });

  it('falls back to the original file when decoding throws', async () => {
    const original = globalThis.createImageBitmap;
    globalThis.createImageBitmap = async () => { throw new Error('corrupt'); };
    try {
      const photo = new File(['broken'], 'photo.png', { type: 'image/png' });
      expect(await compressImage(photo)).toBe(photo);
    } finally {
      globalThis.createImageBitmap = original;
    }
  });
});
