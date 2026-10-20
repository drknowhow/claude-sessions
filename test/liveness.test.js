'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { deadPids, isAlive } = require('../liveness');

const START = '134000000000000000';

test('a missing process is dead', () => {
  const alive = (pid) => pid !== 2;
  assert.deepStrictEqual(deadPids([{ pid: 1 }, { pid: 2 }], { alive, createdAt: () => null }), [2]);
});

test('a live PID that started at another time belongs to a new process', () => {
  const created = { 1: 134000000000000000n, 2: 134000000990000000n };
  const rows = [{ pid: 1, procStart: START }, { pid: 2, procStart: START }];
  assert.deepStrictEqual(deadPids(rows, { alive: () => true, createdAt: (pid) => created[pid] }), [2]);
});

test('no start time on either side keeps the session alive', () => {
  const rows = [{ pid: 1 }, { pid: 2, procStart: START }];
  assert.deepStrictEqual(deadPids(rows, { alive: () => true, createdAt: () => null }), []);
});

test('this process is alive', () => {
  assert.strictEqual(isAlive(process.pid), true);
});
