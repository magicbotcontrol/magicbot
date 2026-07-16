import { useEffect, useMemo, useState } from 'react';
import { colors } from '../../constants/colors';
import { Icons } from '../../constants/icons';
import { ScrollableTableShell } from '../ScrollableTableShell';

function FlowBadge({ label, value, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-gray-200 bg-gradient-to-br from-white to-gray-50 text-gray-700 shadow-sm dark:border-[#1F2A3A] dark:from-[#111827] dark:to-[#0B1220] dark:text-[#CBD5E1]',
    success: 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white text-emerald-700 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/20 dark:to-[#0B1220] dark:text-emerald-300',
    warning: 'border-amber-200 bg-gradient-to-br from-amber-50 to-white text-amber-700 shadow-sm dark:border-amber-900/40 dark:from-amber-950/20 dark:to-[#0B1220] dark:text-amber-300',
    danger: 'border-rose-200 bg-gradient-to-br from-rose-50 to-white text-rose-700 shadow-sm dark:border-rose-900/40 dark:from-rose-950/20 dark:to-[#0B1220] dark:text-rose-300'
  };

  return (
    <div className={`rounded-2xl border px-3 py-3 ${tones[tone] || tones.neutral}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-70">{label}</div>
      <div className="mt-1 text-sm font-black leading-tight">{value}</div>
    </div>
  );
}

function formatCountdown(seconds) {
  if (seconds === null || Number.isNaN(Number(seconds))) return '--';
  const total = Math.abs(Number(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  const base = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return seconds < 0 ? `-${base}` : base;
}

function formatMoneyValue(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return '-';
  return amount.toFixed(2);
}

function getRowStatusMeta(signal) {
  const key = String(signal?.runtimeStatus || '').toLowerCase();

  switch (key) {
    case 'manual_executed':
    case 'simulated_executed':
      return {
        label: signal?.runtimeLabel || 'Executada',
        cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300'
      };
    case 'manual_failed':
    case 'expired':
      return {
        label: signal?.runtimeLabel || 'Falhou',
        cls: 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-300'
      };
    case 'ready':
    case 'queued':
      return {
        label: signal?.runtimeLabel || 'Na fila',
        cls: 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300'
      };
    case 'executing':
      return {
        label: signal?.runtimeLabel || 'Executando',
        cls: 'bg-violet-50 text-violet-700 dark:bg-violet-950/20 dark:text-violet-300'
      };
    case 'ignored':
      return {
        label: 'Ignorado',
        cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300'
      };
    default:
      return {
        label: signal?.runtimeLabel || (signal?.isValid ? 'Pronto' : 'Inválido'),
        cls: signal?.isValid
          ? 'bg-gray-100 text-gray-700 dark:bg-[#111827] dark:text-[#CBD5E1]'
          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-300'
      };
  }
}

function getBrokerSessionMeta({ brokerSession, selectedBrokerItem }) {
  const state = String(
    brokerSession?.state
      || (selectedBrokerItem?.workerAuthReady ? 'linked' : selectedBrokerItem?.status === 'Linked' ? 'linked' : 'unlinked')
  ).toLowerCase();

  switch (state) {
    case 'session_connected':
      return {
        label: 'Conectada',
        cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300'
      };
    case 'session_login_failed':
      return {
        label: 'Falha no login',
        cls: 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-300'
      };
    case 'session_ready':
    case 'credentials_ready':
    case 'linked':
      return {
        label: 'Reconectando',
        cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300'
      };
    case 'adapter_placeholder':
      return {
        label: 'Sem sessao',
        cls: 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300'
      };
    default:
      return {
        label: 'Desvinculada',
        cls: 'bg-gray-100 text-gray-700 dark:bg-[#111827] dark:text-[#CBD5E1]'
      };
  }
}

function getRuntimeErrorMeta(rawValue) {
  const value = String(rawValue || '').trim();
  const key = value.toLowerCase();

  if (!value) {
    return null;
  }

  if (key === 'stop_bot_command') {
    return {
      visible: false,
      message: 'Bot pausado pelo usuario.'
    };
  }

  if (key === 'broker_session_login_failed') {
    return {
      visible: true,
      message: 'Falha no login da corretora.'
    };
  }

  if (key === 'broker_session_reconnecting') {
    return {
      visible: true,
      message: 'Corretora reconectando.'
    };
  }

  return {
    visible: true,
    message: value
  };
}

export function SignalsTab({
  t,
  botStatus,
  botSlot,
  setBotSlot,
  selectedBotInstance,
  isBotInstancesLoading,
  botToleranceSeconds,
  setBotToleranceSeconds,
  isBotToleranceSaving,
  botExecutionAccountType,
  setBotExecutionAccountType,
  botDefaultOrderAmountInput,
  setBotDefaultOrderAmountInput,
  isBotExecutionConfigSaving,
  handleSaveBotExecutionConfig,
  isBotStatusSyncing,
  botQueueSummary,
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
  selectedBrokerItem,
  selectedAccountType,
  isBrokerLinked,
  isBrokerExecutionAutomatic,
  brokerSession,
  brokerSessionState,
  isBrokerSessionConnected,
  isBrokerSessionQaEnabled,
  brokerSessionQaState,
  setBrokerSessionQaState,
  isSimulationMode,
  nextExecutionSignal,
  signalRuntimeRows,
  handleSignalManualResult,
  setSignalAccountTypeOverride,
  setSignalAmountOverride
}) {
  const [assetInput, setAssetInput] = useState(selectedAsset || '');
  const invalidCount = parsedSignals.filter((signal) => !signal.isValid).length;
  const isLocked = botStatus === 'running';
  const isSyncLocked = isBotStatusSyncing;
  const isInteractionLocked = isLocked || isSyncLocked;
  const canToggleBot = botStatus === 'running' || canStartBot;
  const isExecutionAutomatic = Boolean(isBrokerExecutionAutomatic);
  const executionModeValue = isSimulationMode
    ? 'Simulação'
    : isExecutionAutomatic
      ? (t.executionModeAutomatic || 'Automática')
      : (t.executionModeAssisted || 'Assistida');
  const executionModeTone = isSimulationMode || isExecutionAutomatic ? 'success' : 'warning';
  const brokerSessionMeta = getBrokerSessionMeta({ brokerSession, selectedBrokerItem });
  const runtimeErrorMeta = getRuntimeErrorMeta(selectedBotInstance?.last_runtime_error);
  const qaSessionSelectClass = brokerSessionQaState === 'session_connected'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 focus:ring-emerald-400 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200'
    : brokerSessionQaState === 'session_login_failed'
      ? 'border-rose-200 bg-rose-50 text-rose-800 focus:ring-rose-400 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200'
      : brokerSessionQaState === 'credentials_ready'
        ? 'border-amber-200 bg-amber-50 text-amber-800 focus:ring-amber-400 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200'
        : 'border-amber-200 bg-white text-amber-800 focus:ring-amber-400 dark:border-amber-900/40 dark:bg-[#1E293B] dark:text-amber-200';
  const startBlockReason = !isBrokerSessionConnected
    ? brokerSessionState === 'session_login_failed'
      ? 'Falha no login da corretora'
      : 'Corretora reconectando'
    : '';
  const runtimeByKey = useMemo(
    () => Object.fromEntries((signalRuntimeRows || []).map((signal) => [signal.signalKey, signal])),
    [signalRuntimeRows]
  );
  const syncControlClass = isSyncLocked ? 'ring-1 ring-blue-200 dark:ring-blue-900/50' : '';
  const editorStateLabel = isSyncLocked
    ? 'Sincronizando'
    : sourceMode === 'published'
      ? 'Sala publicada protegida'
      : isLocked
        ? 'Editor bloqueado'
        : 'Minha lista editavel';
  const editorHelperText = sourceMode === 'published'
    ? 'Copie para Minha Lista para editar e publicar sua propria lista.'
    : isLocked
      ? 'Pare a automacao para alterar sua lista com seguranca.'
      : 'Sua lista propria fica livre para edicao quando o bot estiver offline.';

  useEffect(() => {
    setAssetInput(selectedAsset || '');
  }, [selectedAsset]);

  const applyAssetInput = () => {
    setSelectedAsset(String(assetInput || '').trim().toUpperCase());
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-[28px] border border-gray-200 bg-gradient-to-br from-white via-white to-orange-50/40 p-5 shadow-[0_16px_45px_rgba(15,23,42,0.06)] dark:border-[#334155] dark:bg-gradient-to-br dark:from-[#1E293B] dark:via-[#1E293B] dark:to-[#0F172A] md:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-r from-[#FF6B00]/8 via-transparent to-blue-500/5" />
        <div className="relative flex flex-col gap-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF6B00]/10 text-[#FF6B00] ring-1 ring-[#FF6B00]/15">
                <Icons.Signals />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white">{t.editorIntel}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className={`inline-flex rounded-full px-2.5 py-1 font-bold ${
                    editorStateLabel === 'Minha lista editavel'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300'
                      : editorStateLabel === 'Sincronizando'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300'
                  }`}>
                    {editorStateLabel}
                  </span>
                  <span className="text-gray-500 dark:text-[#94A3B8]">
                    {editorHelperText}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap xl:gap-2.5">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".txt,.csv" className="hidden" />
              <button
                disabled={isSyncLocked || Boolean(isSignalsReadOnly) || !canEditSignals}
                onClick={() => fileInputRef.current?.click()}
                className={`rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#1F2A3A] dark:bg-[#111827] dark:text-[#CBD5E1] dark:hover:bg-[#162033] ${syncControlClass}`}
              >
                {t.import}
              </button>
              <button
                onClick={handleExport}
                className="rounded-xl px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-opacity-90"
                style={{ backgroundColor: colors.primary }}
              >
                {t.export}
              </button>
              <button
                onClick={handleSaveSignals}
                disabled={isSignalsSaving || isSyncLocked || Boolean(isSignalsReadOnly) || !canEditSignals}
                className={`rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-60 dark:border-[#334155] dark:bg-[#0B1220] dark:text-[#E2E8F0] dark:hover:bg-[#162033] ${syncControlClass}`}
              >
                {isSignalsSaving ? 'Salvando...' : t.save}
              </button>
              <button
                onClick={handleClearSignals}
                disabled={isSyncLocked || Boolean(isSignalsReadOnly) || !canEditSignals}
                className={`rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-60 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300 ${syncControlClass}`}
              >
                {t.clear}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
            <input
              type="date"
              value={selectedDate}
              disabled={isInteractionLocked}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={`w-full rounded-2xl border border-gray-200 bg-white/80 px-3 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#FF6B00] disabled:opacity-60 dark:border-[#334155] dark:bg-[#1E293B] ${syncControlClass} xl:col-span-2`}
            />
            <select
              value={sourceMode}
              disabled={isInteractionLocked}
              onChange={(e) => setSourceMode(e.target.value)}
              className={`w-full rounded-2xl border border-gray-200 bg-white/80 px-3 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#FF6B00] disabled:opacity-60 dark:border-[#334155] dark:bg-[#1E293B] ${syncControlClass} xl:col-span-3`}
            >
              <option value="published" disabled={!canUsePublished}>
                {t.sourcePublished || 'Sala publicada'}
              </option>
              <option value="workspace">
                {t.sourceWorkspace || 'Minha lista'}
              </option>
            </select>
            <select
              value={selectedMarket}
              disabled={isInteractionLocked}
              onChange={(e) => setSelectedMarket(e.target.value)}
              className={`w-full rounded-2xl border border-gray-200 bg-white/80 px-3 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#FF6B00] disabled:opacity-60 dark:border-[#334155] dark:bg-[#1E293B] ${syncControlClass} xl:col-span-3`}
            >
              <option value="ob">{t.marketOB || 'OB'}</option>
              <option value="forex">{t.marketForex || 'Forex'}</option>
              <option value="crypto">{t.marketCrypto || 'Cripto'}</option>
            </select>
            <div className="grid grid-cols-2 gap-2 xl:col-span-4">
              <select
                value={selectedAsset}
                disabled={isInteractionLocked}
                onChange={(e) => setSelectedAsset(e.target.value)}
                className={`w-full rounded-2xl border border-gray-200 bg-white/80 px-3 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#FF6B00] disabled:opacity-60 dark:border-[#334155] dark:bg-[#1E293B] ${syncControlClass}`}
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
                placeholder={t.assetInputPlaceholder || 'Ativo'}
                className={`w-full rounded-2xl border border-gray-200 bg-white/80 px-3 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#FF6B00] disabled:opacity-60 dark:border-[#334155] dark:bg-[#1E293B] ${syncControlClass}`}
              />
            </div>
          </div>

          {sourceMode === 'published' && canEditSignals ? (
            <button
              type="button"
              disabled={isInteractionLocked || !signalsText.trim()}
              onClick={copyPublishedListToWorkspace}
              className={`w-full rounded-2xl border border-gray-200 bg-white/80 px-3 py-3 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-[#1F2A3A] dark:bg-[#111827] dark:text-[#CBD5E1] dark:hover:bg-[#162033] ${syncControlClass}`}
            >
              <Icons.Copy /> {t.copyToMyList || 'Copiar para Minha Lista'}
            </button>
          ) : null}

          <textarea
            value={signalsText}
            onChange={(e) => {
              if (isSignalsReadOnly || !canEditSignals) return;
              setSignalsText(e.target.value);
            }}
            className={`min-h-[340px] w-full resize-none rounded-[24px] border border-gray-200 bg-white/80 p-4 font-mono text-xs text-gray-800 shadow-inner focus:outline-none focus:ring-1 focus:ring-[#FF6B00] dark:border-[#334155] dark:bg-[#0F172A] dark:text-slate-100 xl:min-h-[460px] xl:p-5 ${syncControlClass}`}
            placeholder="M5;EURUSD;14:00;CALL"
            readOnly={Boolean(isSignalsReadOnly) || !canEditSignals || isSyncLocked}
          />
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-[28px] border border-gray-200 bg-gradient-to-br from-white via-white to-gray-50 p-5 shadow-[0_16px_45px_rgba(15,23,42,0.06)] dark:border-[#334155] dark:bg-gradient-to-br dark:from-[#1E293B] dark:via-[#1E293B] dark:to-[#0F172A] xl:sticky xl:top-6 xl:p-6">
            {botStatus === 'running' ? <div className="absolute inset-0 rounded-2xl bg-[#FF6B00]/5" /> : null}

            <div className="relative xl:grid xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] xl:gap-6">
              <div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-base font-black text-gray-900 dark:text-white">Status da Automação</h2>
                <div className="flex gap-2">
                  <select
                    value={botSlot}
                    disabled={isSyncLocked || isBotInstancesLoading}
                    onChange={(e) => setBotSlot?.(Number(e.target.value))}
                    className={`rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#FF6B00] disabled:opacity-60 dark:border-[#334155] dark:bg-[#1E293B] ${syncControlClass}`}
                  >
                    <option value={1}>{t.botSlot1 || 'Bot 1'}</option>
                    <option value={2}>{t.botSlot2 || 'Bot 2'}</option>
                  </select>
                  <select
                    value={Number(botToleranceSeconds || 0)}
                    disabled={isSyncLocked || isBotInstancesLoading || isBotToleranceSaving || !setBotToleranceSeconds}
                    onChange={(e) => setBotToleranceSeconds?.(Number(e.target.value))}
                    className={`rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#FF6B00] disabled:opacity-60 dark:border-[#334155] dark:bg-[#1E293B] ${syncControlClass}`}
                  >
                    {[2, 5, 10, 15].map((s) => (
                      <option key={s} value={s}>{s}s</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={handleStartBot}
                disabled={!canToggleBot || isSyncLocked}
                className={`mt-5 w-full rounded-[22px] py-4 text-sm font-black uppercase tracking-[0.14em] text-white transition-all ${
                  botStatus === 'running'
                    ? 'bg-red-500 hover:bg-red-600 shadow-lg'
                    : 'bg-[#FF6B00] hover:bg-[#FF7F1F] shadow-lg shadow-[#FF6B00]/20'
                } disabled:cursor-not-allowed disabled:opacity-40`}
                style={botStatus !== 'running' ? { backgroundColor: colors.primary } : {}}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  {botStatus === 'running' ? <Icons.Stop /> : <Icons.Play />}
                  {botStatus === 'running' ? t.stopBot : t.startBot}
                </span>
              </button>
              {botStatus !== 'running' && startBlockReason ? (
                <div className={`mt-3 rounded-xl border px-3 py-2 text-[11px] font-bold ${brokerSessionMeta.cls}`}>
                  {startBlockReason}
                </div>
              ) : null}

              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <FlowBadge label={t.state || 'Estado'} value={botStatus === 'running' ? (t.runningStatus || 'Rodando') : (t.offlineStatus || 'Offline')} tone={botStatus === 'running' ? 'success' : 'neutral'} />
                <FlowBadge label={t.executionModeLabel || 'Execução'} value={executionModeValue} tone={executionModeTone} />
                <FlowBadge label={t.brokerLabelShort || 'Corretora'} value={`${selectedBrokerName || 'IQ Option'} • ${selectedAccountType || 'Demo'}`} tone={isBrokerLinked ? 'success' : 'warning'} />
                <FlowBadge label={t.sourceLabel || 'Fonte'} value={sourceMode === 'published' ? (t.sourcePublished || 'Sala publicada') : (t.sourceWorkspace || 'Minha lista')} />
                <FlowBadge label={t.valid || 'Válidos'} value={String(validCount || 0)} tone={validCount > 0 ? 'success' : 'warning'} />
                <FlowBadge label={t.queueReadyLabel || 'Agendáveis'} value={String(executableSignalsCount || 0)} tone={executableSignalsCount > 0 ? 'success' : 'warning'} />
              </div>

              {runtimeErrorMeta?.visible ? (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
                  {runtimeErrorMeta.message}
                </div>
              ) : null}
              </div>

              <div className="mt-5 space-y-5 xl:mt-0">
                <div className="rounded-[24px] border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 shadow-sm dark:border-[#334155] dark:from-[#0B1220] dark:to-[#111827]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Execução do bot</div>
                    <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${brokerSessionMeta.cls}`}>
                      {brokerSessionMeta.label}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Conta</label>
                      <select
                        value={botExecutionAccountType}
                        disabled={isSyncLocked || isBotExecutionConfigSaving}
                        onChange={(e) => setBotExecutionAccountType?.(e.target.value)}
                        className={`mt-1 w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-xs font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] disabled:opacity-60 dark:border-[#334155] dark:bg-[#1E293B] dark:text-[#CBD5E1] ${syncControlClass}`}
                      >
                        <option value="Demo">Demo</option>
                        <option value="Real">Real</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Valor por ordem</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={botDefaultOrderAmountInput}
                        disabled={isSyncLocked || isBotExecutionConfigSaving}
                        onChange={(e) => setBotDefaultOrderAmountInput?.(e.target.value)}
                        className={`mt-1 w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-xs font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] disabled:opacity-60 dark:border-[#334155] dark:bg-[#1E293B] dark:text-[#CBD5E1] ${syncControlClass}`}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSaveBotExecutionConfig?.()}
                    disabled={isSyncLocked || isBotExecutionConfigSaving || !handleSaveBotExecutionConfig}
                    className={`mt-4 w-full rounded-2xl px-3 py-3 text-xs font-black text-white shadow-lg shadow-[#FF6B00]/20 transition-colors disabled:opacity-60 ${syncControlClass}`}
                    style={{ backgroundColor: colors.primary }}
                  >
                    {isBotExecutionConfigSaving ? 'Salvando...' : 'Salvar execução do bot'}
                  </button>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-gray-500 dark:text-[#94A3B8]">
                    <span>Referência:</span>
                    <span className="font-bold text-gray-700 dark:text-[#E2E8F0]">
                      {selectedBrokerItem?.emailMasked || brokerSession?.credential_email_masked || '-'}
                    </span>
                  </div>
                  {isBrokerSessionQaEnabled ? (
                    <div className="mt-4 rounded-2xl border border-dashed border-amber-200 bg-amber-50/70 p-3 dark:border-amber-900/40 dark:bg-amber-950/10">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">QA Sessão</div>
                          <div className="mt-1 text-[11px] text-amber-700/90 dark:text-amber-200/80">
                            Override local para testar `Conectada`, `Falha no login` e `Reconectando`.
                          </div>
                        </div>
                        <select
                          value={brokerSessionQaState || ''}
                          onChange={(e) => setBrokerSessionQaState?.(e.target.value)}
                          className={`rounded-xl border px-3 py-2 text-[11px] font-bold focus:outline-none focus:ring-1 ${qaSessionSelectClass}`}
                        >
                          <option value="">Estado real</option>
                          <option value="session_connected">Conectada</option>
                          <option value="session_login_failed">Falha no login</option>
                          <option value="credentials_ready">Reconectando</option>
                        </select>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <FlowBadge label={t.queuedLabel || 'Fila'} value={String(botQueueSummary?.queued ?? 0)} />
                  <FlowBadge label={t.executingLabel || 'Executando'} value={String(botQueueSummary?.executing ?? 0)} tone="warning" />
                  <FlowBadge label={t.executedLabel || 'Executadas'} value={String(botQueueSummary?.executed ?? 0)} tone="success" />
                  <FlowBadge label={t.failedLabel || 'Falhas'} value={String(botQueueSummary?.failed ?? 0)} tone="danger" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex flex-col gap-5 rounded-[28px] border border-gray-200 bg-gradient-to-br from-white via-white to-slate-50/50 p-4 shadow-[0_16px_45px_rgba(15,23,42,0.06)] dark:border-[#1F2A3A] dark:bg-gradient-to-br dark:from-[#0B1220] dark:via-[#0B1220] dark:to-[#111827] md:p-6 xl:p-7">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-lg font-black text-gray-900 dark:text-[#F8FAFC]">{t.signalsProc}</h2>
                <div className="mt-3 flex flex-wrap gap-2.5 text-[11px]">
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 font-bold text-gray-700 dark:bg-[#111827] dark:text-[#CBD5E1]">{t.total}: {parsedSignals.length}</span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300">{t.valid}: {validCount}</span>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 font-bold text-blue-700 dark:bg-blue-950/20 dark:text-blue-300">{t.queueReadyLabel || 'Agendáveis'}: {executableSignalsCount}</span>
                  <span className="rounded-full bg-rose-50 px-2.5 py-1 font-bold text-rose-700 dark:bg-rose-950/20 dark:text-rose-300">{t.errors}: {invalidCount}</span>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 font-bold text-amber-700 dark:bg-amber-950/20 dark:text-amber-300">{t.ignoredLabel || 'Ignorados'}: {ignoredCount || 0}</span>
                </div>
              </div>

              {nextExecutionSignal ? (
                <div className="min-w-[220px] rounded-[24px] border border-blue-200 bg-gradient-to-br from-blue-50 to-white px-4 py-3 text-blue-700 shadow-sm dark:border-blue-900/40 dark:from-blue-950/20 dark:to-[#0B1220] dark:text-blue-300">
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-70">Próxima ordem</div>
                  <div className="mt-1 text-sm font-black">
                    {nextExecutionSignal.asset} {nextExecutionSignal.timeOrRate} {nextExecutionSignal.action}
                  </div>
                  <div className="mt-1 text-[11px]">{formatCountdown(nextExecutionSignal?.secondsToSignal ?? null)}</div>
                </div>
              ) : null}
            </div>

            <ScrollableTableShell minWidthClass="min-w-[980px]" hintLabel={t.swipeHint || 'Swipe'}>
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="sticky top-0 bg-white/95 text-[11px] font-bold uppercase text-gray-400 backdrop-blur dark:bg-[#111827]/95 dark:text-[#94A3B8]">
                    <th className="px-3 py-3.5 whitespace-nowrap">{t.ignoreLabel || 'Ignorar'}</th>
                    <th className="px-3 py-3.5 whitespace-nowrap">{t.status}</th>
                    <th className="px-3 py-3.5 whitespace-nowrap">TF</th>
                    <th className="px-3 py-3.5 whitespace-nowrap">{t.asset}</th>
                    <th className="px-3 py-3.5 whitespace-nowrap">{t.timeRate}</th>
                    <th className="px-3 py-3.5 whitespace-nowrap">{t.action}</th>
                    <th className="px-3 py-3.5 whitespace-nowrap">Conta</th>
                    <th className="px-3 py-3.5 whitespace-nowrap">Valor</th>
                    <th className="px-3 py-3.5 whitespace-nowrap">{t.open || 'Abrir'}</th>
                    <th className="px-3 py-3.5 whitespace-nowrap">{t.information}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 text-[12px] dark:divide-[#1F2A3A]">
                  {parsedSignals.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="p-8 text-center text-gray-400 dark:text-[#64748B]">
                        {isSignalsLoading
                          ? t.loadingSignals
                          : sourceMode === 'published'
                            ? (t.waitingDailyList || 'Aguardando lista diária publicada pelo admin para esta data.')
                            : t.noSignalsFound}
                      </td>
                    </tr>
                  ) : (
                    (signalRuntimeRows || []).map((sig, index) => {
                      const rowStatus = getRowStatusMeta(sig);
                      return (
                        <tr key={`${sig.signalKey}_${index}`} className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-[#101826] ${sig.isIgnored ? 'opacity-60' : ''}`}>
                          <td className="px-3 py-3.5 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={Boolean(sig.isIgnored)}
                              disabled={isLocked || !toggleSignalIgnored || isExclusionsSaving || !selectedAsset}
                              onChange={(e) => toggleSignalIgnored?.(sig.signalKey, sig.lineNumber, e.target.checked)}
                              className="h-4 w-4 accent-[#FF6B00] disabled:opacity-60"
                            />
                          </td>

                          <td className="px-3 py-3.5 whitespace-nowrap">
                            <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${rowStatus.cls}`}>
                              {rowStatus.label}
                            </span>
                          </td>

                          <td className="px-3 py-3.5 whitespace-nowrap font-mono text-gray-600 dark:text-[#CBD5E1]">{sig.timeframe}</td>
                          <td className="px-3 py-3.5 whitespace-nowrap font-bold text-gray-800 dark:text-[#F8FAFC]">{sig.asset}</td>
                          <td className="px-3 py-3.5 whitespace-nowrap font-mono text-gray-600 dark:text-[#94A3B8]">{sig.timeOrRate}</td>
                          <td className="px-3 py-3.5 whitespace-nowrap">
                            <span className={`inline-flex min-w-[58px] justify-center rounded px-2 py-1 font-bold ${
                              sig.action === 'CALL'
                                ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300'
                                : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                            }`}>
                              {sig.action}
                            </span>
                          </td>

                          <td className="px-3 py-3.5 whitespace-nowrap">
                            {sig.isValid && sig.isScheduledTime ? (
                              <select
                                value={sig.accountTypeOverride || ''}
                                onChange={(e) => setSignalAccountTypeOverride?.(sig.signalKey, e.target.value)}
                                disabled={isLocked || !setSignalAccountTypeOverride}
                                className="min-w-[92px] rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[11px] font-bold text-gray-700 disabled:opacity-60 dark:border-[#334155] dark:bg-[#0B1220] dark:text-[#CBD5E1]"
                              >
                                <option value="">Auto ({sig.effectiveAccountType})</option>
                                <option value="Demo">Demo</option>
                                <option value="Real">Real</option>
                              </select>
                            ) : (
                              <span className="text-[10px] text-gray-400">{sig.effectiveAccountType || '-'}</span>
                            )}
                          </td>

                          <td className="px-3 py-3.5 whitespace-nowrap">
                            {sig.isValid && sig.isScheduledTime ? (
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                inputMode="decimal"
                                value={sig.amountOverride || ''}
                                onChange={(e) => setSignalAmountOverride?.(sig.signalKey, e.target.value)}
                                disabled={isLocked || !setSignalAmountOverride}
                                placeholder={sig.effectiveAmount ? `Auto (${sig.effectiveAmount.toFixed(2)})` : 'Auto'}
                                className="w-[104px] rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[11px] font-bold text-gray-700 disabled:opacity-60 dark:border-[#334155] dark:bg-[#0B1220] dark:text-[#CBD5E1]"
                              />
                            ) : (
                              <span className="text-[10px] text-gray-400">{sig.effectiveAmount ? sig.effectiveAmount.toFixed(2) : '-'}</span>
                            )}
                          </td>

                          <td className="px-3 py-3.5 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <button
                                type="button"
                                disabled={!sig.isValid || !handleOpenInBroker}
                                onClick={() => handleOpenInBroker?.(sig)}
                                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#1F2A3A] dark:bg-[#0B1220] dark:text-[#CBD5E1] dark:hover:bg-[#111827]"
                              >
                                <Icons.Link />
                                {isExecutionAutomatic ? (t.openBrokerAction || 'Abrir') : (t.openBrokerActionManual || 'Abrir')}
                              </button>

                              {sig.isValid && sig.isScheduledTime ? (
                                <div className="flex flex-wrap gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleSignalManualResult?.(sig, 'manual_executed')}
                                    className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
                                  >
                                    OK
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSignalManualResult?.(sig, 'manual_failed')}
                                    className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300"
                                  >
                                    Falhou
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </td>

                          <td className="min-w-[240px] px-3 py-3.5 text-[10px] text-gray-500 dark:text-[#94A3B8]">
                            <div className="space-y-1">
                              <div className="font-bold text-gray-700 dark:text-[#E2E8F0]">
                                {runtimeByKey[sig.signalKey]?.runtimeLabel || (sig.isValid ? 'Pronto' : sig.error)}
                              </div>
                              {sig.isScheduledTime ? (
                                <div>
                                  Countdown: <span className="font-mono">{formatCountdown(runtimeByKey[sig.signalKey]?.secondsToSignal ?? null)}</span>
                                </div>
                              ) : null}
                              <div>
                                Conta: <span className="font-bold text-gray-700 dark:text-[#E2E8F0]">{sig.effectiveAccountType || 'Demo'}</span>
                              </div>
                              <div>
                                Valor: <span className="font-bold text-gray-700 dark:text-[#E2E8F0]">{sig.effectiveAmount ? sig.effectiveAmount.toFixed(2) : '-'}</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </ScrollableTableShell>
          </div>
        </div>
      </div>
    </div>
  );
}
