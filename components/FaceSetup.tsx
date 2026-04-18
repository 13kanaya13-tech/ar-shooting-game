'use client';

import { useRef, useState } from 'react';

interface FaceSetupProps {
  onDone: (faceDataUrl: string | null) => void;
}

// Crops a source image to a centered square and returns a downscaled data URL.
async function cropSquareToDataUrl(file: File, targetSize = 256): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = dataUrl;
  });

  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(img, sx, sy, side, side, 0, 0, targetSize, targetSize);
  return canvas.toDataURL('image/jpeg', 0.85);
}

export default function FaceSetup({ onDone }: FaceSetupProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const cropped = await cropSquareToDataUrl(file, 256);
      setPreview(cropped);
    } catch {
      alert('画像の読み込みに失敗しました');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-white z-50 px-6">
      <h2 className="text-2xl font-black text-yellow-400 mb-2">敵の顔を設定</h2>
      <p className="text-gray-300 text-sm text-center mb-8 leading-6">
        顔写真を選ぶと、その顔にヘルメットを<br />
        かぶった敵として登場します。
      </p>

      {/* Preview circle */}
      <div className="relative mb-8">
        <div
          className="w-44 h-44 rounded-full overflow-hidden border-4 border-yellow-400 bg-gray-900 flex items-center justify-center shadow-xl shadow-yellow-400/20"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="face preview" className="w-full h-full object-cover" />
          ) : (
            <span className="text-5xl opacity-40">🙂</span>
          )}
        </div>
        {/* Mock helmet dome to show how it will look */}
        {preview && (
          <div
            className="absolute inset-x-0 top-0 h-1/2 rounded-t-full pointer-events-none"
            style={{
              background: 'linear-gradient(to bottom, #1f2937 0%, #111827 60%, transparent 100%)',
              opacity: 0.9,
              border: '4px solid transparent',
              borderTopColor: '#374151',
              borderLeftColor: '#374151',
              borderRightColor: '#374151',
              borderRadius: '9999px 9999px 0 0',
              margin: 4,
            }}
          />
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0])}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0])}
      />

      {/* Actions */}
      <div className="w-64 space-y-3">
        <button
          disabled={busy}
          className="w-full py-3 bg-yellow-400 text-black font-bold rounded-2xl active:scale-95 transition-transform disabled:opacity-50"
          onClick={() => cameraInputRef.current?.click()}
        >
          📷 顔を撮影
        </button>
        <button
          disabled={busy}
          className="w-full py-3 bg-gray-800 text-white font-bold rounded-2xl active:scale-95 transition-transform border border-gray-700 disabled:opacity-50"
          onClick={() => galleryInputRef.current?.click()}
        >
          🖼 写真から選ぶ
        </button>

        {preview && (
          <button
            className="w-full py-3 bg-green-500 text-black font-black rounded-2xl active:scale-95 transition-transform shadow-lg shadow-green-500/30"
            onClick={() => onDone(preview)}
          >
            これで始める →
          </button>
        )}

        <button
          className="w-full py-2 text-gray-400 text-sm active:opacity-60"
          onClick={() => onDone(null)}
        >
          顔を使わずスキップ
        </button>
      </div>

      {busy && (
        <p className="text-yellow-400 text-sm mt-4">処理中...</p>
      )}
    </div>
  );
}
