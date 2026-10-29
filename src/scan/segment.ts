// Pure tile segmentation: finds tile faces in an RGBA frame, supports several
// rows and mild tilt. Touching tiles in a row merge into one blob, which is
// split by the expected tile aspect ratio (≈3:4).
export interface Box { x: number; y: number; w: number; h: number; row: number }

export function faceMask(rgba: ArrayLike<number>, w: number, h: number): Uint8Array {
  // Tile faces are bright and fairly unsaturated (ivory / white).
  const m = new Uint8Array(w * h);
  let sum = 0;
  for (let i = 0; i < w * h; i++) sum += rgba[i * 4] + rgba[i * 4 + 1] + rgba[i * 4 + 2];
  const thr = Math.max(420, Math.min(600, (sum / (w * h)) * 1.25));
  for (let i = 0; i < w * h; i++) {
    const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
    if (r + g + b > thr && Math.max(r, g, b) - Math.min(r, g, b) < 70) m[i] = 1;
  }
  return m;
}

/** Fill holes inside faces (the printed symbols) with a closing on rows/cols. */
function close(m: Uint8Array, w: number, h: number, gap: number) {
  const o = m.slice();
  for (let y = 0; y < h; y++) { let last = -1; for (let x = 0; x < w; x++) if (m[y * w + x]) { if (last >= 0 && x - last <= gap) for (let k = last + 1; k < x; k++) o[y * w + k] = 1; last = x; } }
  const o2 = o.slice();
  for (let x = 0; x < w; x++) { let last = -1; for (let y = 0; y < h; y++) if (o[y * w + x]) { if (last >= 0 && y - last <= gap) for (let k = last + 1; k < y; k++) o2[k * w + x] = 1; last = y; } }
  return o2;
}

export function segment(mask: Uint8Array, w: number, h: number): Box[] {
  const m = close(mask, w, h, Math.max(2, Math.round(Math.min(w, h) / 40)));
  const lab = new Int32Array(w * h).fill(-1);
  const blobs: { x0: number; y0: number; x1: number; y1: number; n: number }[] = [];
  const st: number[] = [];
  for (let i = 0; i < w * h; i++) {
    if (!m[i] || lab[i] >= 0) continue;
    const b = { x0: w, y0: h, x1: 0, y1: 0, n: 0 }, id = blobs.length;
    lab[i] = id; st.push(i);
    while (st.length) {
      const p = st.pop()!, x = p % w, y = (p / w) | 0;
      b.n++; if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x; if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1])
        if (q >= 0 && m[q] && lab[q] < 0) { lab[q] = id; st.push(q); }
    }
    blobs.push(b);
  }
  const area = w * h;
  const big = blobs.filter((b) => b.n > area * 0.0015 && (b.y1 - b.y0) > h * 0.04);
  if (!big.length) return [];
  // Typical tile height = median blob height; split wide blobs by aspect 0.75.
  const hs = big.map((b) => b.y1 - b.y0 + 1).sort((a, b) => a - b);
  const th = hs[hs.length >> 1];
  const boxes: Omit<Box, 'row'>[] = [];
  for (const b of big) {
    const bh = b.y1 - b.y0 + 1, bw = b.x1 - b.x0 + 1;
    if (bh < th * 0.55 || b.n < (bw * bh) * 0.45) continue; // noise / not a face
    const k = Math.max(1, Math.round(bw / (bh * 0.75)));
    for (let j = 0; j < k; j++) boxes.push({ x: b.x0 + (bw * j) / k, y: b.y0, w: bw / k, h: bh });
  }
  // Group into rows by vertical centre.
  boxes.sort((a, b) => a.y + a.h / 2 - (b.y + b.h / 2));
  const rows: Omit<Box, 'row'>[][] = [];
  for (const b of boxes) {
    const r = rows[rows.length - 1];
    if (r && Math.abs(b.y + b.h / 2 - (r[0].y + r[0].h / 2)) < th * 0.5) r.push(b); else rows.push([b]);
  }
  return rows.flatMap((r, i) => r.sort((a, b) => a.x - b.x).map((b) => ({ ...b, row: i })));
}

/** Row tilt in radians from the centres of the boxes in the largest row (least squares). */
export function rowAngle(boxes: Box[]): number {
  const byRow = new Map<number, Box[]>();
  for (const b of boxes) byRow.set(b.row, [...(byRow.get(b.row) ?? []), b]);
  const r = [...byRow.values()].sort((a, b) => b.length - a.length)[0];
  if (!r || r.length < 3) return 0;
  const xs = r.map((b) => b.x + b.w / 2), ys = r.map((b) => b.y + b.h / 2);
  const mx = xs.reduce((a, b) => a + b) / xs.length, my = ys.reduce((a, b) => a + b) / ys.length;
  let num = 0, den = 0;
  for (let i = 0; i < xs.length; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
  return den ? Math.atan(num / den) : 0;
}

/**
 * Tilt (radians, clockwise-positive in image coords) from projection profiles:
 * the angle whose horizontal projection of the face mask is sharpest.
 */
export function estimateTilt(mask: Uint8Array, w: number, h: number, maxAngle = 0.35): number {
  const pts: number[] = [];
  const step = Math.max(1, Math.round(Math.sqrt((w * h) / 40000)));
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) if (mask[y * w + x]) pts.push(x - w / 2, y - h / 2);
  if (pts.length < 20) return 0;
  const bins = Math.ceil(Math.hypot(w, h) / step) + 4; // bin width = step, avoids sampling aliasing
  const score = (a: number) => {
    const s = Math.sin(a), c = Math.cos(a), hist = new Float32Array(bins);
    for (let i = 0; i < pts.length; i += 2) hist[Math.round((-s * pts[i] + c * pts[i + 1]) / step + bins / 2)]++;
    let v = 0; for (let i = 1; i < bins; i++) v += (hist[i] - hist[i - 1]) ** 2;
    return v;
  };
  let best = 0, bs = -1;
  for (let a = -maxAngle; a <= maxAngle + 1e-9; a += 0.01) { const sc = score(a); if (sc > bs) { bs = sc; best = a; } }
  return Math.round(best * 100) / 100;
}
