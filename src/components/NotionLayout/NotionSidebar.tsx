import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  PanelLeftClose, 
  PanelLeft,
} from 'lucide-react';
import { ActiveTab } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface SubPage {
  id: ActiveTab;
  labelKey: string;
  icon: string;
}

interface PageItem {
  id: ActiveTab;
  labelKey: string;
  icon: string;
  countBadge?: number;
  subPages?: SubPage[];
}

interface NotionSidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  selectedAppsCount: number;
  onOpenWizard?: () => void;
  onOpenUpdateLog?: () => void;
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
  onOpenUpdateLog,
}) => {
  const { lang, setLang, t } = useLanguage();

  const [expandedPages, setExpandedPages] = useState<Record<string, boolean>>({
    editor: true,
  });

  useEffect(() => {
    if (activeTab === 'editor' || activeTab === 'editor-image' || activeTab === 'editor-pdf') {
      setExpandedPages((prev) => ({ ...prev, editor: true }));
    }
  }, [activeTab]);

  const toggleExpand = (pageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedPages((prev) => ({ ...prev, [pageId]: !prev[pageId] }));
  };

  const pages: PageItem[] = [
    { id: 'home', labelKey: 'page.home', icon: '🏠' },
    { 
      id: 'installer', 
      labelKey: 'page.installer', 
      icon: '📦',
      countBadge: selectedAppsCount > 0 ? selectedAppsCount : undefined 
    },
    { 
      id: 'editor', 
      labelKey: 'page.editor', 
      icon: '✂️',
      subPages: [
        { id: 'editor-image', labelKey: 'page.editor-image', icon: '🖼️' },
        { id: 'editor-pdf', labelKey: 'page.editor-pdf', icon: '📄' },
      ]
    },
    { id: 'compressor', labelKey: 'page.compressor', icon: '📉' },
    { id: 'converter', labelKey: 'page.converter', icon: '🔄' },
    { id: 'media', labelKey: 'page.media', icon: '🎬' },
    { id: 'tools', labelKey: 'page.tools', icon: '🛠️' },
    { id: 'fun', labelKey: 'page.fun', icon: '🐾' },
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
        <div className="overflow-y-auto no-scrollbar flex-1">
          {/* Workspace Switcher Header */}
          <div className="flex items-center justify-between p-3 border-b border-[#e9e9e7] dark:border-[#2f2f2f]">
            {isOpen ? (
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-6 h-6 rounded bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  A
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate text-[#37352f] dark:text-white flex items-center gap-1">
                    <span>AllDesk</span>
                    <ChevronDown className="w-3 h-3 text-[#787774]" />
                  </p>
                  <p className="text-[10px] text-[#787774] truncate">{t('sidebar.workspace.sub')}</p>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setIsOpen(true)}
                className="w-8 h-8 rounded bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-xs cursor-pointer mx-auto shadow-2xs"
                title={t('sidebar.open')}
              >
                N
              </div>
            )}

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-1 rounded hover:bg-[#efefed] dark:hover:bg-[#2c2c2c] text-[#787774] transition hidden md:block"
              title={isOpen ? t('sidebar.close') : t('sidebar.expand')}
            >
              {isOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Quick Actions (Installer Wizard trigger) */}
          {isOpen && (
            <div className="px-3 pt-3 space-y-1">
              {onOpenWizard && (
                <button
                  onClick={onOpenWizard}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-black dark:bg-white text-white dark:text-black hover:opacity-90 shadow-sm transition group"
                >
                  <span className="flex items-center gap-1.5">
                    <span>⚡</span>
                    <span>{t('sidebar.wizard.btn')}</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}
            </div>
          )}

          {/* Navigation Pages */}
          <div className="p-3 space-y-3">
            {isOpen && (
              <div className="flex items-center justify-between px-2">
                <p className="text-[10px] font-bold text-[#9b9a97] tracking-wider uppercase">
                  {t('sidebar.workspace')}
                </p>
                <span className="text-[10px] text-[#9b9a97] font-mono">{t('sidebar.subpages')}</span>
              </div>
            )}

            <nav className="space-y-1">
              {pages.map((p) => {
                const hasSubPages = Boolean(p.subPages && p.subPages.length > 0);
                const isExpanded = expandedPages[p.id];
                const isParentDirectlyActive = activeTab === p.id;
                const isChildActive = p.subPages?.some((sp) => activeTab === sp.id) ?? false;

                return (
                  <div key={p.id} className="space-y-0.5">
                    {/* Parent Page Row */}
                    <div
                      className={`group flex items-center justify-between rounded-lg transition ${
                        isParentDirectlyActive
                          ? 'bg-[#efefed] dark:bg-[#2c2c2c] text-[#37352f] dark:text-white font-bold'
                          : isChildActive
                          ? 'bg-[#f0efe9] dark:bg-[#272727] text-[#37352f] dark:text-white font-semibold'
                          : 'hover:bg-[#efefed]/70 dark:hover:bg-[#282828] text-[#555] dark:text-[#aaa]'
                      }`}
                    >
                      <button
                        onClick={() => {
                          setActiveTab(p.id);
                          if (hasSubPages) {
                            setExpandedPages((prev) => ({ ...prev, [p.id]: true }));
                          }
                          if (window.innerWidth < 768 && !hasSubPages) setIsOpen(false);
                        }}
                        title={t(p.labelKey)}
                        className="flex-1 flex items-center gap-2 px-2 py-1.5 text-xs text-left truncate"
                      >
                        <span className="text-sm shrink-0">{p.icon}</span>
                        {isOpen && <span className="truncate">{t(p.labelKey)}</span>}
                      </button>

                      {/* Expand/Collapse Toggle Arrow for subpages */}
                      {isOpen && hasSubPages && (
                        <button
                          onClick={(e) => toggleExpand(p.id, e)}
                          className="p-1 mr-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-[#787774] transition"
                          title={isExpanded ? t('sidebar.subpage.collapse') : t('sidebar.subpage.expand')}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}

                      {isOpen && p.countBadge !== undefined && (
                        <span className="mr-2 px-1.5 py-0.2 text-[10px] rounded-full bg-black dark:bg-white text-white dark:text-black font-bold">
                          {p.countBadge}
                        </span>
                      )}
                    </div>

                    {/* Sub-pages Nested Tree */}
                    {isOpen && hasSubPages && isExpanded && (
                      <div className="ml-3 pl-3 border-l border-[#e3e2e0] dark:border-[#333] space-y-0.5 my-1">
                        {p.subPages!.map((sp) => {
                          const isSubActive = activeTab === sp.id;
                          return (
                            <button
                              key={sp.id}
                              onClick={() => {
                                setActiveTab(sp.id);
                                if (window.innerWidth < 768) setIsOpen(false);
                              }}
                              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] transition text-left ${
                                isSubActive
                                  ? 'bg-black dark:bg-white text-white dark:text-black font-bold shadow-2xs'
                                  : 'text-[#787774] hover:text-[#37352f] dark:hover:text-white hover:bg-[#efefed] dark:hover:bg-[#282828]'
                              }`}
                            >
                              <span className="text-xs shrink-0">{sp.icon}</span>
                              <span className="truncate">{t(sp.labelKey)}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

          </div>
        </div>

        {/* Bottom Workspace Footer */}
        {isOpen && (
          <div className="p-3 border-t border-[#e9e9e7] dark:border-[#2f2f2f] space-y-2">
            {/* Version + Update log */}
            <div className="flex items-center justify-between text-[11px] text-[#787774]">
              <button
                onClick={onOpenUpdateLog}
                className="flex items-center gap-1.5 hover:text-black dark:hover:text-white transition group py-0.5 px-1.5 rounded hover:bg-[#efefed] dark:hover:bg-[#2c2c2c] text-left"
                title={t('topbar.update.title')}
              >
                <span className="font-semibold text-[#37352f] dark:text-white">AllDesk v2.0.0</span>
                <span className="px-1.5 py-0.2 rounded-full bg-violet-600 text-white text-[9px] font-bold">
                  NEW
                </span>
              </button>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="px-2 py-1 rounded hover:bg-[#efefed] dark:hover:bg-[#2c2c2c] transition"
              >
                {darkMode ? t('sidebar.light') : t('sidebar.dark')}
              </button>
            </div>

            {/* Language Toggle Row */}
            <div className="flex items-center justify-center gap-1">
              <button
                onClick={() => setLang('ko')}
                className={`flex-1 py-1 rounded text-[11px] font-bold transition ${
                  lang === 'ko'
                    ? 'bg-black dark:bg-white text-white dark:text-black'
                    : 'text-[#787774] hover:bg-[#efefed] dark:hover:bg-[#2c2c2c]'
                }`}
              >
                🇰🇷 KO
              </button>
              <button
                onClick={() => setLang('en')}
                className={`flex-1 py-1 rounded text-[11px] font-bold transition ${
                  lang === 'en'
                    ? 'bg-black dark:bg-white text-white dark:text-black'
                    : 'text-[#787774] hover:bg-[#efefed] dark:hover:bg-[#2c2c2c]'
                }`}
              >
                🇺🇸 EN
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
