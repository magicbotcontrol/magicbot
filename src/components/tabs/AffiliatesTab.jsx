import { Icons } from '../../constants/icons';
import { affiliateLeaders } from '../../constants/mockData';

export function AffiliatesTab({ handleCopyText, t, formatMoney }) {
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
              <span className="text-xs font-mono text-gray-500 dark:text-gray-300 truncate mr-2">https://magicbot.app/ref=comunidade_rm</span>
              <button onClick={() => handleCopyText('https://magicbot.app/ref=comunidade_rm', t.affiliateLink)} className="p-1.5 text-[#FF6B00] hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
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
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t.quickConversions}</h3>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-gray-50 dark:bg-[#334155] p-2 rounded-xl">
              <p className="text-gray-400 dark:text-gray-400">{t.clicks}</p>
              <p className="font-extrabold text-gray-900 dark:text-white text-base mt-1">2.340</p>
            </div>
            <div className="bg-gray-50 dark:bg-[#334155] p-2 rounded-xl">
              <p className="text-gray-400 dark:text-gray-400">{t.leads}</p>
              <p className="font-extrabold text-gray-900 dark:text-white text-base mt-1">412</p>
            </div>
            <div className="bg-gray-50 dark:bg-[#334155] p-2 rounded-xl">
              <p className="text-gray-400 dark:text-gray-400">{t.active}</p>
              <p className="font-extrabold text-green-600 dark:text-green-400 text-base mt-1">45</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-gray-200 dark:border-[#334155] shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">{t.affiliateLeaders}</h3>
        <div className="space-y-3">
          {affiliateLeaders.map((top) => (
            <div key={top.pos} className="flex justify-between items-center bg-gray-50 dark:bg-[#334155] p-3 rounded-xl border border-gray-100 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <span className="font-extrabold text-[#FF6B00] text-xs">{top.pos}</span>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-xs">{top.name}</p>
                  <span className="text-[10px] text-gray-400 dark:text-gray-400">{top.referrals}</span>
                </div>
              </div>
              <span className="text-xs font-extrabold text-green-600 dark:text-green-400">
                {typeof top.commissionAmount === 'number' ? formatMoney(top.commissionAmount) : top.commission}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
