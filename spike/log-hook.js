// Phase 0 spike: log every hook payload so we can see real shapes.
// Truncates free text (prompts, replies, tool input) so the log stays small.
// Always exits 0: a hook must never block a session.
'use strict';
const t0 = process.hrtime.bigint();
const fs = require('fs');
const path = require('path');

const LOG = path.join(process.env.LOCALAPPDATA || '.', 'ClaudeSessions', 'spike.jsonl');
const CLIP = 120;

function clip(v) {
  if (typeof v === 'string') return v.length > CLIP ? v.slice(0, CLIP) + `…(${v.length})` : v;
  if (Array.isArray(v)) return v.slice(0, 5).map(clip);
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, x] of Object.entries(v)) out[k] = clip(x);
    return out;
  }
  return v;
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  let payload;
  try { payload = JSON.parse(raw); } catch { payload = { _unparsed: raw.slice(0, 200) }; }
  const rec = {
    ts: new Date().toISOString(),
    pid: process.pid,
    ppid: process.ppid,
    env: {
      CLAUDE_CODE_ENTRYPOINT: process.env.CLAUDE_CODE_ENTRYPOINT,
      WT_SESSION: process.env.WT_SESSION,
      TERM_PROGRAM: process.env.TERM_PROGRAM,
      CLAUDE_PROJECT_DIR: process.env.CLAUDE_PROJECT_DIR,
      SHELL: process.env.SHELL,
      CLAUDE_PID: process.env.CLAUDE_PID,
      CLAUDE_CODE_SESSION_ID: process.env.CLAUDE_CODE_SESSION_ID,
    },
    keys: Object.keys(payload),
    payload: clip(payload),
    ms: Number(process.hrtime.bigint() - t0) / 1e6,
  };
  try { fs.appendFileSync(LOG, JSON.stringify(rec) + '\n'); } catch { /* never fail the hook */ }
  process.exit(0);
});
setTimeout(() => process.exit(0), 3000).unref();
