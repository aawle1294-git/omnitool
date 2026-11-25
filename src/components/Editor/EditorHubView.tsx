import React from 'react';
import { NotionPageHeader } from '../NotionLayout/NotionPageHeader';
import { ChevronRight } from 'lucide-react';
import { ActiveTab } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface EditorHubViewProps {
  setActiveTab: (tab: ActiveTab) => void;
}

export const EditorHubView: React.FC<EditorHubViewProps> = ({ setActiveTab }) => {
  const { t } = useLanguage();

  return (
    <div className="space-y-6 pb-20">
      {/* Notion Parent Page Header */}
      <NotionPageHeader
        icon="✂️"
        title={t('editorhub.title')}
        description={t('editorhub.desc')}
        tags={[
          { label: t('editorhub.tag1') },
          { label: t('editorhub.tag2') },
          { label: t('editorhub.tag3') },
          { label: t('editorhub.tag4') },
          { label: t('editorhub.tag5') },
        ]}
      />

      {/* Notion Callout Box */}
      <div className="p-4 rounded-xl bg-[#f7f6f3] dark:bg-[#202020] border border-[#e9e9e7] dark:border-[#2f2f2f] flex items-start gap-3 text-xs leading-relaxed text-[#787774]">
        <span className="text-xl shrink-0">💡</span>
        <div>
          <p className="font-bold text-[#37352f] dark:text-white mb-0.5">
            {t('editorhub.callout.title')}
          </p>
          {t('editorhub.callout.desc')}
        </div>
      </div>

      {/* Notion Sub-pages Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-bold text-[#9b9a97] tracking-wider uppercase flex items-center gap-1.5">
            <span>📄</span> {t('editorhub.subpages')}
          </p>
          <span className="text-[11px] text-[#9b9a97]">{t('editorhub.subpages.count')}</span>
        </div>

        {/* Subpage 1: PNG & 사진 편집기 */}
        <div
          onClick={() => setActiveTab('editor-image')}
          className="p-5 rounded-2xl border border-[#e9e9e7] dark:border-[#2f2f2f] bg-white dark:bg-[#1f1f1f] hover:border-black dark:hover:border-white transition-all cursor-pointer flex items-center justify-between group shadow-2xs hover:shadow-md"
        >
          <div className="flex items-start gap-4">
            <span className="text-3xl p-3 rounded-xl bg-[#faf9f6] dark:bg-[#252525] border border-[#f0f0ee] dark:border-[#333] group-hover:scale-105 transition-transform shrink-0">
              🖼️
            </span>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm text-[#37352f] dark:text-white group-hover:text-black dark:group-hover:text-white">
                  {t('editorhub.image.title')}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400 font-semibold">
                  {t('editorhub.image.badge1')}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 font-semibold">
                  {t('editorhub.image.badge2')}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f0efe9] text-[#6b6965] dark:bg-[#2a2a2a] dark:text-[#a5a4a0] font-semibold">
                  {t('editorhub.image.badge3')}
                </span>
              </div>
              <p className="text-xs text-[#787774] leading-relaxed">
                {t('editorhub.image.desc')}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-[#9b9a97] pt-1 flex-wrap">
                <span>{t('editorhub.image.feat1')}</span>
                <span>{t('editorhub.image.feat2')}</span>
                <span>{t('editorhub.image.feat3')}</span>
                <span>{t('editorhub.image.feat4')}</span>
              </div>
            </div>
          </div>
          <div className="p-2 rounded-lg group-hover:bg-[#f0efe9] dark:group-hover:bg-[#282828] transition shrink-0 ml-4">
            <ChevronRight className="w-5 h-5 text-[#9b9a97] group-hover:translate-x-1 group-hover:text-black dark:group-hover:text-white transition-all" />
          </div>
        </div>

        {/* Subpage 2: PDF 문서 편집기 */}
        <div
          onClick={() => setActiveTab('editor-pdf')}
          className="p-5 rounded-2xl border border-[#e9e9e7] dark:border-[#2f2f2f] bg-white dark:bg-[#1f1f1f] hover:border-black dark:hover:border-white transition-all cursor-pointer flex items-center justify-between group shadow-2xs hover:shadow-md"
        >
          <div className="flex items-start gap-4">
            <span className="text-3xl p-3 rounded-xl bg-[#faf9f6] dark:bg-[#252525] border border-[#f0f0ee] dark:border-[#333] group-hover:scale-105 transition-transform shrink-0">
              📄
            </span>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm text-[#37352f] dark:text-white group-hover:text-black dark:group-hover:text-white">
                  {t('editorhub.pdf.title')}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 font-semibold">
                  {t('editorhub.pdf.badge1')}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 font-semibold">
                  {t('editorhub.pdf.badge2')}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f0efe9] text-[#6b6965] dark:bg-[#2a2a2a] dark:text-[#a5a4a0] font-semibold">
                  {t('editorhub.pdf.badge3')}
                </span>
              </div>
              <p className="text-xs text-[#787774] leading-relaxed">
                {t('editorhub.pdf.desc')}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-[#9b9a97] pt-1 flex-wrap">
                <span>{t('editorhub.pdf.feat1')}</span>
                <span>{t('editorhub.pdf.feat2')}</span>
                <span>{t('editorhub.pdf.feat3')}</span>
                <span>{t('editorhub.pdf.feat4')}</span>
              </div>
            </div>
          </div>
          <div className="p-2 rounded-lg group-hover:bg-[#f0efe9] dark:group-hover:bg-[#282828] transition shrink-0 ml-4">
            <ChevronRight className="w-5 h-5 text-[#9b9a97] group-hover:translate-x-1 group-hover:text-black dark:group-hover:text-white transition-all" />
          </div>
        </div>
      </div>
    </div>
  );
};
