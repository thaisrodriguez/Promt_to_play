import Phaser from 'phaser';
import { FAIRY, FAIRY_COLORS, GAME_WIDTH, PLAYER_KEYS, type FairyColorName } from '../shared/config';
import type { IFairy, PlayerConfig, PlayerId, Point } from '../shared/types';
import { normalize } from '../systems/geometry';
import { FUNNY_FONT, LAYER } from '../systems/layers';
import { TextureKeys } from '../visuals/AssetRegistry';

type ControlName = keyof (typeof PLAYER_KEYS)[number];
type Keys = Record<ControlName, Phaser.Input.Keyboard.Key>;

/** Quién mueve al hada: el teclado de un jugador o la IA rival (systems/RivalController). */
export interface FairyControls {
  /** Se llama una vez por frame, antes de leer la dirección y el hechizo. */
  update?(time: number): void;
  /** Vector unitario (o cero) hacia donde moverse. */
  direction(): Point;
  /** True cuando quiere lanzar el hechizo. */
  wantsToCast(): boolean;
}

/** J2: controles de teclado de un jugador según `PLAYER_KEYS`. */
export class KeyboardControls implements FairyControls {
  private readonly keys: Keys;

  constructor(keyboard: Phaser.Input.Keyboard.KeyboardPlugin, keysIndex: number) {
    this.keys = keyboard.addKeys({ ...PLAYER_KEYS[keysIndex] }) as Keys;
  }

  direction(): Point {
    const k = this.keys;
    return normalize(Number(k.right.isDown) - Number(k.left.isDown), Number(k.down.isDown) - Number(k.up.isDown));
  }

  /** True solo en el frame en que se pulsa la tecla de hechizo. */
  wantsToCast(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.keys.spell);
  }
}

/**
 * J1 + J2: hada geométrica controlada por teclado.
 * Círculo del color del jugador, alas triangulares que aletean, carita que parpadea y estela de brillos.
 */
export class Fairy implements IFairy {
  readonly playerId: PlayerId;
  readonly color: FairyColorName;
  readonly radius = FAIRY.radius;
  /** Lo ajustan los power-ups (Café de rocío). */
  speedMultiplier = 1;
  /** Se llama cada vez que el hada dice algo (el host lo reenvía a los invitados). */
  onSay?: (text: string) => void;

  private readonly scene: Phaser.Scene;
  private controls?: FairyControls;
  private readonly pos: Point;
  private readonly root: Phaser.GameObjects.Container;
  private readonly bodyParts: Phaser.GameObjects.Container;
  private readonly aura: Phaser.GameObjects.Arc;
  private readonly tint: number;
  private bubble?: Phaser.GameObjects.Text;
  private moving = false;
  private boosted = false;
  private lastTrailAt = 0;

