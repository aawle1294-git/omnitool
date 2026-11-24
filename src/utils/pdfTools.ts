import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// Set up worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface PdfPageImage {
  pageNum: number;
  blob: Blob;
  dataUrl: string;
}

export type CompressionPreset = 'low' | 'medium' | 'high';

/**
 * Compresses a PDF by rendering its pages and rebuilding with optimized JPEGs
 */
export async function compressPdf(
  file: File,
  preset: CompressionPreset = 'medium',
  onProgress?: (progress: number) => void
): Promise<{ blob: Blob; originalSize: number; compressedSize: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  // Preset configuration
  let scale = 1.2;
  let imageQuality = 0.65;

  if (preset === 'low') {
    // Maximum compression / lowest file size
    scale = 0.9;
    imageQuality = 0.45;
  } else if (preset === 'high') {
    // High quality / lower compression
    scale = 1.8;
    imageQuality = 0.85;
  }

  const newPdfDoc = await PDFDocument.create();

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Canvas 2D context not available');
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
    };

    await page.render(renderContext).promise;

    // Convert canvas to compressed JPEG
    const jpegBlob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))),
        'image/jpeg',
        imageQuality
      );
    });

    const jpegBytes = await jpegBlob.arrayBuffer();
    const embeddedImage = await newPdfDoc.embedJpg(jpegBytes);

    const newPage = newPdfDoc.addPage([viewport.width, viewport.height]);
    newPage.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: viewport.width,
      height: viewport.height,
    });

    if (onProgress) {
      onProgress(Math.round((pageNum / numPages) * 100));
    }
  }

  const pdfBytes = await newPdfDoc.save();
  const compressedBlob = new Blob([pdfBytes as any], { type: 'application/pdf' });

  return {
    blob: compressedBlob,
    originalSize: file.size,
    compressedSize: compressedBlob.size,
  };
}

/**
 * Converts all pages of a PDF into individual image blobs (PNG, JPEG, WEBP)
 */
export async function convertPdfToImages(
  file: File,
  format: 'image/png' | 'image/jpeg' | 'image/webp' = 'image/png',
  scale: number = 2.0,
  onProgress?: (progress: number) => void
): Promise<PdfPageImage[]> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const pages: PdfPageImage[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) continue;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;

    const blob: Blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b || new Blob()), format, 0.95);
    });

    const dataUrl = URL.createObjectURL(blob);
    pages.push({ pageNum: i, blob, dataUrl });

    if (onProgress) {
      onProgress(Math.round((i / numPages) * 100));
    }
  }

  return pages;
}

/**
 * Extracts all plain text content from a PDF file
 */
export async function extractPdfText(
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ fullText: string; pages: { pageNum: number; text: string }[] }> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const pages: { pageNum: number; text: string }[] = [];
  let fullText = '';

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    pages.push({ pageNum: i, text: pageText });
    fullText += `=== [페이지 ${i}] ===\n${pageText}\n\n`;

    if (onProgress) {
      onProgress(Math.round((i / numPages) * 100));
    }
  }

  return { fullText: fullText.trim(), pages };
}

/**
 * Converts a text document into a clean PDF
 */
export async function convertTextToPdf(text: string, title: string = '문서'): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const lines = text.split('\n');
  const fontSize = 11;
  const lineHeight = 16;
  const margin = 40;
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const maxLinesPerPage = Math.floor((pageHeight - margin * 2 - 30) / lineHeight);

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let lineCount = 0;

  // Header Title
  currentPage.drawText(title, {
    x: margin,
    y: pageHeight - margin,
    size: 16,
    font: timesRomanFont,
    color: rgb(0.1, 0.1, 0.1),
  });

  let currentY = pageHeight - margin - 35;

  for (const line of lines) {
    if (lineCount >= maxLinesPerPage) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      currentY = pageHeight - margin;
      lineCount = 0;
    }

    // Truncate or fit line
    const safeText = line.substring(0, 95);
    currentPage.drawText(safeText, {
      x: margin,
      y: currentY,
      size: fontSize,
      font: timesRomanFont,
      color: rgb(0.2, 0.2, 0.2),
    });

    currentY -= lineHeight;
    lineCount++;
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as any], { type: 'application/pdf' });
}

/**
 * Combines multiple images into a single PDF
 */
export async function convertImagesToPdf(
  imageFiles: File[],
  fitA4: boolean = true
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();

  const A4_WIDTH = 595.28;
  const A4_HEIGHT = 841.89;

  for (const file of imageFiles) {
    const arrayBuffer = await file.arrayBuffer();
    let image;

    if (file.type === 'image/jpeg' || file.name.match(/\.(jpe?g)$/i)) {
      image = await pdfDoc.embedJpg(arrayBuffer);
    } else {
      try {
        image = await pdfDoc.embedPng(arrayBuffer);
      } catch {
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(bitmap, 0, 0);
          const jpgBlob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', 0.9));
          const jpgBytes = await jpgBlob.arrayBuffer();
          image = await pdfDoc.embedJpg(jpgBytes);
        } else {
          continue;
        }
      }
    }

    if (!image) continue;

    const imgDims = image.scale(1);

    if (fitA4) {
      const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
      const margin = 20;
      const maxWidth = A4_WIDTH - margin * 2;
      const maxHeight = A4_HEIGHT - margin * 2;

      const scale = Math.min(maxWidth / imgDims.width, maxHeight / imgDims.height, 1);
      const width = imgDims.width * scale;
      const height = imgDims.height * scale;

      const x = (A4_WIDTH - width) / 2;
      const y = (A4_HEIGHT - height) / 2;

      page.drawImage(image, { x, y, width, height });
    } else {
      const page = pdfDoc.addPage([imgDims.width, imgDims.height]);
      page.drawImage(image, { x: 0, y: 0, width: imgDims.width, height: imgDims.height });
    }
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as any], { type: 'application/pdf' });
}

