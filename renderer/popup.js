// The popup's renderer. It draws the model main sends and reports clicks
// back through window.popup (preload.js). Session text only ever goes in
// through textContent.
'use strict';

const api = window.popup;
const $ = (id) => document.getElementById(id);
const SVG_NS = 'http://www.w3.org/2000/svg';

const card = $('card');
const views = { list: $('list-view'), picker: $('picker-view'), settings: $('settings-view') };
const rowsEl = $('rows');

let model = null;
let pending = null;      // a model that arrived while a rename was open
let view = 'list';
let pickerKey = null;
let pickerScope = 'session';
let renaming = null;     // { key, input }
const rowNodes = new Map();

// ---------------------------------------------------------------- helpers

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  if (tag === 'button') n.type = 'button';
  return n;
}

function icon(viewBox, d, cls) {
  const s = document.createElementNS(SVG_NS, 'svg');
  s.setAttribute('viewBox', viewBox);
  s.setAttribute('aria-hidden', 'true');
  if (cls) s.setAttribute('class', cls);
  const p = document.createElementNS(SVG_NS, 'path');
  p.setAttribute('d', d);
  s.append(p);
  return s;
}

const playIcon = () => icon('0 0 10 10', 'M2.4 1.3v7.4L8.7 5z');
const muteIcon = () => icon('0 0 12 12', 'M1.5 4.6h2l3-2.4v7.6l-3-2.4h-2zM8.4 4.6l2.8 2.8M11.2 4.6L8.4 7.4', 'mute-icon');
const checkIcon = () => icon('0 0 14 14', 'M3 7.4l2.6 2.6L11 4.4', 'sound-check');

function setText(node, text) {
  if (node.textContent !== text) node.textContent = text;
}

function rowByKey(key) {
  return model && model.rows.find((r) => r.key === key);
}

function fullName(r) {
  return r.name ? `${r.where} · ${r.name}` : r.where;
}

// ---------------------------------------------------------------- views

function show(next) {
  view = next;
  for (const [name, node] of Object.entries(views)) node.hidden = name !== next;
  render();
}

function render() {
  if (!model) return;
  renderHeader();
  renderRows();
  if (view === 'picker') renderPicker();
  if (view === 'settings') renderSettings();
  reportHeight();
}

// Main sizes the window to the card. Reading the height forces layout, which
// also works while the window is hidden, so main can size it before showing.
let lastHeight = 0;
function reportHeight() {
  const h = Math.ceil(card.getBoundingClientRect().height);
  if (!h) return;
  lastHeight = h;
  api.resize(h);
}

function renderHeader() {
  const h = model.header;
  $('head-dot').className = `dot ${model.rows.some((r) => !r.dimmed) ? h.top || 'idle' : 'ended'}`;
  setText($('head-title'), h.title);
  setText($('head-counts'), h.counts || (model.rows.length ? 'Nothing waiting on you' : ''));
  const dnd = $('dnd');
  dnd.classList.toggle('on', h.dnd.on);
  dnd.title = h.dnd.on ? `Do not disturb until ${h.dnd.until}` : 'Do not disturb';
  setText($('dnd-until'), h.dnd.on ? `until ${h.dnd.until}` : '');
  $('banner').hidden = model.hooksInstalled;
}

// ---------------------------------------------------------------- rows

function makeRow(key) {
  const node = el('div', 'row');
  node.setAttribute('role', 'listitem');
  const dot = el('span', 'dot');

  const main = el('div', 'row-main');
  const title = el('div', 'row-title');
  const where = el('span', 'row-where');
  const name = el('span', 'row-name');
  title.append(where, name);
  const line = el('div', 'row-line');
  main.append(title, line);
  main.addEventListener('click', () => api.activateRow(key));

  const chip = el('div', 'chip');
  const chipLabel = el('button', 'chip-label');
  const chipText = el('span');
  chipLabel.append(muteIcon(), chipText);
  chipLabel.addEventListener('click', () => openPicker(key));
  const play = el('button', 'chip-play');
  play.append(playIcon());
  play.addEventListener('click', () => {
    const r = rowByKey(key);
    if (r) api.preview(r.sound.id);
  });
  chip.append(chipLabel, play);

  const more = el('button', 'more', '⋯');
  more.title = 'More';
  more.addEventListener('click', () => api.rowMenu(key));

  node.append(dot, main, chip, more);
  return { node, dot, main, title, where, name, line, chip, chipLabel, chipText, play };
}

