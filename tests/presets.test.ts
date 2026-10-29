import { describe, it, expect } from 'vitest';
import { parseTiles as p } from '../src/engine/tiles';
import { scoreHand, WinContext } from '../src/engine/scoring';
import { PRESETS, BASE_RULES, pointsFor, payouts, Rules } from '../src/engine/rules';

const preset = (id: string) => PRESETS.find((x) => x.id === id)!.rules;
const ctx = (c: string, o: Partial<WinContext> = {}): WinContext => {
  const t = p(c);
  return { concealed: t, melds: [], winTile: t[t.length - 1], selfDrawn: false, seatWind: 0, roundWind: 0, flowers: [2], seasons: [], ...o };
};
// A 0-faan hand: exposed chow, mixed pungs/chows, non-seat flower, won on discard.
const chicken = () => ctx('456m111p789s55s', { melds: [{ type: 'chow', tile: 0 }] });
const names = (s: ReturnType<typeof scoreHand>) => s.items.map((i) => i.name);

describe('HK table rules preset', () => {
  const r = preset('hk-common');
  it('3 faan min, 13 limit', () => { expect(r.minFaan).toBe(3); expect(r.limit).toBe(13); });
  it('chicken hand not allowed', () => {
    const s = scoreHand(chicken(), r);
    expect(s.valid).toBe(true); expect(s.faan).toBe(0); expect(s.meetsMinimum).toBe(false);
  });
  it('seven pairs not allowed', () => expect(scoreHand(ctx('1133m5577p99sEECC'), r).valid).toBe(false));
  it('great three dragons fixed 8', () => expect(scoreHand(ctx('123mCCCFFFPPP55s'), r).items.find((i) => i.name === 'Great three dragons')!.faan).toBe(8));
  it('half-spicy table', () => expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((f) => pointsFor(f, r))).toEqual([1, 2, 4, 8, 16, 24, 32, 48, 64, 96, 128]));
  it('half-shooter split', () => expect(payouts(3, false, r)).toEqual([{ from: 'Discarder', points: 8 }, { from: 'Each other player', points: 4 }]));
});

describe('Traditional preset', () => {
  const r = preset('traditional');
  it('limit 10 and limit hands capped', () => expect(scoreHand(ctx('19m19p19sESWNCFPP'), r).faan).toBe(10));
  it('half-limit hands', () => expect(scoreHand(ctx('123mCCCFFFPPP55s'), r).items.find((i) => i.name === 'Great three dragons')!.faan).toBe(5));
  it('fully concealed self-draw bonus', () => expect(names(scoreHand(ctx('123m456m789p234s55s', { selfDrawn: true }), r))).toContain('Fully concealed self-draw'));
  it('full-spicy doubling and discarder pays all', () => {
    expect(pointsFor(6, r)).toBe(64);
    expect(payouts(3, false, r)).toEqual([{ from: 'Discarder (pays for all)', points: 16 }]);
  });
});

describe('Casual preset', () => {
  const r = preset('casual');
  it('1 faan wins', () => expect(scoreHand(ctx('123m456m789p234s55s', { melds: [] }), r).meetsMinimum).toBe(true));
  it('seven pairs allowed', () => {
    const s = scoreHand(ctx('1133m5577p99sEECC'), r);
    expect(s.valid).toBe(true); expect(s.meetsMinimum).toBe(true);
  });
  it('limit 8 cap', () => expect(scoreHand(ctx('123mCCCFFFPPP55m', { selfDrawn: true }), r).faan).toBe(8));
});

describe('Chicken hand preset', () => {
  const r = preset('chicken');
  it('0-faan hand wins as chicken hand', () => {
    const s = scoreHand(chicken(), r);
    expect(s.meetsMinimum).toBe(true);
    expect(names(s)).toEqual(['Chicken hand']);
  });
});

describe('individual toggles', () => {
  const base: Rules = { ...BASE_RULES };
  it('self-drawn faan configurable', () => {
    const s = scoreHand(ctx('123m456m789p234s55s', { selfDrawn: true }), { ...base, selfDrawnFaan: 0 });
    expect(names(s)).not.toContain('Self-drawn');
  });
  it('concealed bonus off', () => expect(names(scoreHand(ctx('123m456m789p234s55s'), { ...base, concealedFaan: 0 }))).not.toContain('Concealed hand'));
  it('flowers out of play', () => {
    const s = scoreHand(ctx('123m456m789p234s55s', { flowers: [], seatWind: 0 }), { ...base, flowersInPlay: false });
    expect(names(s)).not.toContain('No flowers');
  });
  it('seat flower and set values', () => {
    const s = scoreHand(ctx('123m456m789p234s55s', { flowers: [1, 2, 3, 4] }), { ...base, seatFlowerFaan: 2, flowerSetFaan: 3 });
    expect(s.items.find((i) => i.name === 'Seat flower')!.faan).toBe(2);
    expect(s.items.find((i) => i.name === 'Complete flower set')!.faan).toBe(3);
  });
  it('robbing kong / last tile off', () => {
    const s = scoreHand(ctx('123m456m789p234s55s', { robbingKong: true, lastTile: true }), { ...base, robbingKongFaan: 0, lastTileFaan: 0 });
    expect(names(s).some((n) => /Robbing|last/.test(n))).toBe(false);
  });
  it('seven pairs faan configurable', () => {
    const s = scoreHand(ctx('1133m5577p99sEECC'), { ...base, sevenPairs: true, sevenPairsFaan: 3 });
    expect(s.items[0].faan).toBe(3);
  });
});
