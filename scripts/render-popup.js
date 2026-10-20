// Renders the popup with made-up sessions, in light and dark, to PNG files,
// so a change to the popup can be looked at without a tray or a terminal.
//   npx electron scripts/render-popup.js [output folder]
// The sessions are fixtures; the model, the catalog and the renderer are the real ones.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron');
const paths = require('../paths');
const sounds = require('../sounds');
const { popupModel } = require('../popup-view');
const { WIDTH } = require('../popup');

const outDir = path.resolve(process.argv.slice(2).find((a) => !a.startsWith('-')) || path.join(os.tmpdir(), 'claude-sessions-render'));
const ROOT = path.join(__dirname, '..');
const PAD = 14;
const DESKTOP = { light: '#c9ced6', dark: '#16181d' }; // stands in for whatever is behind the card
const MIN = 60 * 1000;

function fixtures(now) {
  const base = (pid, project, branch, extra) => ({
    pid,
    sessionId: `fixture-${pid}`,
    cwd: `C:\\work\\${project}`,
    project,
    branch,
    entrypoint: 'cli',
    lastActivity: now - pid * 1000,
    ...extra,
  });
  const rows = [
    base(101, 'shop', 'checkout', { state: 'needs', since: now - 1 * MIN, needsReason: 'Needs permission: Bash', firstPrompt: 'Fix the tax rounding on the checkout page' }),
    base(102, 'mobile-app', 'main', { state: 'error', since: now - 4 * MIN, error: 'API overloaded (529)' }),
    base(103, 'ClaudeSessionsTray', 'master', { state: 'done', since: now - 2 * MIN, backgroundTasks: 2 }),
    base(104, 'docs-site', 'search', { state: 'working', since: now - 6 * MIN, tool: 'Edit', firstPrompt: 'Add a search box to the docs sidebar' }),
    base(105, 'inventory', '', { state: 'idle', since: now - 41 * MIN, firstPrompt: 'Why does the order list drop the quantity when an item is added twice from the scanner?' }),
    base(106, 'benchmarks', 'nightly', { state: 'ended', since: now - 3 * MIN, endedAt: now - 3 * MIN }),
  ];
  return Object.fromEntries(rows.map((r) => [String(r.pid), r]));
}

function buildModels() {
  const now = Date.now();
  const catalog = sounds.buildCatalog({ windowsDir: paths.windowsMediaDir, customDir: paths.soundsDir });
  const sessions = fixtures(now);
  const config = {
    showAll: false,
    dndUntil: now + 60 * MIN,
    volume: 0.8,
    aliases: { 'fixture-103': 'popup wiring' },
    projectSounds: {},
    sessionSounds: { 'fixture-102': 'synth:glass' },
    muted: { 'fixture-104': true },
  };
  config.projectSounds = sounds.assignProjects(config, Object.values(sessions), catalog) || {};
  return {
    full: popupModel({ sessions, config, catalog, now, hooksInstalled: true }),
    empty: popupModel({ sessions: {}, config: { ...config, dndUntil: 0 }, catalog, now, hooksInstalled: false }),
  };
}

// Each shot closes its window; without this Electron quits after the first one.
app.on('window-all-closed', () => {});

const heights = new Map();
ipcMain.on('popup:resize', (e, h) => heights.set(e.sender.id, Math.ceil(Number(h))));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot({ name, theme, model, action }) {
  nativeTheme.themeSource = theme;
  const win = new BrowserWindow({
    width: WIDTH + 2 * PAD,
    height: 600,
    show: false,
    useContentSize: true,
    backgroundColor: DESKTOP[theme],
    webPreferences: { preload: path.join(ROOT, 'preload.js'), contextIsolation: true, sandbox: true },
  });
  try {
    await win.loadFile(path.join(ROOT, 'renderer', 'popup.html'));
    await win.webContents.insertCSS(`body { padding: ${PAD}px !important; }`);
    win.webContents.send('popup:model', model);
    await wait(150);
    if (action) await action(win);
    await wait(250);
    const h = heights.get(win.webContents.id) || 300;
    win.setContentSize(WIDTH + 2 * PAD, h + 2 * PAD);
    await wait(250);
    const img = await win.webContents.capturePage();
    if (img.isEmpty()) throw new Error(`${name}: empty capture`);
    const file = path.join(outDir, `${name}.png`);
    fs.writeFileSync(file, img.toPNG());
    console.log(file, img.getSize().width, 'x', img.getSize().height);
  } finally {
    win.destroy();
  }
}

const click = (selector) => (win) => win.webContents.executeJavaScript(`document.querySelector(${JSON.stringify(selector)}).click()`);

app.whenReady().then(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const { full, empty } = buildModels();
  const shots = [];
  for (const theme of ['light', 'dark']) {
    shots.push({ name: `list-${theme}`, theme, model: full });
    shots.push({ name: `picker-${theme}`, theme, model: full, action: click('.row .chip-label') });
  }
  shots.push({ name: 'settings-light', theme: 'light', model: full, action: click('#gear') });
  shots.push({ name: 'rename-dark', theme: 'dark', model: full, action: (win) => win.webContents.send('popup:rename', '103') });
  shots.push({ name: 'empty-dark', theme: 'dark', model: empty });
  let failed = 0;
  for (const s of shots) {
    try { await shot(s); } catch (e) { failed++; console.error(e.message); }
  }
  app.exit(failed ? 1 : 0);
});