function updateRow(p, r) {
  p.node.className = `row ${r.state}${r.dimmed ? ' dimmed' : ''}`;
  p.dot.className = `dot ${r.state}`;
  setText(p.where, r.where);
  setText(p.name, r.name ? ` · ${r.name}` : '');
  setText(p.line, r.line);
  p.main.title = [fullName(r), r.cwd].filter(Boolean).join('\n');
  p.chip.hidden = r.dimmed;
  p.chip.classList.toggle('muted', r.muted);
  setText(p.chipText, r.sound.label);
  p.chipLabel.title = r.muted ? `${r.sound.label}, muted. Click to change the sound` : `${r.sound.label}. Click to change the sound`;
  p.play.title = `Play ${r.sound.label}`;
}

/** Updates rows in place and moves a node only when its position changed. */
function renderRows() {
  const keys = new Set(model.rows.map((r) => r.key));
  for (const [key, p] of rowNodes) {
    if (!keys.has(key)) {
      p.node.remove();
      rowNodes.delete(key);
    }
  }
  model.rows.forEach((r, i) => {
    let p = rowNodes.get(r.key);
    if (!p) {
      p = makeRow(r.key);
      rowNodes.set(r.key, p);
    }
    updateRow(p, r);
    const at = rowsEl.children[i];
    if (at !== p.node) rowsEl.insertBefore(p.node, at || null);
  });
  $('empty').hidden = model.rows.length > 0;
}

// ---------------------------------------------------------------- rename

function startRename(key) {
  if (view !== 'list') show('list');
  const r = rowByKey(key);
  const p = rowNodes.get(key);
  if (!r || !p || renaming) return;
  const input = el('input', 'rename');
  input.value = r.alias || r.name;
  input.placeholder = r.where;
  input.maxLength = 60;
  p.title.replaceChildren(input);
  renaming = { key, input, before: r.alias || r.name };
  input.focus();
  input.select();
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); endRename(true); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); endRename(false); }
  });
  input.addEventListener('blur', () => endRename(true));
}

function endRename(commit) {
  if (!renaming) return;
  const { key, input, before } = renaming;
  renaming = null;
  const text = input.value.trim();
  if (commit && text !== before) api.setAlias(key, text);
  const p = rowNodes.get(key);
  if (p) p.title.replaceChildren(p.where, p.name);
  if (pending) {
    model = pending;
    pending = null;
  }
  render();
}

// ---------------------------------------------------------------- picker

function openPicker(key) {
  const r = rowByKey(key);
  if (!r) return;
  pickerKey = key;
  if (r.sound.from === 'session' || !r.project) pickerScope = r.hasSession ? 'session' : 'project';
  else pickerScope = 'project';
  show('picker');
  $('sounds').scrollTop = 0;
  const current = $('sounds').querySelector('.sound.current');
  if (current) current.scrollIntoView({ block: 'center' });
}

