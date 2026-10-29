// Plain-language explanations for beginners. Pure functions, unit-tested.
import { Rules, pointsFor, payouts } from './engine/rules';
import { scoreHand, Score, WinContext, FaanItem } from './engine/scoring';
import { WINDS } from './engine/tiles';

/** Words a beginner meets. Shown in the reference and wherever a term first appears. */
export const GLOSSARY: { term: string; zh: string; meaning: string }[] = [
  { term: 'Faan', zh: '番', meaning: 'Points of value in a winning hand. More faan = bigger win. You need a minimum number of faan to be allowed to win.' },
  { term: 'Set', zh: '', meaning: 'A group of three tiles: either a run (chow) or three the same (pung). A winning hand is four sets and one pair.' },
  { term: 'Chow (run)', zh: '上 / 順子', meaning: 'Three tiles in a row in the same suit, like 3-4-5 of dots. Honour tiles can’t make a run.' },
  { term: 'Pung (triplet)', zh: '碰 / 刻子', meaning: 'Three identical tiles.' },
  { term: 'Kong (four)', zh: '槓', meaning: 'Four identical tiles. Counts like a pung, and you draw an extra tile to replace the fourth.' },
  { term: 'Pair (eyes)', zh: '眼', meaning: 'Two identical tiles. Every normal winning hand needs exactly one.' },
  { term: 'Exposed', zh: '明', meaning: 'A set you made by taking another player’s discard, laid face up on the table.' },
  { term: 'Concealed', zh: '暗 / 門前清', meaning: 'Made only from tiles you drew yourself. A fully concealed hand is worth an extra faan.' },
  { term: 'Self-drawn', zh: '自摸', meaning: 'You drew the winning tile from the wall yourself. All three other players pay.' },
  { term: 'Win from a discard', zh: '出銃 / 食糊', meaning: 'Another player threw away the tile you needed. Usually that player pays the most.' },
  { term: 'Waiting', zh: '聽牌', meaning: 'Your 13 tiles are one tile away from a win. The tiles that would finish it are your “waits”.' },
  { term: 'Honour tiles', zh: '字', meaning: 'The four winds (East, South, West, North) and three dragons (Red, Green, White).' },
  { term: 'Terminals', zh: '么九', meaning: 'The 1 and 9 of each suit.' },
  { term: 'Seat wind', zh: '門風', meaning: 'Your own wind for this hand: East for the dealer, then South, West, North going round the table.' },
  { term: 'Round wind', zh: '圈風', meaning: 'The wind for the whole round. The game starts in the East round.' },
  { term: 'Flowers and seasons', zh: '花', meaning: 'Bonus tiles. Put them aside when drawn and take a replacement. Your own number (East = 1, South = 2, …) is worth a faan.' },
  { term: 'Limit', zh: '滿糊 / 爆棚', meaning: 'The maximum faan a hand can score. Special “limit hands” score the maximum straight away.' },
  { term: 'Minimum', zh: '起糊', meaning: 'The fewest faan you need to declare a win, e.g. 3 at most Hong Kong tables.' },
  { term: 'Half-spicy / Full-spicy', zh: '半辣 / 全辣', meaning: 'Two ways to turn faan into points. Full-spicy doubles for every faan. Half-spicy doubles up to 4 faan, then rises more slowly.' },
];

