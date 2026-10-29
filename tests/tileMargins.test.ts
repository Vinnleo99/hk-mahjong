import { describe, it, expect } from 'vitest';
import { Resvg } from '@resvg/resvg-js';
import { faceSvg, artTransform, SAFE, FACE, tileSvg } from '../src/tileSvg';
import { ART_BOUNDS } from '../src/tileBounds';
// @ts-expect-error plain JS helper shared with the generator
import { bbox } from '../scripts/tile-bounds.mjs';

// Tile widths used in the app (palette, hand, results, Learn, tutorial) plus a high-res check.
const SIZES = [24, 26, 28, 30, 34, 36, 38, 44, 52, 120, 600];

/** Renders only the placed artwork (exactly as tileSvg places it) at a pixel width; returns its bbox in viewBox units. */
function placedBox(f: number, w: number) {
  const k = w / 60;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80" width="${w}" height="${Math.round(w * 4 / 3)}"><g transform="${artTransform(f)}">${faceSvg(f)}</g></svg>`;
  const img = new Resvg(svg, { shapeRendering: 2, font: { loadSystemFonts: false } }).render(); const px = img.pixels;
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) if (px[(y * img.width + x) * 4 + 3] > 24) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return [x0 / k, y0 / k, (x1 + 1) / k, (y1 + 1) / k];
}

describe('tile artwork stays inside the ivory face', () => {
  it('stored artwork bounds are up to date (run scripts/tile-bounds.mjs after editing drawings)', () => {
    for (let f = 0; f < 42; f++) {
      const b = bbox(faceSvg(f));
      b.forEach((v: number, i: number) => expect(Math.abs(v - ART_BOUNDS[f][i]), `tile ${f}`).toBeLessThan(0.2));
    }
  });
  for (const w of SIZES) it(`all 42 tiles respect the 8% safe margin at ${w}px wide`, () => {
    const tol = 60 / w; // one device pixel of anti-aliasing
    for (let f = 0; f < 42; f++) {
      const [x0, y0, x1, y1] = placedBox(f, w);
      expect(x0, `tile ${f} left`).toBeGreaterThanOrEqual(SAFE.x0 - tol);
      expect(y0, `tile ${f} top`).toBeGreaterThanOrEqual(SAFE.y0 - tol);
      expect(x1, `tile ${f} right`).toBeLessThanOrEqual(SAFE.x1 + tol);
      expect(y1, `tile ${f} bottom`).toBeLessThanOrEqual(SAFE.y1 + tol);
    }
  });
  it('drawings are scaled consistently: fill 75-86% of the face in their limiting dimension', () => {
    const fw = FACE.x1 - FACE.x0, fh = FACE.y1 - FACE.y0;
    for (let f = 0; f < 42; f++) {
      const [x0, y0, x1, y1] = placedBox(f, 600);
      const fill = Math.max((x1 - x0) / fw, (y1 - y0) / fh);
      expect(fill, `tile ${f} too small`).toBeGreaterThanOrEqual(0.75);
      expect(fill, `tile ${f} too big`).toBeLessThanOrEqual(0.86);
    }
  });
  it('drawings are centred on the face', () => {
    for (let f = 0; f < 42; f++) {
      const [x0, y0, x1, y1] = placedBox(f, 600);
      expect(Math.abs((x0 + x1) / 2 - (SAFE.x0 + SAFE.x1) / 2), `tile ${f}`).toBeLessThan(0.6);
      expect(Math.abs((y0 + y1) / 2 - (SAFE.y0 + SAFE.y1) / 2), `tile ${f}`).toBeLessThan(0.6);
    }
  });
  it('full tile SVG uses the fitted transform', () => {
    expect(tileSvg(5)).toContain(artTransform(5));
  });
});
