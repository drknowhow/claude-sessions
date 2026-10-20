// Selects a session's tab in its Windows Terminal window. focus.js runs it as
// a child process (ELECTRON_RUN_AS_NODE=1): wt-tab.js [--dry] <hwnd> <pid>...
// It attaches to the first console of the pids it can, reads that console's
// title, lists the window's tabs through UI Automation and selects the tab
// whose name is that title. When no tab or several tabs have the title, it
// adds invisible characters to the console title for a moment and selects the
// tab whose name shows them. --dry reads and matches but changes nothing.
// Prints JSON: { ok, how, index, count, hwnd } or { ok: false, reason }.
// It runs apart from the tray for the reason console-owner.js does, and so a
// fault in a COM call cannot take the tray down.
'use strict';
const { norm } = require('./focus');

const WT_CLASS = 'CASCADIA_HOSTING_WINDOW_CLASS';
// Zero-width characters: Windows Terminal shows the tab name unchanged.
const MARKER = '​⁠‌⁠';
const MARKER_WAIT_MS = 800;
const MARKER_POLL_MS = 25;

/** Indexes of the tabs whose name, glyphs aside, is the console title. */
function matchTabs(names, title) {
  const t = norm(title);
  if (!t) return [];
  const out = [];
  names.forEach((n, i) => { if (norm(n) === t) out.push(i); });
  return out;
}

/**
 * How to find the tab among `names` (in tab order) for a console titled
 * `title`: { how: 'none' } when the window shows no tabs, { how, index } when
 * one tab is it, { how: 'marker' } when only marking the title can tell.
 */
function planTab(names, title) {
  if (!names.length) return { how: 'none' };
  if (names.length === 1) return { how: 'only', index: 0 };
  const hits = matchTabs(names, title);
  if (hits.length === 1) return { how: 'title', index: hits[0] };
  return { how: 'marker', hits: hits.length };
}

/**
 * Index of the tab whose name carries the marker now and did not in `before`
 * (the names read before marking), or -1. A marker an earlier run failed to
 * clear stays in its tab's name until the program there sets a new title.
 */
function markedTab(names, before = []) {
  const has = (n) => String(n || '').includes(MARKER);
  return names.findIndex((n, i) => has(n) && !has(before[i]));
}

/** The title without markers an earlier run left in it. */
function unmarked(title) {
  return String(title || '').split(MARKER).join('');
}

/** Why the marker found no tab, for the log. */
function markerReason(hits) {
  return hits > 1 ? 'several tabs have its title' : 'no tab has its title';
}

// ---------------------------------------------------------------- win32

