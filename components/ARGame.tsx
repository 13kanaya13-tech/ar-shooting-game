'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useDeviceOrientation } from '@/hooks/useDeviceOrientation';
import { useCamera } from '@/hooks/useCamera';
import { Enemy, EnemyType, GameState, Calibration, GAME_CONFIG, ENEMY_CONFIGS } from '@/types/game';
import Crosshair from './Crosshair';
import EnemySprite from './EnemySprite';
import HUD from './HUD';
import OffscreenIndicator from './OffscreenIndicator';

let uidCounter = 0;
function uid() { return `e${++uidCounter}`; }

function spawnEnemy(wave: number): Enemy {
  const types: EnemyType[] = wave < 3 ? ['basic'] : wave < 6 ? ['basic', 'fast'] : ['basic', 'fast', 'tank'];
  const weights = wave < 3 ? [1] : wave < 6 ? [0.7, 0.3] : [0.5, 0.3, 0.2];
  const r = Math.random();
  let acc = 0;
  let type: EnemyType = 'basic';
  for (let i = 0; i < types.length; i++) {
    acc += weights[i];
    if (r < acc) { type = types[i]; break; }
  }

  const angle = Math.random() * Math.PI * 2;
  const dist = GAME_CONFIG.maxWorldAngle * (0.6 + Math.random() * 0.4);
  const worldX = Math.cos(angle) * dist;
  const worldY = Math.sin(angle) * dist * 0.6;

  return {
    id: uid(),
    worldX,
    worldY,
    isHit: false,
    hitTimer: 0,
    ...ENEMY_CONFIGS[type],
  };
}

