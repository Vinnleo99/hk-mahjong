import { Tile, counts, isHonor, isWind, isDragon, isTerminal, isTerminalOrHonor, suitOf, ORPHANS, WIND_ZH, NUM_TILES } from './tiles';

export type MeldType = 'chow' | 'pung' | 'kong';
export interface Meld {
  type: MeldType;
  /** For chow: lowest tile. For pung/kong: the tile. */
  tile: Tile;
  /** Concealed kong (暗槓). Only meaningful for kongs. */
  concealed?: boolean;
}
import { Rules, DEFAULT_RULES } from './rules';
export type { Rules } from './rules';
export { DEFAULT_RULES } from './rules';

export interface WinContext {
  /** Concealed tiles in hand INCLUDING the winning tile. */
  concealed: Tile[];
  /** Declared melds (exposed or concealed kongs). */
  melds: Meld[];
  winTile: Tile;
  selfDrawn: boolean;
  seatWind: number; // 0..3
  roundWind: number; // 0..3
  flowers: number[]; // 1..4 (梅蘭菊竹)
  seasons: number[]; // 1..4 (春夏秋冬)
  lastTile?: boolean; // 海底撈月 / 河底撈魚
  kongReplacement?: boolean; // 槓上開花
  robbingKong?: boolean; // 搶槓
  heavenly?: boolean; // 天糊
  earthly?: boolean; // 地糊
}
export interface FaanItem { name: string; zh: string; faan: number; limit?: boolean }
export interface Score {
  valid: boolean; // is a complete winning shape
  faan: number; // capped at limit
  rawFaan: number;
  items: FaanItem[];
  meetsMinimum: boolean;
  isLimit: boolean;
  reason?: string;
}

type SetKind = { kind: 'chow' | 'pung'; tile: Tile; open: boolean; kong?: boolean };
interface Decomp { sets: SetKind[]; pair: Tile }

/** All ways to split concealed tile counts into sets + one pair. */
export function decompose(tiles: Tile[], setsNeeded: number): { sets: { kind: 'chow' | 'pung'; tile: Tile }[]; pair: Tile }[] {
  const c = counts(tiles);
  if (tiles.length !== setsNeeded * 3 + 2) return [];
  const results: { sets: { kind: 'chow' | 'pung'; tile: Tile }[]; pair: Tile }[] = [];
  for (let p = 0; p < NUM_TILES; p++) {
    if (c[p] < 2) continue;
    c[p] -= 2;
    const acc: { kind: 'chow' | 'pung'; tile: Tile }[] = [];
    const rec = (i: number) => {
      while (i < NUM_TILES && c[i] === 0) i++;
      if (i === NUM_TILES) { results.push({ sets: [...acc], pair: p }); return; }
      if (c[i] >= 3) { c[i] -= 3; acc.push({ kind: 'pung', tile: i }); rec(i); acc.pop(); c[i] += 3; }
      if (i < 27 && i % 9 <= 6 && c[i + 1] > 0 && c[i + 2] > 0) {
        c[i]--; c[i + 1]--; c[i + 2]--; acc.push({ kind: 'chow', tile: i }); rec(i); acc.pop(); c[i]++; c[i + 1]++; c[i + 2]++;
      }
    };
    rec(0);
    c[p] += 2;
  }
  return results;
}

function allTilesOf(ctx: WinContext): Tile[] {
  const t = [...ctx.concealed];
  for (const m of ctx.melds) {
    if (m.type === 'chow') t.push(m.tile, m.tile + 1, m.tile + 2);
    else if (m.type === 'kong') t.push(m.tile, m.tile, m.tile, m.tile);
    else t.push(m.tile, m.tile, m.tile);
  }
  return t;
}

