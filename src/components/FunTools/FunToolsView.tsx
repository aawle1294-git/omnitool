import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import {
  Upload, Download, Loader2, Play, Pause, SkipBack, SkipForward,
  RotateCcw, Sparkles, Image as ImageIcon, Link as LinkIcon,
  CheckCircle2, Info, Move
} from 'lucide-react';
import { NotionPageHeader } from '../NotionLayout/NotionPageHeader';
import { saveAs } from 'file-saver';

// ─────────────────────────────────────────────────────────────────────────────
// Authentic PetPet Constants & Algorithm (by benisland)
// ─────────────────────────────────────────────────────────────────────────────
const MAX_FRAME = 5; // 0, 1, 2, 3, 4
const OUT_SIZE = 112;

interface PetPetConfig {
  squish: number;
  scale: number;
  delay: number;
  spriteX: number;
  spriteY: number;
  spriteWidth: number;
  spriteHeight: number;
  flip: boolean;
}

const DEFAULTS: PetPetConfig = {
  squish: 1.25,
  scale: 0.875,
  delay: 60, // ms per frame (~16fps)
  spriteX: 14,
  spriteY: 20,
  spriteWidth: 112,
  spriteHeight: 112,
  flip: false,
};

const FRAME_OFFSETS = [
  { x: 0, y: 0, w: 0, h: 0 },
  { x: -4, y: 12, w: 4, h: -12 },
  { x: -12, y: 18, w: 12, h: -18 },
  { x: -8, y: 12, w: 4, h: -12 },
  { x: -4, y: 0, w: 0, h: 0 },
];

