'use client';

import { useEffect, useState } from 'react';
import { EnemyType } from '@/types/game';

interface HitEffectProps {
  x: number;       // px from screen center
  y: number;
  type: EnemyType;
  score: number;
  onDone: () => void;
}

const TYPE_COLOR: Record<EnemyType, string> = {
  basic: '#22c55e',
  fast: '#facc15',
  tank: '#ef4444',
};

// 8 particle directions
const PARTICLES = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2;
  return { dx: Math.cos(a), dy: Math.sin(a) };
});

export default function HitEffect({ x, y, type, score, onDone }: HitEffectProps) {
  const [phase, setPhase] = useState<'burst' | 'fade'>('burst');
  const color = TYPE_COLOR[type];
  const particleDist = type === 'tank' ? 90 : type === 'fast' ? 65 : 75;

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('fade'), 180);
    const t2 = setTimeout(() => onDone(), 700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  const isFade = phase === 'fade';

  return (
    <div
      className="absolute pointer-events-none z-40"
      style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}
    >
      {/* Core flash */}
      <div style={{
        position: 'absolute',
        width: 60, height: 60,
        left: -30, top: -30,
        borderRadius: '50%',
        background: `radial-gradient(circle, white 20%, ${color}cc 60%, transparent 100%)`,
        transform: isFade ? 'scale(2.5)' : 'scale(0.4)',
        opacity: isFade ? 0 : 1,
        transition: 'transform 0.18s ease-out, opacity 0.18s ease-out',
      }} />

      {/* Expanding shock ring 1 */}
      <div style={{
        position: 'absolute',
        width: 80, height: 80,
        left: -40, top: -40,
        borderRadius: '50%',
        border: `4px solid ${color}`,
        transform: isFade ? 'scale(3.2)' : 'scale(0.3)',
        opacity: isFade ? 0 : 0.9,
        transition: 'transform 0.35s ease-out, opacity 0.35s ease-out',
      }} />

      {/* Expanding shock ring 2 (delayed) */}
      <div style={{
        position: 'absolute',
        width: 80, height: 80,
        left: -40, top: -40,
        borderRadius: '50%',
        border: `2px solid ${color}88`,
        transform: isFade ? 'scale(5)' : 'scale(0.3)',
        opacity: isFade ? 0 : 0.6,
        transition: 'transform 0.5s ease-out, opacity 0.5s ease-out',
      }} />

      {/* Particles */}
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: 7, height: 7,
            left: -3.5, top: -3.5,
            borderRadius: '50%',
            background: i % 2 === 0 ? color : 'white',
            boxShadow: `0 0 6px ${color}`,
            transform: isFade
              ? `translate(${p.dx * particleDist}px, ${p.dy * particleDist}px) scale(0.2)`
              : `translate(0, 0) scale(1)`,
            opacity: isFade ? 0 : 1,
            transition: `transform ${0.28 + i * 0.02}s ease-out, opacity 0.4s ease-out`,
          }}
        />
      ))}

      {/* Score popup */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: -20,
        transform: isFade ? 'translate(-50%, -55px)' : 'translate(-50%, 0)',
        opacity: isFade ? 0 : 1,
        transition: 'transform 0.55s ease-out, opacity 0.55s ease-out',
        color: 'white',
        fontWeight: 900,
        fontSize: type === 'tank' ? 22 : 18,
        letterSpacing: 1,
        textShadow: `0 0 8px ${color}, 0 0 16px ${color}88`,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}>
        +{score}
      </div>
    </div>
  );
}
