// Pure SVG renderer for tile faces. Faces 0-33 are playing tiles,
// 34-37 flowers (梅蘭菊竹), 38-41 seasons (春夏秋冬).
const NUM_ZH = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
const RED = '#c62828', GREEN = '#1b7a43', BLUE = '#1f3c88', INK = '#1c1c28';

const DOT_POS: number[][][] = [
  [[30, 40]],
  [[30, 24], [30, 56]],
  [[16, 18], [30, 40], [44, 62]],
  [[18, 24], [42, 24], [18, 56], [42, 56]],
  [[18, 20], [42, 20], [30, 40], [18, 60], [42, 60]],
  [[19, 18], [41, 18], [19, 40], [41, 40], [19, 62], [41, 62]],
  [[14, 14], [30, 21], [46, 28], [19, 46], [41, 46], [19, 64], [41, 64]],
  [[19, 13], [41, 13], [19, 31], [41, 31], [19, 49], [41, 49], [19, 67], [41, 67]],
  [[15, 16], [30, 16], [45, 16], [15, 40], [30, 40], [45, 40], [15, 64], [30, 64], [45, 64]],
];
const DOT_COL = (r: number, i: number) => {
  if (r === 1) return RED;
  if (r === 2 || r === 8) return i % 2 ? BLUE : GREEN;
  if (r === 3) return [BLUE, RED, GREEN][i];
  if (r === 5) return i === 2 ? RED : i % 2 ? GREEN : BLUE;
  if (r === 7) return i < 3 ? GREEN : RED;
  if (r === 9) return [BLUE, BLUE, BLUE, RED, RED, RED, GREEN, GREEN, GREEN][i];
  return i % 2 ? GREEN : BLUE;
};
function dot(x: number, y: number, r: number, c: string) {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/><circle cx="${x}" cy="${y}" r="${r * 0.62}" fill="#fffaf0"/><circle cx="${x}" cy="${y}" r="${r * 0.36}" fill="${c}"/>`;
}
const STICK_POS: number[][][] = [
  [],
  [[30, 24], [30, 56]],
  [[30, 22], [18, 56], [42, 56]],
  [[19, 24], [41, 24], [19, 56], [41, 56]],
  [[17, 24], [43, 24], [30, 40], [17, 56], [43, 56]],
  [[16, 24], [30, 24], [44, 24], [16, 56], [30, 56], [44, 56]],
  [[30, 15], [16, 40], [30, 40], [44, 40], [16, 64], [30, 64], [44, 64]],
  [[16, 22], [30, 22], [44, 22], [23, 40], [37, 40], [16, 58], [30, 58], [44, 58]],
  [[16, 16], [30, 16], [44, 16], [16, 40], [30, 40], [44, 40], [16, 64], [30, 64], [44, 64]],
];
function stick(x: number, y: number, c: string, h: number) {
  return `<g transform="translate(${x} ${y})"><rect x="-3.2" y="${-h / 2}" width="6.4" height="${h}" rx="3" fill="${c}"/><rect x="-3.6" y="-1.2" width="7.2" height="2.4" rx="1" fill="#0d4d2a"/><rect x="-1" y="${-h / 2 + 2}" width="2" height="${h - 4}" rx="1" fill="#ffffff" opacity=".35"/></g>`;
}
function bird() {
  return `<g transform="translate(30 42)"><ellipse cx="0" cy="6" rx="11" ry="14" fill="${GREEN}"/><circle cx="0" cy="-12" r="7" fill="${RED}"/><circle cx="2" cy="-13" r="1.6" fill="#fff"/><path d="M6 -12 l7 2 -7 2z" fill="#e0a800"/><path d="M-11 6 q-10 10 -4 22 M0 18 q0 10 0 14 M11 6 q10 10 4 22" stroke="${BLUE}" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="0" cy="6" r="4" fill="#fffaf0"/><circle cx="0" cy="6" r="2" fill="${BLUE}"/></g>`;
}
function text(s: string, y: number, size: number, c: string) {
  return `<text x="30" y="${y}" font-size="${size}" text-anchor="middle" dominant-baseline="central" fill="${c}" font-family="'Noto Serif TC','Songti TC','PMingLiU',serif" font-weight="700">${s}</text>`;
}

export function faceSvg(f: number): string {
  if (f < 9) return text(NUM_ZH[f], 24, 26, INK) + text('萬', 56, 30, RED);
  if (f < 18) {
    const r = f - 8;
    const rad = [0, 17, 11, 9, 9, 8.5, 7.5, 6.8, 6.5, 6.5][r];
    return DOT_POS[r - 1].map(([x, y], i) => dot(x, y, rad, DOT_COL(r, i))).join('');
  }
  if (f < 27) {
    const r = f - 17;
    if (r === 1) return bird();
    const h = r >= 6 ? 18 : 26;
    return STICK_POS[r - 1].map(([x, y], i) => stick(x, y, (r === 5 && i === 2) || (r === 7 && i === 0) || (r === 9 && i % 3 === 1) ? RED : GREEN, h)).join('');
  }
  if (f < 31) return text(['東', '南', '西', '北'][f - 27], 41, 40, INK);
  if (f === 31) return text('中', 41, 42, RED);
  if (f === 32) return text('發', 41, 40, GREEN);
  if (f === 33) return `<rect x="12" y="14" width="36" height="52" rx="4" fill="none" stroke="${BLUE}" stroke-width="4"/><rect x="18" y="20" width="24" height="40" rx="2" fill="none" stroke="${BLUE}" stroke-width="1.5"/>`;
  const isF = f < 38;
  const n = (f - 34) % 4;
  const ch = isF ? '梅蘭菊竹'[n] : '春夏秋冬'[n];
  const col = isF ? ['#c2185b', '#6a1b9a', '#e09b00', GREEN][n] : ['#2e7d32', RED, '#d84315', BLUE][n];
  return `<text x="10" y="14" font-size="12" fill="${col}" font-weight="700" font-family="sans-serif">${n + 1}</text>` +
    `<circle cx="30" cy="44" r="15" fill="${col}" opacity=".12"/>` + text(ch, 44, 30, col);
}

/** Full tile with body, bevel and shadow. */
export function tileSvg(f: number, opts: { back?: boolean } = {}): string {
  const body = opts.back
    ? `<rect x="1" y="1" width="58" height="78" rx="8" fill="url(#bk)"/>`
    : `<rect x="1" y="3" width="58" height="76" rx="8" fill="#1f7a55"/><rect x="1" y="1" width="58" height="74" rx="8" fill="url(#iv)" stroke="#d9cfb7" stroke-width="1"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80"><defs>` +
    `<linearGradient id="iv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffdf6"/><stop offset="1" stop-color="#efe7d2"/></linearGradient>` +
    `<linearGradient id="bk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a9d6f"/><stop offset="1" stop-color="#145c41"/></linearGradient></defs>` +
    body + (opts.back ? '' : `<g transform="translate(0 -2)">${faceSvg(f)}</g>`) + `</svg>`;
}