function load() {
  const koffi = require('koffi');
  const k32 = koffi.load('kernel32.dll');
  const u32 = koffi.load('user32.dll');
  const ole32 = koffi.load('ole32.dll');
  koffi.struct('CS_GUID', { a: 'uint32', b: 'uint16', c: 'uint16', d: koffi.array('uint8', 8) });
  // A VARIANT holding a VT_I4, passed by value: 24 bytes on x64.
  koffi.struct('CS_VARIANT', { vt: 'uint16', r1: 'uint16', r2: 'uint16', r3: 'uint16', lVal: 'int32', pad: 'int32', pad2: 'uint64' });
  // COM methods are called through the object's vtable; the comments give the slot.
  const protos = {
    elementFromHandle: koffi.proto('int32 __stdcall CS_EFH(void *self, intptr_t hwnd, _Out_ void **out)'), // IUIAutomation 6
    propertyCondition: koffi.proto('int32 __stdcall CS_CPC(void *self, int32 id, CS_VARIANT v, _Out_ void **out)'), // IUIAutomation 23
    findAll: koffi.proto('int32 __stdcall CS_FA(void *self, int32 scope, void *cond, _Out_ void **out)'), // IUIAutomationElement 6
    patternAs: koffi.proto('int32 __stdcall CS_GCPA(void *self, int32 id, CS_GUID *iid, _Out_ void **out)'), // IUIAutomationElement 14
    name: koffi.proto('int32 __stdcall CS_NAME(void *self, _Out_ str16 *s)'), // IUIAutomationElement 23
    length: koffi.proto('int32 __stdcall CS_LEN(void *self, _Out_ int32 *n)'), // IUIAutomationElementArray 3
    element: koffi.proto('int32 __stdcall CS_GE(void *self, int32 i, _Out_ void **out)'), // IUIAutomationElementArray 4
    select: koffi.proto('int32 __stdcall CS_SEL(void *self)'), // IUIAutomationSelectionItemPattern 3
    isSelected: koffi.proto('int32 __stdcall CS_ISSEL(void *self, _Out_ int32 *b)'), // IUIAutomationSelectionItemPattern 6
  };
  return {
    koffi,
    protos,
    FreeConsole: k32.func('bool __stdcall FreeConsole()'),
    AttachConsole: k32.func('bool __stdcall AttachConsole(uint32_t pid)'),
    GetConsoleWindow: k32.func('intptr_t __stdcall GetConsoleWindow()'),
    GetConsoleTitleW: k32.func('uint32_t __stdcall GetConsoleTitleW(_Out_ uint8_t *buf, uint32_t n)'),
    SetConsoleTitleW: k32.func('bool __stdcall SetConsoleTitleW(str16 title)'),
    GetWindow: u32.func('intptr_t __stdcall GetWindow(intptr_t h, uint32_t cmd)'),
    GetClassNameW: u32.func('int __stdcall GetClassNameW(intptr_t h, _Out_ uint8_t *buf, int n)'),
    CoInitializeEx: ole32.func('int32 __stdcall CoInitializeEx(void *r, uint32_t flags)'),
    CoCreateInstance: ole32.func('int32 __stdcall CoCreateInstance(CS_GUID *clsid, void *outer, uint32_t ctx, CS_GUID *iid, _Out_ void **out)'),
  };
}

function guid(s) {
  const h = s.replace(/-/g, '');
  const d = [];
  for (let i = 16; i < 32; i += 2) d.push(parseInt(h.slice(i, i + 2), 16));
  return { a: parseInt(h.slice(0, 8), 16), b: parseInt(h.slice(8, 12), 16), c: parseInt(h.slice(12, 16), 16), d };
}

const CLSID_CUIAutomation = guid('ff48dba4-60ef-4201-aa87-54103eef594e');
const IID_IUIAutomation = guid('30cbe57d-d9d0-452a-ab13-7ac5ac4825ee');
const IID_SelectionItemPattern = guid('a8efa66a-0fda-421a-9194-38021f3578ea');
const UIA_ControlTypePropertyId = 30003;
const UIA_TabItemControlTypeId = 50019;
const UIA_SelectionItemPatternId = 10010;
const TreeScope_Descendants = 4;

/** The window's tabs in order, through UI Automation: { names(), select(i), isSelected(i) }. */
function uiaTabs(w, hwnd) {
  const { koffi, protos: p } = w;
  const call = (obj, slot, proto, ...args) => {
    const vtbl = koffi.decode(obj, 'void *');
    const hr = koffi.call(koffi.decode(vtbl, slot * koffi.sizeof('void *'), 'void *'), proto, obj, ...args);
    if (hr < 0) throw new Error(`UI Automation call ${slot} failed: 0x${(hr >>> 0).toString(16)}`);
  };
  const out = [null];
  const hr = w.CoInitializeEx(null, 0); // COINIT_MULTITHREADED
  if (hr < 0) throw new Error(`CoInitializeEx failed: 0x${(hr >>> 0).toString(16)}`);
  const made = w.CoCreateInstance(CLSID_CUIAutomation, null, 1, IID_IUIAutomation, out); // CLSCTX_INPROC_SERVER
  if (made < 0) throw new Error(`UI Automation unavailable: 0x${(made >>> 0).toString(16)}`);
  const uia = out[0];
  call(uia, 6, p.elementFromHandle, hwnd, out);
  const win = out[0];
  call(uia, 23, p.propertyCondition, UIA_ControlTypePropertyId, { vt: 3, r1: 0, r2: 0, r3: 0, lVal: UIA_TabItemControlTypeId, pad: 0, pad2: 0 }, out);
  call(win, 6, p.findAll, TreeScope_Descendants, out[0], out);
  const arr = out[0];
  const n = [0];
  call(arr, 3, p.length, n);
  const items = [];
  for (let i = 0; i < n[0]; i++) {
    call(arr, 4, p.element, i, out);
    items.push(out[0]);
  }
  const pattern = (i) => {
    call(items[i], 14, p.patternAs, UIA_SelectionItemPatternId, IID_SelectionItemPattern, out);
    return out[0];
  };
  return {
    names: () => items.map((el) => { const s = [null]; call(el, 23, p.name, s); return s[0] || ''; }),
    select: (i) => call(pattern(i), 3, p.select),
    isSelected: (i) => { const b = [0]; call(pattern(i), 6, p.isSelected, b); return !!b[0]; },
  };
}

