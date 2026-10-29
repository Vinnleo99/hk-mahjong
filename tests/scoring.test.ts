import { describe, it, expect } from 'vitest';
import { parseTiles as p, tileCode } from '../src/engine/tiles';
import { scoreHand, findWaits, decompose, WinContext, DEFAULT_RULES, Meld } from '../src/engine/scoring';

const ctx = (concealed: string, o: Partial<WinContext> = {}): WinContext => {
  const c = p(concealed);
  return { concealed: c, melds: [], winTile: c[c.length - 1], selfDrawn: false, seatWind: 0, roundWind: 0, flowers: [2], seasons: [], ...o };
};
const names = (s: ReturnType<typeof scoreHand>) => s.items.map((i) => i.name);

describe('tile parsing', () => {
  it('parses codes', () => {
    expect(p('19m19p19sESWNCFP').map(tileCode).join(',')).toBe('1m,9m,1p,9p,1s,9s,E,S,W,N,C,F,P');
  });
});

describe('decomposition', () => {
  it('finds multiple interpretations', () => {
    expect(decompose(p('111222333m456p77s'), 4).length).toBe(2);
  });
  it('rejects non-winning', () => {
    expect(decompose(p('123m456p789s1357s'), 4).length).toBe(0);
  });
});

describe('validity', () => {
  it('rejects wrong tile count', () => expect(scoreHand(ctx('123m456p')).valid).toBe(false));
  it('rejects five of a tile', () => {
    const s = scoreHand(ctx('1111m', { melds: [{ type: 'pung', tile: 0 }, { type: 'chow', tile: 9 }, { type: 'chow', tile: 12 }, { type: 'chow', tile: 15 }].slice(0, 3) as Meld[], concealed: p('11m123s'), winTile: 0 }));
    expect(s.valid).toBe(false);
  });
  it('rejects non-winning shape', () => expect(scoreHand(ctx('123m456p789s1357sE')).valid).toBe(false));
  it('rejects invalid chow meld', () => {
    expect(scoreHand(ctx('123m456p789s22s', { melds: [{ type: 'chow', tile: 8 }] })).valid).toBe(false);
  });
});

describe('basic patterns', () => {
  it('common hand', () => {
    const s = scoreHand(ctx('123m456m789p234s55s'));
    expect(names(s)).toContain('Common hand');
    expect(names(s)).toContain('Concealed hand');
    expect(s.faan).toBe(2);
    expect(s.meetsMinimum).toBe(false);
  });
  it('self-drawn + no flowers', () => {
    const s = scoreHand(ctx('123m456m789p234s55s', { selfDrawn: true, flowers: [] }));
    expect(names(s)).toEqual(expect.arrayContaining(['Common hand', 'Self-drawn', 'Concealed hand', 'No flowers']));
    expect(s.faan).toBe(4);
    expect(s.meetsMinimum).toBe(true);
  });
  it('all pungs', () => {
    const s = scoreHand(ctx('999p77s', { melds: [{ type: 'pung', tile: 1 }, { type: 'pung', tile: 22 }, { type: 'kong', tile: 13 }], winTile: 17 }));
    expect(names(s)).toContain('All pungs');
    expect(s.faan).toBe(3);
  });
  it('mixed one suit', () => {
    const s = scoreHand(ctx('123456m789mEEECC'));
    expect(names(s)).toContain('Mixed one suit');
    expect(names(s)).toContain('Seat wind pung');
    expect(names(s)).toContain('Round wind pung');
  });
  it('pure one suit', () => {
    const t = scoreHand(ctx('11123455567899p'));
    expect(names(t)).toContain('Pure one suit');
    expect(t.faan).toBeGreaterThanOrEqual(7);
  });
  it('mixed terminals with all pungs', () => {
    const s = scoreHand(ctx('111999m111pNN', { melds: [{ type: 'pung', tile: 28 }] }));
    expect(names(s)).toEqual(expect.arrayContaining(['All pungs', 'Mixed terminals']));
  });
});

describe('honours', () => {
  it('dragon pung', () => {
    const s = scoreHand(ctx('123m456p789sCCC22s'));
    expect(s.items.filter((i) => i.name === 'Dragon pung').length).toBe(1);
  });
  it('small three dragons', () => {
    const s = scoreHand(ctx('123m456pCCCFFFPP'));
    expect(names(s)).toContain('Small three dragons');
    expect(names(s)).not.toContain('Dragon pung');
  });
  it('great three dragons', () => {
    const s = scoreHand(ctx('123mCCCFFFPPP55s'));
    expect(names(s)).toContain('Great three dragons');
    expect(s.faan).toBeGreaterThanOrEqual(8);
  });
  it('seat vs round wind', () => {
    const s = scoreHand(ctx('123m456p789sSSS22s', { seatWind: 1, roundWind: 0 }));
    expect(names(s)).toContain('Seat wind pung');
    expect(names(s)).not.toContain('Round wind pung');
    const w = scoreHand(ctx('123m456p789sWWW22s', { seatWind: 1, roundWind: 0 }));
    expect(names(w).some((n) => n.includes('wind pung'))).toBe(false);
  });
  it('small four winds', () => {
    const s = scoreHand(ctx('123mEEESSSWWWNN'));
    expect(names(s)).toContain('Small four winds');
  });
});

