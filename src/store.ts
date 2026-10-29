import { useEffect, useState } from 'react';
import { Meld } from './engine/scoring';
import { PRESETS, Rules } from './engine/rules';

export interface HandState {
  concealed: number[];
  winTile: number | null;
  melds: Meld[];
  flowers: number[];
  seasons: number[];
  seatWind: number;
  roundWind: number;
  selfDrawn: boolean;
  lastTile: boolean;
  kongReplacement: boolean;
  robbingKong: boolean;
  heavenly: boolean;
  earthly: boolean;
}
export interface Game { id: string; name: string; presetId: string; rules: Rules; hand: HandState; updated: number }

export const emptyHand = (): HandState => ({
  concealed: [], winTile: null, melds: [], flowers: [], seasons: [], seatWind: 0, roundWind: 0,
  selfDrawn: false, lastTile: false, kongReplacement: false, robbingKong: false, heavenly: false, earthly: false,
});
export function newGame(presetId = PRESETS[0].id, name?: string): Game {
  const p = PRESETS.find((x) => x.id === presetId) ?? PRESETS[0];
  return { id: Math.random().toString(36).slice(2, 10), name: name ?? `Game ${new Date().toLocaleDateString()}`, presetId: p.id, rules: { ...p.rules }, hand: emptyHand(), updated: Date.now() };
}

const KEY = 'hkmj.games.v1';
interface Saved { games: Game[]; current: string }
function load(): Saved {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '') as Saved;
    if (s.games.length) {
      // fill rule fields added in later versions
      s.games.forEach((g) => (g.rules = { ...PRESETS[0].rules, ...g.rules }));
      return s;
    }
  } catch { /* first run */ }
  const g = newGame();
  return { games: [g], current: g.id };
}
export function useGames() {
  const [state, setState] = useState<Saved>(load);
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(state)); }, [state]);
  const game = state.games.find((g) => g.id === state.current) ?? state.games[0];
  const update = (fn: (g: Game) => Game) =>
    setState((s) => ({ ...s, games: s.games.map((g) => (g.id === game.id ? { ...fn(g), updated: Date.now() } : g)) }));
  return {
    games: state.games,
    game,
    setHand: (fn: (h: HandState) => HandState) => update((g) => ({ ...g, hand: fn(g.hand) })),
    setRules: (r: Rules, presetId = 'custom') => update((g) => ({ ...g, rules: r, presetId })),
    rename: (name: string) => update((g) => ({ ...g, name })),
    create: (presetId: string) => { const g = newGame(presetId); setState((s) => ({ games: [g, ...s.games], current: g.id })); },
    select: (id: string) => setState((s) => ({ ...s, current: id })),
    remove: (id: string) => setState((s) => {
      const games = s.games.filter((g) => g.id !== id);
      if (!games.length) games.push(newGame());
      return { games, current: s.current === id ? games[0].id : s.current };
    }),
  };
}
