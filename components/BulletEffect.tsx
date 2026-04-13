'use client';

import { useEffect, useState } from 'react';

interface BulletEffectProps {
  angle: number;   // radians
  length: number;  // px
  onDone: () => void;
}

export default function BulletEffect({ angle, length, onDone }: BulletEffectProps) {
  const [phase, setPhase] = useState<'shoot' | 'fade'>('shoot');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('fade'), 100);
    const t2 = setTimeout(() => onDone(), 280);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  const deg = (angle * 180) / Math.PI;

  return (
    <div
      className="absolute pointer-events-none z-35"
      style={{ left: '50%', top: '50%' }}
    >
      {/* Bullet trail — rotated div growing from center */}
      <div style={{
        position: 'absolute',
        left: 0, top: '-2px',
        width: length,
        height: 4,
        transformOrigin: 'left center',
        transform: `rotate(${deg}deg)`,
        background: 'linear-gradient(to right, rgba(255,255,255,1) 0%, rgba(255,230,80,0.9) 30%, rgba(255,180,0,0.5) 70%, transparent 100%)',
        boxShadow: '0 0 6px 2px rgba(255,220,60,0.7)',
        borderRadius: '0 2px 2px 0',
        opacity: phase === 'shoot' ? 1 : 0,
        transition: phase === 'fade' ? 'opacity 0.18s ease-out' : 'none',
        animation: phase === 'shoot' ? 'bullet-grow 0.09s ease-out forwards' : 'none',
      }} />

      {/* Muzzle flash at origin */}
      <div style={{
        position: 'absolute',
        left: -8, top: -8,
        width: 16, height: 16,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,255,180,1), rgba(255,200,0,0.6), transparent)',
        opacity: phase === 'shoot' ? 1 : 0,
        transition: phase === 'fade' ? 'opacity 0.1s' : 'none',
      }} />
    </div>
  );
}
