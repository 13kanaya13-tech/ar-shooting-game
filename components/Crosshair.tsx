'use client';

interface CrosshairProps {
  flash: boolean;
}

export default function Crosshair({ flash }: CrosshairProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
      <div className={`relative transition-transform duration-75 ${flash ? 'scale-90' : 'scale-100'}`}>
        {/* Outer ring */}
        <div
          className={`w-20 h-20 rounded-full border-2 flex items-center justify-center transition-colors duration-75 ${
            flash ? 'border-yellow-300' : 'border-white/80'
          }`}
        >
          {/* Inner dot */}
          <div className={`w-2 h-2 rounded-full transition-colors duration-75 ${flash ? 'bg-yellow-300' : 'bg-white'}`} />
        </div>

        {/* Cross lines */}
        {/* Top */}
        <div className={`absolute left-1/2 -translate-x-1/2 -top-6 w-0.5 h-4 transition-colors duration-75 ${flash ? 'bg-yellow-300' : 'bg-white/80'}`} />
        {/* Bottom */}
        <div className={`absolute left-1/2 -translate-x-1/2 -bottom-6 w-0.5 h-4 transition-colors duration-75 ${flash ? 'bg-yellow-300' : 'bg-white/80'}`} />
        {/* Left */}
        <div className={`absolute top-1/2 -translate-y-1/2 -left-6 h-0.5 w-4 transition-colors duration-75 ${flash ? 'bg-yellow-300' : 'bg-white/80'}`} />
        {/* Right */}
        <div className={`absolute top-1/2 -translate-y-1/2 -right-6 h-0.5 w-4 transition-colors duration-75 ${flash ? 'bg-yellow-300' : 'bg-white/80'}`} />
      </div>
    </div>
  );
}
