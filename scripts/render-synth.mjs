// Renders the app's current tile drawings to training/synth/<face>.png for the classifier.
// Run: npx vite-node scripts/render-synth.mjs
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tileSvg } from '../src/tileSvg.ts';
mkdirSync('training/synth', { recursive: true });
for (let f = 0; f < 42; f++)
  writeFileSync(`training/synth/${f}.png`, new Resvg(tileSvg(f), { fitTo: { mode: 'width', value: 192 }, background: 'rgba(0,0,0,0)', font: { loadSystemFonts: false } }).render().asPng());
console.log('wrote 42 tiles');
