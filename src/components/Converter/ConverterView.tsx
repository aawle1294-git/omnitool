import React, { useState, useRef } from 'react';
import { 
  RefreshCw, 
  Image as ImageIcon, 
  FileText, 
  Layers, 
  Scissors, 
  UploadCloud, 
  Download, 
  Trash2, 
  FileCheck, 
  Package, 
  ArrowRight,
  FileCode,
  Sliders,
  Copy,
  Check
} from 'lucide-react';
import { 
  convertPdfToImages, 
  convertImagesToPdf, 
  mergePdfFiles, 
  extractPdfPages,
  extractPdfText,
  convertTextToPdf,
  PdfPageImage 
} from '../../utils/pdfTools';
import { compressImage } from '../../utils/imageCompressor';
import { formatBytes, copyToClipboard } from '../../utils/formatters';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { NotionPageHeader } from '../NotionLayout/NotionPageHeader';
import { useLanguage } from '../../contexts/LanguageContext';

type ConverterMode = 'pdf-to-any' | 'img-to-pdf' | 'img-to-img' | 'text-to-pdf' | 'pdf-merge-split';

interface ImageConvertItem {
  id: string;
  file: File;
  targetFormat: 'image/png' | 'image/jpeg' | 'image/webp' | 'ico' | 'bmp';
  previewUrl: string;
  convertedBlob?: Blob;
  status: 'idle' | 'processing' | 'done' | 'error';
}

