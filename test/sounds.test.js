'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const s = require('../sounds');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'cs-sounds-'));
const touch = (dir, ...names) => { fs.mkdirSync(dir, { recursive: true }); for (const n of names) fs.writeFileSync(path.join(dir, n), 'x'); };
const row = (project, sessionId = 's1') => ({ pid: 1, sessionId, project });

test('a project keeps its sound, and the next project gets the next unused one', () => {
  const config = { projectSounds: {}, sessionSounds: {} };
  const first = s.resolveSound(config, row('Shop'));
  assert.deepStrictEqual(first, { id: 'synth:marimba', from: 'project', assign: { project: 'shop', id: 'synth:marimba' } });
  config.projectSounds.shop = first.id;
  assert.deepStrictEqual(s.resolveSound(config, row('shop', 's2')), { id: 'synth:marimba', from: 'project' });
  assert.strictEqual(s.resolveSound(config, row('site')).id, 'synth:bell');
});

test('a session override wins, and a row with no project yet borrows without keeping', () => {
  const config = { projectSounds: { shop: 'synth:bell' }, sessionSounds: { s1: 'win:tada.wav' } };
  const catalog = [...s.BUILT_IN, { id: 'win:tada.wav', label: 'tada', group: 'Windows' }];
  assert.deepStrictEqual(s.resolveSound(config, row('shop'), catalog), { id: 'win:tada.wav', from: 'session' });
  assert.deepStrictEqual(s.resolveSound(config, row('shop', 's9'), catalog), { id: 'synth:bell', from: 'project' });
  assert.deepStrictEqual(s.resolveSound({}, { pid: 2 }), { id: 'synth:marimba', from: 'default' });
});

test('a sound whose file is gone falls back: a session to its project, a project to a new pick', () => {
  const config = { projectSounds: { shop: 'custom:gone.wav', site: 'synth:marimba' }, sessionSounds: { s1: 'custom:gone.wav' } };
  assert.deepStrictEqual(s.resolveSound(config, row('shop')), { id: 'synth:bell', from: 'project', assign: { project: 'shop', id: 'synth:bell' } });
});

test('nextUnused takes the least-used pool sound, earliest on a tie', () => {
  assert.strictEqual(s.nextUnused({}), 'synth:marimba');
  assert.strictEqual(s.nextUnused({ a: 'synth:marimba', b: 'synth:wood' }), 'synth:bell');
  const all = Object.fromEntries(s.POOL.map((id, i) => [`p${i}`, id]));
  assert.strictEqual(s.nextUnused(all), 'synth:marimba');
  assert.strictEqual(s.nextUnused({ ...all, x: 'synth:marimba', y: 'synth:bell' }), 'synth:wood');
  assert.strictEqual(s.nextUnused({ a: 'win:tada.wav' }), 'synth:marimba');
});

test('assignProjects gives each new project one sound, even under a session override', () => {
  const rows = [row('shop', 'a'), row('SHOP', 'b'), row('site', 'c'), { pid: 4, sessionId: 'd' }];
  const out = s.assignProjects({ projectSounds: { old: 'synth:marimba' }, sessionSounds: { a: 'synth:horn' } }, rows);
  assert.deepStrictEqual(out, { old: 'synth:marimba', shop: 'synth:bell', site: 'synth:wood' });
  assert.strictEqual(s.assignProjects({ projectSounds: out }, rows), null);
});

test('the catalog lists built-ins, Windows wavs and custom sounds in that order', () => {
  const dir = tmp();
  touch(path.join(dir, 'win'), 'tada.wav', 'Alarm10.wav', 'Alarm02.wav', 'readme.txt', 'chord.mid');
  touch(path.join(dir, 'custom'), 'ping.ogg', 'Song.MP3', 'notes.txt');
  const cat = s.buildCatalog({ windowsDir: path.join(dir, 'win'), customDir: path.join(dir, 'custom') });
  assert.deepStrictEqual(cat.slice(8).map((x) => [x.id, x.label, x.group]), [
    ['win:Alarm02.wav', 'Alarm02', 'Windows'],
    ['win:Alarm10.wav', 'Alarm10', 'Windows'],
    ['win:tada.wav', 'tada', 'Windows'],
    ['custom:ping.ogg', 'ping', 'Custom'],
    ['custom:Song.MP3', 'Song', 'Custom'],
  ]);
  assert.strictEqual(cat[8].file, path.join(dir, 'win', 'Alarm02.wav'));
  assert.strictEqual(s.soundLabel(cat, 'synth:horn'), 'Low horn');
  assert.strictEqual(s.soundLabel(cat, 'win:missing.wav'), 'No sound');
  const groups = s.pickerGroups(cat);
  assert.deepStrictEqual(groups.map((g) => [g.name, g.sounds.length]), [['Built-in', 8], ['Windows', 3], ['Custom', 2]]);
  assert.strictEqual(groups[1].sounds[0].file, undefined);
  assert.strictEqual(s.buildCatalog({ windowsDir: path.join(dir, 'nope') }).length, 8);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('addCustomSound copies the file, renames on a clash and refuses other types', () => {
  const dir = tmp();
  touch(dir, 'beep.wav', 'doc.txt');
  const custom = path.join(dir, 'custom');
  assert.strictEqual(s.addCustomSound(path.join(dir, 'beep.wav'), custom), 'custom:beep.wav');
  assert.strictEqual(s.addCustomSound(path.join(dir, 'beep.wav'), custom), 'custom:beep (2).wav');
  assert.deepStrictEqual(fs.readdirSync(custom).sort(), ['beep (2).wav', 'beep.wav']);
  assert.throws(() => s.addCustomSound(path.join(dir, 'doc.txt'), custom), /Not a \.wav/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('setCapped moves a key to the end, deletes on empty, and keeps the newest', () => {
  let m = s.setCapped({}, 'a', 1, 3);
  m = s.setCapped(m, 'b', 2, 3);
  m = s.setCapped(m, 'a', 3, 3);
  assert.deepStrictEqual(Object.keys(m), ['b', 'a']);
  m = s.setCapped(m, 'c', 4, 3);
  m = s.setCapped(m, 'd', 5, 3);
  assert.deepStrictEqual(m, { a: 3, c: 4, d: 5 });
  assert.deepStrictEqual(s.setCapped(m, 'c', undefined, 3), { a: 3, d: 5 });
  assert.deepStrictEqual(s.setCapped(undefined, 'x', true), { x: true });
});

test('needs plays twice, done and error once', () => {
  assert.strictEqual(s.playPattern('needs').repeats, 2);
  assert.strictEqual(s.playPattern('done').repeats, 1);
  assert.strictEqual(s.playPattern('error').repeats, 1);
});