function isThirteenOrphans(c: number[]) {
  let pair = 0;
  for (let i = 0; i < NUM_TILES; i++) {
    const o = ORPHANS.includes(i);
    if (!o && c[i]) return false;
    if (o && c[i] === 0) return false;
    if (c[i] === 2) pair++;
    if (c[i] > 2) return false;
  }
  return pair === 1;
}
function isSevenPairs(c: number[]) {
  return c.reduce((a, b) => a + b, 0) === 14 && c.every((x) => x === 0 || x === 2);
}
function isNineGates(c: number[]) {
  for (let s = 0; s < 3; s++) {
    const base = s * 9;
    const total = c.reduce((a, b) => a + b, 0);
    if (c.slice(base, base + 9).reduce((a, b) => a + b, 0) !== 14 || total !== 14) continue;
    const need = [3, 1, 1, 1, 1, 1, 1, 1, 3];
    if (need.every((n, i) => c[base + i] >= n)) return true;
  }
  return false;
}

/** Faan items common to every hand shape (bonus tiles + winning circumstances). */
function circumstanceItems(ctx: WinContext, concealedHand: boolean, r: Rules): FaanItem[] {
  const items: FaanItem[] = [];
  const add = (faan: number, name: string, zh: string) => { if (faan > 0) items.push({ name, zh, faan }); };
  if (ctx.selfDrawn) add(r.selfDrawnFaan, 'Self-drawn', '自摸');
  if (concealedHand) add(r.concealedFaan, 'Concealed hand', '門前清');
  if (concealedHand && ctx.selfDrawn) add(r.concealedSelfDrawnBonus, 'Fully concealed self-draw', '不求人');
  if (ctx.lastTile) add(r.lastTileFaan, ctx.selfDrawn ? 'Win on last tile' : 'Win on last discard', ctx.selfDrawn ? '海底撈月' : '河底撈魚');
  if (ctx.kongReplacement) add(r.kongReplacementFaan, 'Win on kong replacement', '槓上開花');
  if (ctx.robbingKong) add(r.robbingKongFaan, 'Robbing the kong', '搶槓');
  if (r.flowersInPlay) {
    const nf = ctx.flowers.length + ctx.seasons.length;
    if (nf === 0) add(r.noFlowerFaan, 'No flowers', '無花');
    else {
      const seat = ctx.seatWind + 1;
      if (ctx.flowers.includes(seat)) add(r.seatFlowerFaan, 'Seat flower', '正花');
      if (ctx.seasons.includes(seat)) add(r.seatFlowerFaan, 'Seat season', '正季');
      if (ctx.flowers.length === 4) add(r.flowerSetFaan, 'Complete flower set', '一台花');
      if (ctx.seasons.length === 4) add(r.flowerSetFaan, 'Complete season set', '一台花');
    }
  }
  return items;
}

function limitItem(name: string, zh: string, rules: Rules): FaanItem {
  return { name, zh, faan: rules.limit, limit: true };
}

function finalize(items: FaanItem[], rules: Rules): Score {
  const isLimit = items.some((i) => i.limit);
  const raw = isLimit ? rules.limit : items.reduce((a, b) => a + b.faan, 0);
  const faan = Math.min(raw, rules.limit);
  if (raw === 0) items = [{ name: 'Chicken hand', zh: '雞糊', faan: 0 }];
  const meetsMinimum = raw === 0 ? rules.chickenHand : faan >= rules.minFaan;
  return { valid: true, faan, rawFaan: raw, items, isLimit: isLimit || raw >= rules.limit, meetsMinimum };
}

