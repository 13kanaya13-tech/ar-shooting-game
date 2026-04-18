'use client';

import { useEffect, useRef, useState } from 'react';
import { EnemyType } from '@/types/game';

interface HitEffectProps {
  x: number;
  y: number;
  type: EnemyType;
  score: number;
  onDone: () => void;
}

const TYPE_COLOR: Record<EnemyType, string> = {
  basic:  '#22c55e',
  fast:   '#facc15',
  tank:   '#ef4444',
  shield: '#60a5fa',
};

const PARTICLES = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2;
  return { dx: Math.cos(a), dy: Math.sin(a) };
});

export default function HitEffect({ x, y, type, score, onDone }: HitEffectProps) {
  const [phase, setPhase] = useState<'burst' | 'fade'>('burst');
  // Capture onDone in a ref so the effect doesn't restart on every re-render
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('fade'), 160);
    const t2 = setTimeout(() => onDoneRef.current(), 600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []); // intentionally empty — run once on mount

  const isFade = phase === 'fade';
  const color = TYPE_COLOR[type];
  const particleDist = type === 'tank' ? 90 : type === 'fast' ? 65 : 75;

  return (
    <div
      className="absolute pointer-events-none"
      style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)`, zIndex: 40 }}
    >
      {/* Core flash */}
      <div style={{
        position: 'absolute',
        width: 60, height: 60, left: -30, top: -30,
        borderRadius: '50%',
        background: `radial-gradient(circle, white 20%, ${color}cc 60%, transparent 100%)`,
        transform: isFade ? 'scale(2.5)' : 'scale(0.4)',
        opacity: isFade ? 0 : 1,
        transition: 'transform 0.18s ease-out, opacity 0.18s ease-out',
      }} />

      {/* Shock ring 1 */}
      <div style={{
        position: 'absolute',
        width: 80, height: 80, left: -40, top: -40,
        borderRadius: '50%',
        border: `4px solid ${color}`,
        transform: isFade ? 'scale(3.2)' : 'scale(0.3)',
        opacity: isFade ? 0 : 0.9,
        transition: 'transform 0.32s ease-out, opacity 0.32s ease-out',
      }} />

      {/* Shock ring 2 */}
      <div style={{
        position: 'absolute',
        width: 80, height: 80, left: -40, top: -40,
        borderRadius: '50%',
        border: `2px solid ${color}88`,
        transform: isFade ? 'scale(5)' : 'scale(0.3)',
        opacity: isFade ? 0 : 0.6,
        transition: 'transform 0.45s ease-out, opacity 0.45s ease-out',
      }} />

      {/* Particles */}
      {PARTICLES.map((p, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: 7, height: 7, left: -3.5, top: -3.5,
          borderRadius: '50%',
          background: i % 2 === 0 ? color : 'white',
          boxShadow: `0 0 6px ${color}`,
          transform: isFade
            ? `translate(${p.dx * particleDist}px, ${p.dy * particleDist}px) scale(0.2)`
            : 'translate(0,0) scale(1)',
          opacity: isFade ? 0 : 1,
          transition: `transform ${0.26 + i * 0.02}s ease-out, opacity 0.35s ease-out`,
        }} />
      ))}

      {/* Score popup */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: -20,
        transform: isFade ? 'translate(-50%, -55px)' : 'translate(-50%, 0)',
        opacity: isFade ? 0 : 1,
        transition: 'transform 0.5s ease-out, opacity 0.5s ease-out',
        color: 'white',
        fontWeight: 900,
        fontSize: type === 'tank' ? 22 : 18,
        letterSpacing: 1,
        textShadow: `0 0 8px ${color}, 0 0 16px ${color}88`,
        whiteSpace: 'nowrap',
      }}>
        +{score}
      </div>
    </div>
  );
}
