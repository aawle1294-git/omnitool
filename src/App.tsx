import React, { useState, useEffect, useCallback } from 'react';
import { NotionSidebar } from './components/NotionLayout/NotionSidebar';
import { NotionTopBar } from './components/NotionLayout/NotionTopBar';
import { HomeView } from './components/Home/HomeView';
import { CompressorView } from './components/Compressor/CompressorView';
import { ConverterView } from './components/Converter/ConverterView';
import { MediaConverterView } from './components/MediaConverter/MediaConverterView';
import { FunToolsView } from './components/FunTools/FunToolsView';
import { AppInstallerView } from './components/Installer/AppInstallerView';
import { ExtraToolsView } from './components/ExtraTools/ExtraToolsView';
import { FileEditorView } from './components/Editor/FileEditorView';
import { EditorHubView } from './components/Editor/EditorHubView';
import { PrivacyPolicyView } from './components/Legal/PrivacyPolicyView';
import { TermsView } from './components/Legal/TermsView';
import { AboutView } from './components/Legal/AboutView';
import { AdBanner } from './components/AdSense/AdBanner';
import { NotionInstallerWizard } from './components/Installer/NotionInstallerWizard';
import { UpdateLogModal } from './components/UpdateLog/UpdateLogModal';
import { CURRENT_VERSION } from './data/updateLogs';
import { launchNativeInstaller } from './utils/installerBridge';
import { tabToPath, pathToTab } from './utils/routes';
import { ActiveTab } from './types';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { useLanguage } from './contexts/LanguageContext';

