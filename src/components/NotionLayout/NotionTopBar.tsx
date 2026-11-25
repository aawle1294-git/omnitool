import React from 'react';
import { 
  PanelLeft, 
  Sun, 
  Moon, 
  Zap, 
  Sparkles,
  Languages
} from 'lucide-react';
import { ActiveTab } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface NotionTopBarProps {
  activeTab: ActiveTab;
  setActiveTab?: (tab: ActiveTab) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (val: boolean) => void;
  onOpenWizard: () => void;
  onOpenUpdateLog?: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export const NotionTopBar: React.FC<NotionTopBarProps> = ({
  activeTab,
  setActiveTab,
  sidebarOpen,
  setSidebarOpen,
  onOpenWizard,
  onOpenUpdateLog,
  darkMode,
  setDarkMode,
}) => {
  const { lang, setLang, t } = useLanguage();

  const titles: Record<ActiveTab, { title: string; icon: string }> = {
    home: { title: t('page.home'), icon: '🏠' },
    installer: { title: t('page.installer'), icon: '📦' },
    editor: { title: t('page.editor'), icon: '✂️' },
    'editor-image': { title: t('page.editor-image'), icon: '🖼️' },
    'editor-pdf': { title: t('page.editor-pdf'), icon: '📄' },
    compressor: { title: t('page.compressor'), icon: '📉' },
    converter: { title: t('page.converter'), icon: '🔄' },
    media: { title: t('page.media'), icon: '🎬' },
    fun: { title: t('page.fun'), icon: '🐾' },
    tools: { title: t('page.tools'), icon: '🛠️' },
    privacy: { title: t('page.privacy'), icon: '🛡️' },
    terms: { title: t('page.terms'), icon: '📜' },
    about: { title: t('page.about'), icon: '✨' },
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
              <span>{t('page.editor')}</span>
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
        {/* Update Log Trigger Button */}
        {onOpenUpdateLog && (
          <button
            onClick={onOpenUpdateLog}
            className="shrink-0 whitespace-nowrap flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 dark:hover:bg-violet-900/50 text-violet-700 dark:text-violet-300 font-bold text-xs border border-violet-200 dark:border-violet-800/40 transition group shadow-2xs"
            title={t('topbar.update.title')}
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 group-hover:rotate-12 transition-transform" />
            <span>v2.0.0</span>
            <span className="hidden sm:inline">{t('topbar.update')}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-pulse" />
          </button>
        )}

        {/* Quick Launch Wizard pill */}
        <button
          onClick={onOpenWizard}
          className="shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black dark:bg-white text-white dark:text-black font-semibold text-xs shadow-xs hover:opacity-90 transition"
        >
          <Zap className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('topbar.wizard.full')}</span>
          <span className="sm:hidden">{t('topbar.wizard.short')}</span>
        </button>

        {/* Language Toggle KO / EN */}
        <button
          onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-[#efefed] dark:hover:bg-[#2c2c2c] text-[#787774] dark:text-[#a0a0a0] font-bold text-[11px] transition border border-transparent hover:border-[#e9e9e7] dark:hover:border-[#333]"
          title="Switch language / 언어 전환"
        >
          <Languages className="w-3.5 h-3.5" />
          <span>{lang === 'ko' ? 'KO' : 'EN'}</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-1.5 rounded-lg hover:bg-[#efefed] dark:hover:bg-[#2c2c2c] text-[#787774] dark:text-[#a0a0a0] transition"
          title={darkMode ? t('topbar.light.title') : t('topbar.dark.title')}
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
