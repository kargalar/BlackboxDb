import { describe, expect, it } from 'vitest';
import {
  getFocusFromCrop,
  getImageFocus,
  getImageObjectPosition,
  getImageSource,
  withImageFocus,
} from './image-focus';
import { readFileAsDataUrl } from './image-crop-utils';

describe('backdrop alignment', () => {
  it('maps a visible frame to CSS alignment at the top, center and bottom', () => {
    for (const [y, expected] of [
      [0, 0],
      [140, 50],
      [280, 100],
    ]) {
      expect(getFocusFromCrop({ x: 0, y, width: 1920, height: 800 }, 1920, 1080)).toEqual({
        x: 50,
        y: expected,
      });
    }
    expect(getFocusFromCrop({ x: 600, y: 0, width: 1200, height: 500 }, 1800, 500)).toEqual({
      x: 100,
      y: 50,
    });
    expect(getFocusFromCrop({ x: 0, y: 0, width: 1200, height: 500 }, 1200, 500)).toEqual({
      x: 50,
      y: 50,
    });
  });

  it('changes only alignment metadata and keeps the original source', () => {
    const source = 'https://media.example.test/full.png';
    const aligned = withImageFocus(`${source}#focus=10,20`, { x: 25, y: 100 });
    expect(aligned).toBe(`${source}#focus=25,100`);
    expect(getImageSource(aligned)).toBe(source);
    expect(getImageObjectPosition(aligned)).toBe('25% 100%');
    expect(getImageFocus(source)).toEqual({ x: 50, y: 50 });
    expect(withImageFocus(source, { x: -100, y: 500 })).toBe(`${source}#focus=0,100`);
  });

  it('preserves every source byte and MIME type instead of re-encoding the file', async () => {
    const bytes = new Uint8Array([137, 80, 78, 71, 0, 255, 16, 32, 64, 128]);
    const file = new File([bytes], 'full.png', { type: 'image/png' });
    const result = withImageFocus(await readFileAsDataUrl(file), { x: 50, y: 80 });
    expect(result.startsWith('data:image/png;base64,')).toBe(true);
    const decoded = Uint8Array.from(atob(getImageSource(result).split(',')[1]), (character) =>
      character.charCodeAt(0)
    );
    expect(decoded).toEqual(bytes);
  });
});
