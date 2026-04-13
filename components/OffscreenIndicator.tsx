'use client';

import { useEffect, useState } from 'react';
import { EnemyType } from '@/types/game';

interface OffscreenIndicatorProps {
  screenX: number;
  screenY: number;
  type: EnemyType;
}

const TYPE_COLORS: Record<EnemyType, string> = {
  basic: '#22c55e',
  fast: '#facc15',
  tank: '#ef4444',
};

const MARGIN = 24; // px from screen edge

export default function OffscreenIndicator({ screenX, screenY, type }: OffscreenIndicatorProps) {
  const [dims, setDims] = useState({ w: 390, h: 844 });

  useEffect(() => {
    const update = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const halfW = dims.w / 2;
  const halfH = dims.h / 2;

  // Only show when off-screen
  const isOffScreen =
    Math.abs(screenX) > halfW - 60 || Math.abs(screenY) > halfH - 60;

  if (!isOffScreen) return null;

  // Clamp position to screen edges
  const angle = Math.atan2(screenY, screenX);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  let x: number, y: number;
  if (Math.abs(cos) * halfH > Math.abs(sin) * halfW) {
    // Hit left/right edge
    x = Math.sign(cos) * (halfW - MARGIN);
    y = Math.tan(angle) * Math.sign(cos) * (halfW - MARGIN);
  } else {
    // Hit top/bottom edge
    y = Math.sign(sin) * (halfH - MARGIN);
    x = (1 / Math.tan(angle)) * Math.sign(sin) * (halfH - MARGIN);
  }

  const arrowAngle = (angle * 180) / Math.PI;
  const color = TYPE_COLORS[type];

  return (
    <div
      className="absolute pointer-events-none z-30"
      style={{
        left: '50%',
        top: '50%',
        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
      }}
    >
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderBottom: `16px solid ${color}`,
          transform: `rotate(${arrowAngle + 90}deg)`,
          filter: `drop-shadow(0 0 4px ${color})`,
        }}
      />
    </div>
  );
}
