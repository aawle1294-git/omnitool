import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  Edit3,
  Sparkles,
  Eraser,
  Type,
  Square,
  ArrowUpRight,
  Grid3X3,
  Undo2,
  Redo2,
  Check,
  X,
  Download,
  Trash2,
  ZoomIn,
  ZoomOut,
  Info
} from 'lucide-react';
import { PdfPageItem } from '../../utils/pdfTools';
import { useLanguage } from '../../contexts/LanguageContext';

interface PdfAnnotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfFile: File;
  pageItem: PdfPageItem;
  pageNumber: number;
  onSaveAnnotation: (pageId: string, annotationDataUrl: string, combinedThumbnailUrl: string) => void;
}

type PaintTool =
  | 'brush'
  | 'highlighter'
  | 'eraser'
  | 'whiteout'
  | 'text'
  | 'rect'
  | 'arrow'
  | 'mosaic';

export const PdfAnnotationModal: React.FC<PdfAnnotationModalProps> = ({
  isOpen,
  onClose,
  pdfFile,
  pageItem,
  pageNumber,
  onSaveAnnotation,
}) => {
  const { lang } = useLanguage();
  const L = (ko: string, en: string) => (lang === 'en' ? en : ko);

  const [tool, setTool] = useState<PaintTool>('brush');
  const [brushColor, setBrushColor] = useState<string>('#EF4444');
  const [brushSize, setBrushSize] = useState<number>(6);

  // Text annotation
  const [insertText, setInsertText] = useState<string>(L('주석 메모', 'Annotation Note'));
  const [textSize, setTextSize] = useState<number>(20);
  const [textColor, setTextColor] = useState<string>('#000000');

  // Drawing state
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragSnapshot, setDragSnapshot] = useState<ImageData | null>(null);

  // History stack for Undo / Redo
  const [history, setHistory] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);

  // Canvas refs
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const paintCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState<boolean>(true);

  // Save history snapshot of paint canvas
  const saveHistoryState = useCallback(() => {
    const canvas = paintCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    try {
      const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory((prev) => [...prev.slice(-24), snap]);
      setRedoStack([]);
    } catch (e) {
      console.warn('Canvas history save skipped:', e);
    }
  }, []);

  // Undo Handler
  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const canvas = paintCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setRedoStack((prev) => [...prev, current]);
      const prevSnap = history[history.length - 1];
      ctx.putImageData(prevSnap, 0, 0);
      setHistory((prev) => prev.slice(0, -1));
    } catch (e) {
      console.error('Undo failed:', e);
    }
  }, [history]);

  // Redo Handler
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const canvas = paintCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory((prev) => [...prev, current]);
      const nextSnap = redoStack[redoStack.length - 1];
      ctx.putImageData(nextSnap, 0, 0);
      setRedoStack((prev) => prev.slice(0, -1));
    } catch (e) {
      console.error('Redo failed:', e);
    }
  }, [redoStack]);

  // Keyboard shortcut Ctrl+Z / Ctrl+Y
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleUndo, handleRedo, onClose]);

  // Render PDF page onto background canvas, and load existing annotations if any
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setIsLoadingPage(true);

    const renderPage = async () => {
      try {
        const arrayBuffer = await pdfFile.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdfDoc = await loadingTask.promise;
        const page = await pdfDoc.getPage(pageItem.originalIndex + 1);

        // Render at 2.0x scale for sharp editing
        const viewport = page.getViewport({ scale: 2.0 });

        if (!isMounted) return;

        const bgCanvas = bgCanvasRef.current;
        const paintCanvas = paintCanvasRef.current;
        if (!bgCanvas || !paintCanvas) return;

        bgCanvas.width = viewport.width;
        bgCanvas.height = viewport.height;
        paintCanvas.width = viewport.width;
        paintCanvas.height = viewport.height;

        const bgCtx = bgCanvas.getContext('2d');
        if (bgCtx) {
          bgCtx.fillStyle = '#FFFFFF';
          bgCtx.fillRect(0, 0, viewport.width, viewport.height);
          await page.render({ canvasContext: bgCtx, viewport }).promise;
        }

        const paintCtx = paintCanvas.getContext('2d');
        if (paintCtx) {
          paintCtx.clearRect(0, 0, viewport.width, viewport.height);

          // If there are existing annotations, draw them onto paintCanvas
          if (pageItem.annotationDataUrl) {
            const existingImg = new Image();
            existingImg.onload = () => {
              if (isMounted && paintCtx) {
                paintCtx.drawImage(existingImg, 0, 0, viewport.width, viewport.height);
              }
            };
            existingImg.src = pageItem.annotationDataUrl;
          }
        }

        setHistory([]);
        setRedoStack([]);
      } catch (err) {
        console.error('Failed to render PDF page for annotation:', err);
      } finally {
        if (isMounted) setIsLoadingPage(false);
      }
    };

    renderPage();

    return () => {
      isMounted = false;
    };
  }, [isOpen, pdfFile, pageItem]);

  // Coordinate helper
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = paintCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // Draw Arrow helper
  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string,
    width: number
  ) => {
    const headLen = Math.max(16, width * 3.2);
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLen * Math.cos(angle - Math.PI / 6),
      toY - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      toX - headLen * Math.cos(angle + Math.PI / 6),
      toY - headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // Mosaic helper
  const applyMosaicAt = (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) => {
    const boxSize = Math.max(24, size * 5);
    const pixelSize = Math.max(5, Math.floor(size * 1.3));
    const startX = Math.max(0, Math.floor(cx - boxSize / 2));
    const startY = Math.max(0, Math.floor(cy - boxSize / 2));
    const w = Math.min(boxSize, ctx.canvas.width - startX);
    const h = Math.min(boxSize, ctx.canvas.height - startY);

    if (w <= 0 || h <= 0) return;

    // Grab pixels from background canvas as well for mosaic
    const bgCanvas = bgCanvasRef.current;
    if (!bgCanvas) return;
    const bgCtx = bgCanvas.getContext('2d');
    if (!bgCtx) return;

    try {
      const imgData = bgCtx.getImageData(startX, startY, w, h);
      for (let py = 0; py < h; py += pixelSize) {
        for (let px = 0; px < w; px += pixelSize) {
          const idx = (py * w + px) * 4;
          const r = imgData.data[idx];
          const g = imgData.data[idx + 1];
          const b = imgData.data[idx + 2];

          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillRect(startX + px, startY + py, pixelSize, pixelSize);
        }
      }
    } catch (e) {
      console.warn('PDF Mosaic error:', e);
    }
  };

  // Mouse event handlers for painting on overlay canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = paintCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    saveHistoryState();
    setIsDrawing(true);
    setStartPoint({ x, y });

    try {
      setDragSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));
    } catch {
      setDragSnapshot(null);
    }

    if (tool === 'brush') {
      ctx.save();
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === 'highlighter') {
      ctx.save();
      ctx.globalAlpha = 0.38;
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize * 2.8;
      ctx.lineCap = 'square';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === 'whiteout') {
      ctx.save();
      ctx.strokeStyle = '#FFFFFF';
      ctx.fillStyle = '#FFFFFF';
      ctx.lineWidth = brushSize * 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === 'eraser') {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, brushSize * 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (tool === 'mosaic') {
      applyMosaicAt(ctx, x, y, brushSize);
    } else if (tool === 'text') {
      if (insertText.trim()) {
        ctx.save();
        ctx.font = `bold ${textSize * 1.8}px 'Pretendard', sans-serif`;
        ctx.fillStyle = textColor;
        ctx.textBaseline = 'middle';
        ctx.fillText(insertText, x, y);
        ctx.restore();
      }
      setIsDrawing(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = paintCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);

    if (tool === 'brush' || tool === 'highlighter' || tool === 'whiteout') {
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === 'eraser') {
      ctx.beginPath();
      ctx.arc(x, y, brushSize * 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (tool === 'mosaic') {
      applyMosaicAt(ctx, x, y, brushSize);
    } else if (tool === 'rect') {
      if (dragSnapshot) ctx.putImageData(dragSnapshot, 0, 0);
      ctx.save();
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.strokeRect(startPoint.x, startPoint.y, x - startPoint.x, y - startPoint.y);
      ctx.restore();
    } else if (tool === 'arrow') {
      if (dragSnapshot) ctx.putImageData(dragSnapshot, 0, 0);
      drawArrow(ctx, startPoint.x, startPoint.y, x, y, brushColor, brushSize);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setDragSnapshot(null);
    const canvas = paintCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.restore();
  };

  // Clear paint canvas (Reset annotations)
  const handleClearPaint = () => {
    if (!confirm(L('이 페이지에 작성한 모든 주석과 낙서를 지우시겠습니까?', 'Clear all annotations and drawings on this page?'))) return;
    const canvas = paintCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    saveHistoryState();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Save annotations and close
  const handleSaveAndApply = () => {
    const bgCanvas = bgCanvasRef.current;
    const paintCanvas = paintCanvasRef.current;
    if (!bgCanvas || !paintCanvas) return;

    // 1. Transparent PNG containing ONLY the annotations (for PDF embedding)
    const annotationDataUrl = paintCanvas.toDataURL('image/png');

    // 2. Composite thumbnail (base PDF + annotations)
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 300;
    thumbCanvas.height = Math.round((bgCanvas.height / bgCanvas.width) * 300);
    const thumbCtx = thumbCanvas.getContext('2d');
    if (thumbCtx) {
      thumbCtx.drawImage(bgCanvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
      thumbCtx.drawImage(paintCanvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
    }
    const combinedThumbnailUrl = thumbCanvas.toDataURL('image/jpeg', 0.85);

    onSaveAnnotation(pageItem.id, annotationDataUrl, combinedThumbnailUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl w-full max-w-6xl max-h-[95vh] flex flex-col shadow-2xl border border-[#e9e9e7] dark:border-[#333] overflow-hidden select-none">
        {/* Modal Top Header */}
        <div className="px-5 py-3 border-b border-[#e9e9e7] dark:border-[#2f2f2f] flex items-center justify-between bg-[#faf9f6] dark:bg-[#202020]">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-black dark:bg-white text-white dark:text-black text-xs font-bold">
              {L(`PDF ${pageNumber}페이지`, `PDF Page ${pageNumber}`)}
            </span>
            <h3 className="font-bold text-xs text-[#37352f] dark:text-white flex items-center gap-1.5">
              <span>{L('🎨 그림판 & 주석 편집기', '🎨 Paint & Annotation Editor')}</span>
              <span className="text-[11px] font-normal text-[#787774]">
                {L('(어느 위치든 텍스트 메모, 자유 필기, 형광펜, 네모 박스 삽입)', '(Insert text notes, freehand drawing, highlighter, or boxes anywhere)')}
              </span>
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Undo / Redo Buttons */}
            <div className="flex items-center gap-1 mr-2">
              <button
                onClick={handleUndo}
                disabled={history.length === 0}
                title={L('실행 취소 (Ctrl+Z)', 'Undo (Ctrl+Z)')}
                className="p-1.5 rounded-md bg-white dark:bg-[#2a2a2a] border border-[#e9e9e7] dark:border-[#333] hover:bg-[#efefed] dark:hover:bg-[#333] disabled:opacity-30 disabled:pointer-events-none transition text-[#37352f] dark:text-white"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                title={L('다시 실행 (Ctrl+Y)', 'Redo (Ctrl+Y)')}
                className="p-1.5 rounded-md bg-white dark:bg-[#2a2a2a] border border-[#e9e9e7] dark:border-[#333] hover:bg-[#efefed] dark:hover:bg-[#333] disabled:opacity-30 disabled:pointer-events-none transition text-[#37352f] dark:text-white"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={handleClearPaint}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{L('주석 초기화', 'Clear Annotations')}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#787774] hover:bg-[#efefed] dark:hover:bg-[#2c2c2c] transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Toolbar */}
        <div className="px-5 py-2.5 border-b border-[#e9e9e7] dark:border-[#2f2f2f] bg-white dark:bg-[#1f1f1f] flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Tool Selector */}
          <div className="flex items-center gap-1 flex-wrap">
            {[
              { id: 'brush', label: L('펜 그리기', 'Pen'), icon: Edit3 },
              { id: 'highlighter', label: L('형광펜', 'Highlighter'), icon: Sparkles },
              { id: 'whiteout', label: L('화이트(가리기)', 'Whiteout'), icon: Square },
              { id: 'eraser', label: L('지우개', 'Eraser'), icon: Eraser },
              { id: 'text', label: L('텍스트 주석', 'Text Note'), icon: Type },
              { id: 'rect', label: L('네모 박스', 'Rectangle'), icon: Square },
              { id: 'arrow', label: L('화살표', 'Arrow'), icon: ArrowUpRight },
              { id: 'mosaic', label: L('모자이크', 'Mosaic'), icon: Grid3X3 },
            ].map((t) => {
              const Icon = t.icon;
              const isActive = tool === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTool(t.id as PaintTool)}
                  className={`px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                    isActive
                      ? 'bg-black dark:bg-white text-white dark:text-black shadow-xs'
                      : 'bg-[#f7f6f3] dark:bg-[#282828] text-[#555] dark:text-[#aaa] hover:bg-[#efefed] dark:hover:bg-[#333]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Color & Size Controls */}
          <div className="flex items-center gap-3">
            {tool !== 'eraser' && tool !== 'whiteout' && tool !== 'mosaic' && (
              <div className="flex items-center gap-1.5">
                {['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#000000'].map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setBrushColor(c);
                      setTextColor(c);
                    }}
                    style={{ backgroundColor: c }}
                    className={`w-5 h-5 rounded-full border-2 transition ${
                      brushColor === c ? 'border-black dark:border-white scale-110 shadow-xs' : 'border-neutral-200 dark:border-neutral-700'
                    }`}
                  />
                ))}
                <label className="w-5 h-5 rounded-full overflow-hidden cursor-pointer relative flex items-center justify-center bg-linear-to-tr from-rose-500 via-amber-400 to-indigo-500" title={L('직접 색상 선택', 'Custom Color')}>
                  <input
                    type="color"
                    value={brushColor}
                    onChange={(e) => {
                      setBrushColor(e.target.value);
                      setTextColor(e.target.value);
                    }}
                    className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                  />
                </label>
              </div>
            )}

            {/* Thickness Slider */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[#787774]">{L('두께:', 'Size:')}</span>
              <input
                type="range"
                min="2"
                max="40"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-20 accent-black dark:accent-white"
              />
              <span className="font-mono text-[10px] w-6">{brushSize}px</span>
            </div>
          </div>
        </div>

        {/* Sub toolbar for Text insertion */}
        {tool === 'text' && (
          <div className="px-5 py-2 bg-amber-50/70 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-900/40 flex items-center gap-3 text-xs">
            <span className="font-bold text-amber-900 dark:text-amber-200">{L('텍스트 입력:', 'Text:')}</span>
            <input
              type="text"
              value={insertText}
              onChange={(e) => setInsertText(e.target.value)}
              placeholder={L('PDF에 삽입할 주석 문구...', 'Enter annotation text for PDF...')}
              className="px-3 py-1 text-xs rounded-lg border border-[#e9e9e7] dark:border-[#444] bg-white dark:bg-[#1a1a1a] flex-1 max-w-md"
            />
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-[#787774]">{L('글자 크기:', 'Font Size:')}</span>
              <input
                type="range"
                min="12"
                max="48"
                value={textSize}
                onChange={(e) => setTextSize(Number(e.target.value))}
                className="w-20 accent-black dark:accent-white"
              />
              <span className="font-mono text-[10px]">{textSize}px</span>
            </div>
            <span className="text-[11px] text-[#787774] ml-auto">
              {L('💡 원하는 위치를 클릭하면 글자가 삽입됩니다.', '💡 Click anywhere on the page to insert text.')}
            </span>
          </div>
        )}

        {/* Main Canvas Workspace Area */}
        <div className="flex-1 bg-[#eae9e6] dark:bg-[#121212] overflow-auto p-4 flex items-center justify-center relative">
          {isLoadingPage ? (
            <div className="py-20 flex flex-col items-center gap-3 text-xs text-[#787774]">
              <div className="w-8 h-8 rounded-full border-2 border-black dark:border-white border-t-transparent animate-spin" />
              <span>{L('고화질 PDF 페이지 불러오는 중...', 'Loading high-resolution PDF page...')}</span>
            </div>
          ) : (
            <div className="relative shadow-2xl rounded-lg overflow-hidden bg-white max-w-full">
              {/* Background PDF page render */}
              <canvas
                ref={bgCanvasRef}
                className="max-w-full max-h-[72vh] object-contain block pointer-events-none"
              />

              {/* Foreground Drawing & Annotation Overlay Canvas */}
              <canvas
                ref={paintCanvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className={`absolute inset-0 w-full h-full ${
                  tool === 'eraser'
                    ? 'cursor-cell'
                    : tool === 'text'
                    ? 'cursor-text'
                    : 'cursor-crosshair'
                }`}
              />
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-5 py-3 border-t border-[#e9e9e7] dark:border-[#2f2f2f] flex items-center justify-between bg-[#faf9f6] dark:bg-[#202020] text-xs">
          <div className="text-[#787774] flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            <span>
              {lang === 'en' ? (
                <>Shortcuts: <strong>Ctrl + Z</strong> (Undo) · <strong>Ctrl + Y</strong> (Redo) · <strong>ESC</strong> (Close)</>
              ) : (
                <>단축키: <strong>Ctrl + Z</strong> (실행 취소) · <strong>Ctrl + Y</strong> (다시 실행) · <strong>ESC</strong> (닫기)</>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white dark:bg-[#2a2a2a] border border-[#e9e9e7] dark:border-[#333] font-semibold text-[#37352f] dark:text-white hover:bg-[#efefed] transition"
            >
              {L('취소', 'Cancel')}
            </button>
            <button
              onClick={handleSaveAndApply}
              className="px-5 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold flex items-center gap-2 hover:opacity-90 shadow-sm transition"
            >
              <Check className="w-4 h-4" />
              <span>{L('주석 저장 및 PDF 페이지에 적용', 'Save & Apply to PDF Page')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
