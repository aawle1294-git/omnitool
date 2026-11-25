import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  History, 
  Calendar, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  ShieldCheck,
  Tag,
  ArrowRight
} from 'lucide-react';
import { ALL_UPDATE_LOGS, CURRENT_VERSION, UpdateLog } from '../../data/updateLogs';
import { useLanguage } from '../../contexts/LanguageContext';

interface UpdateLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDismissForever?: () => void;
}

export const UpdateLogModal: React.FC<UpdateLogModalProps> = ({
  isOpen,
  onClose,
  onDismissForever,
}) => {
  const { t } = useLanguage();
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>({
    [CURRENT_VERSION]: true,
  });
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(true);

  if (!isOpen) return null;

  const toggleExpand = (ver: string) => {
    setExpandedVersions((prev) => ({ ...prev, [ver]: !prev[ver] }));
  };

  const expandAll = () => {
    const allExp: Record<string, boolean> = {};
    ALL_UPDATE_LOGS.forEach((l) => {
      allExp[l.version] = true;
    });
    setExpandedVersions(allExp);
  };

  const collapseAll = () => {
    setExpandedVersions({ [CURRENT_VERSION]: true });
  };

  const handleConfirmClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('alldesk_viewed_version', CURRENT_VERSION);
    }
    onClose();
  };

  const latestLog = ALL_UPDATE_LOGS[0];

  const filteredLogs = selectedTag === 'all'
    ? ALL_UPDATE_LOGS
    : ALL_UPDATE_LOGS.filter((log) => log.tag === selectedTag);

  const getTagBadgeStyle = (tagColor: UpdateLog['tagColor']) => {
    switch (tagColor) {
      case 'violet':
        return 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-900/40';
      case 'emerald':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/40';
      case 'blue':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-900/40';
      case 'rose':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900/40';
      case 'amber':
      default:
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900/40';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-[#1f1f1f] border border-[#e9e9e7] dark:border-[#333] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#37352f] dark:text-[#d3d3d3]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#e9e9e7] dark:border-[#2f2f2f] flex items-center justify-between bg-[#faf9f6] dark:bg-[#232323] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#37352f] dark:text-white">
                  AllDesk {t('updatelog.title')}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 text-[10px] font-bold font-mono border border-violet-200 dark:border-violet-800">
                  {CURRENT_VERSION} {t('updatelog.latest')}
                </span>
              </div>
              <p className="text-[11px] text-[#787774] dark:text-[#999] mt-0.5">
                {t('updatelog.subtitle')}
              </p>
            </div>
          </div>

          <button
            onClick={handleConfirmClose}
            className="p-1.5 rounded-lg text-[#787774] hover:text-black dark:hover:text-white hover:bg-[#efefed] dark:hover:bg-[#333] transition"
            title="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 no-scrollbar">
          
          {/* 1. LATEST VERSION SPOTLIGHT CARD */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-indigo-500/10 border border-violet-200/80 dark:border-violet-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-violet-600 text-white shadow-2xs">
                  {latestLog.version}
                </span>
                <span className="text-xs font-bold text-violet-950 dark:text-violet-200">
                  {latestLog.title}
                </span>
              </div>
              <span className="text-[11px] text-[#787774] dark:text-[#a0a0a0] flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {latestLog.releaseDate}
              </span>
            </div>

            <p className="text-xs text-[#37352f] dark:text-[#ddd] leading-relaxed">
              {latestLog.summary}
            </p>

            {/* Highlights List */}
            <div className="space-y-1.5 pt-1">
              {latestLog.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-[#4b4945] dark:text-[#ccc]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
                  <span>{h}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 2. ALL UPDATES SECTION HEADER & CONTROLS */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e9e9e7] dark:border-[#2f2f2f] pb-2">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#787774]" />
                <h3 className="text-xs font-bold text-[#37352f] dark:text-white uppercase tracking-wider">
                  {t('updatelog.title')} (All {ALL_UPDATE_LOGS.length} Releases)
                </h3>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-[#787774]">
                <button
                  onClick={expandAll}
                  className="px-2 py-0.5 rounded hover:bg-[#efefed] dark:hover:bg-[#2c2c2c] transition"
                >
                  {t('updatelog.expandall')}
                </button>
                <span>·</span>
                <button
                  onClick={collapseAll}
                  className="px-2 py-0.5 rounded hover:bg-[#efefed] dark:hover:bg-[#2c2c2c] transition"
                >
                  {t('updatelog.collapseall')}
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-[11px]">
              {[
                { id: 'all', label: `${t('updatelog.filter.all')} (${ALL_UPDATE_LOGS.length})` },
                { id: '대규모 업데이트', label: '대규모 업데이트' },
                { id: '기능 추가', label: '기능 추가' },
                { id: '디자인 개선', label: '디자인 개선' },
                { id: '버그 수정', label: '버그 수정' },
                { id: '최적화 및 보안', label: '최적화 및 보안' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedTag(f.id)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition shrink-0 ${
                    selectedTag === f.id
                      ? 'bg-black dark:bg-white text-white dark:text-black shadow-2xs'
                      : 'bg-[#f7f6f3] dark:bg-[#282828] text-[#787774] hover:text-black dark:hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Complete Timeline of All Versions */}
            <div className="space-y-2.5 pt-1">
              {filteredLogs.map((log) => {
                const isExpanded = Boolean(expandedVersions[log.version]);
                return (
                  <div
                    key={log.version}
                    className={`rounded-xl border transition-all ${
                      log.isLatest
                        ? 'border-violet-300 dark:border-violet-900/60 bg-violet-50/20 dark:bg-violet-950/10'
                        : 'border-[#e9e9e7] dark:border-[#2f2f2f] bg-white dark:bg-[#232323]'
                    }`}
                  >
                    {/* Version Header Bar (Clickable) */}
                    <div
                      onClick={() => toggleExpand(log.version)}
                      className="p-3 sm:px-4 cursor-pointer flex items-center justify-between gap-3 select-none"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 text-[#37352f] dark:text-white shrink-0">
                          {log.version}
                        </span>

                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${getTagBadgeStyle(log.tagColor)}`}>
                          {log.tag}
                        </span>

                        <p className="text-xs font-bold text-[#37352f] dark:text-white truncate">
                          {log.title}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-[#787774] font-mono hidden sm:inline">
                          {log.releaseDate}
                        </span>
                        <div className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-[#787774]">
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Details Area */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-[#f0f0ee] dark:border-[#2c2c2c] space-y-3 text-xs">
                        <div className="text-[11px] text-[#787774] font-mono sm:hidden pt-1">
                          📅 배포일: {log.releaseDate}
                        </div>

                        <p className="text-xs text-[#555] dark:text-[#bbb] leading-relaxed">
                          {log.summary}
                        </p>

                        {/* Detailed Changes by Category */}
                        {log.details.map((sec, sIdx) => (
                          <div key={sIdx} className="space-y-1.5 p-2.5 rounded-lg bg-[#faf9f6] dark:bg-[#1a1a1a] border border-[#efefed] dark:border-[#292929]">
                            <p className="font-bold text-[11px] text-[#37352f] dark:text-white flex items-center gap-1">
                              <span>{sec.category}</span>
                            </p>
                            <ul className="space-y-1 pl-1">
                              {sec.items.map((it, iIdx) => (
                                <li key={iIdx} className="flex items-start gap-1.5 text-[11px] text-[#666] dark:text-[#aaa] leading-relaxed">
                                  <span className="text-[#a1a1aa] shrink-0">•</span>
                                  <span>{it}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Modal Bottom Footer */}
        <div className="px-5 py-3.5 border-t border-[#e9e9e7] dark:border-[#2f2f2f] bg-[#faf9f6] dark:bg-[#232323] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
          <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-[#787774] dark:text-[#999]">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded accent-violet-600 cursor-pointer"
            />
            <span>{t('updatelog.dontshow')} ({CURRENT_VERSION})</span>
          </label>

          <button
            onClick={handleConfirmClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold text-xs flex items-center justify-center gap-1.5 hover:opacity-90 shadow-sm transition"
          >
            <span>{t('updatelog.confirm')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
