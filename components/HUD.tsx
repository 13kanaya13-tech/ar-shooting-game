'use client';

interface HUDProps {
  score: number;
  lives: number;
  wave: number;
}

export default function HUD({ score, lives, wave }: HUDProps) {
  return (
    <>
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between px-4 pt-safe-top z-30 pointer-events-none">
        {/* Score */}
        <div className="bg-black/50 backdrop-blur-sm rounded-b-xl px-4 py-2 min-w-[100px]">
          <p className="text-white/50 text-[10px] tracking-widest uppercase">Score</p>
          <p className="text-white font-black text-xl tabular-nums">{score.toLocaleString()}</p>
        </div>

        {/* Wave */}
        <div className="bg-black/50 backdrop-blur-sm rounded-b-xl px-4 py-2 text-center">
          <p className="text-white/50 text-[10px] tracking-widest uppercase">Wave</p>
          <p className="text-yellow-400 font-black text-xl">{wave}</p>
        </div>

        {/* Lives */}
        <div className="bg-black/50 backdrop-blur-sm rounded-b-xl px-4 py-2 text-right">
          <p className="text-white/50 text-[10px] tracking-widest uppercase">Lives</p>
          <div className="flex gap-1 justify-end mt-0.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} className={`text-lg ${i < lives ? 'opacity-100' : 'opacity-20'}`}>
                ❤️
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
