import { useEffect, useState } from 'react';
import { colors } from '../../constants/colors';
import { Icons } from '../../constants/icons';
import { ScrollableTableShell } from '../ScrollableTableShell';

export function SignalsTab({
  t,
  botStatus,
  botSlot,
  setBotSlot,
  isBotInstancesLoading,
  botToleranceSeconds,
  setBotToleranceSeconds,
  isBotToleranceSaving,
  botQueueSummary,
  botRecentEvents,
  isBotQueueLoading,
  botDayJobs,
  isBotDayJobsLoading,
  isBotActionLoading,
  handleRequeueFailedJobs,
  handleClearExpiredJobs,
  handleStartBot,
  canStartBot,
  canEditSignals,
  canUsePublished,
  sourceMode,
  setSourceMode,
  selectedMarket,
  setSelectedMarket,
  availableFeeds,
  selectedAsset,
  setSelectedAsset,
  copyPublishedListToWorkspace,
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
  ignoredCount,
  isExclusionsSaving,
  toggleSignalIgnored,
  isSignalsLoading,
  isSignalsSaving,
  handleOpenInBroker
}) {
  const [assetInput, setAssetInput] = useState(selectedAsset || '');
  const [dayJobsFilter, setDayJobsFilter] = useState('pending');
  const [retryMinMinutesLeft, setRetryMinMinutesLeft] = useState(1);
  const isLocked = botStatus === 'running';
  const invalidCount = parsedSignals.filter((signal) => !signal.isValid).length;

  const formatEventTime = (iso) => {
    try {
      return new Date(iso).toLocaleTimeString();
    } catch {
      return '';
    }
  };

  const formatJobTime = (iso) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const renderStatus = (status) => {
    const value = String(status || '');
    if (value === 'queued') return { label: t.queuedLabel || 'Queued', cls: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200' };
    if (value === 'executing') return { label: t.executingLabel || 'Exec', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200' };
    if (value === 'executed') return { label: t.executedLabel || 'OK', cls: 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-200' };
    if (value === 'failed') return { label: t.failedLabel || 'Fail', cls: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-200' };
    if (value === 'expired') return { label: t.expiredLabel || 'Expired', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200' };
    if (value === 'cancelled') return { label: t.cancelledLabel || 'Cancelled', cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' };
    return { label: value || '-', cls: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200' };
  };

  const filteredDayJobs = (() => {
    const jobs = botDayJobs || [];
    if (dayJobsFilter === 'failed') return jobs.filter((j) => j.status === 'failed');
    if (dayJobsFilter === 'executed') return jobs.filter((j) => j.status === 'executed');
    if (dayJobsFilter === 'pending') return jobs.filter((j) => j.status === 'queued' || j.status === 'executing');
    return jobs;
  })();

  useEffect(() => {
    setAssetInput(selectedAsset || '');
  }, [selectedAsset]);

  const applyAssetInput = () => {
    const normalized = String(assetInput || '').trim().toUpperCase();
    setSelectedAsset(normalized);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl shadow-sm border border-gray-200 dark:border-[#334155] p-6 relative overflow-hidden">
          {botStatus === 'running' && <div className="absolute inset-0 bg-[#FF6B00]/5 animate-pulse rounded-2xl" />}
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3 flex items-center">
            <Icons.Signals /> <span className="ml-2">{t.statusAuto}</span>
          </h2>
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
              {t.botSlotLabel || 'Bot'}
            </span>
            <div className="flex items-center gap-2">
              <select
                value={botSlot}
                disabled={isLocked || isBotInstancesLoading}
                onChange={(e) => setBotSlot?.(Number(e.target.value))}
                className="text-xs border border-gray-200 dark:border-[#334155] dark:bg-[#1E293B] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] disabled:opacity-60"
              >
                <option value={1}>{t.botSlot1 || 'Bot 1'}</option>
                <option value={2}>{t.botSlot2 || 'Bot 2'}</option>
              </select>
              <select
                value={Number(botToleranceSeconds || 0)}
                disabled={isLocked || isBotInstancesLoading || isBotToleranceSaving || !setBotToleranceSeconds}
                onChange={(e) => setBotToleranceSeconds?.(Number(e.target.value))}
                className="text-xs border border-gray-200 dark:border-[#334155] dark:bg-[#1E293B] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] disabled:opacity-60"
                title={t.toleranceLabel || 'Tolerância'}
              >
                {[2, 5, 10].map((s) => (
                  <option key={s} value={s}>
                    {s}s
                  </option>
                ))}
              </select>
            </div>
          </div>
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
          <div className="mt-4 rounded-xl border border-gray-200 dark:border-[#334155] bg-gray-50/70 dark:bg-[#0B1220] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                {t.queueTitle || 'Fila'}
              </span>
              <span className="text-[10px] text-gray-400">
                {isBotQueueLoading ? (t.loading || '...') : ''}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
              <div className="rounded-lg bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1F2A3A] px-2 py-1">
                <div className="text-gray-400">{t.queuedLabel || 'Queued'}</div>
                <div className="font-bold text-gray-700 dark:text-[#E2E8F0]">{botQueueSummary?.queued ?? '-'}</div>
              </div>
              <div className="rounded-lg bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1F2A3A] px-2 py-1">
                <div className="text-gray-400">{t.executingLabel || 'Exec'}</div>
                <div className="font-bold text-blue-600">{botQueueSummary?.executing ?? '-'}</div>
              </div>
              <div className="rounded-lg bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1F2A3A] px-2 py-1">
                <div className="text-gray-400">{t.executedLabel || 'OK'}</div>
                <div className="font-bold text-green-600">{botQueueSummary?.executed ?? '-'}</div>
              </div>
              <div className="rounded-lg bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1F2A3A] px-2 py-1">
                <div className="text-gray-400">{t.failedLabel || 'Fail'}</div>
                <div className="font-bold text-red-600">{botQueueSummary?.failed ?? '-'}</div>
              </div>
              <div className="rounded-lg bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1F2A3A] px-2 py-1">
                <div className="text-gray-400">{t.expiredLabel || 'Expired'}</div>
                <div className="font-bold text-amber-600">{botQueueSummary?.expired ?? '-'}</div>
              </div>
              <div className="rounded-lg bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1F2A3A] px-2 py-1">
                <div className="text-gray-400">{t.cancelledLabel || 'Cancel'}</div>
                <div className="font-bold text-gray-600 dark:text-[#CBD5E1]">{botQueueSummary?.cancelled ?? '-'}</div>
              </div>
            </div>
            {botRecentEvents?.length ? (
              <div className="mt-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                  {t.recentEventsLabel || 'Eventos'}
                </div>
                <div className="mt-2 space-y-1">
                  {botRecentEvents.slice(0, 6).map((evt) => (
                    <div
                      key={evt.id}
                      className="flex items-start justify-between gap-3 rounded-lg bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1F2A3A] px-2 py-1"
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-gray-700 dark:text-[#E2E8F0] truncate">
                          {evt.event_type}
                        </div>
                        {evt.payload?.error ? (
                          <div className="text-[10px] text-red-600 truncate">{String(evt.payload.error)}</div>
                        ) : null}
                      </div>
                      <div className="text-[10px] text-gray-400 whitespace-nowrap">
                        {formatEventTime(evt.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-4 rounded-xl border border-gray-200 dark:border-[#334155] bg-white dark:bg-[#0B1220] p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                {t.dayJobsTitle || 'Jobs do dia'}
              </span>
              <span className="text-[10px] text-gray-400">
                {isBotDayJobsLoading ? (t.loading || '...') : ''}
              </span>
            </div>

            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setDayJobsFilter('pending')}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-bold transition-colors ${
                  dayJobsFilter === 'pending'
                    ? 'border-[#FF6B00] bg-[#FF6B00]/10 text-[#FF6B00]'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-[#1F2A3A] dark:bg-[#111827] dark:text-[#CBD5E1] dark:hover:bg-[#162033]'
                }`}
              >
                {t.jobsFilterPending || 'Pendentes'}
              </button>
              <button
                type="button"
                onClick={() => setDayJobsFilter('failed')}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-bold transition-colors ${
                  dayJobsFilter === 'failed'
                    ? 'border-[#FF6B00] bg-[#FF6B00]/10 text-[#FF6B00]'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-[#1F2A3A] dark:bg-[#111827] dark:text-[#CBD5E1] dark:hover:bg-[#162033]'
                }`}
              >
                {t.jobsFilterFailed || 'Falhos'}
              </button>
              <button
                type="button"
                onClick={() => setDayJobsFilter('executed')}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-bold transition-colors ${
                  dayJobsFilter === 'executed'
                    ? 'border-[#FF6B00] bg-[#FF6B00]/10 text-[#FF6B00]'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-[#1F2A3A] dark:bg-[#111827] dark:text-[#CBD5E1] dark:hover:bg-[#162033]'
                }`}
              >
                {t.jobsFilterExecuted || 'Executados'}
              </button>
            </div>

            <div className="mt-2 flex gap-2">
              <select
                value={retryMinMinutesLeft}
                onChange={(e) => setRetryMinMinutesLeft(Number(e.target.value))}
                disabled={isBotActionLoading}
                className="w-[96px] rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-[11px] font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-60 dark:border-[#1F2A3A] dark:bg-[#111827] dark:text-[#CBD5E1] dark:hover:bg-[#162033]"
              >
                {[0, 1, 2, 3].map((m) => (
                  <option key={m} value={m}>
                    {m}m
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={isBotActionLoading || !handleRequeueFailedJobs}
                onClick={() => {
                  const message = (t.confirmRequeueFailedWithMin || 'Reenfileirar falhos com pelo menos {min} min restantes até expirar?')
                    .replace('{min}', String(retryMinMinutesLeft));
                  if (!window.confirm(message)) return;
                  handleRequeueFailedJobs?.(retryMinMinutesLeft);
                }}
                className="flex-1 rounded-lg bg-gray-100 dark:bg-[#111827] border border-gray-200 dark:border-[#1F2A3A] px-3 py-2 text-[11px] font-bold text-gray-800 dark:text-[#E2E8F0] hover:bg-gray-200 dark:hover:bg-[#162033] disabled:opacity-60"
              >
                {t.requeueFailedWithMinAction || 'Reenfileirar falhos (X min)'}
              </button>
              <button
                type="button"
                disabled={isBotActionLoading || !handleClearExpiredJobs}
                onClick={() => handleClearExpiredJobs?.()}
                className="flex-1 rounded-lg bg-gray-100 dark:bg-[#111827] border border-gray-200 dark:border-[#1F2A3A] px-3 py-2 text-[11px] font-bold text-gray-800 dark:text-[#E2E8F0] hover:bg-gray-200 dark:hover:bg-[#162033] disabled:opacity-60"
              >
                {t.clearExpiredAction || 'Limpar expirados'}
              </button>
            </div>

            <div className="mt-3 max-h-[220px] overflow-auto custom-scrollbar">
              {filteredDayJobs?.length ? (
                <div className="space-y-1">
                  {filteredDayJobs.slice(0, 40).map((job) => {
                    const status = renderStatus(job.status);
                    return (
                      <div
                        key={job.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-[#1F2A3A] bg-white dark:bg-[#111827] px-2 py-1"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-[11px] font-bold text-gray-800 dark:text-[#F8FAFC]">
                              {formatJobTime(job.scheduled_at)}
                            </div>
                            <span className={`inline-flex rounded px-2 py-0.5 text-[10px] font-bold ${status.cls}`}>
                              {status.label}
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-500 dark:text-[#94A3B8] truncate">
                            {job.asset} {job.timeframe} {job.time_text} {job.action}
                          </div>
                          {job.last_error ? (
                            <div className="text-[10px] text-red-600 truncate">{job.last_error}</div>
                          ) : null}
                        </div>
                        <div className="text-[10px] text-gray-400 whitespace-nowrap">
                          #{job.attempts || 0}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-gray-400 dark:text-[#64748B]">
                  {t.noDayJobs || 'Nenhum job para este filtro.'}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] rounded-2xl shadow-sm border border-gray-200 dark:border-[#334155] p-6 flex flex-col h-[400px]">
          <div className="mb-4">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">{t.editorIntel}</h2>
              <input
                type="date"
                value={selectedDate}
                disabled={isLocked}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs border border-gray-200 dark:border-[#334155] dark:bg-[#1E293B] rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] disabled:opacity-60"
              />
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                  {t.sourceLabel || 'Fonte'}
                </label>
                <select
                  value={sourceMode}
                  disabled={isLocked}
                  onChange={(e) => setSourceMode(e.target.value)}
                  className="mt-1 w-full text-xs border border-gray-200 dark:border-[#334155] dark:bg-[#1E293B] rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] disabled:opacity-60"
                >
                  <option value="published" disabled={!canUsePublished}>
                    {t.sourcePublished || 'Sala publicada'}
                  </option>
                  <option value="workspace">
                    {t.sourceWorkspace || 'Minha lista'}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                  {t.marketLabel || 'Sala'}
                </label>
                <select
                  value={selectedMarket}
                  disabled={isLocked}
                  onChange={(e) => setSelectedMarket(e.target.value)}
                  className="mt-1 w-full text-xs border border-gray-200 dark:border-[#334155] dark:bg-[#1E293B] rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] disabled:opacity-60"
                >
                  <option value="ob">{t.marketOB || 'OB'}</option>
                  <option value="forex">{t.marketForex || 'Forex'}</option>
                  <option value="crypto">{t.marketCrypto || 'Cripto'}</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                  {t.assetLabel || 'Ativo'}
                </label>
                <select
                  value={selectedAsset}
                  disabled={isLocked}
                  onChange={(e) => setSelectedAsset(e.target.value)}
                  className="mt-1 w-full text-xs border border-gray-200 dark:border-[#334155] dark:bg-[#1E293B] rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] disabled:opacity-60"
                >
                  {availableFeeds.length ? availableFeeds.map((feed) => (
                    <option key={feed.id} value={feed.asset}>{feed.asset}</option>
                  )) : (
                    <option value="">-</option>
                  )}
                </select>
                <input
                  value={assetInput}
                  disabled={isLocked}
                  onChange={(e) => setAssetInput(e.target.value)}
                  onBlur={applyAssetInput}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    applyAssetInput();
                  }}
                  placeholder={t.assetInputPlaceholder || 'Digite o ativo...'}
                  className="mt-2 w-full text-xs border border-gray-200 dark:border-[#334155] dark:bg-[#1E293B] rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] disabled:opacity-60"
                />
              </div>
            </div>

            {sourceMode === 'published' && canEditSignals ? (
              <button
                type="button"
                disabled={isLocked || !signalsText.trim()}
                onClick={copyPublishedListToWorkspace}
                className="mt-3 w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-60 text-gray-800 dark:text-white font-medium py-2 rounded-lg text-xs flex items-center justify-center transition-colors"
              >
                <Icons.Copy /> {t.copyToMyList || 'Copiar para Minha Lista'}
              </button>
            ) : null}
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
                {t.errors}: <span className="font-semibold text-red-500">{invalidCount}</span> |
                {t.ignoredLabel || 'Ignorados'}: <span className="font-semibold text-amber-600">{ignoredCount || 0}</span>
              </p>
            </div>
            <div className="flex space-x-2">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".txt,.csv" className="hidden" />
              <button disabled={Boolean(isSignalsReadOnly) || !canEditSignals} onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-[#CBD5E1] bg-gray-50 dark:bg-[#111827] border border-gray-200 dark:border-[#1F2A3A] rounded-lg hover:bg-gray-100 dark:hover:bg-[#162033] transition-colors disabled:cursor-not-allowed disabled:opacity-40">{t.import}</button>
              <button onClick={handleExport} className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg hover:bg-opacity-90 transition-colors" style={{ backgroundColor: colors.primary }}>{t.export}</button>
            </div>
          </div>

          <ScrollableTableShell minWidthClass="min-w-[860px]" hintLabel={t.swipeHint || 'Swipe'}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="sticky top-0 bg-gray-50 dark:bg-[#111827] text-[10px] font-bold uppercase text-gray-400 dark:text-[#94A3B8]">
                  <th className="px-3 py-3 whitespace-nowrap">{t.ignoreLabel || 'Ignorar'}</th>
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
                    <td colSpan="8" className="p-8 text-center text-gray-400 dark:text-[#64748B]">
                      {isSignalsLoading
                        ? t.loadingSignals
                        : sourceMode === 'published'
                          ? (t.waitingDailyList || 'Aguardando lista diária publicada pelo admin para esta data.')
                          : t.noSignalsFound}
                    </td>
                  </tr>
                ) : (
                  parsedSignals.map((sig, i) => (
                    <tr key={i} className={`transition-colors hover:bg-gray-50/50 dark:hover:bg-[#101826] ${sig.isIgnored ? 'opacity-60' : ''}`}>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={Boolean(sig.isIgnored)}
                          disabled={isLocked || !toggleSignalIgnored || isExclusionsSaving || !selectedAsset}
                          onChange={(e) => toggleSignalIgnored?.(sig.signalKey, sig.lineNumber, e.target.checked)}
                          className="h-4 w-4 accent-[#FF6B00] disabled:opacity-60"
                        />
                      </td>
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
                      <td className="min-w-[220px] px-3 py-3 text-[10px] text-gray-500 dark:text-[#94A3B8]">
                        {sig.isIgnored ? (t.ignoredStatus || 'Ignorado') : (sig.isValid ? t.readyToTrade : sig.error)}
                      </td>
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
