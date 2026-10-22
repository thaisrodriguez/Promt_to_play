import { describe, expect, it } from 'vitest';
import type { PlayerConfig } from '../shared/types';
import { rankPlayers } from './ranking';

const players: PlayerConfig[] = [
  { id: 0, color: 'rosa', keysIndex: 0 },
  { id: 1, color: 'azul', keysIndex: 1 },
  { id: 2, color: 'morado', keysIndex: 2 },
];

describe('rankPlayers', () => {
  it('ordena de más a menos flores', () => {
    const ranked = rankPlayers(players, { 0: 3, 1: 10, 2: 5 });
    expect(ranked.map((r) => r.player.id)).toEqual([1, 2, 0]);
    expect(ranked.map((r) => r.position)).toEqual([1, 2, 3]);
  });

  it('los empatados comparten posición', () => {
    const ranked = rankPlayers(players, { 0: 7, 1: 7, 2: 2 });
    expect(ranked.map((r) => r.position)).toEqual([1, 1, 3]);
  });

  it('trata como 0 a quien no tiene puntuación', () => {
    const ranked = rankPlayers(players, { 1: 4 });
    expect(ranked[0].player.id).toBe(1);
    expect(ranked.slice(1).every((r) => r.score === 0 && r.position === 2)).toBe(true);
  });
});
