export function ScrollableTableShell({ children, minWidthClass = 'min-w-[640px]', hintLabel = 'Swipe' }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-[#1F2A3A] dark:bg-[#0B1220] dark:shadow-[0_18px_50px_rgba(3,7,18,0.45)]">
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-white via-white/90 to-transparent dark:from-[#0B1220] dark:via-[#0B1220]/92 dark:to-transparent sm:hidden" />

      <div className="pointer-events-none absolute right-3 top-3 z-20 sm:hidden">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200/80 bg-white/95 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-gray-400 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur dark:border-[#1F2A3A] dark:bg-[#070B14]/90 dark:text-[#94A3B8]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#FF6B00] animate-pulse" />
          <span>{hintLabel}</span>
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7l-5 5 5 5M16 7l5 5-5 5" />
          </svg>
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <div className={minWidthClass}>{children}</div>
      </div>
    </div>
  );
}
