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
import { NotionInstallerWizard } from './components/Installer/NotionInstallerWizard';
import { launchNativeInstaller } from './utils/installerBridge';
import { tabToPath, pathToTab } from './utils/routes';
import { ActiveTab } from './types';
import { ShieldCheck } from 'lucide-react';

export const App: React.FC = () => {
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
      home: 'AllDesk - 올인원 노션 데스크',
      editor: '파일 편집소 - AllDesk',
      'editor-image': 'PNG & 사진 편집기 - AllDesk',
      'editor-pdf': 'PDF 문서 편집기 - AllDesk',
      compressor: '파일 용량 압축기 - AllDesk',
      converter: '파일 형식 변환기 - AllDesk',
      media: '영상 · 음악 변환기 - AllDesk',
      tools: '스마트 생산성 도구 - AllDesk',
      fun: '재미 도구함 - AllDesk',
      installer: '프로그램 설치 마법사 - AllDesk',
    };
    document.title = titles[activeTab] || 'AllDesk';
  }, [activeTab]);

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [isWizardModalOpen, setIsWizardModalOpen] = useState<boolean>(false);
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
        </main>

        {/* Notion Minimalist Footer */}
        <footer className="border-t border-[#e9e9e7] dark:border-[#2f2f2f] py-6 px-6 text-xs text-[#9b9a97] transition-colors">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-[10px]">
                N
              </span>
              <span className="font-semibold text-[#37352f] dark:text-white">
                AllDesk (Notion Edition)
              </span>
              <span>— 올인원 데스크 & 설치 마법사</span>
            </div>

            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                100% 브라우저 로컬 안전 처리
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                Windows winget 공식 지원
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
    </div>
  );
};
