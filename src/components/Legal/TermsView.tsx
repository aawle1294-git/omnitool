import React from 'react';
import { NotionPageHeader } from '../NotionLayout/NotionPageHeader';
import { ArrowLeft } from 'lucide-react';
import { ActiveTab } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface TermsViewProps {
  setActiveTab: (tab: ActiveTab) => void;
}

export const TermsView: React.FC<TermsViewProps> = ({ setActiveTab }) => {
  const { lang } = useLanguage();
  const L = (ko: string, en: string) => (lang === 'en' ? en : ko);

  return (
    <div className="space-y-6 pb-20">
      {/* Back Button */}
      <div>
        <button
          onClick={() => setActiveTab('home')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#787774] hover:text-[#37352f] dark:hover:text-white transition group py-1.5 px-3 rounded-lg hover:bg-[#efefed] dark:hover:bg-[#282828] border border-[#e9e9e7] dark:border-[#333] bg-white dark:bg-[#202020] shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>{L('홈으로 돌아가기', 'Back to Home')}</span>
        </button>
      </div>

      <NotionPageHeader
        icon="📜"
        title={L('서비스 이용약관 (Terms of Service)', 'Terms of Service')}
        description={L(
          'AllDesk 웹사이트 및 제공 서비스의 이용에 관한 권리, 의무 및 책임사항을 규정합니다.',
          'Defines the rights, obligations, and responsibilities regarding the use of the AllDesk website and its services.'
        )}
        tags={[
          { label: L('이용약관', 'Terms') },
          { label: L('무료 웹 서비스', 'Free Web Service') },
          { label: L('책임의 한계', 'Limitation of Liability') },
          { label: L('최종 개정: 2026년 11월', 'Last Updated: Nov 2026') },
        ]}
      />

      <div className="p-6 rounded-2xl bg-white dark:bg-[#1f1f1f] border border-[#e9e9e7] dark:border-[#2f2f2f] space-y-6 text-xs text-[#37352f] dark:text-[#d3d3d3] leading-relaxed shadow-2xs">
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-black dark:text-white">
            {L('제 1 조 (목적)', 'Article 1 (Purpose)')}
          </h2>
          <p className="text-[#787774] dark:text-[#a0a0a0]">
            {L(
              '본 약관은 AllDesk(이하 "서비스")가 제공하는 모든 브라우저 기반 파일 편집, 변환, 압축 및 윈도우 프로그램 무인 설치 마법사 소프트웨어의 이용조건 및 절차 등에 관한 기본적인 사항을 규정함을 목적으로 합니다.',
              'These Terms govern the basic conditions and procedures for using all browser-based file editing, conversion, compression, and Windows unattended install wizard tools provided by AllDesk ("Service").'
            )}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-black dark:text-white">
            {L('제 2 조 (서비스의 제공 및 변경)', 'Article 2 (Provision & Modification of Service)')}
          </h2>
          <p className="text-[#787774] dark:text-[#a0a0a0]">
            {L(
              '1. AllDesk는 사용자에게 완전한 무료 클라이언트 웹 서비스를 제공하며, 언제든지 서비스의 개선 또는 품질 향상을 위해 세부 기능을 추가·수정할 수 있습니다.',
              '1. AllDesk provides a completely free client-side web service and may add or modify features at any time to improve quality.'
            )}
          </p>
          <p className="text-[#787774] dark:text-[#a0a0a0]">
            {L(
              '2. 모든 파일 처리는 사용자의 로컬 환경에서 실행되며, 서비스 제공자는 사용자의 파일을 보관하거나 조회하지 않습니다.',
              '2. All file processing executes locally in the user’s environment; the service provider does not store or inspect user files.'
            )}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-black dark:text-white">
            {L('제 3 조 (사용자의 의무)', 'Article 3 (User Obligations)')}
          </h2>
          <p className="text-[#787774] dark:text-[#a0a0a0]">
            {L(
              '사용자는 불법적이거나 타인의 저작권을 침해하는 문서 및 미디어 파일을 가공하거나 유포하는 행위를 하여서는 안 되며, 관계 법령 및 공공질서에 위반되는 행위를 하여서는 안 됩니다.',
              'Users must not process or distribute illegal documents or media files that infringe on third-party copyrights, nor engage in any activity violating applicable laws.'
            )}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-black dark:text-white">
            {L('제 4 조 (윈도우 설치 마법사 소프트웨어 관련 고지)', 'Article 4 (Windows Install Wizard Notice)')}
          </h2>
          <p className="text-[#787774] dark:text-[#a0a0a0]">
            {L(
              'AllDesk의 프로그램 설치 마법사는 Microsoft의 공식 Windows Package Manager(winget) 저장소를 통해 각 소프트웨어 제작사의 공식 원본 설치파일을 다운로드하여 실행합니다. 각 설치 프로그램의 최종 라이선스는 해당 소프트웨어 개발사의 라이선스 약관을 따릅니다.',
              'AllDesk’s Install Wizard downloads and runs official vendor installers via Microsoft’s official Windows Package Manager (winget) repository. Final licensing for each installed program is governed by its respective vendor’s license terms.'
            )}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-black dark:text-white">
            {L('제 5 조 (면책조항)', 'Article 5 (Disclaimer)')}
          </h2>
          <p className="text-[#787774] dark:text-[#a0a0a0]">
            {L(
              '서비스 제공자는 천재지변, 사용자의 기기 환경 결함 또는 인터넷 통신 장애로 인한 서비스 일시 중단에 대해 책임을 지지 않으며, 서비스를 통해 가공된 결과물의 완전성에 대한 최종 검토 책임은 사용자 본인에게 있습니다.',
              'The service provider is not liable for temporary interruptions due to force majeure, user device defects, or network failures, and users bear final responsibility for reviewing processed outputs.'
            )}
          </p>
        </section>
      </div>
    </div>
  );
};
