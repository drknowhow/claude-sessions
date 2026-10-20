// Renders every marketing deliverable into ../docs/. Intermediates go to out/.
//   node scripts/render.mjs                -> every step, in order
//   node scripts/render.mjs main audio     -> just those steps
// Steps: chimes, main, vertical, audio, poster, hero, stills, filmstrip.
import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(root, '..');
const out = path.join(root, 'out');
const docs = path.join(repo, 'docs');
for (const d of [out, path.join(docs, 'media'), path.join(docs, 'brand')]) mkdirSync(d, {recursive: true});

const require = createRequire(import.meta.url);
const cli = path.join(path.dirname(require.resolve('@remotion/cli/package.json')), 'remotion-cli.js');

const run = (cmd, args, opts = {}) => {
  console.log(`\n> ${path.basename(cmd)} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, {cwd: root, stdio: 'inherit', ...opts});
  if (r.error) throw r.error;
  if (r.status !== 0) process.exit(r.status ?? 1);
};
const remotion = (...args) => run(process.execPath, [cli, ...args]);
const duration = (file) =>
  Number(
    spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], {
      encoding: 'utf8',
    }).stdout.trim(),
  );
const size = (file) => statSync(file).size;
const mb = (n) => `${(n / 1048576).toFixed(2)} MB`;

const H264 = ['--codec=h264', '--crf=16', '--x264-preset=slow', '--pixel-format=yuv420p'];
const OUT_MAIN = 'out/promo.mp4';
const OUT_VERT = 'out/promo-vertical.mp4';
const DOC = {
  main: path.join(docs, 'media', 'claude-sessions-promo.mp4'),
  vertical: path.join(docs, 'media', 'claude-sessions-promo-vertical.mp4'),
  poster: path.join(docs, 'media', 'poster.jpg'),
  hero: path.join(docs, 'hero.gif'),
  banner: path.join(docs, 'brand', 'banner.png'),
  social: path.join(docs, 'brand', 'social-preview.png'),
};
const GIF_LIMIT = 5 * 1024 * 1024;
// Popup open, rows in, caption "Hover for every session, most urgent first."
const POSTER_FRAME = 470;

// One frame every 2 s, tiled into a contact sheet for QC.
const filmstrip = (src, dest, cols, tileW) => {
  const n = Math.floor(duration(src) / 2) + 1;
  const rows = Math.ceil(n / cols);
  run('ffmpeg', [
    '-y', '-v', 'error', '-i', src,
    '-vf', `fps=1/2,scale=${tileW}:-2,tile=${cols}x${rows}:padding=10:margin=10:color=0x0B0C0E`,
    '-frames:v', '1', '-update', '1', dest,
  ]);
};

const steps = {
  // The app's own synth (renderer/synth.js) played offline in Electron, saved as 48 kHz WAVs.
  chimes: () => {
    const electron = createRequire(path.join(repo, 'package.json'))('electron');
    const env = {...process.env};
    delete env.ELECTRON_RUN_AS_NODE;
    run(electron, [path.join('marketing', 'scripts', 'export-chimes.js')], {cwd: repo, env});
  },
  main: () => remotion('render', 'src/index.ts', 'Promo', OUT_MAIN, ...H264),
  vertical: () => remotion('render', 'src/index.ts', 'PromoVertical', OUT_VERT, ...H264),
  // Sound cues come from the same timeline as the video, then the mixer muxes both cuts.
  audio: async () => {
    if (!existsSync(path.join(out, 'sfx', 'lengths.json'))) steps.chimes();
    const t = await import(pathToFileURL(path.join(root, 'src', 'timeline.ts')).href);
    const cues = {fps: t.FPS, frames: t.PROMO_DUR, needsRepeatFrames: t.NEEDS_REPEAT_F, scenes: t.SCENES, cues: t.CUES};
    writeFileSync(path.join(out, 'cues.json'), JSON.stringify(cues, null, 2));
    run('python', ['-I', path.join(root, 'scripts', 'mix_audio.py')]);
  },
  poster: () =>
    remotion('still', 'src/index.ts', 'Promo', DOC.poster, `--frame=${POSTER_FRAME}`, '--image-format=jpeg', '--jpeg-quality=90'),
  hero: () => {
    // Render crisp at 1280x720 (scale 0.5 of the 2560x1440 comp), then a palette GIF at 15 fps.
    const src = path.join(out, 'hero-src.mp4');
    remotion('render', 'src/index.ts', 'Hero', src, '--codec=h264', '--crf=10', '--scale=0.5');
    for (const [colors, dither] of [[160, 'sierra2_4a'], [128, 'sierra2_4a'], [96, 'bayer:bayer_scale=3']]) {
      run('ffmpeg', [
        '-y', '-v', 'error', '-i', src,
        '-vf', `fps=15,split[a][b];[a]palettegen=max_colors=${colors}:stats_mode=full[p];[b][p]paletteuse=dither=${dither}`,
        '-loop', '0', DOC.hero,
      ]);
      if (size(DOC.hero) < GIF_LIMIT) break;
      console.log(`hero.gif is ${mb(size(DOC.hero))} with ${colors} colours; retrying smaller`);
    }
    rmSync(src, {force: true});
  },
  stills: () => {
    remotion('still', 'src/index.ts', 'Banner', DOC.banner, '--scale=2');
    remotion('still', 'src/index.ts', 'SocialPreview', DOC.social);
  },
  filmstrip: () => {
    if (existsSync(DOC.main)) filmstrip(DOC.main, 'out/filmstrip.png', 3, 640);
    if (existsSync(DOC.vertical)) filmstrip(DOC.vertical, 'out/filmstrip-vertical.png', 7, 270);
  },
};

const wanted = process.argv.slice(2);
for (const name of wanted.length ? wanted : Object.keys(steps)) {
  if (!steps[name]) {
    console.error(`unknown step: ${name} (use ${Object.keys(steps).join(', ')})`);
    process.exit(2);
  }
  await steps[name]();
}

console.log('');
for (const f of Object.values(DOC)) {
  if (!existsSync(f)) continue;
  const d = /\.(mp4|gif)$/.test(f) ? `  ${duration(f).toFixed(2)} s` : '';
  console.log(`${path.relative(repo, f).padEnd(44)} ${mb(size(f))}${d}`);
}
