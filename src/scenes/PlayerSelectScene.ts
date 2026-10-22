import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import {
  FAIRY_COLORS,
  GAME_HEIGHT,
  GAME_WIDTH,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PLAYER_KEYS,
  type FairyColorName,
} from '../shared/config';
import { SceneKeys } from '../shared/scenes';
import type { PlayerConfig } from '../shared/types';
import { keyLabel } from '../ui/keyLabels';
import { TextureKeys } from '../visuals/AssetRegistry';

const COLOR_NAMES = Object.keys(FAIRY_COLORS) as FairyColorName[];
const PANEL_WIDTH = 260;
const PANEL_HEIGHT = 300;

interface Slot {
  /** null = todavía no ha elegido color. El primero que elige un color se lo queda. */
  colorIndex: number | null;
  /** Hada de la IA rival: ya está lista y no tiene teclas. */
  cpu: boolean;
  ready: boolean;
  fairy: Phaser.GameObjects.Image;
  colorText: Phaser.GameObjects.Text;
  status: Phaser.GameObjects.Text;
  panel: Phaser.GameObjects.Rectangle;
}

/**
 * Paso 1: cuántas hadas humanas juegan. Paso 2: cuántas hadas CPU rivales.
 * Paso 3: cada jugador elige su color con sus teclas y confirma.
 */
export class PlayerSelectScene extends Phaser.Scene {
  private slots: Slot[] = [];
  private starting = false;

  constructor() {
    super(SceneKeys.PlayerSelect);
  }

  create(): void {
    this.slots = [];
    this.starting = false;
    this.showCountStep();
    this.input.keyboard?.once('keydown-ESC', () => this.scene.start(SceneKeys.MainMenu));
  }

  private showCountStep(): void {
    this.askNumber('¿Cuántas hadas humanas juegan?', 1, MAX_PLAYERS, undefined, (humans, event) => {
      if (humans === MAX_PLAYERS) return this.showColorStep(humans, 0);
      this.askNumber(
        '¿Cuántas hadas CPU rivales?',
        Math.max(0, MIN_PLAYERS - humans),
        MAX_PLAYERS - humans,
        event,
        (cpus) => this.showColorStep(humans, cpus),
      );
    });
  }

  /** Pregunta un número del `min` al `max`. `previous` es la pulsación del paso anterior, que se ignora. */
  private askNumber(
    question: string,
    min: number,
    max: number,
    previous: KeyboardEvent | undefined,
    onAnswer: (n: number, event: KeyboardEvent) => void,
  ): void {
    const cx = GAME_WIDTH / 2;
    const title = this.add.text(cx, 260, question, { fontSize: '44px', color: '#ffffff' }).setOrigin(0.5);
    const hint = this.add
      .text(cx, 330, `Pulsa un número del ${min} al ${max}`, { fontSize: '24px', color: '#cfe8d5' })
      .setOrigin(0.5);
    const back = this.add.text(cx, GAME_HEIGHT - 50, 'ESC · Volver', { fontSize: '18px', color: '#9fc9a8' }).setOrigin(0.5);

    const onKey = (event: KeyboardEvent) => {
      const n = Number(event.key);
      if (event === previous || event.repeat || !Number.isInteger(n) || n < min || n > max) return;
      this.input.keyboard?.off('keydown', onKey);
      sfx.click();
      [title, hint, back].forEach((o) => o.destroy());
      onAnswer(n, event);
    };
    this.input.keyboard?.on('keydown', onKey);
  }

  private showColorStep(humans: number, cpus: number): void {
    const count = humans + cpus;
    const cx = GAME_WIDTH / 2;
    this.add.text(cx, 70, 'Elige el color de tu hada', { fontSize: '40px', color: '#ffffff' }).setOrigin(0.5);
    this.add
      .text(cx, 120, 'Izquierda / derecha para cambiar · hechizo para confirmar', { fontSize: '20px', color: '#cfe8d5' })
      .setOrigin(0.5);
    this.add.text(cx, GAME_HEIGHT - 40, 'ESC · Volver al menú', { fontSize: '18px', color: '#9fc9a8' }).setOrigin(0.5);

    const gap = 30;
    const totalWidth = count * PANEL_WIDTH + (count - 1) * gap;
    for (let i = 0; i < count; i++) {
      const x = cx - totalWidth / 2 + PANEL_WIDTH / 2 + i * (PANEL_WIDTH + gap);
      this.slots.push(this.createSlot(i, x, 380, i >= humans));
    }
  }

