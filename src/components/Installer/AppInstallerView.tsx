import React, { useState, useMemo } from 'react';
import { 
  Search, 
  CheckSquare, 
  Square, 
  ExternalLink, 
  Sparkles, 
  Table, 
  LayoutGrid, 
  AppWindow, 
  Play, 
  CheckCircle2, 
  AlertCircle
} from 'lucide-react';
import { SOFTWARE_APPS, APP_CATEGORIES } from '../../data/appsData';
import { Category } from '../../types';
import { NotionPageHeader } from '../NotionLayout/NotionPageHeader';
import { NotionInstallerWizard } from './NotionInstallerWizard';
import { launchNativeInstaller, isLocalServer } from '../../utils/installerBridge';
import { useLanguage } from '../../contexts/LanguageContext';

interface AppInstallerViewProps {
  selectedApps: string[];
  setSelectedApps: React.Dispatch<React.SetStateAction<string[]>>;
}

export const AppInstallerView: React.FC<AppInstallerViewProps> = ({
  selectedApps,
  setSelectedApps,
}) => {
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const L = (ko: string, en: string) => (isEn ? en : ko);

  const [viewMode, setViewMode] = useState<'wizard' | 'gallery' | 'table'>('wizard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [launchedNotice, setLaunchedNotice] = useState(false);

  const localMode = isLocalServer();

  // Filtered apps
  const filteredApps = useMemo(() => {
    return SOFTWARE_APPS.filter((app) => {
      const matchesCategory = selectedCategory === 'all' || app.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchesQuery =
        !searchQuery ||
        app.name.toLowerCase().includes(q) ||
        (app.nameKo && app.nameKo.toLowerCase().includes(q)) ||
        app.descriptionKo.toLowerCase().includes(q) ||
        app.wingetId.toLowerCase().includes(q);

      return matchesCategory && matchesQuery;
    });
  }, [searchQuery, selectedCategory]);

  const toggleAppSelection = (id: string) => {
    setSelectedApps((prev) =>
      prev.includes(id) ? prev.filter((appId) => appId !== id) : [...prev, id]
    );
  };

  const handleLaunchNativeWindow = async () => {
    await launchNativeInstaller();
    setLaunchedNotice(true);
    setTimeout(() => setLaunchedNotice(false), 5000);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Notion Page Header */}
      <NotionPageHeader
        icon="📦"
        title={L('소프트웨어 설치 마법사', 'Software Install Wizard')}
        description={L(
          '배치 파일(.bat) 없이 독립된 윈도우 설치 마법사 창에서 실시간으로 프로그램을 무인 자동 설치합니다.',
          'Install programs unattended in real time from a dedicated Windows setup wizard without batch (.bat) files.'
        )}
        tags={[
          { label: L('실제 윈도우 독립 창 지원', 'Native Windows Window Support') },
          { label: L('Windows winget 공식 엔진', 'Official Windows winget Engine') },
          { label: L('배치파일 불필요', 'No Batch Files Needed') },
        ]}
      />

      {/* Prominent Native Window Launcher Banner */}
      <div className="p-5 rounded-2xl bg-[#f7f6f3] dark:bg-[#202020] border-2 border-black dark:border-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-lg shrink-0">
            <AppWindow className="w-5 h-5 shrink-0" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-[#37352f] dark:text-white flex items-center gap-2 flex-wrap">
              <span>{L('독립 설치 마법사 창 (Native Setup Wizard)', 'Native Setup Wizard')}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold shrink-0 whitespace-nowrap">
                {L('분리 실행', 'Standalone')}
              </span>
            </h3>
            <p className="text-xs text-[#787774] dark:text-[#9b9a97] mt-0.5 leading-relaxed">
              {localMode
                ? L(
                    '웹 브라우저와 완전히 분리된 실제 윈도우 설치 마법사 창이 바탕화면에 팝업되어, 클릭 한 번으로 모든 프로그램을 직접 설치합니다.',
                    'A native Windows setup wizard pops up separately from the browser to install all selected apps in one click.'
                  )
                : L(
                    '이 기능은 로컬 PC에서 실행하기.bat으로 구동할 때만 사용 가능합니다. 아래 웹 마법사 모드로도 winget 명령어를 복사해 직접 설치하실 수 있습니다.',
                    'Available when running locally via 실행하기.bat. You can also use Web Wizard mode below to copy winget commands and install directly.'
                  )}
            </p>
          </div>
        </div>

        {localMode ? (
          <button
            onClick={handleLaunchNativeWindow}
            className="shrink-0 whitespace-nowrap w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold text-xs hover:opacity-90 shadow-md transition"
          >
            <Play className="w-4 h-4 fill-current shrink-0" />
            <span>{L('독립 설치 마법사 창 띄우기', 'Open Native Setup Wizard')}</span>
          </button>
        ) : (
          <div className="shrink-0 whitespace-nowrap flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-semibold text-amber-800 dark:text-amber-300">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{L('로컬 실행 전용', 'Local Mode Only')}</span>
          </div>
        )}
      </div>

      {launchedNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>{L('독립 설치 마법사 창이 실행되었습니다!', 'Native Setup Wizard launched!')}</strong>{' '}
            {L('작업 표시줄이나 화면에 나타난 설치 마법사 창을 확인해 주세요.', 'Please check your taskbar or screen for the setup wizard window.')}
          </span>
        </div>
      )}

      {/* Notion View Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e9e9e7] dark:border-[#2f2f2f] pb-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setViewMode('wizard')}
            className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition ${
              viewMode === 'wizard'
                ? 'bg-black dark:bg-white text-white dark:text-black'
                : 'text-[#787774] hover:bg-[#efefed] dark:hover:bg-[#2c2c2c]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>{L('웹 마법사 모드 (Web Wizard)', 'Web Wizard')}</span>
          </button>

          <button
            onClick={() => setViewMode('gallery')}
            className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition ${
              viewMode === 'gallery'
                ? 'bg-black dark:bg-white text-white dark:text-black'
                : 'text-[#787774] hover:bg-[#efefed] dark:hover:bg-[#2c2c2c]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
            <span>{L('갤러리 뷰', 'Gallery View')}</span>
          </button>

          <button
            onClick={() => setViewMode('table')}
            className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition ${
              viewMode === 'table'
                ? 'bg-black dark:bg-white text-white dark:text-black'
                : 'text-[#787774] hover:bg-[#efefed] dark:hover:bg-[#2c2c2c]'
            }`}
          >
            <Table className="w-3.5 h-3.5 shrink-0" />
            <span>{L('데이터베이스 테이블', 'Database Table')}</span>
          </button>
        </div>

        {/* Selected count info */}
        <div className="flex items-center gap-2 shrink-0 whitespace-nowrap self-end sm:self-auto">
          <span className="text-[#787774]">{L('선택됨:', 'Selected:')}</span>
          <span className="font-bold text-black dark:text-white px-2 py-0.5 rounded bg-[#efefed] dark:bg-[#2c2c2c]">
            {isEn ? `${selectedApps.length} apps` : `${selectedApps.length}개 프로그램`}
          </span>
        </div>
      </div>

      {/* 1. SETUP WIZARD MODE */}
      {viewMode === 'wizard' && (
        <div className="py-2">
          <NotionInstallerWizard
            selectedApps={selectedApps}
            setSelectedApps={setSelectedApps}
          />
        </div>
      )}

      {/* 2. GALLERY VIEW */}
      {viewMode === 'gallery' && (
        <div className="space-y-5">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
            <div className="relative w-full sm:w-72 shrink-0">
              <Search className="w-3.5 h-3.5 text-[#9b9a97] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={L('프로그램 검색...', 'Search apps...')}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-[#e9e9e7] dark:border-[#2f2f2f] bg-white dark:bg-[#202020] text-xs text-[#37352f] dark:text-white focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`shrink-0 whitespace-nowrap px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                  selectedCategory === 'all'
                    ? 'bg-black dark:bg-white text-white dark:text-black'
                    : 'bg-[#f7f6f3] dark:bg-[#202020] text-[#787774] hover:bg-[#efefed]'
                }`}
              >
                {L(`전체 (${SOFTWARE_APPS.length})`, `All (${SOFTWARE_APPS.length})`)}
              </button>
              {APP_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`shrink-0 whitespace-nowrap px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    selectedCategory === c.id
                      ? 'bg-black dark:bg-white text-white dark:text-black'
                      : 'bg-[#f7f6f3] dark:bg-[#202020] text-[#787774] hover:bg-[#efefed]'
                  }`}
                >
                  {isEn ? c.id : c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredApps.map((app) => {
              const isSelected = selectedApps.includes(app.id);
              const displayName = isEn ? app.name : (app.nameKo || app.name);

              return (
                <div
                  key={app.id}
                  onClick={() => toggleAppSelection(app.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition select-none flex flex-col justify-between min-w-0 ${
                    isSelected
                      ? 'bg-[#faf9f6] dark:bg-[#222222] border-black dark:border-white shadow-xs'
                      : 'bg-white dark:bg-[#1f1f1f] border-[#e9e9e7] dark:border-[#2f2f2f] hover:border-[#bbb] dark:hover:border-[#444]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-lg bg-[#f0f0ee] dark:bg-[#2a2a2a] flex items-center justify-center font-bold text-sm text-[#37352f] dark:text-white shrink-0">
                          {app.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-xs text-[#37352f] dark:text-white truncate" title={displayName}>
                            {displayName}
                          </h4>
                          <p className="text-[10px] text-[#787774] font-mono truncate" title={app.name}>{app.name}</p>
                        </div>
                      </div>

                      <div className="text-black dark:text-white shrink-0 mt-0.5">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 fill-black dark:fill-white text-white dark:text-black" />
                        ) : (
                          <Square className="w-4 h-4 text-[#aaa]" />
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-[#787774] mt-2.5 line-clamp-2 leading-relaxed">
                      {app.descriptionKo}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#f0f0ee] dark:border-[#282828] text-[10px] text-[#9b9a97] gap-2 min-w-0">
                    <span className="font-mono bg-[#f7f6f3] dark:bg-[#282828] px-1.5 py-0.5 rounded truncate max-w-[150px]" title={app.wingetId}>
                      {app.wingetId}
                    </span>
                    <a
                      href={app.officialUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="hover:underline flex items-center gap-0.5 text-[#555] dark:text-[#aaa] shrink-0 whitespace-nowrap"
                    >
                      {L('홈페이지', 'Website')} <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. TABLE DATABASE VIEW */}
      {viewMode === 'table' && (
        <div className="border border-[#e9e9e7] dark:border-[#2f2f2f] rounded-xl overflow-x-auto bg-white dark:bg-[#191919]">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-[#f7f6f3] dark:bg-[#202020] border-b border-[#e9e9e7] dark:border-[#2f2f2f] text-[#787774]">
                <th className="py-2.5 px-3 w-10 whitespace-nowrap">{L('선택', 'Select')}</th>
                <th className="py-2.5 px-3 whitespace-nowrap">{L('이름 (소프트웨어)', 'Name (Software)')}</th>
                <th className="py-2.5 px-3 whitespace-nowrap">{L('카테고리', 'Category')}</th>
                <th className="py-2.5 px-3 font-mono whitespace-nowrap">Winget ID</th>
                <th className="py-2.5 px-3">{L('설명', 'Description')}</th>
                <th className="py-2.5 px-3 w-20 whitespace-nowrap">{L('링크', 'Link')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0ee] dark:divide-[#282828]">
              {filteredApps.map((app) => {
                const isSelected = selectedApps.includes(app.id);
                return (
                  <tr
                    key={app.id}
                    onClick={() => toggleAppSelection(app.id)}
                    className={`cursor-pointer transition select-none ${
                      isSelected
                        ? 'bg-[#faf9f6] dark:bg-[#252525]'
                        : 'hover:bg-[#f7f6f3] dark:hover:bg-[#202020]'
                    }`}
                  >
                    <td className="py-2.5 px-3 shrink-0">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 fill-black dark:fill-white text-white dark:text-black" />
                      ) : (
                        <Square className="w-4 h-4 text-[#aaa]" />
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-[#37352f] dark:text-white whitespace-nowrap">
                      {isEn ? app.name : (app.nameKo || app.name)}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-[#f0f0ee] dark:bg-[#2c2c2c] text-[11px] whitespace-nowrap">
                        {app.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#787774] whitespace-nowrap">
                      {app.wingetId}
                    </td>
                    <td className="py-2.5 px-3 text-[#787774] truncate max-w-xs">
                      {app.descriptionKo}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <a
                        href={app.officialUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#555] dark:text-[#aaa] hover:underline flex items-center gap-1 shrink-0 whitespace-nowrap"
                      >
                        {L('열기', 'Open')} <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
