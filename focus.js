// Brings a session's terminal window to the front, and tells a live process
// from a reused PID. The pure parts (ancestry, chooseWindow, sameStart) are
// tested; the win32 layer under them loads koffi lazily, so a machine where it
// fails to load still runs the tray, without focus.
'use strict';

// Processes that host many unrelated programs. The walk up from claude stops
// before them, because their windows are not the session's terminal.
const STOP_AT = new Set([
  'explorer.exe', 'sihost.exe', 'svchost.exe', 'wscript.exe', 'cscript.exe',
  'services.exe', 'wininit.exe', 'winlogon.exe', 'userinit.exe', 'system',
]);
// Terminals whose window the walk may miss: Windows Terminal started as the
// default terminal does not parent the shell, so its windows are matched by title.
const TERMINAL_HOSTS = new Set(['windowsterminal.exe']);
const MAX_DEPTH = 16;
const TICKS_PER_SECOND = 10000000n; // FILETIME counts 100 ns ticks

/**
 * The process and its ancestors, nearest first. `procs` maps pid to
 * { pid, ppid, name }; `createdOf(pid)` returns a FILETIME BigInt or null.
 * Stops at a host process, a missing parent, or a parent that started after
 * its child (the parent died and its PID was reused).
 */
function ancestry(pid, procs, createdOf = () => null) {
  const chain = [];
  let cur = procs.get(pid);
  let curCreated = cur ? createdOf(cur.pid) : null;
  while (cur && chain.length < MAX_DEPTH) {
    if (STOP_AT.has(String(cur.name).toLowerCase())) break;
    chain.push(cur);
    const parent = cur.ppid && cur.ppid !== cur.pid ? procs.get(cur.ppid) : undefined;
    if (!parent || chain.some((p) => p.pid === parent.pid)) break;
    const parentCreated = createdOf(parent.pid);
    if (parentCreated != null && curCreated != null && parentCreated > curCreated) break;
    cur = parent;
    curCreated = parentCreated;
  }
  return chain;
}