function scoreStandard(ctx: WinContext, d: Decomp, rules: Rules): FaanItem[] {
  const items: FaanItem[] = [];
  const sets = d.sets;
  const all = allTilesOf(ctx);
  const suits = new Set(all.filter((t) => !isHonor(t)).map(suitOf));
  const hasHonor = all.some(isHonor);
  const pungs = sets.filter((s) => s.kind === 'pung');
  const kongs = sets.filter((s) => s.kong);
  const concealedPungs = pungs.filter((s) => !s.open);
  const concealedHand = ctx.melds.every((m) => m.type === 'kong' && m.concealed);

  // ---- Limit hands ----
  const limits: FaanItem[] = [];
  if (ctx.heavenly) limits.push(limitItem('Heavenly hand', '天糊', rules));
  if (ctx.earthly) limits.push(limitItem('Earthly hand', '地糊', rules));
  if (all.every(isHonor)) limits.push(limitItem('All honours', '字一色', rules));
  if (all.every(isTerminal)) limits.push(limitItem('All terminals', '清么九', rules));
  if (kongs.length === 4) limits.push(limitItem('Four kongs', '十八羅漢', rules));
  if (concealedPungs.length === 4) limits.push(limitItem('Four concealed pungs', '坎坎糊', rules));
  const windPungs = pungs.filter((s) => isWind(s.tile)).length;
  if (windPungs === 4) limits.push(limitItem('Great four winds', '大四喜', rules));
  if (ctx.melds.length === 0 && isNineGates(counts(all))) limits.push(limitItem('Nine gates', '九子連環', rules));
  if (ctx.flowers.length + ctx.seasons.length === 8) limits.push(limitItem('All eight flowers', '八仙過海', rules));
  if (limits.length) return [...limits];

  // ---- Shape patterns ----
  const half = Math.floor(rules.limit / 2);
  if (sets.every((s) => s.kind === 'chow')) items.push({ name: 'Common hand', zh: '平糊', faan: rules.commonHandFaan });
  if (sets.every((s) => s.kind === 'pung')) items.push({ name: 'All pungs', zh: '對對糊', faan: rules.allPungsFaan });
  if (suits.size === 1 && !hasHonor) items.push({ name: 'Pure one suit', zh: '清一色', faan: rules.pureSuitFaan });
  else if (suits.size === 1 && hasHonor) items.push({ name: 'Mixed one suit', zh: '混一色', faan: rules.mixedSuitFaan });
  if (all.every(isTerminalOrHonor) && hasHonor) items.push({ name: 'Mixed terminals', zh: '混么九', faan: 1 });

  // Dragons
  const dragonPungs = pungs.filter((s) => isDragon(s.tile)).length;
  if (dragonPungs === 3) items.push({ name: 'Great three dragons', zh: '大三元', faan: rules.halfLimitHands ? half : 8 });
  else if (dragonPungs === 2 && isDragon(d.pair)) items.push({ name: 'Small three dragons', zh: '小三元', faan: 5 });
  else for (const s of pungs) if (isDragon(s.tile)) items.push({ name: `Dragon pung`, zh: ['中', '發', '白'][s.tile - 31], faan: 1 });

  // Winds
  if (windPungs === 3 && isWind(d.pair)) items.push({ name: 'Small four winds', zh: '小四喜', faan: rules.halfLimitHands ? half : 6 });
  else {
    for (const s of pungs) {
      if (!isWind(s.tile)) continue;
      const w = s.tile - 27;
      if (w === ctx.seatWind) items.push({ name: 'Seat wind pung', zh: `門風 ${WIND_ZH[w]}`, faan: 1 });
      if (w === ctx.roundWind) items.push({ name: 'Round wind pung', zh: `圈風 ${WIND_ZH[w]}`, faan: 1 });
    }
  }
  return [...items, ...circumstanceItems(ctx, concealedHand, rules)];
}

