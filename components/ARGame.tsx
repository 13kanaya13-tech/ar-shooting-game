'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useDeviceOrientation } from '@/hooks/useDeviceOrientation';
import { useCamera } from '@/hooks/useCamera';
import { Enemy, EnemyType, GameState, Calibration, GAME_CONFIG, ENEMY_CONFIGS, ATTACK_DEPTH, DEPTH_MIN_SCALE, DEPTH_CURVE, BulletEffect, HitEffect } from '@/types/game';
import Crosshair from './Crosshair';
import EnemySprite from './EnemySprite';
import HUD from './HUD';
import OffscreenIndicator from './OffscreenIndicator';
import BulletEffectComponent from './BulletEffect';
import HitEffectComponent from './HitEffect';

let uidCounter = 0;
function uid() { return `e${++uidCounter}`; }

function spawnEnemy(wave: number): Enemy {
  // Enemy type distribution
  const types: EnemyType[] = wave < 3 ? ['basic'] : wave < 6 ? ['basic', 'fast'] : ['basic', 'fast', 'tank'];
  const weights = wave < 3 ? [1] : wave < 6 ? [0.7, 0.3] : [0.5, 0.3, 0.2];
  const r = Math.random();
  let acc = 0;
  let type: EnemyType = 'basic';
  for (let i = 0; i < types.length; i++) {
    acc += weights[i];
    if (r < acc) { type = types[i]; break; }
  }

  // Wave 1: spawn near center at shallow depth so players can learn the mechanic.
  // Later waves: wider angles, deeper (farther) starting position.
  const maxAngle = wave === 1 ? 6 : wave <= 3 ? 12 : Math.min(8 + wave * 3, 28);
  const startDepth = wave === 1 ? 0.45 : wave <= 3 ? 0.65 : Math.min(0.55 + wave * 0.05, 0.92);

  const angle = Math.random() * Math.PI * 2;
  // Minimum angular distance so enemies don't spawn exactly at center
  const minAngle = wave === 1 ? 1 : 3;
  const dist = minAngle + Math.random() * (maxAngle - minAngle);

  return {
    id: uid(),
    worldX: Math.cos(angle) * dist,
    worldY: Math.sin(angle) * dist * 0.55, // slightly compressed vertically
    depth: startDepth,
    isHit: false,
    hitTimer: 0,
    ...ENEMY_CONFIGS[type],
  };
}

// ---- Tutorial steps ----
const TUTORIAL_STEPS = [
  {
    icon: '📱',
    title: 'デバイスを傾けて照準を動かす',
    body: '中央の丸が照準です。\nスマホを右に傾けると照準が右へ、\n左に傾けると左へ動きます。',
    hint: '今すぐ傾けて動きを確認してみよう！',
  },
  {
    icon: '👾',
    title: '敵に照準を合わせてタップ',
    body: '敵は遠くに小さく現れ、\nだんだん近づいて大きくなります。\n画面をタップすると射撃します。',
    hint: '近づく前に倒してライフを守ろう！',
  },
  {
    icon: '⚠️',
    title: '敵が来る方向を矢印で確認',
    body: '敵が画面外にいるときは\n端に矢印が表示されます。\nデバイスを向けて確認しましょう。',
    hint: '準備ができたらスタート！',
  },
];

