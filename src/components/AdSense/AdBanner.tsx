import React, { useEffect, useRef } from 'react';

interface AdBannerProps {
  client?: string; // e.g. "ca-pub-XXXXXXXXXXXXXXXX"
  slot?: string;   // e.g. "1234567890"
  format?: 'auto' | 'fluid' | 'rectangle';
  className?: string;
  showPlaceholder?: boolean;
}

declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

export const AdBanner: React.FC<AdBannerProps> = ({
  client = 'ca-pub-XXXXXXXXXXXXXXXX',
  slot = '1234567890',
  format = 'auto',
  className = '',
  showPlaceholder = true,
}) => {
  const adRef = useRef<HTMLModElement | null>(null);

  useEffect(() => {
    // Only attempt to push ad if a real ca-pub client ID is provided
    if (client && client !== 'ca-pub-XXXXXXXXXXXXXXXX') {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.warn('AdSense push notice:', e);
      }
    }
  }, [client, slot]);

  // If real client is provided, render live Google AdSense ins tag
  if (client && client !== 'ca-pub-XXXXXXXXXXXXXXXX') {
    return (
      <div className={`w-full overflow-hidden my-4 text-center ${className}`}>
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={client}
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  // Pre-approval / Setup preview placeholder for Google Reviewers & User
  if (!showPlaceholder) return null;

  return (
    <div
      className={`w-full my-6 p-4 rounded-xl border border-dashed border-[#e3e2e0] dark:border-[#333] bg-[#faf9f6]/80 dark:bg-[#1a1a1a]/80 text-center select-none transition ${className}`}
    >
      <div className="flex items-center justify-center gap-2 text-[11px] font-semibold text-[#9b9a97]">
        <span>📢</span>
        <span>스폰서 광고 영역 (Google AdSense 준비 완료)</span>
      </div>
      <p className="text-[10px] text-[#b0afa9] mt-1">
        애드센스 승인 후 발급받은 ca-pub 코드를 입력하면 실제 맞춤 광고가 게재됩니다.
      </p>
    </div>
  );
};