export const FunToolsView: React.FC = () => {
  // Hand Sprite Image
  const handRef = useRef<HTMLImageElement | null>(null);
  const [handLoaded, setHandLoaded] = useState(false);

  // Target Sprite Image
  const spriteRef = useRef<HTMLImageElement | null>(null);
  const [spriteSrc, setSpriteSrc] = useState<string>('/petpet/sample.png');
  const [spriteLoaded, setSpriteLoaded] = useState(false);

  // Controls state
  const [adjustMode, setAdjustMode] = useState(false);
  const [flip, setFlip] = useState(false);
  const [scale, setScale] = useState<number>(DEFAULTS.scale);
  const [squish, setSquish] = useState<number>(DEFAULTS.squish);
  const [speed, setSpeed] = useState<number>(16); // fps
  const [spritePos, setSpritePos] = useState<{ x: number; y: number }>({ x: DEFAULTS.spriteX, y: DEFAULTS.spriteY });

  // Playback state
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentFrame, setCurrentFrame] = useState(0);

  // URL input
  const [urlInput, setUrlInput] = useState('');

  // Export state
  const [exporting, setExporting] = useState(false);
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const [exportedUrl, setExportedUrl] = useState<string | null>(null);

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, spriteX: 0, spriteY: 0 });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ── Load Hand Sprite ────────────────────────────────────────────────────────
  useEffect(() => {
    const hand = new Image();
    hand.crossOrigin = 'Anonymous';
    hand.onload = () => {
      handRef.current = hand;
      setHandLoaded(true);
    };
    hand.src = '/petpet/sprite.png';
  }, []);

  // ── Load Default Sample Sprite ──────────────────────────────────────────────
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      spriteRef.current = img;
      setSpriteLoaded(true);
    };
    img.src = spriteSrc;
  }, [spriteSrc]);

  // ── Calculate frame coordinates ─────────────────────────────────────────────
  const getSpriteFrame = useCallback((frameIdx: number) => {
    if (!spriteRef.current) return { dx: 0, dy: 0, dw: 0, dh: 0 };
    const offset = FRAME_OFFSETS[frameIdx];
    const s = spriteRef.current;
    const aspect = s.naturalWidth > 0 ? s.naturalHeight / s.naturalWidth : 1;
    const baseW = DEFAULTS.spriteWidth;
    const baseH = baseW * aspect;

    return {
      dx: Math.floor(spritePos.x + offset.x * (squish * 0.4)),
      dy: Math.floor(spritePos.y + offset.y * (squish * 0.9)),
      dw: Math.floor((baseW + offset.w * squish) * scale),
      dh: Math.floor((baseH + offset.h * squish) * scale),
    };
  }, [spritePos, squish, scale]);

  // ── Render single frame on canvas ───────────────────────────────────────────
  const renderCanvasFrame = useCallback((frameIdx: number, targetCtx?: CanvasRenderingContext2D, isExport = false) => {
    const ctx = targetCtx || canvasRef.current?.getContext('2d');
    if (!ctx || !handRef.current || !spriteRef.current) return;

    const cf = getSpriteFrame(frameIdx);

    ctx.clearRect(0, 0, OUT_SIZE, OUT_SIZE);

    // Draw Sprite (with flip support)
    ctx.save();
    ctx.translate(cf.dx, cf.dy);

    let drawW = cf.dw;
    if (flip) {
      ctx.scale(-1, 1);
      drawW = -cf.dw;
    }

    ctx.drawImage(spriteRef.current, 0, 0, drawW, cf.dh);

    if (adjustMode && !isExport) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, drawW, cf.dh);
    }
    ctx.restore();

    // Draw Hand Sprite from sprite sheet
    if (adjustMode && !isExport) {
      ctx.globalAlpha = 0.8;
    } else {
      ctx.globalAlpha = 1;
    }

    const handY = Math.max(0, Math.floor(cf.dy * 0.75 - Math.max(0, spritePos.y) - 0.5));

    ctx.drawImage(
      handRef.current,
      frameIdx * OUT_SIZE, // sx
      0,                  // sy
      OUT_SIZE,           // sw
      OUT_SIZE,           // sh
      0,                  // dx
      handY,              // dy
      OUT_SIZE,           // dw
      OUT_SIZE            // dh
    );
    ctx.globalAlpha = 1;
  }, [getSpriteFrame, flip, adjustMode, spritePos.y]);

  // ── Render on canvas when state updates ─────────────────────────────────────
  useEffect(() => {
    if (handLoaded && spriteLoaded) {
      renderCanvasFrame(currentFrame);
    }
  }, [currentFrame, handLoaded, spriteLoaded, renderCanvasFrame]);

  // ── Animation Loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = Math.max(20, Math.floor(1000 / speed));
    const timer = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % MAX_FRAME);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, speed]);

  // ── Drag & Adjust Handler on Canvas ─────────────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!adjustMode) return;
    isDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      spriteX: spritePos.x,
      spriteY: spritePos.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || !adjustMode) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setSpritePos({
      x: Math.round(dragStartRef.current.spriteX + dx),
      y: Math.round(dragStartRef.current.spriteY + dy),
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // ── Load User File ──────────────────────────────────────────────────────────
  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setSpriteSrc(url);
    setExportedBlob(null);
    setExportedUrl(null);
  };

  const handleUrlLoad = () => {
    const url = urlInput.trim();
    if (!url) return;
    setSpriteSrc(url);
    setExportedBlob(null);
    setExportedUrl(null);
  };

  // ── Reset Controls ──────────────────────────────────────────────────────────
  const handleReset = () => {
    setAdjustMode(false);
    setFlip(DEFAULTS.flip);
    setScale(DEFAULTS.scale);
    setSquish(DEFAULTS.squish);
    setSpeed(16);
    setSpritePos({ x: DEFAULTS.spriteX, y: DEFAULTS.spriteY });
  };

  // ── Export Real PetPet GIF ──────────────────────────────────────────────────
  const handleExport = async () => {
    if (!handRef.current || !spriteRef.current) return;
    setExporting(true);

    try {
      const offscreen = document.createElement('canvas');
      offscreen.width = OUT_SIZE;
      offscreen.height = OUT_SIZE;
      const ctx = offscreen.getContext('2d', { willReadFrequently: true })!;

      const gif = GIFEncoder();
      const delayCentis = Math.max(2, Math.floor(100 / speed)); // in 1/100s

      for (let f = 0; f < MAX_FRAME; f++) {
        renderCanvasFrame(f, ctx, true);
        const imgData = ctx.getImageData(0, 0, OUT_SIZE, OUT_SIZE);
        const { data: rgba } = imgData;

        // Quantize colors with transparency
        const palette = quantize(rgba, 256, { format: 'rgba4444' });
        const index = applyPalette(rgba, palette, 'rgba4444');

        // Find transparent index if any (alpha === 0)
        let transparentIndex = -1;
        for (let i = 0; i < palette.length; i++) {
          if (palette[i][3] === 0) {
            transparentIndex = i;
            break;
          }
        }

        gif.writeFrame(index, OUT_SIZE, OUT_SIZE, {
          palette,
          delay: delayCentis,
          transparent: transparentIndex !== -1,
          transparentIndex: transparentIndex !== -1 ? transparentIndex : 0,
          repeat: 0,
        });
      }

      gif.finish();
      const blob = new Blob([gif.bytesView() as any], { type: 'image/gif' });
      setExportedBlob(blob);
      const resUrl = URL.createObjectURL(blob);
      setExportedUrl(resUrl);
    } catch (err: any) {
      alert('GIF 생성 실패: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <NotionPageHeader
        icon="🐾"
        title="PetPet GIF 생성기"
        description="사진이나 일러스트를 업로드하면 귀엽게 쓰다듬는 오리지널 PetPet 밈 GIF를 생성합니다. 위치, 크기, 눌림 강도, 속도를 자유롭게 조절할 수 있습니다."
        tags={[
          { label: '오리지널 손 스프라이트 (5 Frames)' },
          { label: '실시간 드래그 위치 조정' },
          { label: 'Flip / Squish / Speed 정밀 제어' },
          { label: '100% 브라우저 로컬 처리' },
        ]}
      />

      {/* Main Notion-Style 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ═══════════════ LEFT: PREVIEW & ADJUSTMENTS (7 Cols) ═══════════════ */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Preview Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#1f1f1f] border border-[#e9e9e7] dark:border-[#2f2f2f] shadow-xs space-y-4">
            
            <div className="flex items-center justify-between border-b border-[#f0f0ee] dark:border-[#2a2a2a] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="font-bold text-sm text-[#37352f] dark:text-white">실시간 미리보기</h3>
              </div>
              <span className="text-xs text-[#787774] font-mono">
                Frame {currentFrame + 1} / {MAX_FRAME}
              </span>
            </div>

            {/* Canvas Box */}
            <div className="flex flex-col items-center justify-center pt-2">
              <div
                className={`relative rounded-2xl overflow-hidden border-2 transition shadow-inner ${
                  adjustMode
                    ? 'border-blue-500 ring-4 ring-blue-500/10'
                    : 'border-[#e9e9e7] dark:border-[#333]'
                }`}
                style={{
                  width: '240px',
                  height: '240px',
                  backgroundColor: '#f7f6f3',
                  backgroundImage:
                    'linear-gradient(45deg, #efefed 25%, transparent 25%), linear-gradient(-45deg, #efefed 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #efefed 75%), linear-gradient(-45deg, transparent 75%, #efefed 75%)',
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                }}
              >
                <canvas
                  ref={canvasRef}
                  width={OUT_SIZE}
                  height={OUT_SIZE}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className={`w-full h-full select-none touch-none ${
                    adjustMode ? 'cursor-move' : 'cursor-default'
                  }`}
                  style={{ imageRendering: 'pixelated' }}
                />

                {adjustMode && (
                  <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-bold tracking-wider shadow-sm flex items-center gap-1 pointer-events-none">
                    <Move className="w-3 h-3" />
                    <span>드래그하여 위치 이동</span>
                  </div>
                )}
              </div>

              {/* Playback Controls Pill */}
              <div className="flex items-center gap-1.5 mt-3 p-1 rounded-xl bg-[#f7f6f3] dark:bg-[#282828] border border-[#e9e9e7] dark:border-[#333]">
                <button
                  onClick={() => setCurrentFrame((prev) => (prev - 1 + MAX_FRAME) % MAX_FRAME)}
                  className="p-1.5 rounded-lg text-[#787774] hover:text-[#37352f] dark:hover:text-white hover:bg-[#efefed] dark:hover:bg-[#333] transition"
                  title="이전 프레임"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black dark:bg-white text-white dark:text-black font-semibold text-xs transition shadow-xs hover:opacity-90"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>일시정지</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>재생</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setCurrentFrame((prev) => (prev + 1) % MAX_FRAME)}
                  className="p-1.5 rounded-lg text-[#787774] hover:text-[#37352f] dark:hover:text-white hover:bg-[#efefed] dark:hover:bg-[#333] transition"
                  title="다음 프레임"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Adjustments & Fine-Tuning */}
            <div className="space-y-4 pt-3 border-t border-[#f0f0ee] dark:border-[#2a2a2a] text-xs">
              
              {/* Adjust mode toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#faf9f6] dark:bg-[#262626] border border-[#e9e9e7] dark:border-[#333]">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Move className="w-3.5 h-3.5 text-[#37352f] dark:text-white" />
                    <span className="font-bold text-[#37352f] dark:text-white">캔버스 직접 드래그 모드</span>
                  </div>
                  <p className="text-[11px] text-[#787774]">
                    활성화 시 마우스로 미리보기 안의 이미지를 원하는 위치로 드래그합니다.
                  </p>
                </div>
                <button
                  onClick={() => setAdjustMode(!adjustMode)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition shrink-0 ${
                    adjustMode ? 'bg-black dark:bg-white' : 'bg-[#e9e9e7] dark:bg-[#3a3a3a]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full shadow-sm transform transition ${
                      adjustMode ? 'translate-x-5 bg-white dark:bg-black' : 'translate-x-0 bg-white dark:bg-[#1f1f1f]'
                    }`}
                  />
                </button>
              </div>

              {/* Flip toggle */}
              <div className="flex items-center justify-between px-1">
                <span className="font-semibold text-[#37352f] dark:text-white">좌우 반전 (Flip)</span>
                <button
                  onClick={() => setFlip(!flip)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition shrink-0 ${
                    flip ? 'bg-black dark:bg-white' : 'bg-[#e9e9e7] dark:bg-[#3a3a3a]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full shadow-sm transform transition ${
                      flip ? 'translate-x-5 bg-white dark:bg-black' : 'translate-x-0 bg-white dark:bg-[#1f1f1f]'
                    }`}
                  />
                </button>
              </div>

              {/* Sliders Grid */}
              <div className="space-y-3 pt-1">
                {/* Size */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-semibold">
                    <span className="text-[#787774]">크기 (Size)</span>
                    <span className="font-mono text-[#37352f] dark:text-white">{(scale * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="1.5"
                    step="0.025"
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="w-full accent-black dark:accent-white"
                  />
                </div>

                {/* Squish */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-semibold">
                    <span className="text-[#787774]">눌림 강도 (Squish)</span>
                    <span className="font-mono text-[#37352f] dark:text-white">{squish.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.5"
                    step="0.05"
                    value={squish}
                    onChange={(e) => setSquish(parseFloat(e.target.value))}
                    className="w-full accent-black dark:accent-white"
                  />
                </div>

                {/* Speed */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-semibold">
                    <span className="text-[#787774]">속도 (FPS)</span>
                    <span className="font-mono text-[#37352f] dark:text-white">{speed} fps</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="30"
                    step="1"
                    value={speed}
                    onChange={(e) => setSpeed(parseInt(e.target.value))}
                    className="w-full accent-black dark:accent-white"
                  />
                </div>
              </div>

              {/* Action Buttons: Reset & Export */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={handleReset}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f] bg-white dark:bg-[#282828] text-[#37352f] dark:text-white font-semibold text-xs hover:bg-[#efefed] dark:hover:bg-[#333] transition"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#787774]" />
                  <span>설정 초기화</span>
                </button>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold text-xs hover:opacity-90 transition shadow-xs disabled:opacity-50"
                >
                  {exporting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>GIF 인코딩 중...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>PetPet GIF 생성하기</span>
                    </>
                  )}
                </button>
              </div>

            </div>

          </div>

        </div>

        {/* ═══════════════ RIGHT: UPLOAD & OUTPUT (5 Cols) ═══════════════ */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Upload Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#1f1f1f] border border-[#e9e9e7] dark:border-[#2f2f2f] shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-[#37352f] dark:text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#787774]" />
              <span>대상 이미지 등록</span>
            </h3>

            {/* Current Target Thumbnail */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#faf9f6] dark:bg-[#262626] border border-[#e9e9e7] dark:border-[#333]">
              <img
                src={spriteSrc}
                alt="Selected Sprite"
                className="w-12 h-12 rounded-lg object-contain bg-white dark:bg-[#1f1f1f] border border-[#e9e9e7] dark:border-[#333] p-1 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[#37352f] dark:text-white truncate">
                  현재 쓰다듬을 이미지
                </p>
                <p className="text-[11px] text-[#787774]">
                  PNG, JPG, WEBP, 투명 배경 지원
                </p>
              </div>
            </div>

            {/* File Drop Area */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              }}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#e9e9e7] dark:border-[#333] hover:border-black dark:hover:border-white rounded-2xl p-6 text-center bg-[#faf9f6] dark:bg-[#191919] transition cursor-pointer space-y-2 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = '';
                }}
              />
              <div className="w-10 h-10 mx-auto rounded-xl bg-white dark:bg-[#282828] border border-[#e9e9e7] dark:border-[#333] flex items-center justify-center text-[#787774] group-hover:scale-105 transition-transform">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#37352f] dark:text-white">
                  컴퓨터에서 사진 선택
                </p>
                <p className="text-[11px] text-[#787774]">
                  또는 이미지를 여기로 드래그 & 드롭
                </p>
              </div>
            </div>

            {/* URL Upload Box */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#787774]">웹 링크(URL)로 불러오기</label>
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <LinkIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#787774]" />
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUrlLoad()}
                    placeholder="https://... 이미지 링크 입력"
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f] bg-[#faf9f6] dark:bg-[#191919] text-[#37352f] dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                  />
                </div>
                <button
                  onClick={handleUrlLoad}
                  className="px-3 py-2 rounded-xl bg-[#efefed] dark:bg-[#2c2c2c] hover:bg-[#e3e2e0] dark:hover:bg-[#383838] text-xs font-semibold text-[#37352f] dark:text-white transition"
                >
                  적용
                </button>
              </div>
            </div>

          </div>

          {/* Output Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#1f1f1f] border border-[#e9e9e7] dark:border-[#2f2f2f] shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-[#37352f] dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>완성된 PetPet GIF</span>
            </h3>

            {exportedUrl ? (
              <div className="p-5 rounded-2xl bg-[#faf9f6] dark:bg-[#191919] border border-[#e9e9e7] dark:border-[#333] flex flex-col items-center text-center space-y-3">
                <img
                  src={exportedUrl}
                  alt="Exported PetPet GIF"
                  className="w-28 h-28 rounded-xl border border-[#e9e9e7] dark:border-[#333] shadow-sm"
                  style={{ imageRendering: 'pixelated' }}
                />
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>GIF 생성이 완료되었습니다!</span>
                  </p>
                  <p className="text-[11px] text-[#787774]">
                    투명 배경이 지원되는 애니메이션 GIF 파일입니다.
                  </p>
                </div>
                <button
                  onClick={() => exportedBlob && saveAs(exportedBlob, 'petpet.gif')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-sm w-full justify-center"
                >
                  <Download className="w-4 h-4" />
                  <span>petpet.gif 다운로드</span>
                </button>
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-[#faf9f6] dark:bg-[#191919] border border-dashed border-[#e9e9e7] dark:border-[#333] text-center space-y-2">
                <Sparkles className="w-7 h-7 text-[#aaa] mx-auto" />
                <p className="text-xs font-semibold text-[#37352f] dark:text-white">
                  아직 생성된 GIF가 없습니다
                </p>
                <p className="text-[11px] text-[#787774]">
                  왼쪽에서 옵션을 조절한 후 [PetPet GIF 생성하기] 버튼을 누르면 다운로드할 수 있습니다.
                </p>
              </div>
            )}

            {/* Notion Style Info Callout */}
            <div className="p-3.5 rounded-xl bg-[#f7f6f3] dark:bg-[#282828] border border-[#e9e9e7] dark:border-[#333] text-[11px] text-[#787774] flex items-start gap-2">
              <Info className="w-4 h-4 text-[#787774] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p>
                  • 생성된 GIF는 브라우저 메모리에 저장되므로 바로 다운로드해 보관하세요.
                </p>
                <p>
                  • 디스코드, 슬랙, 카카오톡 등에 이모지나 움짤로 바로 첨부할 수 있습니다.
                </p>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