function consoleTitle(w) {
  const buf = Buffer.alloc(8192);
  const n = w.GetConsoleTitleW(buf, 4096);
  return buf.toString('utf16le', 0, Math.min(n, 4096) * 2);
}

function windowClass(w, hwnd) {
  const buf = Buffer.alloc(256);
  const n = w.GetClassNameW(hwnd, buf, 128);
  return n > 0 ? buf.toString('utf16le', 0, n * 2) : '';
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Marks the console title until a tab shows it; restores the title unless
 * something else changed it. `before` is the tab names read before marking.
 */
function findByMarker(w, tabs, title, before) {
  const marked = title + MARKER;
  if (!w.SetConsoleTitleW(marked)) return -1;
  try {
    const until = Date.now() + MARKER_WAIT_MS;
    for (;;) {
      const i = markedTab(tabs.names(), before);
      if (i >= 0 || Date.now() >= until) return i;
      sleep(MARKER_POLL_MS);
    }
  } finally {
    if (consoleTitle(w) === marked) w.SetConsoleTitleW(title);
  }
}

function run(args) {
  const dry = args[0] === '--dry';
  if (dry) args = args.slice(1);
  const given = Number(args[0]) || 0;
  const pids = args.slice(1).map(Number).filter((p) => Number.isInteger(p) && p > 0);
  const w = load();
  w.FreeConsole(); // a process can attach to one console at a time
  const pid = pids.find((p) => w.AttachConsole(p));
  if (!pid) return { ok: false, reason: 'no console' };
  try {
    const title = unmarked(consoleTitle(w));
    // The console's hidden PseudoConsoleWindow is owned by the window its tab is in.
    const hwnd = Number(w.GetWindow(w.GetConsoleWindow(), 4)) || given; // GW_OWNER
    if (windowClass(w, hwnd) !== WT_CLASS) return { ok: false, reason: 'not Windows Terminal' };
    const tabs = uiaTabs(w, hwnd);
    const names = tabs.names();
    const plan = planTab(names, title);
    const count = names.length;
    if (dry) return { ok: true, dry: true, pid, hwnd, title, names, plan };
    if (plan.how === 'none') return { ok: true, how: 'none', count, hwnd };
    let index = plan.index;
    if (plan.how === 'marker') {
      index = findByMarker(w, tabs, title, names);
      if (index < 0) return { ok: false, reason: markerReason(plan.hits), count, hwnd };
    }
    if (!tabs.isSelected(index)) tabs.select(index);
    const ok = tabs.isSelected(index);
    return { ok, how: plan.how, index, count, hwnd, reason: ok ? undefined : 'the tab did not switch' };
  } finally {
    w.FreeConsole();
  }
}

if (require.main === module) {
  let result;
  try {
    result = run(process.argv.slice(2));
  } catch (e) {
    result = { ok: false, reason: e.message };
  }
  process.stdout.write(JSON.stringify(result));
}

module.exports = { matchTabs, planTab, markedTab, unmarked, markerReason, MARKER };
