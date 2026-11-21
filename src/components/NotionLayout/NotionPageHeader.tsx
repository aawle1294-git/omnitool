import React from 'react';

interface NotionPageHeaderProps {
  icon: string;
  title: string;
  description: string;
  coverGradient?: string;
  tags?: { label: string; color?: string }[];
}

export const NotionPageHeader: React.FC<NotionPageHeaderProps> = ({
  icon,
  title,
  description,
  coverGradient = 'from-stone-100 via-neutral-100 to-stone-200 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900',
  tags = [],
}) => {
  return (
    <div className="mb-8 select-none">
      {/* Cover Header */}
      <div
        className={`h-28 sm:h-36 w-full rounded-2xl bg-gradient-to-r ${coverGradient} border border-[#e9e9e7] dark:border-[#2f2f2f] relative overflow-hidden`}
      >
        <div className="absolute inset-0 opacity-20 dark:opacity-10 bg-[radial-gradient(#37352f_1px,transparent_1px)] [background-size:16px_16px]" />
      </div>

      {/* Icon & Title */}
      <div className="relative px-2 -mt-10 sm:-mt-12 space-y-3">
        <div className="w-20 h-20 rounded-2xl bg-white dark:bg-[#191919] border-2 border-[#e9e9e7] dark:border-[#2f2f2f] shadow-md flex items-center justify-center text-4xl cursor-pointer hover:scale-105 transition-transform">
          {icon}
        </div>

        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#37352f] dark:text-[#ffffff]">
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-[#787774] dark:text-[#9b9a97] mt-1.5 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Notion Properties Block */}
        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-[#9b9a97]">속성:</span>
            {tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-md bg-[#f0f0ee] dark:bg-[#282828] text-[#37352f] dark:text-[#d3d3d3] border border-[#e3e2e0] dark:border-[#333] text-[11px] font-medium"
              >
                {tag.label}
              </span>
            ))}
          </div>
        )}

        <hr className="border-[#e9e9e7] dark:border-[#2f2f2f] pt-1" />
      </div>
    </div>
  );
};

