import { ART_BOUNDS } from './tileBounds';
// Hand-built SVG tiles in the classic Hong Kong melamine style:
// ivory faces with a green bamboo-grain back. Faces 0-33 are playing tiles,
// 34-37 flowers (梅蘭菊竹), 38-41 seasons (春夏秋冬).
import { GLYPHS } from './glyphs';

const RED = '#d0201c', GREEN = '#127a3a', INK = '#141414', IVORY = '#fffef9';
const NUM_ZH = ['一', '二', '三', '四', '伍', '六', '七', '八', '九'];

/** A calligraphy glyph centred at (cx, cy), `size` units tall. Stroke thickens the brush. */
function glyph(ch: string, cx: number, cy: number, size: number, c: string, bold = 26) {
  const k = size / 1000;
  return `<path transform="translate(${(cx - size / 2).toFixed(2)} ${(cy - size / 2).toFixed(2)}) scale(${k.toFixed(4)})" d="${GLYPHS[ch]}" fill="${c}" stroke="${c}" stroke-width="${bold}" stroke-linejoin="round"/>`;
}

// ---- Circles (筒) ----
const G = GREEN, R = RED, K = INK;
const DOTS: [number, number, string][][] = [
  [],
  [[30, 22, G], [30, 56, K]],
  [[15, 18, G], [30, 39, R], [45, 60, K]],
  [[18, 24, G], [42, 24, K], [18, 54, K], [42, 54, G]],
  [[16, 18, G], [44, 18, K], [30, 39, R], [16, 60, K], [44, 60, G]],
  [[19, 16, G], [41, 16, G], [19, 40, R], [41, 40, R], [19, 61, R], [41, 61, R]],
  [[14, 12, G], [30, 19, G], [46, 26, G], [19, 43, R], [41, 43, R], [19, 63, R], [41, 63, R]],
  [[19, 12, K], [41, 12, K], [19, 29, K], [41, 29, K], [19, 46, K], [41, 46, K], [19, 63, K], [41, 63, K]],
  [[14, 15, G], [30, 15, G], [46, 15, G], [14, 38, R], [30, 38, R], [46, 38, R], [14, 61, K], [30, 61, K], [46, 61, K]],
];
const DOT_R = [0, 0, 10.5, 9, 9.5, 8.3, 8.2, 7.4, 7.6, 7.2];
function ring(x: number, y: number, r: number, c: string) {
  return `<circle cx="${x}" cy="${y}" r="${r - r * 0.09}" fill="none" stroke="${c}" stroke-width="${(r * 0.18).toFixed(2)}"/>` +
    `<circle cx="${x}" cy="${y}" r="${(r * 0.56).toFixed(2)}" fill="none" stroke="${c}" stroke-width="${(r * 0.14).toFixed(2)}"/>` +
    `<circle cx="${x}" cy="${y}" r="${(r * 0.22).toFixed(2)}" fill="${c}"/>`;
}
function medallion() {
  let petals = '';
  for (let i = 0; i < 16; i++) petals += `<ellipse cx="30" cy="22.5" rx="2.1" ry="4.2" fill="${GREEN}" transform="rotate(${i * 22.5} 30 39)"/>`;
  return `<circle cx="30" cy="39" r="22" fill="none" stroke="${GREEN}" stroke-width="2.6"/><circle cx="30" cy="39" r="19.2" fill="none" stroke="${GREEN}" stroke-width=".9"/>${petals}` +
    `<circle cx="30" cy="39" r="11" fill="${IVORY}" stroke="${GREEN}" stroke-width="1.4"/><circle cx="30" cy="39" r="8" fill="${RED}"/>` +
    `<path d="M30 33v12M24 39h12" stroke="${IVORY}" stroke-width="1.8" stroke-linecap="round"/><circle cx="30" cy="39" r="2.2" fill="${IVORY}"/><circle cx="30" cy="39" r="1" fill="${RED}"/>`;
}