/**
 * Merges multiple PDF files into one
 */
export async function mergePdfFiles(files: File[]): Promise<Blob> {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const pdfBytes = await mergedPdf.save();
  return new Blob([pdfBytes as any], { type: 'application/pdf' });
}

/**
 * Splits or extracts specific pages from a PDF
 */
export async function extractPdfPages(file: File, pageRangesStr: string): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const srcPdf = await PDFDocument.load(arrayBuffer);
  const totalPages = srcPdf.getPageCount();

  const pagesToExtract = new Set<number>();
  const parts = pageRangesStr.split(',').map((s) => s.trim());

  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map((n) => parseInt(n.trim(), 10));
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = Math.max(1, start); i <= Math.min(totalPages, end); i++) {
          pagesToExtract.add(i - 1);
        }
      }
    } else {
      const pageNum = parseInt(part, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        pagesToExtract.add(pageNum - 1);
      }
    }
  }

  if (pagesToExtract.size === 0) {
    throw new Error('유효한 페이지 번호를 입력해주세요.');
  }

  const newPdf = await PDFDocument.create();
  const pageIndices = Array.from(pagesToExtract).sort((a, b) => a - b);
  const copiedPages = await newPdf.copyPages(srcPdf, pageIndices);
  copiedPages.forEach((p) => newPdf.addPage(p));

  const pdfBytes = await newPdf.save();
  return new Blob([pdfBytes as any], { type: 'application/pdf' });
}

export interface PdfPageItem {
  id: string;
  originalIndex: number;
  rotation: number; // 0, 90, 180, 270
  thumbnailUrl: string;
  annotationDataUrl?: string; // New: stores paint annotations, drawings, text
}

/**
 * Loads a PDF file and generates thumbnail dataUrls and info for each page
 */
export async function loadPdfPagesForEditing(
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ pages: PdfPageItem[]; pageCount: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const pages: PdfPageItem[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 0.5 }); // Compact thumbnail scale

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      pages.push({
        id: `page_${i}_${Math.random().toString(36).slice(2, 7)}`,
        originalIndex: i - 1,
        rotation: 0,
        thumbnailUrl: dataUrl,
      });
    }

    if (onProgress) {
      onProgress(Math.round((i / numPages) * 100));
    }
  }

  return { pages, pageCount: numPages };
}

export interface PdfEditOptions {
  watermarkText?: string;
  watermarkColor?: string; // hex
  watermarkOpacity?: number; // 0~1
  headerText?: string;
  footerText?: string;
}

/**
 * Re-assembles and exports edited PDF with modified page order, rotations, and annotations
 */
export async function exportEditedPdf(
  originalFile: File,
  orderedPages: PdfPageItem[],
  options: PdfEditOptions = {}
): Promise<Blob> {
  const arrayBuffer = await originalFile.arrayBuffer();
  const srcPdf = await PDFDocument.load(arrayBuffer);
  const newPdf = await PDFDocument.create();

  const font = await newPdf.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await newPdf.embedFont(StandardFonts.Helvetica);

  for (let idx = 0; idx < orderedPages.length; idx++) {
    const pageInfo = orderedPages[idx];
    const [copiedPage] = await newPdf.copyPages(srcPdf, [pageInfo.originalIndex]);

    // Apply rotation
    const currentRotation = copiedPage.getRotation().angle;
    const finalRotation = (currentRotation + pageInfo.rotation) % 360;
    copiedPage.setRotation({ angle: finalRotation as any, type: 0 } as any);

    const { width, height } = copiedPage.getSize();

    // Embed painted drawings and annotations onto page
    if (pageInfo.annotationDataUrl) {
      try {
        const res = await fetch(pageInfo.annotationDataUrl);
        const imgBuffer = await res.arrayBuffer();
        const embeddedPng = await newPdf.embedPng(imgBuffer);
        copiedPage.drawImage(embeddedPng, {
          x: 0,
          y: 0,
          width,
          height,
        });
      } catch (err) {
        console.warn('Failed to embed page annotation image:', err);
      }
    }

    // Add watermark if specified
    if (options.watermarkText && options.watermarkText.trim()) {
      const text = options.watermarkText.trim();
      const fontSize = Math.min(width, height) / 10;
      copiedPage.drawText(text, {
        x: width * 0.15,
        y: height * 0.45,
        size: fontSize,
        font,
        color: rgb(0.7, 0.7, 0.7),
        opacity: options.watermarkOpacity ?? 0.35,
        rotate: { angle: 35, type: 0 } as any,
      });
    }

    // Header Text
    if (options.headerText && options.headerText.trim()) {
      copiedPage.drawText(options.headerText.trim(), {
        x: 35,
        y: height - 25,
        size: 9,
        font: regularFont,
        color: rgb(0.4, 0.4, 0.4),
      });
    }

    // Footer Text (Page Number)
    const footer = options.footerText
      ? `${options.footerText} - ${idx + 1} / ${orderedPages.length}`
      : `${idx + 1} / ${orderedPages.length}`;

    copiedPage.drawText(footer, {
      x: width / 2 - 25,
      y: 20,
      size: 9,
      font: regularFont,
      color: rgb(0.5, 0.5, 0.5),
    });

    newPdf.addPage(copiedPage);
  }

  const pdfBytes = await newPdf.save();
  return new Blob([pdfBytes as any], { type: 'application/pdf' });
}
