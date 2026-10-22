// Registro único de texturas. Hoy genera formas geométricas; mañana carga sprites con las mismas claves.
//
// Para reemplazar una forma por un sprite real:
//   1. Copia el PNG en assets/sprites/
//   2. Añade la clave y la ruta en SPRITE_MANIFEST
// El resto del código no cambia: todos usan TextureKeys.
import Phaser from 'phaser';
import { FAIRY_COLORS, FLOWER_NEUTRAL_COLORS, type FairyColorName } from '../shared/config';
import fairyRosaUrl from '../../assets/sprites/game/fairy-rosa.png?url';
import fairyAzulUrl from '../../assets/sprites/game/fairy-azul.png?url';
import fairyVerdeUrl from '../../assets/sprites/game/fairy-verde.png?url';
import fairyAmarilloUrl from '../../assets/sprites/game/fairy-amarillo.png?url';
import flowerRosaUrl from '../../assets/sprites/game/flower-rosa.png?url';
import flowerAzulUrl from '../../assets/sprites/game/flower-azul.png?url';
import flowerVerdeUrl from '../../assets/sprites/game/flower-verde.png?url';
import flowerAmarilloUrl from '../../assets/sprites/game/flower-amarillo.png?url';
import flowerBlancaUrl from '../../assets/sprites/game/flower-blanca.png?url';
import flowerGrisUrl from '../../assets/sprites/game/flower-gris.png?url';
import treeUrl from '../../assets/sprites/game/tree.png?url';
import rockUrl from '../../assets/sprites/game/rock.png?url';
import sparkUrl from '../../assets/sprites/game/spark.png?url';
import spellRingUrl from '../../assets/sprites/game/spell-ring.png?url';
import backgroundUrl from '../../assets/sprites/game/background.png?url';

type NeutralTone = keyof typeof FLOWER_NEUTRAL_COLORS;

export const TextureKeys = {
  fairy: (color: FairyColorName) => `fairy-${color}`,
  flowerNeutral: (tone: NeutralTone) => `flower-${tone}`,
  flowerPainted: (color: FairyColorName) => `flower-${color}`,
  tree: 'tree',
  rock: 'rock',
  spark: 'spark',
  spellRing: 'spell-ring',
  background: 'background',
} as const;

/** Medidas de referencia de las texturas generadas, para escalar al tamaño deseado. */
export const TextureSizes = {
  /** Radio del cuerpo del árbol dentro de la textura y tamaño total (incluye la sombra). */
  tree: { bodyRadius: 46, size: 128 },
  rock: { bodyRadius: 52, size: 128 },
  flower: { size: 42 },
  fairy: { width: 470, height: 480 },
} as const;

/** Sprites reales: clave de textura → ruta (resuelta por Vite, funciona en dev y en build). */
export const SPRITE_MANIFEST: Record<string, string> = {
  [TextureKeys.fairy('rosa')]: fairyRosaUrl,
  [TextureKeys.fairy('azul')]: fairyAzulUrl,
  [TextureKeys.fairy('verde')]: fairyVerdeUrl,
  [TextureKeys.fairy('amarillo')]: fairyAmarilloUrl,
  [TextureKeys.flowerPainted('rosa')]: flowerRosaUrl,
  [TextureKeys.flowerPainted('azul')]: flowerAzulUrl,
  [TextureKeys.flowerPainted('verde')]: flowerVerdeUrl,
  [TextureKeys.flowerPainted('amarillo')]: flowerAmarilloUrl,
  [TextureKeys.flowerNeutral('blanca')]: flowerBlancaUrl,
  [TextureKeys.flowerNeutral('gris')]: flowerGrisUrl,
  [TextureKeys.tree]: treeUrl,
  [TextureKeys.rock]: rockUrl,
  [TextureKeys.spark]: sparkUrl,
  [TextureKeys.spellRing]: spellRingUrl,
  [TextureKeys.background]: backgroundUrl,
};

/** Llamar en `preload()` de BootScene. */
export function preloadSprites(scene: Phaser.Scene): void {
  for (const [key, path] of Object.entries(SPRITE_MANIFEST)) scene.load.image(key, path);
}

