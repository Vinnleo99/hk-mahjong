// Sanity checks on a scanned hand: flag impossible reads and propose fixes from
// each tile's second/third-best guesses. Pure, so it is unit-tested.
import { decompose } from '../engine/scoring';
import { ORPHANS, tileName } from '../engine/tiles';

export interface Read { tile: number; confidence: number; alts: { tile: number; score: number }[] }
export interface Fix { index: number; from: number; to: number }
export interface Issue { kind: 'too-many' | 'duplicate-bonus' | 'count' | 'not-winning'; message: string; fixes: Fix[] }

const limitOf = (t: number) => (t >= 34 ? 1 : 4);
const isWin14 = (ts: number[]) =>
  ts.length === 14 && (decompose(ts, 4).length > 0 || (ORPHANS.every((o) => ts.includes(o)) && ts.every((t) => ORPHANS.includes(t))));

/** `melded` = tiles already declared in melds (counts toward the 4-copy limit). */
export function checkScan(reads: Read[], melded: number[] = []): Issue[] {
  const issues: Issue[] = [];
  const tally = new Array(42).fill(0);
  for (const t of melded) tally[t]++;
  for (const r of reads) tally[r.tile]++;
  const after = [...tally];
  for (let t = 0; t < 42; t++) {
    if (tally[t] <= limitOf(t)) continue;
    const excess = tally[t] - limitOf(t);
    // Change the least-confident copies, each to its best alternative that still fits.
    const idx = reads.map((r, i) => ({ r, i })).filter((x) => x.r.tile === t).sort((a, b) => a.r.confidence - b.r.confidence);
    const fixes: Fix[] = [];
    for (const { r, i } of idx) {
      if (fixes.length >= excess) break;
      const alt = r.alts.find((a) => a.tile !== t && after[a.tile] < limitOf(a.tile));
      if (alt) { fixes.push({ index: i, from: t, to: alt.tile }); after[alt.tile]++; after[t]--; }
    }
    issues.push({
      kind: t >= 34 ? 'duplicate-bonus' : 'too-many',
      message: t >= 34 ? `${tileName(t)} read ${tally[t]}× – each flower/season exists only once` : `${tileName(t)} read ${tally[t]}× – a set has only 4`,
      fixes,
    });
  }
  const main = reads.filter((r) => r.tile < 34);
  const total = main.length + melded.length;
  if (total !== 13 && total !== 14 && !(total > 14 && melded.length >= 4)) { // >14 only possible with kongs
    issues.push({ kind: 'count', message: `${total} hand tiles – a hand has 13 (waiting) or 14 (complete), plus any flowers. Check the tile count setting.`, fixes: [] });
  }
  // 14 tiles that don't form a winning hand: try one low-confidence swap that makes it win.
  if (main.length === 14 && melded.length === 0 && issues.length === 0 && !isWin14(main.map((r) => r.tile))) {
    const order = main.map((r) => reads.indexOf(r)).sort((a, b) => reads[a].confidence - reads[b].confidence);
    const fixes: Fix[] = [];
    for (const i of order) {
      for (const a of reads[i].alts) {
        if (a.tile === reads[i].tile || a.tile >= 34 || tally[a.tile] >= 4) continue;
        const ts = main.map((r) => (reads.indexOf(r) === i ? a.tile : r.tile));
        if (isWin14(ts)) { fixes.push({ index: i, from: reads[i].tile, to: a.tile }); break; }
      }
      if (fixes.length) break;
    }
    issues.push({ kind: 'not-winning', message: fixes.length ? 'These 14 tiles are not a winning hand – one likely misread:' : 'These 14 tiles are not a winning hand – check for misreads.', fixes });
  }
  return issues;
}

export function applyFixes<T extends { tile: number }>(reads: T[], fixes: Fix[]): T[] {
  return reads.map((r, i) => { const f = fixes.find((x) => x.index === i); return f ? { ...r, tile: f.to } : r; });
}
