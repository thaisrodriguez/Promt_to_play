// Contrato compartido: cualquier cambio aquí se acuerda entre Thais y Jose.

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/** Colores disponibles para las hadas. Cada jugador elige uno distinto. */
export const FAIRY_COLORS = {
  rosa: 0xff5fa2,
  azul: 0x4da6ff,
  morado: 0xa55eea,
  amarillo: 0xffd23f,
} as const;

export type FairyColorName = keyof typeof FAIRY_COLORS;

/** Colores de las flores sin encantar. */
export const FLOWER_NEUTRAL_COLORS = {
  blanca: 0xffffff,
  gris: 0x9e9e9e,
} as const;

export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;

/** Duración de una partida, en segundos. */
export const MATCH_DURATION_S = 90;

export const FAIRY = {
  speed: 220, // px/s
  radius: 18,
} as const;

export const SPELL = {
  radius: 70, // radio del área de encantamiento, en px
  cooldownMs: 600,
} as const;

export const FLOWER = {
  count: 40,
  radius: 12,
  /** Tiempo durante el que una flor recién pintada no se puede repintar. */
  protectionMs: 2000,
  /** Distancia mínima entre flores al generarlas, en px. */
  minDistance: 40,
  /** Proporción de flores grises (el resto son blancas). */
  grayRatio: 0.4,
} as const;

/** Teclas por jugador (layout por defecto para multijugador local). */
export const PLAYER_KEYS = [
  { up: 'W', down: 'S', left: 'A', right: 'D', spell: 'SPACE' },
  { up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT', spell: 'ENTER' },
  { up: 'I', down: 'K', left: 'J', right: 'L', spell: 'U' },
  { up: 'EIGHT', down: 'FIVE', left: 'FOUR', right: 'SIX', spell: 'ZERO' },
] as const;

export const FOREST = {
  /** Margen entre el borde del canvas y el área jugable. */
  margin: 20,
  /** Franja superior reservada para el HUD. */
  hudHeight: 40,
  treeCount: 9,
  rockCount: 6,
  treeRadius: { min: 26, max: 40 },
  rockRadius: { min: 14, max: 22 },
  /** Separación mínima entre obstáculos, y entre obstáculos y el borde. */
  spacing: 50,
  /** Semilla por defecto: el mismo número genera siempre el mismo bosque. */
  seed: 2026,
} as const;

/** Orden de dibujado (mayor = encima). */
export const DEPTH = {
  background: 0,
  flowers: 10,
  fairies: 20,
  obstacles: 30,
  effects: 40,
  ui: 100,
} as const;
