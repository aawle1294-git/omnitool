import { ActiveTab } from '../types';

export const tabToPath: Record<ActiveTab, string> = {
  home: '/',
  editor: '/editor',
  'editor-image': '/editor/image',
  'editor-pdf': '/editor/pdf',
  compressor: '/compressor',
  converter: '/converter',
  media: '/media',
  tools: '/tools',
  fun: '/fun',
  installer: '/installer',
};

export const pathToTab = (pathname: string): ActiveTab => {
  let clean = '/';
  try {
    clean = decodeURIComponent(pathname || '/').replace(/\/+$/, '') || '/';
  } catch {
    clean = pathname.replace(/\/+$/, '') || '/';
  }

  // PNG / Image editor subpage
  if (
    clean === '/editor/image' ||
    clean === '/editor/png' ||
    clean === '/editor/사진' ||
    clean === '/editor/이미지' ||
    clean === '/image' ||
    clean === '/png' ||
    clean === '/사진'
  ) {
    return 'editor-image';
  }

  // PDF editor subpage
  if (
    clean === '/editor/pdf' ||
    clean === '/pdf' ||
    clean === '/editor/피디에프'
  ) {
    return 'editor-pdf';
  }

  // Parent Editor Hub
  if (clean === '/editor' || clean === '/편집' || clean === '/편집소' || clean === '/편집기') {
    return 'editor';
  }

  // Compressor
  if (clean === '/compressor' || clean === '/compress' || clean === '/압축' || clean === '/용량압축') {
    return 'compressor';
  }

  // Converter
  if (clean === '/converter' || clean === '/convert' || clean === '/변환' || clean === '/형식변환') {
    return 'converter';
  }

  // Media
  if (clean === '/media' || clean === '/video' || clean === '/audio' || clean === '/영상' || clean === '/음악') {
    return 'media';
  }

  // Tools
  if (clean === '/tools' || clean === '/도구' || clean === '/생산성') {
    return 'tools';
  }

  // Fun
  if (clean === '/fun' || clean === '/재미' || clean === '/게임') {
    return 'fun';
  }

  // Installer
  if (clean === '/installer' || clean === '/install' || clean === '/설치' || clean === '/마법사') {
    return 'installer';
  }

  return 'home';
};
