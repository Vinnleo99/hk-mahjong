// First-version tile recogniser: segment a row of tiles, then classify each crop
// by normalised cross-correlation against (a) built-in rendered templates and
// (b) templates learned from the user's own corrections (stored locally).
import { tileSvg } from '../tileSvg';
import { faceMask, segment, estimateTilt } from './segment';
import { loadNet, classify, toInput, IN_W, IN_H, CLASSES } from './model';

const W = 24, H = 32;
type Feat = Float32Array; // W*H grey + 3 colour-ratio features
const LEARN_KEY = 'hkmj.learned.v1';
const CALIB_KEY = 'hkmj.calib.v1';

export interface Guess { tile: number; score: number }
export interface ScanResult { crop: string; tile: number; confidence: number; feat: number[]; alts: Guess[] }

function featuresFrom(ctx: CanvasRenderingContext2D, sx: number, sy: number, sw: number, sh: number): Feat {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  g.drawImage(ctx.canvas, sx, sy, sw, sh, 0, 0, W, H);
  const d = g.getImageData(0, 0, W, H).data;
  const f = new Float32Array(W * H + 3);
  let red = 0, green = 0, blue = 0;
  for (let i = 0; i < W * H; i++) {
    const r = d[i * 4], gr = d[i * 4 + 1], b = d[i * 4 + 2];
    f[i] = 0.299 * r + 0.587 * gr + 0.114 * b;
    const mx = Math.max(r, gr, b);
    if (mx - Math.min(r, gr, b) > 50) {
      if (r === mx) red++; else if (gr === mx) green++; else blue++;
    }
  }
  // normalise grey part to zero mean / unit norm
  let m = 0; for (let i = 0; i < W * H; i++) m += f[i]; m /= W * H;
  let n = 0; for (let i = 0; i < W * H; i++) { f[i] -= m; n += f[i] * f[i]; }
  n = Math.sqrt(n) || 1; for (let i = 0; i < W * H; i++) f[i] /= n;
  const tot = red + green + blue || 1;
  f[W * H] = red / tot; f[W * H + 1] = green / tot; f[W * H + 2] = blue / tot;
  return f;
}
function similarity(a: Feat, b: Feat): number {
  let s = 0; for (let i = 0; i < W * H; i++) s += a[i] * b[i];
  let col = 0; for (let i = W * H; i < W * H + 3; i++) col += Math.abs(a[i] - b[i]);
  return s - 0.35 * col;
}

let builtin: { tile: number; f: Feat }[] | null = null;
async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
async function builtinTemplates() {
  if (builtin) return builtin;
  builtin = [];
  const c = document.createElement('canvas'); c.width = 60; c.height = 80;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  for (let t = 0; t < 42; t++) {
    const img = await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(tileSvg(t)));
    g.clearRect(0, 0, 60, 80); g.drawImage(img, 0, 0, 60, 80);
    builtin.push({ tile: t, f: featuresFrom(g, 4, 4, 52, 68) });
  }
  return builtin;
}
function learned(): { tile: number; f: Feat }[] {
  try { return (JSON.parse(localStorage.getItem(LEARN_KEY) || '[]') as { tile: number; f: number[] }[]).map((x) => ({ tile: x.tile, f: Float32Array.from(x.f) })); }
  catch { return []; }
}
/** Save corrected crops so future scans of the same physical set improve. */
export function learn(samples: { tile: number; feat: number[] }[]) {
  const cur = JSON.parse(localStorage.getItem(LEARN_KEY) || '[]') as { tile: number; f: number[] }[];
  for (const s of samples) cur.push({ tile: s.tile, f: s.feat });
  localStorage.setItem(LEARN_KEY, JSON.stringify(cur.slice(-400)));
}