  constructor(scene: Phaser.Scene, player: PlayerConfig, start: Point) {
    this.scene = scene;
    this.playerId = player.id;
    this.color = player.color;
    this.tint = FAIRY_COLORS[player.color];
    this.pos = { ...start };

    const keyboard = scene.input.keyboard;
    if (keyboard && !player.cpu && PLAYER_KEYS[player.keysIndex]) this.controls = new KeyboardControls(keyboard, player.keysIndex);

    const r = this.radius;
    this.aura = scene.add.circle(0, 0, r * 1.9, this.tint, 0.18);

    const sprite = scene.add.image(0, 0, TextureKeys.fairy(player.color));
    sprite.setScale(96 / sprite.height);

    this.bodyParts = scene.add.container(0, 0, [sprite]);
    this.root = scene.add.container(start.x, start.y, [this.aura, this.bodyParts]).setDepth(LAYER.fairies);

    scene.tweens.add({ targets: this.bodyParts, y: -4, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    scene.tweens.add({ targets: this.aura, scale: 1.15, alpha: 0.3, duration: 900, yoyo: true, repeat: -1 });
  }

  get position(): Point {
    return { ...this.pos };
  }

  setPosition(p: Point): void {
    this.pos.x = p.x;
    this.pos.y = p.y;
    this.root.setPosition(p.x, p.y);
  }

  /** Cambia quién mueve al hada (p. ej. la IA rival). */
  useControls(controls: FairyControls): void {
    this.controls = controls;
  }

  wantsToCast(): boolean {
    return !!this.controls?.wantsToCast();
  }

  update(time: number, delta: number): void {
    this.controls?.update?.(time);
    const dir = this.controls?.direction() ?? { x: 0, y: 0 };
    const step = (FAIRY.speed * this.speedMultiplier * delta) / 1000;
    this.moving = dir.x !== 0 || dir.y !== 0;

    if (this.moving) {
      this.setPosition({ x: this.pos.x + dir.x * step, y: this.pos.y + dir.y * step });
      if (dir.x !== 0) this.bodyParts.scaleX = dir.x > 0 ? 1 : -1;
      this.bodyParts.angle = dir.x * 8;
    } else {
      this.bodyParts.angle = 0;
    }

    const trailEvery = this.boosted ? 30 : 70;
    if ((this.moving || this.boosted) && time - this.lastTrailAt > trailEvery) {
      this.lastTrailAt = time;
      this.sparkle();
    }
  }

  get isBoosted(): boolean {
    return this.boosted;
  }

  /** Activa el modo "con power-up": aura más grande y estela continua. */
  setBoosted(boosted: boolean): void {
    if (boosted === this.boosted) return;
    this.boosted = boosted;
    this.aura.setFillStyle(boosted ? 0xffffff : this.tint, boosted ? 0.35 : 0.18);
  }

  /** Bocadillo con una frase graciosa que sube y se desvanece. */
  say(text: string): void {
    this.onSay?.(text);
    this.bubble?.destroy();
    const bubble = this.scene.add
      .text(this.pos.x, this.pos.y - this.radius * 2.6, text, {
        fontFamily: FUNNY_FONT,
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: Phaser.Display.Color.IntegerToColor(this.tint).darken(35).rgba,
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(LAYER.bubbles)
      .setScale(0.3);
    // Que no se salga de la pantalla cuando el hada está en un borde.
    const half = (bubble.width * 1.1) / 2 + 4; // 1.1: rebote de Back.easeOut
    bubble.x = Phaser.Math.Clamp(bubble.x, half, GAME_WIDTH - half);
    bubble.y = Math.max(bubble.y, (bubble.height * 1.1) / 2 + 4);
    const rise = Math.min(30, bubble.y - bubble.height / 2 - 4);
    this.bubble = bubble;
    this.scene.tweens.add({ targets: bubble, scale: 1, duration: 220, ease: 'Back.easeOut' });
    this.scene.tweens.add({
      targets: bubble,
      y: bubble.y - rise,
      alpha: 0,
      delay: 700,
      duration: 600,
      onComplete: () => {
        bubble.destroy();
        if (this.bubble === bubble) this.bubble = undefined;
      },
    });
  }

  /** Aplastamiento cómico al chocar. */
  squash(): void {
    this.scene.tweens.add({ targets: this.root, scaleX: 1.35, scaleY: 0.7, duration: 90, yoyo: true, ease: 'Quad.easeOut' });
  }

  /** Saltito de alegría al encantar flores. */
  celebrate(): void {
    this.scene.tweens.add({ targets: this.root, scale: 1.25, duration: 120, yoyo: true, ease: 'Back.easeOut' });
  }

  destroy(): void {
    this.bubble?.destroy();
    this.root.destroy();
  }

  private sparkle(): void {
    const s = this.scene.add
      .circle(
        this.pos.x + Phaser.Math.Between(-8, 8),
        this.pos.y + Phaser.Math.Between(4, 14),
        Phaser.Math.Between(2, 4),
        Math.random() < 0.5 ? 0xffffff : this.tint,
      )
      .setDepth(LAYER.fairies - 1);
    this.scene.tweens.add({
      targets: s,
      alpha: 0,
      scale: 0.2,
      y: s.y + 12,
      duration: 500,
      onComplete: () => s.destroy(),
    });
  }
}

/** Vértices de una estrella de 5 puntas. */
export function starPoints(cx: number, cy: number, outer: number, inner: number): Phaser.Math.Vector2[] {
  const points: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    points.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
  }
  return points;
}
