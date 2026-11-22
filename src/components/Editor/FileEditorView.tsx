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
  Shield,
  Download,
  Trash2,
  ArrowLeft,
  ArrowRight,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Check,
  Undo2,
  Sparkles,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2
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

type EditorTab = 'image' | 'pdf';

type CropRatio = 'free' | '1:1' | '4:3' | '16:9' | '3:4' | '9:16';

interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const FileEditorView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<EditorTab>('image');

  // ==============================================================
  // 1. IMAGE EDITOR STATE
  // ==============================================================
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);

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
  const [isDraggingCrop, setIsDraggingCrop] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Drawing / Annotations
  const [tool, setTool] = useState<'none' | 'crop' | 'brush' | 'text' | 'mosaic'>('none');
  const [brushColor, setBrushColor] = useState<string>('#EF4444');
  const [brushSize, setBrushSize] = useState<number>(6);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  // Text insertion
  const [insertText, setInsertText] = useState<string>('샘플 텍스트');
  const [textColor, setTextColor] = useState<string>('#000000');
  const [textSize, setTextSize] = useState<number>(24);

  // Canvas refs
  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // History stack for undo
  const [history, setHistory] = useState<ImageData[]>([]);

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

  // ==============================================================
  // IMAGE HANDLERS
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
        setRotation(0);
        setFlipH(false);
        setFlipV(false);
        setBrightness(100);
        setContrast(100);
        setSaturation(100);
        setGrayscale(false);
        setSepia(false);
        setTool('none');
        setIsCropping(false);
        setHistory([]);
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

    // Determine width and height after rotation
    const isRotated90 = rotation === 90 || rotation === 270;
    const w = isRotated90 ? originalImage.naturalHeight : originalImage.naturalWidth;
    const h = isRotated90 ? originalImage.naturalWidth : originalImage.naturalHeight;

    canvas.width = w;
    canvas.height = h;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // Apply Filters
    let filterStr = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    if (grayscale) filterStr += ' grayscale(100%)';
    if (sepia) filterStr += ' sepia(100%)';
    ctx.filter = filterStr;

    // Transform Matrix
    ctx.translate(w / 2, h / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

    ctx.drawImage(
      originalImage,
      -originalImage.naturalWidth / 2,
      -originalImage.naturalHeight / 2
    );

    ctx.restore();

    // Default crop box based on canvas size
    setCropBox((prev) => {
      const pad = Math.min(w, h) * 0.1;
      return {
        x: pad,
        y: pad,
        width: Math.max(100, w - pad * 2),
        height: Math.max(100, h - pad * 2),
      };
    });
  }, [originalImage, rotation, flipH, flipV, brightness, contrast, saturation, grayscale, sepia]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Apply Crop
  const applyCrop = () => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y, width, height } = cropBox;
    if (width <= 10 || height <= 10) return;

    const croppedData = ctx.getImageData(x, y, width, height);

    // Create a new image from cropped data
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.putImageData(croppedData, 0, 0);

    const croppedImg = new Image();
    croppedImg.onload = () => {
      setOriginalImage(croppedImg);
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
      setIsCropping(false);
      setTool('none');
    };
    croppedImg.src = tempCanvas.toDataURL();
  };

  // Preset Ratio Handler
  const handleRatioSelect = (ratio: CropRatio) => {
    setCropRatio(ratio);
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const maxW = canvas.width * 0.8;
    const maxH = canvas.height * 0.8;

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
      x: (canvas.width - targetW) / 2,
      y: (canvas.height - targetH) / 2,
      width: targetW,
      height: targetH,
    });
  };

  // Drawing & Annotation Mouse Handlers
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (tool === 'brush') {
      setIsDrawing(true);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    } else if (tool === 'text') {
      const ctx = canvas.getContext('2d');
      if (ctx && insertText.trim()) {
        ctx.font = `bold ${textSize}px Pretendard, sans-serif`;
        ctx.fillStyle = textColor;
        ctx.fillText(insertText, x, y);
      }
    } else if (tool === 'mosaic') {
      // Apply pixelated blur on a 40x40 area around click
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const boxSize = 40;
        const imgData = ctx.getImageData(x - boxSize / 2, y - boxSize / 2, boxSize, boxSize);
        // Pixelate
        const pixelSize = 8;
        for (let py = 0; py < boxSize; py += pixelSize) {
          for (let px = 0; px < boxSize; px += pixelSize) {
            const i = (py * boxSize + px) * 4;
            const r = imgData.data[i];
            const g = imgData.data[i + 1];
            const b = imgData.data[i + 2];
            for (let dy = 0; dy < pixelSize; dy++) {
              for (let dx = 0; dx < pixelSize; dx++) {
                if (px + dx < boxSize && py + dy < boxSize) {
                  const targetI = ((py + dy) * boxSize + (px + dx)) * 4;
                  imgData.data[targetI] = r;
                  imgData.data[targetI + 1] = g;
                  imgData.data[targetI + 2] = b;
                }
              }
            }
          }
        }
        ctx.putImageData(imgData, x - boxSize / 2, y - boxSize / 2);
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || tool !== 'brush') return;
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDrawing(false);
  };

  // Export Edited Image
  const handleExportImage = (format: 'image/png' | 'image/jpeg' | 'image/webp') => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) {
        const ext = format === 'image/png' ? 'png' : format === 'image/jpeg' ? 'jpg' : 'webp';
        const base = imageFile?.name.replace(/\.[^.]+$/, '') || 'edited_image';
        saveAs(blob, `${base}_edited.${ext}`);
      }
    }, format, 0.95);
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

  // Rotate single PDF page
  const rotatePdfPage = (id: string, delta: number) => {
    setPdfPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, rotation: (p.rotation + delta + 360) % 360 } : p))
    );
  };

  // Rotate all PDF pages
  const rotateAllPdfPages = (delta: number) => {
    setPdfPages((prev) =>
      prev.map((p) => ({ ...p, rotation: (p.rotation + delta + 360) % 360 }))
    );
  };

  // Delete PDF page
  const deletePdfPage = (id: string) => {
    if (pdfPages.length <= 1) {
      alert('최소 1개 이상의 페이지가 남아있어야 합니다.');
      return;
    }
    setPdfPages((prev) => prev.filter((p) => p.id !== id));
  };

  // Move PDF page order
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

  // Export modified PDF
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

  return (
    <div className="space-y-6 pb-20">
      {/* Notion Page Header */}
      <NotionPageHeader
        icon="✂️"
        title="파일 편집기"
        description="사진 자르기(Crop)와 이미지 보정/수정, 그리고 PDF 문서의 페이지 회전·삭제·순서변경 및 워터마크 추가를 브라우저 내에서 안전하게 완결합니다."
        tags={[
          { label: '사진 자르기 (다양한 비율 크롭)' },
          { label: '이미지 보정/필터/텍스트' },
          { label: 'PDF 페이지 순서 및 회전 편집' },
          { label: '워터마크 삽입' },
          { label: '100% 로컬 보안' },
        ]}
      />

      {/* Mode Selector Tabs */}
      <div className="flex overflow-x-auto no-scrollbar items-center gap-1.5 border-b border-[#e9e9e7] dark:border-[#2f2f2f] pb-3 text-xs">
        <button
          onClick={() => setActiveTab('image')}
          className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition ${
            activeTab === 'image'
              ? 'bg-black dark:bg-white text-white dark:text-black'
              : 'text-[#787774] hover:bg-[#efefed] dark:hover:bg-[#2c2c2c]'
          }`}
        >
          <Crop className="w-3.5 h-3.5 shrink-0" />
          <span>사진 자르기 & 이미지 편집기 (PNG/JPG/WEBP)</span>
        </button>

        <button
          onClick={() => setActiveTab('pdf')}
          className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition ${
            activeTab === 'pdf'
              ? 'bg-black dark:bg-white text-white dark:text-black'
              : 'text-[#787774] hover:bg-[#efefed] dark:hover:bg-[#2c2c2c]'
          }`}
        >
          <FileText className="w-3.5 h-3.5 shrink-0" />
          <span>PDF 페이지 편집 & 워터마크</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* 1. IMAGE EDITOR & CROPPER TAB */}
      {/* ============================================================== */}
      {activeTab === 'image' && (
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
              className="border-2 border-dashed border-[#e3e2e0] dark:border-[#333] hover:border-black dark:hover:border-white rounded-2xl p-12 text-center cursor-pointer transition bg-[#faf9f6]/50 dark:bg-[#1b1b1b]/50 group select-none space-y-3"
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
              <div className="w-12 h-12 mx-auto rounded-xl bg-white dark:bg-[#282828] border border-[#e9e9e7] dark:border-[#333] flex items-center justify-center text-[#787774] group-hover:scale-105 transition-transform">
                <Crop className="w-6 h-6 text-black dark:text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#37352f] dark:text-white">
                  수정하거나 자를 사진을 여기에 올려주세요
                </p>
                <p className="text-xs text-[#787774] mt-1">
                  PNG, JPG, WEBP, GIF 등 모든 이미지 파일 지원 · 100% 브라우저 내 안전 처리
                </p>
              </div>
            </div>
          ) : (
            /* Image Editor Workspace */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Toolbar & Settings (4 cols) */}
              <div className="lg:col-span-4 space-y-4">
                {/* Tool Selector */}
                <div className="p-4 rounded-xl bg-[#f7f6f3] dark:bg-[#202020] border border-[#e9e9e7] dark:border-[#2f2f2f] space-y-3">
                  <span className="text-xs font-bold text-[#37352f] dark:text-white flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" />
                    편집 도구 선택
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    <button
                      onClick={() => {
                        setTool('crop');
                        setIsCropping(true);
                      }}
                      className={`px-2.5 py-2 rounded-lg font-semibold flex items-center justify-center gap-1 transition ${
                        tool === 'crop'
                          ? 'bg-black dark:bg-white text-white dark:text-black shadow-xs'
                          : 'bg-white dark:bg-[#282828] text-[#37352f] dark:text-white border border-[#e9e9e7] dark:border-[#333]'
                      }`}
                    >
                      <Crop className="w-3.5 h-3.5" />
                      <span>자르기</span>
                    </button>
                    <button
                      onClick={() => {
                        setTool('brush');
                        setIsCropping(false);
                      }}
                      className={`px-2.5 py-2 rounded-lg font-semibold flex items-center justify-center gap-1 transition ${
                        tool === 'brush'
                          ? 'bg-black dark:bg-white text-white dark:text-black shadow-xs'
                          : 'bg-white dark:bg-[#282828] text-[#37352f] dark:text-white border border-[#e9e9e7] dark:border-[#333]'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>그리기</span>
                    </button>
                    <button
                      onClick={() => {
                        setTool('text');
                        setIsCropping(false);
                      }}
                      className={`px-2.5 py-2 rounded-lg font-semibold flex items-center justify-center gap-1 transition ${
                        tool === 'text'
                          ? 'bg-black dark:bg-white text-white dark:text-black shadow-xs'
                          : 'bg-white dark:bg-[#282828] text-[#37352f] dark:text-white border border-[#e9e9e7] dark:border-[#333]'
                      }`}
                    >
                      <Type className="w-3.5 h-3.5" />
                      <span>텍스트</span>
                    </button>
                  </div>
                </div>

                {/* Crop Ratios (when crop tool active) */}
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
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>선택 영역 자르기 적용</span>
                    </button>
                  </div>
                )}

                {/* Brush Settings */}
                {tool === 'brush' && (
                  <div className="p-4 rounded-xl bg-white dark:bg-[#1f1f1f] border border-[#e9e9e7] dark:border-[#2f2f2f] space-y-3">
                    <span className="text-xs font-bold text-[#37352f] dark:text-white">브러시 색상 및 두께</span>
                    <div className="flex items-center gap-2">
                      {['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#000000', '#FFFFFF'].map((c) => (
                        <button
                          key={c}
                          onClick={() => setBrushColor(c)}
                          style={{ backgroundColor: c }}
                          className={`w-6 h-6 rounded-full border-2 transition ${
                            brushColor === c ? 'border-black dark:border-white scale-110' : 'border-transparent'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-[#787774]">
                        <span>굵기</span>
                        <span>{brushSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="30"
                        value={brushSize}
                        onChange={(e) => setBrushSize(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}

                {/* Text Settings */}
                {tool === 'text' && (
                  <div className="p-4 rounded-xl bg-white dark:bg-[#1f1f1f] border border-[#e9e9e7] dark:border-[#2f2f2f] space-y-3">
                    <span className="text-xs font-bold text-[#37352f] dark:text-white">텍스트 삽입</span>
                    <input
                      type="text"
                      value={insertText}
                      onChange={(e) => setInsertText(e.target.value)}
                      placeholder="삽입할 글씨 입력..."
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#e9e9e7] dark:border-[#333] bg-[#faf9f6] dark:bg-[#1b1b1b]"
                    />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] text-[#787774]">색상:</span>
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="w-7 h-7 rounded border-0 cursor-pointer"
                      />
                    </div>
                    <p className="text-[11px] text-[#787774]">
                      💡 사진에서 글씨를 넣고 싶은 위치를 클릭하세요.
                    </p>
                  </div>
                )}

                {/* Rotation & Flip Card */}
                <div className="p-4 rounded-xl bg-white dark:bg-[#1f1f1f] border border-[#e9e9e7] dark:border-[#2f2f2f] space-y-3">
                  <span className="text-xs font-bold text-[#37352f] dark:text-white">회전 및 반전</span>
                  <div className="grid grid-cols-4 gap-1.5 text-xs">
                    <button
                      onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                      className="py-2 rounded-lg bg-[#f7f6f3] dark:bg-[#282828] hover:bg-[#efefed] flex flex-col items-center gap-1"
                      title="좌로 90도 회전"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="text-[10px]">좌 90°</span>
                    </button>
                    <button
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="py-2 rounded-lg bg-[#f7f6f3] dark:bg-[#282828] hover:bg-[#efefed] flex flex-col items-center gap-1"
                      title="우로 90도 회전"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span className="text-[10px]">우 90°</span>
                    </button>
                    <button
                      onClick={() => setFlipH((f) => !f)}
                      className={`py-2 rounded-lg flex flex-col items-center gap-1 transition ${
                        flipH ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-[#f7f6f3] dark:bg-[#282828]'
                      }`}
                      title="좌우 반전"
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" />
                      <span className="text-[10px]">좌우반전</span>
                    </button>
                    <button
                      onClick={() => setFlipV((f) => !f)}
                      className={`py-2 rounded-lg flex flex-col items-center gap-1 transition ${
                        flipV ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-[#f7f6f3] dark:bg-[#282828]'
                      }`}
                      title="상하 반전"
                    >
                      <FlipVertical className="w-3.5 h-3.5" />
                      <span className="text-[10px]">상하반전</span>
                    </button>
                  </div>
                </div>

                {/* Image Filters Card */}
                <div className="p-4 rounded-xl bg-white dark:bg-[#1f1f1f] border border-[#e9e9e7] dark:border-[#2f2f2f] space-y-3 text-xs">
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
                        className="w-full"
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
                        className="w-full"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setGrayscale((g) => !g)}
                        className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold ${
                          grayscale ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-[#f7f6f3] dark:bg-[#282828]'
                        }`}
                      >
                        흑백 모드
                      </button>
                      <button
                        onClick={() => setSepia((s) => !s)}
                        className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold ${
                          sepia ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-[#f7f6f3] dark:bg-[#282828]'
                        }`}
                      >
                        세피아 톤
                      </button>
                    </div>
                  </div>
                </div>

                {/* Export Options */}
                <div className="p-4 rounded-xl bg-[#faf9f6] dark:bg-[#222222] border border-[#e9e9e7] dark:border-[#333] space-y-2.5">
                  <span className="text-xs font-bold text-[#37352f] dark:text-white">완성본 저장</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => handleExportImage('image/png')}
                      className="py-2 rounded-lg bg-black dark:bg-white text-white dark:text-black text-xs font-bold hover:opacity-90 flex items-center justify-center gap-1 shadow-xs"
                    >
                      <Download className="w-3 h-3" />
                      <span>PNG</span>
                    </button>
                    <button
                      onClick={() => handleExportImage('image/jpeg')}
                      className="py-2 rounded-lg bg-[#efefed] dark:bg-[#333] hover:bg-[#e4e3e0] text-[#37352f] dark:text-white text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>JPG</span>
                    </button>
                    <button
                      onClick={() => handleExportImage('image/webp')}
                      className="py-2 rounded-lg bg-[#efefed] dark:bg-[#333] hover:bg-[#e4e3e0] text-[#37352f] dark:text-white text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>WEBP</span>
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setImageFile(null);
                      setOriginalImage(null);
                    }}
                    className="w-full py-1.5 text-center text-[11px] text-[#787774] hover:text-red-500 transition"
                  >
                    다른 사진 불러오기
                  </button>
                </div>
              </div>

              {/* Center Canvas Area (8 cols) */}
              <div className="lg:col-span-8 bg-[#faf9f6] dark:bg-[#151515] border border-[#e9e9e7] dark:border-[#2f2f2f] rounded-2xl p-4 flex flex-col items-center justify-center min-h-[460px] relative overflow-hidden">
                <canvas
                  ref={mainCanvasRef}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  className="max-w-full max-h-[600px] object-contain rounded-lg shadow-sm border border-[#e9e9e7] dark:border-[#333] cursor-crosshair bg-white dark:bg-[#202020]"
                />

                {/* Crop Box Overlay Guide (when in crop mode) */}
                {tool === 'crop' && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full text-xs font-semibold backdrop-blur-md shadow-md flex items-center gap-2 animate-in fade-in">
                    <Crop className="w-3.5 h-3.5" />
                    <span>자르기 모드 활성화됨 · 비율을 선택하거나 [자르기 적용]을 누르세요</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. PDF PAGE EDITOR & WATERMARK TAB */}
      {/* ============================================================== */}
      {activeTab === 'pdf' && (
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
              className="border-2 border-dashed border-[#e3e2e0] dark:border-[#333] hover:border-black dark:hover:border-white rounded-2xl p-12 text-center cursor-pointer transition bg-[#faf9f6]/50 dark:bg-[#1b1b1b]/50 group select-none space-y-3"
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
                    className="w-full px-3 py-1.5 rounded-lg border border-[#e9e9e7] dark:border-[#333] bg-[#faf9f6] dark:bg-[#1b1b1b]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-[#37352f] dark:text-white">상단 머리글 (선택)</label>
                  <input
                    type="text"
                    value={headerText}
                    onChange={(e) => setHeaderText(e.target.value)}
                    placeholder="예: 내부 공유용 보고서"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#e9e9e7] dark:border-[#333] bg-[#faf9f6] dark:bg-[#1b1b1b]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-[#37352f] dark:text-white">하단 바닥글</label>
                  <input
                    type="text"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    placeholder="예: AllDesk 생산성"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#e9e9e7] dark:border-[#333] bg-[#faf9f6] dark:bg-[#1b1b1b]"
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
      )}
    </div>
  );
};