describe('limit hands', () => {
  const lim = (s: ReturnType<typeof scoreHand>) => { expect(s.isLimit).toBe(true); expect(s.faan).toBe(13); };
  it('thirteen orphans', () => lim(scoreHand(ctx('19m19p19sESWNCFPP'))));
  it('great four winds', () => lim(scoreHand(ctx('EEESSSWWWNNN22m'))));
  it('all honours', () => lim(scoreHand(ctx('EEESSSCCCFFFPP'))));
  it('all terminals', () => lim(scoreHand(ctx('111999m111999p11s'))));
  it('nine gates', () => lim(scoreHand(ctx('1112345678999s5s'))));
  it('four concealed pungs self-drawn', () => lim(scoreHand(ctx('111m222p333sEEE55s', { selfDrawn: true, winTile: 0 }))));
  it('four concealed pungs on discard is NOT limit', () => {
    const s = scoreHand(ctx('111m222p333s55sEEE', { winTile: 27 }));
    expect(names(s)).not.toContain('Four concealed pungs');
    expect(names(s)).toContain('All pungs');
  });
  it('four concealed pungs by discard on the pair IS limit', () => {
    lim(scoreHand(ctx('111m222p333sEEE55s', { winTile: 22 })));
  });
  it('four kongs', () => {
    const melds: Meld[] = [{ type: 'kong', tile: 0 }, { type: 'kong', tile: 9 }, { type: 'kong', tile: 18 }, { type: 'kong', tile: 27, concealed: true }];
    lim(scoreHand(ctx('55s', { melds })));
  });
  it('heavenly hand', () => lim(scoreHand(ctx('123m456m789p234s55s', { heavenly: true }))));
  it('eight flowers', () => lim(scoreHand(ctx('123m456m789p234s55s', { flowers: [1, 2, 3, 4], seasons: [1, 2, 3, 4] }))));
});

describe('flowers and circumstances', () => {
  it('seat flower and full set', () => {
    const s = scoreHand(ctx('123m456m789p234s55s', { seatWind: 2, flowers: [1, 2, 3, 4], seasons: [3] }));
    expect(names(s)).toEqual(expect.arrayContaining(['Seat flower', 'Seat season', 'Complete flower set']));
  });
  it('non-seat flower gives nothing', () => {
    const s = scoreHand(ctx('123m456m789p234s55s', { seatWind: 0, flowers: [2] }));
    expect(names(s)).not.toContain('Seat flower');
    expect(names(s)).not.toContain('No flowers');
  });
  it('exposed meld loses concealed', () => {
    const s = scoreHand(ctx('456m789p234s55s', { melds: [{ type: 'chow', tile: 0 }] }));
    expect(names(s)).not.toContain('Concealed hand');
    expect(names(s)).toContain('Common hand');
  });
  it('concealed kong keeps concealed', () => {
    const s = scoreHand(ctx('456m789p234s55s', { melds: [{ type: 'kong', tile: 33, concealed: true }] }));
    expect(names(s)).toContain('Concealed hand');
    expect(names(s)).toContain('Dragon pung');
  });
  it('last tile, kong replacement, robbing kong', () => {
    expect(names(scoreHand(ctx('123m456m789p234s55s', { lastTile: true, selfDrawn: true })))).toContain('Win on last tile');
    expect(names(scoreHand(ctx('123m456m789p234s55s', { kongReplacement: true })))).toContain('Win on kong replacement');
    expect(names(scoreHand(ctx('123m456m789p234s55s', { robbingKong: true })))).toContain('Robbing the kong');
  });
});

describe('seven pairs house rule', () => {
  it('off by default', () => expect(scoreHand(ctx('1133m5577p99sEECC')).valid).toBe(false));
  it('on when enabled', () => {
    const s = scoreHand(ctx('1133m5577p99sEECC'), { ...DEFAULT_RULES, sevenPairs: true });
    expect(s.valid).toBe(true);
    expect(names(s)).toContain('Seven pairs (house rule)');
  });
});

describe('rules config', () => {
  it('caps at configured limit', () => {
    const s = scoreHand(ctx('123mCCCFFFPPP55m', { selfDrawn: true, flowers: [] }), { ...DEFAULT_RULES, limit: 10 });
    expect(s.faan).toBe(10);
  });
  it('min faan configurable', () => {
    expect(scoreHand(ctx('123m456m789p234s55s'), { ...DEFAULT_RULES, minFaan: 1 }).meetsMinimum).toBe(true);
  });
  it('chooses best interpretation', () => {
    // 111222333m can be three pungs or three chows
    const s = scoreHand(ctx('111222333m789m55m', { selfDrawn: true }));
    expect(names(s)).toContain('Pure one suit');
  });
});

describe('waits', () => {
  it('nine gates waits on all nine', () => {
    const w = findWaits({ concealed: p('1112345678999m'), melds: [], selfDrawn: false, seatWind: 0, roundWind: 0, flowers: [], seasons: [] });
    expect(w.map((x) => x.tile)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(w.every((x) => x.score.isLimit)).toBe(true);
  });
  it('two-sided wait', () => {
    const w = findWaits({ concealed: p('123m456p789s23s55s'), melds: [], selfDrawn: false, seatWind: 0, roundWind: 0, flowers: [], seasons: [] });
    expect(w.map((x) => tileCode(x.tile))).toEqual(['1s', '4s']);
  });
  it('thirteen orphans 13-way wait', () => {
    const w = findWaits({ concealed: p('19m19p19sESWNCFP'), melds: [], selfDrawn: false, seatWind: 0, roundWind: 0, flowers: [], seasons: [] });
    expect(w.length).toBe(13);
  });
  it('does not wait on a fifth tile', () => {
    const w = findWaits({ concealed: p('2399m'), melds: [{ type: 'kong', tile: 0 }, { type: 'pung', tile: 10 }, { type: 'pung', tile: 11 }], selfDrawn: false, seatWind: 0, roundWind: 0, flowers: [], seasons: [] });
    expect(w.map((x) => tileCode(x.tile))).toEqual(['4m']); // 1m would be a fifth tile
  });
});
