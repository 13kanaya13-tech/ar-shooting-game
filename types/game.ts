export type EnemyType = 'basic' | 'fast' | 'tank';

export interface Enemy {
  id: string;
  worldX: number;         // degrees from calibrated center (horizontal)
  worldY: number;         // degrees from calibrated center (vertical)
  depth: number;          // 1.0 = far away, 0.0 = at player (attacks)
  health: number;
  maxHealth: number;
  type: EnemyType;
  baseHitRadius: number;  // hit radius used for shooting detection
  maxDisplayRadius: number; // display radius at depth=0 (full-size)
  depthSpeed: number;     // depth units consumed per second
  isHit: boolean;
  hitTimer: number;
}

export interface Calibration {
  beta: number;
  gamma: number;
}

export type GameState = 'title' | 'permission' | 'calibrating' | 'tutorial' | 'playing' | 'gameover';

export interface GameConfig {
  scaleX: number; // px per degree
  scaleY: number; // px per degree
}

export const GAME_CONFIG: GameConfig = {
  scaleX: 18,
  scaleY: 18,
};

export const ENEMY_CONFIGS: Record<EnemyType, Pick<Enemy, 'health' | 'maxHealth' | 'baseHitRadius' | 'maxDisplayRadius' | 'depthSpeed' | 'type'>> = {
  //                                              hitRadius  displayRadius
  basic: { health: 1, maxHealth: 1, baseHitRadius: 44, maxDisplayRadius: 210, depthSpeed: 0.11, type: 'basic' },
  fast:  { health: 1, maxHealth: 1, baseHitRadius: 32, maxDisplayRadius: 170, depthSpeed: 0.20, type: 'fast'  },
  tank:  { health: 3, maxHealth: 3, baseHitRadius: 54, maxDisplayRadius: 260, depthSpeed: 0.07, type: 'tank'  },
};

// Visual scale from depth:
//   progress = 1 - depth  (0=far, 1=close)
//   visualScale = MIN + (1-MIN) * progress^CURVE
export const DEPTH_MIN_SCALE = 0.04;  // tiny dot at depth=1
export const DEPTH_CURVE = 1.6;       // stays small until close, then grows fast

// depth at which the enemy "attacks"
export const ATTACK_DEPTH = 0.05;

// ---- Effect types ----
export interface BulletEffect {
  id: string;
  angle: number;   // radians from center (right = 0)
  length: number;  // px
}

export interface HitEffect {
  id: string;
  x: number;       // px from screen center
  y: number;
  type: EnemyType;
  score: number;
}