// ---- Bamboo (索) ----
/** A segmented bamboo stick: two lobes with a joint in the middle and caps at both ends. */
function stick(x: number, y: number, h: number, c: string, angle = 0) {
  const w = 5.4, hh = h / 2;
  const lobe = (y0: number, y1: number) => `<rect x="${-w / 2}" y="${y0}" width="${w}" height="${y1 - y0}" rx="${w / 2}" fill="${c}"/><rect x="-.7" y="${y0 + 2}" width="1.4" height="${y1 - y0 - 4}" rx=".7" fill="${IVORY}" opacity=".85"/>`;
  return `<g transform="translate(${x} ${y}) rotate(${angle})">${lobe(-hh, -0.6)}${lobe(0.6, hh)}` +
    `<rect x="${-w / 2 - 0.9}" y="-1.3" width="${w + 1.8}" height="2.6" rx="1.2" fill="${c}"/>` +
    `<rect x="${-w / 2 - 0.6}" y="${-hh - 0.6}" width="${w + 1.2}" height="2" rx="1" fill="${c}"/><rect x="${-w / 2 - 0.6}" y="${hh - 1.4}" width="${w + 1.2}" height="2" rx="1" fill="${c}"/></g>`;
}
const STICKS: [number, number, string?][][] = [
  [], [],
  [[30, 22], [30, 56]],
  [[30, 22], [18, 56], [42, 56]],
  [[19, 22], [41, 22], [19, 56], [41, 56]],
  [[16, 22], [44, 22], [30, 39, R], [16, 56], [44, 56]],
  [[16, 22], [30, 22], [44, 22], [16, 56], [30, 56], [44, 56]],
  [[30, 14, R], [16, 39], [30, 39], [44, 39], [16, 63], [30, 63], [44, 63]],
  [],
  [[16, 15], [30, 15, R], [44, 15], [16, 39], [30, 39, R], [44, 39], [16, 63], [30, 63, R], [44, 63]],
];
function eightBamboo() {
  // W on top, M below, as on traditional sets.
  const s = (x: number, y: number, a: number) => stick(x, y, 22, GREEN, a);
  return s(13, 24, 0) + s(22.5, 24, -26) + s(37.5, 24, 26) + s(47, 24, 0) +
    s(13, 56, 0) + s(22.5, 56, 26) + s(37.5, 56, -26) + s(47, 56, 0);
}
function bird() {
  return `<g transform="translate(0 1)">` +
    // tail feathers
    `<path d="M33 46 C40 56 44 66 38 74 C36 66 32 60 29 54Z" fill="${GREEN}"/>` +
    `<path d="M30 48 C30 60 27 68 20 73 C22 64 24 57 25 50Z" fill="${RED}"/>` +
    `<path d="M31 50 C35 60 35 68 31 74" stroke="${INK}" stroke-width="1" fill="none"/>` +
    // body
    `<path d="M22 30 C14 36 16 50 28 52 C38 53 42 44 38 36 C35 30 28 28 22 30Z" fill="${GREEN}"/>` +
    `<path d="M24 36 C22 42 26 47 32 46" stroke="${IVORY}" stroke-width="1.4" fill="none"/>` +
    `<path d="M26 38 l3 1 M27 42 l3 0.5" stroke="${RED}" stroke-width="1.3" stroke-linecap="round"/>` +
    // wing
    `<path d="M30 33 C40 30 46 36 44 44 C40 40 35 39 31 40Z" fill="${RED}"/>` +
    `<path d="M32 36 C37 35 40 37 42 40" stroke="${IVORY}" stroke-width=".9" fill="none"/>` +
    // head, crest, beak, eye
    `<path d="M18 24 C18 17 27 15 29 22 C30 27 25 31 21 30Z" fill="${GREEN}"/>` +
    `<path d="M21 17 C19 11 23 7 27 6 C25 10 26 13 25 17Z" fill="${RED}"/><path d="M24 16 C25 11 30 9 33 10 C30 12 28 14 27 18Z" fill="${RED}"/>` +
    `<path d="M18 22 l-6 2 6 2Z" fill="${RED}"/><circle cx="22" cy="22" r="1.7" fill="${IVORY}"/><circle cx="22" cy="22" r=".9" fill="${INK}"/>` +
    // feet
    `<path d="M26 52 l-2 6 M30 52 l1 6" stroke="${RED}" stroke-width="1.3" stroke-linecap="round"/></g>`;
}

