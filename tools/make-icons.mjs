// Draws the app icons (a simple daisy on Daisy orange) and saves them as PNGs.
// Run with: node tools/make-icons.mjs
// No libraries needed: it encodes the PNG itself.
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const ORANGE = [255, 146, 0];
const WHITE = [255, 255, 255];
const YELLOW = [255, 214, 0];

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x, y);
      const o = y * (size * 3 + 1) + 1 + x * 3;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Colour of one point (u, v in 0..1) of the daisy design.
// 'scale' shrinks the flower for the maskable icon's safe zone.
function daisyAt(u, v, scale) {
  const dx = (u - 0.5) / scale, dy = (v - 0.5) / scale;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.13) return YELLOW;
  const angle = Math.atan2(dy, dx);
  const petals = 8, a = ((angle / (Math.PI * 2)) * petals + petals) % 1 - 0.5;
  // Petal = ellipse stretched along its own direction.
  const along = dist, across = Math.abs(a) * Math.PI * 2 / petals * dist;
  if (along > 0.1 && along < 0.4 && across < 0.075 * (1 - Math.abs(along - 0.25) / 0.2 * 0.4)) return WHITE;
  return ORANGE;
}
function icon(size, scale) {
  const S = 3; // 3x3 samples per pixel for smooth edges
  return png(size, (x, y) => {
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < S; i++) for (let j = 0; j < S; j++) {
      const c = daisyAt((x + (i + 0.5) / S) / size, (y + (j + 0.5) / S) / size, scale);
      r += c[0]; g += c[1]; b += c[2];
    }
    const n = S * S;
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
  });
}

writeFileSync("icons/icon-192.png", icon(192, 1));
writeFileSync("icons/icon-512.png", icon(512, 1));
writeFileSync("icons/icon-maskable-512.png", icon(512, 0.75));
writeFileSync("icons/apple-touch-icon.png", icon(180, 1)); // iPhone home screen
console.log("Icons written to icons/");
