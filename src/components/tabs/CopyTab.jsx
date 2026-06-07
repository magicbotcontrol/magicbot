import { Icons } from '../../constants/icons';

function formatEntitlementDate(value) {
  if (!value) return '--';
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(value));
}

function buildUrl(base, params) {
  const url = new URL(base);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (!value) return;
    url.searchParams.set(key, String(value));
  });
  return url.toString();
}

export function CopyTab({ showToast, t, promoCode, copyEntitlement, isCopyTradingActive, isCopyEntitlementLoading }) {
  const registrationUrl = buildUrl('https://controlcopyiq.com/c/MAGICBOT', {
    source: 'magiccopybot',
    promo: (promoCode || '').trim().toUpperCase() || null
  });
  const portalUrl = buildUrl('https://controlcopyiq.com/', {
    source: 'magiccopybot'
  });

  const handleOpen = (url) => {
    if (typeof window === 'undefined') return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const steps = [
    { title: t.copyStep1Title, description: t.copyStep1Description },
    { title: t.copyStep2Title, description: t.copyStep2Description },
    { title: t.copyStep3Title, description: t.copyStep3Description },
    { title: t.copyStep4Title, description: t.copyStep4Description },
    { title: t.copyStep5Title, description: t.copyStep5Description },
    { title: t.copyStep6Title, description: t.copyStep6Description }
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD7B5] bg-[#FFF7F0] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#B45309] dark:border-[#7C2D12] dark:bg-[#3A1E12] dark:text-[#FDBA74]">
              <Icons.Copy />
              <span>{t.copyTitleBadge}</span>
            </div>
            <h2 className="mt-3 text-lg font-bold text-gray-900 dark:text-white">{t.copyTitle}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t.copySubtitle}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                handleOpen(registrationUrl);
                showToast(t.copyCtaToast);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF6B00] px-4 py-3 text-xs font-bold text-white shadow-lg shadow-[#FF6B00]/20 transition-colors hover:bg-[#FF7F1F]"
            >
              <Icons.Link />
              {t.copyCtaRegister}
            </button>
            <button
              type="button"
              onClick={() => handleOpen(portalUrl)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#334155] dark:bg-[#0B1220] dark:text-[#E2E8F0] dark:hover:bg-[#0F172A]"
            >
              <Icons.Globe />
              {t.copyCtaPortal}
            </button>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">{t.copyStatusTitle}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t.copyStatusSubtitle}</p>
          </div>
          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold ${isCopyTradingActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-[#0B1220] dark:text-[#94A3B8]'}`}>
            {isCopyEntitlementLoading ? t.copyStatusLoading : (isCopyTradingActive ? t.copyStatusActive : t.copyStatusInactive)}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#334155] dark:bg-[#0B1220]">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.copyStatusDaysLeftLabel}</p>
            <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
              {isCopyEntitlementLoading ? '--' : (copyEntitlement?.remainingDays ?? 0)}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#334155] dark:bg-[#0B1220]">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.copyStatusExpiresAtLabel}</p>
            <p className="mt-2 text-sm font-bold text-gray-900 dark:text-white">
              {isCopyEntitlementLoading ? '--' : formatEntitlementDate(copyEntitlement?.expiresAt)}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#334155] dark:bg-[#0B1220]">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.copyStatusPromoLabel}</p>
            <p className="mt-2 break-all text-xs font-mono text-gray-700 dark:text-[#CBD5E1]">
              {(promoCode || '').trim() ? (promoCode || '').trim().toUpperCase() : '--'}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">{t.copyQuickSetupTitle}</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t.copyQuickSetupSubtitle}</p>

          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#334155] dark:bg-[#0B1220]">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.copyLinkRegisterLabel}</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="break-all text-xs font-mono text-gray-700 dark:text-[#CBD5E1]">{registrationUrl}</span>
                <button
                  type="button"
                  onClick={() => handleOpen(registrationUrl)}
                  className="rounded-xl bg-[#FFF7F0] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#B45309] transition-colors hover:bg-[#FFE6D2] dark:bg-[#3A1E12] dark:text-[#FDBA74] dark:hover:bg-[#4A2514]"
                >
                  {t.copyOpenLink}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#334155] dark:bg-[#0B1220]">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.copyLinkPortalLabel}</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="break-all text-xs font-mono text-gray-700 dark:text-[#CBD5E1]">{portalUrl}</span>
                <button
                  type="button"
                  onClick={() => handleOpen(portalUrl)}
                  className="rounded-xl bg-[#FFF7F0] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#B45309] transition-colors hover:bg-[#FFE6D2] dark:bg-[#3A1E12] dark:text-[#FDBA74] dark:hover:bg-[#4A2514]"
                >
                  {t.copyOpenLink}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">{t.copyStepsTitle}</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t.copyStepsSubtitle}</p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#334155] dark:bg-[#0B1220]"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-xs font-black text-[#FF6B00] shadow-sm dark:bg-[#111827]">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{step.title}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">{t.copyChecklistTitle}</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t.copyChecklistSubtitle}</p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {[t.copyChecklist1, t.copyChecklist2, t.copyChecklist3, t.copyChecklist4].map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#334155] dark:bg-[#0B1220]">
              <Icons.CheckCircle />
              <p className="text-xs font-semibold text-gray-700 dark:text-[#CBD5E1]">{item}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