// ---- Flowers and seasons ----
function blossom(x: number, y: number, r: number, petals: number, c: string) {
  let p = '';
  for (let i = 0; i < petals; i++) p += `<ellipse cx="${x}" cy="${y - r * 0.62}" rx="${(r * 0.42).toFixed(2)}" ry="${(r * 0.55).toFixed(2)}" fill="none" stroke="${c}" stroke-width="1.2" transform="rotate(${(360 / petals) * i} ${x} ${y})"/>`;
  return p + `<circle cx="${x}" cy="${y}" r="${(r * 0.3).toFixed(2)}" fill="${c}"/>`;
}
const leaf = (d: string) => `<path d="${d}" fill="none" stroke="${GREEN}" stroke-width="1.6" stroke-linecap="round"/>`;
const PLANTS = [
  // plum: branch with blossoms
  () => leaf('M20 72 C24 62 26 56 32 48 M28 54 C34 54 38 58 40 64 M31 50 C30 44 32 40 36 38') + blossom(33, 44, 7, 5, RED) + blossom(41, 62, 4.5, 5, RED) + blossom(22, 56, 3.5, 5, RED),
  // orchid: long arching leaves and a small bloom
  () => leaf('M30 72 C26 60 18 52 12 48 M30 72 C30 60 34 50 42 44 M30 72 C32 62 40 58 48 58 M30 72 C28 62 26 54 28 46') + blossom(28, 44, 5, 5, RED) + `<path d="M36 56 c3 -3 7 -2 8 2 c-3 3 -6 2 -8 -2z" fill="${RED}"/>`,
  // chrysanthemum: dense round bloom on a leafy stem
  () => leaf('M30 72 C30 64 30 58 30 52 M30 64 C24 62 20 58 18 54 M30 62 C36 60 40 56 42 52') + `<path d="M18 54c3-1 5 1 5 3M42 52c-3-1-5 1-5 3" stroke="${GREEN}" stroke-width="2" fill="none"/>` + blossom(30, 44, 9, 12, RED) + blossom(30, 44, 4.5, 8, RED),
  // bamboo: jointed stalks with leaves
  () => `<g stroke="${GREEN}" stroke-width="2.4" stroke-linecap="round"><path d="M22 74V36M34 74V44"/></g>` + `<path d="M19 46h6M19 58h6M31 54h6M31 64h6" stroke="${GREEN}" stroke-width="1.4"/>` + leaf('M22 40 C28 34 36 32 44 34 M34 48 C40 44 46 44 50 46 M22 52 C16 48 12 48 8 50') + `<path d="M44 34l-4 2 1-3zM50 46l-4 1 1-3z" fill="${GREEN}"/>`,
];
const SEASON_PLANTS = [
  // spring: rose with a ribbon bow
  () => leaf('M30 62 V72 M30 66 C24 64 22 60 22 58') + `<path d="M22 72 l8 -4 8 4 -8 0z" fill="none" stroke="${GREEN}" stroke-width="1.4"/>` + blossom(30, 48, 8, 6, RED) + `<path d="M26 40 c4 -4 10 -2 10 2" stroke="${RED}" stroke-width="1.2" fill="none"/>`,
  // summer: lotus on curling stems
  () => leaf('M30 72 C30 64 28 58 30 54 M30 66 C22 66 18 60 20 54 M30 66 C38 66 42 60 40 54 M20 54c-3 0 -4 3 -2 4M40 54c3 0 4 3 2 4') + blossom(30, 46, 8, 7, RED),
  // autumn: twin chrysanthemums
  () => leaf('M30 72 C30 62 28 56 26 50 M30 64 C36 60 38 56 38 52 M30 66 C24 66 20 64 18 60') + blossom(26, 44, 6.5, 8, RED) + blossom(39, 50, 4.5, 6, RED),
  // winter: orchid-like plum under snow
  () => leaf('M30 72 C26 62 20 56 14 54 M30 72 C32 62 38 56 46 52 M30 72 C30 62 32 54 30 46 M30 72 C26 64 22 60 22 52') + blossom(30, 44, 6, 5, RED) + blossom(44, 50, 3.5, 5, RED),
];

export function faceSvg(f: number): string {
  if (f < 9) return glyph(NUM_ZH[f], 30, 21, 26, INK, 34) + glyph('萬', 30, 55, 34, RED, 30);
  if (f < 18) {
    const r = f - 8;
    if (r === 1) return medallion();
    return DOTS[r - 1].map(([x, y, c]) => ring(x, y, DOT_R[r], c)).join('');
  }
  if (f < 27) {
    const r = f - 17;
    if (r === 1) return bird();
    if (r === 8) return eightBamboo();
    const h = r >= 7 ? 20 : 27;
    return STICKS[r].map(([x, y, c]) => stick(x, y, h, c ?? GREEN)).join('');
  }
  if (f < 31) return glyph('東南西北'[f - 27], 30, 39, 46, INK, 30);
  if (f === 31) return glyph('中', 30, 39, 46, RED, 34);
  if (f === 32) return glyph('發', 30, 39, 44, GREEN, 30);
  if (f === 33) return `<rect x="10.5" y="13" width="39" height="52" rx="6" fill="none" stroke="${INK}" stroke-width="4"/><rect x="16.5" y="19" width="27" height="40" rx="3" fill="none" stroke="${INK}" stroke-width="1.6"/>`;
  const isF = f < 38, n = (f - 34) % 4;
  const num = `<path transform="translate(${isF ? 49 : 10} 11.5)" d="${DIGITS[n]}" fill="none" stroke="${RED}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>`;
  const ch = isF ? glyph('梅蘭菊竹'[n], 13, 12, 13, GREEN, 30) : glyph('春夏秋冬'[n], 46, 12, 13, RED, 30);
  return num + ch + (isF ? PLANTS : SEASON_PLANTS)[n]();
}

