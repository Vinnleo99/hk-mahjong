import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { parseWeights, classify, toInput } from '../src/scan/model';
import fx from './model-parity.json';

describe('on-device tile model', () => {
  const buf = readFileSync('public/model/tiles-v1.bin');
  const net = parseWeights(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  it('int8 TS runtime matches the PyTorch model', () => {
    const rgba = new Uint8ClampedArray(64 * 48 * 4);
    for (let i = 0; i < 64 * 48; i++) { rgba[i * 4] = fx.x[i * 3]; rgba[i * 4 + 1] = fx.x[i * 3 + 1]; rgba[i * 4 + 2] = fx.x[i * 3 + 2]; rgba[i * 4 + 3] = 255; }
    const p = classify(net, toInput(rgba));
    const am = (a: ArrayLike<number>) => Array.from(a).indexOf(Math.max(...Array.from(a)));
    expect(am(p)).toBe(am(fx.p));
    for (let k = 0; k < 42; k++) expect(Math.abs(p[k] - fx.p[k])).toBeLessThan(0.03);
  });
});
