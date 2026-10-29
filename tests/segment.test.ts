import { describe, it, expect } from 'vitest';
import { segment, faceMask, rowAngle, estimateTilt } from '../src/scan/segment';

// Draw ivory tiles (30×40 with a dark symbol) on a green table.
function scene(w: number, h: number, tiles: { x: number; y: number }[], gap = 2, angle = 0) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { d[i * 4] = 20; d[i * 4 + 1] = 90; d[i * 4 + 2] = 50; d[i * 4 + 3] = 255; }
  const cx = w / 2, cy = h / 2, c = Math.cos(-angle), s = Math.sin(-angle);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ux = c * (x - cx) - s * (y - cy) + cx, uy = s * (x - cx) + c * (y - cy) + cy; // un-rotate
    for (const t of tiles) {
      if (ux >= t.x && ux < t.x + 30 - gap && uy >= t.y && uy < t.y + 40) {
        const sym = ux > t.x + 10 && ux < t.x + 18 && uy > t.y + 12 && uy < t.y + 28;
        const i = (y * w + x) * 4; const v = sym ? 30 : 235;
        d[i] = v; d[i + 1] = v; d[i + 2] = sym ? 30 : 215;
      }
    }
  }
  return d;
}
const row = (n: number, x0: number, y: number) => Array.from({ length: n }, (_, i) => ({ x: x0 + i * 30, y }));

describe('segmentation', () => {
  it('finds 14 separated tiles in one row', () => {
    const d = scene(500, 120, row(14, 20, 40));
    const b = segment(faceMask(d, 500, 120), 500, 120);
    expect(b).toHaveLength(14);
    expect(new Set(b.map((x) => x.row)).size).toBe(1);
  });
  it('splits touching tiles by aspect ratio', () => {
    const d = scene(500, 120, row(13, 20, 40), 0);
    expect(segment(faceMask(d, 500, 120), 500, 120)).toHaveLength(13);
  });
  it('handles two rows', () => {
    const d = scene(300, 200, [...row(7, 20, 20), ...row(7, 30, 110)]);
    const b = segment(faceMask(d, 300, 200), 300, 200);
    expect(b).toHaveLength(14);
    expect(b.filter((x) => x.row === 0)).toHaveLength(7);
    expect(b.filter((x) => x.row === 1)).toHaveLength(7);
  });
  it('estimates tilt of a rotated row', () => {
    const d = scene(500, 240, row(10, 100, 100), 2, 0.12);
    expect(estimateTilt(faceMask(d, 500, 240), 500, 240)).toBeCloseTo(0.12, 1);
    expect(estimateTilt(faceMask(scene(500, 240, row(10, 100, 100), 2, -0.2), 500, 240), 500, 240)).toBeCloseTo(-0.2, 1);
    expect(estimateTilt(faceMask(scene(500, 240, row(10, 100, 100)), 500, 240), 500, 240)).toBeCloseTo(0, 1);
  });
  it('rowAngle fits the centre line of a row', () => {
    const b = Array.from({ length: 5 }, (_, i) => ({ x: i * 30, y: i * 3, w: 28, h: 40, row: 0 }));
    expect(rowAngle(b)).toBeCloseTo(Math.atan(0.1), 3);
  });
});