  private createSlot(index: number, x: number, y: number, cpu: boolean): Slot {
    const keys = PLAYER_KEYS[index];
    const panel = this.add.rectangle(x, y, PANEL_WIDTH, PANEL_HEIGHT, 0x173b24).setStrokeStyle(3, 0x2e6b41);
    const label = cpu ? `CPU ${index + 1}` : `Jugador ${index + 1}`;
    this.add.text(x, y - 120, label, { fontSize: '26px', color: '#ffffff' }).setOrigin(0.5);
    const fairy = this.add.image(x, y - 30, TextureKeys.fairy(COLOR_NAMES[index]));
    fairy.setScale(120 / fairy.height); // ~120 px de alto sea cual sea el sprite
    const colorText = this.add.text(x, y + 45, '', { fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);
    const status = this.add.text(x, y + 122, '', { fontSize: '20px', color: '#ffd23f' }).setOrigin(0.5);
    if (cpu) {
      // La CPU recibe su color al empezar la partida, de entre los que queden libres.
      const slot: Slot = { colorIndex: null, cpu, ready: true, fairy, colorText, status, panel };
      this.refresh(slot);
      return slot;
    }

    this.add.text(x - 90, y - 30, '◀', { fontSize: '28px', color: '#cfe8d5' }).setOrigin(0.5);
    this.add.text(x + 90, y - 30, '▶', { fontSize: '28px', color: '#cfe8d5' }).setOrigin(0.5);
    this.add
      .text(x, y + 85, `${keyLabel(keys.left)} ${keyLabel(keys.right)} · ${keyLabel(keys.spell)}`, {
        fontSize: '18px',
        color: '#9fc9a8',
      })
      .setOrigin(0.5);

    const slot: Slot = { colorIndex: null, cpu, ready: false, fairy, colorText, status, panel };
    // Ignora la autorrepetición al mantener pulsada una tecla.
    const onPress = (keyName: string, action: () => void) =>
      this.input.keyboard?.addKey(keyName).on('down', (_key: Phaser.Input.Keyboard.Key, event: KeyboardEvent) => {
        if (!event.repeat) action();
      });
    onPress(keys.left, () => this.changeColor(slot, -1));
    onPress(keys.right, () => this.changeColor(slot, 1));
    onPress(keys.spell, () => this.toggleReady(slot));
    this.refresh(slot);
    return slot;
  }

  private changeColor(slot: Slot, direction: 1 | -1): void {
    if (slot.ready || this.starting) return;
    const taken = new Set(this.slots.filter((s) => s !== slot && s.colorIndex !== null).map((s) => s.colorIndex));
    let next = slot.colorIndex ?? (direction > 0 ? -1 : COLOR_NAMES.length);
    do {
      next = (next + direction + COLOR_NAMES.length) % COLOR_NAMES.length;
    } while (taken.has(next));
    slot.colorIndex = next;
    sfx.click();
    this.refresh(slot);
  }

  private toggleReady(slot: Slot): void {
    if (this.starting || slot.cpu || slot.colorIndex === null) return;
    slot.ready = !slot.ready;
    sfx.click();
    this.refresh(slot);
    if (this.slots.every((s) => s.ready)) this.startMatch();
  }

  private refresh(slot: Slot): void {
    if (slot.colorIndex === null) {
      slot.fairy.setTintFill(0x4a5a50).setAlpha(0.6);
      slot.colorText.setText('—');
      slot.panel.setStrokeStyle(3, 0x2e6b41);
    } else {
      const color = COLOR_NAMES[slot.colorIndex];
      slot.fairy.clearTint().setAlpha(1).setTexture(TextureKeys.fairy(color));
      slot.colorText.setText(color[0].toUpperCase() + color.slice(1));
      slot.panel.setStrokeStyle(3, slot.ready ? FAIRY_COLORS[color] : 0x2e6b41);
    }
    const status = slot.cpu
      ? 'IA rival'
      : slot.ready
        ? '¡Lista!'
        : slot.colorIndex === null
          ? 'Elige un color'
          : 'Eligiendo…';
    slot.status.setText(status);
  }

  /** Primer color que no está seleccionado por ningún slot. */
  private firstFreeColor(): number {
    const taken = new Set(this.slots.map((s) => s.colorIndex));
    const free = COLOR_NAMES.findIndex((_, i) => !taken.has(i));
    return free === -1 ? 0 : free;
  }

  private startMatch(): void {
    this.starting = true;
    // Las CPU se quedan con los colores que sobraron.
    for (const slot of this.slots) {
      if (!slot.cpu || slot.colorIndex !== null) continue;
      slot.colorIndex = this.firstFreeColor();
      this.refresh(slot);
    }
    const players: PlayerConfig[] = this.slots.map((s, id) => ({
      id,
      color: COLOR_NAMES[s.colorIndex ?? 0],
      keysIndex: id,
      ...(s.cpu && { cpu: true }),
    }));
    this.time.delayedCall(500, () => this.scene.start(SceneKeys.Game, { players }));
  }
}
