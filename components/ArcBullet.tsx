'use client';

import { useEffect, useRef, useState } from 'react';

interface ArcBulletProps {
  targetX: number;  // px from screen center
  targetY: number;  // px from screen center
  hit: boolean;
  onDone: () => void;
}

const DURATION = 360; // ms

function quad(p0: number, p1: number, p2: number, t: number): number {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * p1 + t * t * p2;
}

export default function ArcBullet({ targetX, targetY, hit, onDone }: ArcBulletProps) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const [t, setT] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  const [viewport, setViewport] = useState({ w: 0, h: 0 });

  // Initialize viewport on mount
  useEffect(() => {
    setViewport({
      w: typeof window !== 'undefined' ? window.innerWidth : 390,
      h: typeof window !== 'undefined' ? window.innerHeight : 844,
    });
  }, []);

  useEffect(() => {
    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const p = Math.min(1, elapsed / DURATION);
      setT(p);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        // fade out a bit before removal
        setTimeout(() => onDoneRef.current(), 120);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, []); // run once

  if (!viewport.w) return null;

  // Screen center
  const cx = viewport.w / 2;
  const cy = viewport.h / 2;

  // Origin: bottom center (just above "player" / phone)
  const originX = cx;
  const originY = viewport.h - 40;

  // End point: enemy screen position
  const endX = cx + targetX;
  const endY = cy + targetY;

  // Arc height: proportional to horizontal distance, min 80, max ~viewport.h * 0.35
  const dx = endX - originX;
  const dy = endY - originY;
  const dist = Math.hypot(dx, dy);
  const arcLift = Math.min(viewport.h * 0.35, 80 + dist * 0.35);

  // Control point: midpoint, lifted upward
  const midX = (originX + endX) / 2;
  const midY = (originY + endY) / 2 - arcLift;

  // Bullet head position (parametric)
  const bx = quad(originX, midX, endX, t);
  const by = quad(originY, midY, endY, t);

  // Build a path up to current t for the trail (sampled)
  const SAMPLES = 16;
  const lastIndex = Math.ceil(t * SAMPLES);
  const points: string[] = [];
  for (let i = 0; i <= lastIndex; i++) {
    const pt = Math.min(1, (i / SAMPLES) * (t > 0 ? 1 : 0));
    const x = quad(originX, midX, endX, pt * (i === lastIndex ? 1 : 1));
    const y = quad(originY, midY, endY, pt * (i === lastIndex ? 1 : 1));
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  // Build trail path from 0..t
  const trailPath = (() => {
    if (t === 0) return '';
    const n = 20;
    let d = '';
    for (let i = 0; i <= n; i++) {
      const pt = (i / n) * t;
      const x = quad(originX, midX, endX, pt);
      const y = quad(originY, midY, endY, pt);
      d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
    }
    return d;
  })();

  const trailOpacity = t < 0.9 ? 1 : Math.max(0, 1 - (t - 0.9) / 0.1);

  return (
    <svg
      width={viewport.w}
      height={viewport.h}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 35 }}
    >
      <defs>
        <radialGradient id="bullet-head" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="40%" stopColor="#fff4b5" stopOpacity="1" />
          <stop offset="100%" stopColor="#ffb400" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bullet-trail" gradientUnits="userSpaceOnUse"
          x1={originX} y1={originY} x2={endX} y2={endY}>
          <stop offset="0%" stopColor="rgba(255,200,0,0)" />
          <stop offset="60%" stopColor="rgba(255,220,80,0.6)" />
          <stop offset="100%" stopColor="rgba(255,255,255,1)" />
        </linearGradient>
      </defs>

      {/* Trail path */}
      {trailPath && (
        <>
          <path d={trailPath}
            stroke="rgba(255,220,80,0.5)"
            strokeWidth={6}
            fill="none"
            strokeLinecap="round"
            opacity={trailOpacity * 0.6}
            style={{ filter: 'blur(3px)' }}
          />
          <path d={trailPath}
            stroke="url(#bullet-trail)"
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            opacity={trailOpacity}
          />
        </>
      )}

      {/* Bullet head glow */}
      {t < 1 && (
        <>
          <circle cx={bx} cy={by} r={14} fill="url(#bullet-head)" opacity={0.6} />
          <circle cx={bx} cy={by} r={5} fill="#ffffff" />
          <circle cx={bx} cy={by} r={3} fill="#fff4b5" />
        </>
      )}

      {/* Impact ring on hit when bullet reaches target */}
      {t >= 0.95 && hit && (
        <circle
          cx={endX} cy={endY}
          r={10 + (t - 0.95) * 200}
          fill="none"
          stroke="rgba(255,255,255,0.8)"
          strokeWidth={3}
          opacity={Math.max(0, 1 - (t - 0.95) * 20)}
        />
      )}
    </svg>
  );
}
