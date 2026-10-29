import { useState } from 'react';
import { Tile } from './Tile';
import { HandState } from './store';
import { Rules } from './engine/rules';
import { Score, WinContext } from './engine/scoring';
import { WINDS, WIND_ZH, parseTiles, tileName } from './engine/tiles';
import { explainItem, explainPayout, closeHints, GLOSSARY, PATTERNS, RULE_HELP } from './beginner';

const lsFlag = (k: string) => { try { return localStorage.getItem(k) === '1'; } catch { return false; } };
const setFlag = (k: string, v: boolean) => { try { localStorage.setItem(k, v ? '1' : '0'); } catch { /* private mode */ } };
export const BEGINNER_KEY = 'hkmj.beginner.v1';
export const TUTORIAL_KEY = 'hkmj.tutorial.v1';
export function useBeginner() {
  const [on, setOn] = useState(() => { try { return localStorage.getItem(BEGINNER_KEY) !== '0'; } catch { return true; } });
  return [on, (v: boolean) => { setFlag(BEGINNER_KEY, v); setOn(v); }] as const;
}

/** ⓘ button that reveals the plain-language help for a rule. */
export function Tip({ k }: { k: keyof Rules }) {
  const [open, setOpen] = useState(false);
  const text = RULE_HELP[k];
  if (!text) return null;
  return (
    <span className="tip">
      <button type="button" className="tip-btn" aria-label="What does this mean?" aria-expanded={open} onClick={(e) => { e.preventDefault(); setOpen(!open); }}>ⓘ</button>
      {open && <span className="tip-text" role="note">{text}</span>}
    </span>
  );
}

const STEPS = [
  { t: 'Welcome to HK Mahjong', b: 'This app tells you if a hand wins, how many faan (points) it is worth, and who pays. Beginner mode explains every step in plain words.' },
  { t: '1 · Enter your tiles', b: 'Tap tiles to add them to your hand, or take a photo on the Scan tab. Sets you took from other players go in with the Chow, Pung and Kong buttons.' },
  { t: '2 · Say how you won', b: 'Did you draw the last tile yourself, or did someone throw it away? Add any flowers and pick your seat and round wind.' },
  { t: '3 · Read the result', b: 'You will see each faan item, why it counts, and how the points were worked out. With 13 tiles you see which tiles you are waiting for.' },
  { t: '4 · Learn as you go', b: 'The Learn tab has every tile and the main scoring patterns with pictures. Tap ⓘ next to any rule for an explanation. Turn beginner mode off in the header any time.' },
];
export function Tutorial({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const done = () => { setFlag(TUTORIAL_KEY, true); onDone(); };
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Tutorial">
      <div className="card tutorial">
        <div className="row gap tut-tiles">{[31, 0, 13, 22, 27].map((f) => <Tile key={f} face={f} size={34} />)}</div>
        <h2>{STEPS[i].t}</h2>
        <p>{STEPS[i].b}</p>
        <div className="dots">{STEPS.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}</div>
        <div className="row between">
          <button className="ghost" onClick={done}>Skip</button>
          {i < STEPS.length - 1 ? <button className="primary" onClick={() => setI(i + 1)}>Next</button> : <button className="primary" onClick={done}>Start</button>}
        </div>
      </div>
    </div>
  );
}
export const tutorialSeen = () => lsFlag(TUTORIAL_KEY);

/** Guided step-by-step entry. Shows one step at a time with the controls for it. */
export function Guide({ hand, setHand, size, rules }: { hand: HandState; setHand: (f: (h: HandState) => HandState) => void; size: number; rules: Rules }) {
  const [step, setStep] = useState(0);
  const names = ['Tiles', 'How you won', 'Flowers', 'Winds'];
  const flip = (k: 'flowers' | 'seasons', n: number) => setHand((h) => ({ ...h, [k]: h[k].includes(n) ? h[k].filter((x) => x !== n) : [...h[k], n].sort() }));
  return (
    <section className="card guide">
      <div className="steps">{names.map((n, i) => <button key={n} className={i === step ? 'on' : i < step ? 'done' : ''} onClick={() => setStep(i)}><b>{i + 1}</b>{n}</button>)}</div>
      {step === 0 && <div>
        <p><b>Which tiles do you have?</b> Tap tiles in the picker below. A winning hand has 14 tiles: four sets of three and one pair. Enter 13 to see what you are waiting for.</p>
        <div className="progress"><i style={{ width: `${(size / 14) * 100}%` }} /></div>
        <p className="muted small">{size}/14 tiles. {size < 13 ? `Add ${13 - size} more to see your waits.` : size === 13 ? 'Ready: see your waiting tiles below, or add the 14th tile.' : 'Done. The last tile you added is marked ★ as the winning tile; tap ★ Winning tile to change it.'}</p>
      </div>}
      {step === 1 && <div>
        <p><b>How did you get the winning tile?</b></p>
        <div className="choice">
          <button className={hand.selfDrawn ? 'on' : ''} onClick={() => setHand((h) => ({ ...h, selfDrawn: true }))}><b>I drew it myself</b><small>Self-drawn 自摸 · everyone pays, +{rules.selfDrawnFaan} faan</small></button>
          <button className={!hand.selfDrawn ? 'on' : ''} onClick={() => setHand((h) => ({ ...h, selfDrawn: false }))}><b>Someone threw it away</b><small>From a discard 出銃 · that player pays most</small></button>
        </div>
        <p className="muted small">Rare special wins (last tile, after a kong, robbing a kong) are under “Situation” further down.</p>
      </div>}
      {step === 2 && <div>
        <p><b>Any flowers or seasons?</b> These are bonus tiles kept to one side. Tap the ones you have. Number {hand.seatWind + 1} matches your seat and is worth a faan.</p>
        {rules.flowersInPlay ? <div className="row wrap gap">
          {[1, 2, 3, 4].map((n) => <Tile key={'f' + n} face={33 + n} size={34} selected={hand.flowers.includes(n)} onClick={() => flip('flowers', n)} />)}
          {[1, 2, 3, 4].map((n) => <Tile key={'s' + n} face={37 + n} size={34} selected={hand.seasons.includes(n)} onClick={() => flip('seasons', n)} />)}
        </div> : <p className="muted">This game is set to play without flowers.</p>}
      </div>}
      {step === 3 && <div>
        <p><b>Your seat wind</b> – the dealer is East, then South, West and North going anticlockwise.</p>
        <div className="segmented sm">{WINDS.map((w, i) => <button key={w} className={hand.seatWind === i ? 'on' : ''} onClick={() => setHand((h) => ({ ...h, seatWind: i }))}>{w} {WIND_ZH[i]}</button>)}</div>
        <p><b>The round wind</b> – the game starts in the East round.</p>
        <div className="segmented sm">{WINDS.map((w, i) => <button key={w} className={hand.roundWind === i ? 'on' : ''} onClick={() => setHand((h) => ({ ...h, roundWind: i }))}>{w} {WIND_ZH[i]}</button>)}</div>
      </div>}
      <div className="row between">
        <button className="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</button>
        {step < 3 ? <button className="primary" onClick={() => setStep(step + 1)}>Next</button> : <span className="muted small">See the result below ↓</span>}
      </div>
    </section>
  );
}

