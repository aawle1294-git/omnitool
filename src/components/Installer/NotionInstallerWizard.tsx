import React, { useState, useEffect } from 'react';
import { 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  Download, 
  Terminal, 
  Copy, 
  X, 
  Minus, 
  Square, 
  CheckSquare, 
  Sparkles, 
  HardDrive, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Laptop, 
  RefreshCw,
  FolderOpen,
  FileCode
} from 'lucide-react';
import { SOFTWARE_APPS, APP_CATEGORIES } from '../../data/appsData';
import { SoftwareApp } from '../../types';
import { copyToClipboard } from '../../utils/formatters';
import { saveAs } from 'file-saver';
import { launchNativeInstaller } from '../../utils/installerBridge';

interface NotionInstallerWizardProps {
  isOpen?: boolean;
  onClose?: () => void;
  selectedApps: string[];
  setSelectedApps: React.Dispatch<React.SetStateAction<string[]>>;
}

type WizardStep = 'welcome' | 'components' | 'options' | 'installing' | 'complete';

export const NotionInstallerWizard: React.FC<NotionInstallerWizardProps> = ({
  isOpen = true,
  onClose,
  selectedApps,
  setSelectedApps,
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('welcome');
  const [silentMode, setSilentMode] = useState<boolean>(true);
  const [createDesktopShortcuts, setCreateDesktopShortcuts] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Installation simulation state
  const [installProgress, setInstallProgress] = useState<number>(0);
  const [currentInstallingApp, setCurrentInstallingApp] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const selectedAppObjects = SOFTWARE_APPS.filter((a) => selectedApps.includes(a.id));

  // Toggle selection
  const toggleApp = (id: string) => {
    setSelectedApps((prev) =>
      prev.includes(id) ? prev.filter((appId) => appId !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedApps(SOFTWARE_APPS.map((a) => a.id));
  };

  const clearAll = () => {
    setSelectedApps([]);
  };

  // Preset packs
  const applyPreset = (type: 'essential' | 'dev' | 'media') => {
    if (type === 'essential') {
      setSelectedApps(['chrome', 'bandizip', 'kakaotalk', 'everything', 'sharex', 'potplayer', 'notion']);
    } else if (type === 'dev') {
      setSelectedApps(['vscode', 'git', 'nodejs', 'python', 'docker', 'windows-terminal', 'cursor']);
    } else if (type === 'media') {
      setSelectedApps(['potplayer', 'vlc', 'spotify', 'obs', 'handbrake', 'sharex']);
    }
  };

  // Generate scripts
  const generateOneLiner = () => {
    if (selectedAppObjects.length === 0) return '';
    return selectedAppObjects
      .map(
        (a) =>
          `winget install --id "${a.wingetId}" -e ${
            silentMode ? '--silent ' : ''
          }--accept-package-agreements --accept-source-agreements`
      )
      .join('; ');
  };

  const generateBatScript = () => {
    const lines = [
      '@echo off',
      'chcp 65001 > nul',
      'title Notion Style Software Installer',
      'echo =======================================================',
      'echo   AllDesk 노션 소프트웨어 설치 마법사',
      'echo =======================================================',
      'echo.',
    ];
    selectedAppObjects.forEach((app) => {
      lines.push(
        `echo [%date% %time%] ${app.nameKo || app.name} 설치 중...`,
        `winget install --id "${app.wingetId}" -e ${silentMode ? '--silent ' : ''}--accept-package-agreements --accept-source-agreements`,
        'echo.'
      );
    });
    lines.push(
      'echo =======================================================',
      'echo   모든 프로그램 설치가 성공적으로 완료되었습니다!',
      'echo =======================================================',
      'pause'
    );
    return lines.join('\r\n');
  };

  const downloadBat = () => {
    const script = generateBatScript();
    const blob = new Blob([script], { type: 'application/bat;charset=utf-8' });
    saveAs(blob, 'Notion_Auto_Install.bat');
  };

  const handleCopyCmd = async () => {
    const cmd = generateOneLiner();
    const ok = await copyToClipboard(cmd);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Run installer simulation
  const startInstallation = () => {
    if (selectedAppObjects.length === 0) return;
    setCurrentStep('installing');
    setIsInstalling(true);
    setInstallProgress(0);
    setLogs([
      '[시스템] AllDesk 설치 마법사 초기화 완료...',
      '[시스템] Windows Winget 패키지 매니저 환경 감지됨',
      `[시스템] 선택된 ${selectedAppObjects.length}개 프로그램 대기열 생성 완료\n`,
    ]);

    let currentIdx = 0;
    const total = selectedAppObjects.length;

    const interval = setInterval(() => {
      if (currentIdx >= total) {
        clearInterval(interval);
        setIsInstalling(false);
        setInstallProgress(100);
        setCurrentInstallingApp('');
        setLogs((prev) => [
          ...prev,
          '\n🎉 [완료] 모든 프로그램의 설치 스크립트 생성이 성공적으로 완료되었습니다!',
        ]);
        setTimeout(() => {
          setCurrentStep('complete');
        }, 800);
        return;
      }

      const app = selectedAppObjects[currentIdx];
      setCurrentInstallingApp(`${app.nameKo || app.name} (${app.wingetId})`);
      const pct = Math.round(((currentIdx + 1) / total) * 100);
      setInstallProgress(pct);

      setLogs((prev) => [
        ...prev,
        `[${currentIdx + 1}/${total}] 준비: ${app.nameKo || app.name} ...`,
        `>>> winget install --id "${app.wingetId}" -e --accept-package-agreements`,
        `✔ ${app.nameKo || app.name} 준비 완료`,
      ]);

      currentIdx++;
    }, 600);
  };

  const stepsList: { id: WizardStep; label: string; num: number }[] = [
    { id: 'welcome', label: '환영 및 안내', num: 1 },
    { id: 'components', label: '프로그램 선택', num: 2 },
    { id: 'options', label: '설치 옵션', num: 3 },
    { id: 'installing', label: '설치 진행', num: 4 },
    { id: 'complete', label: '설치 완료', num: 5 },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f] bg-white dark:bg-[#191919] shadow-2xl overflow-hidden font-sans transition-colors">
      {/* Notion Window Titlebar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#f7f6f3] dark:bg-[#202020] border-b border-[#e9e9e7] dark:border-[#2f2f2f] select-none">
        <div className="flex items-center gap-2">
          {/* Traffic light / window buttons */}
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56] inline-block border border-[#e0443e]/40" />
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block border border-[#dea123]/40" />
            <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block border border-[#1aab29]/40" />
          </div>
          <span className="text-xs font-semibold text-[#37352f] dark:text-[#d3d3d3] flex items-center gap-1.5">
            <span>📦</span> AllDesk 설치 마법사 (Notion Edition)
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#787774]">
          <span className="px-2 py-0.5 rounded bg-[#efefed] dark:bg-[#2c2c2c] text-[11px] font-mono">
            winget v1.8
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-[#e3e2e0] dark:hover:bg-[#333] rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Wizard Body: Left Sidebar + Right Content */}
      <div className="flex flex-col md:flex-row min-h-[480px]">
        {/* Left Step Navigator */}
        <div className="w-full md:w-56 bg-[#faf9f6] dark:bg-[#1e1e1e] p-5 border-b md:border-b-0 md:border-r border-[#e9e9e7] dark:border-[#2f2f2f] flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-sm shadow-sm">
                N
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#37352f] dark:text-[#e3e2e0]">Setup Wizard</h4>
                <p className="text-[10px] text-[#787774]">v1.0.0 Stable</p>
              </div>
            </div>

            {/* Steps list (Indicator only - sequential flow enforcement) */}
            <nav className="space-y-1">
              {stepsList.map((s) => {
                const isActive = currentStep === s.id;
                const isPassed =
                  stepsList.findIndex((item) => item.id === currentStep) >
                  stepsList.findIndex((item) => item.id === s.id);

                return (
                  <div
                    key={s.id}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium select-none ${
                      isActive
                        ? 'bg-[#efefed] dark:bg-[#2c2c2c] text-[#37352f] dark:text-[#ffffff] font-bold shadow-xs'
                        : isPassed
                        ? 'text-[#787774] dark:text-[#999]'
                        : 'text-[#9b9a97] opacity-50'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        isActive
                          ? 'bg-black dark:bg-white text-white dark:text-black'
                          : isPassed
                          ? 'bg-emerald-500 text-white'
                          : 'bg-[#e3e2e0] dark:bg-[#333] text-[#787774]'
                      }`}
                    >
                      {isPassed ? <Check className="w-2.5 h-2.5" /> : s.num}
                    </span>
                    <span className="truncate">{s.label}</span>
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Selected count badge in sidebar */}
          <div className="pt-4 border-t border-[#e9e9e7] dark:border-[#2f2f2f] text-[11px] text-[#787774]">
            <p className="flex justify-between">
              <span>선택된 프로그램:</span>
              <strong className="text-[#37352f] dark:text-white">{selectedApps.length}개</strong>
            </p>
            <p className="flex justify-between mt-1">
              <span>예상 용량:</span>
              <strong className="text-[#37352f] dark:text-white">
                ~{(selectedApps.length * 150).toLocaleString()} MB
              </strong>
            </p>
          </div>
        </div>

        {/* Right Step Content */}
        <div className="flex-1 p-6 flex flex-col justify-between bg-white dark:bg-[#191919]">
          {/* ============================================================== */}
          {/* STEP 1: WELCOME */}
          {/* ============================================================== */}
          {currentStep === 'welcome' && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[#f7f6f3] dark:bg-[#252525] border border-[#e9e9e7] dark:border-[#333] flex items-center justify-center text-3xl shadow-sm">
                  ⚡
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#37352f] dark:text-[#ffffff]">
                    AllDesk 소프트웨어 설치 마법사
                  </h2>
                  <p className="text-xs text-[#787774] mt-1">
                    노션 스타일의 심플하고 안전한 원클릭 프로그램 무인 인스톨러입니다.
                  </p>
                </div>
              </div>

              {/* Notion Callout Box */}
              <div className="p-4 rounded-xl bg-[#f7f6f3] dark:bg-[#202020] border border-[#e9e9e7] dark:border-[#2e2e2e] flex items-start gap-3">
                <span className="text-lg">💡</span>
                <div className="text-xs text-[#37352f] dark:text-[#d3d3d3] leading-relaxed">
                  <p className="font-semibold">안전한 공식 패키지 보장</p>
                  <p className="text-[#787774] mt-0.5">
                    Microsoft 공식 Windows Package Manager(winget) 저장소를 통해 설치되므로, 악성코드나 애드웨어 걱정 없이 100% 원본 클린 설치를 보장합니다.
                  </p>
                </div>
              </div>

              {/* Quick Presets & Custom Start */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#787774]">
                    추천 시작팩 선택 또는 직접 선택:
                  </span>
                  <span className="text-[11px] text-[#999]">(시작팩 없이도 바로 다음 단계로 이동 가능)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {/* Custom direct start button */}
                  <button
                    onClick={() => {
                      setSelectedApps([]); // Start fresh with empty selection
                      setCurrentStep('components');
                    }}
                    className="p-3 text-left rounded-xl border-2 border-dashed border-[#dcdad5] dark:border-[#383838] hover:border-black dark:hover:border-white hover:bg-[#faf9f6] dark:hover:bg-[#222] transition group flex flex-col justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#37352f] dark:text-white flex items-center gap-1.5">
                        <span>🎯</span> 직접 하나씩 선택
                      </p>
                      <p className="text-[11px] text-[#787774] mt-1 line-clamp-2">
                        시작팩 없이 30+개 전체 프로그램 목록에서 직접 골라 담기
                      </p>
                    </div>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-2 group-hover:underline">
                      빈 상태로 시작 ➔
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      applyPreset('essential');
                      setCurrentStep('components');
                    }}
                    className="p-3 text-left rounded-xl border border-[#e9e9e7] dark:border-[#2e2e2e] hover:border-black dark:hover:border-white hover:bg-[#faf9f6] dark:hover:bg-[#222] transition group flex flex-col justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#37352f] dark:text-white flex items-center gap-1.5">
                        <span>✨</span> 새 PC 필수팩
                      </p>
                      <p className="text-[11px] text-[#787774] mt-1 line-clamp-2">
                        크롬, 반디집, 카톡, 팟플레이어...
                      </p>
                    </div>
                    <span className="text-[10px] text-[#787774] font-medium mt-2">
                      추천 4개 자동 담기
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      applyPreset('dev');
                      setCurrentStep('components');
                    }}
                    className="p-3 text-left rounded-xl border border-[#e9e9e7] dark:border-[#2e2e2e] hover:border-black dark:hover:border-white hover:bg-[#faf9f6] dark:hover:bg-[#222] transition group flex flex-col justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#37352f] dark:text-white flex items-center gap-1.5">
                        <span>💻</span> 개발자 스타터팩
                      </p>
                      <p className="text-[11px] text-[#787774] mt-1 line-clamp-2">
                        VS Code, Git, Python, Terminal...
                      </p>
                    </div>
                    <span className="text-[10px] text-[#787774] font-medium mt-2">
                      개발 도구 4개 자동 담기
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      applyPreset('media');
                      setCurrentStep('components');
                    }}
                    className="p-3 text-left rounded-xl border border-[#e9e9e7] dark:border-[#2e2e2e] hover:border-black dark:hover:border-white hover:bg-[#faf9f6] dark:hover:bg-[#222] transition group flex flex-col justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#37352f] dark:text-white flex items-center gap-1.5">
                        <span>🎬</span> 미디어 & 유틸팩
                      </p>
                      <p className="text-[11px] text-[#787774] mt-1 line-clamp-2">
                        팟플레이어, VLC, Everything, ShareX...
                      </p>
                    </div>
                    <span className="text-[10px] text-[#787774] font-medium mt-2">
                      유틸리티 4개 자동 담기
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 2: COMPONENTS SELECTION */}
          {/* ============================================================== */}
          {currentStep === 'components' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#37352f] dark:text-white flex items-center gap-2">
                    <span>설치할 구성 요소 (프로그램) 선택</span>
                    {selectedApps.length === 0 && (
                      <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        1개 이상 체크 필요
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-[#787774]">
                    설치하고 싶은 프로그램의 체크박스를 선택하세요. (현재 <strong>{selectedApps.length}개</strong> 선택됨)
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-xs px-2.5 py-1 rounded-md bg-[#f0f0ee] dark:bg-[#252525] text-[#37352f] dark:text-white hover:bg-[#e4e3e0]"
                  >
                    전체 선택
                  </button>
                  <button
                    onClick={clearAll}
                    className="text-xs px-2.5 py-1 rounded-md bg-[#f0f0ee] dark:bg-[#252525] text-red-500 hover:bg-[#e4e3e0]"
                  >
                    선택 해제
                  </button>
                </div>
              </div>

              {/* Filter pills */}
              <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar text-[11px]">
                <button
                  onClick={() => setActiveCategory('all')}
                  className={`px-2.5 py-1 rounded-md whitespace-nowrap transition ${
                    activeCategory === 'all'
                      ? 'bg-black dark:bg-white text-white dark:text-black font-semibold'
                      : 'bg-[#f7f6f3] dark:bg-[#202020] text-[#787774]'
                  }`}
                >
                  전체 ({SOFTWARE_APPS.length})
                </button>
                {APP_CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveCategory(c.id)}
                    className={`px-2.5 py-1 rounded-md whitespace-nowrap transition ${
                      activeCategory === c.id
                        ? 'bg-black dark:bg-white text-white dark:text-black font-semibold'
                        : 'bg-[#f7f6f3] dark:bg-[#202020] text-[#787774]'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* App List Tree style */}
              <div className="h-64 max-h-72 overflow-y-auto space-y-1 pr-1 border border-[#e9e9e7] dark:border-[#2f2f2f] rounded-xl p-2 bg-[#faf9f6]/40 dark:bg-[#1b1b1b] scroll-smooth">
                {SOFTWARE_APPS.filter(
                  (a) => activeCategory === 'all' || a.category === activeCategory
                ).map((app) => {
                  const isChecked = selectedApps.includes(app.id);
                  return (
                    <div
                      key={app.id}
                      onClick={() => toggleApp(app.id)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition select-none text-xs gap-2 min-w-0 ${
                        isChecked
                          ? 'bg-[#efefed] dark:bg-[#2c2c2c] text-[#37352f] dark:text-white font-medium'
                          : 'hover:bg-[#f0f0ee] dark:hover:bg-[#222] text-[#555] dark:text-[#aaa]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="text-black dark:text-white shrink-0">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 fill-black dark:fill-white text-white dark:text-black" />
                          ) : (
                            <Square className="w-4 h-4 text-[#999]" />
                          )}
                        </div>
                        <span className="font-semibold text-[#37352f] dark:text-white truncate">
                          {app.nameKo || app.name}
                        </span>
                        <span className="text-[10px] text-[#888] font-mono truncate">({app.wingetId})</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
                        {app.recommended && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold shrink-0">
                            추천
                          </span>
                        )}
                        <span className="text-[11px] text-[#787774] shrink-0">
                          {app.category === 'dev' ? '300MB' : '120MB'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] text-[#787774]">
                선택된 프로그램: <span className="font-bold text-black dark:text-white">{selectedApps.length}개</span>
              </p>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 3: OPTIONS */}
          {/* ============================================================== */}
          {currentStep === 'options' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-[#37352f] dark:text-white">설치 환경 및 방식 설정</h3>
                <p className="text-xs text-[#787774]">
                  무인 백그라운드 설치 옵션과 스크립트 실행 방식을 지정합니다.
                </p>
              </div>

              <div className="space-y-3">
                {/* Silent mode option */}
                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-[#e9e9e7] dark:border-[#2e2e2e] bg-[#faf9f6] dark:bg-[#202020] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={silentMode}
                    onChange={(e) => setSilentMode(e.target.checked)}
                    className="mt-0.5 rounded text-black focus:ring-black"
                  />
                  <div>
                    <p className="text-xs font-bold text-[#37352f] dark:text-white">
                      무인 자동 설치 모드 (--silent) 권장
                    </p>
                    <p className="text-[11px] text-[#787774] mt-0.5">
                      설치 마법사 창을 일일이 다음(Next) 누를 필요 없이 백그라운드에서 완전히 자동으로 설치를 완료합니다.
                    </p>
                  </div>
                </label>

                {/* Auto accept agreements */}
                <div className="flex items-start gap-3 p-3.5 rounded-xl border border-[#e9e9e7] dark:border-[#2e2e2e] bg-[#faf9f6] dark:bg-[#202020]">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-[#37352f] dark:text-white">
                      공식 패키지 및 라이선스 자동 승인 포함
                    </p>
                    <p className="text-[11px] text-[#787774] mt-0.5">
                      <code>--accept-package-agreements --accept-source-agreements</code> 옵션이 기본 활성화되어 중단 없는 설치를 지원합니다.
                    </p>
                  </div>
                </div>
              </div>

              {/* Ready summary */}
              <div className="p-4 rounded-xl bg-[#f7f6f3] dark:bg-[#222] border border-[#e9e9e7] dark:border-[#2f2f2f]">
                <p className="text-xs font-bold text-[#37352f] dark:text-white mb-1.5">
                  설치 준비 요약:
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {selectedAppObjects.map((a) => (
                    <span
                      key={a.id}
                      className="px-2 py-0.5 rounded bg-white dark:bg-[#2c2c2c] text-[11px] border border-[#e3e2e0] dark:border-[#3a3a3a] text-[#37352f] dark:text-white"
                    >
                      {a.nameKo || a.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 4: INSTALLING (LIVE SIMULATION / LOGS) */}
          {/* ============================================================== */}
          {currentStep === 'installing' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-[#37352f] dark:text-white flex items-center gap-2">
                  <RefreshCw className={`w-4 h-4 ${isInstalling ? 'animate-spin' : ''}`} />
                  설치 패키지 준비 및 배포 중...
                </h3>
                <p className="text-xs text-[#787774] mt-0.5">
                  {currentInstallingApp ? `현재 처리 중: ${currentInstallingApp}` : '스크립트 생성 중...'}
                </p>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="w-full bg-[#efefed] dark:bg-[#2c2c2c] h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-black dark:bg-white h-full rounded-full transition-all duration-300"
                    style={{ width: `${installProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-[#787774]">
                  <span>진행률</span>
                  <span className="font-bold">{installProgress}%</span>
                </div>
              </div>

              {/* Real terminal log output */}
              <div className="rounded-xl bg-[#191919] p-3.5 border border-[#333] text-emerald-400 font-mono text-[11px] h-48 overflow-y-auto leading-relaxed shadow-inner">
                {logs.map((log, idx) => (
                  <div key={idx} className="whitespace-pre-wrap">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 5: COMPLETE */}
          {/* ============================================================== */}
          {currentStep === 'complete' && (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-2xl shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-[#37352f] dark:text-white">
                  설치 준비가 성공적으로 완료되었습니다!
                </h3>
                <p className="text-xs text-[#787774] mt-1.5 max-w-md mx-auto">
                  선택하신 {selectedAppObjects.length}개 프로그램에 대한 무인 자동 설치 스크립트가 준비되었습니다.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={async () => {
                    await launchNativeInstaller();
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-bold shadow-md hover:opacity-90 transition"
                >
                  <span>⚡ 독립 설치 마법사 창 띄우기</span>
                </button>

                <button
                  onClick={handleCopyCmd}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f] hover:bg-[#f7f6f3] dark:hover:bg-[#252525] text-xs font-bold transition"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'PowerShell 복사됨!' : 'PowerShell 명령어 복사'}
                </button>
              </div>

              <div className="p-3 rounded-lg bg-[#f7f6f3] dark:bg-[#222] text-[11px] text-[#787774] max-w-lg mx-auto">
                💡 [독립 설치 마법사 창 띄우기]를 클릭하면 바탕화면에 분리된 윈도우 설치 창이 열려 실시간으로 무인 자동 설치가 진행됩니다.
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* BOTTOM NAVIGATION ACTIONS (Always visible, Back & Next side by side) */}
          {/* ============================================================== */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-4 border-t border-[#e9e9e7] dark:border-[#2f2f2f] shrink-0">
            {/* Left: Step Info & Selection Count */}
            <div className="text-xs text-[#787774] flex items-center gap-2">
              <span className="font-semibold text-[#37352f] dark:text-[#d3d3d3]">
                {currentStep === 'welcome' && '1단계: 시작 안내'}
                {currentStep === 'components' && `2단계: 프로그램 선택 (${selectedApps.length}개 선택됨)`}
                {currentStep === 'options' && '3단계: 설치 옵션 설정'}
                {currentStep === 'installing' && '4단계: 자동 설치 진행 중'}
                {currentStep === 'complete' && '5단계: 설치 완료'}
              </span>
            </div>

            {/* Right: Actions Group (Back & Next side by side, shrink-0) */}
            <div className="flex items-center gap-2 shrink-0">
              {/* [Back Button] */}
              {currentStep !== 'welcome' && currentStep !== 'installing' && currentStep !== 'complete' && (
                <button
                  onClick={() => {
                    if (currentStep === 'components') setCurrentStep('welcome');
                    else if (currentStep === 'options') setCurrentStep('components');
                  }}
                  className="shrink-0 whitespace-nowrap flex items-center gap-1 px-3.5 py-2 text-xs font-semibold text-[#37352f] dark:text-white bg-[#f0f0ee] dark:bg-[#282828] hover:bg-[#e4e3e0] dark:hover:bg-[#333] rounded-lg transition"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>이전 (Back)</span>
                </button>
              )}

              {/* [Next Button: Step 1 -> Step 2] */}
              {currentStep === 'welcome' && (
                <button
                  onClick={() => setCurrentStep('components')}
                  className="shrink-0 whitespace-nowrap flex items-center gap-1.5 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold hover:opacity-90 transition shadow-sm"
                >
                  <span>다음 단계 (Next)</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}

              {/* [Next Button: Step 2 -> Step 3] ALWAYS VISIBLE! */}
              {currentStep === 'components' && (
                <button
                  onClick={() => {
                    if (selectedApps.length === 0) {
                      alert('목록에서 설치하고 싶은 프로그램을 최소 1개 이상 체크해 주세요!');
                      return;
                    }
                    setCurrentStep('options');
                  }}
                  className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition shadow-sm ${
                    selectedApps.length > 0
                      ? 'bg-black dark:bg-white text-white dark:text-black hover:opacity-90'
                      : 'bg-[#efefed] dark:bg-[#2a2a2a] text-[#787774] dark:text-[#aaa] border border-[#dcdad5] dark:border-[#383838]'
                  }`}
                  title={selectedApps.length === 0 ? '프로그램을 1개 이상 선택해야 3단계로 이동할 수 있습니다' : '3단계 설치 옵션으로 이동'}
                >
                  <span>다음 단계 (Next)</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}

              {/* [Start Button: Step 3 -> Step 4] */}
              {currentStep === 'options' && (
                <button
                  onClick={startInstallation}
                  className="shrink-0 whitespace-nowrap flex items-center gap-1.5 px-5 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold hover:opacity-90 transition shadow-md"
                >
                  <span>설치 시작 (Install)</span>
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              )}

              {/* [Finish Button: Step 5] */}
              {currentStep === 'complete' && (
                <button
                  onClick={() => {
                    if (onClose) onClose();
                    else setCurrentStep('welcome');
                  }}
                  className="shrink-0 whitespace-nowrap px-5 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold hover:opacity-90 transition shadow-sm"
                >
                  마침 (Finish)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

