'use strict';
const os = require('os');
const path = require('path');

const home = os.homedir();
const local = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
const roaming = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');

// Runtime files live where reporter/report.js looks for them (LOCALAPPDATA);
// settings the user chose live in the roaming profile.
const dataDir = path.join(local, 'ClaudeSessions');
const configDir = path.join(roaming, 'ClaudeSessions');
const claudeDir = path.join(home, '.claude');

module.exports = {
  dataDir,
  serverFile: path.join(dataDir, 'server.json'),
  spoolFile: path.join(dataDir, 'spool.jsonl'),
  stateFile: path.join(dataDir, 'state.json'),
  reporterDir: path.join(dataDir, 'reporter'),
  configDir,
  configFile: path.join(configDir, 'config.json'),
  soundsDir: path.join(configDir, 'sounds'),
  stashFile: path.join(configDir, 'stashed-hooks.json'),
  claudeDir,
  settingsFile: path.join(claudeDir, 'settings.json'),
  sessionsDir: path.join(claudeDir, 'sessions'),
  windowsMediaDir: path.join(process.env.SystemRoot || 'C:\\Windows', 'Media'),
};