/** Hand-drawn numerals 1-4 for flowers/seasons (paths, so every device renders them the same). */
const DIGITS = ['M-1.6-4.2L.6-6V6M-2 6H3', 'M-3-3.4C-3-6 3-6.6 3-3C3-.4-3 3-3.2 6H3.4', 'M-3-5.6H3L-.2-1.2C2.8-1.2 3.4 1 3.4 2.4C3.4 6-1.6 7-3.4 4.6', 'M1.6 6V-6L-3.6 2.4H3.8'];

/** Ivory face in tile coordinates and the safe area every drawing must stay inside (8% of tile width margin). */
export const FACE = { x0: 1, y0: 1, x1: 59, y1: 72.5 };
export const SAFE_MARGIN = 0.08 * 60;
export const SAFE = { x0: FACE.x0 + SAFE_MARGIN, y0: FACE.y0 + SAFE_MARGIN, x1: FACE.x1 - SAFE_MARGIN, y1: FACE.y1 - SAFE_MARGIN };

/** Target fill: the drawing's larger relative dimension covers 82% of the face, like the reference set. */
export const FILL = 0.82;

/** Centres the drawing on the face and scales it so its limiting dimension fills FILL of the face (stays inside SAFE). */
export function artTransform(f: number): string {
  const [x0, y0, x1, y1] = ART_BOUNDS[f];
  const s = Math.min((FACE.x1 - FACE.x0) * FILL / (x1 - x0), (FACE.y1 - FACE.y0) * FILL / (y1 - y0));
  const cx = (SAFE.x0 + SAFE.x1) / 2, cy = (SAFE.y0 + SAFE.y1) / 2;
  return `translate(${cx} ${cy}) scale(${s.toFixed(4)}) translate(${(-(x0 + x1) / 2).toFixed(2)} ${(-(y0 + y1) / 2).toFixed(2)})`;
}

/** Full tile: green bamboo-grain back showing as thickness, ivory face with a soft bevel. */
export function tileSvg(f: number, opts: { back?: boolean } = {}): string {
  const defs = `<defs>` +
    `<linearGradient id="iv" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#f8f7f1"/><stop offset="1" stop-color="#e9e7de"/></linearGradient>` +
    `<linearGradient id="gb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0f6b3c"/><stop offset=".5" stop-color="#1d9653"/><stop offset="1" stop-color="#0c5a32"/></linearGradient>` +
    `<pattern id="grain" width="60" height="5" patternUnits="userSpaceOnUse"><path d="M0 1.5 C15 0.8 30 2.2 60 1.2" stroke="#7fd19c" stroke-width=".6" fill="none" opacity=".55"/><path d="M0 3.8 C20 4.4 40 3.2 60 4" stroke="#0a4426" stroke-width=".5" fill="none" opacity=".5"/></pattern></defs>`;
  const back = `<rect x="1" y="3" width="58" height="76" rx="8" fill="url(#gb)"/><rect x="1" y="3" width="58" height="76" rx="8" fill="url(#grain)"/>`;
  const body = opts.back
    ? `<rect x="1" y="1" width="58" height="78" rx="8" fill="url(#gb)"/><rect x="1" y="1" width="58" height="78" rx="8" fill="url(#grain)"/><rect x="5" y="5" width="50" height="70" rx="6" fill="none" stroke="#ffffff" stroke-opacity=".18"/>`
    : back + `<rect x="1" y="1" width="58" height="73" rx="8" fill="#e2dfd3"/><rect x="1" y="1" width="58" height="71.5" rx="8" fill="url(#iv)"/>` +
      `<path d="M9 2.2 H51" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".9"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80">${defs}${body}` +
    (opts.back ? '' : `<g transform="${artTransform(f)}">${faceSvg(f)}</g>`) + `</svg>`;
}
