import React from 'react';
import { NotionPageHeader } from '../NotionLayout/NotionPageHeader';
import { ChevronRight, ArrowUpRight, Sparkles, ShieldCheck, Layers, FileText, Image as ImageIcon } from 'lucide-react';
import { ActiveTab } from '../../types';

interface EditorHubViewProps {
  setActiveTab: (tab: ActiveTab) => void;
}

export const EditorHubView: React.FC<EditorHubViewProps> = ({ setActiveTab }) => {
  return (
    <div className="space-y-6 pb-20">
      {/* Notion Parent Page Header */}
      <NotionPageHeader
        icon="✂️"
        title="파일 편집소"
        description="사진, PNG 투명 이미지 및 PDF 문서를 안전하게 편집하는 상위 작업실입니다. 작업하실 하위 페이지를 선택하세요."
        tags={[
          { label: '노션 하위 페이지 구조' },
          { label: '✨ 스마트 원클릭 자동 누끼' },
          { label: '🎨 PDF 그림판 & 주석 쓰기' },
          { label: 'PNG 투명도 유지 편집' },
          { label: '100% 브라우저 로컬 처리' },
        ]}
      />

      {/* Notion Callout Box */}
      <div className="p-4 rounded-xl bg-[#f7f6f3] dark:bg-[#202020] border border-[#e9e9e7] dark:border-[#2f2f2f] flex items-start gap-3 text-xs leading-relaxed text-[#787774]">
        <span className="text-xl shrink-0">💡</span>
        <div>
          <p className="font-bold text-[#37352f] dark:text-white mb-0.5">
            독립된 하위 페이지 안내
          </p>
          아래의 하위 페이지를 클릭하면 해당 도구만의 전용 작업 공간으로 이동합니다. 언제든지 상단 경로(Breadcrumb)나 좌측 사이드바를 통해 상위 페이지로 돌아올 수 있습니다.
        </div>
      </div>

      {/* Notion Sub-pages Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-bold text-[#9b9a97] tracking-wider uppercase flex items-center gap-1.5">
            <span>📄</span> 하위 페이지 (Sub-pages)
          </p>
          <span className="text-[11px] text-[#9b9a97]">2개의 하위 페이지</span>
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
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[#37352f] dark:text-white group-hover:text-black dark:group-hover:text-white">
                  PNG & 사진 편집기
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400 font-semibold">
                  ✨ 자동 누끼 지원
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 font-semibold">
                  PNG 투명도 유지
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f0efe9] text-[#6b6965] dark:bg-[#2a2a2a] dark:text-[#a5a4a0] font-semibold">
                  하위 페이지
                </span>
              </div>
              <p className="text-xs text-[#787774] leading-relaxed">
                스마트 원클릭 자동 누끼(배경 투명화), 마술봉 누끼 도구, PNG 투명 배경 유지 및 체커보드 확인, 투명 지우개, 비율별 사진 자르기(Crop), 도형·화살표, 텍스트, 모자이크, 실행 취소(Ctrl+Z)
              </p>
              <div className="flex items-center gap-2 text-[11px] text-[#9b9a97] pt-1">
                <span>• ✨ 원클릭 자동 누끼</span>
                <span>• 🪄 마술봉 누끼</span>
                <span>• 무손실 PNG 다운로드</span>
                <span>• 단축키 실행 취소</span>
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
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[#37352f] dark:text-white group-hover:text-black dark:group-hover:text-white">
                  PDF 문서 편집기
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 font-semibold">
                  🎨 그림판 & 주석
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 font-semibold">
                  PDF Editor
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f0efe9] text-[#6b6965] dark:bg-[#2a2a2a] dark:text-[#a5a4a0] font-semibold">
                  하위 페이지
                </span>
              </div>
              <p className="text-xs text-[#787774] leading-relaxed">
                어느 페이지든 원하는 위치에 펜·형광펜 그리기, 화이트 수정액, 텍스트 주석 메모, 네모·화살표, 모자이크 블러 주석 작성 및 페이지 90도 회전, 삭제, 순서 재배치, 워터마크
              </p>
              <div className="flex items-center gap-2 text-[11px] text-[#9b9a97] pt-1">
                <span>• 🎨 페이지별 그림판 주석</span>
                <span>• ✍️ 텍스트 메모 & 형광펜</span>
                <span>• 페이지 회전/순서 이동</span>
                <span>• 기밀 워터마크 추가</span>
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
