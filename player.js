// Main-process side of the sound player: a hidden window that owns one
// AudioContext. Main only ever reads a file whose id is in the catalog.
'use strict';
const fs = require('fs');
const path = require('path');
const { BrowserWindow, ipcMain } = require('electron');
const { playPattern } = require('./sounds');

const FALLBACK = 'synth:marimba';

/**
 * fileFor(id) returns the file behind a catalog id, or undefined.
 * Returns { play(id, kind, volume), preview(id, volume), destroy() }.
 */
function createPlayer({ fileFor, log = () => {} }) {
  let win = null;
  let ready = false;
  let queue = [];

  ipcMain.handle('player:load', async (_e, id) => {
    const file = fileFor(id);
    if (!file) throw new Error(`not in the sound catalog: ${id}`);
    return fs.promises.readFile(file);
  });

  ipcMain.on('player:failed', (_e, msg, message) => {
    log('sound failed', msg && msg.id, message);
    // An alert whose file is gone or will not decode still makes a sound.
    if (msg && !msg.preview && msg.id !== FALLBACK) send({ ...msg, id: FALLBACK });
  });

  function ensure() {
    if (win && !win.isDestroyed()) return;
    ready = false;
    win = new BrowserWindow({
      show: false,
      width: 200,
      height: 100,
      skipTaskbar: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload-player.js'),
        contextIsolation: true,
        sandbox: true,
        backgroundThrottling: false,
      },
    });
    win.webContents.on('did-finish-load', () => {
      ready = true;
      for (const msg of queue.splice(0)) win.webContents.send('player:play', msg);
    });
    win.webContents.on('render-process-gone', (_e, details) => {
      log('sound player gone', details && details.reason);
      win = null;
    });
    win.loadFile(path.join(__dirname, 'renderer', 'sound-player.html'));
  }

  function send(msg) {
    ensure();
    if (ready) win.webContents.send('player:play', msg);
    else queue.push(msg);
  }

  return {
    play(id, kind, volume) {
      const { repeats, gap } = playPattern(kind);
      send({ id, repeats, gap, volume });
    },
    preview(id, volume) {
      send({ id, repeats: 1, gap: 0, volume, preview: true });
    },
    destroy() {
      if (win && !win.isDestroyed()) win.destroy();
      win = null;
    },
  };
}

module.exports = { createPlayer, FALLBACK };
