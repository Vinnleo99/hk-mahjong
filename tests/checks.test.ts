import { describe, it, expect } from 'vitest';
import { checkScan, applyFixes, Read } from '../src/scan/checks';
import { parseTiles } from '../src/engine/tiles';

const reads = (s: string, alts: Record<number, number[]> = {}, conf: Record<number, number> = {}): Read[] =>
  parseTiles(s).map((t, i) => ({ tile: t, confidence: conf[i] ?? 0.9, alts: [t, ...(alts[i] ?? [])].map((tile, k) => ({ tile, score: 1 - k / 10 })) }));

describe('scan rule checks', () => {
  it('a clean winning 14-tile read has no issues', () => {
    expect(checkScan(reads('123m456p789sEEECC'))).toEqual([]);
  });
  it('a clean 13-tile read has no issues', () => {
    expect(checkScan(reads('123m456p789sEEEC'))).toEqual([]);
  });
  it('flags five of a tile and fixes the least confident copy from its second guess', () => {
    // 5× 1m: index 4 is least confident and its 2nd guess is 7m (index 6 in tiles)
    const r = reads('11111m456p789sCC', { 4: [6] }, { 4: 0.2 });
    const issues = checkScan(r);
    const tm = issues.find((i) => i.kind === 'too-many')!;
    expect(tm.message).toMatch(/5×/);
    expect(tm.fixes).toEqual([{ index: 4, from: 0, to: 6 }]);
    expect(checkScan(applyFixes(r, tm.fixes)).find((i) => i.kind === 'too-many')).toBeUndefined();
  });
  it('alternative that would also exceed 4 is skipped', () => {
    const r = reads('11111m2222m3p', { 0: [1, 2] }, { 0: 0.1 });
    expect(checkScan(r)[0].fixes).toEqual([{ index: 0, from: 0, to: 2 }]);
  });
  it('counts melded tiles toward the four-copy limit', () => {
    expect(checkScan(reads('1m23m456p789sCC'), [0, 0, 0, 0]).some((i) => i.kind === 'too-many')).toBe(true);
  });
  it('flags duplicate flowers', () => {
    const r = [...reads('123m456p789sEEECC'), { tile: 34, confidence: 0.9, alts: [] }, { tile: 34, confidence: 0.3, alts: [{ tile: 34, score: 1 }, { tile: 35, score: 0.8 }] }];
    const iss = checkScan(r).find((i) => i.kind === 'duplicate-bonus')!;
    expect(iss.fixes).toEqual([{ index: 15, from: 34, to: 35 }]);
  });
  it('flags a wrong tile count', () => {
    expect(checkScan(reads('123m456p789s')).map((i) => i.kind)).toEqual(['count']);
    expect(checkScan(reads('123m456p789sEEECCC')).map((i) => i.kind)).toEqual(['count']);
  });
  it('flowers do not count toward hand size', () => {
    const r = [...reads('123m456p789sEEECC'), { tile: 38, confidence: 1, alts: [] }];
    expect(checkScan(r)).toEqual([]);
  });
  it('non-winning 14 tiles: suggests the single low-confidence swap that completes the hand', () => {
    // 124m: index 2 (4m) misread, 2nd guess 3m
    const r = reads('124m456p789sEEECC', { 2: [2] }, { 2: 0.3 });
    const iss = checkScan(r);
    expect(iss).toHaveLength(1);
    expect(iss[0].kind).toBe('not-winning');
    expect(iss[0].fixes).toEqual([{ index: 2, from: 3, to: 2 }]);
  });
  it('non-winning with no helpful alternative gives no fix', () => {
    expect(checkScan(reads('159m159p159sESWNC'))[0].fixes).toEqual([]);
  });
  it('thirteen orphans counts as winning', () => {
    expect(checkScan(reads('19m19p19sESWNCFPP'))).toEqual([]);
  });
});
