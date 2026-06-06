import { Icons } from '../../constants/icons';

function resolveAccessLabel(node, t) {
  if (node.accessType === 'admin') return t.adminSubscriptionAdmin;
  if (node.accessType === 'waiver') return t.adminSubscriptionWaiver;
  if (node.licenseStatus === 'trial') return t.adminSubscriptionTrial;
  if (node.licenseStatus === 'active') return t.adminSubscriptionSubscription;
  return t.affiliateExpiredAccess;
}

function formatJoinedAt(value) {
  if (!value) return '--';

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(value));
}

function AffiliateLevelList({ items, emptyLabel, title, accentClass, t }) {
  return (
    <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-gray-200 dark:border-[#334155] shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h3>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${accentClass}`}>
          {items.length}
        </span>
      </div>

      {items.length ? (
        <div className="space-y-3">
          {items.map((node) => (
            <div key={`${title}-${node.profileId}`} className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-[#334155]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-gray-900 dark:text-white">{node.emailMasked}</p>
                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                    {t.affiliateJoinedAt}: {formatJoinedAt(node.joinedAt)}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${node.hasAccess ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-gray-200 text-gray-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                  {resolveAccessLabel(node, t)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400">{emptyLabel}</p>
      )}
    </div>
  );
}

export function AffiliatesTab({ handleCopyText, t, referralCode, summary, network, isLoading }) {
  const resolvedReferralCode = referralCode || 'comunidade_rm';
  const configuredUrl = import.meta.env.VITE_APP_URL?.trim();
  const fallbackUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const baseUrl = (configuredUrl || fallbackUrl).replace(/\/$/, '');
  const referralLink = `${baseUrl}/?ref=${encodeURIComponent(resolvedReferralCode)}`;
  const safeSummary = summary || {};
  const safeNetwork = network || { level1: [], level2: [] };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-gray-200 dark:border-[#334155] shadow-sm space-y-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center">
            <span className="p-2 bg-orange-50 dark:bg-orange-950/20 text-[#FF6B00] rounded-lg mr-2">
              {Icons.Users()}
            </span>
            {t.affiliateProgramme}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t.affiliateRecurring}</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">{t.affiliateNetworkSubtitle}</p>

          <div className="bg-gray-50 dark:bg-[#334155] rounded-xl p-4 space-y-3">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-gray-500 dark:text-gray-300">{t.level1}:</span>
              <span className="text-[#FF6B00]">20% {t.recurring}</span>
            </div>
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-gray-500 dark:text-gray-300">{t.level2}:</span>
              <span className="text-gray-700 dark:text-gray-200">10% {t.recurring}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-gray-200 dark:border-[#334155] shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">{t.yourReferralLink}</h3>
            <div className="flex bg-gray-50 dark:bg-[#334155] border border-gray-200 dark:border-gray-600 rounded-xl p-2 items-center justify-between">
              <span className="text-xs font-mono text-gray-500 dark:text-gray-300 truncate mr-2">{referralLink}</span>
              <button onClick={() => handleCopyText(referralLink, t.affiliateLink)} className="p-1.5 text-[#FF6B00] hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                {Icons.CopyText()}
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-3 pt-2">
            <svg width="40" height="40" viewBox="0 0 24 24" className="border border-gray-100 dark:border-gray-600 p-1 bg-white rounded-lg flex-shrink-0">
              <rect width="24" height="24" fill="white" />
              <rect x="2" y="2" width="6" height="6" fill="black" />
              <rect x="16" y="2" width="6" height="6" fill="black" />
              <rect x="2" y="16" width="6" height="6" fill="black" />
              <rect x="4" y="4" width="2" height="2" fill="white" />
              <rect x="18" y="4" width="2" height="2" fill="white" />
              <rect x="4" y="18" width="2" height="2" fill="white" />
              <rect x="10" y="10" width="4" height="4" fill="black" />
            </svg>
            <span className="text-[10px] text-gray-400 dark:text-gray-400 font-medium">{t.shareQr}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-gray-200 dark:border-[#334155] shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t.affiliateNetworkSummary}</h3>
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">{t.quickConversions}</p>
          </div>
          {isLoading ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">{t.affiliateLoading}</p>
          ) : null}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-gray-50 dark:bg-[#334155] p-2 rounded-xl">
              <p className="text-gray-400 dark:text-gray-400">{t.level1}</p>
              <p className="font-extrabold text-gray-900 dark:text-white text-base mt-1">{safeSummary.level1Count || 0}</p>
            </div>
            <div className="bg-gray-50 dark:bg-[#334155] p-2 rounded-xl">
              <p className="text-gray-400 dark:text-gray-400">{t.level2}</p>
              <p className="font-extrabold text-gray-900 dark:text-white text-base mt-1">{safeSummary.level2Count || 0}</p>
            </div>
            <div className="bg-gray-50 dark:bg-[#334155] p-2 rounded-xl">
              <p className="text-gray-400 dark:text-gray-400">{t.active}</p>
              <p className="font-extrabold text-green-600 dark:text-green-400 text-base mt-1">{safeSummary.activeCount || 0}</p>
            </div>
          </div>
          <div className="rounded-xl border border-dashed border-orange-200 bg-orange-50 px-3 py-2 dark:border-orange-900/40 dark:bg-orange-950/20">
            <p className="text-[11px] font-medium text-[#B45309] dark:text-orange-300">
              {t.leads}: {safeSummary.totalLeads || 0}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-gray-200 dark:border-[#334155] shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t.affiliateTreeTitle}</h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t.affiliateTreeSubtitle}</p>
        <div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-6">
          <AffiliateLevelList
            items={safeNetwork.level1 || []}
            emptyLabel={t.affiliateNoLevel1}
            title={t.level1}
            accentClass="bg-orange-50 text-[#FF6B00] dark:bg-orange-950/30 dark:text-orange-300"
            t={t}
          />
          <AffiliateLevelList
            items={safeNetwork.level2 || []}
            emptyLabel={t.affiliateNoLevel2}
            title={t.level2}
            accentClass="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
            t={t}
          />
        </div>
      </div>
    </div>
  );
}
