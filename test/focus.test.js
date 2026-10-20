'use strict';
const test = require('node:test');
const assert = require('node:assert');
const f = require('../focus');

const procMap = (list) => new Map(list.map(([pid, ppid, name]) => [pid, { pid, ppid, name }]));

test('ancestry walks up to the terminal and stops before a host process', () => {
  const procs = procMap([
    [100, 50, 'claude.exe'], [50, 40, 'cmd.exe'], [40, 30, 'WindowsTerminal.exe'], [30, 4, 'svchost.exe'],
  ]);
  assert.deepStrictEqual(f.ancestry(100, procs).map((p) => p.pid), [100, 50, 40]);
  const desktop = procMap([[7, 6, 'claude.exe'], [6, 5, 'claude.exe'], [5, 1, 'sihost.exe']]);
  assert.deepStrictEqual(f.ancestry(7, desktop).map((p) => p.pid), [7, 6]);
  assert.deepStrictEqual(f.ancestry(999, procs), []);
});

test('ancestry stops at a parent that started after its child, which is a reused PID', () => {
  const procs = procMap([[100, 50, 'claude.exe'], [50, 40, 'cmd.exe'], [40, 1, 'notepad.exe']]);
  const created = { 100: 300n, 50: 200n, 40: 500n };
  assert.deepStrictEqual(f.ancestry(100, procs, (pid) => created[pid]).map((p) => p.pid), [100, 50]);
  // With no creation time to compare, the walk goes on.
  assert.deepStrictEqual(f.ancestry(100, procs, () => null).map((p) => p.pid), [100, 50, 40]);
});

test('ancestry survives a loop in the parent links', () => {
  const procs = procMap([[1, 2, 'a.exe'], [2, 1, 'b.exe']]);
  assert.deepStrictEqual(f.ancestry(1, procs).map((p) => p.pid), [1, 2]);
});

test('hints put the alias first, drop glyphs and repeats', () => {
  assert.deepStrictEqual(f.hintsFor({ name: 'Wewe', regName: 'wewe', project: 'shop' }, 'API'), ['api', 'wewe', 'shop']);
  assert.deepStrictEqual(f.hintsFor({ project: 'shop' }), ['shop']);
  assert.strictEqual(f.norm('✳ Fix the tray'), 'fix the tray');
});

test('the nearest ancestor that owns a window wins, then the best title, then the topmost', () => {
  const chain = [{ pid: 100, name: 'claude.exe' }, { pid: 50, name: 'cmd.exe' }, { pid: 40, name: 'WindowsTerminal.exe' }];
  const wins = [
    { hwnd: 1, pid: 40, title: '✳ other', exe: 'WindowsTerminal.exe' },
    { hwnd: 2, pid: 40, title: '✳ wewe', exe: 'WindowsTerminal.exe' },
    { hwnd: 3, pid: 77, title: 'wewe notes', exe: 'notepad.exe' },
  ];
  assert.strictEqual(f.chooseWindow(chain, wins, ['wewe', 'shop']).window.hwnd, 2);
  assert.strictEqual(f.chooseWindow(chain, wins, ['nothing']).window.hwnd, 1);
  // A classic console window belongs to the shell, which is nearer than the terminal.
  const withConsole = [...wins, { hwnd: 4, pid: 50, title: 'C:\\Windows\\system32\\cmd.exe', exe: 'cmd.exe' }];
  assert.strictEqual(f.chooseWindow(chain, withConsole, ['wewe']).window.hwnd, 4);
});

test('with no owner in the chain, only a terminal window whose title matches is chosen', () => {
  const chain = [{ pid: 100, name: 'claude.exe' }, { pid: 50, name: 'cmd.exe' }];
  const wins = [
    { hwnd: 1, pid: 40, title: '✳ other', exe: 'WindowsTerminal.exe' },
    { hwnd: 2, pid: 40, title: '✳ wewe', exe: 'WindowsTerminal.exe' },
    { hwnd: 3, pid: 77, title: 'wewe', exe: 'notepad.exe' },
  ];
  assert.deepStrictEqual(f.chooseWindow(chain, wins, ['wewe']), { window: wins[1], via: 'title' });
  assert.strictEqual(f.chooseWindow(chain, wins, ['nothing']).window, null);
  assert.strictEqual(f.chooseWindow(chain, wins, ['wewe'], { byTitle: false }).window, null);
});

