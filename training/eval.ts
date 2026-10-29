// Browser eval of the real app pipeline (run via `npm run dev`, open /training/eval.html).
// Needs training/data/ (see training/README.md); prints JSON results into #out.
import { scanImage } from '../src/scan/scan';
const out = document.getElementById('out')!;
async function blob(u: string) { return (await fetch(u)).blob(); }
async function run() {
  const res: Record<string, unknown> = {};
  const held: [string, number][] = await (await fetch('./data/heldout/meta.json')).json();
  for (const useModel of [true, false]) {
    let ok = 0, top3 = 0;
    for (const [n, c] of held) {
      const r = (await scanImage(await blob(`./data/heldout/${n}`), 1, { useModel, modelUrl: '/model/tiles-v1.bin' })).tiles[0];
      if (r.tile === c) ok++;
      if (r.alts.some((a) => a.tile === c)) top3++;
    }
    res[`single_${useModel ? 'model' : 'templates'}`] = { n: held.length, top1: ok / held.length, top3: top3 / held.length };
  }
  const rows: { file: string; tiles: number[]; tilt: number; rows: number }[] = await (await fetch('./data/rows/meta.json')).json();
  for (const useModel of [true, false]) {
    let found = 0, tiles = 0, ok = 0, perfect = 0, rowsOk = 0;
    for (const m of rows) {
      const o = await scanImage(await blob(`./data/rows/${m.file}`), 0, { useModel, modelUrl: '/model/tiles-v1.bin' });
      tiles += m.tiles.length;
      if (o.tiles.length === m.tiles.length) {
        found++; if (o.rows === m.rows) rowsOk++;
        const k = o.tiles.filter((t, i) => t.tile === m.tiles[i]).length; ok += k; if (k === m.tiles.length) perfect++;
      }
    }
    res[`rows_${useModel ? 'model' : 'templates'}`] = { photos: rows.length, countCorrect: found, rowsCorrect: rowsOk, tileAcc: ok / tiles, allTilesRight: perfect };
  }
  out.textContent = JSON.stringify(res, null, 1);
  out.dataset.done = '1';
}
run().catch((e) => { out.textContent = 'ERR ' + e; out.dataset.done = '1'; });
