import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Crop,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Sliders,
  Type,
  Edit3,
  Download,
  Trash2,
  ArrowLeft,
  ArrowRight,
  FileText,
  Check,
  Undo2,
  Redo2,
  Eraser,
  Square,
  ArrowUpRight,
  Sparkles,
  Grid3X3,
  RefreshCw,
  Eye,
  Info
} from 'lucide-react';
import { NotionPageHeader } from '../NotionLayout/NotionPageHeader';
import {
  loadPdfPagesForEditing,
  exportEditedPdf,
  PdfPageItem,
  PdfEditOptions
} from '../../utils/pdfTools';
import { saveAs } from 'file-saver';
import { formatBytes } from '../../utils/formatters';

import { ActiveTab } from '../../types';

type EditorTab = 'image' | 'pdf';

type CropRatio = 'free' | '1:1' | '4:3' | '16:9' | '3:4' | '9:16';

interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

type EditorTool =
  | 'none'
  | 'crop'
  | 'brush'
  | 'highlighter'
  | 'eraser'
  | 'rect'
  | 'arrow'
  | 'mosaic'
  | 'text';

type CanvasBackgroundMode = 'checkerboard' | 'white' | 'dark';

interface FileEditorViewProps {
  mode: 'image' | 'pdf';
  setActiveTab: (tab: ActiveTab) => void;
}

