import React from 'react';
import { 
  ShieldCheck, 
  Sparkles, 
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { ActiveTab } from '../../types';
import { SOFTWARE_APPS } from '../../data/appsData';
import { NotionPageHeader } from '../NotionLayout/NotionPageHeader';
import { useLanguage } from '../../contexts/LanguageContext';

interface HomeViewProps {
  setActiveTab: (tab: ActiveTab) => void;
  selectedApps: string[];
  setSelectedApps: React.Dispatch<React.SetStateAction<string[]>>;
  onOpenWizard: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  setActiveTab,
  selectedApps,
  setSelectedApps,
  onOpenWizard,
}) => {
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const L = (ko: string, en: string) => (isEn ? en : ko);
  const popularApps = SOFTWARE_APPS.filter((a) => a.popular).slice(0, 4);

  return (
    <div className="space-y-8 pb-16">
      {/* Notion Page Header */}
      <NotionPageHeader
        icon="⚡"
        title={L('AllDesk 생산성 워크스페이스', 'AllDesk Productivity Workspace')}
        description={L(
          '파일 용량 압축, 포맷 변환, 원클릭 프로그램 설치 마법사까지 매일의 작업 효율을 극대화하는 올인원 도구 모음입니다.',
          'An all-in-one toolkit to maximize daily productivity — from file compression and format conversion to a one-click app install wizard.'
        )}
        tags={[
          { label: L('상태: 준비됨', 'Status: Ready') },
          { label: L('보안: 100% 브라우저 로컬', 'Security: 100% Browser Local') },
          { label: L('버전: v2.0.0 Pro', 'Version: v2.0.0 Pro') },
        ]}
      />

      {/* Notion Callout Box (Hero message) */}
      <div className="p-4 rounded-xl bg-[#f7f6f3] dark:bg-[#202020] border border-[#e9e9e7] dark:border-[#2e2e2e] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-xl shrink-0">💡</span>
          <div className="text-xs text-[#37352f] dark:text-[#d3d3d3] leading-relaxed min-w-0">
            <p className="font-bold text-sm text-[#37352f] dark:text-white">
              {L(
                '원클릭 설치 마법사와 브라우저 파일 도구를 경험해보세요',
                'Experience the one-click Install Wizard and browser file tools'
              )}
            </p>
            <p className="text-[#787774] dark:text-[#9b9a97] mt-1">
              {L(
                '모든 작업은 서버 전송 없이 당신의 컴퓨터 내부 메모리에서만 안전하게 실행됩니다.',
                'All operations run safely inside your browser memory without ever uploading files to a server.'
              )}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenWizard}
          className="shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-black dark:bg-white text-white dark:text-black font-bold text-xs hover:opacity-90 shadow-xs transition"
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>{L('설치 마법사 바로 열기', 'Open Install Wizard')}</span>
        </button>
      </div>

      {/* Notion Database Board Cards (Main Tools) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#787774] uppercase tracking-wider">
            {L('빠른 실행 도구함 (Quick Actions)', 'Quick Actions')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* Card 1: Installer Wizard */}
          <div
            onClick={() => setActiveTab('installer')}
            className="p-5 rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f] bg-white dark:bg-[#1f1f1f] hover:border-black dark:hover:border-white transition cursor-pointer flex flex-col justify-between group shadow-2xs hover:shadow-sm"
          >
            <div className="space-y-2.5">
              <span className="text-2xl block">📦</span>
              <h3 className="font-bold text-sm text-[#37352f] dark:text-white group-hover:text-black dark:group-hover:text-white">
                {L('프로그램 설치 마법사', 'App Install Wizard')}
              </h3>
              <p className="text-xs text-[#787774] leading-relaxed">
                {L(
                  '크롬, VS Code, 카카오톡 등 필수 앱들을 체크 후 한 번에 무인 자동 설치.',
                  'Check essential apps like Chrome, VS Code, and more, and install them unattended in one batch.'
                )}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#f0f0ee] dark:border-[#282828] flex items-center justify-between text-xs font-semibold text-[#37352f] dark:text-white">
              <span>{L('마법사 시작', 'Launch Wizard')}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </div>

          {/* Card 2: File Editor (Image Crop & PDF edit) */}
          <div
            onClick={() => setActiveTab('editor')}
            className="p-5 rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f] bg-white dark:bg-[#1f1f1f] hover:border-black dark:hover:border-white transition cursor-pointer flex flex-col justify-between group shadow-2xs hover:shadow-sm"
          >
            <div className="space-y-2.5">
              <span className="text-2xl block">✂️</span>
              <h3 className="font-bold text-sm text-[#37352f] dark:text-white">
                {L('파일 편집소 (PNG/사진 편집 · PDF)', 'File Editor (PNG/Photo · PDF)')}
              </h3>
              <p className="text-xs text-[#787774] leading-relaxed">
                {L(
                  'PNG 투명도 유지 편집 & 지우개, 사진 자르기(Crop), 도형·모자이크, PDF 페이지 편집.',
                  'Transparent PNG editing & eraser, auto cutout, photo crop, shapes/mosaic, and PDF page & annotation studio.'
                )}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#f0f0ee] dark:border-[#282828] flex items-center justify-between text-xs font-semibold text-[#37352f] dark:text-white">
              <span>{L('파일 편집 시작', 'Open File Editor')}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </div>

          {/* Card 3: Compressor */}
          <div
            onClick={() => setActiveTab('compressor')}
            className="p-5 rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f] bg-white dark:bg-[#1f1f1f] hover:border-black dark:hover:border-white transition cursor-pointer flex flex-col justify-between group shadow-2xs hover:shadow-sm"
          >
            <div className="space-y-2.5">
              <span className="text-2xl block">📉</span>
              <h3 className="font-bold text-sm text-[#37352f] dark:text-white">
                {L('파일 용량 압축기', 'File Compressor')}
              </h3>
              <p className="text-xs text-[#787774] leading-relaxed">
                {L(
                  'PNG, JPG, WEBP 이미지 및 대용량 PDF 문서 용량을 최대 80% 가볍게 최적화.',
                  'Optimize PNG, JPG, WEBP images and large PDF documents by up to 80%.'
                )}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#f0f0ee] dark:border-[#282828] flex items-center justify-between text-xs font-semibold text-[#37352f] dark:text-white">
              <span>{L('용량 압축', 'Compress Files')}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </div>

          {/* Card 4: Converter */}
          <div
            onClick={() => setActiveTab('converter')}
            className="p-5 rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f] bg-white dark:bg-[#1f1f1f] hover:border-black dark:hover:border-white transition cursor-pointer flex flex-col justify-between group shadow-2xs hover:shadow-sm"
          >
            <div className="space-y-2.5">
              <span className="text-2xl block">🔄</span>
              <h3 className="font-bold text-sm text-[#37352f] dark:text-white">
                {L('파일 형식 변환기', 'File Converter')}
              </h3>
              <p className="text-xs text-[#787774] leading-relaxed">
                {L(
                  'PDF를 고화질 이미지로 추출하거나 사진들을 A4 PDF 문서로 깔끔하게 병합.',
                  'Extract high-res images from PDFs or cleanly merge multiple photos into an A4 PDF.'
                )}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#f0f0ee] dark:border-[#282828] flex items-center justify-between text-xs font-semibold text-[#37352f] dark:text-white">
              <span>{L('형식 변환', 'Convert Files')}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </div>

          {/* Card 5: Media Converter */}
          <div
            onClick={() => setActiveTab('media')}
            className="p-5 rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f] bg-white dark:bg-[#1f1f1f] hover:border-black dark:hover:border-white transition cursor-pointer flex flex-col justify-between group shadow-2xs hover:shadow-sm"
          >
            <div className="space-y-2.5">
              <span className="text-2xl block">🎬</span>
              <h3 className="font-bold text-sm text-[#37352f] dark:text-white">
                {L('영상 · 음악 변환기', 'Video & Music Converter')}
              </h3>
              <p className="text-xs text-[#787774] leading-relaxed">
                {L(
                  'MP4, WEBM, GIF 영상 및 MP3, WAV 오디오 포맷 상호 변환 및 URL 추출.',
                  'Convert between MP4, WEBM, GIF video and MP3, WAV audio formats, plus URL extraction.'
                )}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#f0f0ee] dark:border-[#282828] flex items-center justify-between text-xs font-semibold text-[#37352f] dark:text-white">
              <span>{L('미디어 변환', 'Convert Media')}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </div>

          {/* Card 6: Tools */}
          <div
            onClick={() => setActiveTab('tools')}
            className="p-5 rounded-xl border border-[#e9e9e7] dark:border-[#2f2f2f] bg-white dark:bg-[#1f1f1f] hover:border-black dark:hover:border-white transition cursor-pointer flex flex-col justify-between group shadow-2xs hover:shadow-sm"
          >
            <div className="space-y-2.5">
              <span className="text-2xl block">🛠️</span>
              <h3 className="font-bold text-sm text-[#37352f] dark:text-white">
                {L('스마트 생산성 도구', 'Smart Productivity Tools')}
              </h3>
              <p className="text-xs text-[#787774] leading-relaxed">
                {L(
                  'Wi-Fi 연결 QR 코드, 강력한 비밀번호 생성기, 텍스트 분석 및 자동 메모.',
                  'Wi-Fi QR code generator, strong password generator, text analyzer, and auto-saving memo.'
                )}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#f0f0ee] dark:border-[#282828] flex items-center justify-between text-xs font-semibold text-[#37352f] dark:text-white">
              <span>{L('도구함 열기', 'Open Toolbox')}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </div>
        </div>
      </div>

      {/* Notion Recent Database (Popular Apps quick check) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#787774] uppercase tracking-wider">
            {L('자주 설치하는 추천 필수 프로그램 (Top 4)', 'Popular Essential Apps (Top 4)')}
          </span>
          <button
            onClick={() => setActiveTab('installer')}
            className="text-[#37352f] dark:text-white font-semibold hover:underline flex items-center gap-1 shrink-0 whitespace-nowrap"
          >
            <span>{L('전체 30+개 보기', 'View all 30+ apps')}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {popularApps.map((app) => {
            const isSelected = selectedApps.includes(app.id);
            const displayName = isEn ? app.name : (app.nameKo || app.name);
            return (
              <div
                key={app.id}
                onClick={() => {
                  setSelectedApps((prev) =>
                    isSelected ? prev.filter((id) => id !== app.id) : [...prev, app.id]
                  );
                }}
                className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between gap-2.5 select-none min-w-0 ${
                  isSelected
                    ? 'bg-[#faf9f6] dark:bg-[#252525] border-black dark:border-white shadow-xs'
                    : 'bg-white dark:bg-[#1f1f1f] border-[#e9e9e7] dark:border-[#2f2f2f] hover:border-[#aaa]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-[#f0f0ee] dark:bg-[#2c2c2c] flex items-center justify-center font-bold text-xs text-[#37352f] dark:text-white shrink-0">
                    {app.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-[#37352f] dark:text-white truncate" title={displayName}>
                      {displayName}
                    </p>
                    <p className="text-[10px] text-[#787774] font-mono truncate" title={app.wingetId}>
                      {app.wingetId}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded shrink-0 whitespace-nowrap transition-colors ${
                    isSelected
                      ? 'bg-black dark:bg-white text-white dark:text-black'
                      : 'bg-[#f0f0ee] dark:bg-[#2c2c2c] text-[#787774] hover:bg-[#e4e3e0]'
                  }`}
                >
                  {isSelected ? L('선택됨', 'Selected') : L('+ 추가', '+ Add')}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notion Style Info Box */}
      <div className="p-4 rounded-xl bg-[#faf9f6] dark:bg-[#1d1d1d] border border-[#e9e9e7] dark:border-[#2f2f2f] flex flex-col sm:flex-row items-start sm:items-center gap-4 text-xs text-[#787774]">
        <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
        <div className="leading-relaxed">
          <strong className="text-[#37352f] dark:text-white">
            {L('100% 로컬 프라이버시 원칙', '100% Local Privacy Principle')}
          </strong>
          <p className="mt-0.5">
            {L(
              '이 사이트는 어떠한 개인 파일이나 설치 기록도 외부 서버로 전송하지 않습니다. 모든 작업은 브라우저 런타임과 Windows 기본 winget 도구를 통해 투명하고 안전하게 수행됩니다.',
              'This site never sends any personal files or installation history to external servers. All tasks run transparently and safely inside your browser runtime and native Windows winget.'
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