test('the terminal window that owns the shell\'s console wins over a title match', () => {
  // Explorer started the shell and Windows Terminal took its console over, so
  // the chain stops at cmd.exe; the session's tab is in window 1, not active.
  const chain = [{ pid: 100, name: 'claude.exe' }, { pid: 50, name: 'cmd.exe' }];
  const wins = [
    { hwnd: 1, pid: 40, title: '✳ other', exe: 'WindowsTerminal.exe' },
    { hwnd: 2, pid: 40, title: '✳ wewe', exe: 'WindowsTerminal.exe' },
  ];
  const consoles = new Map([[50, 1], [60, 2]]);
  assert.deepStrictEqual(f.chooseWindow(chain, wins, ['wewe'], { consoles }), { window: wins[0], via: 'cmd.exe console' });
  // It needs no title, so it also works where the title lookup is off.
  assert.strictEqual(f.chooseWindow(chain, wins, ['nothing'], { byTitle: false, consoles }).window.hwnd, 1);
  // A console owner that is not a visible window falls through to the title.
  assert.strictEqual(f.chooseWindow(chain, wins, ['wewe'], { consoles: new Map([[50, 99]]) }).via, 'title');
  // A window the shell owns itself is nearer than its console's host.
  const own = [...wins, { hwnd: 4, pid: 50, title: 'cmd', exe: 'cmd.exe' }];
  assert.strictEqual(f.chooseWindow(chain, own, ['wewe'], { consoles }).window.hwnd, 4);
});

test('pickWindow asks for console windows only when the cheap lookups find nothing or only a title', () => {
  const chain = [{ pid: 100, name: 'claude.exe' }, { pid: 50, name: 'cmd.exe' }];
  const wins = [
    { hwnd: 1, pid: 40, title: '✳ other', exe: 'WindowsTerminal.exe' },
    { hwnd: 2, pid: 40, title: '✳ wewe', exe: 'WindowsTerminal.exe' },
  ];
  const asked = [];
  const ask = (pids) => { asked.push(pids); return new Map([[100, 1]]); };
  // A title match alone: the console answer wins, and every pid in the chain is asked.
  assert.deepStrictEqual(f.pickWindow(chain, wins, ['wewe'], { ask }), { window: wins[0], via: 'claude.exe console' });
  assert.deepStrictEqual(asked, [[100, 50]]);
  // A console the cheap lookup already found: no ask.
  asked.length = 0;
  assert.strictEqual(f.pickWindow(chain, wins, ['wewe'], { consoles: new Map([[50, 2]]), ask }).window.hwnd, 2);
  assert.deepStrictEqual(asked, []);
  // A window the chain owns: no ask.
  const own = [...wins, { hwnd: 4, pid: 50, title: 'cmd', exe: 'cmd.exe' }];
  assert.strictEqual(f.pickWindow(chain, own, ['wewe'], { ask }).window.hwnd, 4);
  assert.deepStrictEqual(asked, []);
  // No answer: the title match stands, and with no title either, nothing is chosen.
  const none = () => new Map();
  assert.strictEqual(f.pickWindow(chain, wins, ['wewe'], { ask: none }).via, 'title');
  assert.strictEqual(f.pickWindow(chain, wins, ['nothing'], { ask: none }).window, null);
  // No chain: no pid to ask about, so chooseWindow's answer stands.
  assert.strictEqual(f.pickWindow([], wins, ['wewe'], { ask }).via, 'title');
  assert.deepStrictEqual(asked, []);
});

test('attachedConsoles answers with an empty map for no pids and for a pid with no console', () => {
  assert.strictEqual(f.attachedConsoles([]).size, 0);
  assert.strictEqual(f.attachedConsoles([999999999]).size, 0);
});

test('a title match needs whole words, and an exact title beats a partial one', () => {
  assert.strictEqual(f.titleScore('✳ shopster', ['shop']), 0);
  assert.ok(f.titleScore('✳ shop', ['shop']) > f.titleScore('✳ shop tray', ['shop']));
  assert.ok(f.titleScore('api', ['api', 'shop']) > f.titleScore('shop', ['api', 'shop']));
});

test('sameStart allows a second of slack and passes when there is nothing to compare', () => {
  assert.strictEqual(f.sameStart('134000000000000000', 134000000000000000n), true);
  assert.strictEqual(f.sameStart('134000000000000000', 134000000005000000n), true);
  assert.strictEqual(f.sameStart('134000000000000000', 134000000020000000n), false);
  assert.strictEqual(f.sameStart(undefined, 1n), true);
  assert.strictEqual(f.sameStart('134000000000000000', null), true);
  assert.strictEqual(f.sameStart('not a number', 1n), true);
});
