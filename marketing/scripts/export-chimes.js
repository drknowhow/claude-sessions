// Renders each built-in sound offline, through the same gain and limiter the
// app's player uses, and saves it as a 48 kHz mono WAV in marketing/out/sfx/.
// Run from the repo root:
//   npx electron marketing/scripts/export-chimes.js
// (On a shell that sets ELECTRON_RUN_AS_NODE, unset it first.)
// ES module, because marketing/package.json sets "type": "module".
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { app, BrowserWindow } from 'electron';

const here = path.dirname(fileURLToPath(import.meta.url));
const RATE = 48000;
const VOLUME = 0.8; // the player's default master volume
const repo = path.join(here, '..', '..');
const outDir = path.join(here, '..', 'out', 'sfx');
const synthSource = fs.readFileSync(path.join(repo, 'renderer', 'synth.js'), 'utf8');

const probe = `(async () => {
  const out = [];
  for (const name of Object.keys(window.Synth)) {
    const ctx = new OfflineAudioContext(1, ${RATE} * 2.5, ${RATE});
    const master = ctx.createGain();
    master.gain.value = ${VOLUME};
    const limiter = ctx.createDynamicsCompressor();
    master.connect(limiter);
    limiter.connect(ctx.destination);
    const said = window.Synth[name](ctx, master, 0);
    const data = (await ctx.startRendering()).getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) if (Math.abs(data[i]) > 0.0005) last = i;
    const keep = data.slice(0, Math.min(data.length, last + Math.round(${RATE} * 0.05)));
    const bytes = new Uint8Array(keep.buffer);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    out.push({ name, said, b64: btoa(bin) });
  }
  return out;
})()`;

function wav16(samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(s * 32767), i * 2);
  }
  const head = Buffer.alloc(44);
  head.write('RIFF', 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write('WAVE', 8);
  head.write('fmt ', 12);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20); // PCM
  head.writeUInt16LE(1, 22); // mono
  head.writeUInt32LE(RATE, 24);
  head.writeUInt32LE(RATE * 2, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write('data', 36);
  head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}

const fail = (e) => { console.error(e); app.exit(1); };
process.on('uncaughtException', fail);
setTimeout(() => fail(new Error('timed out after 60 s')), 60000).unref();

app.whenReady().then(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const win = new BrowserWindow({ show: false });
  await win.loadURL('data:text/html,<meta charset=utf-8>');
  await win.webContents.executeJavaScript(synthSource);
  const rows = await win.webContents.executeJavaScript(probe);
  const lengths = {};
  for (const r of rows) {
    const buf = Buffer.from(r.b64, 'base64');
    const samples = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
    let peak = 0;
    for (const v of samples) peak = Math.max(peak, Math.abs(v));
    fs.writeFileSync(path.join(outDir, `${r.name}.wav`), wav16(samples));
    lengths[r.name] = +r.said.toFixed(3);
    console.log(`${r.name.padEnd(8)} ${(samples.length / RATE).toFixed(2)} s  peak ${peak.toFixed(3)}  said ${r.said.toFixed(3)} s`);
  }
  // The length each synth reports sets the needs-you repeat spacing in the mixer.
  fs.writeFileSync(path.join(outDir, 'lengths.json'), JSON.stringify(lengths, null, 2));
  app.exit(0);
}).catch(fail);
