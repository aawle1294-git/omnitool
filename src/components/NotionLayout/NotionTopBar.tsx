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
  sidebarOpen: boolean;
  setSidebarOpen: (val: boolean) => void;
  onOpenWizard: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export const NotionTopBar: React.FC<NotionTopBarProps> = ({
  activeTab,
  setActiveTab,
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
    'editor-image': { title: 'PNG & 사진 편집기', icon: '🖼️' },
    'editor-pdf': { title: 'PDF 문서 편집기', icon: '📄' },
    compressor: { title: '파일 용량 압축기', icon: '📉' },
    converter: { title: '파일 형식 변환기', icon: '🔄' },
    media: { title: '영상 · 음악 변환기', icon: '🎬' },
    fun: { title: '재미 도구함', icon: '🐾' },
    tools: { title: '스마트 생산성 도구함', icon: '🛠️' },
  };

  const current = titles[activeTab] || titles['home'];

  return (
    <header className="sticky top-0 z-30 h-12 bg-white/85 dark:bg-[#191919]/85 backdrop-blur-md border-b border-[#e9e9e7] dark:border-[#2f2f2f] px-4 flex items-center justify-between text-xs select-none">
      {/* Left: Notion Hierarchical Breadcrumbs */}
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

        {/* Hierarchical Subpage Breadcrumb */}
        {activeTab === 'editor-image' || activeTab === 'editor-pdf' ? (
          <>
            <button
              onClick={() => setActiveTab?.('editor')}
              className="font-medium hover:text-[#37352f] dark:hover:text-white transition shrink-0 flex items-center gap-1"
            >
              <span>✂️</span>
              <span>파일 편집소</span>
            </button>
            <span className="text-[#a1a1aa] shrink-0">/</span>
            <span className="font-bold text-[#37352f] dark:text-white flex items-center gap-1 truncate">
              <span>{current.icon}</span>
              <span className="truncate">{current.title}</span>
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
