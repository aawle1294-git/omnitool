export type ActiveTab = 
  | 'home'
  | 'editor'
  | 'compressor'
  | 'converter'
  | 'media'
  | 'fun'
  | 'installer'
  | 'tools';

export interface ProcessedFile {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  compressedSize?: number;
  compressedBlob?: Blob;
  previewUrl?: string;
  compressedUrl?: string;
  status: 'idle' | 'processing' | 'done' | 'error';
  progress?: number;
  error?: string;
  width?: number;
  height?: number;
  format?: string;
}

export type Category = 
  | 'browser'
  | 'dev'
  | 'communication'
  | 'utility'
  | 'media'
  | 'office'
  | 'gaming'
  | 'security';

export interface SoftwareApp {
  id: string;
  name: string;
  nameKo?: string;
  category: Category;
  description: string;
  descriptionKo: string;
  wingetId: string;
  officialUrl: string;
  directDownloadUrl?: string;
  icon: string; // Lucide icon name or emoji
  popular?: boolean;
  recommended?: boolean;
  isOpenSource?: boolean;
}

