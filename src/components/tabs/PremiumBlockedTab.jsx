export function PremiumBlockedTab({ t, setActiveTab }) {
  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <div className="rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-900/60 dark:bg-[#0B1220]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-300">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
          </svg>
        </div>
        <h2 className="mt-5 text-xl font-black text-gray-900 dark:text-white">{t.premiumBlockedTitle}</h2>
        <p className="mt-3 text-sm text-gray-500 dark:text-[#94A3B8]">{t.premiumBlockedSubtitle}</p>
        <button
          type="button"
          onClick={() => setActiveTab('shop')}
          className="mt-6 rounded-2xl bg-[#FF6B00] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#FF7F1F]"
        >
          {t.premiumBlockedCta}
        </button>
      </div>
    </div>
  );
}
