export type EnemyType = 'basic' | 'fast' | 'tank' | 'shield';

export type TauntType = 'weave' | 'bob' | 'circle' | 'zigzag';

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

  // Taunt motion
  tauntType: TauntType;
  tauntPhase: number;       // radians, random per enemy
  tauntAmplitude: number;   // degrees offset magnitude
  tauntFreq: number;        // rad/sec

  // Shield (periodically invulnerable)
  isShielded: boolean;
  shieldTimer: number;      // seconds until toggle
}

export interface Calibration {
  beta: number;
  gamma: number;
}

export type GameState =
  | 'title'
  | 'permission'
  | 'calibrating'
  | 'faceSetup'
  | 'tutorial'
  | 'playing'
  | 'gameover';

export interface GameConfig {
  scaleX: number; // px per degree
  scaleY: number; // px per degree
}

export const GAME_CONFIG: GameConfig = {
  scaleX: 18,
  scaleY: 18,
};

type EnemyStaticConfig = Pick<
  Enemy,
  'health' | 'maxHealth' | 'baseHitRadius' | 'maxDisplayRadius' | 'depthSpeed' | 'type'
>;

export const ENEMY_CONFIGS: Record<EnemyType, EnemyStaticConfig> = {
  //                                                 hitRadius  displayRadius
  basic:  { health: 1, maxHealth: 1, baseHitRadius: 44, maxDisplayRadius: 210, depthSpeed: 0.11, type: 'basic'  },
  fast:   { health: 1, maxHealth: 1, baseHitRadius: 32, maxDisplayRadius: 170, depthSpeed: 0.20, type: 'fast'   },
  tank:   { health: 3, maxHealth: 3, baseHitRadius: 54, maxDisplayRadius: 260, depthSpeed: 0.07, type: 'tank'   },
  shield: { health: 1, maxHealth: 1, baseHitRadius: 44, maxDisplayRadius: 210, depthSpeed: 0.10, type: 'shield' },
};

export const SCORE_VALUES: Record<EnemyType, number> = {
  basic: 100,
  fast: 150,
  tank: 300,
  shield: 250,
};

// Shield cycling: ~1.5s vulnerable, ~1.2s shielded
export const SHIELD_OPEN_DURATION = 1.5;
export const SHIELD_CLOSED_DURATION = 1.2;

// Visual scale from depth:
//   progress = 1 - depth  (0=far, 1=close)
//   visualScale = MIN + (1-MIN) * progress^CURVE
export const DEPTH_MIN_SCALE = 0.02;  // tiny dot at depth=1
export const DEPTH_CURVE = 2.8;       // stays tiny until ~depth 0.3, then surges

// depth at which the enemy "attacks"
export const ATTACK_DEPTH = 0.05;

// ---- Effect types ----
export interface BulletEffect {
  id: string;
  // Arc trajectory endpoints & metadata.
  // Origin is implicit: bottom-center of screen.
  targetX: number;  // px from screen center (horizontal)
  targetY: number;  // px from screen center (vertical)
  hit: boolean;     // whether this bullet hit an enemy
}

export interface HitEffect {
  id: string;
  x: number;       // px from screen center
  y: number;
  type: EnemyType;
  score: number;
}