// ---- Calibration: one photo per tile of the user's own set (stored on the phone) ----
type CalibEntry = { tile: number; f: number[]; thumb: string };
function calibAll(): CalibEntry[] {
  try { return JSON.parse(localStorage.getItem(CALIB_KEY) || '[]') as CalibEntry[]; } catch { return []; }
}
/** Map tile -> thumbnail for tiles that have been calibrated. */
export function calibrated(): Map<number, string> {
  return new Map(calibAll().map((c) => [c.tile, c.thumb]));
}
export function forgetCalibration(tile?: number) {
  if (tile === undefined) localStorage.removeItem(CALIB_KEY);
  else localStorage.setItem(CALIB_KEY, JSON.stringify(calibAll().filter((c) => c.tile !== tile)));
}
/** Photograph a single tile; its face is cropped and stored as that tile's template. */
export async function calibrateTile(file: Blob, tile: number): Promise<string> {
  const { g, c } = await toCanvas(file, 900);
  const { top, bot, left, right } = findRow(g, c.width, c.height);
  const f = featuresFrom(g, left, top, right - left, bot - top);
  const t = document.createElement('canvas'); t.width = 60; t.height = 80;
  t.getContext('2d')!.drawImage(c, left, top, right - left, bot - top, 0, 0, 60, 80);
  const thumb = t.toDataURL('image/jpeg', 0.7);
  const all = calibAll().filter((x) => x.tile !== tile);
  all.push({ tile, f: Array.from(f).map((v) => Math.round(v * 1e4) / 1e4), thumb });
  localStorage.setItem(CALIB_KEY, JSON.stringify(all));
  return thumb;
}
async function toCanvas(file: Blob, max: number) {
  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  URL.revokeObjectURL(url);
  const scale = Math.min(1, max / img.width);
  const c = document.createElement('canvas'); c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0, c.width, c.height);
  return { c, g };
}
export const learnedCount = () => learned().length;
export const forgetLearned = () => localStorage.removeItem(LEARN_KEY);

/** Find the horizontal band and left/right extent of the bright tile faces. */
function findRow(g: CanvasRenderingContext2D, w: number, h: number) {
  const d = g.getImageData(0, 0, w, h).data;
  const bright = (x: number, y: number) => { const i = (y * w + x) * 4; return d[i] + d[i + 1] + d[i + 2] > 540 ? 1 : 0; };
  const rows = new Array(h).fill(0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x += 2) rows[y] += bright(x, y);
  const rmax = Math.max(...rows);
  let top = rows.findIndex((v) => v > rmax * 0.35), bot = h - 1 - [...rows].reverse().findIndex((v) => v > rmax * 0.35);
  if (top < 0 || bot - top < h * 0.05) { top = 0; bot = h - 1; }
  const cols = new Array(w).fill(0);
  for (let x = 0; x < w; x++) for (let y = top; y <= bot; y += 2) cols[x] += bright(x, y);
  const cmax = Math.max(...cols);
  let left = cols.findIndex((v) => v > cmax * 0.25), right = w - 1 - [...cols].reverse().findIndex((v) => v > cmax * 0.25);
  if (left < 0 || right - left < w * 0.1) { left = 0; right = w - 1; }
  return { top, bot, left, right };
}

function rotated(c: HTMLCanvasElement, angle: number) {
  const r = document.createElement('canvas'); r.width = c.width; r.height = c.height;
  const g = r.getContext('2d', { willReadFrequently: true })!;
  g.fillStyle = '#000'; g.fillRect(0, 0, r.width, r.height);
  g.translate(r.width / 2, r.height / 2); g.rotate(-angle); g.drawImage(c, -c.width / 2, -c.height / 2);
  return { c: r, g };
}

/** Find tile boxes (any number of rows), correcting tilt first. Coordinates are in `c`. */
function locate(c0: HTMLCanvasElement, g0: CanvasRenderingContext2D) {
  const sw = Math.min(1, 640 / c0.width);
  const small = (cv: HTMLCanvasElement) => {
    const s = document.createElement('canvas'); s.width = Math.round(cv.width * sw); s.height = Math.round(cv.height * sw);
    const sg = s.getContext('2d', { willReadFrequently: true })!; sg.drawImage(cv, 0, 0, s.width, s.height);
    return { mask: faceMask(sg.getImageData(0, 0, s.width, s.height).data, s.width, s.height), w: s.width, h: s.height };
  };
  let { mask, w, h } = small(c0);
  const tilt = estimateTilt(mask, w, h);
  let c = c0, g = g0;
  if (Math.abs(tilt) >= 0.02) { ({ c, g } = rotated(c0, tilt)); ({ mask, w, h } = small(c)); }
  const boxes = segment(mask, w, h).map((b) => ({ ...b, x: b.x / sw, y: b.y / sw, w: b.w / sw, h: b.h / sw }));
  return { c, g, boxes, tilt };
}

