export type EnemyType = 'basic' | 'fast' | 'tank';

export interface Enemy {
  id: string;
  worldX: number;   // degrees from calibrated center (horizontal)
  worldY: number;   // degrees from calibrated center (vertical)
  depth: number;    // 1.0 = far away, 0.0 = at player (attacks)
  health: number;
  maxHealth: number;
  type: EnemyType;
  baseHitRadius: number; // hit radius at depth=0 (full size)
  depthSpeed: number;    // depth units consumed per second
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
}

export const GAME_CONFIG: GameConfig = {
  scaleX: 18,
  scaleY: 18,
};

// depthSpeed: depth units per second at base (before wave scaling)
// At depthSpeed=0.12, enemy takes ~8s to travel from depth=1 to depth=0
export const ENEMY_CONFIGS: Record<EnemyType, Pick<Enemy, 'health' | 'maxHealth' | 'baseHitRadius' | 'depthSpeed' | 'type'>> = {
  basic: { health: 1, maxHealth: 1, baseHitRadius: 44, depthSpeed: 0.11, type: 'basic' },
  fast:  { health: 1, maxHealth: 1, baseHitRadius: 32, depthSpeed: 0.20, type: 'fast'  },
  tank:  { health: 3, maxHealth: 3, baseHitRadius: 54, depthSpeed: 0.07, type: 'tank'  },
};

// How visual scale is calculated from depth:
//   progress = 1 - depth  (0=far, 1=close)
//   visualScale = MIN_SCALE + (1 - MIN_SCALE) * progress^CURVE
export const DEPTH_MIN_SCALE = 0.06;  // size at depth=1 relative to full size
export const DEPTH_CURVE = 1.4;       // exponent — higher = stays small longer then grows fast

// depth at which the enemy "attacks" and deals damage
export const ATTACK_DEPTH = 0.05;
