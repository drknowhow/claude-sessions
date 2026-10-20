// Plays alert sounds in the hidden player window. Main sends
// { id, repeats, gap, volume, preview }; file sounds are fetched from main by
// id, decoded once and cached.
'use strict';

const FILE_MAX_S = 2.5; // long files are cut here, with a short fade
const FADE_S = 0.15;
const REPEAT_AFTER_MAX_S = 0.7; // a second play starts at most this far into the first

const ctx = new AudioContext();
const master = ctx.createGain();
const limiter = ctx.createDynamicsCompressor();
master.connect(limiter);
limiter.connect(ctx.destination);

const buffers = new Map();
let previewVoice = null;

async function bufferFor(id) {
  if (!buffers.has(id)) {
    const bytes = await window.player.load(id);
    const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    buffers.set(id, await ctx.decodeAudioData(copy));
  }
  return buffers.get(id);
}

function playBuffer(buf, dest, t0) {
  const len = Math.min(buf.duration, FILE_MAX_S);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.setValueAtTime(1, t0);
  if (buf.duration > FILE_MAX_S) {
    g.gain.setValueAtTime(1, t0 + len - FADE_S);
    g.gain.linearRampToValueAtTime(0, t0 + len);
  }
  src.connect(g);
  g.connect(dest);
  src.start(t0);
  src.stop(t0 + len + 0.01);
  return len;
}

async function play({ id, repeats = 1, gap = 0.18, volume = 0.8, preview = false }) {
  if (ctx.state === 'suspended') await ctx.resume();
  master.gain.setValueAtTime(Math.min(1, Math.max(0, volume)), ctx.currentTime);
  // Each play gets its own gain node, so a new preview can cut off the last one.
  const voice = ctx.createGain();
  voice.connect(master);
  if (preview) {
    if (previewVoice) previewVoice.disconnect();
    previewVoice = voice;
  }
  let once;
  if (id.startsWith('synth:')) {
    const fn = window.Synth[id.slice(6)];
    if (!fn) throw new Error(`no built-in sound ${id}`);
    once = (t) => fn(ctx, voice, t);
  } else {
    const buf = await bufferFor(id);
    once = (t) => playBuffer(buf, voice, t);
  }
  let t = ctx.currentTime + 0.03;
  for (let i = 0; i < repeats; i++) t += Math.min(once(t), REPEAT_AFTER_MAX_S) + gap;
}

window.player.onPlay((msg) => {
  play(msg).catch((err) => window.player.failed(msg, String((err && err.message) || err)));
});
