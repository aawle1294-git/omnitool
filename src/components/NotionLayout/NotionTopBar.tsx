import React from 'react';
import { 
  PanelLeft, 
  Star, 
  Share2, 
  MoreHorizontal, 
  Sparkles,
  Sun,
  Moon
} from 'lucide-react';
import { ActiveTab } from '../../types';

interface NotionTopBarProps {
  activeTab: ActiveTab;
  sidebarOpen: boolean;
  setSidebarOpen: (val: boolean) => void;
  onOpenWizard: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export const NotionTopBar: React.FC<NotionTopBarProps> = ({
  activeTab,
  sidebarOpen,
  setSidebarOpen,
  onOpenWizard,
  darkMode,
  setDarkMode,
}) => {
  const titles: Record<ActiveTab, { title: string; icon: string }> = {
    home: { title: '홈 대시보드', icon: '🏠' },
    installer: { title: '프로그램 설치 마법사', icon: '📦' },
    editor: { title: '파일 편집기 (PNG/사진 편집 · PDF 수정)', icon: '✂️' },
    compressor: { title: '파일 용량 압축기', icon: '📉' },
    converter: { title: '파일 형식 변환기', icon: '🔄' },
    media: { title: '영상 · 음악 변환기', icon: '🎬' },
    fun: { title: '재미 도구함', icon: '🐾' },
    tools: { title: '스마트 생산성 도구함', icon: '🛠️' },
  };

  const current = titles[activeTab];

  return (
    <header className="sticky top-0 z-30 h-12 bg-white/80 dark:bg-[#191919]/80 backdrop-blur-md border-b border-[#e9e9e7] dark:border-[#2f2f2f] px-4 flex items-center justify-between text-xs select-none">
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-2 text-[#787774]">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded hover:bg-[#efefed] dark:hover:bg-[#2c2c2c] text-[#37352f] dark:text-[#d3d3d3] md:hidden"
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        <span className="font-medium hover:text-[#37352f] dark:hover:text-white cursor-pointer">
          AllDesk
        </span>
        <span>/</span>
        <span className="font-semibold text-[#37352f] dark:text-white flex items-center gap-1.5">
          <span>{current.icon}</span>
          <span>{current.title}</span>
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5">
        {/* Quick Launch Wizard pill */}
        <button
          onClick={onOpenWizard}
          className="shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black dark:bg-white text-white dark:text-black font-semibold text-xs shadow-xs hover:opacity-90 transition"
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>설치 마법사 열기</span>
        </button>

        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-1.5 rounded hover:bg-[#efefed] dark:hover:bg-[#2c2c2c] text-[#787774] transition"
          title="테마 전환"
        >
          {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
};