export default function ARGame() {
  const { orientation, permissionState, requestPermission } = useDeviceOrientation();
  const { videoRef, isReady: cameraReady, error: cameraError, startCamera } = useCamera();

  const [gameState, setGameState] = useState<GameState>('title');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [calibration, setCalibration] = useState<Calibration>({ beta: 45, gamma: 0 });
  const [muzzleFlash, setMuzzleFlash] = useState(false);
  const [screenHit, setScreenHit] = useState(false);
  const [killCount, setKillCount] = useState(0);

  const gameStateRef = useRef(gameState);
  const orientationRef = useRef(orientation);
  const calibrationRef = useRef(calibration);
  const enemiesRef = useRef(enemies);
  const livesRef = useRef(lives);
  const waveRef = useRef(wave);
  const killCountRef = useRef(killCount);
  const lastSpawnRef = useRef(0);
  const lastFrameRef = useRef(0);

  gameStateRef.current = gameState;
  orientationRef.current = orientation;
  calibrationRef.current = calibration;
  enemiesRef.current = enemies;
  livesRef.current = lives;
  waveRef.current = wave;
  killCountRef.current = killCount;

  // Enemies per wave
  const enemiesPerWave = useCallback((w: number) => 5 + w * 2, []);
  const maxOnScreen = useCallback((w: number) => Math.min(3 + w, 8), []);

  // Game loop
  const rafRef = useRef<number>(0);
  const gameLoop = useCallback((timestamp: number) => {
    if (gameStateRef.current !== 'playing') return;

    const delta = Math.min((timestamp - (lastFrameRef.current || timestamp)) / 1000, 0.1);
    lastFrameRef.current = timestamp;

    const cal = calibrationRef.current;
    const ori = orientationRef.current;
    const dGamma = ori.gamma - cal.gamma;
    const dBeta = ori.beta - cal.beta;

    setEnemies(prev => {
      let updatedLives = livesRef.current;
      let hitOccurred = false;
      const w = waveRef.current;

      const next = prev
        .map(e => {
          if (e.isHit && e.hitTimer > 0) {
            return { ...e, hitTimer: e.hitTimer - delta };
          }

          // Move enemy toward center of world
          const dist = Math.sqrt(e.worldX ** 2 + e.worldY ** 2);
          if (dist < 0.5) {
            // Enemy reached the player
            updatedLives -= 1;
            hitOccurred = true;
            return null as unknown as Enemy;
          }

          const speed = e.speed * (1 + w * 0.15);
          const nx = e.worldX - (e.worldX / dist) * speed * delta;
          const ny = e.worldY - (e.worldY / dist) * speed * delta;
          return { ...e, worldX: nx, worldY: ny };
        })
        .filter((e): e is Enemy => e !== null && !(e.isHit && e.hitTimer <= 0));

      if (hitOccurred) {
        if (updatedLives <= 0) {
          setGameState('gameover');
        } else {
          livesRef.current = updatedLives;
          setLives(updatedLives);
          setScreenHit(true);
          setTimeout(() => setScreenHit(false), 400);
        }
      }

      // Spawn new enemies
      const maxEnems = enemiesPerWave(w);
      const killed = killCountRef.current;
      const remaining = maxEnems - killed - next.length;

      if (remaining > 0 && next.length < maxOnScreen(w) && timestamp - lastSpawnRef.current > 1500) {
        lastSpawnRef.current = timestamp;
        next.push(spawnEnemy(w));
      }

      // Advance wave when all killed
      if (killed >= maxEnems && next.length === 0) {
        setWave(w2 => {
          waveRef.current = w2 + 1;
          return w2 + 1;
        });
        setKillCount(0);
        killCountRef.current = 0;
        lastSpawnRef.current = timestamp + 2000;
      }

      return next;
    });

    rafRef.current = requestAnimationFrame(gameLoop);
  }, [enemiesPerWave, maxOnScreen]);

  const startGameLoop = useCallback(() => {
    lastFrameRef.current = 0;
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  useEffect(() => {
    if (gameState === 'playing') {
      startGameLoop();
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameState, startGameLoop]);

  // Calibrate
  const calibrate = useCallback(() => {
    setCalibration({ beta: orientationRef.current.beta, gamma: orientationRef.current.gamma });
  }, []);

  // Shoot
  const shoot = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;

    setMuzzleFlash(true);
    setTimeout(() => setMuzzleFlash(false), 120);

    const cal = calibrationRef.current;
    const ori = orientationRef.current;
    const dGamma = ori.gamma - cal.gamma;
    const dBeta = ori.beta - cal.beta;
    const { scaleX, scaleY } = GAME_CONFIG;

    setEnemies(prev => {
      let hit = false;
      let scoreGain = 0;

      const next = prev.map(e => {
        if (hit) return e;
        // Screen position of enemy
        const sx = (e.worldX - dGamma) * scaleX;
        const sy = (e.worldY - dBeta) * scaleY;
        const dist = Math.sqrt(sx ** 2 + sy ** 2);

        if (dist < e.hitRadius + 20) {
          hit = true;
          const newHealth = e.health - 1;
          if (newHealth <= 0) {
            scoreGain = e.type === 'basic' ? 100 : e.type === 'fast' ? 150 : 300;
            setKillCount(k => { killCountRef.current = k + 1; return k + 1; });
            return { ...e, health: 0, isHit: true, hitTimer: 0 }; // instant remove
          }
          return { ...e, health: newHealth, isHit: true, hitTimer: 0.2 };
        }
        return e;
      }).filter(e => e.health > 0);

      if (scoreGain > 0) {
        setScore(s => s + scoreGain);
      }
      return next;
    });
  }, []);

  // ---- Screen coordinate helpers ----
  const getEnemyScreenPos = useCallback((e: Enemy) => {
    const cal = calibrationRef.current;
    const ori = orientationRef.current;
    const dGamma = ori.gamma - cal.gamma;
    const dBeta = ori.beta - cal.beta;
    const { scaleX, scaleY } = GAME_CONFIG;
    const sx = (e.worldX - dGamma) * scaleX;
    const sy = (e.worldY - dBeta) * scaleY;
    return { sx, sy };
  }, []);

  // ---- Title Screen ----
  if (gameState === 'title') {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white select-none">
        <h1 className="text-5xl font-black tracking-wider mb-2 text-yellow-400 drop-shadow-lg">AR SHOOTER</h1>
        <p className="text-gray-400 mb-12 text-sm tracking-widest">GYRO SHOOTING GAME</p>
        <div className="space-y-4 w-64">
          <button
            className="w-full py-4 bg-yellow-400 text-black font-bold text-xl rounded-2xl active:scale-95 transition-transform shadow-lg shadow-yellow-400/30"
            onClick={async () => {
              setGameState('permission');
              await startCamera();
              const granted = await requestPermission();
              if (granted || permissionState === 'not_required') {
                setGameState('calibrating');
              } else {
                setGameState('title');
              }
            }}
          >
            PLAY
          </button>
        </div>
        <div className="mt-16 text-gray-500 text-xs text-center leading-6">
          <p>デバイスを傾けて照準を合わせ</p>
          <p>タップで射撃</p>
        </div>
      </div>
    );
  }

  if (gameState === 'permission') {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white">
        <div className="animate-spin w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full mb-4" />
        <p className="text-gray-400">カメラ・センサーの許可を確認中...</p>
      </div>
    );
  }

  if (gameState === 'calibrating') {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white select-none">
        {cameraReady && (
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover opacity-40"
            playsInline
            muted
            autoPlay
          />
        )}
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 border-4 border-yellow-400 rounded-full flex items-center justify-center mb-6">
            <div className="w-3 h-3 bg-yellow-400 rounded-full" />
          </div>
          <h2 className="text-2xl font-bold mb-2">キャリブレーション</h2>
          <p className="text-gray-300 text-sm mb-8 text-center px-8">
            デバイスを正面に向けて<br />ボタンを押してください
          </p>
          <button
            className="px-10 py-4 bg-yellow-400 text-black font-bold text-xl rounded-2xl active:scale-95 transition-transform"
            onClick={() => {
              calibrate();
              setScore(0);
              setLives(3);
              setWave(1);
              setKillCount(0);
              killCountRef.current = 0;
              setEnemies([]);
              lastSpawnRef.current = 0;
              setGameState('playing');
            }}
          >
            スタート
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'gameover') {
    return (
      <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center text-white select-none">
        <h1 className="text-5xl font-black text-red-500 mb-4">GAME OVER</h1>
        <p className="text-3xl font-bold text-yellow-400 mb-2">SCORE: {score}</p>
        <p className="text-gray-400 mb-12">WAVE {wave}</p>
        <button
          className="px-10 py-4 bg-yellow-400 text-black font-bold text-xl rounded-2xl active:scale-95 transition-transform"
          onClick={() => setGameState('calibrating')}
        >
          RETRY
        </button>
        <button
          className="mt-4 px-10 py-3 border border-gray-600 text-gray-300 font-bold rounded-2xl active:scale-95 transition-transform"
          onClick={() => setGameState('title')}
        >
          タイトルへ
        </button>
      </div>
    );
  }

  // ---- Playing ----
  const cal = calibration;
  const ori = orientation;
  const dGamma = ori.gamma - cal.gamma;
  const dBeta = ori.beta - cal.beta;
  const { scaleX, scaleY } = GAME_CONFIG;

  return (
    <div
      className="fixed inset-0 overflow-hidden select-none"
      onPointerDown={shoot}
    >
      {/* Camera background */}
      {cameraReady ? (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />
      ) : (
        <div className="absolute inset-0 bg-gray-950" />
      )}

      {/* Screen hit flash */}
      {screenHit && (
        <div className="absolute inset-0 bg-red-500/40 z-50 pointer-events-none animate-pulse" />
      )}

      {/* Muzzle flash */}
      {muzzleFlash && (
        <div className="absolute inset-0 bg-white/20 z-40 pointer-events-none" />
      )}

      {/* Enemies */}
      {enemies.map(e => {
        const { sx, sy } = getEnemyScreenPos(e);
        return (
          <EnemySprite
            key={e.id}
            enemy={e}
            screenX={sx}
            screenY={sy}
          />
        );
      })}

      {/* Off-screen indicators */}
      {enemies.map(e => {
        const { sx, sy } = getEnemyScreenPos(e);
        return (
          <OffscreenIndicator key={`ind-${e.id}`} screenX={sx} screenY={sy} type={e.type} />
        );
      })}

      {/* Crosshair */}
      <Crosshair flash={muzzleFlash} />

      {/* HUD */}
      <HUD score={score} lives={lives} wave={wave} />

      {/* Recalibrate button */}
      <button
        className="absolute bottom-6 right-6 px-4 py-2 bg-black/60 text-white text-xs rounded-xl border border-white/20 active:scale-95 transition-transform z-30"
        onPointerDown={e => { e.stopPropagation(); calibrate(); }}
      >
        再校正
      </button>
    </div>
  );
}
