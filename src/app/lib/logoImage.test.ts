import { describe, expect, it } from 'vitest';
import { dataUrlKb, fitWithin, isLogoDataUrl, logoFileError } from './logoImage';

describe('logo de la empresa', () => {
  it('acepta solo imágenes de hasta 5 MB', () => {
    expect(logoFileError({ type: 'image/png', size: 1000 })).toBeNull();
    expect(logoFileError({ type: 'image/svg+xml', size: 1000 })).toBeNull();
    expect(logoFileError({ type: 'application/pdf', size: 1000 })).toMatch(/PNG/);
    expect(logoFileError({ type: 'image/jpeg', size: 6 * 1024 * 1024 })).toMatch(/5 MB/);
  });

  it('reduce a 256 px manteniendo proporción y no agranda', () => {
    expect(fitWithin(1024, 512)).toEqual({ width: 256, height: 128 });
    expect(fitWithin(300, 900)).toEqual({ width: 85, height: 256 });
    expect(fitWithin(120, 80)).toEqual({ width: 120, height: 80 });
    expect(fitWithin(0, 0)).toEqual({ width: 256, height: 256 });
  });

  it('valida el formato que guarda la base', () => {
    expect(isLogoDataUrl('data:image/webp;base64,UklGRg==')).toBe(true);
    expect(isLogoDataUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
    expect(isLogoDataUrl('https://x.com/logo.png')).toBe(false);
    expect(isLogoDataUrl('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false);
    expect(isLogoDataUrl('data:image/png;base64,abc" onerror="x')).toBe(false);
    expect(isLogoDataUrl(null)).toBe(false);
  });

  it('calcula el peso aproximado', () => {
    expect(dataUrlKb('data:image/png;base64,' + 'A'.repeat(4096))).toBe(3);
  });
});
