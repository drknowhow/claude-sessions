// QC helper: bundle once, then render chosen frames of a composition as PNGs.
//   node scripts/qc-frames.mjs <CompositionId> <frame,frame,...> [scale]
// Writes out/qc/<id>-<frame>.png.
import path from 'node:path';
import {mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'package.json'));
const {bundle} = require('@remotion/bundler');
const {selectComposition, renderStill} = require('@remotion/renderer');

const [id, list, scaleArg] = process.argv.slice(2);
if (!id || !list) {
  console.error('usage: node scripts/qc-frames.mjs <CompositionId> <f1,f2,...> [scale]');
  process.exit(2);
}
const frames = list.split(',').map((s) => Number(s.trim()));
const scale = scaleArg ? Number(scaleArg) : 0.5;
const outDir = path.join(root, 'out', 'qc');
mkdirSync(outDir, {recursive: true});

const serveUrl = await bundle({entryPoint: path.join(root, 'src', 'index.ts')});
const composition = await selectComposition({serveUrl, id, inputProps: {}});
for (const frame of frames) {
  const output = path.join(outDir, `${id}-${String(frame).padStart(4, '0')}.png`);
  await renderStill({serveUrl, composition, output, frame, scale, imageFormat: 'png', overwrite: true});
  console.log(output);
}