function renderPicker() {
  const r = rowByKey(pickerKey);
  if (!r) return show('list');
  setText($('picker-for'), fullName(r));

  const [sessionBtn, projectBtn] = $('scope').querySelectorAll('button');
  sessionBtn.disabled = !r.hasSession;
  projectBtn.disabled = !r.project;
  setText(projectBtn, r.project ? `All ${r.project} sessions` : 'Project');
  if (pickerScope === 'session' && !r.hasSession) pickerScope = 'project';
  if (pickerScope === 'project' && !r.project) pickerScope = 'session';
  sessionBtn.setAttribute('aria-checked', String(pickerScope === 'session'));
  projectBtn.setAttribute('aria-checked', String(pickerScope === 'project'));

  const note = $('picker-note');
  note.replaceChildren();
  if (r.sound.from === 'session' && r.project) {
    note.append('This session has its own sound.');
    const reset = el('button', 'text-btn', 'Use project sound');
    reset.addEventListener('click', () => api.setSound(pickerKey, null, 'clear'));
    note.append(reset);
  }

  const list = $('sounds');
  const top = list.scrollTop;
  list.replaceChildren();
  for (const g of model.groups) {
    list.append(el('div', 'group-name', g.name));
    for (const s of g.sounds) {
      const item = el('div', `sound${s.id === r.sound.id ? ' current' : ''}`);
      item.dataset.id = s.id;
      const play = el('button', 'sound-play');
      play.title = `Play ${s.label}`;
      play.append(playIcon());
      play.addEventListener('click', () => api.preview(s.id));
      const pick = el('button', 'sound-pick', s.label);
      pick.title = pickerScope === 'project' ? `Use ${s.label} for all ${r.project} sessions` : `Use ${s.label} for this session`;
      pick.addEventListener('click', () => choose(s.id));
      item.append(play, pick, checkIcon());
      list.append(item);
    }
  }
  list.scrollTop = top;
}

/** Picks a sound and plays it, so you can click down the list and listen. */
function choose(id) {
  const r = rowByKey(pickerKey);
  if (!r) return;
  api.setSound(pickerKey, id, pickerScope);
  api.preview(id);
  for (const n of $('sounds').querySelectorAll('.sound')) n.classList.toggle('current', n.dataset.id === id);
}

$('scope').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-scope]');
  if (!b || b.disabled) return;
  pickerScope = b.dataset.scope;
  renderPicker();
});

$('picker-back').addEventListener('click', () => show('list'));

$('add-sound').addEventListener('click', async () => {
  const key = pickerKey;
  const scope = pickerScope;
  let id = null;
  try { id = await api.addSound(); } catch { return; } // main shows the error
  if (id && key) api.setSound(key, id, scope);
});

// ---------------------------------------------------------------- settings

function renderSettings() {
  const slider = $('volume');
  if (document.activeElement !== slider) slider.value = String(model.volume);
  setText($('volume-text'), `${slider.value}%`);
  $('show-all').checked = model.showAll;
  $('open-at-login').checked = model.openAtLogin;
}

$('gear').addEventListener('click', () => show('settings'));
$('settings-back').addEventListener('click', () => show('list'));
$('volume').addEventListener('input', (e) => setText($('volume-text'), `${e.target.value}%`));
$('volume').addEventListener('change', (e) => api.setVolume(Number(e.target.value)));
$('show-all').addEventListener('change', (e) => api.setShowAll(e.target.checked));
$('open-at-login').addEventListener('change', (e) => api.setOpenAtLogin(e.target.checked));
$('data-folder').addEventListener('click', () => api.openDataFolder());

// ---------------------------------------------------------------- header

$('dnd').addEventListener('click', () => api.dndMenu());
$('install').addEventListener('click', () => api.installHooks());

// ---------------------------------------------------------------- main -> renderer

api.onModel((m) => {
  if (renaming) {
    pending = m;
    return;
  }
  model = m;
  render();
});

api.onRename((key) => startRename(key));

api.onReset(() => {
  if (renaming) endRename(false);
  pickerKey = null;
  show('list');
  rowsEl.scrollTop = 0;
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || renaming) return;
  if (view !== 'list') show('list');
  else api.close();
});

// Catches size changes render() does not cause, like a rename input opening.
new ResizeObserver(() => {
  if (Math.ceil(card.getBoundingClientRect().height) !== lastHeight) reportHeight();
}).observe(card);
