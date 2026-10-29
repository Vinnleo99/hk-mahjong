export type Payment = 'half-spicy' | 'full-spicy';
export interface Rules {
  minFaan: number;
  limit: number;
  /** Seven Pairs (七對) allowed and its faan value. Not standard HK. */
  sevenPairs: boolean;
  sevenPairsFaan: number;
  /** Chicken hand (雞糊): a 0-faan winning hand may be declared. */
  chickenHand: boolean;
  /** Own seat flower/season (正花) scores. */
  seatFlowerFaan: number;
  /** All four flowers or all four seasons (一台花). */
  flowerSetFaan: number;
  /** No flowers or seasons (無花). */
  noFlowerFaan: number;
  /** Flowers & seasons in play at all. */
  flowersInPlay: boolean;
  selfDrawnFaan: number;
  concealedFaan: number;
  /** Extra faan for a fully concealed self-drawn hand (不求人), on top of the two above. */
  concealedSelfDrawnBonus: number;
  robbingKongFaan: number;
  lastTileFaan: number;
  kongReplacementFaan: number;
  /** Double kong replacement (槓上槓) */
  commonHandFaan: number;
  allPungsFaan: number;
  mixedSuitFaan: number;
  pureSuitFaan: number;
  /** Great Three Dragons / Small Four Winds score as half limit instead of fixed faan. */
  halfLimitHands: boolean;
  /** Pure one suit and all pungs etc. in an all-honour-free hand (字一色) is limit. */
  payment: Payment;
  /** Base stake for 0 faan (in points). */
  basePoints: number;
  /** Discarder pays for everyone (全銃) instead of half-shooter (半銃). */
  discarderPaysAll: boolean;
}

export const BASE_RULES: Rules = {
  minFaan: 3, limit: 13, sevenPairs: false, sevenPairsFaan: 4, chickenHand: false,
  seatFlowerFaan: 1, flowerSetFaan: 2, noFlowerFaan: 1, flowersInPlay: true,
  selfDrawnFaan: 1, concealedFaan: 1, concealedSelfDrawnBonus: 0,
  robbingKongFaan: 1, lastTileFaan: 1, kongReplacementFaan: 1,
  commonHandFaan: 1, allPungsFaan: 3, mixedSuitFaan: 3, pureSuitFaan: 7,
  halfLimitHands: false, payment: 'half-spicy', basePoints: 1, discarderPaysAll: false,
};

export interface Preset { id: string; name: string; zh: string; description: string; rules: Rules }
export const PRESETS: Preset[] = [
  { id: 'hk-common', name: 'Hong Kong table rules', zh: '港式三番起糊', description: '3 faan minimum, 13 faan limit, half-spicy payouts. The most common modern HK table.', rules: { ...BASE_RULES } },
  { id: 'traditional', name: 'Traditional old style', zh: '古典港式', description: '3 faan minimum, 10 faan limit, full-spicy doubling, discarder pays all, Great Three Dragons and Small Four Winds are half-limit.', rules: { ...BASE_RULES, limit: 10, payment: 'full-spicy', discarderPaysAll: true, halfLimitHands: true, concealedSelfDrawnBonus: 1 } },
  { id: 'casual', name: 'Casual / family', zh: '家庭耍樂', description: '1 faan minimum, 8 faan limit, Seven Pairs allowed. Friendly for beginners.', rules: { ...BASE_RULES, minFaan: 1, limit: 8, sevenPairs: true } },
  { id: 'chicken', name: 'Chicken hand allowed', zh: '雞糊', description: 'Any complete hand wins, even with 0 faan. 10 faan limit.', rules: { ...BASE_RULES, minFaan: 0, limit: 10, chickenHand: true } },
];
export const DEFAULT_RULES: Rules = PRESETS[0].rules;

/** Points for a given faan under the chosen payment table (before who-pays split). */
export function pointsFor(faan: number, rules: Rules): number {
  const f = Math.max(0, Math.min(faan, rules.limit));
  if (rules.payment === 'full-spicy') return rules.basePoints * 2 ** f;
  // Half-spicy (半辣): doubles to 4 faan, then each faan adds half of the previous doubling.
  let p = 1;
  for (let i = 1; i <= f; i++) p = i <= 4 ? p * 2 : i % 2 === 1 ? p * 1.5 : (p / 3) * 4;
  return rules.basePoints * Math.round(p);
}

export interface Payout { from: string; points: number }
/** Who pays what. Self-drawn: each of the three others pays. Discard: depends on 全銃/半銃. */
export function payouts(faan: number, selfDrawn: boolean, rules: Rules): Payout[] {
  const p = pointsFor(faan, rules);
  if (selfDrawn) return [{ from: 'Each other player', points: p }];
  if (rules.discarderPaysAll) return [{ from: 'Discarder (pays for all)', points: p * 2 }];
  return [{ from: 'Discarder', points: p }, { from: 'Each other player', points: p / 2 }];
}
