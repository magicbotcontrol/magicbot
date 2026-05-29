import { Icons } from '../../constants/icons';
import { dashboardStats } from '../../constants/mockData';

export function DashboardTab({ remainingDays, expirationDate, t, setActiveTab, formatMoney }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-gray-200 dark:border-[#334155] shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t.diasRestantes}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t.apiAccess}</p>
          </div>
          <span className="text-xs font-bold text-[#FF6B00] bg-[#FF6B00]/10 px-3 py-1 rounded-full mt-2 sm:mt-0">{t.daysLeft.replace('{days}', remainingDays)}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="bg-gray-50 dark:bg-[#334155] border border-gray-200 dark:border-[#475569] rounded-xl p-4 flex items-center space-x-4">
            <div className="p-3 bg-white dark:bg-[#1E293B] rounded-lg border border-gray-100 dark:border-[#475569] text-[#FF6B00]">
              <Icons.ShoppingBag />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">{t.licenceCredit}</p>
              <p className="text-lg font-extrabold text-gray-900 dark:text-white">{t.availableDays.replace('{days}', remainingDays)}</p>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-[#334155] border border-gray-200 dark:border-[#475569] rounded-xl p-4 flex items-center space-x-4">
            <div className="p-3 bg-white dark:bg-[#1E293B] rounded-lg border border-gray-100 dark:border-[#475569] text-gray-700 dark:text-gray-300">
              <Icons.Activity />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">{t.expiraEm}</p>
              <p className="text-lg font-extrabold text-gray-900 dark:text-white">{expirationDate}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardStats.map((stat) => {
          const StatIcon = Icons[stat.icon];
          return (
            <div key={stat.title} className="bg-white dark:bg-[#1E293B] rounded-xl p-4 border border-gray-200 dark:border-[#334155] shadow-sm flex items-center space-x-3">
              <div className={`p-2.5 rounded-lg ${stat.bg} ${stat.color}`}>
                {StatIcon ? <StatIcon /> : null}
              </div>
              <div>
                <p className="text-[10px] md:text-xs font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wide">{stat.title}</p>
                <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-white">
                  {typeof stat.valueAmount === 'number' ? formatMoney(stat.valueAmount) : stat.value}
                </h3>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-gray-200 dark:border-[#334155] shadow-sm">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">{t.weeklyPerformance}</h3>
          <div className="relative h-48 w-full">
            <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
              <line x1="0" y1="30" x2="500" y2="30" stroke="#F1F3F5" strokeWidth="1" />
              <line x1="0" y1="75" x2="500" y2="75" stroke="#F1F3F5" strokeWidth="1" />
              <line x1="0" y1="120" x2="500" y2="120" stroke="#F1F3F5" strokeWidth="1" />
              <path d="M 0 130 Q 80 90 160 100 T 320 50 T 500 20 L 500 150 L 0 150 Z" fill="#FF6B00" fillOpacity="0.08" />
              <path d="M 0 130 Q 80 90 160 100 T 320 50 T 500 20" fill="none" stroke="#FF6B00" strokeWidth="3" />
              <circle cx="160" cy="100" r="4" fill="#FF6B00" />
              <circle cx="320" cy="50" r="4" fill="#FF6B00" />
            </svg>
            <div className="flex justify-between mt-2 text-[10px] text-gray-400 font-semibold">
              <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-gray-200 dark:border-[#334155] shadow-sm">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 font-mono uppercase tracking-wide">{t.recentLogs}</h3>
          <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-1">
            <div className="text-xs border-b border-gray-50 dark:border-[#334155] pb-2">
              <span className="text-gray-400 font-mono">[16:20]</span> <span className="text-green-600 font-bold">WIN</span> EURUSD M5 via IA.
            </div>
            <div className="text-xs border-b border-gray-50 dark:border-[#334155] pb-2">
              <span className="text-gray-400 font-mono">[16:15]</span> <span className="text-green-600 font-bold">WIN</span> GBPUSD M1.
            </div>
            <div className="text-xs border-b border-gray-50 dark:border-[#334155] pb-2">
              <span className="text-gray-400 font-mono">[16:00]</span> <span className="text-red-500 font-bold">LOSS</span> USDJPY M15.
            </div>
          </div>
        </div>
      </div>

      {remainingDays <= 0 && (
        <div className="mb-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0 animate-fade-in-down">
          <div className="flex items-center space-x-3">
            <Icons.XCircle />
            <div>
              <p className="font-semibold text-red-800 dark:text-red-200 text-sm">{t.avisoExpirado}</p>
              <p className="text-xs text-red-600 dark:text-red-400">{t.avisoExpiradoSub}</p>
            </div>
          </div>
          <button onClick={() => setActiveTab('shop')} className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm">
            {t.comprar}
          </button>
        </div>
      )}
    </div>
  );
}
