'use client';

import { Enemy } from '@/types/game';

interface EnemySpriteProps {
  enemy: Enemy;
  screenX: number; // px from center
  screenY: number; // px from center
}

const TYPE_STYLES = {
  basic: {
    bg: 'bg-green-500',
    border: 'border-green-300',
    shadow: 'shadow-green-500/60',
    emoji: '👾',
  },
  fast: {
    bg: 'bg-yellow-400',
    border: 'border-yellow-200',
    shadow: 'shadow-yellow-400/60',
    emoji: '⚡',
  },
  tank: {
    bg: 'bg-red-600',
    border: 'border-red-300',
    shadow: 'shadow-red-500/60',
    emoji: '💀',
  },
};

export default function EnemySprite({ enemy, screenX, screenY }: EnemySpriteProps) {
  // Check if on screen (allow some margin)
  const margin = enemy.hitRadius + 30;
  const halfW = (typeof window !== 'undefined' ? window.innerWidth : 390) / 2;
  const halfH = (typeof window !== 'undefined' ? window.innerHeight : 844) / 2;

  if (
    screenX < -(halfW + margin) || screenX > halfW + margin ||
    screenY < -(halfH + margin) || screenY > halfH + margin
  ) {
    return null;
  }

  const style = TYPE_STYLES[enemy.type];
  const size = enemy.hitRadius * 1.4;
  const hpRatio = enemy.health / enemy.maxHealth;

  return (
    <div
      className="absolute pointer-events-none z-20"
      style={{
        left: '50%',
        top: '50%',
        transform: `translate(calc(-50% + ${screenX}px), calc(-50% + ${screenY}px))`,
      }}
    >
      {/* Hit flash overlay */}
      {enemy.isHit && (
        <div
          className="absolute inset-0 bg-white/70 rounded-full z-10"
          style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, borderRadius: '50%' }}
        />
      )}

      {/* Enemy body */}
      <div
        className={`
          ${style.bg} ${style.border}
          border-2 rounded-full flex items-center justify-center
          shadow-lg ${style.shadow}
          transition-transform
          ${enemy.isHit ? 'scale-125' : 'scale-100'}
        `}
        style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 }}
      >
        <span style={{ fontSize: size * 0.45 }}>{style.emoji}</span>
      </div>

      {/* HP bar (tank only) */}
      {enemy.type === 'tank' && enemy.maxHealth > 1 && (
        <div
          className="absolute bg-gray-800 rounded-full overflow-hidden"
          style={{ width: size, height: 5, left: -size / 2, top: size / 2 + 4 }}
        >
          <div
            className="h-full bg-red-400 transition-all duration-200"
            style={{ width: `${hpRatio * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