type Why = (c: WinContext) => string;
const seatName = (c: WinContext) => WINDS[c.seatWind];
/** What each faan item means, in plain words, and why it applies to this hand. */
export const EXPLAIN: Record<string, { what: string; why?: Why }> = {
  'Common hand': { what: 'All four sets are runs (no triplets).', why: () => 'Every set in your hand is a run of three in a row.' },
  'All pungs': { what: 'All four sets are triplets or kongs (no runs).', why: () => 'You have no runs, only triplets.' },
  'Pure one suit': { what: 'Every tile is from one suit, with no honour tiles.', why: () => 'All your tiles are the same suit.' },
  'Mixed one suit': { what: 'One suit plus honour tiles (winds or dragons).', why: () => 'Only one suit is used, mixed with honour tiles.' },
  'Mixed terminals': { what: 'Only 1s, 9s and honour tiles.', why: () => 'Every tile is a 1, a 9, a wind or a dragon.' },
  'Dragon pung': { what: 'A triplet of any dragon (Red 中, Green 發 or White 白).', why: () => 'You have three of the same dragon.' },
  'Small three dragons': { what: 'Triplets of two dragons and a pair of the third.' },
  'Great three dragons': { what: 'Triplets of all three dragons.' },
  'Small four winds': { what: 'Triplets of three winds and a pair of the fourth.' },
  'Seat wind pung': { what: 'A triplet of your own seat wind.', why: (c) => `You sit ${seatName(c)} and have three ${seatName(c)} wind tiles.` },
  'Round wind pung': { what: 'A triplet of this round’s wind.', why: (c) => `It is the ${WINDS[c.roundWind]} round and you have three ${WINDS[c.roundWind]} wind tiles.` },
  'Self-drawn': { what: 'You drew the winning tile yourself.', why: () => 'You set “Self-drawn” as how you won.' },
  'Concealed hand': { what: 'You never took a discard to make a set.', why: () => 'None of your sets were taken from other players.' },
  'Fully concealed self-draw': { what: 'Extra faan in some rules: fully concealed AND self-drawn.' },
  'Win on last tile': { what: 'You self-drew the very last tile of the wall.' },
  'Win on last discard': { what: 'You won on the very last tile thrown away in the game.' },
  'Win on kong replacement': { what: 'You made a kong, and the replacement tile finished your hand.' },
  'Robbing the kong': { what: 'Another player added a 4th tile to their triplet, and that tile was the one you needed.' },
  'No flowers': { what: 'You have no flower or season tiles at all.' },
  'Seat flower': { what: 'You have the flower with your seat number.', why: (c) => `You sit ${seatName(c)} (number ${c.seatWind + 1}) and have flower ${c.seatWind + 1}.` },
  'Seat season': { what: 'You have the season with your seat number.', why: (c) => `You sit ${seatName(c)} (number ${c.seatWind + 1}) and have season ${c.seatWind + 1}.` },
  'Complete flower set': { what: 'All four flowers (plum, orchid, chrysanthemum, bamboo).' },
  'Complete season set': { what: 'All four seasons (spring, summer, autumn, winter).' },
  'Chicken hand': { what: 'A complete hand with no faan at all. Only allowed if your table plays “chicken hand”.' },
  'Seven pairs (house rule)': { what: 'Seven different pairs instead of four sets and a pair. Not standard; only if your table allows it.' },
  'Heavenly hand': { what: 'The dealer wins with the starting 14 tiles. Limit hand.' },
  'Earthly hand': { what: 'A non-dealer wins on the dealer’s very first discard. Limit hand.' },
  'All honours': { what: 'Only winds and dragons. Limit hand.' },
  'All terminals': { what: 'Only 1s and 9s. Limit hand.' },
  'Four kongs': { what: 'Four kongs. Limit hand.' },
  'Four concealed pungs': { what: 'Four triplets all made from your own draws. Limit hand.' },
  'Great four winds': { what: 'Triplets of all four winds. Limit hand.' },
  'Nine gates': { what: '1-1-1-2-3-4-5-6-7-8-9-9-9 of one suit plus any tile of that suit, all concealed. Limit hand.' },
  'All eight flowers': { what: 'All four flowers and all four seasons. Limit hand.' },
  'Thirteen orphans': { what: 'One of each 1, 9, wind and dragon, plus one extra of any of them. Limit hand.' },
};

export function explainItem(item: FaanItem, ctx: WinContext): { title: string; what: string; why: string } {
  const e = EXPLAIN[item.name] ?? { what: '' };
  const pts = item.limit ? 'the maximum (limit)' : `${item.faan} faan`;
  return { title: `${item.name} – ${pts}`, what: e.what, why: e.why ? e.why(ctx) : '' };
}

/** Step-by-step: faan → points → who pays. */
export function explainPayout(faan: number, selfDrawn: boolean, rules: Rules): string[] {
  const capped = Math.min(faan, rules.limit);
  const p = pointsFor(capped, rules);
  const steps: string[] = [];
  if (faan > rules.limit) steps.push(`Your hand has ${faan} faan, but the limit is ${rules.limit}, so it counts as ${rules.limit}.`);
  steps.push(rules.payment === 'full-spicy'
    ? `Full-spicy table: points double with every faan, so ${capped} faan = ${rules.basePoints} × 2^${capped} = ${p} points.`
    : `Half-spicy table: points double up to 4 faan, then grow by half steps. ${capped} faan = ${p} points${rules.basePoints !== 1 ? ` (base ${rules.basePoints})` : ''}.`);
  const pay = payouts(capped, selfDrawn, rules);
  if (selfDrawn) steps.push(`You drew the tile yourself, so each of the three other players pays ${p}. You collect ${p * 3} in total.`);
  else if (rules.discarderPaysAll) steps.push(`You won from a discard and this table uses “discarder pays for all”: the player who threw the tile pays double, ${pay[0].points}. Nobody else pays.`);
  else steps.push(`You won from a discard: the player who threw the tile pays the full ${p}. The other two players each pay half, ${p / 2}. You collect ${p * 2} in total.`);
  return steps;
}

