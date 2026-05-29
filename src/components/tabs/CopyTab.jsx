import { copyTradingRanking } from '../../constants/mockData';

export function CopyTab({ showToast, t, formatMoney }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-base font-bold text-gray-900 dark:text-white">{t.copyRanking}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {copyTradingRanking.map((trader, i) => (
          <div key={i} className="bg-white dark:bg-[#1E293B] rounded-2xl border border-gray-200 dark:border-[#334155] p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-[#FF6B00] bg-orange-50 dark:bg-orange-950/20 px-2.5 py-1 rounded">{trader.rank}</span>
              <span className="text-xs text-gray-400 dark:text-gray-400">850 {t.copying}</span>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 dark:text-white text-sm">{trader.name}</h3>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs border-t dark:border-gray-700 pt-3">
                <div>
                  <p className="text-gray-400">Win Rate</p>
                  <p className="font-bold text-green-600">{trader.win}</p>
                </div>
                <div>
                  <p className="text-gray-400">{t.weeklyProfit}</p>
                  <p className="font-bold text-gray-800 dark:text-slate-200">
                    {typeof trader.profitAmount === 'number' ? formatMoney(trader.profitAmount) : trader.profit}
                  </p>
                </div>
              </div>
            </div>
            <button onClick={() => showToast(t.copyEnabled.replace('{name}', trader.name))} className="w-full py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800">{t.copyOperations}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