export const FileEditorView: React.FC<FileEditorViewProps> = ({
  mode,
  setActiveTab,
}) => {
  const activeTab = mode;

  // ==============================================================
  // 1. IMAGE & PNG EDITOR STATE
  // ==============================================================
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Canvas background preview (for transparent PNG)
  const [bgMode, setBgMode] = useState<CanvasBackgroundMode>('checkerboard');

  // Active Tool
  const [tool, setTool] = useState<EditorTool>('brush');

  // Color & Size Controls
  const [brushColor, setBrushColor] = useState<string>('#EF4444');
  const [brushSize, setBrushSize] = useState<number>(6);

  // Text insertion
  const [insertText, setInsertText] = useState<string>('올데스크 텍스트');
  const [textColor, setTextColor] = useState<string>('#000000');
  const [textSize, setTextSize] = useState<number>(24);

  // Transformations
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);

  // Filters
  const [brightness, setBrightness] = useState<number>(100); // 100%
  const [contrast, setContrast] = useState<number>(100); // 100%
  const [saturation, setSaturation] = useState<number>(100); // 100%
  const [grayscale, setGrayscale] = useState<boolean>(false);
  const [sepia, setSepia] = useState<boolean>(false);

  // Cropping
  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [cropRatio, setCropRatio] = useState<CropRatio>('free');
  const [cropBox, setCropBox] = useState<CropBox>({ x: 50, y: 50, width: 200, height: 200 });

  // Drawing state
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragSnapshot, setDragSnapshot] = useState<ImageData | null>(null);

  // Canvas refs
  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // History stack for Undo / Redo
  const [history, setHistory] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);

  // ==============================================================
  // 2. PDF EDITOR STATE
  // ==============================================================
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPages, setPdfPages] = useState<PdfPageItem[]>([]);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(false);
  const [pdfLoadingProgress, setPdfLoadingProgress] = useState<number>(0);
  const [watermarkText, setWatermarkText] = useState<string>('');
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.25);
  const [headerText, setHeaderText] = useState<string>('');
  const [footerText, setFooterText] = useState<string>('AllDesk 문서');
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Helper to save history snapshot before mutating canvas
  const saveHistoryState = useCallback(() => {
    const canvas = mainCanvasRef.current;
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
    const canvas = mainCanvasRef.current;
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
    const canvas = mainCanvasRef.current;
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

  // Keyboard shortcut for Undo / Redo (Ctrl+Z / Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // ==============================================================
  // IMAGE UPLOAD & INITIAL RENDERING
  // ==============================================================
  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일(PNG, JPG, WEBP, GIF 등)만 업로드할 수 있습니다.');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      setImageSrc(src);
      const img = new Image();
      img.onload = () => {
        setOriginalImage(img);
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        setRotation(0);
        setFlipH(false);
        setFlipV(false);
        setBrightness(100);
        setContrast(100);
        setSaturation(100);
        setGrayscale(false);
        setSepia(false);
        setTool('brush');
        setIsCropping(false);
        setHistory([]);
        setRedoStack([]);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  // Render Image onto canvas with filters and transformations
  const renderCanvas = useCallback(() => {
    const canvas = mainCanvasRef.current;
    if (!canvas || !originalImage) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isRotated90 = rotation === 90 || rotation === 270;
    const w = isRotated90 ? originalImage.naturalHeight : originalImage.naturalWidth;
    const h = isRotated90 ? originalImage.naturalWidth : originalImage.naturalHeight;

    canvas.width = w;
    canvas.height = h;

    ctx.save();
    // 100% Clear with transparency
    ctx.clearRect(0, 0, w, h);

    // Filters
    let filterStr = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    if (grayscale) filterStr += ' grayscale(100%)';
    if (sepia) filterStr += ' sepia(100%)';
    ctx.filter = filterStr;

    // Transform Matrix
    ctx.translate(w / 2, h / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

    // Draw image maintaining full alpha channel transparency
    ctx.drawImage(
      originalImage,
      -originalImage.naturalWidth / 2,
      -originalImage.naturalHeight / 2
    );

    ctx.restore();

    // Default crop box based on canvas size
    const pad = Math.min(w, h) * 0.1;
    setCropBox({
      x: pad,
      y: pad,
      width: Math.max(80, w - pad * 2),
      height: Math.max(80, h - pad * 2),
    });
  }, [originalImage, rotation, flipH, flipV, brightness, contrast, saturation, grayscale, sepia]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // ==============================================================
  // CROP HANDLER
  // ==============================================================
  const applyCrop = () => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y, width, height } = cropBox;
    if (width <= 10 || height <= 10) return;

    saveHistoryState();

    const croppedData = ctx.getImageData(
      Math.max(0, Math.floor(x)),
      Math.max(0, Math.floor(y)),
      Math.min(canvas.width - x, Math.floor(width)),
      Math.min(canvas.height - y, Math.floor(height))
    );

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = croppedData.width;
    tempCanvas.height = croppedData.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.putImageData(croppedData, 0, 0);

    const croppedImg = new Image();
    croppedImg.onload = () => {
      setOriginalImage(croppedImg);
      setImageDimensions({ width: croppedImg.naturalWidth, height: croppedImg.naturalHeight });
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
      setIsCropping(false);
      setTool('brush');
    };
    // Ensure PNG format to retain transparency
    croppedImg.src = tempCanvas.toDataURL('image/png');
  };

  const handleRatioSelect = (ratio: CropRatio) => {
    setCropRatio(ratio);
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const maxW = canvas.width * 0.85;
    const maxH = canvas.height * 0.85;

    let targetW = maxW;
    let targetH = maxH;

    if (ratio === '1:1') {
      const side = Math.min(maxW, maxH);
      targetW = side;
      targetH = side;
    } else if (ratio === '4:3') {
      targetW = Math.min(maxW, maxH * (4 / 3));
      targetH = targetW * (3 / 4);
    } else if (ratio === '16:9') {
      targetW = Math.min(maxW, maxH * (16 / 9));
      targetH = targetW * (9 / 16);
    } else if (ratio === '3:4') {
      targetH = Math.min(maxH, maxW * (4 / 3));
      targetW = targetH * (3 / 4);
    } else if (ratio === '9:16') {
      targetH = Math.min(maxH, maxW * (16 / 9));
      targetW = targetH * (9 / 16);
    }

    setCropBox({
      x: Math.max(0, (canvas.width - targetW) / 2),
      y: Math.max(0, (canvas.height - targetH) / 2),
      width: targetW,
      height: targetH,
    });
  };

  // ==============================================================
  // ARROW & MOSAIC DRAWING HELPERS
  // ==============================================================
  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string,
    width: number
  ) => {
    const headLen = Math.max(14, width * 3);
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Main shaft
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Arrow tip
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

  const applyMosaicAt = (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) => {
    const boxSize = Math.max(20, size * 5);
    const pixelSize = Math.max(4, Math.floor(size * 1.2));
    const startX = Math.max(0, Math.floor(cx - boxSize / 2));
    const startY = Math.max(0, Math.floor(cy - boxSize / 2));
    const w = Math.min(boxSize, ctx.canvas.width - startX);
    const h = Math.min(boxSize, ctx.canvas.height - startY);

    if (w <= 0 || h <= 0) return;

    try {
      const imgData = ctx.getImageData(startX, startY, w, h);
      for (let py = 0; py < h; py += pixelSize) {
        for (let px = 0; px < w; px += pixelSize) {
          const idx = (py * w + px) * 4;
          const r = imgData.data[idx];
          const g = imgData.data[idx + 1];
          const b = imgData.data[idx + 2];
          const a = imgData.data[idx + 3];

          for (let dy = 0; dy < pixelSize; dy++) {
            for (let dx = 0; dx < pixelSize; dx++) {
              if (px + dx < w && py + dy < h) {
                const targetIdx = ((py + dy) * w + (px + dx)) * 4;
                imgData.data[targetIdx] = r;
                imgData.data[targetIdx + 1] = g;
                imgData.data[targetIdx + 2] = b;
                imgData.data[targetIdx + 3] = a;
              }
            }
          }
        }
      }
      ctx.putImageData(imgData, startX, startY);
    } catch (e) {
      console.warn('Mosaic error:', e);
    }
  };

  // ==============================================================
  // CANVAS MOUSE EVENT HANDLERS (Drawing, Eraser, Shapes, Text)
  // ==============================================================
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = mainCanvasRef.current;
    if (!canvas || tool === 'none' || tool === 'crop') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    saveHistoryState();
    setIsDrawing(true);
    setStartPoint({ x, y });

    // Store snapshot for drag previews (rect, arrow)
    try {
      const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setDragSnapshot(snap);
    } catch (err) {
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
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize * 2.5;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'miter';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === 'eraser') {
      // Transparency eraser: cuts out alpha channel back to transparent!
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
        ctx.font = `bold ${textSize}px 'Pretendard', -apple-system, sans-serif`;
        ctx.fillStyle = textColor;
        ctx.textBaseline = 'middle';
        ctx.fillText(insertText, x, y);
        ctx.restore();
      }
      setIsDrawing(false);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);

    if (tool === 'brush' || tool === 'highlighter') {
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === 'eraser') {
      ctx.beginPath();
      ctx.arc(x, y, brushSize * 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (tool === 'mosaic') {
      applyMosaicAt(ctx, x, y, brushSize);
    } else if (tool === 'rect') {
      if (dragSnapshot) {
        ctx.putImageData(dragSnapshot, 0, 0);
      }
      ctx.save();
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.strokeRect(startPoint.x, startPoint.y, x - startPoint.x, y - startPoint.y);
      ctx.restore();
    } else if (tool === 'arrow') {
      if (dragSnapshot) {
        ctx.putImageData(dragSnapshot, 0, 0);
      }
      drawArrow(ctx, startPoint.x, startPoint.y, x, y, brushColor, brushSize);
    }
  };

  const handleCanvasMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setDragSnapshot(null);
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.restore();
    }
  };

  // ==============================================================
  // EXPORT HANDLER
  // ==============================================================
  const handleExportImage = (format: 'image/png' | 'image/jpeg' | 'image/webp') => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const ext = format === 'image/png' ? 'png' : format === 'image/jpeg' ? 'jpg' : 'webp';
          const base = imageFile?.name.replace(/\.[^.]+$/, '') || 'alldesk_image';
          saveAs(blob, `${base}_edited.${ext}`);
        }
      },
      format,
      format === 'image/png' ? 1.0 : 0.95
    );
  };

  // Reset image to original state
  const handleResetImage = () => {
    if (!originalImage) return;
    if (confirm('모든 편집 내용을 취소하고 원본 이미지로 되돌릴까요?')) {
      renderCanvas();
      setHistory([]);
      setRedoStack([]);
    }
  };

  // ==============================================================
  // PDF HANDLERS
  // ==============================================================
  const handlePdfUpload = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      alert('PDF 파일만 업로드할 수 있습니다.');
      return;
    }
    setPdfFile(file);
    setIsLoadingPdf(true);
    setPdfLoadingProgress(0);

    try {
      const res = await loadPdfPagesForEditing(file, (p) => setPdfLoadingProgress(p));
      setPdfPages(res.pages);
    } catch (err: any) {
      alert(`PDF 파일을 불러오는 중 오류가 발생했습니다: ${err.message}`);
    } finally {
      setIsLoadingPdf(false);
    }
  };

  const rotatePdfPage = (id: string, delta: number) => {
    setPdfPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, rotation: (p.rotation + delta + 360) % 360 } : p))
    );
  };

  const rotateAllPdfPages = (delta: number) => {
    setPdfPages((prev) =>
      prev.map((p) => ({ ...p, rotation: (p.rotation + delta + 360) % 360 }))
    );
  };

  const deletePdfPage = (id: string) => {
    if (pdfPages.length <= 1) {
      alert('최소 1개 이상의 페이지가 남아있어야 합니다.');
      return;
    }
    setPdfPages((prev) => prev.filter((p) => p.id !== id));
  };

  const movePdfPage = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pdfPages.length) return;

    setPdfPages((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated;
    });
  };

  const handleExportPdf = async () => {
    if (!pdfFile || pdfPages.length === 0) return;
    setIsExportingPdf(true);

    try {
      const options: PdfEditOptions = {
        watermarkText: watermarkText.trim() || undefined,
        watermarkOpacity,
        headerText: headerText.trim() || undefined,
        footerText: footerText.trim() || undefined,
      };

      const editedBlob = await exportEditedPdf(pdfFile, pdfPages, options);
      const baseName = pdfFile.name.replace(/\.pdf$/i, '');
      saveAs(editedBlob, `${baseName}_edited.pdf`);
    } catch (err: any) {
      alert(`PDF 내보내기 실패: ${err.message}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Checkerboard styling for transparent PNG canvas
  const getCanvasBgStyle = (): React.CSSProperties => {
    if (bgMode === 'white') {
      return { backgroundColor: '#ffffff' };
    }
    if (bgMode === 'dark') {
      return { backgroundColor: '#18181b' };
    }
    // Checkerboard default
    return {
      backgroundImage: `
        linear-gradient(45deg, #e5e7eb 25%, transparent 25%),
        linear-gradient(-45deg, #e5e7eb 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #e5e7eb 75%),
        linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)
      `,
      backgroundSize: '16px 16px',
      backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
      backgroundColor: '#f9fafb'
    };
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Notion Back Button to Parent Page */}
      <div>
        <button
          onClick={() => setActiveTab('editor')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#787774] hover:text-[#37352f] dark:hover:text-white transition group py-1.5 px-3 rounded-lg hover:bg-[#efefed] dark:hover:bg-[#282828] border border-[#e9e9e7] dark:border-[#333] bg-white dark:bg-[#202020] shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>상위 페이지 (파일 편집소)</span>
        </button>
      </div>

      {/* 1. IMAGE & PNG SUB-PAGE */}
      {activeTab === 'image' && (
        <>
          <NotionPageHeader
            icon="🖼️"
            title="PNG & 사진 편집기"
            description="PNG 투명 배경 유지 및 투명 지우개(누끼), 사진 자르기(Crop), 브러시·형광펜, 도형·화살표, 텍스트 및 모자이크 편집을 100% 브라우저 내에서 안전하게 처리합니다."
            tags={[
              { label: '하위 페이지' },
              { label: 'PNG 투명도 100% 유지' },
              { label: '투명 지우개 (알파 채널 누끼)' },
              { label: '자르기(Crop) 비율 프리셋' },
              { label: '네모·화살표 도형' },
              { label: '실행 취소(Ctrl+Z)' },
            ]}
          />

          <div className="space-y-6">
          {!originalImage ? (
            /* Upload Dropzone */
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files[0]) handleImageUpload(e.dataTransfer.files[0]);
              }}
              className="border-2 border-dashed border-[#e3e2e0] dark:border-[#333] hover:border-black dark:hover:border-white rounded-2xl p-12 text-center cursor-pointer transition bg-[#faf9f6]/60 dark:bg-[#1b1b1b]/60 group select-none space-y-4 shadow-2xs hover:shadow-sm"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleImageUpload(e.target.files[0]);
                }}
              />
              <div className="w-14 h-14 mx-auto rounded-2xl bg-white dark:bg-[#282828] border border-[#e9e9e7] dark:border-[#333] flex items-center justify-center text-[#787774] group-hover:scale-105 transition-transform shadow-xs">
                <Crop className="w-7 h-7 text-black dark:text-white" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold text-[#37352f] dark:text-white">
                  수정하거나 자를 PNG/사진 파일을 여기에 드래그하세요
                </p>
                <p className="text-xs text-[#787774]">
                  PNG(투명 배경 지원), JPG, WEBP, GIF, BMP 지원 · 100% 브라우저 내 오프라인 안전 처리
                </p>
              </div>

              {/* Feature Highlights Pills */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <span className="px-2.5 py-1 rounded-full bg-white dark:bg-[#252525] border border-[#e9e9e7] dark:border-[#333] text-[11px] font-semibold text-[#37352f] dark:text-[#d4d4d4]">
                  ✨ PNG 투명도 100% 유지
                </span>
                <span className="px-2.5 py-1 rounded-full bg-white dark:bg-[#252525] border border-[#e9e9e7] dark:border-[#333] text-[11px] font-semibold text-[#37352f] dark:text-[#d4d4d4]">
                  🧹 투명 지우개 (배경 누끼 제거)
                </span>
                <span className="px-2.5 py-1 rounded-full bg-white dark:bg-[#252525] border border-[#e9e9e7] dark:border-[#333] text-[11px] font-semibold text-[#37352f] dark:text-[#d4d4d4]">
                  ⬛ 사각형/화살표 강조
                </span>
                <span className="px-2.5 py-1 rounded-full bg-white dark:bg-[#252525] border border-[#e9e9e7] dark:border-[#333] text-[11px] font-semibold text-[#37352f] dark:text-[#d4d4d4]">
                  🔲 모자이크 블러
                </span>
                <span className="px-2.5 py-1 rounded-full bg-white dark:bg-[#252525] border border-[#e9e9e7] dark:border-[#333] text-[11px] font-semibold text-[#37352f] dark:text-[#d4d4d4]">
                  ↩️ 실행 취소(Ctrl+Z)
                </span>
              </div>
            </div>
          ) : (
            /* Image Editor Workspace */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Toolbar & Settings (4 cols) */}
              <div className="lg:col-span-4 space-y-4">
                {/* File Information Card */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#1f1f1f] border border-[#e9e9e7] dark:border-[#2f2f2f] flex items-center justify-between text-xs">
                  <div className="truncate pr-2">
                    <p className="font-bold text-[#37352f] dark:text-white truncate">
                      {imageFile?.name || '이미지'}
                    </p>
                    <p className="text-[11px] text-[#787774] font-mono mt-0.5">
                      {imageDimensions.width} × {imageDimensions.height} px · {imageFile ? formatBytes(imageFile.size) : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setImageFile(null);
                      setOriginalImage(null);
                    }}
                    className="shrink-0 px-2 py-1 rounded text-[11px] text-[#787774] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                  >
                    닫기
                  </button>
                </div>

                {/* Primary Editing Tool Palette */}
                <div className="p-4 rounded-xl bg-[#f7f6f3] dark:bg-[#202020] border border-[#e9e9e7] dark:border-[#2f2f2f] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#37352f] dark:text-white flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5" />
                      편집 도구
                    </span>

                    {/* Undo / Redo Buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleUndo}
                        disabled={history.length === 0}
                        title="실행 취소 (Ctrl+Z)"
                        className="p-1.5 rounded-md bg-white dark:bg-[#282828] border border-[#e9e9e7] dark:border-[#333] hover:bg-[#efefed] dark:hover:bg-[#333] disabled:opacity-30 disabled:pointer-events-none transition text-[#37352f] dark:text-white"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={handleRedo}
                        disabled={redoStack.length === 0}
                        title="다시 실행 (Ctrl+Y)"
                        className="p-1.5 rounded-md bg-white dark:bg-[#282828] border border-[#e9e9e7] dark:border-[#333] hover:bg-[#efefed] dark:hover:bg-[#333] disabled:opacity-30 disabled:pointer-events-none transition text-[#37352f] dark:text-white"
                      >
                        <Redo2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 text-xs">
                    {/* Brush */}
                    <button
                      onClick={() => {
                        setTool('brush');
                        setIsCropping(false);
                      }}
                      className={`p-2 rounded-lg font-semibold flex flex-col items-center gap-1 transition ${
                        tool === 'brush'
                          ? 'bg-black dark:bg-white text-white dark:text-black shadow-xs'
                          : 'bg-white dark:bg-[#282828] text-[#37352f] dark:text-white border border-[#e9e9e7] dark:border-[#333]'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span className="text-[10px]">펜 그리기</span>
                    </button>

                    {/* Highlighter */}
                    <button
                      onClick={() => {
                        setTool('highlighter');
                        setIsCropping(false);
                      }}
                      className={`p-2 rounded-lg font-semibold flex flex-col items-center gap-1 transition ${
                        tool === 'highlighter'
                          ? 'bg-black dark:bg-white text-white dark:text-black shadow-xs'
                          : 'bg-white dark:bg-[#282828] text-[#37352f] dark:text-white border border-[#e9e9e7] dark:border-[#333]'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span className="text-[10px]">형광펜</span>
                    </button>

                    {/* Eraser (Transparent Eraser) */}
                    <button
                      onClick={() => {
                        setTool('eraser');
                        setIsCropping(false);
                      }}
                      className={`p-2 rounded-lg font-semibold flex flex-col items-center gap-1 transition ${
                        tool === 'eraser'
                          ? 'bg-black dark:bg-white text-white dark:text-black shadow-xs'
                          : 'bg-white dark:bg-[#282828] text-[#37352f] dark:text-white border border-[#e9e9e7] dark:border-[#333]'
                      }`}
                    >
                      <Eraser className="w-3.5 h-3.5" />
                      <span className="text-[10px]">투명 지우개</span>
                    </button>

                    {/* Crop */}
                    <button
                      onClick={() => {
                        setTool('crop');
                        setIsCropping(true);
                      }}
                      className={`p-2 rounded-lg font-semibold flex flex-col items-center gap-1 transition ${
                        tool === 'crop'
                          ? 'bg-black dark:bg-white text-white dark:text-black shadow-xs'
                          : 'bg-white dark:bg-[#282828] text-[#37352f] dark:text-white border border-[#e9e9e7] dark:border-[#333]'
                      }`}
                    >
                      <Crop className="w-3.5 h-3.5" />
                      <span className="text-[10px]">자르기</span>
                    </button>

                    {/* Rectangle Box */}
                    <button
                      onClick={() => {
                        setTool('rect');
                        setIsCropping(false);
                      }}
                      className={`p-2 rounded-lg font-semibold flex flex-col items-center gap-1 transition ${
                        tool === 'rect'
                          ? 'bg-black dark:bg-white text-white dark:text-black shadow-xs'
                          : 'bg-white dark:bg-[#282828] text-[#37352f] dark:text-white border border-[#e9e9e7] dark:border-[#333]'
                      }`}
                    >
                      <Square className="w-3.5 h-3.5" />
                      <span className="text-[10px]">네모 박스</span>
                    </button>

                    {/* Arrow */}
                    <button
                      onClick={() => {
                        setTool('arrow');
                        setIsCropping(false);
                      }}
                      className={`p-2 rounded-lg font-semibold flex flex-col items-center gap-1 transition ${
                        tool === 'arrow'
                          ? 'bg-black dark:bg-white text-white dark:text-black shadow-xs'
                          : 'bg-white dark:bg-[#282828] text-[#37352f] dark:text-white border border-[#e9e9e7] dark:border-[#333]'
                      }`}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span className="text-[10px]">화살표</span>
                    </button>

                    {/* Mosaic / Blur */}
                    <button
                      onClick={() => {
                        setTool('mosaic');
                        setIsCropping(false);
                      }}
                      className={`p-2 rounded-lg font-semibold flex flex-col items-center gap-1 transition ${
                        tool === 'mosaic'
                          ? 'bg-black dark:bg-white text-white dark:text-black shadow-xs'
                          : 'bg-white dark:bg-[#282828] text-[#37352f] dark:text-white border border-[#e9e9e7] dark:border-[#333]'
                      }`}
                    >
                      <Grid3X3 className="w-3.5 h-3.5" />
                      <span className="text-[10px]">모자이크</span>
                    </button>

                    {/* Text */}
                    <button
                      onClick={() => {
                        setTool('text');
                        setIsCropping(false);
                      }}
                      className={`p-2 rounded-lg font-semibold flex flex-col items-center gap-1 transition ${
                        tool === 'text'
                          ? 'bg-black dark:bg-white text-white dark:text-black shadow-xs'
                          : 'bg-white dark:bg-[#282828] text-[#37352f] dark:text-white border border-[#e9e9e7] dark:border-[#333]'
                      }`}
                    >
                      <Type className="w-3.5 h-3.5" />
                      <span className="text-[10px]">텍스트</span>
                    </button>
                  </div>
                </div>

                {/* Sub Tool Options based on Active Tool */}

                {/* 1. Crop Ratio Submenu */}
                {tool === 'crop' && (
                  <div className="p-4 rounded-xl bg-white dark:bg-[#1f1f1f] border border-[#e9e9e7] dark:border-[#2f2f2f] space-y-3">
                    <span className="text-xs font-bold text-[#37352f] dark:text-white">자르기 비율 프리셋</span>
                    <div className="grid grid-cols-3 gap-1.5 text-xs">
                      {(['free', '1:1', '4:3', '16:9', '3:4', '9:16'] as CropRatio[]).map((r) => (
                        <button
                          key={r}
                          onClick={() => handleRatioSelect(r)}
                          className={`py-1.5 rounded-lg font-mono text-[11px] font-semibold transition ${
                            cropRatio === r
                              ? 'bg-black dark:bg-white text-white dark:text-black'
                              : 'bg-[#f7f6f3] dark:bg-[#282828] text-[#787774] hover:text-black dark:hover:text-white'
                          }`}
                        >
                          {r === 'free' ? '자유' : r}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={applyCrop}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>선택 영역 자르기 적용 (투명도 유지)</span>
                    </button>
                  </div>
                )}

                {/* 2. Color & Size Settings (for brush, highlighter, rect, arrow, eraser) */}
                {(tool === 'brush' || tool === 'highlighter' || tool === 'rect' || tool === 'arrow' || tool === 'eraser' || tool === 'mosaic') && (
                  <div className="p-4 rounded-xl bg-white dark:bg-[#1f1f1f] border border-[#e9e9e7] dark:border-[#2f2f2f] space-y-3.5">
                    {tool !== 'eraser' && tool !== 'mosaic' && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-[#37352f] dark:text-white">도구 색상</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#000000', '#FFFFFF'].map((c) => (
                            <button
                              key={c}
                              onClick={() => setBrushColor(c)}
                              style={{ backgroundColor: c }}
                              className={`w-6 h-6 rounded-full border-2 transition ${
                                brushColor === c ? 'border-black dark:border-white scale-110 shadow-xs' : 'border-neutral-200 dark:border-neutral-700'
                              }`}
                            />
                          ))}
                          <label className="w-6 h-6 rounded-full border border-[#e9e9e7] dark:border-[#444] overflow-hidden cursor-pointer relative flex items-center justify-center bg-linear-to-tr from-rose-500 via-amber-400 to-indigo-500" title="직접 색상 선택">
                            <input
                              type="color"
                              value={brushColor}
                              onChange={(e) => setBrushColor(e.target.value)}
                              className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                            />
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Thickness / Size Slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] text-[#787774]">
                        <span>{tool === 'eraser' ? '지우개 크기' : tool === 'mosaic' ? '모자이크 범위' : '선 두께'}</span>
                        <span className="font-mono font-bold text-[#37352f] dark:text-white">{brushSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="50"
                        value={brushSize}
                        onChange={(e) => setBrushSize(Number(e.target.value))}
                        className="w-full accent-black dark:accent-white"
                      />
                      <div className="flex gap-1.5 pt-1">
                        {[
                          { label: '얇게', size: 3 },
                          { label: '보통', size: 8 },
                          { label: '굵게', size: 18 },
                          { label: '아주 굵게', size: 32 }
                        ].map((s) => (
                          <button
                            key={s.label}
                            onClick={() => setBrushSize(s.size)}
                            className={`flex-1 py-1 rounded text-[10px] font-semibold border transition ${
                              brushSize === s.size
                                ? 'bg-black text-white dark:bg-white dark:text-black'
                                : 'bg-[#f7f6f3] dark:bg-[#282828] text-[#787774] border-transparent'
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {tool === 'eraser' && (
                      <p className="text-[11px] text-[#787774] leading-relaxed bg-[#f7f6f3] dark:bg-[#282828] p-2.5 rounded-lg">
                        💡 <strong>투명 지우개</strong>: 픽셀을 투명하게 지워 배경을 투명(누끼)으로 만듭니다. PNG 저장 시 투명도가 유지됩니다.
                      </p>
                    )}

                    {tool === 'mosaic' && (
                      <p className="text-[11px] text-[#787774] leading-relaxed bg-[#f7f6f3] dark:bg-[#282828] p-2.5 rounded-lg">
                        💡 <strong>모자이크</strong>: 마우스로 문지르거나 클릭하면 개인정보, 얼굴, 계좌번호를 블러 처리합니다.
                      </p>
                    )}
                  </div>
                )}

                {/* 3. Text Settings */}
                {tool === 'text' && (
                  <div className="p-4 rounded-xl bg-white dark:bg-[#1f1f1f] border border-[#e9e9e7] dark:border-[#2f2f2f] space-y-3">
                    <span className="text-xs font-bold text-[#37352f] dark:text-white">텍스트 입력</span>
                    <input
                      type="text"
                      value={insertText}
                      onChange={(e) => setInsertText(e.target.value)}
                      placeholder="삽입할 글씨 입력..."
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#e9e9e7] dark:border-[#333] bg-[#faf9f6] dark:bg-[#1b1b1b] text-[#37352f] dark:text-white"
                    />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] text-[#787774]">글자 크기: {textSize}px</span>
                      <input
                        type="range"
                        min="12"
                        max="72"
                        value={textSize}
                        onChange={(e) => setTextSize(Number(e.target.value))}
                        className="w-28 accent-black dark:accent-white"
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] text-[#787774]">글자 색상:</span>
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="w-7 h-7 rounded border-0 cursor-pointer"
                      />
                    </div>
                    <p className="text-[11px] text-[#787774] bg-[#f7f6f3] dark:bg-[#282828] p-2.5 rounded-lg">
                      💡 사진에서 글씨를 넣고 싶은 위치를 클릭하세요.
                    </p>
                  </div>
                )}

                {/* Canvas Background Preview Selector (for transparent PNG) */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#1f1f1f] border border-[#e9e9e7] dark:border-[#2f2f2f] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#37352f] dark:text-white flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      배경 표시 (투명 PNG 확인)
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    <button
                      onClick={() => setBgMode('checkerboard')}
                      className={`py-1.5 rounded-lg font-semibold transition ${
                        bgMode === 'checkerboard'
                          ? 'bg-black dark:bg-white text-white dark:text-black shadow-xs'
                          : 'bg-[#f7f6f3] dark:bg-[#282828] text-[#787774]'
                      }`}
                    >
                      🏁 체커보드 (투명)
                    </button>
                    <button
                      onClick={() => setBgMode('white')}
                      className={`py-1.5 rounded-lg font-semibold transition ${
                        bgMode === 'white'
                          ? 'bg-black dark:bg-white text-white dark:text-black shadow-xs'
                          : 'bg-[#f7f6f3] dark:bg-[#282828] text-[#787774]'
                      }`}
                    >
                      ⚪ 흰색 배경
                    </button>
                    <button
                      onClick={() => setBgMode('dark')}
                      className={`py-1.5 rounded-lg font-semibold transition ${
                        bgMode === 'dark'
                          ? 'bg-black dark:bg-white text-white dark:text-black shadow-xs'
                          : 'bg-[#f7f6f3] dark:bg-[#282828] text-[#787774]'
                      }`}
                    >
                      ⚫ 다크 배경
                    </button>
                  </div>
                </div>

                {/* Rotation & Flip */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#1f1f1f] border border-[#e9e9e7] dark:border-[#2f2f2f] space-y-2.5">
                  <span className="text-xs font-bold text-[#37352f] dark:text-white">회전 및 반전</span>
                  <div className="grid grid-cols-4 gap-1.5 text-xs">
                    <button
                      onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                      className="py-1.5 rounded-lg bg-[#f7f6f3] dark:bg-[#282828] hover:bg-[#efefed] flex flex-col items-center gap-1 text-[#37352f] dark:text-white"
                      title="좌로 90도 회전"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="text-[10px]">좌 90°</span>
                    </button>
                    <button
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="py-1.5 rounded-lg bg-[#f7f6f3] dark:bg-[#282828] hover:bg-[#efefed] flex flex-col items-center gap-1 text-[#37352f] dark:text-white"
                      title="우로 90도 회전"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span className="text-[10px]">우 90°</span>
                    </button>
                    <button
                      onClick={() => setFlipH((f) => !f)}
                      className={`py-1.5 rounded-lg flex flex-col items-center gap-1 transition ${
                        flipH ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-[#f7f6f3] dark:bg-[#282828] text-[#37352f] dark:text-white'
                      }`}
                      title="좌우 반전"
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" />
                      <span className="text-[10px]">좌우반전</span>
                    </button>
                    <button
                      onClick={() => setFlipV((f) => !f)}
                      className={`py-1.5 rounded-lg flex flex-col items-center gap-1 transition ${
                        flipV ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-[#f7f6f3] dark:bg-[#282828] text-[#37352f] dark:text-white'
                      }`}
                      title="상하 반전"
                    >
                      <FlipVertical className="w-3.5 h-3.5" />
                      <span className="text-[10px]">상하반전</span>
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#1f1f1f] border border-[#e9e9e7] dark:border-[#2f2f2f] space-y-2.5 text-xs">
                  <span className="font-bold text-[#37352f] dark:text-white">색상 및 밝기 조절</span>
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-[#787774]">
                        <span>밝기</span>
                        <span>{brightness}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="150"
                        value={brightness}
                        onChange={(e) => setBrightness(Number(e.target.value))}
                        className="w-full accent-black dark:accent-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-[#787774]">
                        <span>대비</span>
                        <span>{contrast}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="150"
                        value={contrast}
                        onChange={(e) => setContrast(Number(e.target.value))}
                        className="w-full accent-black dark:accent-white"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setGrayscale((g) => !g)}
                        className={`flex-1 py-1 rounded-lg border text-[11px] font-semibold transition ${
                          grayscale ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-[#f7f6f3] dark:bg-[#282828] text-[#787774]'
                        }`}
                      >
                        흑백 모드
                      </button>
                      <button
                        onClick={() => setSepia((s) => !s)}
                        className={`flex-1 py-1 rounded-lg border text-[11px] font-semibold transition ${
                          sepia ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-[#f7f6f3] dark:bg-[#282828] text-[#787774]'
                        }`}
                      >
                        세피아 톤
                      </button>
                    </div>
                  </div>
                </div>

                {/* Export Options */}
                <div className="p-4 rounded-xl bg-[#faf9f6] dark:bg-[#222222] border border-[#e9e9e7] dark:border-[#333] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#37352f] dark:text-white">편집본 다운로드</span>
                    <button
                      onClick={handleResetImage}
                      className="text-[11px] text-[#787774] hover:text-red-500 transition flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>초기화</span>
                    </button>
                  </div>

                  {/* Primary PNG Download (Transparency preserved) */}
                  <button
                    onClick={() => handleExportImage('image/png')}
                    className="w-full py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-bold hover:opacity-90 flex items-center justify-center gap-1.5 shadow-sm transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PNG 다운로드 (투명 배경 유지 100%)</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleExportImage('image/jpeg')}
                      className="py-2 rounded-lg bg-white dark:bg-[#2a2a2a] hover:bg-[#efefed] dark:hover:bg-[#333] border border-[#e9e9e7] dark:border-[#333] text-[#37352f] dark:text-white text-xs font-semibold flex items-center justify-center gap-1 transition"
                    >
                      <Download className="w-3 h-3" />
                      <span>JPG로 저장</span>
                    </button>
                    <button
                      onClick={() => handleExportImage('image/webp')}
                      className="py-2 rounded-lg bg-white dark:bg-[#2a2a2a] hover:bg-[#efefed] dark:hover:bg-[#333] border border-[#e9e9e7] dark:border-[#333] text-[#37352f] dark:text-white text-xs font-semibold flex items-center justify-center gap-1 transition"
                    >
                      <Download className="w-3 h-3" />
                      <span>WEBP로 저장</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Center Canvas Workspace Area (8 cols) */}
              <div className="lg:col-span-8 bg-[#faf9f6] dark:bg-[#151515] border border-[#e9e9e7] dark:border-[#2f2f2f] rounded-2xl p-4 flex flex-col items-center justify-center min-h-[520px] relative overflow-hidden">
                {/* Canvas Container with Custom Background Mode */}
                <div
                  style={getCanvasBgStyle()}
                  className="rounded-xl shadow-md border border-[#e5e7eb] dark:border-[#333] p-1 flex items-center justify-center max-w-full max-h-[640px] overflow-auto"
                >
                  <canvas
                    ref={mainCanvasRef}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    className={`max-w-full max-h-[600px] object-contain rounded select-none ${
                      tool === 'eraser'
                        ? 'cursor-cell'
                        : tool === 'text'
                        ? 'cursor-text'
                        : tool === 'crop'
                        ? 'cursor-crosshair'
                        : 'cursor-crosshair'
                    }`}
                  />
                </div>

                {/* Floating Status Guide Overlay */}
                <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-[#787774]">
                  <span className="flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" />
                    단축키: <strong>Ctrl + Z</strong> (실행 취소) · <strong>Ctrl + Y</strong> (다시 실행)
                  </span>
                  <span>·</span>
                  <span>마우스 드래그로 그리기 및 수정</span>
                </div>

                {/* Crop Box Notice when in crop mode */}
                {tool === 'crop' && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/85 text-white px-5 py-2.5 rounded-full text-xs font-semibold backdrop-blur-md shadow-lg flex items-center gap-2 animate-in fade-in">
                    <Crop className="w-3.5 h-3.5" />
                    <span>자르기 모드 · 좌측에서 비율을 선택하거나 [선택 영역 자르기 적용]을 클릭하세요</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        </>
      )}

      {/* ============================================================== */}
      {/* 2. PDF SUB-PAGE */}
      {/* ============================================================== */}
      {activeTab === 'pdf' && (
        <>
          <NotionPageHeader
            icon="📄"
            title="PDF 문서 편집기"
            description="PDF 페이지별 90도 회전, 불필요한 페이지 삭제, 순서 재배치 및 맞춤 워터마크·머리글 삽입을 브라우저 내에서 안전하게 완결합니다."
            tags={[
              { label: '하위 페이지' },
              { label: 'PDF 페이지 90° 회전' },
              { label: '불필요한 페이지 삭제' },
              { label: '페이지 순서 재배치' },
              { label: '워터마크 삽입' },
            ]}
          />

          <div className="space-y-6">
          {!pdfFile ? (
            /* Upload Dropzone */
            <div
              onClick={() => pdfInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files[0]) handlePdfUpload(e.dataTransfer.files[0]);
              }}
              className="border-2 border-dashed border-[#e3e2e0] dark:border-[#333] hover:border-black dark:hover:border-white rounded-2xl p-12 text-center cursor-pointer transition bg-[#faf9f6]/50 dark:bg-[#1b1b1b]/50 group select-none space-y-3 shadow-2xs hover:shadow-sm"
            >
              <input
                ref={pdfInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handlePdfUpload(e.target.files[0]);
                }}
              />
              <div className="w-12 h-12 mx-auto rounded-xl bg-white dark:bg-[#282828] border border-[#e9e9e7] dark:border-[#333] flex items-center justify-center text-[#787774] group-hover:scale-105 transition-transform">
                <FileText className="w-6 h-6 text-black dark:text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#37352f] dark:text-white">
                  편집할 PDF 문서를 여기에 올려주세요
                </p>
                <p className="text-xs text-[#787774] mt-1">
                  페이지 회전, 불필요한 페이지 삭제, 순서 재배치, 워터마크 추가를 한 번에 처리합니다.
                </p>
              </div>
            </div>
          ) : (
            /* PDF Page Manager Workspace */
            <div className="space-y-5">
              {/* Top Controls Bar */}
              <div className="p-4 rounded-xl bg-[#f7f6f3] dark:bg-[#202020] border border-[#e9e9e7] dark:border-[#2f2f2f] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
                <div>
                  <h3 className="font-bold text-[#37352f] dark:text-white flex items-center gap-2">
                    <span>{pdfFile.name}</span>
                    <span className="font-mono text-[11px] text-[#787774]">
                      ({pdfPages.length}개 페이지 / {formatBytes(pdfFile.size)})
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#787774] mt-0.5">
                    각 페이지의 회전 화살표를 눌러 회전하거나, 삭제 아이콘으로 불필요한 페이지를 제거하세요.
                  </p>
                </div>

                {/* Batch Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => rotateAllPdfPages(90)}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#282828] border border-[#e9e9e7] dark:border-[#333] text-[#37352f] dark:text-white font-semibold flex items-center gap-1.5 transition hover:bg-[#efefed]"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>전체 90° 회전</span>
                  </button>
                  <button
                    onClick={() => {
                      setPdfFile(null);
                      setPdfPages([]);
                    }}
                    className="px-3 py-1.5 rounded-lg text-[#787774] hover:text-red-500 font-semibold transition"
                  >
                    다른 PDF 열기
                  </button>
                </div>
              </div>

              {/* PDF Settings (Watermark & Headers) */}
              <div className="p-4 rounded-xl bg-white dark:bg-[#1f1f1f] border border-[#e9e9e7] dark:border-[#2f2f2f] grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-[#37352f] dark:text-white">워터마크 문구 (선택)</label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="예: CONFIDENTIAL, 기밀문서"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#e9e9e7] dark:border-[#333] bg-[#faf9f6] dark:bg-[#1b1b1b] text-[#37352f] dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-[#37352f] dark:text-white">상단 머리글 (선택)</label>
                  <input
                    type="text"
                    value={headerText}
                    onChange={(e) => setHeaderText(e.target.value)}
                    placeholder="예: 내부 공유용 보고서"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#e9e9e7] dark:border-[#333] bg-[#faf9f6] dark:bg-[#1b1b1b] text-[#37352f] dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-[#37352f] dark:text-white">하단 바닥글</label>
                  <input
                    type="text"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    placeholder="예: AllDesk 문서"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#e9e9e7] dark:border-[#333] bg-[#faf9f6] dark:bg-[#1b1b1b] text-[#37352f] dark:text-white"
                  />
                </div>
              </div>

              {/* Pages Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {pdfPages.map((page, idx) => (
                  <div
                    key={page.id}
                    className="p-3 rounded-xl bg-white dark:bg-[#1f1f1f] border border-[#e9e9e7] dark:border-[#2f2f2f] shadow-xs flex flex-col justify-between space-y-2 group"
                  >
                    {/* Page Thumbnail with Rotation */}
                    <div className="relative aspect-[3/4] bg-[#faf9f6] dark:bg-[#151515] rounded-lg overflow-hidden flex items-center justify-center border border-[#efefed] dark:border-[#282828]">
                      <img
                        src={page.thumbnailUrl}
                        alt={`Page ${idx + 1}`}
                        style={{
                          transform: `rotate(${page.rotation}deg)`,
                          transition: 'transform 0.2s ease',
                        }}
                        className="max-w-full max-h-full object-contain pointer-events-none"
                      />
                      <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md bg-black/70 text-white font-mono text-[10px] font-bold">
                        {idx + 1}
                      </span>
                    </div>

                    {/* Action Buttons for this page */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-[#f0f0ee] dark:border-[#282828]">
                      {/* Move Order */}
                      <div className="flex items-center gap-0.5">
                        <button
                          disabled={idx === 0}
                          onClick={() => movePdfPage(idx, 'left')}
                          className="p-1 rounded hover:bg-[#efefed] dark:hover:bg-[#2c2c2c] disabled:opacity-30"
                          title="왼쪽(앞)으로 이동"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={idx === pdfPages.length - 1}
                          onClick={() => movePdfPage(idx, 'right')}
                          className="p-1 rounded hover:bg-[#efefed] dark:hover:bg-[#2c2c2c] disabled:opacity-30"
                          title="오른쪽(뒤)으로 이동"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Rotate & Delete */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => rotatePdfPage(page.id, 90)}
                          className="p-1 rounded hover:bg-[#efefed] dark:hover:bg-[#2c2c2c]"
                          title="90도 회전"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deletePdfPage(page.id)}
                          className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                          title="페이지 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Export Bar */}
              <div className="sticky bottom-4 z-20 p-4 rounded-2xl bg-white/95 dark:bg-[#1f1f1f]/95 backdrop-blur-md border border-[#e9e9e7] dark:border-[#333] shadow-lg flex items-center justify-between gap-4">
                <div className="text-xs text-[#787774]">
                  총 <strong>{pdfPages.length}개</strong>의 페이지가 저장 준비되었습니다.
                </div>
                <button
                  disabled={isExportingPdf}
                  onClick={handleExportPdf}
                  className="px-6 py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold text-xs flex items-center gap-2 transition hover:opacity-90 shadow-sm disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExportingPdf ? 'PDF 생성 중...' : '수정된 새 PDF 다운로드'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
        </>
      )}
    </div>
  );
};
