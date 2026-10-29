import { describe, it, expect } from 'vitest';
import { explainItem, explainPayout, closeHints, EXPLAIN, RULE_HELP, PATTERNS } from '../src/beginner';
import { scoreHand, WinContext } from '../src/engine/scoring';
import { PRESETS, Rules, BASE_RULES } from '../src/engine/rules';
import { parseTiles } from '../src/engine/tiles';

const ctx = (s: string, o: Partial<WinContext> = {}): WinContext => {
  const c = parseTiles(s);
  return { concealed: c, melds: [], winTile: c[c.length - 1], selfDrawn: false, seatWind: 0, roundWind: 0, flowers: [2], seasons: [], ...o } as WinContext;
};
describe('beginner explanations', () => {
  it('every faan item the engine can produce has a plain explanation', () => {
    const hands = ['123m456m789p234s55s', '111m555p999sEEECC', '11123456789999s', '19m19p19sESWNCFPP', '123p456p888pEEECC', 'CCCFFF123m456pPP'];
    for (const h of hands) for (const sd of [true, false]) {
      const s = scoreHand(ctx(h, { selfDrawn: sd }));
      for (const i of s.items) expect(EXPLAIN[i.name], i.name).toBeDefined();
    }
  });
  it('explains why a seat wind pung applies', () => {
    const c = ctx('EEE123m456p789s11s', { seatWind: 0, roundWind: 1 });
    const it_ = scoreHand(c).items.find((i) => i.name === 'Seat wind pung')!;
    expect(explainItem(it_, c).why).toMatch(/sit East/);
  });
  it('payout steps: half-spicy self-drawn', () => {
    const s = explainPayout(3, true, BASE_RULES);
    expect(s.join(' ')).toMatch(/3 faan = 8 points/);
    expect(s.join(' ')).toMatch(/collect 24/);
  });
  it('payout steps: discarder pays all on the traditional preset', () => {
    const r = PRESETS.find((p) => p.id === 'traditional')!.rules;
    expect(explainPayout(3, false, r).join(' ')).toMatch(/pays double, 16/);
  });
  it('payout steps: caps at limit', () => {
    expect(explainPayout(15, true, BASE_RULES)[0]).toMatch(/counts as 13/);
  });
  it('close hint: a 1-faan discard win shows self-drawn would help and how short it is', () => {
    const r: Rules = { ...BASE_RULES, minFaan: 3 };
    const c = ctx('123m456m789p234s55s', { flowers: [2] }); // common hand 1 + concealed 1 = 2
    const s = scoreHand(c, r);
    expect(s.meetsMinimum).toBe(false);
    const h = closeHints(c, r, s);
    expect(h[0]).toMatch(/short/);
    expect(h.join(' ')).toMatch(/self-drawn\), it would have been 3 faan – enough/);
  });
  it('no hints for a winning hand', () => {
    const c = ctx('111m555p999sEEECC');
    expect(closeHints(c, BASE_RULES, scoreHand(c))).toEqual([]);
  });
  it('every numeric and on/off rule has a tooltip', () => {
    for (const k of Object.keys(BASE_RULES)) expect(RULE_HELP[k as keyof Rules], k).toBeTruthy();
  });
  it('pattern examples are valid tile strings', () => {
    for (const p of PATTERNS) expect(parseTiles(p.example).length).toBeGreaterThan(0);
  });
});