/** For hands below the minimum: what would have made the difference (computed, not guessed). */
export function closeHints(ctx: WinContext, rules: Rules, score: Score): string[] {
  if (!score.valid || score.meetsMinimum) return [];
  const need = rules.minFaan - score.faan;
  const out: string[] = [`You have ${score.faan} faan; this table needs ${rules.minFaan}. You are ${need} short.`];
  const tryCtx = (label: string, c: Partial<WinContext>) => {
    const s = scoreHand({ ...ctx, ...c }, rules);
    if (s.valid && s.meetsMinimum) out.push(`${label} it would have been ${s.faan} faan – enough to win.`);
    else if (s.valid && s.faan > score.faan) out.push(`${label} it would be ${s.faan} faan – closer, but still short.`);
  };
  if (!ctx.selfDrawn) tryCtx('If you had drawn the winning tile yourself (self-drawn),', { selfDrawn: true });
  if (ctx.melds.some((m) => !(m.type === 'kong' && m.concealed)))
    out.push(`Keeping your hand concealed (not taking discards to make sets) is worth ${rules.concealedFaan} faan.`);
  if (rules.flowersInPlay && ctx.flowers.length + ctx.seasons.length > 0 && !ctx.flowers.includes(ctx.seatWind + 1) && !ctx.seasons.includes(ctx.seatWind + 1))
    out.push(`Your seat flower or season (number ${ctx.seatWind + 1}) would add ${rules.seatFlowerFaan} faan.`);
  out.push('Ideas for next time: a triplet of dragons (+1 each), your seat or round wind (+1), all runs (common hand +1), one suit with honours (+3) or all one suit (+' + rules.pureSuitFaan + ').');
  return out;
}

export const RULE_HELP: Partial<Record<keyof Rules, string>> = {
  minFaan: 'The fewest faan a hand needs before you may declare a win. Hong Kong tables usually use 3. Use 0 or 1 for beginners.',
  limit: 'The most faan a hand can score. Anything above counts as the limit. Special limit hands score this straight away.',
  chickenHand: 'A “chicken hand” is a complete hand worth 0 faan. Turn on to let it win (it then pays the lowest amount).',
  sevenPairs: 'Lets seven different pairs count as a win. This is a house rule, not standard Hong Kong rules.',
  sevenPairsFaan: 'How many faan a Seven Pairs hand is worth.',
  halfLimitHands: 'Some old-style tables score Great Three Dragons and Small Four Winds as half of the limit, not a fixed number.',
  selfDrawnFaan: 'Faan for drawing the winning tile yourself instead of winning from someone’s discard.',
  concealedFaan: 'Faan for winning without taking any discards to make your sets.',
  concealedSelfDrawnBonus: 'An extra faan some tables give when the hand is both concealed and self-drawn.',
  robbingKongFaan: 'Faan for winning on the tile another player adds to make a kong.',
  lastTileFaan: 'Faan for winning on the last tile of the wall, or the last discard.',
  kongReplacementFaan: 'Faan for winning with the extra tile you draw after making a kong.',
  commonHandFaan: 'Faan when all four sets are runs (common hand).',
  allPungsFaan: 'Faan when all four sets are triplets (all pungs).',
  mixedSuitFaan: 'Faan for one suit mixed with honour tiles.',
  pureSuitFaan: 'Faan for a hand of only one suit and no honour tiles.',
  flowersInPlay: 'Whether flower and season bonus tiles are used. Turn off if your set has no flowers.',
  seatFlowerFaan: 'Faan for each flower or season with your seat number (East 1, South 2, West 3, North 4).',
  flowerSetFaan: 'Faan for having all four flowers, or all four seasons.',
  noFlowerFaan: 'Faan for having no bonus tiles at all. Many tables give 1.',
  payment: 'How faan become points. Full-spicy doubles each faan. Half-spicy doubles up to 4 faan, then rises more slowly.',
  discarderPaysAll: 'If on, the player who threw your winning tile pays everything (double). If off, they pay full and the other two pay half each.',
  basePoints: 'Multiplies every payment. 1 means 1 faan pays 2 points.',
};

/** Pattern reference with example hands (tile strings for parseTiles). */
export const PATTERNS: { name: string; zh: string; faan: string; example: string; note: string }[] = [
  { name: 'Common hand', zh: '平糊', faan: '1', example: '123m456m789p234s55s', note: 'All runs plus a pair.' },
  { name: 'All pungs', zh: '對對糊', faan: '3', example: '111m555p999sEEECC', note: 'Four triplets plus a pair.' },
  { name: 'Mixed one suit', zh: '混一色', faan: '3', example: '123p456p888pEEECC', note: 'One suit plus honours.' },
  { name: 'Pure one suit', zh: '清一色', faan: '7', example: '11123456789999s', note: 'Every tile the same suit.' },
  { name: 'Dragon pung', zh: '三元牌', faan: '1 each', example: 'CCC', note: 'Three Red, Green or White dragons.' },
  { name: 'Seat / round wind', zh: '門風 / 圈風', faan: '1 each', example: 'EEE', note: 'Three of your seat or round wind.' },
  { name: 'Small three dragons', zh: '小三元', faan: '5', example: 'CCCFFFPP', note: 'Two dragon triplets plus a dragon pair.' },
  { name: 'Great three dragons', zh: '大三元', faan: '8', example: 'CCCFFFPPP', note: 'All three dragon triplets.' },
  { name: 'Thirteen orphans', zh: '十三么', faan: 'Limit', example: '19m19p19sESWNCFPP', note: 'One of each 1, 9, wind and dragon, plus one extra.' },
  { name: 'All honours', zh: '字一色', faan: 'Limit', example: 'EEESSSWWWCCCFF', note: 'Only winds and dragons.' },
];
