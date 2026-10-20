'use strict';
const test = require('node:test');
const assert = require('node:assert');
const t = require('../wt-tab');
const f = require('../focus');

test('matchTabs compares names and title without spinner glyphs or case', () => {
  const names = ['✳ api', '⠂ Fix the bug', 'Api', 'PowerShell'];
  assert.deepStrictEqual(t.matchTabs(names, 'api'), [0, 2]);
  assert.deepStrictEqual(t.matchTabs(names, '⠐ fix the bug'), [1]);
  assert.deepStrictEqual(t.matchTabs(names, 'nothing like it'), []);
});

test('matchTabs matches nothing for a title with no words', () => {
  assert.deepStrictEqual(t.matchTabs(['', '✳'], ''), []);
  assert.deepStrictEqual(t.matchTabs(['', '✳'], '✳ '), []);
});

test('planTab picks the only tab, then a unique title, else the marker', () => {
  assert.deepStrictEqual(t.planTab([], 'api'), { how: 'none' });
  // One tab is the session's whatever its name says.
  assert.deepStrictEqual(t.planTab(['something else'], 'api'), { how: 'only', index: 0 });
  assert.deepStrictEqual(t.planTab(['A1', '✳ api', 'B2'], 'api'), { how: 'title', index: 1 });
  assert.deepStrictEqual(t.planTab(['api', 'api', 'B2'], 'api'), { how: 'marker', hits: 2 });
  assert.deepStrictEqual(t.planTab(['A1', 'B2'], 'api'), { how: 'marker', hits: 0 });
});

test('a tab name with a marker still matches its title', () => {
  assert.deepStrictEqual(t.matchTabs([`api${t.MARKER}`, 'B2'], 'api'), [0]);
});

test('markedTab finds the tab that shows the marker', () => {
  assert.strictEqual(t.markedTab(['A1', `A2${t.MARKER}`, 'A3']), 1);
  assert.strictEqual(t.markedTab(['A1', 'A2']), -1);
  // A zero-width character alone is not the marker.
  assert.strictEqual(t.markedTab(['A1​', 'A2']), -1);
});

test('markedTab skips a marker an earlier run left behind', () => {
  const before = ['dup', `dup${t.MARKER}`, 'dup'];
  assert.strictEqual(t.markedTab([`dup${t.MARKER}`, `dup${t.MARKER}`, 'dup'], before), 0);
  assert.strictEqual(t.markedTab(before, before), -1);
});

test('unmarked strips every marker from a title', () => {
  assert.strictEqual(t.unmarked(`api${t.MARKER}${t.MARKER}`), 'api');
  assert.strictEqual(t.unmarked('api'), 'api');
  assert.strictEqual(t.unmarked(null), '');
});

test('markerReason says whether several tabs or none had the title', () => {
  assert.strictEqual(t.markerReason(2), 'several tabs have its title');
  assert.strictEqual(t.markerReason(0), 'no tab has its title');
});

const chain = [
  { pid: 100, name: 'claude.exe' }, { pid: 50, name: 'pwsh.exe' },
  { pid: 45, name: 'OpenConsole.exe' }, { pid: 40, name: 'WindowsTerminal.exe' },
];

test('tabTarget hands wt-tab.js the console processes of a Windows Terminal window', () => {
  assert.deepStrictEqual(f.tabTarget({ hwnd: 7, exe: 'WindowsTerminal.exe' }, chain), { hwnd: 7, pids: [100, 50] });
  assert.deepStrictEqual(f.tabTarget({ hwnd: 7, exe: 'WINDOWSTERMINAL.EXE' }, chain.slice(0, 1)), { hwnd: 7, pids: [100] });
});

test('tabTarget skips windows that are not Windows Terminal and chains with no console process', () => {
  assert.strictEqual(f.tabTarget({ hwnd: 7, exe: 'Code.exe' }, chain), null);
  assert.strictEqual(f.tabTarget({ hwnd: 7, exe: 'conhost.exe' }, chain), null);
  assert.strictEqual(f.tabTarget(null, chain), null);
  assert.strictEqual(f.tabTarget({ hwnd: 7, exe: 'WindowsTerminal.exe' }, chain.slice(2)), null);
});

test('describeTab words wt-tab.js answers for the log', () => {
  assert.strictEqual(f.describeTab(undefined), '');
  assert.strictEqual(f.describeTab({ ok: true, how: 'title', index: 1, count: 4 }), 'tab 2 of 4 by title');
  assert.strictEqual(f.describeTab({ ok: true, how: 'marker', index: 3, count: 4 }), 'tab 4 of 4 by marker');
  assert.strictEqual(f.describeTab({ ok: true, how: 'none', count: 0 }), 'no tabs listed');
  assert.strictEqual(f.describeTab({ ok: false, reason: 'not Windows Terminal' }), 'tab not switched: not Windows Terminal');
  assert.strictEqual(f.describeTab({ ok: false }), 'tab not switched: no reason given');
});
