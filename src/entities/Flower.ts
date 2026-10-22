import Phaser from 'phaser';
import { FAIRY_COLORS, FLOWER, type FairyColorName } from '../shared/config';

import type { FlowerState, IFlower, PlayerId, Point } from '../shared/types';
import { LAYER } from '../systems/layers';
import { TextureKeys } from '../visuals/AssetRegistry';

/** J3: flor con sprite. Nace blanca o gris y florece del color del hada que la encanta. */
export class Flower implements IFlower {
  readonly id: number;
  readonly position: Point;
  private current: FlowerState;
  private readonly scene: Phaser.Scene;
  private readonly root: Phaser.GameObjects.Container;
  private readonly bloom: Phaser.GameObjects.Image;
  private bloomScale = 1;
  private readonly shield: Phaser.GameObjects.Arc;
  private shieldTween?: Phaser.Tweens.Tween;
  private shieldTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, id: number, position: Point, tone: 'blanca' | 'gris' = id % 2 ? 'gris' : 'blanca') {
    this.scene = scene;
    this.id = id;
    this.position = { ...position };
    this.current = { kind: 'neutral', tone };

    this.shield = scene.add.circle(0, 0, FLOWER.radius + 6).setStrokeStyle(2, 0xffffff, 0.9).setVisible(false);
    this.bloom = scene.add.image(0, -4, TextureKeys.flowerNeutral(tone));
    this.bloomScale = (FLOWER.radius * 3) / this.bloom.displayHeight;
    this.bloom.setScale(this.bloomScale);
    this.root = scene.add.container(position.x, position.y, [this.shield, this.bloom]).setDepth(LAYER.flowers);

    // Balanceo suave para que el bosque parezca vivo.
    scene.tweens.add({
      targets: this.bloom,
      angle: { from: -6, to: 6 },
      duration: 1400 + Math.random() * 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: Math.random() * 1000,
    });
  }

  get state(): FlowerState {
    return this.current;
  }

  /** Pinta la flor con el color del hada. Las reglas (quién puede pintar) están en systems/rules. */
  paint(owner: PlayerId, color: FairyColorName, now: number): void {
    this.current = { kind: 'painted', owner, color, paintedAt: now };
    this.bloom.setTexture(TextureKeys.flowerPainted(color));

    this.bloom.setScale(this.bloomScale * 0.2);
    this.scene.tweens.add({ targets: this.bloom, scale: this.bloomScale, duration: 450, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: this.root, y: this.position.y - 6, duration: 120, yoyo: true, ease: 'Quad.easeOut' });

    this.showShield(FAIRY_COLORS[color]);
  }

  destroy(): void {
    this.shieldTimer?.remove();
    this.root.destroy();
  }

  /** Anillo brillante mientras dura la protección contra repintado. */
  private showShield(color: number): void {
    this.shieldTween?.stop();
    this.shieldTimer?.remove();
    this.shield.setStrokeStyle(2, color, 0.9).setVisible(true).setAlpha(1).setScale(1);
    this.shieldTween = this.scene.tweens.add({
      targets: this.shield,
      alpha: 0.25,
      scale: 1.15,
      duration: 250,
      yoyo: true,
      repeat: -1,
    });
    this.shieldTimer = this.scene.time.delayedCall(FLOWER.protectionMs, () => {
      this.shieldTween?.stop();
      this.shield.setVisible(false);
    });
  }

}
