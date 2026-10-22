import Phaser from 'phaser';
import { DEPTH, FOREST, GAME_HEIGHT, GAME_WIDTH } from '../shared/config';
import type { Obstacle, Point, Rect } from '../shared/types';
import {
  collidesWithObstacle,
  createRng,
  defaultBounds,
  generateForestLayout,
  isInsideBounds,
  type ForestLayoutOptions,
} from './forestLayout';
import { TextureKeys, TextureSizes } from '../visuals/AssetRegistry';

const COLORS = {
  outside: 0x0d1f14,
  ground: 0x1f4d2b,
  border: 0x143a20,
  grass: 0x2a6338,
};

/**
 * Bosque del juego. Árboles y rocas usan las texturas de AssetRegistry (formas hoy, sprites mañana).
 * Expone `bounds` y `obstacles` para el spawner de flores y las colisiones de las hadas.
 */
export class Forest {
  readonly bounds: Rect;
  readonly obstacles: readonly Obstacle[];

  constructor(scene: Phaser.Scene, options: ForestLayoutOptions = {}) {
    this.bounds = defaultBounds();
    this.obstacles = generateForestLayout(this.bounds, options);

    this.drawGround(scene, options.seed ?? FOREST.seed);
    for (const o of this.obstacles) {
      if (o.kind === 'tree') this.drawTree(scene, o);
      else this.drawRock(scene, o);
    }
  }

  /** true si un círculo en `p` cabe en el área jugable sin tocar obstáculos. */
  isFree(p: Point, radius = 0, gap = 0): boolean {
    return isInsideBounds(this.bounds, p, radius) && !collidesWithObstacle(this.obstacles, p, radius, gap);
  }

  private drawGround(scene: Phaser.Scene, seed: number): void {
    const { x, y, width, height } = this.bounds;
    if (scene.textures.exists(TextureKeys.background)) {
      scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, TextureKeys.background).setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setDepth(DEPTH.background - 1);
      scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.outside, 0.45).setDepth(DEPTH.background);
    } else {
      scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.outside).setDepth(DEPTH.background);
    }
    scene.add
      .rectangle(x, y, width, height, COLORS.ground, 0.88)
      .setOrigin(0)
      .setStrokeStyle(6, COLORS.border)
      .setDepth(DEPTH.background);

    // Matas de hierba decorativas, sin colisión.
    const rng = createRng(seed + 1);
    const grass = scene.add.graphics().setDepth(DEPTH.background);
    grass.fillStyle(COLORS.grass, 1);
    for (let i = 0; i < 70; i++) {
      const gx = x + 10 + rng() * (width - 20);
      const gy = y + 10 + rng() * (height - 20);
      grass.fillTriangle(gx - 4, gy + 4, gx, gy - 6, gx + 4, gy + 4);
    }
  }

  private drawTree(scene: Phaser.Scene, o: Obstacle): void {
    const { bodyRadius, size } = TextureSizes.tree;
    scene.add
      .image(o.x, o.y, TextureKeys.tree)
      .setOrigin(bodyRadius / size)
      .setScale(o.radius / bodyRadius)
      .setDepth(DEPTH.obstacles);
  }

  private drawRock(scene: Phaser.Scene, o: Obstacle): void {
    // Rotación estable: usa la posición como semilla para que cada roca se vea distinta.
    const rng = createRng(Math.round(o.x * 31 + o.y));
    scene.add
      .image(o.x, o.y, TextureKeys.rock)
      .setScale(o.radius / TextureSizes.rock.bodyRadius)
      .setRotation(rng() * Math.PI * 2)
      .setDepth(DEPTH.obstacles);
  }
}
