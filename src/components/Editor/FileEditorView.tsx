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
  Info,
  Wand2,
  Palette
} from 'lucide-react';
import { NotionPageHeader } from '../NotionLayout/NotionPageHeader';
import {
  loadPdfPagesForEditing,
  exportEditedPdf,
  PdfPageItem,
  PdfEditOptions
} from '../../utils/pdfTools';
import { PdfAnnotationModal } from './PdfAnnotationModal';
import { saveAs } from 'file-saver';
import { formatBytes } from '../../utils/formatters';

import { ActiveTab } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

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
  | 'wand'
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
  const { lang } = useLanguage();
  const L = (ko: string, en: string) => (lang === 'en' ? en : ko);
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
  const [insertText, setInsertText] = useState<string>(L('올데스크 텍스트', 'AllDesk Text'));
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

  // Cutout (Background Removal) state
  const [cutoutTolerance, setCutoutTolerance] = useState<number>(32);
  const [isAutoCutoutProcessing, setIsAutoCutoutProcessing] = useState<boolean>(false);

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
  const [footerText, setFooterText] = useState<string>(L('AllDesk 문서', 'AllDesk Document'));
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // PDF Page Annotation Modal state
  const [selectedAnnotationPage, setSelectedAnnotationPage] = useState<PdfPageItem | null>(null);
  const [isAnnotationModalOpen, setIsAnnotationModalOpen] = useState<boolean>(false);

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
      alert(L('이미지 파일(PNG, JPG, WEBP, GIF 등)만 업로드할 수 있습니다.', 'Only image files (PNG, JPG, WEBP, GIF, etc.) can be uploaded.'));
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
  // AUTOMATIC BACKGROUND REMOVAL (CUTOUT) & MAGIC WAND
  // ==============================================================
  const colorDistance = (
    r1: number, g1: number, b1: number, a1: number,
    r2: number, g2: number, b2: number, a2: number
  ) => {
    if (a1 < 10 && a2 < 10) return 0;
    if (Math.abs(a1 - a2) > 100) return 255;
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    return Math.sqrt(0.299 * dr * dr + 0.587 * dg * dg + 0.114 * db * db);
  };

  const handleAutoCutout = () => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    saveHistoryState();
    setIsAutoCutoutProcessing(true);

    setTimeout(() => {
      try {
        const width = canvas.width;
        const height = canvas.height;
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        // Sample border pixels to detect dominant background color
        let rSum = 0, gSum = 0, bSum = 0, count = 0;
        const step = Math.max(1, Math.floor((width + height) / 120));

        for (let x = 0; x < width; x += step) {
          const topIdx = x * 4;
          const botIdx = ((height - 1) * width + x) * 4;
          if (data[topIdx + 3] > 20) {
            rSum += data[topIdx]; gSum += data[topIdx + 1]; bSum += data[topIdx + 2]; count++;
          }
          if (data[botIdx + 3] > 20) {
            rSum += data[botIdx]; gSum += data[botIdx + 1]; bSum += data[botIdx + 2]; count++;
          }
        }
        for (let y = 0; y < height; y += step) {
          const leftIdx = (y * width) * 4;
          const rightIdx = (y * width + width - 1) * 4;
          if (data[leftIdx + 3] > 20) {
            rSum += data[leftIdx]; gSum += data[leftIdx + 1]; bSum += data[leftIdx + 2]; count++;
          }
          if (data[rightIdx + 3] > 20) {
            rSum += data[rightIdx]; gSum += data[rightIdx + 1]; bSum += data[rightIdx + 2]; count++;
          }
        }

        const bg = count > 0 ? {
          r: Math.round(rSum / count),
          g: Math.round(gSum / count),
          b: Math.round(bSum / count),
          a: 255
        } : { r: 255, g: 255, b: 255, a: 255 };

        const tol = cutoutTolerance;
        const visited = new Uint8Array(width * height);
        const queue = new Int32Array(width * height);
        let head = 0;
        let tail = 0;

        const checkAndEnqueue = (x: number, y: number) => {
          const idx = y * width + x;
          if (visited[idx]) return;
          visited[idx] = 1;
          const pIdx = idx * 4;
          const dist = colorDistance(data[pIdx], data[pIdx + 1], data[pIdx + 2], data[pIdx + 3], bg.r, bg.g, bg.b, bg.a);
          if (dist <= tol * 1.5) {
            queue[tail++] = idx;
          }
        };

        for (let x = 0; x < width; x++) {
          checkAndEnqueue(x, 0);
          checkAndEnqueue(x, height - 1);
        }
        for (let y = 0; y < height; y++) {
          checkAndEnqueue(0, y);
          checkAndEnqueue(width - 1, y);
        }

        while (head < tail) {
          const curr = queue[head++];
          const cx = curr % width;
          const cy = Math.floor(curr / width);
          const pIdx = curr * 4;

          const dist = colorDistance(data[pIdx], data[pIdx + 1], data[pIdx + 2], data[pIdx + 3], bg.r, bg.g, bg.b, bg.a);
          if (dist <= tol) {
            data[pIdx + 3] = 0; // Transparent
          } else if (dist <= tol * 1.4) {
            const feather = (dist - tol) / (tol * 0.4);
            data[pIdx + 3] = Math.min(data[pIdx + 3], Math.round(255 * feather));
          }

          if (cx > 0) {
            const left = curr - 1;
            if (!visited[left]) {
              visited[left] = 1;
              const lIdx = left * 4;
              const d = colorDistance(data[lIdx], data[lIdx + 1], data[lIdx + 2], data[lIdx + 3], bg.r, bg.g, bg.b, bg.a);
              if (d <= tol * 1.5) queue[tail++] = left;
            }
          }
          if (cx < width - 1) {
            const right = curr + 1;
            if (!visited[right]) {
              visited[right] = 1;
              const rIdx = right * 4;
              const d = colorDistance(data[rIdx], data[rIdx + 1], data[rIdx + 2], data[rIdx + 3], bg.r, bg.g, bg.b, bg.a);
              if (d <= tol * 1.5) queue[tail++] = right;
            }
          }
          if (cy > 0) {
            const up = curr - width;
            if (!visited[up]) {
              visited[up] = 1;
              const uIdx = up * 4;
              const d = colorDistance(data[uIdx], data[uIdx + 1], data[uIdx + 2], data[uIdx + 3], bg.r, bg.g, bg.b, bg.a);
              if (d <= tol * 1.5) queue[tail++] = up;
            }
          }
          if (cy < height - 1) {
            const down = curr + width;
            if (!visited[down]) {
              visited[down] = 1;
              const dIdx = down * 4;
              const d = colorDistance(data[dIdx], data[dIdx + 1], data[dIdx + 2], data[dIdx + 3], bg.r, bg.g, bg.b, bg.a);
              if (d <= tol * 1.5) queue[tail++] = down;
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        setBgMode('checkerboard');
      } catch (err) {
        console.error('Auto cutout error:', err);
      } finally {
        setIsAutoCutoutProcessing(false);
      }
    }, 30);
  };

  const handleWandCutoutAt = (startX: number, startY: number) => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const width = canvas.width;
      const height = canvas.height;
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      const px = Math.min(width - 1, Math.max(0, Math.floor(startX)));
      const py = Math.min(height - 1, Math.max(0, Math.floor(startY)));
      const startPixelIdx = (py * width + px) * 4;
      const targetR = data[startPixelIdx];
      const targetG = data[startPixelIdx + 1];
      const targetB = data[startPixelIdx + 2];
      const targetA = data[startPixelIdx + 3];

      if (targetA === 0) return;

      const tol = cutoutTolerance;
      const visited = new Uint8Array(width * height);
      const queue = new Int32Array(width * height);
      let head = 0;
      let tail = 0;

      const rootIdx = py * width + px;
      visited[rootIdx] = 1;
      queue[tail++] = rootIdx;

      while (head < tail) {
        const curr = queue[head++];
        const cx = curr % width;
        const cy = Math.floor(curr / width);
        const pIdx = curr * 4;

        const dist = colorDistance(data[pIdx], data[pIdx + 1], data[pIdx + 2], data[pIdx + 3], targetR, targetG, targetB, targetA);
        if (dist <= tol) {
          data[pIdx + 3] = 0;
        } else if (dist <= tol * 1.4) {
          const feather = (dist - tol) / (tol * 0.4);
          data[pIdx + 3] = Math.min(data[pIdx + 3], Math.round(255 * feather));
        }

        if (cx > 0) {
          const left = curr - 1;
          if (!visited[left]) {
            visited[left] = 1;
            const lIdx = left * 4;
            const d = colorDistance(data[lIdx], data[lIdx + 1], data[lIdx + 2], data[lIdx + 3], targetR, targetG, targetB, targetA);
            if (d <= tol * 1.5) queue[tail++] = left;
          }
        }
        if (cx < width - 1) {
          const right = curr + 1;
          if (!visited[right]) {
            visited[right] = 1;
            const rIdx = right * 4;
            const d = colorDistance(data[rIdx], data[rIdx + 1], data[rIdx + 2], data[rIdx + 3], targetR, targetG, targetB, targetA);
            if (d <= tol * 1.5) queue[tail++] = right;
          }
        }
        if (cy > 0) {
          const up = curr - width;
          if (!visited[up]) {
            visited[up] = 1;
            const uIdx = up * 4;
            const d = colorDistance(data[uIdx], data[uIdx + 1], data[uIdx + 2], data[uIdx + 3], targetR, targetG, targetB, targetA);
            if (d <= tol * 1.5) queue[tail++] = up;
          }
        }
        if (cy < height - 1) {
          const down = curr + width;
          if (!visited[down]) {
            visited[down] = 1;
            const dIdx = down * 4;
            const d = colorDistance(data[dIdx], data[dIdx + 1], data[dIdx + 2], data[dIdx + 3], targetR, targetG, targetB, targetA);
            if (d <= tol * 1.5) queue[tail++] = down;
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
      setBgMode('checkerboard');
    } catch (e) {
      console.warn('Wand cutout error:', e);
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

    if (tool === 'wand') {
      handleWandCutoutAt(x, y);
      setIsDrawing(false);
      return;
    }

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
    if (confirm(L('모든 편집 내용을 취소하고 원본 이미지로 되돌릴까요?', 'Discard all edits and revert to the original image?'))) {
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
      alert(L('PDF 파일만 업로드할 수 있습니다.', 'Only PDF files can be uploaded.'));
      return;
    }
    setPdfFile(file);
    setIsLoadingPdf(true);
    setPdfLoadingProgress(0);

    try {
      const res = await loadPdfPagesForEditing(file, (p) => setPdfLoadingProgress(p));
      setPdfPages(res.pages);
    } catch (err: any) {
      alert(L(`PDF 파일을 불러오는 중 오류가 발생했습니다: ${err.message}`, `Error loading PDF file: ${err.message}`));
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
      alert(L('최소 1개 이상의 페이지가 남아있어야 합니다.', 'At least 1 page must remain.'));
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
      alert(L(`PDF 내보내기 실패: ${err.message}`, `Failed to export PDF: ${err.message}`));
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
          <span>{L('상위 페이지 (파일 편집소)', 'Parent Page (File Editor)')}</span>
        </button>
      </div>

      {/* 1. IMAGE & PNG SUB-PAGE */}
      {activeTab === 'image' && (
        <>
          <NotionPageHeader
            icon="🖼️"
            title={L('PNG & 사진 편집기', 'PNG & Photo Editor')}
            description={L(
              '스마트 원클릭 자동 누끼(배경 투명화), 마술봉 누끼, PNG 투명 배경 유지 및 투명 지우개, 사진 자르기(Crop), 브러시·형광펜, 도형·화살표, 텍스트 및 모자이크 편집을 100% 브라우저 내에서 안전하게 처리합니다.',
              'Safely perform smart one-click auto background removal, magic wand cutout, transparent PNG preservation & eraser, photo cropping, brush/highlighter, shapes/arrows, text, and mosaic blur 100% locally in your browser.'
            )}
            tags={[
              { label: L('하위 페이지', 'Sub-page') },
              { label: L('✨ 스마트 원클릭 자동 누끼', '✨ Smart One-Click Cutout') },
              { label: L('🪄 마술봉 누끼 제거', '🪄 Magic Wand Cutout') },
              { label: L('PNG 투명도 100% 유지', '100% PNG Transparency') },
              { label: L('투명 지우개 (알파 채널 누끼)', 'Transparent Eraser') },
              { label: L('자르기(Crop) 비율 프리셋', 'Crop Ratio Presets') },
              { label: L('네모·화살표 도형', 'Rectangles & Arrows') },
              { label: L('실행 취소(Ctrl+Z)', 'Undo (Ctrl+Z)') },
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
                  {L('수정하거나 자를 PNG/사진 파일을 여기에 드래그하세요', 'Drag & drop a PNG or photo here to edit or crop')}
                </p>
                <p className="text-xs text-[#787774]">
                  {L('PNG(투명 배경 지원), JPG, WEBP, GIF, BMP 지원 · 100% 브라우저 내 오프라인 안전 처리', 'Supports PNG (transparent), JPG, WEBP, GIF, BMP · 100% safe offline browser processing')}
                </p>
              </div>

              {/* Feature Highlights Pills */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <span className="px-2.5 py-1 rounded-full bg-white dark:bg-[#252525] border border-[#e9e9e7] dark:border-[#333] text-[11px] font-semibold text-[#37352f] dark:text-[#d4d4d4]">
                  {L('✨ PNG 투명도 100% 유지', '✨ 100% PNG Transparency')}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-white dark:bg-[#252525] border border-[#e9e9e7] dark:border-[#333] text-[11px] font-semibold text-[#37352f] dark:text-[#d4d4d4]">
                  {L('🧹 투명 지우개 (배경 누끼 제거)', '🧹 Transparent Eraser')}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-white dark:bg-[#252525] border border-[#e9e9e7] dark:border-[#333] text-[11px] font-semibold text-[#37352f] dark:text-[#d4d4d4]">
                  {L('⬛ 사각형/화살표 강조', '⬛ Rectangles & Arrows')}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-white dark:bg-[#252525] border border-[#e9e9e7] dark:border-[#333] text-[11px] font-semibold text-[#37352f] dark:text-[#d4d4d4]">
                  {L('🔲 모자이크 블러', '🔲 Mosaic Blur')}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-white dark:bg-[#252525] border border-[#e9e9e7] dark:border-[#333] text-[11px] font-semibold text-[#37352f] dark:text-[#d4d4d4]">
                  {L('↩️ 실행 취소(Ctrl+Z)', '↩️ Undo (Ctrl+Z)')}
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
                      {imageFile?.name || L('이미지', 'Image')}
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
                    {L('닫기', 'Close')}
                  </button>
                </div>

                {/* Auto Background Removal (Smart Cutout) Card */}
                <div className="p-3.5 rounded-xl bg-linear-to-r from-violet-500/10 via-fuchsia-500/10 to-indigo-500/10 border border-violet-200 dark:border-violet-900/50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-violet-900 dark:text-violet-200 flex items-center gap-1.5">
                      <Wand2 className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                      {L('스마트 원클릭 자동 누끼', 'Smart One-Click Cutout')}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 font-semibold font-mono">
                      {L('100% 로컬', '100% Local')}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#787774] dark:text-[#a0a0a0] leading-relaxed">
                    {L('사진 테두리의 배경색을 자동으로 분석하여 원클릭으로 투명 배경(PNG)을 만듭니다.', 'Automatically analyzes border colors to create a transparent background (PNG) in one click.')}
                  </p>
                  <button
                    disabled={isAutoCutoutProcessing}
                    onClick={handleAutoCutout}
                    className="w-full py-2 px-3 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isAutoCutoutProcessing ? L('배경 분리 분석 중...', 'Removing background...') : L('✨ 원클릭 자동 누끼 따기', '✨ One-Click Remove Background')}</span>
                  </button>

                  <div className="pt-0.5 space-y-1">
                    <div className="flex justify-between text-[10px] text-[#787774]">
                      <span>{L(`누끼 감도 (오차 범위): ${cutoutTolerance}`, `Tolerance: ${cutoutTolerance}`)}</span>
                      <span className="font-mono">{cutoutTolerance < 25 ? L('정밀', 'Precise') : cutoutTolerance > 50 ? L('넓게', 'Wide') : L('표준', 'Standard')}</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="80"
                      value={cutoutTolerance}
                      onChange={(e) => setCutoutTolerance(Number(e.target.value))}
                      className="w-full accent-violet-600 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Primary Editing Tool Palette */}
                <div className="p-4 rounded-xl bg-[#f7f6f3] dark:bg-[#202020] border border-[#e9e9e7] dark:border-[#2f2f2f] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#37352f] dark:text-white flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5" />
                      {L('편집 도구', 'Editing Tools')}
                    </span>

                    {/* Undo / Redo Buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleUndo}
                        disabled={history.length === 0}
                        title={L('실행 취소 (Ctrl+Z)', 'Undo (Ctrl+Z)')}
                        className="p-1.5 rounded-md bg-white dark:bg-[#282828] border border-[#e9e9e7] dark:border-[#333] hover:bg-[#efefed] dark:hover:bg-[#333] disabled:opacity-30 disabled:pointer-events-none transition text-[#37352f] dark:text-white"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={handleRedo}
                        disabled={redoStack.length === 0}
                        title={L('다시 실행 (Ctrl+Y)', 'Redo (Ctrl+Y)')}
                        className="p-1.5 rounded-md bg-white dark:bg-[#282828] border border-[#e9e9e7] dark:border-[#333] hover:bg-[#efefed] dark:hover:bg-[#333] disabled:opacity-30 disabled:pointer-events-none transition text-[#37352f] dark:text-white"
                      >
                        <Redo2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-xs">
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
                      <span className="text-[10px]">{L('펜 그리기', 'Pen')}</span>
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
                      <span className="text-[10px]">{L('형광펜', 'Highlighter')}</span>
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
                      <span className="text-[10px]">{L('투명 지우개', 'Alpha Eraser')}</span>
                    </button>

                    {/* Magic Wand Cutout */}
                    <button
                      onClick={() => {
                        setTool('wand');
                        setIsCropping(false);
                      }}
                      className={`p-2 rounded-lg font-semibold flex flex-col items-center gap-1 transition ${
                        tool === 'wand'
                          ? 'bg-violet-600 text-white shadow-xs'
                          : 'bg-white dark:bg-[#282828] text-[#37352f] dark:text-white border border-[#e9e9e7] dark:border-[#333]'
                      }`}
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span className="text-[10px]">{L('🪄 마술봉 누끼', '🪄 Magic Wand')}</span>
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
                      <span className="text-[10px]">{L('자르기', 'Crop')}</span>
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
                      <span className="text-[10px]">{L('네모 박스', 'Rectangle')}</span>
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
                      <span className="text-[10px]">{L('화살표', 'Arrow')}</span>
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
                      <span className="text-[10px]">{L('모자이크', 'Mosaic')}</span>
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
                      <span className="text-[10px]">{L('텍스트', 'Text')}</span>
                    </button>
                  </div>
                </div>

                {/* Sub Tool Options based on Active Tool */}

                {/* 0. Magic Wand Submenu */}
                {tool === 'wand' && (
                  <div className="p-4 rounded-xl bg-white dark:bg-[#1f1f1f] border border-violet-200 dark:border-violet-900/40 space-y-3">
                    <span className="text-xs font-bold text-violet-900 dark:text-violet-200 flex items-center gap-1.5">
                      <Wand2 className="w-3.5 h-3.5 text-violet-600" />
                      {L('마술봉 누끼 도구 활성화', 'Magic Wand Cutout Active')}
                    </span>
                    <p className="text-[11px] text-[#787774] leading-relaxed">
                      {L('지우고 싶은 배경 위치를 클릭하면, 연결된 동일한 색상 영역을 즉시 투명하게 제거합니다.', 'Click any background area to instantly make connected matching colors transparent.')}
                    </p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-[#787774]">
                        <span>{L('선택 감도 (오차 허용)', 'Selection Tolerance')}</span>
                        <span className="font-mono font-bold text-[#37352f] dark:text-white">{cutoutTolerance}</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="80"
                        value={cutoutTolerance}
                        onChange={(e) => setCutoutTolerance(Number(e.target.value))}
                        className="w-full accent-violet-600"
                      />
                    </div>
                  </div>
                )}

                {/* 1. Crop Ratio Submenu */}
                {tool === 'crop' && (
                  <div className="p-4 rounded-xl bg-white dark:bg-[#1f1f1f] border border-[#e9e9e7] dark:border-[#2f2f2f] space-y-3">
                    <span className="text-xs font-bold text-[#37352f] dark:text-white">{L('자르기 비율 프리셋', 'Crop Aspect Ratio')}</span>
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
                          {r === 'free' ? L('자유', 'Free') : r}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={applyCrop}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{L('선택 영역 자르기 적용 (투명도 유지)', 'Apply Crop (Preserve Transparency)')}</span>
                    </button>
                  </div>
                )}

                {/* 2. Color & Size Settings (for brush, highlighter, rect, arrow, eraser) */}
                {(tool === 'brush' || tool === 'highlighter' || tool === 'rect' || tool === 'arrow' || tool === 'eraser' || tool === 'mosaic') && (
                  <div className="p-4 rounded-xl bg-white dark:bg-[#1f1f1f] border border-[#e9e9e7] dark:border-[#2f2f2f] space-y-3.5">
                    {tool !== 'eraser' && tool !== 'mosaic' && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-[#37352f] dark:text-white">{L('도구 색상', 'Tool Color')}</span>
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
                          <label className="w-6 h-6 rounded-full border border-[#e9e9e7] dark:border-[#444] overflow-hidden cursor-pointer relative flex items-center justify-center bg-linear-to-tr from-rose-500 via-amber-400 to-indigo-500" title={L('직접 색상 선택', 'Custom Color')}>
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
                        <span>{tool === 'eraser' ? L('지우개 크기', 'Eraser Size') : tool === 'mosaic' ? L('모자이크 범위', 'Mosaic Range') : L('선 두께', 'Stroke Width')}</span>
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
                          { label: L('얇게', 'Thin'), size: 3 },
                          { label: L('보통', 'Medium'), size: 8 },
                          { label: L('굵게', 'Thick'), size: 18 },
                          { label: L('아주 굵게', 'Extra'), size: 32 }
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
                        {lang === 'en' ? (
                          <>💡 <strong>Alpha Eraser</strong>: Erases pixels to transparency for clean cutouts. Transparency is preserved when saving as PNG.</>
                        ) : (
                          <>💡 <strong>투명 지우개</strong>: 픽셀을 투명하게 지워 배경을 투명(누끼)으로 만듭니다. PNG 저장 시 투명도가 유지됩니다.</>
                        )}
                      </p>
                    )}

                    {tool === 'mosaic' && (
                      <p className="text-[11px] text-[#787774] leading-relaxed bg-[#f7f6f3] dark:bg-[#282828] p-2.5 rounded-lg">
                        {lang === 'en' ? (
                          <>💡 <strong>Mosaic</strong>: Drag or click to pixelate sensitive info, faces, or account numbers.</>
                        ) : (
                          <>💡 <strong>모자이크</strong>: 마우스로 문지르거나 클릭하면 개인정보, 얼굴, 계좌번호를 블러 처리합니다.</>
                        )}
                      </p>
                    )}
                  </div>
                )}

                {/* 3. Text Settings */}
                {tool === 'text' && (
                  <div className="p-4 rounded-xl bg-white dark:bg-[#1f1f1f] border border-[#e9e9e7] dark:border-[#2f2f2f] space-y-3">
                    <span className="text-xs font-bold text-[#37352f] dark:text-white">{L('텍스트 입력', 'Text Input')}</span>
                    <input
                      type="text"
                      value={insertText}
                      onChange={(e) => setInsertText(e.target.value)}
                      placeholder={L('삽입할 글씨 입력...', 'Enter text to insert...')}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#e9e9e7] dark:border-[#333] bg-[#faf9f6] dark:bg-[#1b1b1b] text-[#37352f] dark:text-white"
                    />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] text-[#787774]">{L(`글자 크기: ${textSize}px`, `Font Size: ${textSize}px`)}</span>
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
                      <span className="text-[11px] text-[#787774]">{L('글자 색상:', 'Text Color:')}</span>
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="w-7 h-7 rounded border-0 cursor-pointer"
                      />
                    </div>
                    <p className="text-[11px] text-[#787774] bg-[#f7f6f3] dark:bg-[#282828] p-2.5 rounded-lg">
                      {L('💡 사진에서 글씨를 넣고 싶은 위치를 클릭하세요.', '💡 Click anywhere on the image to place text.')}
                    </p>
                  </div>
                )}

                {/* Canvas Background Preview Selector (for transparent PNG) */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#1f1f1f] border border-[#e9e9e7] dark:border-[#2f2f2f] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#37352f] dark:text-white flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      {L('배경 표시 (투명 PNG 확인)', 'Background Preview (PNG)')}
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
                      {L('🏁 체커보드 (투명)', '🏁 Checkerboard')}
                    </button>
                    <button
                      onClick={() => setBgMode('white')}
                      className={`py-1.5 rounded-lg font-semibold transition ${
                        bgMode === 'white'
                          ? 'bg-black dark:bg-white text-white dark:text-black shadow-xs'
                          : 'bg-[#f7f6f3] dark:bg-[#282828] text-[#787774]'
                      }`}
                    >
                      {L('⚪ 흰색 배경', '⚪ White')}
                    </button>
                    <button
                      onClick={() => setBgMode('dark')}
                      className={`py-1.5 rounded-lg font-semibold transition ${
                        bgMode === 'dark'
                          ? 'bg-black dark:bg-white text-white dark:text-black shadow-xs'
                          : 'bg-[#f7f6f3] dark:bg-[#282828] text-[#787774]'
                      }`}
                    >
                      {L('⚫ 다크 배경', '⚫ Dark')}
                    </button>
                  </div>
                </div>

                {/* Rotation & Flip */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#1f1f1f] border border-[#e9e9e7] dark:border-[#2f2f2f] space-y-2.5">
                  <span className="text-xs font-bold text-[#37352f] dark:text-white">{L('회전 및 반전', 'Rotate & Flip')}</span>
                  <div className="grid grid-cols-4 gap-1.5 text-xs">
                    <button
                      onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                      className="py-1.5 rounded-lg bg-[#f7f6f3] dark:bg-[#282828] hover:bg-[#efefed] flex flex-col items-center gap-1 text-[#37352f] dark:text-white"
                      title={L('좌로 90도 회전', 'Rotate Left 90°')}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="text-[10px]">{L('좌 90°', 'Left 90°')}</span>
                    </button>
                    <button
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="py-1.5 rounded-lg bg-[#f7f6f3] dark:bg-[#282828] hover:bg-[#efefed] flex flex-col items-center gap-1 text-[#37352f] dark:text-white"
                      title={L('우로 90도 회전', 'Rotate Right 90°')}
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span className="text-[10px]">{L('우 90°', 'Right 90°')}</span>
                    </button>
                    <button
                      onClick={() => setFlipH((f) => !f)}
                      className={`py-1.5 rounded-lg flex flex-col items-center gap-1 transition ${
                        flipH ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-[#f7f6f3] dark:bg-[#282828] text-[#37352f] dark:text-white'
                      }`}
                      title={L('좌우 반전', 'Flip Horizontal')}
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" />
                      <span className="text-[10px]">{L('좌우반전', 'Flip H')}</span>
                    </button>
                    <button
                      onClick={() => setFlipV((f) => !f)}
                      className={`py-1.5 rounded-lg flex flex-col items-center gap-1 transition ${
                        flipV ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-[#f7f6f3] dark:bg-[#282828] text-[#37352f] dark:text-white'
                      }`}
                      title={L('상하 반전', 'Flip Vertical')}
                    >
                      <FlipVertical className="w-3.5 h-3.5" />
                      <span className="text-[10px]">{L('상하반전', 'Flip V')}</span>
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#1f1f1f] border border-[#e9e9e7] dark:border-[#2f2f2f] space-y-2.5 text-xs">
                  <span className="font-bold text-[#37352f] dark:text-white">{L('색상 및 밝기 조절', 'Color & Brightness')}</span>
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-[#787774]">
                        <span>{L('밝기', 'Brightness')}</span>
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
                        <span>{L('대비', 'Contrast')}</span>
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
                        {L('흑백 모드', 'Grayscale')}
                      </button>
                      <button
                        onClick={() => setSepia((s) => !s)}
                        className={`flex-1 py-1 rounded-lg border text-[11px] font-semibold transition ${
                          sepia ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-[#f7f6f3] dark:bg-[#282828] text-[#787774]'
                        }`}
                      >
                        {L('세피아 톤', 'Sepia')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Export Options */}
                <div className="p-4 rounded-xl bg-[#faf9f6] dark:bg-[#222222] border border-[#e9e9e7] dark:border-[#333] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#37352f] dark:text-white">{L('편집본 다운로드', 'Download Edited')}</span>
                    <button
                      onClick={handleResetImage}
                      className="text-[11px] text-[#787774] hover:text-red-500 transition flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>{L('초기화', 'Reset')}</span>
                    </button>
                  </div>

                  {/* Primary PNG Download (Transparency preserved) */}
                  <button
                    onClick={() => handleExportImage('image/png')}
                    className="w-full py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-bold hover:opacity-90 flex items-center justify-center gap-1.5 shadow-sm transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{L('PNG 다운로드 (투명 배경 유지 100%)', 'Download PNG (100% Transparent)')}</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleExportImage('image/jpeg')}
                      className="py-2 rounded-lg bg-white dark:bg-[#2a2a2a] hover:bg-[#efefed] dark:hover:bg-[#333] border border-[#e9e9e7] dark:border-[#333] text-[#37352f] dark:text-white text-xs font-semibold flex items-center justify-center gap-1 transition"
                    >
                      <Download className="w-3 h-3" />
                      <span>{L('JPG로 저장', 'Save as JPG')}</span>
                    </button>
                    <button
                      onClick={() => handleExportImage('image/webp')}
                      className="py-2 rounded-lg bg-white dark:bg-[#2a2a2a] hover:bg-[#efefed] dark:hover:bg-[#333] border border-[#e9e9e7] dark:border-[#333] text-[#37352f] dark:text-white text-xs font-semibold flex items-center justify-center gap-1 transition"
                    >
                      <Download className="w-3 h-3" />
                      <span>{L('WEBP로 저장', 'Save as WEBP')}</span>
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
                        : tool === 'wand'
                        ? 'cursor-crosshair'
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
                    {lang === 'en' ? (
                      <>Shortcuts: <strong>Ctrl + Z</strong> (Undo) · <strong>Ctrl + Y</strong> (Redo)</>
                    ) : (
                      <>단축키: <strong>Ctrl + Z</strong> (실행 취소) · <strong>Ctrl + Y</strong> (다시 실행)</>
                    )}
                  </span>
                  <span>·</span>
                  <span>{L('마우스 드래그로 그리기 및 수정', 'Drag mouse to draw and edit')}</span>
                </div>

                {/* Crop Box Notice when in crop mode */}
                {tool === 'crop' && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/85 text-white px-5 py-2.5 rounded-full text-xs font-semibold backdrop-blur-md shadow-lg flex items-center gap-2 animate-in fade-in">
                    <Crop className="w-3.5 h-3.5" />
                    <span>{L('자르기 모드 · 좌측에서 비율을 선택하거나 [선택 영역 자르기 적용]을 클릭하세요', 'Crop Mode · Choose an aspect ratio on the left or click [Apply Crop]')}</span>
                  </div>
                )}

                {/* Wand Mode Notice */}
                {tool === 'wand' && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-violet-950/90 text-white px-5 py-2.5 rounded-full text-xs font-semibold backdrop-blur-md shadow-lg flex items-center gap-2 animate-in fade-in border border-violet-800">
                    <Wand2 className="w-3.5 h-3.5 text-violet-300" />
                    <span>{L('마술봉 누끼 모드 · 투명하게 지우고 싶은 배경 영역을 클릭하세요', 'Magic Wand Mode · Click any background area to make it transparent')}</span>
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
            title={L('PDF 문서 편집기', 'PDF Document Editor')}
            description={L(
              'PDF 페이지별 그림판 그리기 & 주석 쓰기, 90도 회전, 불필요한 페이지 삭제, 순서 재배치 및 맞춤 워터마크·머리글 삽입을 브라우저 내에서 100% 안전하게 완결합니다.',
              'Draw & annotate on any PDF page, rotate 90°, delete unwanted pages, reorder pages, and add custom watermarks or headers 100% locally in your browser.'
            )}
            tags={[
              { label: L('하위 페이지', 'Sub-page') },
              { label: L('🎨 페이지별 그림판 & 주석 쓰기', '🎨 Per-Page Paint & Annotations') },
              { label: L('PDF 페이지 90° 회전', '90° Page Rotation') },
              { label: L('불필요한 페이지 삭제', 'Delete Pages') },
              { label: L('페이지 순서 재배치', 'Reorder Pages') },
              { label: L('워터마크 삽입', 'Add Watermark') },
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
                  {L('편집할 PDF 문서를 여기에 올려주세요', 'Drop a PDF document here to edit')}
                </p>
                <p className="text-xs text-[#787774] mt-1">
                  {L('페이지별 그림판 주석 쓰기, 회전, 삭제, 순서 재배치, 워터마크 추가를 한 번에 처리합니다.', 'Paint annotations per page, rotate, delete, reorder, and add watermarks all in one place.')}
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
                      ({lang === 'en' ? `${pdfPages.length} pages` : `${pdfPages.length}개 페이지`} / {formatBytes(pdfFile.size)})
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#787774] mt-0.5">
                    {lang === 'en' ? (
                      <>Click <strong>[Paint / Annotate]</strong> on any page to draw, highlight, add text/whiteout, or rotate &amp; reorder pages.</>
                    ) : (
                      <>각 페이지의 <strong>[그림판 / 주석 쓰기]</strong>를 눌러 펜·형광펜·텍스트·화이트를 입력하거나 회전/순서를 변경하세요.</>
                    )}
                  </p>
                </div>

                {/* Batch Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => rotateAllPdfPages(90)}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#282828] border border-[#e9e9e7] dark:border-[#333] text-[#37352f] dark:text-white font-semibold flex items-center gap-1.5 transition hover:bg-[#efefed]"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>{L('전체 90° 회전', 'Rotate All 90°')}</span>
                  </button>
                  <button
                    onClick={() => {
                      setPdfFile(null);
                      setPdfPages([]);
                    }}
                    className="px-3 py-1.5 rounded-lg text-[#787774] hover:text-red-500 font-semibold transition"
                  >
                    {L('다른 PDF 열기', 'Open Another PDF')}
                  </button>
                </div>
              </div>

              {/* PDF Settings (Watermark & Headers) */}
              <div className="p-4 rounded-xl bg-white dark:bg-[#1f1f1f] border border-[#e9e9e7] dark:border-[#2f2f2f] grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-[#37352f] dark:text-white">{L('워터마크 문구 (선택)', 'Watermark Text (Optional)')}</label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder={L('예: CONFIDENTIAL, 기밀문서', 'e.g. CONFIDENTIAL, DRAFT')}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#e9e9e7] dark:border-[#333] bg-[#faf9f6] dark:bg-[#1b1b1b] text-[#37352f] dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-[#37352f] dark:text-white">{L('상단 머리글 (선택)', 'Header Text (Optional)')}</label>
                  <input
                    type="text"
                    value={headerText}
                    onChange={(e) => setHeaderText(e.target.value)}
                    placeholder={L('예: 내부 공유용 보고서', 'e.g. Internal Report')}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#e9e9e7] dark:border-[#333] bg-[#faf9f6] dark:bg-[#1b1b1b] text-[#37352f] dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-[#37352f] dark:text-white">{L('하단 바닥글', 'Footer Text')}</label>
                  <input
                    type="text"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    placeholder={L('예: AllDesk 문서', 'e.g. AllDesk Document')}
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

                      {/* Page Index Badge */}
                      <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md bg-black/70 text-white font-mono text-[10px] font-bold">
                        {idx + 1}
                      </span>

                      {/* Annotation Badge if present */}
                      {page.annotationDataUrl && (
                        <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-bold shadow-xs flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>{L('주석 있음', 'Annotated')}</span>
                        </span>
                      )}
                    </div>

                    {/* Paint / Annotation Button */}
                    <div className="space-y-1 pt-1">
                      <button
                        onClick={() => {
                          setSelectedAnnotationPage(page);
                          setIsAnnotationModalOpen(true);
                        }}
                        className={`w-full py-1.5 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 transition border ${
                          page.annotationDataUrl
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/40 hover:bg-indigo-100'
                            : 'bg-white dark:bg-[#282828] text-[#37352f] dark:text-white border-[#e9e9e7] dark:border-[#333] hover:bg-[#efefed]'
                        }`}
                      >
                        <Edit3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>{page.annotationDataUrl ? L('그림판 / 주석 수정', 'Edit Paint / Notes') : L('그림판 / 주석 쓰기', 'Paint / Annotate')}</span>
                      </button>

                      {page.annotationDataUrl && (
                        <button
                          onClick={() => {
                            if (confirm(lang === 'en' ? `Delete annotations on page ${idx + 1}?` : `${idx + 1}페이지의 주석을 삭제할까요?`)) {
                              setPdfPages((prev) =>
                                prev.map((p) =>
                                  p.id === page.id ? { ...p, annotationDataUrl: undefined } : p
                                )
                              );
                            }
                          }}
                          className="w-full py-0.5 text-[10px] text-[#787774] hover:text-red-500 transition text-center"
                        >
                          {L('주석 지우기', 'Clear Annotations')}
                        </button>
                      )}
                    </div>

                    {/* Action Buttons for this page (Move / Rotate / Delete) */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-[#f0f0ee] dark:border-[#282828]">
                      {/* Move Order */}
                      <div className="flex items-center gap-0.5">
                        <button
                          disabled={idx === 0}
                          onClick={() => movePdfPage(idx, 'left')}
                          className="p-1 rounded hover:bg-[#efefed] dark:hover:bg-[#2c2c2c] disabled:opacity-30"
                          title={L('왼쪽(앞)으로 이동', 'Move Left (Earlier)')}
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={idx === pdfPages.length - 1}
                          onClick={() => movePdfPage(idx, 'right')}
                          className="p-1 rounded hover:bg-[#efefed] dark:hover:bg-[#2c2c2c] disabled:opacity-30"
                          title={L('오른쪽(뒤)으로 이동', 'Move Right (Later)')}
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Rotate & Delete */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => rotatePdfPage(page.id, 90)}
                          className="p-1 rounded hover:bg-[#efefed] dark:hover:bg-[#2c2c2c]"
                          title={L('90도 회전', 'Rotate 90°')}
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deletePdfPage(page.id)}
                          className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                          title={L('페이지 삭제', 'Delete Page')}
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
                  {lang === 'en' ? (
                    <><strong>{pdfPages.length}</strong> page(s) ready to save.</>
                  ) : (
                    <>총 <strong>{pdfPages.length}개</strong>의 페이지가 저장 준비되었습니다.</>
                  )}
                  {pdfPages.some((p) => p.annotationDataUrl) && (
                    <span className="ml-2 font-semibold text-indigo-600 dark:text-indigo-400">
                      {lang === 'en'
                        ? `(${pdfPages.filter((p) => p.annotationDataUrl).length} annotated)`
                        : `(주석 포함 ${pdfPages.filter((p) => p.annotationDataUrl).length}장)`}
                    </span>
                  )}
                </div>
                <button
                  disabled={isExportingPdf}
                  onClick={handleExportPdf}
                  className="px-6 py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold text-xs flex items-center gap-2 transition hover:opacity-90 shadow-sm disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExportingPdf ? L('PDF 생성 중...', 'Generating PDF...') : L('수정된 새 PDF 다운로드', 'Download Edited PDF')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
        </>
      )}

      {/* PDF Paint & Annotation Modal */}
      {isAnnotationModalOpen && selectedAnnotationPage && pdfFile && (
        <PdfAnnotationModal
          isOpen={isAnnotationModalOpen}
          onClose={() => {
            setIsAnnotationModalOpen(false);
            setSelectedAnnotationPage(null);
          }}
          pdfFile={pdfFile}
          pageItem={selectedAnnotationPage}
          pageNumber={pdfPages.findIndex((p) => p.id === selectedAnnotationPage.id) + 1}
          onSaveAnnotation={(pageId, annotationDataUrl, combinedThumbnailUrl) => {
            setPdfPages((prev) =>
              prev.map((p) =>
                p.id === pageId
                  ? { ...p, annotationDataUrl, thumbnailUrl: combinedThumbnailUrl }
                  : p
              )
            );
            setIsAnnotationModalOpen(false);
            setSelectedAnnotationPage(null);
          }}
        />
      )}
    </div>
  );
};
