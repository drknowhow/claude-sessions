// Writes build/icon.ico, the installer and exe icon, from the brand mark at 16,
// 32, 48 and 256 px, and docs/brand/mark.svg from the same geometry.
//   node scripts/make-icon.js [png]   (png: also write the 256 px image there)
'use strict';
const fs = require('fs');
const path = require('path');
const { encodePng } = require('../tray-icon');
const mark = require('./brand-mark');

const BMP_SIZES = [16, 32, 48];
const PNG_SIZES = [256]; // Windows reads the large size as PNG

/** A 32-bit DIB entry: header, bottom-up BGRA rows, then an all-zero AND mask. */
function dib(rgba, size) {
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0);
  header.writeInt32LE(size, 4);
  header.writeInt32LE(size * 2, 8); // XOR image plus AND mask
  header.writeUInt16LE(1, 12);
  header.writeUInt16LE(32, 14);
  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    const src = (size - 1 - y) * size * 4;
    for (let x = 0; x < size; x++) {
      const i = src + x * 4;
      const o = (y * size + x) * 4;
      pixels[o] = rgba[i + 2];
      pixels[o + 1] = rgba[i + 1];
      pixels[o + 2] = rgba[i];
      pixels[o + 3] = rgba[i + 3];
    }
  }
  const maskRow = Math.ceil(size / 32) * 4;
  return Buffer.concat([header, pixels, Buffer.alloc(maskRow * size)]);
}

function ico(entries) {
  const head = Buffer.alloc(6);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + dir.length;
  entries.forEach(({ size, data }, n) => {
    const o = n * 16;
    dir[o] = size >= 256 ? 0 : size;
    dir[o + 1] = size >= 256 ? 0 : size;
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(data.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += data.length;
  });
  return Buffer.concat([head, dir, ...entries.map((e) => e.data)]);
}

const entries = [
  ...BMP_SIZES.map((size) => ({ size, data: dib(mark.render(size), size) })),
  ...PNG_SIZES.map((size) => ({ size, data: encodePng(mark.render(size), size, size) })),
];
const out = path.join(__dirname, '..', 'build', 'icon.ico');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, ico(entries));
const svgOut = path.join(__dirname, '..', 'docs', 'brand', 'mark.svg');
fs.mkdirSync(path.dirname(svgOut), { recursive: true });
fs.writeFileSync(svgOut, mark.svg());
if (process.argv[2]) fs.writeFileSync(process.argv[2], entries[entries.length - 1].data); // a PNG to look at
console.log(`wrote ${out} (${entries.map((e) => e.size).join(', ')} px) and ${svgOut}`);