const softmax = (xs: number[], t: number) => { const m = Math.max(...xs); const e = xs.map((x) => Math.exp((x - m) * t)); const z = e.reduce((a, b) => a + b); return e.map((v) => v / z); };

export interface ScanOptions { useModel?: boolean; modelUrl?: string }
export interface ScanOutput { tiles: ScanResult[]; rows: number; tilt: number; engine: 'model' | 'templates'; segmented: boolean }

/**
 * Recognise tiles. `count` = 0 means auto-detect (multiple rows supported);
 * a fixed count also enables the equal-slot fallback for a single tight row.
 */
export async function scanImage(file: Blob, count: number, opts: ScanOptions = {}): Promise<ScanOutput> {
  const src = await toCanvas(file, 1600);
  const { c, g, boxes: found, tilt } = locate(src.c, src.g);
  let boxes = found;
  let segmented = true;
  if (!boxes.length || (count > 0 && boxes.length !== count)) {
    // Fallback: one row, equal slots (works when tiles touch and lighting is flat).
    const { top, bot, left, right } = findRow(g, c.width, c.height);
    const n = count || Math.max(1, Math.round((right - left) / ((bot - top) * 0.75)));
    const slot = (right - left) / n;
    boxes = Array.from({ length: n }, (_, i) => ({ x: left + i * slot, y: top, w: slot, h: bot - top, row: 0 }));
    segmented = false;
  }
  const net = opts.useModel === false ? null : await loadNet(opts.modelUrl);
  const calib = calibAll().map((x) => ({ tile: x.tile, f: Float32Array.from(x.f), bonus: 0.25 }));
  // Priority among templates: the user's calibration photos > learned corrections > drawn tiles.
  const templates = [...(await builtinTemplates()), ...learned().map((x) => ({ ...x, bonus: 0.15 })), ...calib] as { tile: number; f: Feat; bonus?: number }[];
  const calibrated = new Set(calib.map((x) => x.tile));
  const inp = document.createElement('canvas'); inp.width = IN_W; inp.height = IN_H;
  const ig = inp.getContext('2d', { willReadFrequently: true })!;
  ig.imageSmoothingQuality = 'high';
  const thumb = document.createElement('canvas'); thumb.width = 60; thumb.height = 80;
  const out: ScanResult[] = [];
  for (const b of boxes) {
    const pad = b.w * 0.06, ph = b.h * 0.05;
    const f = featuresFrom(g, b.x + pad, b.y + ph, b.w - 2 * pad, b.h - 2 * ph);
    const best = new Map<number, number>();
    for (const t of templates) {
      const s = similarity(f, t.f) + (t.bonus ?? 0);
      if (s > (best.get(t.tile) ?? -9)) best.set(t.tile, s);
    }
    const tiles = [...best.keys()];
    const pt = softmax(tiles.map((t) => best.get(t)!), 12);
    const prob = new Map(tiles.map((t, k) => [t, pt[k]]));
    if (net) {
      const m = b.w * 0.04;
      ig.drawImage(c, b.x - m, b.y - m, b.w + 2 * m, b.h + 2 * m, 0, 0, IN_W, IN_H);
      const pm = classify(net, toInput(ig.getImageData(0, 0, IN_W, IN_H).data));
      // The model decides; the user's calibration photos get an equal say for tiles they cover.
      // (Blending in the drawn-tile templates measured slightly worse, so they get no weight here.)
      for (let t = 0; t < CLASSES; t++) {
        const wt = calibrated.has(t) ? 0.5 : 0;
        prob.set(t, (1 - wt) * pm[t] + wt * (prob.get(t) ?? 0));
      }
    }
    const ranked = [...prob.entries()].sort((a, b2) => b2[1] - a[1]);
    thumb.getContext('2d')!.drawImage(c, b.x, b.y, b.w, b.h, 0, 0, 60, 80);
    out.push({
      crop: thumb.toDataURL('image/jpeg', 0.8), tile: ranked[0][0],
      confidence: Math.max(0, Math.min(1, ranked[0][1] * 1.2 - ranked[1][1] * 0.5)),
      feat: Array.from(f), alts: ranked.slice(0, 3).map(([tile, score]) => ({ tile, score })),
    });
  }
  return { tiles: out, rows: new Set(boxes.map((b) => b.row)).size, tilt, engine: net ? 'model' : 'templates', segmented };
}
