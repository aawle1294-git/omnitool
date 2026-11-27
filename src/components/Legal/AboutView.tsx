import React from 'react';
import { NotionPageHeader } from '../NotionLayout/NotionPageHeader';
import { Shield, Zap, Mail, ArrowLeft } from 'lucide-react';
import { ActiveTab } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface AboutViewProps {
  setActiveTab: (tab: ActiveTab) => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ setActiveTab }) => {
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
        icon="✨"
        title={L('AllDesk 소개 (About Us)', 'About AllDesk')}
        description={L(
          '심플하고 직관적인 인터페이스로 완성된 차세대 올인원 데스크 생산성 워크스페이스입니다.',
          'A next-generation all-in-one desk productivity workspace crafted with a simple and intuitive design philosophy.'
        )}
        tags={[
          { label: L('AllDesk (올데스크)', 'AllDesk') },
          { label: 'Minimalist Design' },
          { label: L('100% 로컬 프라이버시', '100% Local Privacy') },
          { label: L('무료 생산성 도구', 'Free Productivity Suite') },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Philosophy */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1f1f1f] border border-[#e9e9e7] dark:border-[#2f2f2f] space-y-2.5 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-[#37352f] dark:text-white">
            {L('100% 프라이버시 우선 원칙', '100% Privacy-First Principle')}
          </h3>
          <p className="text-xs text-[#787774] dark:text-[#a0a0a0] leading-relaxed">
            {L(
              'AllDesk는 어떠한 파일도 외부 서버로 업로드하지 않습니다. 사진 자르기, 투명도 보존, PDF 편집 및 용량 압축 등 모든 연산이 사용자 브라우저 내부에서 완결되므로 기밀 문서나 개인 사진도 안심하고 다룰 수 있습니다.',
              'AllDesk never uploads any files to external servers. Image cropping, transparency preservation, PDF editing, and compression all run locally in your browser, keeping confidential documents and personal photos completely safe.'
            )}
          </p>
        </div>

        {/* Card 2: All in One */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1f1f1f] border border-[#e9e9e7] dark:border-[#2f2f2f] space-y-2.5 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-[#37352f] dark:text-white">
            {L('필요한 모든 도구가 한곳에', 'Everything You Need in One Place')}
          </h3>
          <p className="text-xs text-[#787774] dark:text-[#a0a0a0] leading-relaxed">
            {L(
              '복잡하고 광고로 뒤덮인 해외 사이트를 전전할 필요 없이, PC 세팅 무인 설치부터 이미지/PDF 편집, 포맷 변환 및 미니 도구함까지 AllDesk 하나로 신속하게 끝낼 수 있습니다.',
              'No need to jump between cluttered ad-heavy websites. From unattended PC app setup to image/PDF editing, format conversion, and mini utilities — get it all done fast in AllDesk.'
            )}
          </p>
        </div>
      </div>

      {/* Developer & Contact Information */}
      <div className="p-6 rounded-2xl bg-[#faf9f6] dark:bg-[#202020] border border-[#e9e9e7] dark:border-[#2f2f2f] space-y-3 text-xs leading-relaxed">
        <h3 className="font-bold text-sm text-[#37352f] dark:text-white flex items-center gap-2">
          <Mail className="w-4 h-4 text-emerald-600" />
          <span>{L('문의 및 피드백 (Contact)', 'Contact & Feedback')}</span>
        </h3>
        <p className="text-[#787774] dark:text-[#a0a0a0]">
          {L(
            '버그 제보, 새로운 기능 요청, 제휴 및 기타 문의사항은 언제든지 아래의 연락처로 보내주시기 바랍니다.',
            'For bug reports, feature requests, partnerships, or other inquiries, please reach out anytime via the contacts below.'
          )}
        </p>
        <div className="font-mono text-[11px] text-[#37352f] dark:text-[#e0e0e0] space-y-1 pt-1">
          <p>• {L('이메일', 'Email')}: <strong>support@omnitool.aawle1294.workers.dev</strong></p>
          <p>• {L('깃허브 저장소', 'GitHub')}: <strong>github.com/aawle1294-git/omnitool</strong></p>
          <p>• {L('배포 도메인', 'Website')}: <strong>https://omnitool.aawle1294.workers.dev</strong></p>
        </div>
      </div>
    </div>
  );
};
