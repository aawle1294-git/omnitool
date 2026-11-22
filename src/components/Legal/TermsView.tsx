import React from 'react';
import { NotionPageHeader } from '../NotionLayout/NotionPageHeader';
import { FileText, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { ActiveTab } from '../../types';

interface TermsViewProps {
  setActiveTab: (tab: ActiveTab) => void;
}

export const TermsView: React.FC<TermsViewProps> = ({ setActiveTab }) => {
  return (
    <div className="space-y-6 pb-20">
      {/* Back Button */}
      <div>
        <button
          onClick={() => setActiveTab('home')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#787774] hover:text-[#37352f] dark:hover:text-white transition group py-1.5 px-3 rounded-lg hover:bg-[#efefed] dark:hover:bg-[#282828] border border-[#e9e9e7] dark:border-[#333] bg-white dark:bg-[#202020] shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>홈으로 돌아가기</span>
        </button>
      </div>

      <NotionPageHeader
        icon="📜"
        title="서비스 이용약관 (Terms of Service)"
        description="AllDesk 웹사이트 및 제공 서비스의 이용에 관한 권리, 의무 및 책임사항을 규정합니다."
        tags={[
          { label: '이용약관' },
          { label: '무료 웹 서비스' },
          { label: '책임의 한계' },
          { label: '최종 개정: 2026년 11월' },
        ]}
      />

      <div className="p-6 rounded-2xl bg-white dark:bg-[#1f1f1f] border border-[#e9e9e7] dark:border-[#2f2f2f] space-y-6 text-xs text-[#37352f] dark:text-[#d3d3d3] leading-relaxed shadow-2xs">
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-black dark:text-white">제 1 조 (목적)</h2>
          <p className="text-[#787774] dark:text-[#a0a0a0]">
            본 약관은 AllDesk(이하 "서비스")가 제공하는 모든 브라우저 기반 파일 편집, 변환, 압축 및 윈도우 프로그램 무인 설치 마법사 소프트웨어의 이용조건 및 절차 등에 관한 기본적인 사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-black dark:text-white">제 2 조 (서비스의 제공 및 변경)</h2>
          <p className="text-[#787774] dark:text-[#a0a0a0]">
            1. AllDesk는 사용자에게 완전한 무료 클라이언트 웹 서비스를 제공하며, 언제든지 서비스의 개선 또는 품질 향상을 위해 세부 기능을 추가·수정할 수 있습니다.
          </p>
          <p className="text-[#787774] dark:text-[#a0a0a0]">
            2. 모든 파일 처리는 사용자의 로컬 환경에서 실행되며, 서비스 제공자는 사용자의 파일을 보관하거나 조회하지 않습니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-black dark:text-white">제 3 조 (사용자의 의무)</h2>
          <p className="text-[#787774] dark:text-[#a0a0a0]">
            사용자는 불법적이거나 타인의 저작권을 침해하는 문서 및 미디어 파일을 가공하거나 유포하는 행위를 하여서는 안 되며, 관계 법령 및 공공질서에 위반되는 행위를 하여서는 안 됩니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-black dark:text-white">제 4 조 (윈도우 설치 마법사 소프트웨어 관련 고지)</h2>
          <p className="text-[#787774] dark:text-[#a0a0a0]">
            AllDesk의 프로그램 설치 마법사는 Microsoft의 공식 Windows Package Manager(winget) 저장소를 통해 각 소프트웨어 제작사의 공식 원본 설치파일을 다운로드하여 실행합니다. 각 설치 프로그램의 최종 라이선스는 해당 소프트웨어 개발사의 라이선스 약관을 따릅니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-black dark:text-white">제 5 조 (면책조항)</h2>
          <p className="text-[#787774] dark:text-[#a0a0a0]">
            서비스 제공자는 천재지변, 사용자의 기기 환경 결함 또는 인터넷 통신 장애로 인한 서비스 일시 중단에 대해 책임을 지지 않으며, 서비스를 통해 가공된 결과물의 완전성에 대한 최종 검토 책임은 사용자 본인에게 있습니다.
          </p>
        </section>
      </div>
    </div>
  );
};