function Tutorial({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState(0);
  const current = TUTORIAL_STEPS[step];
  const isLast = step === TUTORIAL_STEPS.length - 1;

  return (
    <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center text-white z-50 px-6">
      {/* Skip button */}
      <button
        className="absolute top-12 right-6 text-gray-400 text-sm border border-gray-600 px-3 py-1 rounded-lg active:opacity-60"
        onClick={onFinish}
      >
        スキップ
      </button>

      {/* Step indicator */}
      <div className="flex gap-2 mb-8">
        {TUTORIAL_STEPS.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-yellow-400' : 'bg-gray-600'}`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="text-6xl mb-6">{current.icon}</div>
      <h2 className="text-xl font-black text-yellow-400 text-center mb-4">{current.title}</h2>
      <p className="text-gray-200 text-sm text-center leading-7 whitespace-pre-line mb-6">
        {current.body}
      </p>
      <p className="text-yellow-400/70 text-xs text-center mb-10">{current.hint}</p>

      {/* Next / Start */}
      <button
        className="w-56 py-4 bg-yellow-400 text-black font-bold text-lg rounded-2xl active:scale-95 transition-transform shadow-lg shadow-yellow-400/30"
        onClick={() => {
          if (isLast) onFinish();
          else setStep(s => s + 1);
        }}
      >
        {isLast ? 'ゲームスタート！' : '次へ →'}
      </button>
    </div>
  );
}

export default function ARGame() {
  const { orientation, requestPermission } = useDeviceOrientation();
  const { videoRef, isReady: cameraReady, startCamera } = useCamera();

  const [gameState, setGameState] = useState<GameState>('title');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [calibration, setCalibration] = useState<Calibration>({ beta: 45, gamma: 0 });
  const [muzzleFlash, setMuzzleFlash] = useState(false);
  const [screenHit, setScreenHit] = useState(false);
  const [killCount, setKillCount] = useState(0);
  const [bulletEffects, setBulletEffects] = useState<BulletEffect[]>([]);
  const [hitEffects, setHitEffects] = useState<HitEffect[]>([]);

  const gameStateRef = useRef(gameState);
  const orientationRef = useRef(orientation);
  const calibrationRef = useRef(calibration);
  const livesRef = useRef(lives);
  const waveRef = useRef(wave);
  const killCountRef = useRef(killCount);
  const enemiesRef = useRef(enemies);
  const lastSpawnRef = useRef(0);
  const lastFrameRef = useRef(0);
  const rafRef = useRef<number>(0);
  const cameraStartedRef = useRef(false);

  // Low-pass filtered orientation — smooths out hand tremor.
  // alpha: 0=no movement, 1=no filter. 0.10 gives ~100ms smoothing at 60fps.
  const SMOOTH_ALPHA = 0.10;
  const smoothedOrientationRef = useRef({ beta: 45, gamma: 0 });

  gameStateRef.current = gameState;
  orientationRef.current = orientation;
  calibrationRef.current = calibration;

  // Update smoothed orientation every render (driven by raw orientation state changes)
  smoothedOrientationRef.current = {
    beta:  smoothedOrientationRef.current.beta  * (1 - SMOOTH_ALPHA) + orientation.beta  * SMOOTH_ALPHA,
    gamma: smoothedOrientationRef.current.gamma * (1 - SMOOTH_ALPHA) + orientation.gamma * SMOOTH_ALPHA,
  };
  livesRef.current = lives;
  waveRef.current = wave;
  killCountRef.current = killCount;
  enemiesRef.current = enemies;

  const enemiesPerWave = useCallback((w: number) => 5 + w * 2, []);
  const maxOnScreen = useCallback((w: number) => Math.min(3 + w, 8), []);

  // Start camera once when entering calibrating (video element is always mounted)
  useEffect(() => {
    if (gameState === 'calibrating' && !cameraStartedRef.current) {
      cameraStartedRef.current = true;
      startCamera();
    }
  }, [gameState, startCamera]);

  // Game loop
  const gameLoop = useCallback((timestamp: number) => {
    if (gameStateRef.current !== 'playing') return;

    const delta = Math.min((timestamp - (lastFrameRef.current || timestamp)) / 1000, 0.1);
    lastFrameRef.current = timestamp;

    setEnemies(prev => {
      let updatedLives = livesRef.current;
      let hitOccurred = false;
      const w = waveRef.current;

      const next = prev
        .map(e => {
          if (e.isHit && e.hitTimer > 0) return { ...e, hitTimer: e.hitTimer - delta };

          // Enemy reached the player → attack
          if (e.depth <= ATTACK_DEPTH) {
            updatedLives -= 1;
            hitOccurred = true;
            return null as unknown as Enemy;
          }

          // Approach: decrease depth each frame.
          // Wave scaling: each wave adds 12% speed. Wave 1 gets a 0.5× slowdown for tutorial feel.
          const waveMultiplier = w === 1 ? 0.5 : 1 + (w - 1) * 0.12;
          const newDepth = e.depth - e.depthSpeed * waveMultiplier * delta;

          return { ...e, depth: newDepth };
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

      const killed = killCountRef.current;
      const remaining = enemiesPerWave(w) - killed - next.length;

      if (remaining > 0 && next.length < maxOnScreen(w) && timestamp - lastSpawnRef.current > 1500) {
        lastSpawnRef.current = timestamp;
        next.push(spawnEnemy(w));
      }

      if (killed >= enemiesPerWave(w) && next.length === 0) {
        setWave(w2 => { waveRef.current = w2 + 1; return w2 + 1; });
        setKillCount(0);
        killCountRef.current = 0;
        lastSpawnRef.current = timestamp + 2000;
      }

      return next;
    });

    rafRef.current = requestAnimationFrame(gameLoop);
  }, [enemiesPerWave, maxOnScreen]);

  useEffect(() => {
    if (gameState === 'playing') {
      lastFrameRef.current = 0;
      rafRef.current = requestAnimationFrame(gameLoop);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameState, gameLoop]);

  const calibrate = useCallback(() => {
    setCalibration({ beta: smoothedOrientationRef.current.beta, gamma: smoothedOrientationRef.current.gamma });
  }, []);

  const shoot = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;

    setMuzzleFlash(true);
    setTimeout(() => setMuzzleFlash(false), 100);

    const { scaleX, scaleY } = GAME_CONFIG;
    const cal = calibrationRef.current;
    const ori = smoothedOrientationRef.current;
    const dGamma = ori.gamma - cal.gamma;
    const dBeta = ori.beta - cal.beta;

    // Determine where bullet goes before mutating enemies
    let hitScreenX = 0;
    let hitScreenY = 0;
    let hitType: EnemyType | null = null;
    let hitScore = 0;
    const enemies = enemiesRef.current;

    for (const e of enemies) {
      const sx = (e.worldX + dGamma) * scaleX;
      const sy = (e.worldY + dBeta) * scaleY;
      const depthProgress = 1 - e.depth;
      const visualScale = DEPTH_MIN_SCALE + (1 - DEPTH_MIN_SCALE) * Math.pow(depthProgress, DEPTH_CURVE);
      const scaledRadius = e.maxDisplayRadius * visualScale;
      if (Math.sqrt(sx ** 2 + sy ** 2) < scaledRadius) {
        hitScreenX = sx;
        hitScreenY = sy;
        hitType = e.type;
        hitScore = e.type === 'basic' ? 100 : e.type === 'fast' ? 150 : 300;
        break;
      }
    }

    // Bullet travels toward hit point (or straight ahead on miss)
    const bulletAngle = hitType ? Math.atan2(hitScreenY, hitScreenX) : 0;
    const bulletLen = hitType
      ? Math.sqrt(hitScreenX ** 2 + hitScreenY ** 2)
      : Math.max(window.innerWidth, window.innerHeight) * 0.5;

    const bulletId = uid();
    setBulletEffects(prev => [...prev, { id: bulletId, angle: bulletAngle, length: bulletLen }]);

    // After bullet arrives, spawn hit effect if applicable
    if (hitType) {
      setTimeout(() => {
        const effectId = uid();
        setHitEffects(prev => [...prev, { id: effectId, x: hitScreenX, y: hitScreenY, type: hitType!, score: hitScore }]);
      }, 100);
    }

    setEnemies(prev => {
      let hit = false;
      let scoreGain = 0;

      const next = prev.map(e => {
        if (hit) return e;
        const sx = (e.worldX + dGamma) * scaleX;
        const sy = (e.worldY + dBeta) * scaleY;
        const depthProgress = 1 - e.depth;
        const scaledRadius = e.baseHitRadius * (0.06 + 0.94 * Math.pow(depthProgress, 1.4));
        if (Math.sqrt(sx ** 2 + sy ** 2) < scaledRadius + 15) {
          hit = true;
          const newHealth = e.health - 1;
          if (newHealth <= 0) {
            scoreGain = hitScore;
            setKillCount(k => { killCountRef.current = k + 1; return k + 1; });
            return { ...e, health: 0, isHit: true, hitTimer: 0 };
          }
          return { ...e, health: newHealth, isHit: true, hitTimer: 0.2 };
        }
        return e;
      }).filter(e => e.health > 0);

      if (scoreGain > 0) setScore(s => s + scoreGain);
      return next;
    });
  }, []);

  const getEnemyScreenPos = useCallback((e: Enemy) => {
    const { scaleX, scaleY } = GAME_CONFIG;
    const cal = calibrationRef.current;
    const ori = smoothedOrientationRef.current;
    const dGamma = ori.gamma - cal.gamma;
    const dBeta  = ori.beta  - cal.beta;
    return {
      sx: (e.worldX + dGamma) * scaleX,
      sy: (e.worldY + dBeta)  * scaleY,
    };
  }, []);

  const isPlaying = gameState === 'playing';
  const isCalibrating = gameState === 'calibrating';
  const showCamera = (isCalibrating || isPlaying) && cameraReady;

  return (
    <div className="fixed inset-0 overflow-hidden select-none bg-black">
      {/* Camera — always mounted so videoRef is always populated */}
      <video
        ref={videoRef}
        className={`absolute inset-0 w-full h-full object-cover ${showCamera ? (isCalibrating ? 'opacity-40' : 'opacity-100') : 'hidden'}`}
        playsInline
        muted
        autoPlay
      />

      {/* ======== TITLE ======== */}
      {gameState === 'title' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          <h1 className="text-5xl font-black tracking-wider mb-2 text-yellow-400 drop-shadow-lg">AR SHOOTER</h1>
          <p className="text-gray-400 mb-12 text-sm tracking-widest">GYRO SHOOTING GAME</p>
          <div className="space-y-4 w-64">
            <button
              className="w-full py-4 bg-yellow-400 text-black font-bold text-xl rounded-2xl active:scale-95 transition-transform shadow-lg shadow-yellow-400/30"
              onClick={async () => {
                setGameState('permission');
                // iOS requires requestPermission() called synchronously in user-gesture context
                // so we call it BEFORE any other await
                await requestPermission();
                setGameState('calibrating');
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
      )}

      {/* ======== PERMISSION LOADING ======== */}
      {gameState === 'permission' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          <div className="animate-spin w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full mb-4" />
          <p className="text-gray-400">許可を確認中...</p>
        </div>
      )}

      {/* ======== CALIBRATING ======== */}
      {gameState === 'calibrating' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
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
                setGameState('tutorial');
              }}
            >
              スタート
            </button>
          </div>
        </div>
      )}

      {/* ======== TUTORIAL ======== */}
      {gameState === 'tutorial' && (
        <Tutorial onFinish={() => setGameState('playing')} />
      )}

      {/* ======== GAME OVER ======== */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-white">
          <h1 className="text-5xl font-black text-red-500 mb-4">GAME OVER</h1>
          <p className="text-3xl font-bold text-yellow-400 mb-2">SCORE: {score.toLocaleString()}</p>
          <p className="text-gray-400 mb-12">WAVE {wave}</p>
          <button
            className="px-10 py-4 bg-yellow-400 text-black font-bold text-xl rounded-2xl active:scale-95 transition-transform"
            onClick={() => {
              cameraStartedRef.current = false; // allow re-calibration without re-starting camera
              setGameState('calibrating');
            }}
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
      )}

      {/* ======== PLAYING ======== */}
      {gameState === 'playing' && (
        <div
          className="absolute inset-0"
          onPointerDown={shoot}
        >
          {!cameraReady && <div className="absolute inset-0 bg-gray-950" />}

          {/* Screen hit flash */}
          {screenHit && (
            <div className="absolute inset-0 bg-red-500/40 z-50 pointer-events-none" />
          )}
          {/* Muzzle flash */}
          {muzzleFlash && (
            <div className="absolute inset-0 bg-white/20 z-40 pointer-events-none" />
          )}

          {/* Enemies */}
          {enemies.map(e => {
            const { sx, sy } = getEnemyScreenPos(e);
            return <EnemySprite key={e.id} enemy={e} screenX={sx} screenY={sy} />;
          })}

          {/* Off-screen indicators */}
          {enemies.map(e => {
            const { sx, sy } = getEnemyScreenPos(e);
            return <OffscreenIndicator key={`ind-${e.id}`} screenX={sx} screenY={sy} type={e.type} />;
          })}

          {/* Bullet effects */}
          {bulletEffects.map(b => (
            <BulletEffectComponent
              key={b.id}
              angle={b.angle}
              length={b.length}
              onDone={() => setBulletEffects(prev => prev.filter(x => x.id !== b.id))}
            />
          ))}

          {/* Hit explosion effects */}
          {hitEffects.map(h => (
            <HitEffectComponent
              key={h.id}
              x={h.x}
              y={h.y}
              type={h.type}
              score={h.score}
              onDone={() => setHitEffects(prev => prev.filter(x => x.id !== h.id))}
            />
          ))}

          <Crosshair flash={muzzleFlash} />
          <HUD score={score} lives={lives} wave={wave} />

          <button
            className="absolute bottom-6 right-6 px-4 py-2 bg-black/60 text-white text-xs rounded-xl border border-white/20 active:scale-95 transition-transform z-30"
            onPointerDown={e => { e.stopPropagation(); calibrate(); }}
          >
            再校正
          </button>
        </div>
      )}
    </div>
  );
}