/** Llamar en `create()` de BootScene. Solo genera las texturas que no se cargaron como sprite. */
export function registerPlaceholderTextures(scene: Phaser.Scene): void {
  const make = (key: string, width: number, height: number, draw: (g: Phaser.GameObjects.Graphics) => void) => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({}, false);
    draw(g);
    g.generateTexture(key, width, height);
    g.destroy();
  };

  const colorNames = Object.keys(FAIRY_COLORS) as FairyColorName[];

  // Hadas: cuerpo circular del color del hada con alas triangulares.
  const { width: fw, height: fh } = TextureSizes.fairy;
  for (const color of colorNames) {
    make(TextureKeys.fairy(color), fw, fh, (g) => {
      const cx = fw / 2;
      const cy = fh / 2 + 2;
      g.fillStyle(0xffffff, 0.75);
      g.fillTriangle(cx, cy, 2, 4, 6, cy + 8);
      g.fillTriangle(cx, cy, fw - 2, 4, fw - 6, cy + 8);
      g.fillStyle(FAIRY_COLORS[color], 1);
      g.fillCircle(cx, cy, 16);
      g.lineStyle(2, 0xffffff, 1);
      g.strokeCircle(cx, cy, 16);
    });
  }

  // Flores: cinco pétalos alrededor de un centro.
  const drawFlower = (petals: number, center: number) => (g: Phaser.GameObjects.Graphics) => {
    const c = TextureSizes.flower.size / 2;
    g.fillStyle(0x000000, 0.25);
    g.fillCircle(c + 1, c + 2, 12);
    g.fillStyle(petals, 1);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      g.fillCircle(c + Math.cos(a) * 7, c + Math.sin(a) * 7, 6);
    }
    g.fillStyle(center, 1);
    g.fillCircle(c, c, 4.5);
  };
  const fs = TextureSizes.flower.size;
  for (const tone of Object.keys(FLOWER_NEUTRAL_COLORS) as NeutralTone[]) {
    make(TextureKeys.flowerNeutral(tone), fs, fs, drawFlower(FLOWER_NEUTRAL_COLORS[tone], 0xf2c94c));
  }
  for (const color of colorNames) {
    make(TextureKeys.flowerPainted(color), fs, fs, drawFlower(FAIRY_COLORS[color], 0xffffff));
  }

  // Árbol: copa con sombra y brillo.
  const { bodyRadius: tr, size: ts } = TextureSizes.tree;
  make(TextureKeys.tree, ts, ts, (g) => {
    g.fillStyle(0x0a2612, 0.6);
    g.fillCircle(tr + 4, tr + 6, tr);
    g.fillStyle(0x1b5e2c, 1);
    g.fillCircle(tr, tr, tr);
    g.fillStyle(0x2e7d3e, 1);
    g.fillCircle(tr * 0.7, tr * 0.7, tr * 0.45);
  });

  // Roca: hexágono irregular con sombra.
  const { bodyRadius: rr, size: rs } = TextureSizes.rock;
  make(TextureKeys.rock, rs, rs, (g) => {
    const c = rs / 2;
    const jitter = [1, 0.85, 0.95, 0.8, 1, 0.9];
    const points = jitter.map((j, i) => {
      const a = (i / jitter.length) * Math.PI * 2;
      return new Phaser.Math.Vector2(c + Math.cos(a) * rr * j, c + Math.sin(a) * rr * j);
    });
    g.fillStyle(0x5f6468, 1);
    g.fillPoints(points.map((p) => new Phaser.Math.Vector2(p.x + 2, p.y + 3)), true);
    g.fillStyle(0x8a8f93, 1);
    g.fillPoints(points, true);
  });

  // Efectos: chispa para partículas y anillo para el hechizo (se tiñen con setTint).
  make(TextureKeys.spark, 8, 8, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
  });
  make(TextureKeys.spellRing, 64, 64, (g) => {
    g.lineStyle(4, 0xffffff, 1);
    g.strokeCircle(32, 32, 29);
  });
}
