import React, { useState, useRef } from 'react';
import { 
  FileArchive, 
  Image as ImageIcon, 
  FileText, 
  UploadCloud, 
  Download, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Sliders, 
  ArrowRight,
  FileCheck,
  Package,
  Layers,
  Sparkles
} from 'lucide-react';
import { compressImage } from '../../utils/imageCompressor';
import { compressPdf, CompressionPreset } from '../../utils/pdfTools';
import { formatBytes, calculateSavings } from '../../utils/formatters';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { NotionPageHeader } from '../NotionLayout/NotionPageHeader';

interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  compressedBlob?: Blob;
  compressedUrl?: string;
  originalSize: number;
  compressedSize?: number;
  width?: number;
  height?: number;
  status: 'idle' | 'processing' | 'done' | 'error';
  error?: string;
}

interface PdfItem {
  id: string;
  file: File;
  originalSize: number;
  compressedBlob?: Blob;
  compressedSize?: number;
  status: 'idle' | 'processing' | 'done' | 'error';
  progress?: number;
  error?: string;
}

export const CompressorView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'image' | 'pdf'>('pdf');

  // --- Image state ---
  const [imageItems, setImageItems] = useState<ImageItem[]>([]);
  const [quality, setQuality] = useState<number>(75);
  const [maxDimension, setMaxDimension] = useState<number>(1920);
  const [outputFormat, setOutputFormat] = useState<'original' | 'image/webp' | 'image/jpeg' | 'image/png'>('original');
  const [isProcessingImages, setIsProcessingImages] = useState<boolean>(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // --- Multiple PDF state ---
  const [pdfItems, setPdfItems] = useState<PdfItem[]>([]);
  const [pdfPreset, setPdfPreset] = useState<CompressionPreset>('medium');
  const [isProcessingPdfs, setIsProcessingPdfs] = useState<boolean>(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // ==============================================================
  // Multiple PDF Handlers
  // ==============================================================
  const handlePdfUpload = (files: FileList | null) => {
    if (!files) return;
    const newItems: PdfItem[] = [];

    Array.from(files).forEach((file) => {
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) return;
      newItems.push({
        id: Math.random().toString(36).substring(7),
        file,
        originalSize: file.size,
        status: 'idle',
        progress: 0,
      });
    });

    setPdfItems((prev) => [...prev, ...newItems]);
  };

  const processSinglePdf = async (item: PdfItem): Promise<PdfItem> => {
    try {
      const res = await compressPdf(item.file, pdfPreset, (progress) => {
        setPdfItems((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, progress } : p))
        );
      });

      return {
        ...item,
        status: 'done',
        progress: 100,
        compressedBlob: res.blob,
        compressedSize: res.compressedSize,
      };
    } catch (err: any) {
      return {
        ...item,
        status: 'error',
        error: err.message || '압축 중 오류 발생',
      };
    }
  };

  const handleCompressAllPdfs = async () => {
    if (pdfItems.length === 0 || isProcessingPdfs) return;
    setIsProcessingPdfs(true);

    const updated = [...pdfItems];
    for (let i = 0; i < updated.length; i++) {
      if (updated[i].status !== 'done') {
        updated[i] = { ...updated[i], status: 'processing', progress: 5 };
        setPdfItems([...updated]);

        const result = await processSinglePdf(updated[i]);
        updated[i] = result;
        setPdfItems([...updated]);
      }
    }

    setIsProcessingPdfs(false);
  };

  const handleDownloadAllPdfsZip = async () => {
    const doneItems = pdfItems.filter((it) => it.status === 'done' && it.compressedBlob);
    if (doneItems.length === 0) return;

    const zip = new JSZip();
    doneItems.forEach((it) => {
      const nameWithoutExt = it.file.name.replace(/\.pdf$/i, '');
      zip.file(`${nameWithoutExt}_compressed.pdf`, it.compressedBlob!);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'compressed_pdf_files.zip');
  };

  const removePdfItem = (id: string) => {
    setPdfItems((prev) => prev.filter((it) => it.id !== id));
  };

  const clearPdfs = () => {
    setPdfItems([]);
  };

  // ==============================================================
  // Image Handlers
  // ==============================================================
  const handleImageUpload = (files: FileList | null) => {
    if (!files) return;
    const newItems: ImageItem[] = [];

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const previewUrl = URL.createObjectURL(file);
      newItems.push({
        id: Math.random().toString(36).substring(7),
        file,
        previewUrl,
        originalSize: file.size,
        status: 'idle',
      });
    });

    setImageItems((prev) => [...prev, ...newItems]);
  };

  const processSingleImage = async (item: ImageItem): Promise<ImageItem> => {
    try {
      const result = await compressImage(item.file, {
        quality: quality / 100,
        maxWidth: maxDimension === 0 ? undefined : maxDimension,
        maxHeight: maxDimension === 0 ? undefined : maxDimension,
        outputFormat: outputFormat,
      });

      return {
        ...item,
        status: 'done',
        compressedBlob: result.blob,
        compressedUrl: result.dataUrl,
        compressedSize: result.compressedSize,
        width: result.width,
        height: result.height,
      };
    } catch (err: any) {
      return {
        ...item,
        status: 'error',
        error: err.message || '압축 실패',
      };
    }
  };

  const handleCompressAllImages = async () => {
    if (imageItems.length === 0 || isProcessingImages) return;
    setIsProcessingImages(true);

    const updated = [...imageItems];
    for (let i = 0; i < updated.length; i++) {
      if (updated[i].status !== 'done') {
        updated[i] = { ...updated[i], status: 'processing' };
        setImageItems([...updated]);
        const res = await processSingleImage(updated[i]);
        updated[i] = res;
        setImageItems([...updated]);
      }
    }

    setIsProcessingImages(false);
  };

  const handleDownloadAllImagesZip = async () => {
    const doneItems = imageItems.filter((it) => it.status === 'done' && it.compressedBlob);
    if (doneItems.length === 0) return;

    const zip = new JSZip();
    doneItems.forEach((it, idx) => {
      let ext = 'jpg';
      if (outputFormat === 'image/webp') ext = 'webp';
      else if (outputFormat === 'image/png') ext = 'png';
      else {
        const parts = it.file.name.split('.');
        ext = parts[parts.length - 1] || 'jpg';
      }

      const nameWithoutExt = it.file.name.substring(0, it.file.name.lastIndexOf('.')) || `image_${idx + 1}`;
      zip.file(`${nameWithoutExt}_compressed.${ext}`, it.compressedBlob!);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `compressed_images.zip`);
  };

  const removeImageItem = (id: string) => {
    setImageItems((prev) => prev.filter((it) => it.id !== id));
  };

  const clearImages = () => {
    setImageItems([]);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Notion Page Header */}
      <NotionPageHeader
        icon="📉"
        title="파일 용량 압축기"
        description="서버 업로드 없이 브라우저 로컬에서 안전하게 여러 PDF 문서와 이미지(PNG, JPG, WEBP)의 용량을 최대 85% 압축합니다."
        tags={[
          { label: '다중 PDF 동시 압축 지원' },
          { label: '다중 이미지 일괄 압축' },
          { label: '전체 ZIP 다운로드' },
        ]}
      />

      {/* Subtabs selector */}
      <div className="flex overflow-x-auto no-scrollbar items-center gap-2 border-b border-[#e9e9e7] dark:border-[#2f2f2f] pb-3 text-xs">
        <button
          onClick={() => setActiveSubTab('pdf')}
          className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition ${
            activeSubTab === 'pdf'
              ? 'bg-black dark:bg-white text-white dark:text-black'
              : 'text-[#787774] hover:bg-[#efefed] dark:hover:bg-[#2c2c2c]'
          }`}
        >
          <FileText className="w-3.5 h-3.5 shrink-0" />
          <span>여러 PDF 일괄 압축 ({pdfItems.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('image')}
          className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition ${
            activeSubTab === 'image'
              ? 'bg-black dark:bg-white text-white dark:text-black'
              : 'text-[#787774] hover:bg-[#efefed] dark:hover:bg-[#2c2c2c]'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5 shrink-0" />
          <span>이미지 압축 (PNG/JPG/WEBP) ({imageItems.length})</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* 1. MULTIPLE PDF COMPRESSOR */}
      {/* ============================================================== */}
      {activeSubTab === 'pdf' && (
        <div className="space-y-6">
          {/* Preset selector */}
          <div className="p-4 rounded-xl bg-[#f7f6f3] dark:bg-[#202020] border border-[#e9e9e7] dark:border-[#2f2f2f] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#37352f] dark:text-white flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                PDF 압축 강도 프리셋
              </span>
              <span className="text-[11px] text-[#787774]">선택한 강도가 등록된 모든 PDF에 일괄 적용됩니다.</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                {
                  id: 'low' as CompressionPreset,
                  title: '🚀 최대 압축 (저화질)',
                  desc: '이메일 첨부/가벼운 모바일 열람용, 약 60~85% 용량 절감',
                },
                {
                  id: 'medium' as CompressionPreset,
                  title: '⚖️ 균형 압축 (추천)',
                  desc: '선명한 텍스트 가독성을 유지하며 약 40~65% 용량 절감',
                },
                {
                  id: 'high' as CompressionPreset,
                  title: '💎 고화질 유지',
                  desc: '인쇄용 또는 고해상도 그래픽 문서 유지, 가벼운 최적화',
                },
              ].map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => setPdfPreset(preset.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition text-xs ${
                    pdfPreset === preset.id
                      ? 'border-black dark:border-white bg-white dark:bg-[#282828] shadow-xs'
                      : 'border-[#e9e9e7] dark:border-[#2f2f2f] hover:border-[#bbb] bg-white/60 dark:bg-[#1a1a1a]'
                  }`}
                >
                  <p className="font-bold text-[#37352f] dark:text-white">{preset.title}</p>
                  <p className="text-[11px] text-[#787774] mt-0.5">{preset.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Upload Dropzone */}
          <div
            onClick={() => pdfInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handlePdfUpload(e.dataTransfer.files);
            }}
            className="border-2 border-dashed border-[#e3e2e0] dark:border-[#333] hover:border-black dark:hover:border-white rounded-2xl p-8 text-center cursor-pointer transition bg-[#faf9f6]/50 dark:bg-[#1b1b1b]/50 group select-none"
          >
            <input
              ref={pdfInputRef}
              type="file"
              multiple
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => handlePdfUpload(e.target.files)}
            />
            <div className="w-12 h-12 rounded-xl bg-[#f0f0ee] dark:bg-[#282828] text-[#37352f] dark:text-white flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#37352f] dark:text-white">
              여러 PDF 파일들을 이곳에 드래그하거나 클릭하여 한 번에 선택하세요
            </h3>
            <p className="text-xs text-[#787774] mt-1">
              다중 파일 동시 선택 지원 (개수 제한 없음, 100% 브라우저 메모리 내 로컬 처리)
            </p>
          </div>

          {/* PDF Items List */}
          {pdfItems.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f7f6f3] dark:bg-[#202020] p-3 rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f] text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#37352f] dark:text-white">
                    등록된 PDF 문서: {pdfItems.length}개
                  </span>
                  {pdfItems.some((i) => i.status === 'done') && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                      압축 완료 {pdfItems.filter((i) => i.status === 'done').length}개
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={clearPdfs}
                    className="px-2.5 py-1 text-xs text-[#787774] hover:text-red-500 rounded hover:bg-[#efefed] dark:hover:bg-[#2c2c2c]"
                  >
                    목록 비우기
                  </button>

                  <button
                    onClick={handleCompressAllPdfs}
                    disabled={isProcessingPdfs}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-black dark:bg-white dark:text-black rounded-lg shadow-xs hover:opacity-90 disabled:opacity-50 transition"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>{isProcessingPdfs ? '압축 처리 중...' : '모든 PDF 압축 실행'}</span>
                  </button>

                  {pdfItems.some((i) => i.status === 'done') && (
                    <button
                      onClick={handleDownloadAllPdfsZip}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#e9e9e7] dark:border-[#2f2f2f] hover:bg-[#efefed] dark:hover:bg-[#2c2c2c] transition"
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>전체 ZIP 다운로드</span>
                    </button>
                  )}
                </div>
              </div>

              {/* PDF Cards */}
              <div className="grid grid-cols-1 gap-2.5">
                {pdfItems.map((item) => {
                  const savings = item.compressedSize
                    ? calculateSavings(item.originalSize, item.compressedSize)
                    : null;

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f] bg-white dark:bg-[#1f1f1f] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-[#f0f0ee] dark:bg-[#282828] flex items-center justify-center font-bold text-[#37352f] dark:text-white shrink-0">
                          PDF
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[#37352f] dark:text-white truncate">
                            {item.file.name}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-[#787774] mt-0.5">
                            <span>원본: {formatBytes(item.originalSize)}</span>
                            {item.compressedSize !== undefined && (
                              <>
                                <ArrowRight className="w-3 h-3 text-[#aaa]" />
                                <span className="font-bold text-[#37352f] dark:text-white">
                                  {formatBytes(item.compressedSize)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right status & progress */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        {item.status === 'processing' && (
                          <div className="w-32 space-y-1">
                            <div className="w-full bg-[#efefed] dark:bg-[#2c2c2c] h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-black dark:bg-white h-full rounded-full transition-all"
                                style={{ width: `${item.progress || 10}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-right text-[#787774]">{item.progress}%</p>
                          </div>
                        )}

                        {item.status === 'done' && savings && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                            -{savings.percent}% 절감 ({formatBytes(savings.savedBytes)})
                          </span>
                        )}

                        {item.status === 'error' && (
                          <span className="text-red-500 font-semibold">{item.error}</span>
                        )}

                        <div className="flex items-center gap-1">
                          {item.status === 'done' && item.compressedBlob && (
                            <button
                              onClick={() => {
                                const name = item.file.name.replace(/\.pdf$/i, '');
                                saveAs(item.compressedBlob!, `${name}_compressed.pdf`);
                              }}
                              className="p-1.5 rounded-md hover:bg-[#efefed] dark:hover:bg-[#2c2c2c] text-[#37352f] dark:text-white"
                              title="다운로드"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => removePdfItem(item.id)}
                            className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950 text-[#aaa] hover:text-red-500"
                            title="제거"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. IMAGE COMPRESSOR */}
      {/* ============================================================== */}
      {activeSubTab === 'image' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="p-4 rounded-xl bg-[#f7f6f3] dark:bg-[#202020] border border-[#e9e9e7] dark:border-[#2f2f2f] space-y-4 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-[#37352f] dark:text-white">
              <Sliders className="w-3.5 h-3.5" />
              <span>이미지 압축 세부 옵션</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              {/* Quality slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-medium">
                  <span className="text-[#787774]">압축 품질</span>
                  <span className="font-bold text-[#37352f] dark:text-white">{quality}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full accent-black dark:accent-white"
                />
              </div>

              {/* Max dimension limit */}
              <div className="space-y-1.5">
                <label className="font-medium text-[#787774] block">최대 해상도 리사이즈</label>
                <select
                  value={maxDimension}
                  onChange={(e) => setMaxDimension(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#e9e9e7] dark:border-[#2f2f2f] bg-white dark:bg-[#191919] text-xs text-[#37352f] dark:text-white"
                >
                  <option value={0}>원본 크기 유지 (리사이즈 안함)</option>
                  <option value={2560}>2K QHD (최대 2560px)</option>
                  <option value={1920}>Full HD (최대 1920px, 추천)</option>
                  <option value={1280}>HD (최대 1280px)</option>
                  <option value={800}>작은 이미지 (최대 800px)</option>
                </select>
              </div>

              {/* Output format */}
              <div className="space-y-1.5">
                <label className="font-medium text-[#787774] block">출력 포맷</label>
                <select
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#e9e9e7] dark:border-[#2f2f2f] bg-white dark:bg-[#191919] text-xs text-[#37352f] dark:text-white"
                >
                  <option value="original">원본 포맷 유지</option>
                  <option value="image/webp">WebP (차세대 초경량 포맷)</option>
                  <option value="image/jpeg">JPEG (표준 사진)</option>
                  <option value="image/png">PNG (무손실 투명도)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div
            onClick={() => imageInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleImageUpload(e.dataTransfer.files);
            }}
            className="border-2 border-dashed border-[#e3e2e0] dark:border-[#333] hover:border-black dark:hover:border-white rounded-2xl p-8 text-center cursor-pointer transition bg-[#faf9f6]/50 dark:bg-[#1b1b1b]/50 group select-none"
          >
            <input
              ref={imageInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageUpload(e.target.files)}
            />
            <div className="w-12 h-12 rounded-xl bg-[#f0f0ee] dark:bg-[#282828] text-[#37352f] dark:text-white flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#37352f] dark:text-white">
              이미지 파일들을 이곳에 드래그하거나 클릭하여 선택하세요
            </h3>
            <p className="text-xs text-[#787774] mt-1">PNG, JPG, WEBP 등 다중 파일 일괄 업로드 지원</p>
          </div>

          {/* Actions & Image List */}
          {imageItems.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f7f6f3] dark:bg-[#202020] p-3 rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f] text-xs">
                <span className="font-bold text-[#37352f] dark:text-white">
                  등록된 이미지: {imageItems.length}개
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={clearImages}
                    className="px-2.5 py-1 text-[#787774] hover:text-red-500 rounded hover:bg-[#efefed]"
                  >
                    목록 비우기
                  </button>

                  <button
                    onClick={handleCompressAllImages}
                    disabled={isProcessingImages}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-black dark:bg-white dark:text-black rounded-lg shadow-xs hover:opacity-90 disabled:opacity-50 transition"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{isProcessingImages ? '압축 처리 중...' : '전체 압축 실행'}</span>
                  </button>

                  {imageItems.some((i) => i.status === 'done') && (
                    <button
                      onClick={handleDownloadAllImagesZip}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#e9e9e7] dark:border-[#2f2f2f] hover:bg-[#efefed]"
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>전체 ZIP 다운로드</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Items Cards */}
              <div className="grid grid-cols-1 gap-2.5">
                {imageItems.map((item) => {
                  const savings = item.compressedSize
                    ? calculateSavings(item.originalSize, item.compressedSize)
                    : null;

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f] bg-white dark:bg-[#1f1f1f] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={item.compressedUrl || item.previewUrl}
                          alt=""
                          className="w-11 h-11 object-cover rounded-lg border border-[#e9e9e7] dark:border-[#2f2f2f] shrink-0 bg-[#f7f6f3]"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-[#37352f] dark:text-white truncate">
                            {item.file.name}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-[#787774] mt-0.5">
                            <span>{formatBytes(item.originalSize)}</span>
                            {item.compressedSize !== undefined && (
                              <>
                                <ArrowRight className="w-3 h-3 text-[#aaa]" />
                                <span className="font-bold text-[#37352f] dark:text-white">
                                  {formatBytes(item.compressedSize)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        {item.status === 'done' && savings && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                            -{savings.percent}% 절감
                          </span>
                        )}

                        <div className="flex items-center gap-1">
                          {item.status === 'done' && item.compressedBlob && (
                            <button
                              onClick={() => {
                                const ext = outputFormat === 'image/webp' ? 'webp' : outputFormat === 'image/png' ? 'png' : 'jpg';
                                const name = item.file.name.substring(0, item.file.name.lastIndexOf('.')) || 'image';
                                saveAs(item.compressedBlob!, `${name}_compressed.${ext}`);
                              }}
                              className="p-1.5 rounded-md hover:bg-[#efefed] text-[#37352f] dark:text-white"
                              title="다운로드"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => removeImageItem(item.id)}
                            className="p-1.5 rounded-md hover:bg-red-50 text-[#aaa] hover:text-red-500"
                            title="제거"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
