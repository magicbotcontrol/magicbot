import { Icons } from '../../constants/icons';

export function SettingsTab({ config, setConfig, showToast, playAlertSound, t, currency, setCurrency, currencyOptions, fxLoading, fxStatusLabel }) {
  const fxLabel = fxStatusLabel || (fxLoading ? t.fxUpdating : t.fxUnavailable);

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-gray-200 dark:border-[#334155] p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-blue-600 border-b pb-2">Geral</h3>

          <div className="grid grid-cols-2 gap-4 text-gray-700 dark:text-gray-300">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Corretora *</label>
              <select value={config.broker} onChange={(e) => setConfig({ ...config, broker: e.target.value })} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-xs bg-gray-50 dark:bg-[#334155] dark:text-white focus:ring-1 focus:ring-[#FF6B00] focus:outline-none">
                <option value="IQ Option">IQ Option</option>
                <option value="Quotex">Quotex</option>
                <option value="Pocket Option">Pocket Option</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tipo de Conta *</label>
              <select value={config.accountType} onChange={(e) => setConfig({ ...config, accountType: e.target.value })} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-xs bg-gray-50 dark:bg-[#334155] dark:text-white focus:ring-1 focus:ring-[#FF6B00] focus:outline-none">
                <option value="Demo">Treinamento / Demo</option>
                <option value="Real">Conta Real</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tipo de Entrada *</label>
              <select value={config.entryType} onChange={(e) => setConfig({ ...config, entryType: e.target.value })} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-xs bg-gray-50 dark:bg-[#334155] dark:text-white focus:ring-1 focus:ring-[#FF6B00] focus:outline-none">
                <option value="Value">Valor Fixo</option>
                <option value="Percentage">Percentual Banca</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Valor da Entrada *</label>
              <input type="text" value={config.entryValue} onChange={(e) => setConfig({ ...config, entryValue: e.target.value })} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-xs bg-gray-50 dark:bg-[#334155] dark:text-white focus:ring-1 focus:ring-[#FF6B00] focus:outline-none" />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Moeda *</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-xs bg-gray-50 dark:bg-[#334155] dark:text-white focus:ring-1 focus:ring-[#FF6B00] focus:outline-none">
                {currencyOptions.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
              <div className="mt-1 text-[10px] text-gray-400">{fxLabel}</div>
              <a className="mt-1 inline-block text-[10px] text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 underline underline-offset-2" href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">
                Rates by ExchangeRate-API
              </a>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Opção de Payout *</label>
              <select value={config.payoutOption} onChange={(e) => setConfig({ ...config, payoutOption: e.target.value })} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-xs bg-gray-50 dark:bg-[#334155] dark:text-white">
                <option value="Highest Payout">Maior Payout</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Payout Mínimo * (%)</label>
              <input type="text" value={config.minimumPayout} onChange={(e) => setConfig({ ...config, minimumPayout: e.target.value })} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-xs bg-gray-50 dark:bg-[#334155] dark:text-white focus:ring-1 focus:ring-[#FF6B00] focus:outline-none" />
            </div>

            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Modo de Delay *</label>
              <select value={config.delayMode} onChange={(e) => setConfig({ ...config, delayMode: e.target.value })} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-xs bg-gray-50 dark:bg-[#334155] dark:text-white">
                <option value="Automatic">Automático (Otimizado)</option>
                <option value="Manual">Manual</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-gray-200 dark:border-[#334155] p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-blue-600 border-b pb-2">Gestao</h3>

          <div className="space-y-4">
            <div className="border border-gray-100 dark:border-gray-700 p-3 rounded-xl bg-gray-50/50 dark:bg-[#334155] space-y-3">
              <label className="flex items-center space-x-2 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
                <input type="checkbox" checked={config.martingaleActive} onChange={(e) => setConfig({ ...config, martingaleActive: e.target.checked })} className="rounded text-[#FF6B00]" />
                <span>Martingale <Icons.Info /></span>
              </label>
              {config.martingaleActive && (
                <div className="grid grid-cols-2 gap-2 pl-6">
                  <div>
                    <label className="text-[10px] text-gray-400">Multiplicador *</label>
                    <input type="text" value={config.martingaleMultiplier} onChange={(e) => setConfig({ ...config, martingaleMultiplier: e.target.value })} className="w-full border border-gray-200 dark:border-gray-700 rounded p-1.5 text-xs bg-white dark:bg-[#1E293B] dark:text-white" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400">Níveis *</label>
                    <input type="text" value={config.martingaleLevels} onChange={(e) => setConfig({ ...config, martingaleLevels: e.target.value })} className="w-full border border-gray-200 dark:border-gray-700 rounded p-1.5 text-xs bg-white dark:bg-[#1E293B] dark:text-white" />
                  </div>
                </div>
              )}
            </div>

            <div className="border border-gray-100 dark:border-gray-700 p-3 rounded-xl bg-gray-50/50 dark:bg-[#334155] space-y-3">
              <label className="flex items-center space-x-2 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
                <input type="checkbox" checked={config.sorosActive} onChange={(e) => setConfig({ ...config, sorosActive: e.target.checked })} className="rounded text-[#FF6B00]" />
                <span>Soros <Icons.Info /></span>
              </label>
              {config.sorosActive && (
                <div className="grid grid-cols-2 gap-2 pl-6">
                  <div>
                    <label className="text-[10px] text-gray-400">Porcentagem * (%)</label>
                    <input type="text" value={config.sorosPercentage} onChange={(e) => setConfig({ ...config, sorosPercentage: e.target.value })} className="w-full border border-gray-200 dark:border-gray-700 rounded p-1.5 text-xs bg-white dark:bg-[#1E293B] dark:text-white" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400">Níveis *</label>
                    <input type="text" value={config.sorosLevels} onChange={(e) => setConfig({ ...config, sorosLevels: e.target.value })} className="w-full border border-gray-200 dark:border-gray-700 rounded p-1.5 text-xs bg-white dark:bg-[#1E293B] dark:text-white" />
                  </div>
                </div>
              )}
            </div>

            <div className="border border-gray-100 dark:border-gray-700 p-3 rounded-xl bg-gray-50/50 dark:bg-[#334155] flex justify-between items-center">
              <label className="flex items-center space-x-2 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
                <input type="checkbox" checked={config.recoveryLossActive} onChange={(e) => setConfig({ ...config, recoveryLossActive: e.target.checked })} className="rounded text-[#FF6B00]" />
                <span>Recuperação de Loss <Icons.Info /></span>
              </label>
              {config.recoveryLossActive && (
                <input type="text" value={config.recoveryPercentage} onChange={(e) => setConfig({ ...config, recoveryPercentage: e.target.value })} placeholder="%" className="w-16 border border-gray-200 dark:border-gray-700 rounded p-1 text-xs bg-white dark:bg-[#1E293B] dark:text-white text-center" />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pl-1 text-xs font-semibold text-gray-600 dark:text-gray-400">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={config.reverseDirection} onChange={(e) => setConfig({ ...config, reverseDirection: e.target.checked })} className="rounded text-[#FF6B00]" />
                <span>Inversão de Direção <Icons.Info /></span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={config.noDelayMartingale} onChange={(e) => setConfig({ ...config, noDelayMartingale: e.target.checked })} className="rounded text-[#FF6B00]" />
                <span>Sem atraso no Gale <Icons.Info /></span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={config.simultaneousSignals} onChange={(e) => setConfig({ ...config, simultaneousSignals: e.target.checked })} className="rounded text-[#FF6B00]" />
                <span>Sinais simultâneos <Icons.Info /></span>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-gray-200 dark:border-[#334155] p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-blue-600 border-b pb-2">Stop WIN e LOSS</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Modo *</label>
              <select value={config.stopMode} onChange={(e) => setConfig({ ...config, stopMode: e.target.value })} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-xs bg-gray-50 dark:bg-[#334155] dark:text-white">
                <option value="Value">{`Valor (${currency})`}</option>
                <option value="Percentage">Porcentagem (%)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Stop WIN *</label>
              <input type="text" value={config.stopWin} onChange={(e) => setConfig({ ...config, stopWin: e.target.value })} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-xs bg-gray-50 dark:bg-[#334155] dark:text-white" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Stop LOSS *</label>
              <input type="text" value={config.stopLoss} onChange={(e) => setConfig({ ...config, stopLoss: e.target.value })} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-xs bg-gray-50 dark:bg-[#334155] dark:text-white" />
            </div>
            <div className="col-span-2 space-y-2 pt-2">
              <label className="flex items-center space-x-2 text-xs font-semibold text-gray-600 dark:text-gray-400 cursor-pointer">
                <input type="checkbox" checked={config.trailingStop} onChange={(e) => setConfig({ ...config, trailingStop: e.target.checked })} className="rounded text-[#FF6B00]" />
                <span>Trailing Stop <Icons.Info /></span>
              </label>
              <label className="flex items-center space-x-2 text-xs font-semibold text-gray-600 dark:text-gray-400 cursor-pointer">
                <input type="checkbox" checked={config.preStopLoss} onChange={(e) => setConfig({ ...config, preStopLoss: e.target.checked })} className="rounded text-[#FF6B00]" />
                <span>Pre Stop LOSS <Icons.Info /></span>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-gray-200 dark:border-[#334155] p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-blue-600 border-b pb-2">Filtros de Proteção</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-gray-600 dark:text-gray-400">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" checked={config.trendAnalysis} onChange={(e) => setConfig({ ...config, trendAnalysis: e.target.checked })} className="rounded text-[#FF6B00]" />
              <span>Análise de Tendência <Icons.Info /></span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" checked={config.investingAnalysis} onChange={(e) => setConfig({ ...config, investingAnalysis: e.target.checked })} className="rounded text-[#FF6B00]" />
              <span>Investing Analysis <Icons.Info /></span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" checked={config.newsFilter} onChange={(e) => setConfig({ ...config, newsFilter: e.target.checked })} className="rounded text-[#FF6B00]" />
              <span>Filtro de Notícias <Icons.Info /></span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" checked={config.aiFilter} onChange={(e) => setConfig({ ...config, aiFilter: e.target.checked })} className="rounded text-[#FF6B00]" />
              <span>Filtro Inteligente AI <Icons.Info /></span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" checked={config.traderTimerZone} onChange={(e) => setConfig({ ...config, traderTimerZone: e.target.checked })} className="rounded text-[#FF6B00]" />
              <span>Trader Timer Zone <Icons.Info /></span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" checked={config.candleHit} onChange={(e) => setConfig({ ...config, candleHit: e.target.checked })} className="rounded text-[#FF6B00]" />
              <span>Toque na Vela <Icons.Info /></span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button onClick={() => { playAlertSound(880, 0.2); showToast('Configurações aplicadas globalmente!'); }} className="px-6 py-3 bg-[#FF6B00] text-white font-bold text-xs rounded-xl shadow transition-all flex items-center">
          <Icons.Save /> Salvar Configurações
        </button>
      </div>
    </div>
  );
}
