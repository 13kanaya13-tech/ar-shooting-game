'use client';

import { Enemy, DEPTH_MIN_SCALE, DEPTH_CURVE, ATTACK_DEPTH } from '@/types/game';

interface EnemySpriteProps {
  enemy: Enemy;
  screenX: number; // px from center
  screenY: number; // px from center
}

const TYPE_STYLES = {
  basic: { bg: '#22c55e', mid: '#16a34a', dark: '#052e16', emoji: '👾' },
  fast:  { bg: '#facc15', mid: '#ca8a04', dark: '#1c1400', emoji: '⚡' },
  tank:  { bg: '#ef4444', mid: '#991b1b', dark: '#1c0000', emoji: '💀' },
};

function depthToScale(depth: number): number {
  const progress = 1 - depth;
  return DEPTH_MIN_SCALE + (1 - DEPTH_MIN_SCALE) * Math.pow(progress, DEPTH_CURVE);
}

export default function EnemySprite({ enemy, screenX, screenY }: EnemySpriteProps) {
  const visualScale = depthToScale(enemy.depth);
  if (visualScale < 0.03) return null;

  const radius = enemy.maxDisplayRadius * visualScale;
  const size = radius * 2;
  const hpRatio = enemy.health / enemy.maxHealth;
  const style = TYPE_STYLES[enemy.type];

  // Off-screen cull
  const halfW = (typeof window !== 'undefined' ? window.innerWidth  : 390) / 2;
  const halfH = (typeof window !== 'undefined' ? window.innerHeight : 844) / 2;
  if (
    screenX < -(halfW + radius) || screenX > halfW + radius ||
    screenY < -(halfH + radius) || screenY > halfH + radius
  ) return null;

  const isDangerous = enemy.depth < ATTACK_DEPTH * 5;
  // 0..1 how close to attacking
  const dangerRatio = Math.max(0, 1 - enemy.depth / (ATTACK_DEPTH * 5));
  const opacity = 0.45 + 0.55 * (1 - enemy.depth);

  return (
    <div
      className="absolute pointer-events-none z-20"
      style={{
        left: '50%',
        top: '50%',
        width: size,
        height: size,
        transform: `translate(calc(-50% + ${screenX}px), calc(-50% + ${screenY}px))`,
        opacity,
      }}
    >
      {/* Outer ambient glow — grows as enemy gets closer */}
      <div style={{
        position: 'absolute',
        inset: -radius * 0.5,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${style.bg}44 0%, transparent 65%)`,
        filter: `blur(${radius * 0.15}px)`,
      }} />

      {/* Danger pulse rings */}
      {isDangerous && (
        <>
          <div style={{
            position: 'absolute',
            inset: -radius * 0.35,
            borderRadius: '50%',
            border: `${Math.max(2, radius * 0.05)}px solid ${style.bg}`,
            animation: 'danger-ping 0.5s ease-out infinite',
            opacity: dangerRatio * 0.9,
          }} />
          <div style={{
            position: 'absolute',
            inset: -radius * 0.6,
            borderRadius: '50%',
            border: `${Math.max(1.5, radius * 0.03)}px solid ${style.bg}`,
            animation: 'danger-ping 0.5s ease-out 0.25s infinite',
            opacity: dangerRatio * 0.5,
          }} />
        </>
      )}

      {/* Hit flash */}
      {enemy.isHit && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: 'rgba(255,255,255,0.8)', zIndex: 10,
        }} />
      )}

      {/* Body */}
      <div style={{
        width: '100%', height: '100%',
        borderRadius: '50%',
        background: `radial-gradient(circle at 38% 32%, ${style.bg}, ${style.mid} 55%, ${style.dark})`,
        border: `${Math.max(2, radius * 0.04)}px solid ${style.bg}cc`,
        boxShadow: `
          0 0 ${radius * 0.35}px ${style.bg}99,
          0 0 ${radius * 0.7}px ${style.mid}55,
          inset 0 ${radius * 0.1}px ${radius * 0.2}px rgba(255,255,255,0.25)
        `,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: enemy.isHit ? 'scale(1.15)' : 'scale(1)',
        transition: 'transform 0.07s',
      }}>
        <span style={{ fontSize: radius * 0.62, lineHeight: 1, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }}>
          {style.emoji}
        </span>
      </div>

      {/* HP bar (tank) */}
      {enemy.type === 'tank' && enemy.maxHealth > 1 && (
        <div style={{
          position: 'absolute',
          bottom: -radius * 0.22,
          left: '10%', right: '10%',
          height: Math.max(4, radius * 0.07),
          background: '#1f2937cc',
          borderRadius: 99, overflow: 'hidden',
          border: '1px solid #374151',
        }}>
          <div style={{
            height: '100%', width: `${hpRatio * 100}%`,
            background: hpRatio > 0.5 ? '#4ade80' : hpRatio > 0.25 ? '#facc15' : '#f87171',
            transition: 'width 0.12s',
          }} />
        </div>
      )}
    </div>
  );
}
