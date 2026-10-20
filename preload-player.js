// Preload for the hidden sound player window.
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('player', {
  onPlay: (cb) => ipcRenderer.on('player:play', (_e, msg) => cb(msg)),
  load: (id) => ipcRenderer.invoke('player:load', id),
  failed: (msg, message) => ipcRenderer.send('player:failed', msg, message),
});
