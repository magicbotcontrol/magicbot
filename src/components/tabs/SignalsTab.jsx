import { colors } from '../../constants/colors';
import { Icons } from '../../constants/icons';
import { ScrollableTableShell } from '../ScrollableTableShell';

export function SignalsTab({
  t,
  botStatus,
  handleStartBot,
  canStartBot,
  canEditSignals,
  signalsText,
  setSignalsText,
  isSignalsReadOnly,
  selectedDate,
  setSelectedDate,
  fileInputRef,
  handleFileUpload,
  handleSaveSignals,
  handleClearSignals,
  handleExport,
  parsedSignals,
  validCount,
  isSignalsLoading,
  isSignalsSaving,
  handleOpenInBroker
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl shadow-sm border border-gray-200 dark:border-[#334155] p-6 relative overflow-hidden">
          {botStatus === 'running' && <div className="absolute inset-0 bg-[#FF6B00]/5 animate-pulse rounded-2xl" />}
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3 flex items-center">
            <Icons.Signals /> <span className="ml-2">{t.statusAuto}</span>
          </h2>
          <button
            onClick={handleStartBot}
            disabled={!canStartBot}
            className={`w-full py-4 rounded-xl font-bold text-white uppercase tracking-wider flex items-center justify-center space-x-2 transition-all transform hover:scale-[1.01] ${
              botStatus === 'running'
                ? 'bg-red-500 hover:bg-red-600 shadow-lg'
                : 'bg-[#FF6B00] hover:bg-[#FF7F1F] shadow-lg shadow-[#FF6B00]/20'
            } disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100`}
            style={botStatus !== 'running' ? { backgroundColor: colors.primary } : {}}
          >
            {botStatus === 'running' ? <Icons.Stop /> : <Icons.Play />}
            <span>{botStatus === 'running' ? t.stopBot : t.startBot}</span>
          </button>
          <div className="mt-4 flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{t.state}:</span>
            <span className={`font-bold ${botStatus === 'running' ? 'text-green-500 animate-pulse' : 'text-gray-400'}`}>
              {botStatus === 'running' ? t.runningStatus : t.offlineStatus}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] rounded-2xl shadow-sm border border-gray-200 dark:border-[#334155] p-6 flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">{t.editorIntel}</h2>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs border border-gray-200 dark:border-[#334155] dark:bg-[#1E293B] rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
            />
          </div>
          <textarea
            value={signalsText}
            onChange={(e) => {
              if (isSignalsReadOnly || !canEditSignals) return;
              setSignalsText(e.target.value);
            }}
            className="flex-1 w-full bg-gray-50 dark:bg-[#334155] border border-gray-200 dark:border-[#475569] rounded-xl p-3 font-mono text-xs text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] resize-none custom-scrollbar"
            placeholder="M5;EURUSD;14:00;CALL"
            readOnly={Boolean(isSignalsReadOnly) || !canEditSignals}
          />
          <div className="flex space-x-3 mt-4">
            <button onClick={handleSaveSignals} disabled={isSignalsSaving || Boolean(isSignalsReadOnly) || !canEditSignals} className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-60 text-gray-800 dark:text-white font-medium py-2 rounded-lg text-xs flex items-center justify-center transition-colors">
              <Icons.Save /> {t.save}
            </button>
            <button onClick={handleClearSignals} disabled={Boolean(isSignalsReadOnly) || !canEditSignals} className="flex-1 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 disabled:opacity-60 text-red-600 dark:text-red-400 font-medium py-2 rounded-lg text-xs flex items-center justify-center transition-colors">
              <Icons.Trash /> {t.clear}
            </button>
          </div>
        </div>
      </div>

      <div className="lg:col-span-8">
        <div className="bg-white dark:bg-[#0B1220] rounded-2xl border border-gray-200 dark:border-[#1F2A3A] shadow-sm dark:shadow-[0_18px_50px_rgba(3,7,18,0.45)] p-4 md:p-6 h-full min-h-[480px] flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-3 sm:space-y-0">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-[#F8FAFC]">{t.signalsProc}</h2>
              <p className="text-xs text-gray-500 dark:text-[#94A3B8]">
                {t.total}: <span className="font-semibold text-gray-700 dark:text-[#E2E8F0]">{parsedSignals.length}</span> |
                {t.valid}: <span className="font-semibold text-green-600">{validCount}</span> |
                {t.errors}: <span className="font-semibold text-red-500">{parsedSignals.length - validCount}</span>
              </p>
            </div>
            <div className="flex space-x-2">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".txt,.csv" className="hidden" />
              <button disabled={Boolean(isSignalsReadOnly) || !canEditSignals} onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-[#CBD5E1] bg-gray-50 dark:bg-[#111827] border border-gray-200 dark:border-[#1F2A3A] rounded-lg hover:bg-gray-100 dark:hover:bg-[#162033] transition-colors disabled:cursor-not-allowed disabled:opacity-40">{t.import}</button>
              <button onClick={handleExport} className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg hover:bg-opacity-90 transition-colors" style={{ backgroundColor: colors.primary }}>{t.export}</button>
            </div>
          </div>

          <ScrollableTableShell minWidthClass="min-w-[760px]" hintLabel={t.swipeHint || 'Swipe'}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="sticky top-0 bg-gray-50 dark:bg-[#111827] text-[10px] font-bold uppercase text-gray-400 dark:text-[#94A3B8]">
                  <th className="px-3 py-3 whitespace-nowrap">{t.status}</th>
                  <th className="px-3 py-3 whitespace-nowrap">TF</th>
                  <th className="px-3 py-3 whitespace-nowrap">{t.asset}</th>
                  <th className="px-3 py-3 whitespace-nowrap">{t.timeRate}</th>
                  <th className="px-3 py-3 whitespace-nowrap">{t.action}</th>
                  <th className="px-3 py-3 whitespace-nowrap">{t.open || 'Abrir'}</th>
                  <th className="px-3 py-3 whitespace-nowrap">{t.information}</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-gray-50 dark:divide-[#1F2A3A]">
                {parsedSignals.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-gray-400 dark:text-[#64748B]">
                      {isSignalsLoading ? t.loadingSignals : isSignalsReadOnly && !canEditSignals ? (t.waitingDailyList || 'Aguardando lista diária publicada pelo admin.') : t.noSignalsFound}
                    </td>
                  </tr>
                ) : (
                  parsedSignals.map((sig, i) => (
                    <tr key={i} className="transition-colors hover:bg-gray-50/50 dark:hover:bg-[#101826]">
                      <td className="px-3 py-3 whitespace-nowrap">{sig.isValid ? <Icons.CheckCircle /> : <Icons.XCircle />}</td>
                      <td className="px-3 py-3 font-mono text-gray-600 dark:text-[#CBD5E1] whitespace-nowrap">{sig.timeframe}</td>
                      <td className="px-3 py-3 font-bold text-gray-800 dark:text-[#F8FAFC] whitespace-nowrap">{sig.asset}</td>
                      <td className="px-3 py-3 font-mono text-gray-600 dark:text-[#94A3B8] whitespace-nowrap">{sig.timeOrRate}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`inline-flex min-w-[58px] justify-center rounded px-2 py-1 font-bold ${sig.action === 'CALL' ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'}`}>{sig.action}</span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <button
                          type="button"
                          disabled={!sig.isValid || !handleOpenInBroker}
                          onClick={() => handleOpenInBroker?.(sig)}
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#1F2A3A] dark:bg-[#0B1220] dark:text-[#CBD5E1] dark:hover:bg-[#111827]"
                        >
                          <Icons.Link />
                          {t.open || 'Abrir'}
                        </button>
                      </td>
                      <td className="min-w-[220px] px-3 py-3 text-[10px] text-gray-500 dark:text-[#94A3B8]">{sig.isValid ? t.readyToTrade : sig.error}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </ScrollableTableShell>
        </div>
      </div>
    </div>
  );
}
