export type EnemyType = 'basic' | 'fast' | 'tank';

export interface Enemy {
  id: string;
  worldX: number; // degrees from calibrated center (horizontal)
  worldY: number; // degrees from calibrated center (vertical)
  health: number;
  maxHealth: number;
  type: EnemyType;
  hitRadius: number; // px
  speed: number; // degrees per second, approaching center
  isHit: boolean;
  hitTimer: number;
}

export interface Calibration {
  beta: number;
  gamma: number;
}

export type GameState = 'title' | 'permission' | 'calibrating' | 'playing' | 'gameover';

export interface GameConfig {
  scaleX: number; // px per degree
  scaleY: number; // px per degree
  maxWorldAngle: number; // max degrees from center enemies spawn at
}

export const GAME_CONFIG: GameConfig = {
  scaleX: 18,
  scaleY: 18,
  maxWorldAngle: 25,
};

export const ENEMY_CONFIGS: Record<EnemyType, Omit<Enemy, 'id' | 'worldX' | 'worldY' | 'isHit' | 'hitTimer'>> = {
  basic: { health: 1, maxHealth: 1, hitRadius: 44, speed: 1.8, type: 'basic' },
  fast:  { health: 1, maxHealth: 1, hitRadius: 32, speed: 3.2, type: 'fast' },
  tank:  { health: 3, maxHealth: 3, hitRadius: 52, speed: 0.9, type: 'tank' },
};