/** Beginner explanation added under the score. */
export function Explain({ score, ctx, rules }: { score: Score; ctx: WinContext; rules: Rules }) {
  if (!score.valid) return null;
  const hints = closeHints(ctx, rules, score);
  return (
    <div className="explain">
      <h3>Why these faan?</h3>
      {score.items.length === 0 && <p className="muted small">No scoring items. This is a “chicken hand”.</p>}
      {score.items.map((i, k) => { const e = explainItem(i, ctx); return (
        <div key={k} className="ex-item"><b>{e.title}</b><p>{e.what}{e.why && <><br /><em>In your hand: {e.why}</em></>}</p></div>); })}
      {score.meetsMinimum && <><h3>How the payout works</h3><ol className="pay-steps">{explainPayout(score.faan, ctx.selfDrawn, rules).map((s, k) => <li key={k}>{s}</li>)}</ol></>}
      {hints.length > 0 && <><h3>What is close</h3><ul className="hints">{hints.map((h, k) => <li key={k}>{h}</li>)}</ul></>}
    </div>
  );
}

const BONUS = ['Plum 1', 'Orchid 2', 'Chrysanthemum 3', 'Bamboo 4', 'Spring 1', 'Summer 2', 'Autumn 3', 'Winter 4'];
const caption = (t: number) => (t >= 34 ? BONUS[t - 34] : (tileName(t) ?? '').replace(/ \(.*\)/, ''));
export function Learn() {
  const groups: [string, number[]][] = [
    ['Characters 萬 – suit, numbers 1 to 9', [0, 1, 2, 3, 4, 5, 6, 7, 8]],
    ['Dots 筒 – suit, numbers 1 to 9', [9, 10, 11, 12, 13, 14, 15, 16, 17]],
    ['Bamboo 索 – suit, numbers 1 to 9 (the 1 is a bird)', [18, 19, 20, 21, 22, 23, 24, 25, 26]],
    ['Winds 風 – honour tiles: East, South, West, North', [27, 28, 29, 30]],
    ['Dragons 三元 – honour tiles: Red, Green, White', [31, 32, 33]],
    ['Flowers 花 and seasons 季 – bonus tiles, numbered 1 to 4', [34, 35, 36, 37, 38, 39, 40, 41]],
  ];
  return (
    <>
      <section className="card">
        <h2>The tiles</h2>
        <p className="muted small">There are four of each suit and honour tile (136 in all), plus one of each flower and season.</p>
        {groups.map(([l, ts]) => <div key={l} className="learn-group"><div className="palette-label">{l}</div><div className="row wrap gap">{ts.map((t) => <figure key={t} className="tile-fig"><Tile face={t} size={34} /><figcaption>{caption(t)}</figcaption></figure>)}</div></div>)}
      </section>
      <section className="card">
        <h2>How a hand wins</h2>
        <p>Make <b>four sets and a pair</b> with 14 tiles. A set is a run of three in a row in one suit, or three of the same tile.</p>
        <div className="row wrap gap">{parseTiles('234p').map((t, k) => <Tile key={k} face={t} size={30} />)}<span className="muted">run</span>{parseTiles('777s').map((t, k) => <Tile key={'b' + k} face={t} size={30} />)}<span className="muted">triplet</span>{parseTiles('CC').map((t, k) => <Tile key={'c' + k} face={t} size={30} />)}<span className="muted">pair</span></div>
      </section>
      <section className="card">
        <h2>Scoring patterns</h2>
        {PATTERNS.map((p) => <div key={p.name} className="pattern"><div className="row between"><b>{p.name} <em>{p.zh}</em></b><span className="chip">{p.faan}{/\d/.test(p.faan) ? ' faan' : ''}</span></div><p className="muted small">{p.note}</p><div className="pat-tiles">{parseTiles(p.example).map((t, k) => <Tile key={k} face={t} size={24} />)}</div></div>)}
      </section>
      <section className="card">
        <h2>Words you will see</h2>
        <dl className="glossary">{GLOSSARY.map((g) => <div key={g.term}><dt>{g.term} {g.zh && <em>{g.zh}</em>}</dt><dd>{g.meaning}</dd></div>)}</dl>
      </section>
    </>
  );
}
