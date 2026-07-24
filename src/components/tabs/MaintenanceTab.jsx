export function MaintenanceTab({ title, subtitle, ctaLabel, ctaTab = 'dashboard', setActiveTab, tone = 'amber' }) {
  const toneClass = tone === 'orange'
    ? 'border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-900/60 dark:bg-orange-950/20 dark:text-orange-300'
    : 'border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-300';

  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <div className="rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-sm dark:border-amber-900/60 dark:bg-[#0B1220]">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border ${toneClass}`}>
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.757.426 1.757 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.757-2.924 1.757-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.757-.426-1.757-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h2 className="mt-5 text-xl font-black text-gray-900 dark:text-white">{title}</h2>
        <p className="mt-3 text-sm text-gray-500 dark:text-[#94A3B8]">{subtitle}</p>
        <button
          type="button"
          onClick={() => setActiveTab?.(ctaTab)}
          className="mt-6 rounded-2xl bg-[#FF6B00] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#FF7F1F]"
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}
