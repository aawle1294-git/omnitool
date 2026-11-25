import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type Lang = 'ko' | 'en';

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'ko',
  setLang: () => {},
  t: (k) => k,
});

export const useLanguage = () => useContext(LanguageContext);

// ─── Translation Dictionary ───────────────────────────────────────────────────
const dict: Record<Lang, Record<string, string>> = {
  ko: {
    // ── Sidebar ──
    'page.home': '홈 대시보드',
    'page.installer': '프로그램 설치 마법사',
    'page.editor': '파일 편집소',
    'page.editor-image': 'PNG & 사진 편집기',
    'page.editor-pdf': 'PDF 문서 편집기',
    'page.compressor': '파일 용량 압축기',
    'page.converter': '파일 형식 변환기',
    'page.media': '영상 · 음악 변환기',
    'page.tools': '스마트 생산성 도구함',
    'page.fun': '재미 도구함',
    'page.privacy': '개인정보처리방침',
    'page.terms': '서비스 이용약관',
    'page.about': 'AllDesk 소개',

    // ── Sidebar UI ──
    'sidebar.workspace': '워크스페이스 페이지',
    'sidebar.subpages': '하위 페이지',
    'sidebar.callout.title': '📁 진짜 노션 하위 페이지',
    'sidebar.callout.desc': '하위 페이지를 누르면 해당 기능 전용 화면으로 전환됩니다.',
    'sidebar.open': '사이드바 열기',
    'sidebar.close': '사이드바 접기',
    'sidebar.expand': '사이드바 펼치기',
    'sidebar.subpage.expand': '하위 페이지 펼치기',
    'sidebar.subpage.collapse': '하위 페이지 접기',
    'sidebar.workspace.sub': '올인원 데스크 & 워크스페이스',
    'sidebar.wizard.btn': '설치 마법사 실행',
    'sidebar.dark': '🌙 다크',
    'sidebar.light': '☀️ 라이트',

    // ── TopBar ──
    'topbar.update': '업데이트',
    'topbar.wizard.full': '설치 마법사 열기',
    'topbar.wizard.short': '마법사',
    'topbar.dark.title': '다크 모드로 전환',
    'topbar.light.title': '라이트 모드로 전환',
    'topbar.update.title': '업데이트 로그 및 모든 버전 히스토리 보기',

    // ── Footer ──
    'footer.subtitle': '— 올인원 데스크 & 설치 마법사',
    'footer.updatelog': '업데이트 로그',
    'footer.privacy': '개인정보처리방침',
    'footer.terms': '서비스 이용약관',
    'footer.about': '서비스 소개 및 문의',
    'footer.safe': '100% 브라우저 로컬 안전 처리',

    // ── Document Titles ──
    'title.home': 'AllDesk - 올인원 노션 데스크',
    'title.editor': '파일 편집소 - AllDesk',
    'title.editor-image': 'PNG & 사진 편집기 - AllDesk',
    'title.editor-pdf': 'PDF 문서 편집기 - AllDesk',
    'title.compressor': '파일 용량 압축기 - AllDesk',
    'title.converter': '파일 형식 변환기 - AllDesk',
    'title.media': '영상 · 음악 변환기 - AllDesk',
    'title.tools': '스마트 생산성 도구 - AllDesk',
    'title.fun': '재미 도구함 - AllDesk',
    'title.installer': '프로그램 설치 마법사 - AllDesk',
    'title.privacy': '개인정보처리방침 - AllDesk',
    'title.terms': '서비스 이용약관 - AllDesk',
    'title.about': 'AllDesk 소개 및 문의 - AllDesk',

    // ── UpdateLog Modal ──
    'updatelog.title': '업데이트 로그',
    'updatelog.subtitle': '전체 버전 히스토리 & 변경 내역',
    'updatelog.filter.all': '전체',
    'updatelog.expandall': '전체 펼치기',
    'updatelog.collapseall': '전체 접기',
    'updatelog.latest': '최신 버전',
    'updatelog.highlights': '주요 변경사항',
    'updatelog.details': '상세 내역',
    'updatelog.dontshow': '이 버전은 다시 표시하지 않기',
    'updatelog.confirm': '확인했어요 ✓',
    'updatelog.updatelog.title': '업데이트 로그 보기',

    // ── Home ──
    'home.hero.title': 'AllDesk 올인원 노션 데스크',
    'home.hero.desc': '파일 압축, 형식 변환, 프로그램 원클릭 설치 마법사를 100% 브라우저 내에서 안전하게 제공합니다.',
    'home.hero.tag1': '상태: 운영중',
    'home.hero.tag2': '보안: 100% 브라우저 처리',
    'home.hero.tag3': '버전: v2.0.0',
    'home.callout.title': '지금 바로 쉬운 프로그램 설치 마법사를 사용해보세요',
    'home.callout.desc': '모든 작업은 서버에 전송 없이 브라우저 내에서 완전하게 실행됩니다.',
    'home.callout.btn': '설치 마법사 바로 실행',
    'home.quickactions': '빠른 실행 도구함 (Quick Actions)',
    'home.features.title': '🗂️ 주요 기능 데이터베이스 (Feature Database)',
    'home.security.title': '🛡️ 개인 정보 보안 약속 (Privacy Promise)',
    'home.security.desc': 'AllDesk의 모든 처리는 100% 브라우저 로컬에서 이루어집니다. 파일은 절대 서버로 전송되거나 저장되지 않습니다.',
    'home.security.local': '완전 로컬 처리',
    'home.security.local.desc': '파일이 서버로 전송되지 않습니다',
    'home.security.notrack': '추적 없음',
    'home.security.notrack.desc': '개인 데이터를 수집하지 않습니다',
    'home.security.free': '완전 무료',
    'home.security.free.desc': '가입 없이 즉시 사용 가능',

    // ── Editor Hub ──
    'editorhub.title': '파일 편집소',
    'editorhub.desc': '이미지, PNG 사진 편집과 PDF 문서를 전문적으로 편집하는 공간 입니다. 편집하다 싶으면 하위 페이지를 선택해주세요.',
    'editorhub.tag1': '하위 페이지 선택 공간',
    'editorhub.tag2': '이미지 자동 누끼따기 지원',
    'editorhub.tag3': '전체 PDF 페이지 & 주석 편집',
    'editorhub.tag4': 'PNG 투명도 편집',
    'editorhub.tag5': '100% 브라우저 처리',
    'editorhub.callout.title': '👈 하위 페이지 선택',
    'editorhub.callout.desc': '왼쪽의 하위 페이지를 선택하면 해당 기능의 전용 화면으로 이동합니다. 사이드바 상단의 Breadcrumb을 활용해 하위 페이지와 상위 페이지를 오갈 수 있습니다.',
    'editorhub.subpages': '하위 페이지 (Sub-pages)',
    'editorhub.subpages.count': '2개의 하위 페이지',
    'editorhub.image.title': 'PNG & 사진 편집기',
    'editorhub.image.badge1': '이미지 자동 누끼따기 신규',
    'editorhub.image.badge2': 'PNG 투명도 편집',
    'editorhub.image.badge3': '하위 페이지',
    'editorhub.image.desc': '이미지 자동 누끼따기(배경 제거, 마법봉 제거 기능, PNG 투명도 색상 제거, 사진 색상 보정, 밝기/대비/채도 보정, 좌우뒤집기, Crop), 이미지캔버스, 텍스트 추가, 실행 취소(Ctrl+Z)',
    'editorhub.image.feat1': '✂ 이미지 자동 누끼따기',
    'editorhub.image.feat2': '🖌 채색 마법봉 제거',
    'editorhub.image.feat3': '💾 PNG 투명 저장',
    'editorhub.image.feat4': '⌨ 멀티 실행 취소',
    'editorhub.pdf.title': 'PDF 문서 편집기',
    'editorhub.pdf.badge1': '전체 페이지 & 주석',
    'editorhub.pdf.badge2': 'PDF Editor',
    'editorhub.pdf.badge3': '하위 페이지',
    'editorhub.pdf.desc': '각각 페이지에 접근해서 페인팅모드로 주석 그리기, 텍스트 주석, 화이트아웃, 텍스트 추가 기타 주석 수기 작성 가능 및 페이지 90도 회전, 삭제, 순서 변경 및 워터마크 사용자설정',
    'editorhub.pdf.feat1': '📝 전체 페이지별 주석 편집',
    'editorhub.pdf.feat2': '🖊 자유 드로잉 & 하이라이터',
    'editorhub.pdf.feat3': '↕ 페이지 회전/순서 변경',
    'editorhub.pdf.feat4': '💧 워터마크 사용자설정',
  },

  en: {
    // ── Sidebar ──
    'page.home': 'Home Dashboard',
    'page.installer': 'App Install Wizard',
    'page.editor': 'File Editor',
    'page.editor-image': 'PNG & Photo Editor',
    'page.editor-pdf': 'PDF Document Editor',
    'page.compressor': 'File Compressor',
    'page.converter': 'File Converter',
    'page.media': 'Video & Music Converter',
    'page.tools': 'Smart Productivity Tools',
    'page.fun': 'Fun Tools',
    'page.privacy': 'Privacy Policy',
    'page.terms': 'Terms of Service',
    'page.about': 'About AllDesk',

    // ── Sidebar UI ──
    'sidebar.workspace': 'Workspace Pages',
    'sidebar.subpages': 'Sub-pages',
    'sidebar.callout.title': '📁 Real Notion Sub-pages',
    'sidebar.callout.desc': 'Click a sub-page to switch to its dedicated tool view.',
    'sidebar.open': 'Open sidebar',
    'sidebar.close': 'Close sidebar',
    'sidebar.expand': 'Expand sidebar',
    'sidebar.subpage.expand': 'Expand sub-pages',
    'sidebar.subpage.collapse': 'Collapse sub-pages',
    'sidebar.workspace.sub': 'All-in-one desk & workspace',
    'sidebar.wizard.btn': 'Launch Install Wizard',
    'sidebar.dark': '🌙 Dark',
    'sidebar.light': '☀️ Light',

    // ── TopBar ──
    'topbar.update': 'Updates',
    'topbar.wizard.full': 'Open Install Wizard',
    'topbar.wizard.short': 'Wizard',
    'topbar.dark.title': 'Switch to dark mode',
    'topbar.light.title': 'Switch to light mode',
    'topbar.update.title': 'View update log & full version history',

    // ── Footer ──
    'footer.subtitle': '— All-in-one desk & install wizard',
    'footer.updatelog': 'Update Log',
    'footer.privacy': 'Privacy Policy',
    'footer.terms': 'Terms of Service',
    'footer.about': 'About & Contact',
    'footer.safe': '100% browser-local processing',

    // ── Document Titles ──
    'title.home': 'AllDesk - All-in-one Notion Desk',
    'title.editor': 'File Editor - AllDesk',
    'title.editor-image': 'PNG & Photo Editor - AllDesk',
    'title.editor-pdf': 'PDF Document Editor - AllDesk',
    'title.compressor': 'File Compressor - AllDesk',
    'title.converter': 'File Converter - AllDesk',
    'title.media': 'Video & Music Converter - AllDesk',
    'title.tools': 'Smart Productivity Tools - AllDesk',
    'title.fun': 'Fun Tools - AllDesk',
    'title.installer': 'App Install Wizard - AllDesk',
    'title.privacy': 'Privacy Policy - AllDesk',
    'title.terms': 'Terms of Service - AllDesk',
    'title.about': 'About AllDesk - AllDesk',

    // ── UpdateLog Modal ──
    'updatelog.title': 'Update Log',
    'updatelog.subtitle': 'Full Version History & Changelog',
    'updatelog.filter.all': 'All',
    'updatelog.expandall': 'Expand All',
    'updatelog.collapseall': 'Collapse All',
    'updatelog.latest': 'Latest Version',
    'updatelog.highlights': 'Highlights',
    'updatelog.details': 'Details',
    'updatelog.dontshow': "Don't show again for this version",
    'updatelog.confirm': 'Got it ✓',
    'updatelog.updatelog.title': 'View Update Log',

    // ── Home ──
    'home.hero.title': 'AllDesk All-in-one Notion Desk',
    'home.hero.desc': 'File compression, format conversion, and one-click app install wizard — all running 100% safely in your browser.',
    'home.hero.tag1': 'Status: Live',
    'home.hero.tag2': 'Security: 100% Browser Processing',
    'home.hero.tag3': 'Version: v2.0.0',
    'home.callout.title': 'Try the easy App Install Wizard right now',
    'home.callout.desc': 'Everything runs entirely in your browser — nothing is sent to any server.',
    'home.callout.btn': 'Launch Install Wizard',
    'home.quickactions': '⚡ Quick Actions',
    'home.features.title': '🗂️ Feature Database',
    'home.security.title': '🛡️ Privacy Promise',
    'home.security.desc': 'All processing in AllDesk happens 100% locally in your browser. Files are never uploaded to or stored on any server.',
    'home.security.local': 'Fully Local',
    'home.security.local.desc': 'Files never leave your browser',
    'home.security.notrack': 'No Tracking',
    'home.security.notrack.desc': 'No personal data collected',
    'home.security.free': 'Completely Free',
    'home.security.free.desc': 'No sign-up, instant access',

    // ── Editor Hub ──
    'editorhub.title': 'File Editor',
    'editorhub.desc': 'A workspace for professional image, PNG photo, and PDF document editing. Choose a sub-page to get started.',
    'editorhub.tag1': 'Select a sub-page',
    'editorhub.tag2': 'Auto background removal',
    'editorhub.tag3': 'Full PDF page & annotation editor',
    'editorhub.tag4': 'PNG transparency editing',
    'editorhub.tag5': '100% browser processing',
    'editorhub.callout.title': '👈 Select a Sub-page',
    'editorhub.callout.desc': 'Pick a sub-page from the left sidebar to open its dedicated editor. Use the breadcrumb at the top to navigate between sub-pages and the parent page.',
    'editorhub.subpages': 'Sub-pages',
    'editorhub.subpages.count': '2 sub-pages',
    'editorhub.image.title': 'PNG & Photo Editor',
    'editorhub.image.badge1': 'Auto Background Removal NEW',
    'editorhub.image.badge2': 'PNG Transparency',
    'editorhub.image.badge3': 'Sub-page',
    'editorhub.image.desc': 'Auto background removal (magic wand, color removal), photo color correction, brightness/contrast/saturation, flip, crop, canvas, text overlay, undo (Ctrl+Z)',
    'editorhub.image.feat1': '✂ Auto background removal',
    'editorhub.image.feat2': '🖌 Magic wand color removal',
    'editorhub.image.feat3': '💾 Save as transparent PNG',
    'editorhub.image.feat4': '⌨ Multi-level undo',
    'editorhub.pdf.title': 'PDF Document Editor',
    'editorhub.pdf.badge1': 'Full Page & Annotations',
    'editorhub.pdf.badge2': 'PDF Editor',
    'editorhub.pdf.badge3': 'Sub-page',
    'editorhub.pdf.desc': 'Per-page painting mode for annotations, text notes, whiteout, freehand drawing, page rotate 90°, delete, reorder, and custom watermarks',
    'editorhub.pdf.feat1': '📝 Per-page annotation editor',
    'editorhub.pdf.feat2': '🖊 Freehand drawing & highlighter',
    'editorhub.pdf.feat3': '↕ Rotate / reorder pages',
    'editorhub.pdf.feat4': '💧 Custom watermarks',
  },
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem('alldesk_lang') as Lang | null;
      if (saved === 'ko' || saved === 'en') return saved;
    } catch {}
    return navigator.language.startsWith('en') ? 'en' : 'ko';
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem('alldesk_lang', l); } catch {}
  }, []);

  const t = useCallback((key: string): string => {
    return dict[lang][key] ?? dict['ko'][key] ?? key;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
