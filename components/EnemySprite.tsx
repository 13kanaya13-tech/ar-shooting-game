'use client';

import { Enemy, DEPTH_MIN_SCALE, DEPTH_CURVE, ATTACK_DEPTH } from '@/types/game';

interface EnemySpriteProps {
  enemy: Enemy;
  screenX: number; // px from center
  screenY: number; // px from center
}

const TYPE_STYLES = {
  basic: { bg: '#22c55e', glow: '#16a34a', emoji: '👾' },
  fast:  { bg: '#facc15', glow: '#ca8a04', emoji: '⚡' },
  tank:  { bg: '#ef4444', glow: '#991b1b', emoji: '💀' },
};

/** Maps depth (1=far, 0=close) to a visual scale 0..1 */
function depthToScale(depth: number): number {
  const progress = 1 - depth; // 0=far, 1=close
  return DEPTH_MIN_SCALE + (1 - DEPTH_MIN_SCALE) * Math.pow(progress, DEPTH_CURVE);
}

export default function EnemySprite({ enemy, screenX, screenY }: EnemySpriteProps) {
  const visualScale = depthToScale(enemy.depth);
  const size = enemy.baseHitRadius * 2 * visualScale;
  const hpRatio = enemy.health / enemy.maxHealth;
  const style = TYPE_STYLES[enemy.type];

  // Only render if close enough to be worth showing
  if (visualScale < 0.04) return null;

  // Cull if off-screen (with margin)
  const halfW = (typeof window !== 'undefined' ? window.innerWidth  : 390) / 2;
  const halfH = (typeof window !== 'undefined' ? window.innerHeight : 844) / 2;
  const margin = size / 2 + 20;
  if (
    screenX < -(halfW + margin) || screenX > halfW + margin ||
    screenY < -(halfH + margin) || screenY > halfH + margin
  ) return null;

  // Danger pulse when close
  const isDangerous = enemy.depth < ATTACK_DEPTH * 4;

  return (
    <div
      className="absolute pointer-events-none z-20"
      style={{
        left: '50%',
        top: '50%',
        width: size,
        height: size,
        transform: `translate(calc(-50% + ${screenX}px), calc(-50% + ${screenY}px))`,
      }}
    >
      {/* Outer glow ring — scales with depth */}
      <div
        style={{
          position: 'absolute',
          inset: -size * 0.15,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${style.glow}55 0%, transparent 70%)`,
          opacity: 0.6 + 0.4 * (1 - enemy.depth),
        }}
      />

      {/* Danger pulse ring */}
      {isDangerous && (
        <div
          style={{
            position: 'absolute',
            inset: -size * 0.25,
            borderRadius: '50%',
            border: `2px solid ${style.bg}`,
            animation: 'ping 0.6s cubic-bezier(0,0,0.2,1) infinite',
            opacity: 0.7,
          }}
        />
      )}

      {/* Hit flash */}
      {enemy.isHit && (
        <div
          style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'rgba(255,255,255,0.75)', zIndex: 10,
          }}
        />
      )}

      {/* Body */}
      <div
        style={{
          width: '100%', height: '100%',
          borderRadius: '50%',
          background: `radial-gradient(circle at 35% 35%, ${style.bg}ee, ${style.glow})`,
          border: `${Math.max(1.5, size * 0.04)}px solid ${style.bg}`,
          boxShadow: `0 0 ${size * 0.3}px ${style.glow}99`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: enemy.isHit ? 'scale(1.2)' : 'scale(1)',
          transition: 'transform 0.08s',
          opacity: 0.5 + 0.5 * (1 - enemy.depth),
        }}
      >
        <span style={{ fontSize: size * 0.42, lineHeight: 1 }}>{style.emoji}</span>
      </div>

      {/* HP bar (tank) */}
      {enemy.type === 'tank' && enemy.maxHealth > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: -size * 0.2, left: 0, right: 0,
            height: Math.max(3, size * 0.07),
            background: '#1f2937', borderRadius: 99, overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%', width: `${hpRatio * 100}%`,
              background: '#f87171', transition: 'width 0.15s',
            }}
          />
        </div>
      )}
    </div>
  );
}
