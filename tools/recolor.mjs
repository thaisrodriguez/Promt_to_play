// Recolorea PNGs rotando el matiz de los píxeles saturados por rangos,
// dejando piel, contornos oscuros y zonas pálidas intactos.
// Uso:
//   node tools/recolor.mjs <srcDir> <dstDir> <shiftDeg> [minSat] [minVal]
//   node tools/recolor.mjs <srcDir> <dstDir> --rules "hMin-hMax:shift,..." [minSat] [minVal]
import { readdirSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';

const args = process.argv.slice(2);
const [src, dst, third] = args;
// Con --rules el orden es: src dst --rules "a-b:s,..." [minSat] [minVal]
const rulesArg = third === '--rules' ? args[3] : undefined;
const satArg = third === '--rules' ? args[4] : args[3];
const valArg = third === '--rules' ? args[5] : args[4];
if (!src || !dst || third === undefined) {
  console.error('uso: node tools/recolor.mjs <srcDir> <dstDir> <shiftDeg|--rules "a-b:s,..."> [minSat] [minVal]');
  process.exit(1);
}

// Lista de reglas [hMin, hMax, shift]; el shift simple equivale a [0,360,shift].
const rules =
  third === '--rules'
    ? rulesArg.split(',').map((r) => {
        const [range, s] = r.split(':');
        const [a, b] = range.split('-').map(Number);
        return [a, b, Number(s)];
      })
    : [[0, 360, Number(third)]];

const minSat = Number(satArg ?? 0.45);
const minVal = Number(valArg ?? 0.2);

const rgb2hsv = (r, g, b) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, max ? d / max : 0, max];
};

const hsv2rgb = (h, s, v) => {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
};

mkdirSync(dst, { recursive: true });
let n = 0;
for (const file of readdirSync(src).filter((f) => f.toLowerCase().endsWith('.png'))) {
  const png = PNG.sync.read(readFileSync(join(src, file)));
  const d = png.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 16) continue; // transparente
    const [h, s, v] = rgb2hsv(d[i], d[i + 1], d[i + 2]);
    if (s < minSat || v < minVal) continue;
    const rule = rules.find(([a, b]) => (a <= b ? h >= a && h < b : h >= a || h < b));
    if (!rule) continue;
    const [r, g, b] = hsv2rgb((h + rule[2] + 360) % 360, s, v);
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
  writeFileSync(join(dst, file), PNG.sync.write(png));
  n++;
}
console.log(`${n} PNGs recoloreados → ${dst}`);
