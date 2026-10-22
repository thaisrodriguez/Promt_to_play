// Recorta un PNG al rectángulo de píxeles con alfa > 16 (+ margen).
// Uso: node tools/trim.mjs <in.png> <out.png> [pad]
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const [inPath, outPath, padArg] = process.argv.slice(2);
const pad = Number(padArg ?? 8);
const png = PNG.sync.read(readFileSync(inPath));
const { width: w, height: h, data: d } = png;

let x0 = w, x1 = -1, y0 = h, y1 = -1;
for (let y = 0; y < h; y++)
  for (let x = 0; x < w; x++)
    if (d[(y * w + x) * 4 + 3] > 16) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
if (x1 < 0) throw new Error('imagen vacía');

x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);

const out = new PNG({ width: x1 - x0 + 1, height: y1 - y0 + 1 });
PNG.bitblt(png, out, x0, y0, out.width, out.height, 0, 0);
writeFileSync(outPath, PNG.sync.write(out));
console.log(`${outPath}: ${out.width}x${out.height}`);
