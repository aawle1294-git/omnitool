import React from 'react';
import { 
  PanelLeft, 
  Sun, 
  Moon, 
  Zap, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { ActiveTab } from '../../types';

interface NotionTopBarProps {
  activeTab: ActiveTab;
  setActiveTab?: (tab: ActiveTab) => void;
  editorSubTab?: 'image' | 'pdf';
  sidebarOpen: boolean;
  setSidebarOpen: (val: boolean) => void;
  onOpenWizard: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export const NotionTopBar: React.FC<NotionTopBarProps> = ({
  activeTab,
  setActiveTab,
  editorSubTab = 'image',
  sidebarOpen,
  setSidebarOpen,
  onOpenWizard,
  darkMode,
  setDarkMode,
}) => {
  const titles: Record<ActiveTab, { title: string; icon: string }> = {
    home: { title: '홈 대시보드', icon: '🏠' },
    installer: { title: '프로그램 설치 마법사', icon: '📦' },
    editor: { title: '파일 편집소', icon: '✂️' },
    compressor: { title: '파일 용량 압축기', icon: '📉' },
    converter: { title: '파일 형식 변환기', icon: '🔄' },
    media: { title: '영상 · 음악 변환기', icon: '🎬' },
    fun: { title: '재미 도구함', icon: '🐾' },
    tools: { title: '스마트 생산성 도구함', icon: '🛠️' },
  };

  const current = titles[activeTab];

  // Hierarchical Sub-page Breadcrumb Determination
  const getSubPageInfo = () => {
    if (activeTab === 'editor') {
      return editorSubTab === 'image'
        ? { parent: '파일 편집소', icon: '🖼️', title: 'PNG & 사진 편집기' }
        : { parent: '파일 편집소', icon: '📄', title: 'PDF 문서 편집기' };
    }
    if (activeTab === 'media') {
      return { parent: '변환 도구', icon: '🎬', title: '영상 · 음악 변환기' };
    }
    if (activeTab === 'fun') {
      return { parent: '유틸리티', icon: '🐾', title: '재미 도구함' };
    }
    return null;
  };

  const subPageInfo = getSubPageInfo();

  return (
    <header className="sticky top-0 z-30 h-12 bg-white/85 dark:bg-[#191919]/85 backdrop-blur-md border-b border-[#e9e9e7] dark:border-[#2f2f2f] px-4 flex items-center justify-between text-xs select-none">
      {/* Left: Notion Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-[#787774] overflow-hidden">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded hover:bg-[#efefed] dark:hover:bg-[#2c2c2c] text-[#37352f] dark:text-[#d3d3d3] md:hidden"
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        {/* Root Breadcrumb */}
        <button
          onClick={() => setActiveTab?.('home')}
          className="font-medium hover:text-[#37352f] dark:hover:text-white transition flex items-center gap-1 shrink-0"
        >
          <span>AllDesk</span>
        </button>

        <span className="text-[#a1a1aa] shrink-0">/</span>

        {/* Parent or Single Page */}
        {subPageInfo ? (
          <>
            <button
              onClick={() => {
                if (activeTab === 'editor') setActiveTab?.('editor');
                else if (activeTab === 'media') setActiveTab?.('converter');
                else if (activeTab === 'fun') setActiveTab?.('tools');
              }}
              className="font-medium hover:text-[#37352f] dark:hover:text-white transition shrink-0"
            >
              <span>{subPageInfo.parent}</span>
            </button>
            <span className="text-[#a1a1aa] shrink-0">/</span>
            {/* Sub-page */}
            <span className="font-bold text-[#37352f] dark:text-white flex items-center gap-1 truncate">
              <span>{subPageInfo.icon}</span>
              <span className="truncate">{subPageInfo.title}</span>
            </span>
          </>
        ) : (
          <span className="font-semibold text-[#37352f] dark:text-white flex items-center gap-1.5 truncate">
            <span>{current.icon}</span>
            <span className="truncate">{current.title}</span>
          </span>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Quick Launch Wizard pill */}
        <button
          onClick={onOpenWizard}
          className="shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black dark:bg-white text-white dark:text-black font-semibold text-xs shadow-xs hover:opacity-90 transition"
        >
          <Zap className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">설치 마법사 열기</span>
          <span className="sm:hidden">마법사</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-1.5 rounded-lg hover:bg-[#efefed] dark:hover:bg-[#2c2c2c] text-[#787774] dark:text-[#a0a0a0] transition"
          title={darkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
