// Tiny on-device CNN (≈426k params, int8 weights ≈430 KB) for single-tile
// classification. Pure TypeScript runtime: no WASM/WebGL dependency, works
// offline once the weights are cached. Architecture mirrors training/model_def.py:
// 4 × [conv3×3-ReLU, conv3×3-ReLU, maxpool2] → global avg pool → linear(42).
export const IN_H = 64, IN_W = 48, CLASSES = 42;
const SHAPES: [number, number][] = [[24, 3], [24, 24], [48, 24], [48, 48], [96, 48], [96, 96], [128, 96], [128, 128]];

export interface Layer { o: number; i: number; k: number; w: Float32Array; b: Float32Array }
export interface Net { convs: Layer[]; fc: Layer }

/** Parse the flat weight file written by training/export.py. */
export function parseWeights(buf: ArrayBuffer): Net {
  let off = 0;
  const read = (o: number, i: number, k: number): Layer => {
    const sc = new Float32Array(buf, off, o); off += o * 4;
    const b = new Float32Array(buf.slice(off, off + o * 4)); off += o * 4;
    const n = i * k * k, q = new Int8Array(buf, off, o * n); off += o * n;
    off = (off + 3) & ~3;
    const w = new Float32Array(o * n);
    for (let c = 0; c < o; c++) for (let j = 0; j < n; j++) w[c * n + j] = q[c * n + j] * sc[c];
    return { o, i, k, w, b };
  };
  const convs = SHAPES.map(([o, i]) => read(o, i, 3));
  const fc = read(CLASSES, 128, 1);
  if (off !== buf.byteLength) throw new Error(`weight file size mismatch ${off} != ${buf.byteLength}`);
  return { convs, fc };
}

function conv3relu(x: Float32Array, C: number, H: number, W: number, L: Layer): Float32Array {
  const out = new Float32Array(L.o * H * W);
  for (let o = 0; o < L.o; o++) {
    const ob = o * H * W;
    out.fill(L.b[o], ob, ob + H * W);
    for (let c = 0; c < C; c++) {
      const xb = c * H * W, wb = (o * C + c) * 9;
      for (let ky = 0; ky < 3; ky++) for (let kx = 0; kx < 3; kx++) {
        const wv = L.w[wb + ky * 3 + kx]; if (wv === 0) continue;
        const dy = ky - 1, dx = kx - 1;
        const y0 = Math.max(0, -dy), y1 = Math.min(H, H - dy), x0 = Math.max(0, -dx), x1 = Math.min(W, W - dx);
        for (let y = y0; y < y1; y++) {
          const orow = ob + y * W, irow = xb + (y + dy) * W + dx;
          for (let xx = x0; xx < x1; xx++) out[orow + xx] += wv * x[irow + xx];
        }
      }
    }
    for (let p = ob; p < ob + H * W; p++) if (out[p] < 0) out[p] = 0;
  }
  return out;
}
function pool2(x: Float32Array, C: number, H: number, W: number) {
  const h = H >> 1, w = W >> 1, out = new Float32Array(C * h * w);
  for (let c = 0; c < C; c++) for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
    const i = c * H * W + 2 * y * W + 2 * xx;
    out[c * h * w + y * w + xx] = Math.max(x[i], x[i + 1], x[i + W], x[i + W + 1]);
  }
  return out;
}

/** `x` is CHW RGB in [0,1], size 3×64×48. Returns softmax probabilities for faces 0..41. */
export function classify(net: Net, x: Float32Array): Float32Array {
  let C = 3, H = IN_H, W = IN_W, a = x;
  for (let b = 0; b < 4; b++) {
    a = conv3relu(a, C, H, W, net.convs[2 * b]); C = net.convs[2 * b].o;
    a = conv3relu(a, C, H, W, net.convs[2 * b + 1]);
    a = pool2(a, C, H, W); H >>= 1; W >>= 1;
  }
  const g = new Float32Array(C);
  for (let c = 0; c < C; c++) { let s = 0; for (let p = 0; p < H * W; p++) s += a[c * H * W + p]; g[c] = s / (H * W); }
  const logits = new Float32Array(CLASSES);
  let mx = -Infinity;
  for (let k = 0; k < CLASSES; k++) { let s = net.fc.b[k]; for (let c = 0; c < C; c++) s += net.fc.w[k * C + c] * g[c]; logits[k] = s; if (s > mx) mx = s; }
  let z = 0; for (let k = 0; k < CLASSES; k++) { logits[k] = Math.exp(logits[k] - mx); z += logits[k]; }
  for (let k = 0; k < CLASSES; k++) logits[k] /= z;
  return logits;
}

/** RGBA (ImageData bytes) at 48×64 → CHW float input. */
export function toInput(rgba: ArrayLike<number>): Float32Array {
  const n = IN_H * IN_W, x = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) { x[i] = rgba[i * 4] / 255; x[n + i] = rgba[i * 4 + 1] / 255; x[2 * n + i] = rgba[i * 4 + 2] / 255; }
  return x;
}

let netP: Promise<Net | null> | null = null;
/** Lazy-load the weights (fetched only when a scan first needs them; cached by the service worker). */
export function loadNet(url = new URL('./model/tiles-v1.bin', document.baseURI).href as string | undefined): Promise<Net | null> {
  url ??= new URL('./model/tiles-v1.bin', document.baseURI).href;
  netP ??= fetch(url).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status))).then(parseWeights).catch(() => null);
  return netP;
}
