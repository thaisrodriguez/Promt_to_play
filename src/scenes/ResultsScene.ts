import Phaser from 'phaser';
import { FAIRY_COLORS, GAME_HEIGHT, GAME_WIDTH } from '../shared/config';
import { SceneKeys } from '../shared/scenes';
import type { MatchResult } from '../shared/types';
import { rankPlayers } from '../ui/ranking';
import { TextureKeys } from '../visuals/AssetRegistry';
import type { GameSceneData } from './GameScene';

const MEDALS = ['🥇', '🥈', '🥉', '4º'];

export class ResultsScene extends Phaser.Scene {
  private result!: MatchResult;

  constructor() {
    super(SceneKeys.Results);
  }

  init(data: MatchResult): void {
    this.result = data;
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const { winners, players, scores } = this.result;
    const winner = players.find((p) => p.id === winners[0]);
    const title =
      winners.length === 0
        ? 'Nadie encantó flores'
        : winners.length > 1
          ? '¡Empate!'
          : `¡Gana el hada ${winner ? winner.color : `J${winners[0] + 1}`}!`;

    const titleText = this.add.text(cx, 110, title, { fontSize: '52px', color: '#ffffff' }).setOrigin(0.5);
    if (winner && winners.length === 1) titleText.setColor(`#${FAIRY_COLORS[winner.color].toString(16).padStart(6, '0')}`);

    rankPlayers(players, scores).forEach((r, i) => {
      const y = 230 + i * 80;
      const isWinner = winners.includes(r.player.id);
      this.add
        .rectangle(cx, y, 560, 64, isWinner ? 0x2e6b41 : 0x173b24)
        .setStrokeStyle(2, isWinner ? FAIRY_COLORS[r.player.color] : 0x2e6b41);
      this.add.text(cx - 240, y, MEDALS[r.position - 1] ?? `${r.position}º`, { fontSize: '30px' }).setOrigin(0.5);
      const fairy = this.add.image(cx - 160, y, TextureKeys.fairy(r.player.color));
      fairy.setScale(56 / fairy.height);
      if (isWinner) this.tweens.add({ targets: fairy, y: y - 8, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.add.text(cx - 110, y, `${r.player.cpu ? 'CPU' : 'Jugador'} ${r.player.id + 1}`, { fontSize: '26px', color: '#ffffff' }).setOrigin(0, 0.5);
      this.add.text(cx + 250, y, `${r.score} flores`, { fontSize: '26px', color: '#ffffff' }).setOrigin(1, 0.5);
    });

    this.add
      .text(cx, GAME_HEIGHT - 70, 'ENTER · Revancha      ESC · Menú', { fontSize: '24px', color: '#cfe8d5' })
      .setOrigin(0.5);

    this.input.keyboard?.once('keydown-ENTER', () =>
      this.scene.start(SceneKeys.Game, { players } satisfies GameSceneData),
    );
    this.input.keyboard?.once('keydown-ESC', () => this.scene.start(SceneKeys.MainMenu));
  }
}
