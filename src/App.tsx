import { useMemo, useRef, useState } from 'react';
import { Tile } from './Tile';
import { checkScan, applyFixes } from './scan/checks';
import { CameraGuide } from './CameraGuide';
import { useGames, HandState, emptyHand } from './store';
import { scoreHand, findWaits, Meld, Score } from './engine/scoring';
import { PRESETS, Rules, payouts } from './engine/rules';
import { WINDS, WIND_ZH, tileName } from './engine/tiles';
import { scanImage, learn, ScanResult, learnedCount, forgetLearned, calibrateTile, calibrated, forgetCalibration } from './scan/scan';

type Tab = 'hand' | 'scan' | 'rules';
type Mode = 'hand' | 'chow' | 'pung' | 'kong' | 'ckong';
const SUITS = [
  { label: '萬 Characters', tiles: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
  { label: '筒 Dots', tiles: [9, 10, 11, 12, 13, 14, 15, 16, 17] },
  { label: '索 Bamboo', tiles: [18, 19, 20, 21, 22, 23, 24, 25, 26] },
  { label: '字 Honours', tiles: [27, 28, 29, 30, 31, 32, 33] },
];
const meldTiles = (m: Meld) => (m.type === 'chow' ? [m.tile, m.tile + 1, m.tile + 2] : Array(m.type === 'kong' ? 4 : 3).fill(m.tile));

export default function App() {
  const store = useGames();
  const { game, setHand } = store;
  const hand = game.hand;
  const rules = game.rules;
  const [tab, setTab] = useState<Tab>('hand');
  const [mode, setMode] = useState<Mode>('hand');
  const [pickWin, setPickWin] = useState(false);

  const used = useMemo(() => {
    const c = new Array(34).fill(0);
    hand.concealed.forEach((t) => c[t]++);
    hand.melds.forEach((m) => meldTiles(m).forEach((t) => c[t]++));
    return c;
  }, [hand]);
  const size = hand.concealed.length + hand.melds.length * 3;

  const tap = (t: number) => {
    if (mode === 'hand') {
      if (used[t] >= 4 || size >= 14) return;
      setHand((h) => ({ ...h, concealed: [...h.concealed, t], winTile: t }));
    } else {
      if (size + 3 > 14) return;
      if (mode === 'chow' && (t >= 27 || t % 9 > 6 || used[t] >= 4 || used[t + 1] >= 4 || used[t + 2] >= 4)) return;
      if ((mode === 'pung' && used[t] > 1) || ((mode === 'kong' || mode === 'ckong') && used[t] > 0)) return;
      const m: Meld = mode === 'chow' ? { type: 'chow', tile: t } : mode === 'pung' ? { type: 'pung', tile: t } : { type: 'kong', tile: t, concealed: mode === 'ckong' };
      setHand((h) => ({ ...h, melds: [...h.melds, m] }));
      setMode('hand');
    }
  };
  const disabled = (t: number) => {
    if (mode === 'hand') return used[t] >= 4 || size >= 14;
    if (size + 3 > 14) return true;
    if (mode === 'chow') return t >= 27 || t % 9 > 6 || used[t] >= 4 || used[t + 1] >= 4 || used[t + 2] >= 4;
    if (mode === 'pung') return used[t] > 1;
    return used[t] > 0;
  };

  const ctxBase = { ...hand, concealed: hand.concealed };
  const result: Score | null = size === 14 && hand.winTile !== null ? scoreHand({ ...ctxBase, winTile: hand.winTile }, rules) : null;
  const waits = size === 13 ? findWaits(ctxBase, rules) : [];
  const sorted = [...hand.concealed].map((t, i) => ({ t, i })).sort((a, b) => a.t - b.t);

  return (
    <div className="app">
      <header className="top">
        <div className="brand"><span className="logo">發</span><div><h1>HK Mahjong</h1><p>港式麻雀 · {game.name}</p></div></div>
        <button className="chip" onClick={() => setTab('rules')}>{rules.minFaan}–{rules.limit} 番</button>
      </header>

      <main>
        {tab === 'hand' && (
          <>
            <section className="card handcard">
              <div className="row between">
                <h2>Your hand <span className="muted">{size}/14</span></h2>
                <div className="row gap">
                  <button className={`ghost ${pickWin ? 'on' : ''}`} onClick={() => setPickWin(!pickWin)} disabled={!hand.concealed.length}>★ Winning tile</button>
                  <button className="ghost" onClick={() => setHand(() => ({ ...emptyHand(), seatWind: hand.seatWind, roundWind: hand.roundWind }))}>Clear</button>
                </div>
              </div>
              {hand.melds.length > 0 && (
                <div className="melds">
                  {hand.melds.map((m, i) => (
                    <button key={i} className="meld" onClick={() => setHand((h) => ({ ...h, melds: h.melds.filter((_, j) => j !== i) }))} aria-label="remove meld">
                      {meldTiles(m).map((t, k) => <Tile key={k} face={t} size={30} back={m.type === 'kong' && m.concealed && (k === 0 || k === 3)} />)}
                      <span className="meld-tag">{m.type === 'kong' ? (m.concealed ? '暗槓' : '明槓') : m.type === 'pung' ? '碰' : '上'}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="hand">
                {sorted.length === 0 && <p className="empty">Tap tiles below to build your hand, or use Scan.</p>}
                {sorted.map(({ t, i }) => (
                  <Tile key={i} face={t} size={38} selected={hand.winTile === t && pickWin === false && i === hand.concealed.lastIndexOf(t)}
                    badge={hand.winTile === t && i === hand.concealed.lastIndexOf(t) ? '★' : undefined}
                    onClick={() => pickWin ? (setHand((h) => ({ ...h, winTile: t })), setPickWin(false)) : setHand((h) => {
                      const c = h.concealed.filter((_, j) => j !== i);
                      return { ...h, concealed: c, winTile: c.includes(h.winTile ?? -1) ? h.winTile : c[c.length - 1] ?? null };
                    })} />
                ))}
              </div>
              {pickWin && <p className="hint">Tap the tile you won on.</p>}
              {(hand.flowers.length > 0 || hand.seasons.length > 0) && (
                <div className="row wrap gap small">{hand.flowers.map((f) => <Tile key={'f' + f} face={33 + f} size={26} />)}{hand.seasons.map((f) => <Tile key={'s' + f} face={37 + f} size={26} />)}</div>
              )}
            </section>

            <ResultCard result={result} waits={waits} size={size} rules={rules} selfDrawn={hand.selfDrawn} />

            <section className="card">
              <div className="segmented">
                {(['hand', 'chow', 'pung', 'kong', 'ckong'] as Mode[]).map((m) => (
                  <button key={m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>
                    {{ hand: 'Tile', chow: 'Chow 上', pung: 'Pung 碰', kong: 'Kong 槓', ckong: '暗槓' }[m]}
                  </button>
                ))}
              </div>
              {mode !== 'hand' && <p className="hint">Tap the {mode === 'chow' ? 'lowest tile of the run' : 'tile'} to add an exposed {mode === 'ckong' ? 'concealed kong' : mode}.</p>}
              {SUITS.map((s) => (
                <div key={s.label} className="palette-row">
                  <div className="palette-label">{s.label}</div>
                  <div className="palette">
                    {s.tiles.map((t) => <Tile key={t} face={t} size={34} dim={disabled(t)} onClick={disabled(t) ? undefined : () => tap(t)} badge={used[t] ? String(used[t]) : undefined} />)}
                  </div>
                </div>
              ))}
            </section>

            <Situation hand={hand} setHand={setHand} rules={rules} />
          </>
        )}
        {tab === 'scan' && <Scan onUse={(tiles) => { const main = tiles.filter((t) => t < 34);
          setHand((h) => ({ ...h, concealed: main, melds: [], winTile: main[main.length - 1] ?? null,
            flowers: tiles.filter((t) => t >= 34 && t < 38).map((t) => t - 33), seasons: tiles.filter((t) => t >= 38).map((t) => t - 37) })); setTab('hand'); }} />}
        {tab === 'rules' && <RulesScreen store={store} />}
      </main>

      <nav className="tabs">
        {([['hand', '🀄', 'Hand'], ['scan', '📷', 'Scan'], ['rules', '⚙︎', 'Rules']] as [Tab, string, string][]).map(([k, i, l]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}><span>{i}</span>{l}</button>
        ))}
      </nav>
    </div>
  );
}

function ResultCard({ result, waits, size, rules, selfDrawn }: { result: Score | null; waits: ReturnType<typeof findWaits>; size: number; rules: Rules; selfDrawn: boolean }) {
  if (size === 13) {
    return (
      <section className="card result">
        <h2>Waiting tiles 聽牌</h2>
        {waits.length === 0 ? <p className="muted">Not ready: no tile completes this hand yet.</p> : (
          <div className="waits">
            {waits.map((w) => (
              <div key={w.tile} className={`wait ${w.score.meetsMinimum ? '' : 'short'}`}>
                <Tile face={w.tile} size={36} />
                <b>{w.score.isLimit ? '滿' : w.score.faan}</b><small>{w.score.isLimit ? 'limit' : 'faan'}</small>
                {!w.score.meetsMinimum && <small className="warn">below min</small>}
              </div>
            ))}
          </div>
        )}
        <p className="muted small">Faan assume a {selfDrawn ? 'self-drawn' : 'discard'} win with current settings.</p>
      </section>
    );
  }
  if (!result) return <section className="card result muted-card"><p className="muted">Add {Math.max(0, 13 - size)} more tile{13 - size === 1 ? '' : 's'} to see waits, or 14 to score a win.</p></section>;
  if (!result.valid) return <section className="card result bad"><h2>Not a winning hand</h2><p className="muted">{result.reason}</p></section>;
  const pay = payouts(result.faan, selfDrawn, rules);
  return (
    <section className={`card result ${result.meetsMinimum ? 'good' : 'short'}`}>
      <div className="row between">
        <div>
          <h2>{result.meetsMinimum ? 'Mahjong! 食糊' : 'Below minimum'}</h2>
          <p className="muted small">{result.meetsMinimum ? (result.isLimit ? 'Limit hand 爆棚' : `Minimum ${rules.minFaan} faan`) : `Needs ${rules.minFaan} faan to win under these rules`}</p>
        </div>
        <div className="faan"><b>{result.faan}</b><span>番</span></div>
      </div>
      <ul className="breakdown">
        {result.items.map((i, k) => <li key={k}><span>{i.name} <em>{i.zh}</em></span><b>{i.limit ? 'Limit' : `${i.faan}`}</b></li>)}
      </ul>
      {result.meetsMinimum && <div className="pay">{pay.map((p) => <span key={p.from}>{p.from}: <b>{p.points}</b> pts</span>)}</div>}
    </section>
  );
}

function Situation({ hand, setHand, rules }: { hand: HandState; setHand: (f: (h: HandState) => HandState) => void; rules: Rules }) {
  const toggle = (k: keyof HandState) => setHand((h) => ({ ...h, [k]: !h[k] }));
  const flip = (k: 'flowers' | 'seasons', n: number) => setHand((h) => ({ ...h, [k]: h[k].includes(n) ? h[k].filter((x) => x !== n) : [...h[k], n].sort() }));
  return (
    <section className="card">
      <h2>Situation</h2>
      <div className="field"><label>Seat wind 門風</label><div className="segmented sm">{WINDS.map((w, i) => <button key={w} className={hand.seatWind === i ? 'on' : ''} onClick={() => setHand((h) => ({ ...h, seatWind: i }))}>{WIND_ZH[i]}</button>)}</div></div>
      <div className="field"><label>Round wind 圈風</label><div className="segmented sm">{WINDS.map((w, i) => <button key={w} className={hand.roundWind === i ? 'on' : ''} onClick={() => setHand((h) => ({ ...h, roundWind: i }))}>{WIND_ZH[i]}</button>)}</div></div>
      <div className="field"><label>Win by</label><div className="segmented sm"><button className={!hand.selfDrawn ? 'on' : ''} onClick={() => setHand((h) => ({ ...h, selfDrawn: false }))}>Discard 出銃</button><button className={hand.selfDrawn ? 'on' : ''} onClick={() => setHand((h) => ({ ...h, selfDrawn: true }))}>Self-drawn 自摸</button></div></div>
      {rules.flowersInPlay && (
        <div className="field"><label>Flowers & seasons</label>
          <div className="row wrap gap">
            {[1, 2, 3, 4].map((n) => <Tile key={'f' + n} face={33 + n} size={30} dim={!hand.flowers.includes(n)} onClick={() => flip('flowers', n)} />)}
            <span className="sep" />
            {[1, 2, 3, 4].map((n) => <Tile key={'s' + n} face={37 + n} size={30} dim={!hand.seasons.includes(n)} onClick={() => flip('seasons', n)} />)}
          </div>
        </div>
      )}
      <div className="toggles">
        {([['lastTile', 'Last tile 海底'], ['kongReplacement', 'Kong replacement 槓上'], ['robbingKong', 'Robbing kong 搶槓'], ['heavenly', 'Heavenly 天糊'], ['earthly', 'Earthly 地糊']] as [keyof HandState, string][]).map(([k, l]) => (
          <button key={k} className={`pill ${hand[k] ? 'on' : ''}`} onClick={() => toggle(k)}>{l}</button>
        ))}
      </div>
    </section>
  );
}

function Scan({ onUse }: { onUse: (tiles: number[]) => void }) {
  const [count, setCount] = useState(14);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<(ScanResult & { orig: number })[]>([]);
  const [fix, setFix] = useState<number | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const [learnedN, setLearnedN] = useState(learnedCount());
  const [cam, setCam] = useState(false);
  const go = async (f: Blob) => {
    setCam(false);
    setBusy(true); setPhoto(URL.createObjectURL(f));
    try { setRes((await scanImage(f, count)).map((r) => ({ ...r, orig: r.tile }))); } finally { setBusy(false); }
  };
  const use = () => {
    const corrected = res.filter((r) => r.tile !== r.orig || r.confidence < 0.5);
    learn(corrected.map((r) => ({ tile: r.tile, feat: r.feat })));
    setLearnedN(learnedCount());
    onUse(res.map((r) => r.tile));
  };
  return (
    <>
      <section className="card">
        <h2>Scan tiles 掃描</h2>
        <p className="muted small">Line your tiles up in <b>one straight row</b>, face up and upright, on a dark table. Fill the frame edge to edge, then take the photo.</p>
        <div className="field"><label>Tiles in photo</label><div className="stepper"><button onClick={() => setCount(Math.max(1, count - 1))}>−</button><b>{count}</b><button onClick={() => setCount(Math.min(18, count + 1))}>+</button></div></div>
        <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={(e) => e.target.files?.[0] && go(e.target.files[0])} />
        <button className="primary block" onClick={() => setCam(true)} disabled={busy}>{busy ? 'Reading tiles…' : '📷 Open camera guide'}</button>
        <button className="ghost block" onClick={() => input.current?.click()} disabled={busy}>🖼 Choose a photo instead</button>
        {cam && <CameraGuide count={count} onCapture={go} onClose={() => setCam(false)} />}
        {photo && <img className="photo" src={photo} alt="scanned" />}
        <Calibrate />
        <p className="muted small">Learned from your corrections: {learnedN} tile{learnedN === 1 ? '' : 's'} {learnedN > 0 && <button className="link" onClick={() => { forgetLearned(); setLearnedN(0); }}>reset</button>}</p>
      </section>
      {res.length > 0 && (
        <section className="card">
          <h2>Review 檢查</h2>
          <p className="muted small">Tap any tile that is wrong and pick the right one. Orange = low confidence.</p>
          {checkScan(res).map((iss, k) => (
            <div key={k} className="issue">
              <span>⚠︎ {iss.message}</span>
              {iss.fixes.length > 0 && <button className="ghost" onClick={() => setRes(applyFixes(res, iss.fixes))}>
                Fix: {iss.fixes.map((f) => `#${f.index + 1} → ${tileName(f.to)}`).join(', ')}</button>}
            </div>
          ))}
          <div className="review">
            {res.map((r, i) => (
              <button key={i} className={`rv ${r.confidence < 0.5 ? 'low' : ''} ${r.tile !== r.orig ? 'fixed' : ''} ${fix === i ? 'sel' : ''}`} onClick={() => setFix(i)}>
                <img src={r.crop} alt="" />
                <Tile face={r.tile} size={30} />
              </button>
            ))}
          </div>
          {fix !== null && (
            <div className="picker">
              <p className="small">Tile {fix + 1} is actually:</p>
              <div className="palette wrap">{Array.from({ length: 42 }, (_, t) => <Tile key={t} face={t} size={28} label={tileName(t)} selected={res[fix].tile === t} onClick={() => { setRes(res.map((r, j) => (j === fix ? { ...r, tile: t } : r))); setFix(fix + 1 < res.length ? fix + 1 : null); }} />)}</div>
            </div>
          )}
          <button className="primary block" onClick={use}>Use this hand</button>
        </section>
      )}
    </>
  );
}

function Calibrate() {
  const [open, setOpen] = useState(false);
  const [map, setMap] = useState(() => calibrated());
  const [cur, setCur] = useState<number | null>(null);
  const [flowers, setFlowers] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const n = [...map.keys()].filter((t) => t < 34).length;
  const total = flowers ? 42 : 34;
  const next = (from: number) => { for (let t = from + 1; t < total; t++) if (!map.has(t)) return t; return null; };
  const shoot = (t: number) => { setCur(t); input.current?.click(); };
  const got = async (f: File) => {
    if (cur === null) return;
    await calibrateTile(f, cur);
    const m = calibrated(); setMap(m);
    const nx = next(cur); setCur(nx);
  };
  return (
    <div className="calib">
      <button className="ghost block" onClick={() => setOpen(!open)}>🎯 Calibrate with my tiles <b>{n}/34</b></button>
      {open && (
        <>
          <p className="muted small">Photograph each tile of <b>your own set</b> once, close up on a dark surface. Scans then match against your photos first (stored only on this phone). Tap a tile to (re)shoot it.</p>
          <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) got(f); }} />
          <div className="palette wrap">
            {Array.from({ length: total }, (_, t) => (
              <button key={t} className={`cal ${map.has(t) ? 'done' : ''} ${cur === t ? 'sel' : ''}`} onClick={() => shoot(t)}>
                {map.has(t) ? <img src={map.get(t)} alt="" /> : <Tile face={t} size={26} />}
              </button>
            ))}
          </div>
          <div className="row">
            <button className="primary" onClick={() => { const t = next(-1); if (t !== null) shoot(t); }} disabled={next(-1) === null}>📷 Next tile</button>
            <label className="switch inline"><span>Flowers</span><input type="checkbox" checked={flowers} onChange={(e) => setFlowers(e.target.checked)} /><i /></label>
            {map.size > 0 && <button className="link" onClick={() => { forgetCalibration(); setMap(new Map()); }}>reset</button>}
          </div>
        </>
      )}
    </div>
  );
}

type Store = ReturnType<typeof useGames>;
function RulesScreen({ store }: { store: Store }) {
  const { game, games } = store;
  const r = game.rules;
  const set = (patch: Partial<Rules>) => store.setRules({ ...r, ...patch });
  const num = (k: keyof Rules, label: string, min = 0, max = 20) => (
    <div className="field" key={k}><label>{label}</label><div className="stepper"><button onClick={() => set({ [k]: Math.max(min, (r[k] as number) - 1) })}>−</button><b>{r[k] as number}</b><button onClick={() => set({ [k]: Math.min(max, (r[k] as number) + 1) })}>+</button></div></div>
  );
  const bool = (k: keyof Rules, label: string) => (
    <label className="switch" key={k}><span>{label}</span><input type="checkbox" checked={r[k] as boolean} onChange={(e) => set({ [k]: e.target.checked })} /><i /></label>
  );
  return (
    <>
      <section className="card">
        <h2>Games 牌局</h2>
        <p className="muted small">Each game keeps its own rules and hand.</p>
        <div className="games">
          {games.map((g) => (
            <div key={g.id} className={`game ${g.id === game.id ? 'on' : ''}`} onClick={() => store.select(g.id)}>
              <div><b>{g.name}</b><small>{PRESETS.find((p) => p.id === g.presetId)?.name ?? 'Custom rules'} · {g.rules.minFaan}–{g.rules.limit} faan</small></div>
              {games.length > 1 && <button className="link" onClick={(e) => { e.stopPropagation(); store.remove(g.id); }}>Delete</button>}
            </div>
          ))}
        </div>
        <div className="field"><label>Name</label><input className="text" value={game.name} onChange={(e) => store.rename(e.target.value)} /></div>
        <button className="ghost block" onClick={() => store.create(game.presetId === 'custom' ? PRESETS[0].id : game.presetId)}>+ New game</button>
      </section>
      <section className="card">
        <h2>Preset 規則</h2>
        <div className="presets">
          {PRESETS.map((p) => (
            <button key={p.id} className={`preset ${game.presetId === p.id ? 'on' : ''}`} onClick={() => store.setRules({ ...p.rules }, p.id)}>
              <b>{p.name} <em>{p.zh}</em></b><small>{p.description}</small>
            </button>
          ))}
          {game.presetId === 'custom' && <div className="preset on"><b>Custom</b><small>You changed individual rules below.</small></div>}
        </div>
      </section>
      <section className="card">
        <h2>Winning</h2>
        {num('minFaan', 'Minimum faan 起糊', 0, 10)}
        {num('limit', 'Faan limit 滿糊', 3, 20)}
        {bool('chickenHand', 'Chicken hand (0 faan) allowed 雞糊')}
        {bool('sevenPairs', 'Seven Pairs allowed 七對')}
        {r.sevenPairs && num('sevenPairsFaan', 'Seven Pairs faan')}
        {bool('halfLimitHands', 'Great Dragons / Small Winds = half limit')}
      </section>
      <section className="card">
        <h2>Faan values</h2>
        {num('selfDrawnFaan', 'Self-drawn 自摸')}
        {num('concealedFaan', 'Concealed hand 門前清')}
        {num('concealedSelfDrawnBonus', 'Extra: concealed + self-drawn 不求人')}
        {num('robbingKongFaan', 'Robbing a kong 搶槓')}
        {num('lastTileFaan', 'Win on last tile 海底')}
        {num('kongReplacementFaan', 'Kong replacement 槓上開花')}
        {num('commonHandFaan', 'Common hand 平糊')}
        {num('allPungsFaan', 'All pungs 對對糊')}
        {num('mixedSuitFaan', 'Mixed one suit 混一色')}
        {num('pureSuitFaan', 'Pure one suit 清一色')}
      </section>
      <section className="card">
        <h2>Flowers 花</h2>
        {bool('flowersInPlay', 'Flowers & seasons in play')}
        {r.flowersInPlay && <>{num('seatFlowerFaan', 'Own seat flower 正花')}{num('flowerSetFaan', 'Full set of four 一台花')}{num('noFlowerFaan', 'No flowers 無花')}</>}
      </section>
      <section className="card">
        <h2>Payment 計分</h2>
        <div className="field"><label>Doubling table</label><div className="segmented sm"><button className={r.payment === 'half-spicy' ? 'on' : ''} onClick={() => set({ payment: 'half-spicy' })}>Half-spicy 半辣</button><button className={r.payment === 'full-spicy' ? 'on' : ''} onClick={() => set({ payment: 'full-spicy' })}>Full-spicy 全辣</button></div></div>
        {bool('discarderPaysAll', 'Discarder pays for all 全銃')}
        {num('basePoints', 'Base points', 1, 100)}
      </section>
    </>
  );
}
