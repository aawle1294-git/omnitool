import React from 'react';
import { 
  Zap, 
  FileArchive, 
  RefreshCw, 
  DownloadCloud, 
  Wrench, 
  Search, 
  Settings, 
  ChevronDown, 
  Plus, 
  Star, 
  ChevronRight, 
  Sun, 
  Moon, 
  PanelLeftClose, 
  PanelLeft,
  Sparkles,
  Home
} from 'lucide-react';
import { ActiveTab } from '../../types';

interface NotionSidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  selectedAppsCount: number;
  onOpenWizard?: () => void;
}

export const NotionSidebar: React.FC<NotionSidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  setIsOpen,
  darkMode,
  setDarkMode,
  selectedAppsCount,
  onOpenWizard,
}) => {
  const pages: { id: ActiveTab; label: string; icon: string; countBadge?: number }[] = [
    { id: 'home', label: '홈 대시보드', icon: '🏠' },
    { 
      id: 'installer', 
      label: '프로그램 설치 마법사', 
      icon: '📦',
      countBadge: selectedAppsCount > 0 ? selectedAppsCount : undefined 
    },
    { id: 'editor', label: '파일 편집기 (PNG/사진 편집 · PDF)', icon: '✂️' },
    { id: 'compressor', label: '파일 용량 압축기', icon: '📉' },
    { id: 'converter', label: '파일 형식 변환기', icon: '🔄' },
    { id: 'media', label: '영상 · 음악 변환기', icon: '🎬' },
    { id: 'fun', label: '재미 도구함', icon: '🐾' },
    { id: 'tools', label: '스마트 생산성 도구', icon: '🛠️' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 md:sticky h-screen transition-all duration-200 ease-in-out flex flex-col justify-between border-r border-[#e9e9e7] dark:border-[#2f2f2f] bg-[#f7f6f3] dark:bg-[#202020] text-[#37352f] dark:text-[#d3d3d3] select-none ${
          isOpen ? 'w-64 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-14'
        }`}
      >
        <div>
          {/* Workspace Switcher Header */}
          <div className="flex items-center justify-between p-3 border-b border-[#e9e9e7] dark:border-[#2f2f2f]">
            {isOpen ? (
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-6 h-6 rounded bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-xs shrink-0">
                  N
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate text-[#37352f] dark:text-white flex items-center gap-1">
                    <span>AllDesk's Notion</span>
                    <ChevronDown className="w-3 h-3 text-[#787774]" />
                  </p>
                  <p className="text-[10px] text-[#787774] truncate">올인원 데스크</p>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setIsOpen(true)}
                className="w-8 h-8 rounded bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-xs cursor-pointer mx-auto"
                title="사이드바 열기"
              >
                N
              </div>
            )}

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-1 rounded hover:bg-[#efefed] dark:hover:bg-[#2c2c2c] text-[#787774] transition hidden md:block"
              title={isOpen ? '사이드바 접기' : '사이드바 펼치기'}
            >
              {isOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Quick Actions (Search, Wizard trigger) */}
          {isOpen && (
            <div className="px-3 pt-3 space-y-1">
              {onOpenWizard && (
                <button
                  onClick={onOpenWizard}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-black dark:bg-white text-white dark:text-black hover:opacity-90 shadow-sm transition group"
                >
                  <span className="flex items-center gap-1.5">
                    <span>⚡</span>
                    <span>설치 마법사 실행</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}
            </div>
          )}

          {/* Navigation Pages */}
          <div className="p-3 space-y-4">
            {isOpen && (
              <p className="text-[11px] font-bold text-[#9b9a97] tracking-wider uppercase px-2">
                워크스페이스 페이지
              </p>
            )}

            <nav className="space-y-0.5">
              {pages.map((p) => {
                const isActive = activeTab === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setActiveTab(p.id);
                      if (window.innerWidth < 768) setIsOpen(false);
                    }}
                    title={p.label}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition text-left ${
                      isActive
                        ? 'bg-[#efefed] dark:bg-[#2c2c2c] text-[#37352f] dark:text-white font-bold'
                        : 'hover:bg-[#efefed]/70 dark:hover:bg-[#282828] text-[#555] dark:text-[#aaa]'
                    }`}
                  >
                    <span className="text-base shrink-0">{p.icon}</span>
                    {isOpen && (
                      <span className="flex-1 truncate">{p.label}</span>
                    )}
                    {isOpen && p.countBadge !== undefined && (
                      <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-black dark:bg-white text-white dark:text-black font-bold">
                        {p.countBadge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Notion Style Callout Hint */}
            {isOpen && (
              <div className="pt-2">
                <div className="p-3 rounded-lg bg-[#efefed]/80 dark:bg-[#282828] border border-[#e3e2e0] dark:border-[#333] text-[11px] leading-relaxed text-[#787774]">
                  <p className="font-semibold text-[#37352f] dark:text-[#e3e2e0] flex items-center gap-1 mb-1">
                    <span>📌</span> 100% 로컬 보안
                  </p>
                  모든 파일 압축 및 변환은 브라우저 내부에서만 안전하게 실행됩니다.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bar (Theme toggle, Settings) */}
        <div className="p-3 border-t border-[#e9e9e7] dark:border-[#2f2f2f] flex items-center justify-between text-xs text-[#787774]">
          {isOpen ? (
            <>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="flex items-center gap-2 hover:text-[#37352f] dark:hover:text-white p-1 rounded hover:bg-[#efefed] dark:hover:bg-[#2c2c2c] transition"
              >
                {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
                <span>{darkMode ? '라이트 모드' : '다크 모드'}</span>
              </button>
              <span className="text-[10px] font-mono">v1.0.0</span>
            </>
          ) : (
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="mx-auto p-1.5 rounded hover:bg-[#efefed] dark:hover:bg-[#2c2c2c]"
              title="테마 전환"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

