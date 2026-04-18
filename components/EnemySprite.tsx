'use client';

import { Enemy, DEPTH_MIN_SCALE, DEPTH_CURVE, ATTACK_DEPTH, EnemyType } from '@/types/game';

interface EnemySpriteProps {
  enemy: Enemy;
  screenX: number; // px from center
  screenY: number; // px from center
  faceImage: string | null;
}

const TYPE_STYLES: Record<EnemyType, { bg: string; mid: string; dark: string; emoji: string }> = {
  basic:  { bg: '#22c55e', mid: '#16a34a', dark: '#052e16', emoji: '👾' },
  fast:   { bg: '#facc15', mid: '#ca8a04', dark: '#1c1400', emoji: '⚡' },
  tank:   { bg: '#ef4444', mid: '#991b1b', dark: '#1c0000', emoji: '💀' },
  shield: { bg: '#60a5fa', mid: '#1d4ed8', dark: '#0b1e3f', emoji: '🛡' },
};

function depthToScale(depth: number): number {
  const progress = 1 - depth;
  return DEPTH_MIN_SCALE + (1 - DEPTH_MIN_SCALE) * Math.pow(progress, DEPTH_CURVE);
}

export default function EnemySprite({ enemy, screenX, screenY, faceImage }: EnemySpriteProps) {
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
  const dangerRatio = Math.max(0, 1 - enemy.depth / (ATTACK_DEPTH * 5));
  const opacity = 0.45 + 0.55 * (1 - enemy.depth);

  const helmetBorder = Math.max(2, radius * 0.04);
  const showFace = !!faceImage;

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
      {/* Outer ambient glow */}
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

      {/* Body (face or colored orb) */}
      <div style={{
        width: '100%', height: '100%',
        borderRadius: '50%',
        background: showFace
          ? '#1a1a1a'
          : `radial-gradient(circle at 38% 32%, ${style.bg}, ${style.mid} 55%, ${style.dark})`,
        border: `${Math.max(2, radius * 0.04)}px solid ${style.bg}cc`,
        boxShadow: `
          0 0 ${radius * 0.35}px ${style.bg}99,
          0 0 ${radius * 0.7}px ${style.mid}55,
          inset 0 ${radius * 0.1}px ${radius * 0.2}px rgba(255,255,255,0.15)
        `,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: enemy.isHit ? 'scale(1.15)' : 'scale(1)',
        transition: 'transform 0.07s',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {showFace ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={faceImage!}
              alt=""
              draggable={false}
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                filter: `saturate(0.9) contrast(1.05)`,
              }}
            />
            {/* Slight type-color tint overlay so basic/fast/tank/shield still look different */}
            <div style={{
              position: 'absolute', inset: 0,
              background: `radial-gradient(circle at 50% 120%, ${style.bg}55, transparent 60%)`,
              mixBlendMode: 'overlay',
            }} />
            {/* Face shadow under helmet rim */}
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: '52%',
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0.15) 70%, transparent)',
              pointerEvents: 'none',
            }} />
          </>
        ) : (
          <span style={{ fontSize: radius * 0.62, lineHeight: 1, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }}>
            {style.emoji}
          </span>
        )}

        {/* Helmet dome (upper half) */}
        {showFace && (
          <>
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: '52%',
              background: `linear-gradient(to bottom,
                ${style.mid} 0%,
                ${style.dark} 60%,
                ${style.dark}ee 100%)`,
              borderTopLeftRadius: '9999px',
              borderTopRightRadius: '9999px',
              borderBottom: `${Math.max(2, radius * 0.05)}px solid ${style.bg}`,
              boxShadow: `
                inset 0 ${radius * 0.15}px ${radius * 0.25}px rgba(255,255,255,0.25),
                inset 0 -${radius * 0.05}px ${radius * 0.08}px rgba(0,0,0,0.6)
              `,
            }} />
            {/* Helmet visor highlight */}
            <div style={{
              position: 'absolute',
              top: `${radius * 0.12}px`,
              left: `${radius * 0.35}px`,
              width: `${radius * 0.5}px`,
              height: `${radius * 0.18}px`,
              borderRadius: '9999px',
              background: 'rgba(255,255,255,0.35)',
              filter: 'blur(1px)',
              transform: 'rotate(-12deg)',
            }} />
            {/* Chin strap */}
            <div style={{
              position: 'absolute',
              bottom: `${radius * 0.2}px`,
              left: '8%', right: '8%',
              height: `${Math.max(2, radius * 0.05)}px`,
              background: `${style.dark}`,
              borderRadius: 99,
              opacity: 0.7,
            }} />
          </>
        )}
      </div>

      {/* Helmet outline ring (when using faces) */}
      {showFace && (
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: `${helmetBorder}px solid ${style.bg}`,
          boxShadow: `0 0 ${radius * 0.3}px ${style.bg}88`,
          pointerEvents: 'none',
        }} />
      )}

      {/* Shield barrier (when shielded) */}
      {enemy.isShielded && (
        <>
          <div style={{
            position: 'absolute',
            inset: -radius * 0.18,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(96,165,250,0.25) 40%, rgba(96,165,250,0.6) 75%, rgba(96,165,250,0) 100%)',
            border: `${Math.max(2, radius * 0.06)}px solid rgba(147,197,253,0.9)`,
            boxShadow: '0 0 24px rgba(96,165,250,0.9), inset 0 0 18px rgba(191,219,254,0.7)',
            animation: 'danger-ping 1.3s ease-in-out infinite',
            zIndex: 15,
          }} />
          <div style={{
            position: 'absolute',
            inset: -radius * 0.05,
            borderRadius: '50%',
            border: `1px solid rgba(219,234,254,0.9)`,
            zIndex: 15,
          }} />
        </>
      )}

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
