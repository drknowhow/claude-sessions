// Add or remove the spike logger in ~/.claude/settings.json.
// usage: node toggle-spike-hooks.js add|remove
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const SETTINGS = path.join(os.homedir(), '.claude', 'settings.json');
const NODE = process.execPath;
const SCRIPT = path.join(__dirname, 'log-hook.js');
const MARK = path.join('spike', 'log-hook.js'); // matches in any clone folder
const EVENTS = ['SessionStart', 'UserPromptSubmit', 'Notification', 'Stop', 'StopFailure',
  'SessionEnd', 'PreToolUse', 'PostToolUse', 'PermissionRequest', 'SubagentStop'];

const mode = process.argv[2];
const text = fs.readFileSync(SETTINGS, 'utf8');
const s = JSON.parse(text); // throws on bad JSON: nothing gets written
s.hooks = s.hooks || {};

const isOurs = (h) => Array.isArray(h.args) && h.args.some((a) => String(a).includes(MARK));
for (const ev of Object.keys(s.hooks)) {
  s.hooks[ev] = s.hooks[ev]
    .map((g) => ({ ...g, hooks: (g.hooks || []).filter((h) => !isOurs(h)) }))
    .filter((g) => g.hooks.length > 0);
  if (s.hooks[ev].length === 0) delete s.hooks[ev];
}
if (mode === 'add') {
  for (const ev of EVENTS) {
    (s.hooks[ev] = s.hooks[ev] || []).push({
      hooks: [{ type: 'command', command: NODE, args: [SCRIPT], async: true, timeout: 10 }],
    });
  }
} else if (mode !== 'remove') {
  console.error('usage: add|remove'); process.exit(2);
}
fs.writeFileSync(SETTINGS, JSON.stringify(s, null, 2) + '\n');
console.log(mode, 'ok;', Object.entries(s.hooks).map(([k, v]) => `${k}:${v.length}`).join(' '));