/** Lowercased, glyph-free text for comparing a title with a name. */
function norm(s) {
  return String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

/** The words that may appear in the session's window title, best first. */
function hintsFor(row, alias) {
  const out = [];
  for (const h of [alias, row && row.name, row && row.regName, row && row.project]) {
    const n = norm(h);
    if (n && !out.includes(n)) out.push(n);
  }
  return out;
}

/** 0 when no hint is in the title; higher for an earlier hint and an exact match. */
function titleScore(title, hints) {
  const t = norm(title);
  if (!t) return 0;
  for (let i = 0; i < hints.length; i++) {
    const h = hints[i];
    const weight = (hints.length - i) * 2;
    if (t === h) return weight + 1;
    if (` ${t} `.includes(` ${h} `)) return weight;
  }
  return 0;
}

/**
 * The window to bring forward. `windows` are visible top-level windows in
 * Z-order, topmost first: { hwnd, pid, title, exe }. The nearest ancestor that
 * owns a window wins; among its windows the best title match, then the
 * topmost. With no owner in the chain, a terminal-host window whose title
 * matches a hint, unless `byTitle` is false.
 */
function chooseWindow(chain, windows, hints, { byTitle = true } = {}) {
  const best = (list) => {
    let pick = null;
    let pickScore = -1;
    for (const w of list) {
      const s = titleScore(w.title, hints);
      if (s > pickScore) { pick = w; pickScore = s; }
    }
    return { pick, score: pickScore };
  };
  for (const proc of chain) {
    const owned = windows.filter((w) => w.pid === proc.pid);
    if (owned.length) return { window: best(owned).pick, via: proc.name };
  }
  if (!byTitle) return { window: null, via: null };
  const hosted = windows.filter((w) => TERMINAL_HOSTS.has(String(w.exe).toLowerCase()));
  const { pick, score } = best(hosted);
  if (pick && score > 0) return { window: pick, via: 'title' };
  return { window: null, via: null };
}

/** True when the process created at `createdTicks` is the one the registry saw start. */
function sameStart(procStart, createdTicks) {
  if (procStart == null || createdTicks == null) return true; // nothing to compare
  let want;
  try { want = BigInt(String(procStart)); } catch { return true; }
  const diff = want > createdTicks ? want - createdTicks : createdTicks - want;
  return diff <= TICKS_PER_SECOND;
}

// ---------------------------------------------------------------- win32

let api = null;
let loadError = null;

function win32() {
  if (api || loadError) return api;
  try {
    const koffi = require('koffi');
    const k32 = koffi.load('kernel32.dll');
    const u32 = koffi.load('user32.dll');
    const PE = koffi.struct('CS_PROCESSENTRY32W', {
      dwSize: 'uint32', cntUsage: 'uint32', th32ProcessID: 'uint32', th32DefaultHeapID: 'uintptr_t',
      th32ModuleID: 'uint32', cntThreads: 'uint32', th32ParentProcessID: 'uint32', pcPriClassBase: 'int32',
      dwFlags: 'uint32', szExeFile: koffi.array('char16_t', 260, 'String'),
    });
    koffi.struct('CS_FILETIME', { lo: 'uint32', hi: 'uint32' });
    koffi.proto('bool __stdcall CS_EnumWindowsProc(intptr_t hwnd, intptr_t lp)');
    api = {
      koffi,
      peSize: koffi.sizeof(PE),
      Snap: k32.func('void * __stdcall CreateToolhelp32Snapshot(uint32_t flags, uint32_t pid)'),
      First: k32.func('bool __stdcall Process32FirstW(void *h, _Inout_ CS_PROCESSENTRY32W *pe)'),
      Next: k32.func('bool __stdcall Process32NextW(void *h, _Inout_ CS_PROCESSENTRY32W *pe)'),
      CloseHandle: k32.func('bool __stdcall CloseHandle(void *h)'),
      OpenProcess: k32.func('void * __stdcall OpenProcess(uint32_t access, bool inherit, uint32_t pid)'),
      GetProcessTimes: k32.func('bool __stdcall GetProcessTimes(void *h, _Out_ CS_FILETIME *c, _Out_ CS_FILETIME *e, _Out_ CS_FILETIME *k, _Out_ CS_FILETIME *u)'),
      EnumWindows: u32.func('bool __stdcall EnumWindows(CS_EnumWindowsProc *cb, intptr_t lp)'),
      IsWindowVisible: u32.func('bool __stdcall IsWindowVisible(intptr_t h)'),
      GetWindow: u32.func('intptr_t __stdcall GetWindow(intptr_t h, uint32_t cmd)'),
      GetWindowTextW: u32.func('int __stdcall GetWindowTextW(intptr_t h, _Out_ uint8_t *buf, int n)'),
      GetWindowThreadProcessId: u32.func('uint32_t __stdcall GetWindowThreadProcessId(intptr_t h, _Out_ uint32_t *pid)'),
      GetForegroundWindow: u32.func('intptr_t __stdcall GetForegroundWindow()'),
      IsIconic: u32.func('bool __stdcall IsIconic(intptr_t h)'),
      ShowWindow: u32.func('bool __stdcall ShowWindow(intptr_t h, int cmd)'),
      SetForegroundWindow: u32.func('bool __stdcall SetForegroundWindow(intptr_t h)'),
      keybd_event: u32.func('void __stdcall keybd_event(uint8_t vk, uint8_t scan, uint32_t flags, uintptr_t extra)'),
    };
  } catch (e) {
    loadError = e;
    api = null;
  }
  return api;
}

/** Whether the native layer loaded, and why not. */
function nativeStatus() {
  win32();
  return api ? { ok: true } : { ok: false, error: loadError ? loadError.message : 'not loaded' };
}

/** Every process: Map pid -> { pid, ppid, name }. */
function snapshot() {
  const w = win32();
  const procs = new Map();
  if (!w) return procs;
  const h = w.Snap(2, 0); // TH32CS_SNAPPROCESS
  if (!h) return procs;
  try {
    const pe = { dwSize: w.peSize };
    if (w.First(h, pe)) {
      do {
        procs.set(pe.th32ProcessID, { pid: pe.th32ProcessID, ppid: pe.th32ParentProcessID, name: pe.szExeFile });
      } while (w.Next(h, pe));
    }
  } finally {
    w.CloseHandle(h);
  }
  return procs;
}

/** The process's creation time as a FILETIME BigInt, or null when it cannot be opened. */
function createdAt(pid) {
  const w = win32();
  if (!w) return null;
  const h = w.OpenProcess(0x1000, false, pid); // PROCESS_QUERY_LIMITED_INFORMATION
  if (!h) return null;
  try {
    const c = {}; const e = {}; const k = {}; const u = {};
    if (!w.GetProcessTimes(h, c, e, k, u)) return null;
    return (BigInt(c.hi) << 32n) | BigInt(c.lo);
  } finally {
    w.CloseHandle(h);
  }
}

/** Visible, unowned, titled top-level windows, topmost first. */
function windows(procs) {
  const w = win32();
  const out = [];
  if (!w) return out;
  const buf = Buffer.alloc(1024);
  w.EnumWindows((hwnd) => {
    if (!w.IsWindowVisible(hwnd) || w.GetWindow(hwnd, 4) !== 0) return true; // GW_OWNER
    const n = w.GetWindowTextW(hwnd, buf, 512);
    if (n <= 0) return true;
    const pid = [0];
    w.GetWindowThreadProcessId(hwnd, pid);
    out.push({ hwnd, pid: pid[0], title: buf.toString('utf16le', 0, n * 2), exe: procs && procs.get(pid[0]) ? procs.get(pid[0]).name : '' });
    return true;
  }, 0);
  return out;
}

/** Restores and raises the window; taps Alt once if Windows refuses the switch. */
function focusWindow(hwnd) {
  const w = win32();
  if (!w) return false;
  if (w.IsIconic(hwnd)) w.ShowWindow(hwnd, 9); // SW_RESTORE
  w.SetForegroundWindow(hwnd);
  if (w.GetForegroundWindow() === hwnd) return true;
  // Windows lets a process take the foreground right after a key event.
  w.keybd_event(0x12, 0, 0, 0); // VK_MENU down
  w.keybd_event(0x12, 0, 2, 0); // KEYEVENTF_KEYUP
  w.SetForegroundWindow(hwnd);
  return w.GetForegroundWindow() === hwnd;
}

/**
 * Brings the row's terminal to the front. Returns what happened, for the log:
 * { ok, reason?, via?, title? }.
 */
function focusSession(row, alias) {
  if (!row || !row.pid) return { ok: false, reason: 'no process' };
  if (!win32()) return { ok: false, reason: `native layer: ${nativeStatus().error}` };
  const procs = snapshot();
  if (!procs.has(row.pid)) return { ok: false, reason: 'process gone' };
  const chain = ancestry(row.pid, procs, createdAt);
  // Desktop-app and SDK sessions have no terminal, so a title match would be a guess.
  const byTitle = !row.entrypoint || row.entrypoint === 'cli';
  const { window, via } = chooseWindow(chain, windows(procs), hintsFor(row, alias), { byTitle });
  if (!window) return { ok: false, reason: `no window (${chain.map((p) => p.name).join(' < ') || 'no chain'})` };
  const ok = focusWindow(window.hwnd);
  return { ok, reason: ok ? undefined : 'Windows kept the foreground', via, title: window.title };
}

module.exports = {
  ancestry, chooseWindow, hintsFor, titleScore, sameStart, norm,
  nativeStatus, snapshot, createdAt, windows, focusWindow, focusSession,
};