/** Evaluate a complete hand. Picks the highest-scoring interpretation. */
export function scoreHand(ctx: WinContext, rules: Rules = DEFAULT_RULES): Score {
  const kongCount = ctx.melds.length;
  const setsNeeded = 4 - kongCount;
  const invalid = (reason: string): Score => ({ valid: false, faan: 0, rawFaan: 0, items: [], meetsMinimum: false, isLimit: false, reason });
  if (ctx.concealed.length !== setsNeeded * 3 + 2) return invalid(`Need ${setsNeeded * 3 + 2} concealed tiles (have ${ctx.concealed.length}).`);
  if (!ctx.concealed.includes(ctx.winTile)) return invalid('Winning tile must be in the hand.');
  const total = counts(allTilesOf(ctx));
  if (total.some((x) => x > 4)) return invalid('More than four of a tile.');
  for (const m of ctx.melds) if (m.type === 'chow' && (m.tile >= 27 || m.tile % 9 > 6)) return invalid('Invalid chow.');

  const candidates: FaanItem[][] = [];
  const meldSets: SetKind[] = ctx.melds.map((m) => ({
    kind: m.type === 'chow' ? 'chow' : 'pung', tile: m.tile, open: !(m.type === 'kong' && m.concealed), kong: m.type === 'kong',
  }));

  const cc = counts(ctx.concealed);
  if (ctx.melds.length === 0 && isThirteenOrphans(cc)) {
    candidates.push([limitItem('Thirteen orphans', '十三么', rules)]);
  }
  if (rules.sevenPairs && ctx.melds.length === 0 && isSevenPairs(cc)) {
    const items: FaanItem[] = [{ name: 'Seven pairs (house rule)', zh: '七對', faan: rules.sevenPairsFaan }];
    const all = ctx.concealed;
    const suits = new Set(all.filter((t) => !isHonor(t)).map(suitOf));
    const hasHonor = all.some(isHonor);
    if (all.every(isHonor)) items.splice(0, 1, limitItem('All honours', '字一色', rules));
    else if (suits.size === 1 && !hasHonor) items.push({ name: 'Pure one suit', zh: '清一色', faan: rules.pureSuitFaan });
    else if (suits.size === 1) items.push({ name: 'Mixed one suit', zh: '混一色', faan: rules.mixedSuitFaan });
    candidates.push(items.some((i) => i.limit) ? items.filter((i) => i.limit) : [...items, ...circumstanceItems(ctx, true, rules)]);
  }

  for (const d of decompose(ctx.concealed, setsNeeded)) {
    // Determine which concealed pung (if any) was completed by a discard.
    const variants: SetKind[][] = [];
    const base: SetKind[] = d.sets.map((s) => ({ kind: s.kind, tile: s.tile, open: false }));
    if (ctx.selfDrawn) variants.push(base);
    else {
      // The winning discard completes one group containing winTile; try each.
      const options: number[] = [];
      base.forEach((s, i) => {
        if (s.kind === 'pung' ? s.tile === ctx.winTile : ctx.winTile >= s.tile && ctx.winTile <= s.tile + 2) options.push(i);
      });
      if (d.pair === ctx.winTile) variants.push(base);
      for (const i of options) variants.push(base.map((s, j) => (j === i && s.kind === 'pung' ? { ...s, open: true } : s)));
    }
    for (const v of variants) candidates.push(scoreStandard(ctx, { sets: [...meldSets, ...v], pair: d.pair }, rules));
  }
  if (!candidates.length) return invalid('Not a winning hand (needs four sets and a pair).');
  const scored = candidates.map((c) => finalize(c, rules));
  scored.sort((a, b) => b.faan - a.faan || b.rawFaan - a.rawFaan);
  return scored[0];
}

export interface Wait { tile: Tile; score: Score }
/** For a hand one tile short, list every tile that completes it. */
export function findWaits(ctx: Omit<WinContext, 'winTile'>, rules: Rules = DEFAULT_RULES): Wait[] {
  const waits: Wait[] = [];
  const total = counts(allTilesOf({ ...ctx, winTile: 0 }));
  for (let t = 0; t < NUM_TILES; t++) {
    if (total[t] >= 4) continue;
    const s = scoreHand({ ...ctx, concealed: [...ctx.concealed, t], winTile: t }, rules);
    if (s.valid) waits.push({ tile: t, score: s });
  }
  return waits;
}
