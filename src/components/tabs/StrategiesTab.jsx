import { Icons } from '../../constants/icons';

export function StrategiesTab({
  newStratName,
  setNewStratName,
  newStratTf,
  setNewStratTf,
  selectedIndicators,
  handleCheckboxIndicator,
  handleCreateStrategy,
  strategiesList,
  removeStrategy,
  t
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
      <div className="lg:col-span-4 bg-white dark:bg-[#1E293B] rounded-2xl border border-gray-200 dark:border-[#334155] p-6 shadow-sm">
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">{t.newStrategy}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{t.name}</label>
            <input type="text" value={newStratName} onChange={(e) => setNewStratName(e.target.value)} placeholder="Ex: RSI + MACD" className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-[#FF6B00] bg-gray-50 dark:bg-[#334155] dark:text-white focus:outline-none" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{t.timeframe}</label>
            <select value={newStratTf} onChange={(e) => setNewStratTf(e.target.value)} className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-xs bg-gray-50 dark:bg-[#334155] dark:text-white">
              <option>M1 (1 Minuto)</option>
              <option>M5 (5 Minutos)</option>
              <option>M15 (15 Minutos)</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{t.indicators}</label>
            <div className="grid grid-cols-2 gap-2">
              {['RSI', 'MACD', 'Bollinger', 'Médias Móveis'].map((ind) => (
                <label key={ind} onClick={() => handleCheckboxIndicator(ind)} className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-[#334155] p-2 rounded-lg border border-gray-100 dark:border-gray-600 cursor-pointer">
                  <input type="checkbox" checked={selectedIndicators.includes(ind)} readOnly className="rounded text-[#FF6B00]" />
                  <span>{ind}</span>
                </label>
              ))}
            </div>
          </div>
          <button onClick={handleCreateStrategy} className="w-full py-2.5 bg-[#111111] dark:bg-[#FF6B00] text-white font-bold text-xs rounded-xl hover:bg-opacity-90 transition-all">{t.createActivate}</button>
        </div>
      </div>

      <div className="lg:col-span-8 space-y-4">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">{t.activeStrategies}</h2>
        {strategiesList.map((strategy, i) => (
          <div key={i} className="bg-white dark:bg-[#1E293B] rounded-2xl border border-gray-200 dark:border-[#334155] p-4 flex justify-between items-center shadow-sm">
            <div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">{strategy.name}</h3>
              <p className="text-xs text-gray-400">{strategy.tf} • {strategy.indicators.join(' + ')}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-[10px] text-gray-400 font-bold uppercase">WINRATE</p>
                <p className="text-sm font-bold text-[#FF6B00]">{strategy.winrate}</p>
              </div>
              <button onClick={() => removeStrategy(i)} className="p-2 bg-red-50 dark:bg-red-950/20 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900">
                <Icons.Trash />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