export const ConverterView: React.FC = () => {
  const { lang } = useLanguage();
  const L = (ko: string, en: string) => (lang === 'en' ? en : ko);
  const [mode, setMode] = useState<ConverterMode>('pdf-to-any');

  // --- 1. PDF to Any Format state ---
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfOutputFormat, setPdfOutputFormat] = useState<'image/png' | 'image/jpeg' | 'image/webp' | 'txt'>('image/png');
  const [pdfDpiScale, setPdfDpiScale] = useState<number>(2.0);
  const [pdfPages, setPdfPages] = useState<PdfPageImage[]>([]);
  const [extractedText, setExtractedText] = useState<string>('');
  const [isConvertingPdf, setIsConvertingPdf] = useState<boolean>(false);
  const [pdfProgress, setPdfProgress] = useState<number>(0);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // --- 2. Image to PDF state ---
  const [imagesForPdf, setImagesForPdf] = useState<{ id: string; file: File; previewUrl: string }[]>([]);
  const [fitA4, setFitA4] = useState<boolean>(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const imgToPdfInputRef = useRef<HTMLInputElement>(null);

  // --- 3. Image to Image state ---
  const [imageItems, setImageItems] = useState<ImageConvertItem[]>([]);
  const [globalTargetFormat, setGlobalTargetFormat] = useState<'image/png' | 'image/jpeg' | 'image/webp' | 'ico' | 'bmp'>('image/png');
  const [isConvertingImages, setIsConvertingImages] = useState<boolean>(false);
  const imgInputRef = useRef<HTMLInputElement>(null);

  // --- 4. Text to PDF state ---
  const [textContent, setTextContent] = useState<string>(L('AllDesk를 사용하여 작성된 텍스트 문서입니다.\n\n- 손쉬운 문서 PDF 변환\n- 브라우저 로컬 안전 처리', 'Text document created using AllDesk.\n\n- Easy document to PDF conversion\n- Safe local browser processing'));
  const [textDocTitle, setTextDocTitle] = useState<string>(L('내 문서', 'My Document'));
  const [isConvertingTextPdf, setIsConvertingTextPdf] = useState<boolean>(false);

  // --- 5. PDF Merge & Split state ---
  const [mergeFiles, setMergeFiles] = useState<File[]>([]);
  const [splitFile, setSplitFile] = useState<File | null>(null);
  const [pageRange, setPageRange] = useState<string>('1-3');
  const [isMergingPdfs, setIsMergingPdfs] = useState<boolean>(false);
  const [isSplittingPdf, setIsSplittingPdf] = useState<boolean>(false);
  const mergeInputRef = useRef<HTMLInputElement>(null);
  const splitInputRef = useRef<HTMLInputElement>(null);

  // ==============================================================
  // 1. PDF ➔ Any Format Handlers
  // ==============================================================
  const handlePdfUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      alert(L('PDF 파일만 선택해주세요.', 'Please select PDF files only.'));
      return;
    }
    setPdfFile(file);
    setPdfPages([]);
    setExtractedText('');
    setPdfProgress(0);
  };

  const handleStartPdfConversion = async () => {
    if (!pdfFile || isConvertingPdf) return;
    setIsConvertingPdf(true);
    setPdfProgress(0);

    try {
      if (pdfOutputFormat === 'txt') {
        const textRes = await extractPdfText(pdfFile, (p) => setPdfProgress(p));
        setExtractedText(textRes.fullText);
      } else {
        const pages = await convertPdfToImages(pdfFile, pdfOutputFormat, pdfDpiScale, (p) => {
          setPdfProgress(p);
        });
        setPdfPages(pages);
      }
    } catch (err: any) {
      alert(L('변환 중 오류: ', 'Conversion error: ') + err.message);
    } finally {
      setIsConvertingPdf(false);
    }
  };

  const handleDownloadAllPdfImagesZip = async () => {
    if (pdfPages.length === 0 || !pdfFile) return;
    const zip = new JSZip();
    const ext = pdfOutputFormat === 'image/webp' ? 'webp' : pdfOutputFormat === 'image/jpeg' ? 'jpg' : 'png';
    const baseName = pdfFile.name.replace(/\.pdf$/i, '');

    pdfPages.forEach((page) => {
      zip.file(`${baseName}_page_${page.pageNum}.${ext}`, page.blob);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `${baseName}_${ext}_images.zip`);
  };

  const handleDownloadExtractedText = () => {
    if (!extractedText || !pdfFile) return;
    const baseName = pdfFile.name.replace(/\.pdf$/i, '');
    const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `${baseName}_extracted_text.txt`);
  };

  // ==============================================================
  // 2. Images ➔ PDF Handlers
  // ==============================================================
  const handleImagesForPdfUpload = (files: FileList | null) => {
    if (!files) return;
    const newItems = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .map((f) => ({
        id: Math.random().toString(36).substring(7),
        file: f,
        previewUrl: URL.createObjectURL(f),
      }));
    setImagesForPdf((prev) => [...prev, ...newItems]);
  };

  const handleGeneratePdfFromImages = async () => {
    if (imagesForPdf.length === 0 || isGeneratingPdf) return;
    setIsGeneratingPdf(true);

    try {
      const files = imagesForPdf.map((item) => item.file);
      const pdfBlob = await convertImagesToPdf(files, fitA4);
      saveAs(pdfBlob, 'converted_images.pdf');
    } catch (err: any) {
      alert(L('PDF 생성 오류: ', 'PDF creation error: ') + err.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // ==============================================================
  // 3. Image ➔ Any Image Handlers
  // ==============================================================
  const handleImageToImageUpload = (files: FileList | null) => {
    if (!files) return;
    const items: ImageConvertItem[] = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .map((file) => ({
        id: Math.random().toString(36).substring(7),
        file,
        targetFormat: globalTargetFormat,
        previewUrl: URL.createObjectURL(file),
        status: 'idle',
      }));
    setImageItems((prev) => [...prev, ...items]);
  };

  const handleConvertAllImages = async () => {
    if (imageItems.length === 0 || isConvertingImages) return;
    setIsConvertingImages(true);

    const updated = [...imageItems];
    for (let i = 0; i < updated.length; i++) {
      updated[i].status = 'processing';
      setImageItems([...updated]);

      try {
        let fmt: any = updated[i].targetFormat;
        let quality = 0.95;
        let maxWidth = undefined;

        if (fmt === 'ico') {
          // Resize to standard 64x64 or 32x32 for icon
          fmt = 'image/png';
          maxWidth = 64;
        }

        const res = await compressImage(updated[i].file, {
          quality,
          maxWidth,
          outputFormat: fmt === 'bmp' ? 'image/png' : fmt,
        });

        updated[i].convertedBlob = res.blob;
        updated[i].status = 'done';
      } catch (err) {
        updated[i].status = 'error';
      }
      setImageItems([...updated]);
    }

    setIsConvertingImages(false);
  };

  // ==============================================================
  // 4. Text ➔ PDF Handlers
  // ==============================================================
  const handleConvertTextToPdf = async () => {
    if (!textContent.trim() || isConvertingTextPdf) return;
    setIsConvertingTextPdf(true);
    try {
      const blob = await convertTextToPdf(textContent, textDocTitle);
      saveAs(blob, `${textDocTitle || 'document'}.pdf`);
    } catch (err: any) {
      alert(L('PDF 생성 오류: ', 'PDF creation error: ') + err.message);
    } finally {
      setIsConvertingTextPdf(false);
    }
  };

  // ==============================================================
  // 5. PDF Merge & Split Handlers
  // ==============================================================
  const handleMergeFilesUpload = (files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files).filter(
      (f) => f.type === 'application/pdf' || f.name.endsWith('.pdf')
    );
    setMergeFiles((prev) => [...prev, ...valid]);
  };

  const handleExecuteMerge = async () => {
    if (mergeFiles.length < 2 || isMergingPdfs) return;
    setIsMergingPdfs(true);
    try {
      const mergedBlob = await mergePdfFiles(mergeFiles);
      saveAs(mergedBlob, 'merged_document.pdf');
    } catch (err: any) {
      alert(L('PDF 병합 오류: ', 'PDF merge error: ') + err.message);
    } finally {
      setIsMergingPdfs(false);
    }
  };

  const handleExecuteSplit = async () => {
    if (!splitFile || isSplittingPdf) return;
    setIsSplittingPdf(true);
    try {
      const splitBlob = await extractPdfPages(splitFile, pageRange);
      const name = splitFile.name.replace(/\.pdf$/i, '');
      saveAs(splitBlob, `${name}_extracted.pdf`);
    } catch (err: any) {
      alert(L('페이지 추출 오류: ', 'Page extraction error: ') + err.message);
    } finally {
      setIsSplittingPdf(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Notion Page Header */}
      <NotionPageHeader
        icon="🔄"
        title={L('파일 형식 변환기', 'File Format Converter')}
        description={L('PDF를 PNG, JPG, WebP 이미지나 TXT 텍스트로 자유롭게 변환하고, 이미지를 A4 PDF로 병합하거나 포맷을 상호 변환합니다.', 'Convert PDFs to PNG, JPG, WebP images or TXT text, merge images into A4 PDFs, or convert between image formats.')}
        tags={[
          { label: 'PDF ➔ PNG / JPG / WEBP / TXT' },
          { label: L('이미지 ➔ PDF 병합', 'Images ➔ Merge PDF') },
          { label: L('이미지 ➔ ICO 파비콘 / BMP 변환', 'Images ➔ ICO Favicon / BMP') },
          { label: L('텍스트 ➔ PDF 변환', 'Text ➔ PDF') },
        ]}
      />

      {/* Mode Selector Tabs */}
      <div className="flex overflow-x-auto no-scrollbar items-center gap-1.5 border-b border-[#e9e9e7] dark:border-[#2f2f2f] pb-3 text-xs">
        <button
          onClick={() => setMode('pdf-to-any')}
          className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition ${
            mode === 'pdf-to-any'
              ? 'bg-black dark:bg-white text-white dark:text-black'
              : 'text-[#787774] hover:bg-[#efefed] dark:hover:bg-[#2c2c2c]'
          }`}
        >
          <FileText className="w-3.5 h-3.5 shrink-0" />
          <span>{L('PDF ➔ 이미지 / 텍스트 변환', 'PDF ➔ Image / Text')}</span>
        </button>

        <button
          onClick={() => setMode('img-to-pdf')}
          className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition ${
            mode === 'img-to-pdf'
              ? 'bg-black dark:bg-white text-white dark:text-black'
              : 'text-[#787774] hover:bg-[#efefed] dark:hover:bg-[#2c2c2c]'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5 shrink-0" />
          <span>{L('이미지 ➔ PDF 병합', 'Images ➔ Merge PDF')}</span>
        </button>

        <button
          onClick={() => setMode('img-to-img')}
          className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition ${
            mode === 'img-to-img'
              ? 'bg-black dark:bg-white text-white dark:text-black'
              : 'text-[#787774] hover:bg-[#efefed] dark:hover:bg-[#2c2c2c]'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5 shrink-0" />
          <span>{L('이미지 포맷 변환 (ICO / WEBP / PNG)', 'Image Format Converter (ICO / WEBP / PNG)')}</span>
        </button>

        <button
          onClick={() => setMode('text-to-pdf')}
          className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition ${
            mode === 'text-to-pdf'
              ? 'bg-black dark:bg-white text-white dark:text-black'
              : 'text-[#787774] hover:bg-[#efefed] dark:hover:bg-[#2c2c2c]'
          }`}
        >
          <FileCode className="w-3.5 h-3.5 shrink-0" />
          <span>{L('텍스트 ➔ PDF 변환', 'Text ➔ PDF')}</span>
        </button>

        <button
          onClick={() => setMode('pdf-merge-split')}
          className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition ${
            mode === 'pdf-merge-split'
              ? 'bg-black dark:bg-white text-white dark:text-black'
              : 'text-[#787774] hover:bg-[#efefed] dark:hover:bg-[#2c2c2c]'
          }`}
        >
          <Layers className="w-3.5 h-3.5 shrink-0" />
          <span>{L('PDF 병합 / 분할', 'PDF Merge / Split')}</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* 1. PDF ➔ ANY (PNG / JPG / WEBP / TXT) */}
      {/* ============================================================== */}
      {mode === 'pdf-to-any' && (
        <div className="space-y-6">
          {/* Options Bar */}
          <div className="p-4 rounded-xl bg-[#f7f6f3] dark:bg-[#202020] border border-[#e9e9e7] dark:border-[#2f2f2f] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div>
              <h3 className="font-bold text-[#37352f] dark:text-white">{L('PDF 변환 출력 확장자 선택', 'Select PDF Output Format')}</h3>
              <p className="text-[11px] text-[#787774] mt-0.5">{L('원하는 이미지 규격(PNG, JPG, WebP)이나 텍스트(TXT)를 선택하세요.', 'Choose your desired image format (PNG, JPG, WebP) or plain text (TXT).')}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-[#787774]">{L('목표 확장자:', 'Target Format:')}</span>
                <select
                  value={pdfOutputFormat}
                  onChange={(e) => setPdfOutputFormat(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-lg border border-[#e9e9e7] dark:border-[#2f2f2f] bg-white dark:bg-[#191919] font-bold text-xs"
                >
                  <option value="image/png">{L('PNG (.png) - 무손실 고화질 투명도', 'PNG (.png) - Lossless Transparency')}</option>
                  <option value="image/jpeg">{L('JPG (.jpg) - 표준 압축 사진', 'JPG (.jpg) - Standard Compressed Photo')}</option>
                  <option value="image/webp">{L('WEBP (.webp) - 차세대 초경량 이미지', 'WEBP (.webp) - Next-gen Ultra-light Image')}</option>
                  <option value="txt">{L('TXT (.txt) - PDF 본문 텍스트 전문 추출', 'TXT (.txt) - Extract Full Body Text')}</option>
                </select>
              </div>

              {pdfOutputFormat !== 'txt' && (
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-[#787774]">{L('해상도 배율:', 'Resolution Scale:')}</span>
                  <select
                    value={pdfDpiScale}
                    onChange={(e) => setPdfDpiScale(Number(e.target.value))}
                    className="px-2 py-1.5 rounded-lg border border-[#e9e9e7] dark:border-[#2f2f2f] bg-white dark:bg-[#191919] text-xs"
                  >
                    <option value={1.0}>{L('1.0x (웹 표준 해상도)', '1.0x (Standard Web)')}</option>
                    <option value={2.0}>{L('2.0x (선명한 2배 고화질, 추천)', '2.0x (Sharp 2x HD, Recommended)')}</option>
                    <option value={3.0}>{L('3.0x (초고해상도 3배)', '3.0x (Ultra HD 3x)')}</option>
                  </select>
                </div>
              )}
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
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => handlePdfUpload(e.target.files)}
            />
            <div className="w-12 h-12 rounded-xl bg-[#f0f0ee] dark:bg-[#282828] text-[#37352f] dark:text-white flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#37352f] dark:text-white">
              {pdfFile ? pdfFile.name : L('변환할 PDF 문서를 선택하거나 드래그하세요', 'Select or drag a PDF document to convert')}
            </h3>
            <p className="text-xs text-[#787774] mt-1">
              {pdfFile ? L(`파일 크기: ${formatBytes(pdfFile.size)}`, `File size: ${formatBytes(pdfFile.size)}`) : L('선택한 PDF의 모든 페이지를 지정한 확장자로 즉시 변환합니다.', 'Instantly converts all pages of the selected PDF to your chosen format.')}
            </p>
          </div>

          {/* Action & Progress */}
          {pdfFile && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#f7f6f3] dark:bg-[#202020] border border-[#e9e9e7] dark:border-[#2f2f2f] text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#37352f] dark:text-white">{pdfFile.name}</span>
                {pdfPages.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[11px]">
                    {L(`총 ${pdfPages.length}페이지 변환 완료`, `${pdfPages.length} Pages Converted`)}
                  </span>
                )}
                {extractedText && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[11px]">
                    {L(`텍스트 추출 완료 (${extractedText.length.toLocaleString()} 자)`, `Text Extracted (${extractedText.length.toLocaleString()} chars)`)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleStartPdfConversion}
                  disabled={isConvertingPdf}
                  className="flex items-center gap-1.5 px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-bold rounded-lg shadow-xs hover:opacity-90 disabled:opacity-50 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isConvertingPdf ? 'animate-spin' : ''}`} />
                  <span>{isConvertingPdf ? L(`변환 처리 중 (${pdfProgress}%)...`, `Converting (${pdfProgress}%)...`) : L('변환 시작', 'Start Conversion')}</span>
                </button>

                {pdfPages.length > 0 && (
                  <button
                    onClick={handleDownloadAllPdfImagesZip}
                    className="flex items-center gap-1.5 px-4 py-2 border border-[#e9e9e7] dark:border-[#2f2f2f] bg-white dark:bg-[#191919] font-bold rounded-lg hover:bg-[#efefed] transition"
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>{L('전체 이미지 ZIP 다운로드', 'Download All Images ZIP')}</span>
                  </button>
                )}

                {extractedText && (
                  <button
                    onClick={handleDownloadExtractedText}
                    className="flex items-center gap-1.5 px-4 py-2 border border-[#e9e9e7] dark:border-[#2f2f2f] bg-white dark:bg-[#191919] font-bold rounded-lg hover:bg-[#efefed] transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{L('추출 텍스트 (.txt) 다운로드', 'Download Extracted Text (.txt)')}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Extracted Text View */}
          {extractedText && (
            <div className="p-4 rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f] bg-white dark:bg-[#191919] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#37352f] dark:text-white">{L('추출된 본문 텍스트:', 'Extracted Body Text:')}</span>
                <button
                  onClick={async () => {
                    await copyToClipboard(extractedText);
                    setCopiedText(true);
                    setTimeout(() => setCopiedText(false), 2000);
                  }}
                  className="flex items-center gap-1 text-[#787774] hover:text-black dark:hover:text-white"
                >
                  {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedText ? L('복사됨!', 'Copied!') : L('전체 텍스트 복사', 'Copy All Text')}</span>
                </button>
              </div>

              <textarea
                rows={10}
                readOnly
                value={extractedText}
                className="w-full p-3 font-mono text-xs rounded-lg border border-[#e9e9e7] dark:border-[#2f2f2f] bg-[#faf9f6] dark:bg-[#202020] text-[#37352f] dark:text-[#d3d3d3]"
              />
            </div>
          )}

          {/* Page Previews Grid */}
          {pdfPages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {pdfPages.map((page) => (
                <div
                  key={page.pageNum}
                  className="p-2.5 rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f] bg-white dark:bg-[#1f1f1f] flex flex-col justify-between text-xs group"
                >
                  <div>
                    <img
                      src={page.dataUrl}
                      alt={`Page ${page.pageNum}`}
                      className="w-full aspect-[1/1.4] object-contain rounded-md border border-[#f0f0ee] dark:border-[#282828] bg-[#f7f6f3]"
                    />
                    <div className="flex items-center justify-between mt-2 text-[11px]">
                      <span className="font-bold text-[#37352f] dark:text-white">
                        {L(`${page.pageNum} 페이지`, `Page ${page.pageNum}`)}
                      </span>
                      <span className="text-[#888]">{formatBytes(page.blob.size)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const ext = pdfOutputFormat === 'image/webp' ? 'webp' : pdfOutputFormat === 'image/jpeg' ? 'jpg' : 'png';
                      saveAs(page.blob, `page_${page.pageNum}.${ext}`);
                    }}
                    className="mt-2.5 w-full py-1 flex items-center justify-center gap-1 bg-[#f0f0ee] dark:bg-[#2a2a2a] hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded text-[11px] font-semibold transition"
                  >
                    <Download className="w-3 h-3" />
                    {L('다운로드', 'Download')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. IMAGES ➔ PDF */}
      {/* ============================================================== */}
      {mode === 'img-to-pdf' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-[#f7f6f3] dark:bg-[#202020] border border-[#e9e9e7] dark:border-[#2f2f2f] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div>
              <h3 className="font-bold text-[#37352f] dark:text-white">{L('여러 이미지를 하나의 PDF 문서로 병합', 'Merge Multiple Images into One PDF')}</h3>
              <p className="text-[11px] text-[#787774] mt-0.5">{L('PNG, JPG, WEBP 사진들을 표준 A4 규격에 맞춰 단일 PDF로 정돈합니다.', 'Arranges PNG, JPG, and WEBP images into a single A4 PDF document.')}</p>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 font-semibold text-[#787774] cursor-pointer">
                <input
                  type="checkbox"
                  checked={fitA4}
                  onChange={(e) => setFitA4(e.target.checked)}
                  className="rounded"
                />
                {L('A4 규격 자동 맞춤', 'Auto-fit to A4')}
              </label>

              {imagesForPdf.length > 0 && (
                <button
                  onClick={handleGeneratePdfFromImages}
                  disabled={isGeneratingPdf}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-black dark:bg-white text-white dark:text-black rounded-lg font-bold shadow-xs hover:opacity-90 disabled:opacity-50 transition"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>{isGeneratingPdf ? L('PDF 생성 중...', 'Creating PDF...') : L('PDF로 병합 저장', 'Save Merged PDF')}</span>
                </button>
              )}
            </div>
          </div>

          {/* Upload Dropzone */}
          <div
            onClick={() => imgToPdfInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleImagesForPdfUpload(e.dataTransfer.files);
            }}
            className="border-2 border-dashed border-[#e3e2e0] dark:border-[#333] hover:border-black dark:hover:border-white rounded-2xl p-8 text-center cursor-pointer transition bg-[#faf9f6]/50 dark:bg-[#1b1b1b]/50 group select-none"
          >
            <input
              ref={imgToPdfInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImagesForPdfUpload(e.target.files)}
            />
            <div className="w-12 h-12 rounded-xl bg-[#f0f0ee] dark:bg-[#282828] text-[#37352f] dark:text-white flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
              <ImageIcon className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#37352f] dark:text-white">
              {L('PDF로 합칠 이미지들을 드래그하거나 선택하세요', 'Drag and drop or select images to merge into PDF')}
            </h3>
            <p className="text-xs text-[#787774] mt-1">{L('PNG, JPG, WEBP 다중 이미지 선택 지원', 'Supports multiple PNG, JPG, WEBP images')}</p>
          </div>

          {/* Thumbnails */}
          {imagesForPdf.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#37352f] dark:text-white">
                  {L(`포함될 이미지 (${imagesForPdf.length}장)`, `Images Included (${imagesForPdf.length})`)}
                </span>
                <button
                  onClick={() => setImagesForPdf([])}
                  className="text-red-500 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {L('전체 삭제', 'Clear All')}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                {imagesForPdf.map((item, idx) => (
                  <div
                    key={item.id}
                    className="relative p-1.5 rounded-lg border border-[#e9e9e7] dark:border-[#2f2f2f] bg-white dark:bg-[#191919] group"
                  >
                    <span className="absolute top-2 left-2 bg-black/80 text-white text-[9px] font-bold px-1.5 py-0.2 rounded">
                      #{idx + 1}
                    </span>
                    <img
                      src={item.previewUrl}
                      alt=""
                      className="w-full aspect-square object-cover rounded"
                    />
                    <p className="text-[10px] text-[#787774] truncate mt-1">{item.file.name}</p>
                    <button
                      onClick={() => setImagesForPdf((prev) => prev.filter((it) => it.id !== item.id))}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. IMAGE ➔ ANY IMAGE (ICO, WEBP, PNG, JPG, BMP) */}
      {/* ============================================================== */}
      {mode === 'img-to-img' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-[#f7f6f3] dark:bg-[#202020] border border-[#e9e9e7] dark:border-[#2f2f2f] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div>
              <h3 className="font-bold text-[#37352f] dark:text-white">{L('이미지 포맷 상호 변환 (파비콘 ICO 지원)', 'Image Format Converter (ICO Favicon Supported)')}</h3>
              <p className="text-[11px] text-[#787774] mt-0.5">{L('PNG, JPG, WEBP, BMP와 웹사이트/윈도우 파비콘 아이콘(ICO)으로 변환합니다.', 'Converts between PNG, JPG, WEBP, BMP, and website/Windows favicon icons (ICO).')}</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#787774]">{L('변환할 포맷:', 'Target Format:')}</span>
              <select
                value={globalTargetFormat}
                onChange={(e) => {
                  const newFmt = e.target.value as any;
                  setGlobalTargetFormat(newFmt);
                  setImageItems((prev) => prev.map((it) => ({ ...it, targetFormat: newFmt })));
                }}
                className="px-2.5 py-1.5 rounded-lg border border-[#e9e9e7] dark:border-[#2f2f2f] bg-white dark:bg-[#191919] font-bold text-xs"
              >
                <option value="image/png">{L('PNG (.png) - 무손실 투명도', 'PNG (.png) - Lossless Transparency')}</option>
                <option value="image/webp">{L('WEBP (.webp) - 초경량 웹 포맷', 'WEBP (.webp) - Ultra-light Web Format')}</option>
                <option value="image/jpeg">{L('JPEG (.jpg) - 표준 사진', 'JPEG (.jpg) - Standard Photo')}</option>
                <option value="ico">{L('ICO (.ico) - 윈도우 아이콘 & 웹 파비콘', 'ICO (.ico) - Windows Icon & Web Favicon')}</option>
                <option value="bmp">{L('BMP (.bmp) - 윈도우 비트맵', 'BMP (.bmp) - Windows Bitmap')}</option>
              </select>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div
            onClick={() => imgInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleImageToImageUpload(e.dataTransfer.files);
            }}
            className="border-2 border-dashed border-[#e3e2e0] dark:border-[#333] hover:border-black dark:hover:border-white rounded-2xl p-8 text-center cursor-pointer transition bg-[#faf9f6]/50 dark:bg-[#1b1b1b]/50 group select-none"
          >
            <input
              ref={imgInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageToImageUpload(e.target.files)}
            />
            <div className="w-12 h-12 rounded-xl bg-[#f0f0ee] dark:bg-[#282828] text-[#37352f] dark:text-white flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
              <RefreshCw className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#37352f] dark:text-white">
              {L('변환할 이미지를 선택하거나 드래그하세요', 'Select or drag images to convert')}
            </h3>
            <p className="text-xs text-[#787774] mt-1">{L('다중 파일 선택 지원', 'Multiple files supported')}</p>
          </div>

          {imageItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#37352f] dark:text-white">
                  {L(`등록된 이미지: ${imageItems.length}개`, `Queued Images: ${imageItems.length}`)}
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setImageItems([])} className="text-[#787774] hover:text-red-500">
                    {L('비우기', 'Clear')}
                  </button>
                  <button
                    onClick={handleConvertAllImages}
                    disabled={isConvertingImages}
                    className="px-4 py-1.5 bg-black dark:bg-white text-white dark:text-black rounded-lg font-bold shadow-xs hover:opacity-90 disabled:opacity-50 transition"
                  >
                    {isConvertingImages ? L('변환 중...', 'Converting...') : L('전체 변환 실행', 'Convert All')}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {imageItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f] bg-white dark:bg-[#1f1f1f] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={item.previewUrl}
                        alt=""
                        className="w-10 h-10 object-cover rounded border border-[#e9e9e7] dark:border-[#2f2f2f]"
                      />
                      <div>
                        <p className="font-bold text-[#37352f] dark:text-white">{item.file.name}</p>
                        <div className="flex items-center gap-2 text-[11px] text-[#787774] mt-0.5">
                          <span>{formatBytes(item.file.size)}</span>
                          <ArrowRight className="w-3 h-3 text-[#aaa]" />
                          <span className="font-bold uppercase text-black dark:text-white">
                            {item.targetFormat.replace('image/', '')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.status === 'done' && item.convertedBlob && (
                        <button
                          onClick={() => {
                            let ext = item.targetFormat.replace('image/', '');
                            if (ext === 'jpeg') ext = 'jpg';
                            const name = item.file.name.substring(0, item.file.name.lastIndexOf('.')) || 'image';
                            saveAs(item.convertedBlob!, `${name}.${ext}`);
                          }}
                          className="flex items-center gap-1 px-3 py-1 bg-black dark:bg-white text-white dark:text-black rounded font-semibold transition"
                        >
                          <Download className="w-3 h-3" />
                          {L('다운로드', 'Download')}
                        </button>
                      )}
                      <button
                        onClick={() => setImageItems((prev) => prev.filter((i) => i.id !== item.id))}
                        className="p-1 text-[#aaa] hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. TEXT ➔ PDF */}
      {/* ============================================================== */}
      {mode === 'text-to-pdf' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#f7f6f3] dark:bg-[#202020] border border-[#e9e9e7] dark:border-[#2f2f2f] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div>
              <h3 className="font-bold text-[#37352f] dark:text-white">{L('텍스트 문서를 PDF 파일로 즉시 변환', 'Convert Text Document to PDF Instantly')}</h3>
              <p className="text-[11px] text-[#787774] mt-0.5">{L('메모나 글을 작성하고 버튼 하나로 깔끔한 PDF 문서 파일로 출력합니다.', 'Write notes or text and export them as a clean PDF document with one click.')}</p>
            </div>

            <button
              onClick={handleConvertTextToPdf}
              disabled={isConvertingTextPdf || !textContent.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-bold rounded-lg shadow-xs hover:opacity-90 disabled:opacity-50 transition"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isConvertingTextPdf ? L('생성 중...', 'Creating...') : L('PDF로 변환 다운로드', 'Convert & Download PDF')}</span>
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-[#787774] block mb-1">{L('문서 제목', 'Document Title')}</label>
              <input
                type="text"
                value={textDocTitle}
                onChange={(e) => setTextDocTitle(e.target.value)}
                placeholder={L('문서 제목 입력...', 'Enter document title...')}
                className="w-full px-3 py-2 rounded-lg border border-[#e9e9e7] dark:border-[#2f2f2f] bg-white dark:bg-[#191919] font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-[#787774] block mb-1">{L('문서 본문 내용', 'Document Body')}</label>
              <textarea
                rows={12}
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder={L('PDF로 변환할 내용을 입력하세요...', 'Enter text to convert to PDF...')}
                className="w-full p-3 font-mono rounded-lg border border-[#e9e9e7] dark:border-[#2f2f2f] bg-white dark:bg-[#191919] leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. PDF MERGE & SPLIT */}
      {/* ============================================================== */}
      {mode === 'pdf-merge-split' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          {/* Merge */}
          <div className="p-5 rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f] bg-white dark:bg-[#191919] space-y-3">
            <h3 className="font-bold text-[#37352f] dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4" />
              {L('PDF 병합 (Merge)', 'Merge PDFs')}
            </h3>
            <p className="text-[11px] text-[#787774]">{L('여러 PDF 문서를 하나의 파일로 합칩니다.', 'Combine multiple PDF documents into a single file.')}</p>

            <div
              onClick={() => mergeInputRef.current?.click()}
              className="border-2 border-dashed border-[#e3e2e0] dark:border-[#333] hover:border-black rounded-xl p-5 text-center cursor-pointer bg-[#faf9f6]/50 dark:bg-[#202020]/50"
            >
              <input
                ref={mergeInputRef}
                type="file"
                multiple
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => handleMergeFilesUpload(e.target.files)}
              />
              <UploadCloud className="w-6 h-6 text-[#787774] mx-auto mb-1.5" />
              <p className="font-bold text-[#37352f] dark:text-white">{L('합칠 PDF들을 선택하세요', 'Select PDFs to merge')}</p>
            </div>

            {mergeFiles.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex justify-between font-bold">
                  <span>{L(`선택된 PDF: ${mergeFiles.length}개`, `Selected PDFs: ${mergeFiles.length}`)}</span>
                  <button onClick={() => setMergeFiles([])} className="text-red-500 hover:underline">
                    {L('비우기', 'Clear')}
                  </button>
                </div>
                <button
                  onClick={handleExecuteMerge}
                  disabled={mergeFiles.length < 2 || isMergingPdfs}
                  className="w-full py-2 bg-black dark:bg-white text-white dark:text-black font-bold rounded-lg shadow-xs hover:opacity-90 disabled:opacity-50 transition"
                >
                  {isMergingPdfs ? L('병합 중...', 'Merging...') : L('하나의 PDF로 병합', 'Merge into Single PDF')}
                </button>
              </div>
            )}
          </div>

          {/* Split */}
          <div className="p-5 rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f] bg-white dark:bg-[#191919] space-y-3">
            <h3 className="font-bold text-[#37352f] dark:text-white flex items-center gap-2">
              <Scissors className="w-4 h-4" />
              {L('PDF 분할 & 페이지 추출 (Split)', 'Split PDF & Extract Pages')}
            </h3>
            <p className="text-[11px] text-[#787774]">{L('원하는 페이지만 골라서 새로운 PDF로 저장합니다.', 'Select specific pages and save them as a new PDF.')}</p>

            <div
              onClick={() => splitInputRef.current?.click()}
              className="border-2 border-dashed border-[#e3e2e0] dark:border-[#333] hover:border-black rounded-xl p-5 text-center cursor-pointer bg-[#faf9f6]/50 dark:bg-[#202020]/50"
            >
              <input
                ref={splitInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) setSplitFile(e.target.files[0]);
                }}
              />
              <Scissors className="w-6 h-6 text-[#787774] mx-auto mb-1.5" />
              <p className="font-bold text-[#37352f] dark:text-white">
                {splitFile ? splitFile.name : L('분할할 PDF 파일 선택', 'Select PDF file to split')}
              </p>
            </div>

            {splitFile && (
              <div className="space-y-2 pt-2">
                <input
                  type="text"
                  value={pageRange}
                  onChange={(e) => setPageRange(e.target.value)}
                  placeholder={L('예: 1-3, 5, 8', 'e.g., 1-3, 5, 8')}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#e9e9e7] dark:border-[#2f2f2f] bg-[#faf9f6] dark:bg-[#202020] text-xs font-mono"
                />
                <button
                  onClick={handleExecuteSplit}
                  disabled={!pageRange || isSplittingPdf}
                  className="w-full py-2 bg-black dark:bg-white text-white dark:text-black font-bold rounded-lg shadow-xs hover:opacity-90 disabled:opacity-50 transition"
                >
                  {isSplittingPdf ? L('추출 중...', 'Extracting...') : L('선택한 페이지만 추출 저장', 'Extract & Save Selected Pages')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
