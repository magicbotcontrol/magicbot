import { useEffect, useState } from 'react';
import { colors } from '../../constants/colors';
import { Icons } from '../../constants/icons';
import { ScrollableTableShell } from '../ScrollableTableShell';

function FlowBadge({ label, value, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-gray-200 bg-white text-gray-700 dark:border-[#1F2A3A] dark:bg-[#111827] dark:text-[#CBD5E1]',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300',
    warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300',
    danger: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300'
  };

  return (
    <div className={`rounded-xl border px-3 py-2 ${tones[tone] || tones.neutral}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-70">{label}</div>
      <div className="mt-1 text-sm font-black">{value}</div>
    </div>
  );
}

export function SignalsTab({
  t,
  botStatus,
  botSlot,
  setBotSlot,
  isBotInstancesLoading,
  botToleranceSeconds,
  setBotToleranceSeconds,
  isBotToleranceSaving,
  isBotStatusSyncing,
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
  executableSignalsCount,
  ignoredCount,
  isExclusionsSaving,
  toggleSignalIgnored,
  isSignalsLoading,
  isSignalsSaving,
  handleOpenInBroker,
  selectedBrokerName,
  selectedAccountType,
  isBrokerLinked,
  linkedBrokersCount
}) {
  const [assetInput, setAssetInput] = useState(selectedAsset || '');
  const [dayJobsFilter, setDayJobsFilter] = useState('pending');
  const [retryMinMinutesLeft, setRetryMinMinutesLeft] = useState(1);
  const isLocked = botStatus === 'running';
  const isSyncLocked = isBotStatusSyncing;
  const isInteractionLocked = isLocked || isSyncLocked;
  const canToggleBot = botStatus === 'running' || canStartBot;
  const invalidCount = parsedSignals.filter((signal) => !signal.isValid).length;
  const scenarioPresets = [
    { key: 'empty', label: 'Sem sinais', text: '' },
    { key: 'invalid', label: 'Inválidos', text: 'M3;EU;14:07;BUY\nlinha sem formato' },
    { key: 'timed', label: 'Com horário', text: 'M5;EURUSD;14:00;CALL\nM15;GBPUSD-OTC;14:30;PUT\nM1;USDJPY;15:00;CALL' },
    { key: 'price', label: 'Só por preço', text: 'M5;EURUSD;1.08452;CALL\nM15;GBPUSD;1.27111;PUT' }
  ];
  const operationalHint = (() => {
    if (botStatus === 'running') {
      return t.botRunningHint || 'Fila em execução. Você pode pausar a qualquer momento e acompanhar os jobs do dia logo abaixo.';
    }
    if (!isBrokerLinked) {
      return (t.brokerLinkRequiredHint || 'Vincule a corretora {broker} na aba Conta para abrir ordens manualmente com mais rapidez.')
        .replace('{broker}', selectedBrokerName || 'selecionada');
    }
    if (!parsedSignals.length) {
      return t.noSignalsFlowHint || 'Cole, importe ou carregue uma lista para começar o fluxo operacional.';
    }
    if (validCount === 0) {
      return t.invalidSignalsFlowHint || 'Corrija os sinais inválidos antes de iniciar a fila.';
    }
    if (executableSignalsCount === 0) {
      return t.executableSignalsFlowHint || 'A automação desta aba usa apenas sinais com horário HH:MM. Sinais por preço ficam como referência manual.';
    }
    if (sourceMode === 'published' && !selectedAsset) {
      return t.selectAssetFlowHint || 'Selecione um ativo da sala publicada para montar a lista operacional.';
    }
    return t.readyFlowHint || 'Fluxo pronto: lista carregada, sinais agendáveis encontrados e fila pronta para iniciar.';
  })();

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

  const syncControlClass = isSyncLocked ? 'ring-1 ring-blue-200 dark:ring-blue-900/50' : '';

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-fade-in">
      <div className="space-y-6 xl:col-span-5 2xl:col-span-4">
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl shadow-sm border border-gray-200 dark:border-[#334155] p-6 relative overflow-hidden">
          {botStatus === 'running' && <div className="absolute inset-0 bg-[#FF6B00]/5 animate-pulse rounded-2xl" />}
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3 flex items-center">
            <Icons.Signals /> <span className="ml-2">{t.statusAuto}</span>
          </h2>
          <div className="mb-3 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
              {t.botSlotLabel || 'Bot'}
            </span>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <select
                value={botSlot}
                disabled={isInteractionLocked || isBotInstancesLoading}
                onChange={(e) => setBotSlot?.(Number(e.target.value))}
                className={`w-full text-xs border border-gray-200 dark:border-[#334155] dark:bg-[#1E293B] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] disabled:opacity-60 sm:w-auto ${syncControlClass}`}
              >
                <option value={1}>{t.botSlot1 || 'Bot 1'}</option>
                <option value={2}>{t.botSlot2 || 'Bot 2'}</option>
              </select>
              <select
                value={Number(botToleranceSeconds || 0)}
                disabled={isInteractionLocked || isBotInstancesLoading || isBotToleranceSaving || !setBotToleranceSeconds}
                onChange={(e) => setBotToleranceSeconds?.(Number(e.target.value))}
                className={`w-full text-xs border border-gray-200 dark:border-[#334155] dark:bg-[#1E293B] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] disabled:opacity-60 sm:w-auto ${syncControlClass}`}
                title={t.toleranceLabel || 'Tolerância'}
              >
                {[2, 5, 10, 15].map((s) => (
                  <option key={s} value={s}>
                    {s}s
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={handleStartBot}
            disabled={!canToggleBot || isSyncLocked}
            className={`w-full py-4 rounded-xl font-bold text-white uppercase tracking-wider flex items-center justify-center space-x-2 transition-all transform hover:scale-[1.01] ${
              botStatus === 'running'
                ? 'bg-red-500 hover:bg-red-600 shadow-lg'
                : 'bg-[#FF6B00] hover:bg-[#FF7F1F] shadow-lg shadow-[#FF6B00]/20'
            } disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100`}
            style={botStatus !== 'running' ? { backgroundColor: colors.primary } : {}}
          >
            {botStatus === 'running' ? <Icons.Stop /> : <Icons.Play />}
            <span>{botStatus === 'running' ? t.stopBot : t.startBot}</span>
            {isSyncLocked ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-[10px] font-bold normal-case tracking-normal">
                <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                {t.botSyncingShortLabel || 'Sync'}
              </span>
            ) : null}
          </button>
          <div className="mt-4 flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{t.state}:</span>
            <div className="flex items-center gap-2">
              {isBotStatusSyncing ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-600 dark:bg-blue-950/30 dark:text-blue-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                  {t.botSyncingLabel || 'Sincronizando'}
                </span>
              ) : null}
              <span className={`font-bold ${botStatus === 'running' ? 'text-green-500 animate-pulse' : 'text-gray-400'}`}>
                {botStatus === 'running' ? t.runningStatus : t.offlineStatus}
              </span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <FlowBadge
              label={t.brokerLabelShort || 'Corretora'}
              value={`${selectedBrokerName || 'IQ Option'} • ${selectedAccountType || 'Demo'}`}
              tone={isBrokerLinked ? 'success' : 'warning'}
            />
            <FlowBadge
              label={t.sourceLabel || 'Fonte'}
              value={sourceMode === 'published' ? (t.sourcePublished || 'Sala publicada') : (t.sourceWorkspace || 'Minha lista')}
              tone="neutral"
            />
            <FlowBadge
              label={t.valid || 'Válidos'}
              value={String(validCount || 0)}
              tone={validCount > 0 ? 'success' : 'warning'}
            />
            <FlowBadge
              label={t.queueReadyLabel || 'Agendáveis'}
              value={String(executableSignalsCount || 0)}
              tone={executableSignalsCount > 0 ? 'success' : 'warning'}
            />
          </div>
          <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[11px] text-gray-500 dark:border-[#334155] dark:bg-[#0F172A] dark:text-[#94A3B8]">
            {`Minha Conta: ${linkedBrokersCount || 0} corretora(s) vinculada(s). Configurações define qual delas fica ativa no AutoTrader (Lista).`}
          </div>
          <div className={`mt-4 rounded-xl border px-3 py-3 text-[11px] leading-5 ${
            botStatus === 'running'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300'
              : canToggleBot
                ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-300'
                : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300'
          }`}>
            {isBotStatusSyncing
              ? (t.botSyncingHint || 'Estamos confirmando o status mais recente do bot no backend. Assim que a sincronização terminar, a aba libera ou trava os controles automaticamente.')
              : operationalHint}
          </div>
          {isSyncLocked ? (
            <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-300">
              {t.botSyncControlsHint || 'Alguns controles ficam temporariamente bloqueados enquanto o status do bot é confirmado.'}
            </div>
          ) : null}
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

            <div className="mt-2 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setDayJobsFilter('pending')}
                disabled={isSyncLocked}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-bold transition-colors ${
                  dayJobsFilter === 'pending'
                    ? 'border-[#FF6B00] bg-[#FF6B00]/10 text-[#FF6B00]'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-[#1F2A3A] dark:bg-[#111827] dark:text-[#CBD5E1] dark:hover:bg-[#162033]'
                } disabled:opacity-60 ${syncControlClass}`}
              >
                {t.jobsFilterPending || 'Pendentes'}
              </button>
              <button
                type="button"
                onClick={() => setDayJobsFilter('failed')}
                disabled={isSyncLocked}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-bold transition-colors ${
                  dayJobsFilter === 'failed'
                    ? 'border-[#FF6B00] bg-[#FF6B00]/10 text-[#FF6B00]'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-[#1F2A3A] dark:bg-[#111827] dark:text-[#CBD5E1] dark:hover:bg-[#162033]'
                } disabled:opacity-60 ${syncControlClass}`}
              >
                {t.jobsFilterFailed || 'Falhos'}
              </button>
              <button
                type="button"
                onClick={() => setDayJobsFilter('executed')}
                disabled={isSyncLocked}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-bold transition-colors ${
                  dayJobsFilter === 'executed'
                    ? 'border-[#FF6B00] bg-[#FF6B00]/10 text-[#FF6B00]'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-[#1F2A3A] dark:bg-[#111827] dark:text-[#CBD5E1] dark:hover:bg-[#162033]'
                } disabled:opacity-60 ${syncControlClass}`}
              >
                {t.jobsFilterExecuted || 'Executados'}
              </button>
            </div>

            <div className="mt-2 flex flex-col sm:flex-row gap-2">
              <select
                value={retryMinMinutesLeft}
                onChange={(e) => setRetryMinMinutesLeft(Number(e.target.value))}
                disabled={isBotActionLoading || isSyncLocked}
                className={`w-full sm:w-[96px] rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-[11px] font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-60 dark:border-[#1F2A3A] dark:bg-[#111827] dark:text-[#CBD5E1] dark:hover:bg-[#162033] ${syncControlClass}`}
              >
                {[0, 1, 2, 3].map((m) => (
                  <option key={m} value={m}>
                    {m}m
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={isBotActionLoading || isSyncLocked || !handleRequeueFailedJobs}
                onClick={() => {
                  const message = (t.confirmRequeueFailedWithMin || 'Reenfileirar falhos com pelo menos {min} min restantes até expirar?')
                    .replace('{min}', String(retryMinMinutesLeft));
                  if (!window.confirm(message)) return;
                  handleRequeueFailedJobs?.(retryMinMinutesLeft);
                }}
                className={`flex-1 rounded-lg bg-gray-100 dark:bg-[#111827] border border-gray-200 dark:border-[#1F2A3A] px-3 py-2 text-[11px] font-bold text-gray-800 dark:text-[#E2E8F0] hover:bg-gray-200 dark:hover:bg-[#162033] disabled:opacity-60 ${syncControlClass}`}
              >
                {t.requeueFailedWithMinAction || 'Reenfileirar falhos (X min)'}
              </button>
              <button
                type="button"
                disabled={isBotActionLoading || isSyncLocked || !handleClearExpiredJobs}
                onClick={() => handleClearExpiredJobs?.()}
                className={`flex-1 rounded-lg bg-gray-100 dark:bg-[#111827] border border-gray-200 dark:border-[#1F2A3A] px-3 py-2 text-[11px] font-bold text-gray-800 dark:text-[#E2E8F0] hover:bg-gray-200 dark:hover:bg-[#162033] disabled:opacity-60 ${syncControlClass}`}
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

        <div className="bg-white dark:bg-[#1E293B] rounded-2xl shadow-sm border border-gray-200 dark:border-[#334155] p-6 flex flex-col min-h-[400px]">
          <div className="mb-4">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">{t.editorIntel}</h2>
              <input
                type="date"
                value={selectedDate}
                disabled={isInteractionLocked}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={`w-full text-xs border border-gray-200 dark:border-[#334155] dark:bg-[#1E293B] rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] disabled:opacity-60 sm:w-auto ${syncControlClass}`}
              />
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                  {t.sourceLabel || 'Fonte'}
                </label>
                <select
                  value={sourceMode}
                  disabled={isInteractionLocked}
                  onChange={(e) => setSourceMode(e.target.value)}
                  className={`mt-1 w-full text-xs border border-gray-200 dark:border-[#334155] dark:bg-[#1E293B] rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] disabled:opacity-60 ${syncControlClass}`}
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
                  disabled={isInteractionLocked}
                  onChange={(e) => setSelectedMarket(e.target.value)}
                  className={`mt-1 w-full text-xs border border-gray-200 dark:border-[#334155] dark:bg-[#1E293B] rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] disabled:opacity-60 ${syncControlClass}`}
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
                  disabled={isInteractionLocked}
                  onChange={(e) => setSelectedAsset(e.target.value)}
                  className={`mt-1 w-full text-xs border border-gray-200 dark:border-[#334155] dark:bg-[#1E293B] rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] disabled:opacity-60 ${syncControlClass}`}
                >
                  {availableFeeds.length ? availableFeeds.map((feed) => (
                    <option key={feed.id} value={feed.asset}>{feed.asset}</option>
                  )) : (
                    <option value="">-</option>
                  )}
                </select>
                <input
                  value={assetInput}
                  disabled={isInteractionLocked}
                  onChange={(e) => setAssetInput(e.target.value)}
                  onBlur={applyAssetInput}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    applyAssetInput();
                  }}
                  placeholder={t.assetInputPlaceholder || 'Digite o ativo...'}
                  className={`mt-2 w-full text-xs border border-gray-200 dark:border-[#334155] dark:bg-[#1E293B] rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] disabled:opacity-60 ${syncControlClass}`}
                />
              </div>
            </div>

            {sourceMode === 'published' && canEditSignals ? (
              <button
                type="button"
                disabled={isInteractionLocked || !signalsText.trim()}
                onClick={copyPublishedListToWorkspace}
                className={`mt-3 w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-60 text-gray-800 dark:text-white font-medium py-2 rounded-lg text-xs flex items-center justify-center transition-colors ${syncControlClass}`}
              >
                <Icons.Copy /> {t.copyToMyList || 'Copiar para Minha Lista'}
              </button>
            ) : null}
            <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[11px] text-gray-500 dark:border-[#334155] dark:bg-[#0F172A] dark:text-[#94A3B8]">
              {sourceMode === 'published'
                ? (t.publishedReadonlyHint || 'A sala publicada fica protegida. Para editar, copie a lista para "Minha lista".')
                : (t.workspaceEditableHint || 'Minha lista permite editar, importar, limpar e salvar antes de iniciar a fila.')}
            </div>
            {canEditSignals ? (
              <div className="mt-3 rounded-xl border border-dashed border-gray-200 bg-white px-3 py-3 dark:border-[#334155] dark:bg-[#111827]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                    Cenários rápidos de revisão
                  </p>
                  <p className="text-[10px] text-gray-400">
                    Pré-carrega exemplos em Minha lista
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {scenarioPresets.map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      disabled={isInteractionLocked}
                      onClick={() => {
                        if (sourceMode !== 'workspace') {
                          setSourceMode('workspace');
                        }
                        setSignalsText(preset.text);
                      }}
                      className={`rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[11px] font-bold text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-60 dark:border-[#1F2A3A] dark:bg-[#0F172A] dark:text-[#CBD5E1] dark:hover:bg-[#162033] ${syncControlClass}`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <textarea
            value={signalsText}
            onChange={(e) => {
              if (isSignalsReadOnly || !canEditSignals) return;
              setSignalsText(e.target.value);
            }}
            className={`flex-1 w-full bg-gray-50 dark:bg-[#334155] border border-gray-200 dark:border-[#475569] rounded-xl p-3 font-mono text-xs text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] resize-none custom-scrollbar ${syncControlClass}`}
            placeholder="M5;EURUSD;14:00;CALL"
            readOnly={Boolean(isSignalsReadOnly) || !canEditSignals || isSyncLocked}
          />
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <button onClick={handleSaveSignals} disabled={isSignalsSaving || isSyncLocked || Boolean(isSignalsReadOnly) || !canEditSignals} className={`flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-60 text-gray-800 dark:text-white font-medium py-2 rounded-lg text-xs flex items-center justify-center transition-colors ${syncControlClass}`}>
              <Icons.Save /> {t.save}
            </button>
            <button onClick={handleClearSignals} disabled={isSyncLocked || Boolean(isSignalsReadOnly) || !canEditSignals} className={`flex-1 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 disabled:opacity-60 text-red-600 dark:text-red-400 font-medium py-2 rounded-lg text-xs flex items-center justify-center transition-colors ${syncControlClass}`}>
              <Icons.Trash /> {t.clear}
            </button>
          </div>
        </div>
      </div>

      <div className="xl:col-span-7 2xl:col-span-8">
        <div className="bg-white dark:bg-[#0B1220] rounded-2xl border border-gray-200 dark:border-[#1F2A3A] shadow-sm dark:shadow-[0_18px_50px_rgba(3,7,18,0.45)] p-4 md:p-6 h-full min-h-[480px] flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-3 sm:space-y-0">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-[#F8FAFC]">{t.signalsProc}</h2>
              <p className="text-xs text-gray-500 dark:text-[#94A3B8]">
                {t.total}: <span className="font-semibold text-gray-700 dark:text-[#E2E8F0]">{parsedSignals.length}</span> |
                {t.valid}: <span className="font-semibold text-green-600">{validCount}</span> |
                {(t.queueReadyLabel || ' Agendáveis')}: <span className="font-semibold text-blue-600">{executableSignalsCount}</span> |
                {t.errors}: <span className="font-semibold text-red-500">{invalidCount}</span> |
                {t.ignoredLabel || 'Ignorados'}: <span className="font-semibold text-amber-600">{ignoredCount || 0}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".txt,.csv" className="hidden" />
              <button disabled={isSyncLocked || Boolean(isSignalsReadOnly) || !canEditSignals} onClick={() => fileInputRef.current?.click()} className={`px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-[#CBD5E1] bg-gray-50 dark:bg-[#111827] border border-gray-200 dark:border-[#1F2A3A] rounded-lg hover:bg-gray-100 dark:hover:bg-[#162033] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${syncControlClass}`}>{t.import}</button>
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
                          {t.openBrokerAction || 'Abrir na corretora'}
                        </button>
                      </td>
                      <td className="min-w-[220px] px-3 py-3 text-[10px] text-gray-500 dark:text-[#94A3B8]">
                        {sig.isIgnored
                          ? (t.ignoredStatus || 'Ignorado')
                          : sig.isValid
                            ? (
                              sig.isScheduledTime
                                ? (t.readyToTrade || 'Pronto para operação')
                                : (t.manualReferenceOnly || 'Válido como referência, mas a fila automática desta aba só agenda sinais com horário HH:MM.')
                            )
                            : sig.error}
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
