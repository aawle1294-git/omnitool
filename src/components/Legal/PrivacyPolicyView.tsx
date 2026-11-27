import React from 'react';
import { NotionPageHeader } from '../NotionLayout/NotionPageHeader';
import { Lock, Cookie, Eye, Mail, ArrowLeft } from 'lucide-react';
import { ActiveTab } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface PrivacyPolicyViewProps {
  setActiveTab: (tab: ActiveTab) => void;
}

export const PrivacyPolicyView: React.FC<PrivacyPolicyViewProps> = ({ setActiveTab }) => {
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
        icon="🛡️"
        title={L('개인정보처리방침 (Privacy Policy)', 'Privacy Policy')}
        description={L(
          'AllDesk는 사용자의 개인정보 및 파일 프라이버시를 최우선으로 보호하며, 관련 법령 및 Google AdSense 광고 정책을 엄격히 준수합니다.',
          'AllDesk prioritizes user privacy and file security, strictly complying with applicable laws and Google AdSense policies.'
        )}
        tags={[
          { label: L('Google AdSense 정책 준수', 'Google AdSense Compliant') },
          { label: L('100% 로컬 브라우저 처리', '100% Local Browser Processing') },
          { label: L('쿠키(Cookie) 및 광고 고지', 'Cookies & Ads Notice') },
          { label: L('최종 수정: 2026년 11월', 'Last Updated: Nov 2026') },
        ]}
      />

      <div className="p-6 rounded-2xl bg-white dark:bg-[#1f1f1f] border border-[#e9e9e7] dark:border-[#2f2f2f] space-y-6 text-xs text-[#37352f] dark:text-[#d3d3d3] leading-relaxed shadow-2xs">
        {/* Section 1 */}
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-black dark:text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span>{L('1. 파일 및 데이터 처리 원칙 (서버 전송 없음)', '1. File & Data Processing Principle (No Server Uploads)')}</span>
          </h2>
          <p className="text-[#787774] dark:text-[#a0a0a0]">
            {L(
              'AllDesk(올데스크)에서 제공하는 사진 자르기, PNG 투명도 편집, PDF 페이지 편집, 파일 용량 압축, 파일 형식 변환 등의 모든 작업은 사용자의 브라우저 내부(Client-side HTML5 Web API / WebAssembly)에서만 안전하게 실행됩니다.',
              'All tools provided by AllDesk — including image cropping, PNG transparency editing, PDF page editing, file compression, and format conversion — run strictly inside your browser (Client-side HTML5 Web API / WebAssembly).'
            )}
          </p>
          <p className="text-[#787774] dark:text-[#a0a0a0]">
            {L(
              '사용자가 업로드하거나 편집하는 어떠한 이미지, 문서, 동영상 파일도 외부 서버로 전송되거나 저장되지 않으므로, 개인정보 및 사적인 데이터가 외부로 유출될 위험이 전혀 없습니다.',
              'No image, document, or video file you open or edit is ever transmitted to or stored on external servers, eliminating any risk of external data leakage.'
            )}
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-black dark:text-white flex items-center gap-2">
            <Cookie className="w-4 h-4 text-amber-500" />
            <span>{L('2. 쿠키(Cookie) 및 Google AdSense 광고 고지', '2. Cookies & Google AdSense Notice')}</span>
          </h2>
          <p className="text-[#787774] dark:text-[#a0a0a0]">
            {L(
              '본 웹사이트는 무료 서비스 운영 및 품질 개선을 위해 제3자 광고 사업자인 Google AdSense를 활용할 수 있습니다.',
              'This website may use Google AdSense, a third-party advertising provider, to support free operation and service improvements.'
            )}
          </p>
          <ul className="list-disc pl-5 space-y-1 text-[#787774] dark:text-[#a0a0a0]">
            <li>
              {L(
                'Google을 포함한 제3자 공급업체는 사용자가 본 사이트 또는 다른 웹사이트를 과거에 방문한 기록을 바탕으로 광고를 게재하기 위해 쿠키(Cookie)를 사용합니다.',
                'Third-party vendors, including Google, use cookies to serve ads based on a user’s prior visits to this website or other websites.'
              )}
            </li>
            <li>
              {L(
                'Google의 광고 쿠키를 통해 Google 및 그 파트너는 사용자의 본 사이트 및 인터넷 상의 다른 사이트 방문을 토대로 사용자에게 적합한 맞춤형 광고를 제공할 수 있습니다.',
                'Google’s use of advertising cookies enables it and its partners to serve personalized ads based on your visits to this site and/or other sites on the Internet.'
              )}
            </li>
            <li>
              {L('사용자는 Google 맞춤형 광고 설정을 원하지 않을 경우, ', 'You may opt out of personalized advertising by visiting ')}
              <a
                href="https://www.google.com/settings/ads"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 dark:text-blue-400 underline font-semibold"
              >
                {L('Google 광고 설정(Google Ads Settings)', 'Google Ads Settings')}
              </a>
              {L('에서 맞춤형 광고 게재를 언제든지 사용 중지할 수 있습니다.', ' at any time.')}
            </li>
            <li>
              {L('또는 ', 'Alternatively, you can opt out of a third-party vendor’s use of cookies for personalized advertising by visiting ')}
              <a
                href="http://www.aboutads.info/choices/"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 dark:text-blue-400 underline font-semibold"
              >
                www.aboutads.info
              </a>
              {L('에 접속하여 제3자 광고 공급업체의 맞춤형 광고용 쿠키 수집을 일괄 거부할 수 있습니다.', '.')}
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-black dark:text-white flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-500" />
            <span>{L('3. 로컬 스토리지(LocalStorage) 이용 안내', '3. LocalStorage Usage')}</span>
          </h2>
          <p className="text-[#787774] dark:text-[#a0a0a0]">
            {L(
              'AllDesk는 사용자의 편의를 위해 다크 모드 테마, 언어 설정 및 윈도우 설치 마법사에서 선택한 프로그램 체크박스 상태만을 사용자의 기기 브라우저(LocalStorage)에 로컬 저장합니다. 이 정보는 개인을 식별할 수 없는 단순 환경설정 데이터입니다.',
              'For convenience, AllDesk stores only your dark mode preference, language setting, and selected apps in your browser’s LocalStorage. This is non-identifying configuration data.'
            )}
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-black dark:text-white flex items-center gap-2">
            <Mail className="w-4 h-4 text-purple-500" />
            <span>{L('4. 개인정보 보호책임자 및 문의처', '4. Privacy Officer & Contact')}</span>
          </h2>
          <p className="text-[#787774] dark:text-[#a0a0a0]">
            {L(
              'AllDesk 서비스 이용 중 개인정보 보호와 관련된 문의, 의견 제시, 정책 관련 문의사항이 있으실 경우 아래의 담당자 이메일로 연락해 주시면 성실히 답변해 드리겠습니다.',
              'If you have any questions or feedback regarding privacy or these policies while using AllDesk, please contact us at the email below.'
            )}
          </p>
          <div className="p-3 rounded-xl bg-[#faf9f6] dark:bg-[#282828] border border-[#efefed] dark:border-[#333] font-mono text-[11px]">
            <p>• {L('서비스명', 'Service')}: AllDesk</p>
            <p>• {L('운영자 / 관리자', 'Operator')}: AllDesk Team</p>
            <p>• {L('공식 웹사이트', 'Website')}: https://omnitool.aawle1294.workers.dev</p>
            <p>• {L('문의 이메일', 'Email')}: support@omnitool.aawle1294.workers.dev</p>
          </div>
        </section>
      </div>
    </div>
  );
};
