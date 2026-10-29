import { describe, it, expect } from 'vitest';
import { assessQuality } from '../src/scan/quality';
const frame = (w: number, h: number, f: (x: number, y: number) => number) => {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = f(x, y), i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  return d;
};
describe('camera quality', () => {
  it('sharp, well-lit pattern passes', () => {
    expect(assessQuality(frame(64, 48, (x, y) => ((x >> 2) + (y >> 2)) % 2 ? 200 : 60), 64, 48).warnings).toEqual([]);
  });
  it('flags dark frames', () => {
    expect(assessQuality(frame(64, 48, (x) => (x % 4 < 2 ? 40 : 10)), 64, 48).warnings.join()).toMatch(/dark/);
  });
  it('flags glare', () => {
    expect(assessQuality(frame(64, 48, (x, y) => (x < 20 ? 255 : ((x + y) % 4 < 2 ? 200 : 60))), 64, 48).warnings.join()).toMatch(/Glare/);
  });
  it('flags blur on a flat image', () => {
    expect(assessQuality(frame(64, 48, (x) => 100 + x), 64, 48).warnings.join()).toMatch(/Blurry/);
  });
});
