// Tile indices: 0-8 characters (萬), 9-17 dots (筒), 18-26 bamboo (索),
// 27-30 winds E S W N, 31-33 dragons Red(中) Green(發) White(白)
export type Tile = number;
export const NUM_TILES = 34;
export const WINDS = ['East', 'South', 'West', 'North'] as const;
export const WIND_ZH = ['東', '南', '西', '北'];
export const DRAGON_ZH = ['中', '發', '白'];
export const DRAGON_NAMES = ['Red Dragon', 'Green Dragon', 'White Dragon'];
export const SUIT_NAMES = ['Characters', 'Dots', 'Bamboo'];

export const suitOf = (t: Tile) => (t < 27 ? Math.floor(t / 9) : 3); // 3 = honor
export const rankOf = (t: Tile) => (t < 27 ? (t % 9) + 1 : 0);
export const isHonor = (t: Tile) => t >= 27;
export const isWind = (t: Tile) => t >= 27 && t <= 30;
export const isDragon = (t: Tile) => t >= 31;
export const isTerminal = (t: Tile) => t < 27 && (t % 9 === 0 || t % 9 === 8);
export const isTerminalOrHonor = (t: Tile) => isHonor(t) || isTerminal(t);
export const ORPHANS: Tile[] = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];

const CODES = ['m', 'p', 's'];
/** Short code, e.g. "5m", "E", "C" (red), "F" (green), "P" (white). */
export function tileCode(t: Tile): string {
  if (t < 27) return `${rankOf(t)}${CODES[suitOf(t)]}`;
  return ['E', 'S', 'W', 'N', 'C', 'F', 'P'][t - 27];
}
export function tileName(t: Tile): string {
  if (t < 27) return `${rankOf(t)} ${SUIT_NAMES[suitOf(t)]}`;
  if (isWind(t)) return `${WINDS[t - 27]} Wind`;
  return DRAGON_NAMES[t - 31];
}
/** Parse "123m 456p EEE CC" style strings. Used by tests. */
export function parseTiles(s: string): Tile[] {
  const out: Tile[] = [];
  let digits: number[] = [];
  for (const ch of s.replace(/\s+/g, '')) {
    if (/[1-9]/.test(ch)) digits.push(+ch);
    else if ('mps'.includes(ch)) {
      const base = 'mps'.indexOf(ch) * 9;
      digits.forEach((d) => out.push(base + d - 1));
      digits = [];
    } else {
      const i = 'ESWNCFP'.indexOf(ch);
      if (i < 0) throw new Error(`bad tile ${ch}`);
      out.push(27 + i);
    }
  }
  return out;
}
export function counts(tiles: Tile[]): number[] {
  const c = new Array(NUM_TILES).fill(0);
  tiles.forEach((t) => c[t]++);
  return c;
}