export const App: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTabState] = useState<ActiveTab>(() => {
    if (typeof window !== 'undefined') {
      return pathToTab(window.location.pathname);
    }
    return 'home';
  });

  const setActiveTab = useCallback((tab: ActiveTab) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      const targetPath = tabToPath[tab] || '/';
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ tab }, '', targetPath);
      }
    }
  }, []);

  // Listen to browser Back / Forward buttons (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const currentTab = pathToTab(window.location.pathname);
      setActiveTabState(currentTab);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync initial URL if needed
  useEffect(() => {
    const currentTab = pathToTab(window.location.pathname);
    const expectedPath = tabToPath[currentTab];
    if (window.location.pathname !== expectedPath) {
      window.history.replaceState({ tab: currentTab }, '', expectedPath);
    }
  }, []);

  // Sync document title with real route
  useEffect(() => {
    const titles: Record<ActiveTab, string> = {
      home: t('title.home'),
      editor: t('title.editor'),
      'editor-image': t('title.editor-image'),
      'editor-pdf': t('title.editor-pdf'),
      compressor: t('title.compressor'),
      converter: t('title.converter'),
      media: t('title.media'),
      tools: t('title.tools'),
      fun: t('title.fun'),
      installer: t('title.installer'),
      privacy: t('title.privacy'),
      terms: t('title.terms'),
      about: t('title.about'),
    };
    document.title = titles[activeTab] || 'AllDesk';
  }, [activeTab, t]);

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [isWizardModalOpen, setIsWizardModalOpen] = useState<boolean>(false);
  const [isUpdateLogOpen, setIsUpdateLogOpen] = useState<boolean>(false);
  const [selectedApps, setSelectedApps] = useState<string[]>([
    'chrome',
    'bandizip',
    'vscode',
    'kakaotalk',
  ]);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('alldesk_dark') || localStorage.getItem('omnitool_dark');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Auto-display update log modal whenever a new version is released!
  useEffect(() => {
    try {
      const viewedVersion = localStorage.getItem('alldesk_viewed_version');
      if (viewedVersion !== CURRENT_VERSION) {
        setIsUpdateLogOpen(true);
      }
    } catch (e) {
      console.warn('LocalStorage access skipped:', e);
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('alldesk_dark', String(darkMode));
  }, [darkMode]);

  const handleOpenWizard = async () => {
    const ok = await launchNativeInstaller();
    if (!ok) {
      setIsWizardModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen flex bg-white dark:bg-[#191919] text-[#37352f] dark:text-[#d3d3d3] font-sans transition-colors">
      {/* Notion Sidebar */}
      <NotionSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        selectedAppsCount={selectedApps.length}
        onOpenWizard={handleOpenWizard}
        onOpenUpdateLog={() => setIsUpdateLogOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Notion Top Bar */}
        <NotionTopBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          onOpenWizard={handleOpenWizard}
          onOpenUpdateLog={() => setIsUpdateLogOpen(true)}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />

        {/* Page Content */}
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-6">
          {activeTab === 'home' && (
            <HomeView
              setActiveTab={setActiveTab}
              selectedApps={selectedApps}
              setSelectedApps={setSelectedApps}
              onOpenWizard={handleOpenWizard}
            />
          )}
          {activeTab === 'editor' && (
            <EditorHubView setActiveTab={setActiveTab} />
          )}
          {activeTab === 'editor-image' && (
            <FileEditorView mode="image" setActiveTab={setActiveTab} />
          )}
          {activeTab === 'editor-pdf' && (
            <FileEditorView mode="pdf" setActiveTab={setActiveTab} />
          )}
          {activeTab === 'compressor' && <CompressorView />}
          {activeTab === 'converter' && <ConverterView />}
          {activeTab === 'media' && <MediaConverterView />}
          {activeTab === 'fun' && <FunToolsView />}
          {activeTab === 'installer' && (
            <AppInstallerView
              selectedApps={selectedApps}
              setSelectedApps={setSelectedApps}
            />
          )}
          {activeTab === 'tools' && <ExtraToolsView />}
          {activeTab === 'privacy' && <PrivacyPolicyView setActiveTab={setActiveTab} />}
          {activeTab === 'terms' && <TermsView setActiveTab={setActiveTab} />}
          {activeTab === 'about' && <AboutView setActiveTab={setActiveTab} />}

          {/* AdSense Banner Unit (Auto-responsive & Safe) */}
          <AdBanner className="mt-8" />
        </main>

        {/* Notion Minimalist Footer */}
        <footer className="border-t border-[#e9e9e7] dark:border-[#2f2f2f] py-6 px-6 text-xs text-[#9b9a97] transition-colors">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-[10px]">
                A
              </span>
              <span className="font-semibold text-[#37352f] dark:text-white">
                AllDesk
              </span>
              <span>— {t('footer.subtitle').replace('— ', '')}</span>
            </div>

            {/* Mandatory Policy Links for Google AdSense Approval */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-[#787774] dark:text-[#a0a0a0]">
              <button
                onClick={() => setIsUpdateLogOpen(true)}
                className="hover:text-black dark:hover:text-white transition underline underline-offset-2 flex items-center gap-1 font-semibold text-violet-600 dark:text-violet-400"
              >
                <Sparkles className="w-3 h-3" />
                <span>{t('footer.updatelog')} ({CURRENT_VERSION})</span>
              </button>
              <span>•</span>
              <button
                onClick={() => setActiveTab('privacy')}
                className="hover:text-black dark:hover:text-white transition underline underline-offset-2"
              >
                  {t('footer.privacy')}
              </button>
              <span>•</span>
              <button
                onClick={() => setActiveTab('terms')}
                className="hover:text-black dark:hover:text-white transition underline underline-offset-2"
              >
                  {t('footer.terms')}
              </button>
              <span>•</span>
              <button
                onClick={() => setActiveTab('about')}
                className="hover:text-black dark:hover:text-white transition underline underline-offset-2"
              >
                  {t('footer.about')}
              </button>
            </div>

            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                {t('footer.safe')}
              </span>
            </div>
          </div>
        </footer>
      </div>

      {/* Global Notion Installer Wizard Modal */}
      {isWizardModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl">
            <NotionInstallerWizard
              isOpen={true}
              onClose={() => setIsWizardModalOpen(false)}
              selectedApps={selectedApps}
              setSelectedApps={setSelectedApps}
            />
          </div>
        </div>
      )}

      {/* Global Version Update Log Modal */}
      <UpdateLogModal
        isOpen={isUpdateLogOpen}
        onClose={() => setIsUpdateLogOpen(false)}
      />
    </div>
  );
};
