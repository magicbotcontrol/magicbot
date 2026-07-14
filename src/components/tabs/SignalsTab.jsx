import { useEffect, useMemo, useState } from 'react';
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
  botRecentEvents,
  isBotQueueLoading,
  botDayJobs,
  isBotDayJobsLoading,
  workerNode,
  workerCommands,
  workerAttempts,
  isWorkerRuntimeLoading,
  isWorkerBlueprintAvailable,
  workerCommandPendingType,
  isBotActionLoading,
  handleRefreshRuntime,
  handleForceReleaseLease,
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
  selectedBrokerItem,
  selectedAccountType,
  isBrokerLinked,
  linkedBrokersCount,
  isBrokerExecutionAutomatic,
  executionMode,
  leadWindowSeconds,
  isSimulationMode,
  nextExecutionSignal,
  runtimeTimeline,
  timelineCounts,
  clearRuntimeTimeline,
  handleSignalManualResult,
  signalRuntimeRows,
  setSignalAccountTypeOverride,
  setSignalAmountOverride
}) {
  const [assetInput, setAssetInput] = useState(selectedAsset || '');
  const [dayJobsFilter, setDayJobsFilter] = useState('pending');
  const [retryMinMinutesLeft, setRetryMinMinutesLeft] = useState(1);
  const [workerHealthHistory, setWorkerHealthHistory] = useState([]);
  const isLocked = botStatus === 'running';
  const isSyncLocked = isBotStatusSyncing;
  const isInteractionLocked = isLocked || isSyncLocked;
  const canToggleBot = botStatus === 'running' || canStartBot;
  const invalidCount = parsedSignals.filter((signal) => !signal.isValid).length;
  const isExecutionAutomatic = Boolean(isBrokerExecutionAutomatic);
  const runtimeByKey = useMemo(
    () => Object.fromEntries((signalRuntimeRows || []).map((signal) => [signal.signalKey, signal])),
    [signalRuntimeRows]
  );
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
  const editorLockMessage = (() => {
    if (isSyncLocked) {
      return t.botSyncingHint || 'Estamos confirmando o status mais recente do bot no backend. Assim que a sincronização terminar, a aba libera ou trava os controles automaticamente.';
    }
    if (isLocked) {
      return t.editorLockedByBot || 'Pause a automação para voltar a editar a lista, trocar filtros e ajustar o ativo.';
    }
    if (sourceMode === 'published') {
      return t.editorLockedByPublished || 'A fonte "Sala publicada" é protegida. Clique em "Copiar para Minha Lista" para editar sem mexer na lista do admin.';
    }
    if (!canEditSignals) {
      return t.editorLockedByPlan || 'Seu acesso atual permite consultar a lista, mas não editar este painel.';
    }
    return t.editorReadyHint || 'Editor liberado. Você pode ajustar filtros, editar a lista e salvar antes de iniciar a fila.';
  })();
  const executionModeHint = isExecutionAutomatic
    ? (t.executionAutoHint || 'Execução automática ativa na corretora selecionada.')
    : (t.executionManualHint || 'No estado atual deste projeto, a fila agenda e acompanha os sinais, mas a abertura na corretora ainda depende da ação do usuário.');

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

  const formatDateTime = (iso) => {
    try {
      if (!iso) return 'sem horário';
      return new Date(iso).toLocaleString();
    } catch {
      return 'sem horário';
    }
  };

  const formatMoneyValue = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) return '-';
    return amount.toFixed(2);
  };

  const getJobEffectiveAccountType = (job) => {
    if (job?.account_type_override === 'Real' || job?.account_type_override === 'Demo') {
      return {
        value: job.account_type_override,
        source: 'job'
      };
    }

    if (selectedBotInstance?.account_type === 'Real' || selectedBotInstance?.account_type === 'Demo') {
      return {
        value: selectedBotInstance.account_type,
        source: 'bot'
      };
    }

    return {
      value: botExecutionAccountType || 'Demo',
      source: 'bot'
    };
  };

  const getJobEffectiveAmount = (job) => {
    const jobAmount = Number(job?.entry_amount);
    if (Number.isFinite(jobAmount) && jobAmount > 0) {
      return {
        value: jobAmount,
        source: 'job'
      };
    }

    const botAmount = Number(selectedBotInstance?.default_order_amount);
    if (Number.isFinite(botAmount) && botAmount > 0) {
      return {
        value: botAmount,
        source: 'bot'
      };
    }

    return {
      value: null,
      source: 'worker'
    };
  };

  const getSourceLabel = (source, type = 'amount') => {
    if (source === 'job' || source === 'trade_job') return 'override do job';
    if (source === 'bot' || source === 'bot_instance') return 'padrão do bot';
    if (source === 'bot_payload') return 'payload do bot';
    if (source === 'env_default') return type === 'account' ? 'fallback global' : 'fallback global';
    if (source === 'global') return 'valor global';
    if (source === 'line') return 'override da linha';
    return 'fallback do worker';
  };

  const formatCountdown = (seconds) => {
    if (seconds === null || Number.isNaN(Number(seconds))) return '--';
    const total = Math.abs(Number(seconds));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    const base = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    return seconds < 0 ? `-${base}` : base;
  };

  const formatRelativeTime = (iso) => {
    if (!iso) return 'sem registro';
    const diffMs = Date.now() - new Date(iso).getTime();
    if (Number.isNaN(diffMs)) return 'sem registro';
    const diffSec = Math.max(Math.round(diffMs / 1000), 0);
    if (diffSec < 60) return `${diffSec}s atrás`;
    const diffMin = Math.round(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m atrás`;
    const diffHour = Math.round(diffMin / 60);
    return `${diffHour}h atrás`;
  };

  const renderWorkerStatus = (status) => {
    const value = String(status || 'offline').toLowerCase();
    if (value === 'online') return { label: 'Online', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' };
    if (value === 'degraded') return { label: 'Degradado', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' };
    return { label: 'Offline', cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' };
  };

  const renderBrokerSessionStatus = (state) => {
    const value = String(state || '').toLowerCase();
    if (value === 'session_connected') {
      return {
        label: 'Conectada',
        cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
      };
    }
    if (value === 'session_login_failed') {
      return {
        label: 'Falha no login',
        cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
      };
    }
    if (value === 'session_ready') {
      return {
        label: 'Pronta para sessao',
        cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
      };
    }
    if (value === 'credentials_ready') {
      return {
        label: 'Credencial pronta',
        cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
      };
    }
    if (value === 'linked') {
      return {
        label: 'Vinculada',
        cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
      };
    }
    return {
      label: 'Nao vinculada',
      cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
    };
  };

  const renderAttemptStatus = (status) => {
    const value = String(status || '').toLowerCase();
    if (value === 'executed') return { label: 'Executada', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' };
    if (value === 'failed') return { label: 'Falhou', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300' };
    if (value === 'expired') return { label: 'Expirada', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' };
    if (value === 'cancelled') return { label: 'Cancelada', cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' };
    return { label: 'Iniciada', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' };
  };

  const renderCommandStatus = (status) => {
    const value = String(status || '').toLowerCase();
    if (value === 'completed') return { label: 'Concluído', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' };
    if (value === 'failed') return { label: 'Falhou', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300' };
    if (value === 'cancelled') return { label: 'Cancelado', cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' };
    if (value === 'acknowledged') return { label: 'ACK', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' };
    return { label: 'Pendente', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' };
  };

  const leaseExpiresAt = selectedBotInstance?.lease_expires_at ? new Date(selectedBotInstance.lease_expires_at) : null;
  const leaseAcquiredAt = selectedBotInstance?.lease_acquired_at ? new Date(selectedBotInstance.lease_acquired_at) : null;
  const lastHeartbeatAt = workerNode?.last_heartbeat_at || selectedBotInstance?.last_heartbeat_at || null;
  const leaseDiffSeconds = leaseExpiresAt ? Math.round((leaseExpiresAt.getTime() - Date.now()) / 1000) : null;
  const leaseAgeSeconds = leaseAcquiredAt ? Math.max(0, Math.round((Date.now() - leaseAcquiredAt.getTime()) / 1000)) : null;
  const heartbeatAgeSeconds = lastHeartbeatAt ? Math.max(0, Math.round((Date.now() - new Date(lastHeartbeatAt).getTime()) / 1000)) : null;
  const isLeaseActive = Boolean(leaseExpiresAt && leaseDiffSeconds > 0);
  const workerStatusMeta = renderWorkerStatus(workerNode?.status || (selectedBotInstance?.assigned_worker_id ? 'degraded' : 'offline'));
  const brokerSessionSync = selectedBotInstance?.last_sync_payload?.broker_session || null;
  const brokerSessionStatus = renderBrokerSessionStatus(
    brokerSessionSync?.state || (selectedBrokerItem?.status === 'Linked' ? 'linked' : 'unlinked')
  );
  const brokerOperationalMeta = (() => {
    if (!selectedBrokerItem || selectedBrokerItem.status !== 'Linked') {
      return {
        label: 'Nao vinculada',
        cls: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300',
        hint: 'A corretora selecionada ainda nao possui referencia segura vinculada.'
      };
    }
    if (String(brokerSessionSync?.state || '').toLowerCase() === 'session_login_failed') {
      return {
        label: 'Falha no login',
        cls: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300',
        hint: brokerSessionSync?.hint || 'O worker falhou ao iniciar a sessao operacional. Verifique as credenciais e tente novamente.'
      };
    }
    if (String(brokerSessionSync?.state || '').toLowerCase() === 'session_connected') {
      return {
        label: 'Sessao conectada',
        cls: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300',
        hint: brokerSessionSync?.hint || 'Sessao operacional iniciada pelo worker.'
      };
    }
    if (String(brokerSessionSync?.state || '').toLowerCase() === 'session_ready') {
      return {
        label: 'Pronta para sessao operacional',
        cls: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300',
        hint: brokerSessionSync?.hint || 'O worker validou a referencia segura e o adapter respondeu ao healthcheck.'
      };
    }
    if (selectedBrokerItem.workerAuthReady) {
      return {
        label: 'Apenas vinculada',
        cls: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300',
        hint: brokerSessionSync?.hint || 'A referencia segura existe, mas o worker ainda nao confirmou a sessao operacional.'
      };
    }
    return {
      label: 'Pendente',
      cls: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300',
      hint: 'Existe selecao de corretora, mas a referencia segura ainda nao ficou pronta.'
    };
  })();
  const isRefreshingRuntime = workerCommandPendingType === 'refresh_runtime';
  const isForcingLeaseRelease = workerCommandPendingType === 'force_release_lease';
  const isWorkerDegraded = ['degraded', 'offline'].includes(String(workerNode?.status || '').toLowerCase());
  const isHeartbeatStale = Boolean(selectedBotInstance?.assigned_worker_id && heartbeatAgeSeconds !== null && heartbeatAgeSeconds > 90);
  const isLeaseExpired = Boolean(selectedBotInstance?.lease_token && !isLeaseActive);
  const isRuntimeDegraded = String(selectedBotInstance?.runtime_status || '').toLowerCase() === 'degraded';
  const isBotStuck = Boolean(
    botStatus === 'running'
    && selectedBotInstance?.assigned_worker_id
    && (isHeartbeatStale || isLeaseExpired || isRuntimeDegraded)
  );
  const healthMeta = (() => {
    if (isBotStuck) {
      return {
        key: 'stuck',
        label: 'Bot preso',
        cls: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300',
        hint: 'O bot continua marcado como ativo, mas lease, heartbeat ou runtime indicam que ele precisa de intervenção.'
      };
    }
    if (isRuntimeDegraded || isWorkerDegraded) {
      return {
        key: 'degraded',
        label: 'Degradado',
        cls: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300',
        hint: 'Existe sinal de degradação no worker ou no runtime. Vale revisar heartbeat, lease e comandos recentes.'
      };
    }
    if (selectedBotInstance?.assigned_worker_id && isLeaseActive && !isHeartbeatStale) {
      return {
        key: 'healthy',
        label: 'Saudável',
        cls: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300',
        hint: 'Worker designado, heartbeat recente e lease ativo.'
      };
    }
    return {
      key: 'idle',
      label: 'Sem worker ativo',
      cls: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300',
      hint: 'Ainda não existe um worker designado com lease ativo para este bot.'
    };
  })();
  const workerHealthStorageKey = useMemo(
    () => (selectedBotInstance?.id ? `magicbot_worker_health_${selectedBotInstance.id}` : `magicbot_worker_health_slot_${botSlot || 1}`),
    [selectedBotInstance?.id, botSlot]
  );
  const commandStatusSummary = useMemo(() => {
    const base = { pending: 0, acknowledged: 0, completed: 0, failed: 0, cancelled: 0 };
    (workerCommands || []).forEach((command) => {
      const key = String(command?.status || 'pending').toLowerCase();
      if (Object.prototype.hasOwnProperty.call(base, key)) {
        base[key] += 1;
      }
    });
    return base;
  }, [workerCommands]);

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
  const latestAttemptByJobId = useMemo(() => {
    const map = {};

    (workerAttempts || []).forEach((attempt) => {
      const jobId = String(attempt?.job_id || '').trim();
      if (!jobId) return;

      const current = map[jobId];
      const attemptTime = new Date(attempt?.started_at || 0).getTime();
      const currentTime = new Date(current?.started_at || 0).getTime();

      if (!current || attemptTime >= currentTime) {
        map[jobId] = attempt;
      }
    });

    return map;
  }, [workerAttempts]);

  useEffect(() => {
    setAssetInput(selectedAsset || '');
  }, [selectedAsset]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(workerHealthStorageKey);
      setWorkerHealthHistory(stored ? JSON.parse(stored) : []);
    } catch {
      setWorkerHealthHistory([]);
    }
  }, [workerHealthStorageKey]);

  useEffect(() => {
    if (!workerHealthStorageKey) return;
    const nextEntry = {
      id: `${healthMeta.key}-${Date.now()}`,
      statusKey: healthMeta.key,
      label: healthMeta.label,
      hint: healthMeta.hint,
      createdAt: new Date().toISOString(),
      workerKey: workerNode?.worker_key || selectedBotInstance?.assigned_worker_id || 'Nenhum worker',
      runtimeStatus: selectedBotInstance?.runtime_status || 'idle',
      desiredStatus: selectedBotInstance?.desired_status || botStatus,
      heartbeatAgeSeconds,
      leaseAgeSeconds,
      leaseDiffSeconds
    };

    setWorkerHealthHistory((prev) => {
      const current = Array.isArray(prev) ? prev : [];
      if (current[0]?.statusKey === nextEntry.statusKey) {
        return current;
      }

      const updated = [nextEntry, ...current].slice(0, 12);
      try {
        window.localStorage.setItem(workerHealthStorageKey, JSON.stringify(updated));
      } catch {
        // Ignore persistence failures and keep in-memory history.
      }
      return updated;
    });
  }, [
    workerHealthStorageKey,
    healthMeta.key,
    healthMeta.label,
    healthMeta.hint,
    workerNode?.worker_key,
    selectedBotInstance?.assigned_worker_id,
    selectedBotInstance?.runtime_status,
    selectedBotInstance?.desired_status,
    botStatus,
    heartbeatAgeSeconds,
    leaseAgeSeconds,
    leaseDiffSeconds
  ]);

  const clearWorkerHealthHistory = () => {
    setWorkerHealthHistory([]);
    try {
      window.localStorage.removeItem(workerHealthStorageKey);
    } catch {
      // Ignore storage cleanup failures.
    }
  };

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
            <FlowBadge
              label={t.executionModeLabel || 'Execução'}
              value={isExecutionAutomatic ? (t.executionModeAutomatic || 'Automática') : (t.executionModeAssisted || 'Assistida')}
              tone={isExecutionAutomatic ? 'success' : 'warning'}
            />
          </div>
          <div className="mt-4 rounded-xl border border-gray-200 dark:border-[#334155] bg-gray-50/70 dark:bg-[#0B1220] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                  Execução do bot
                </div>
                <div className="mt-1 text-[11px] text-gray-500 dark:text-[#94A3B8]">
                  Conta e valor padrão usados pelo worker quando o job não trouxer override próprio.
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                  Conta do bot
                </label>
                <select
                  value={botExecutionAccountType}
                  disabled={isInteractionLocked || isBotExecutionConfigSaving}
                  onChange={(e) => setBotExecutionAccountType?.(e.target.value)}
                  className={`mt-1 w-full text-xs border border-gray-200 dark:border-[#334155] dark:bg-[#1E293B] rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] disabled:opacity-60 ${syncControlClass}`}
                >
                  <option value="Demo">Demo</option>
                  <option value="Real">Real</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                  Valor padrão por ordem
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={botDefaultOrderAmountInput}
                  disabled={isInteractionLocked || isBotExecutionConfigSaving}
                  onChange={(e) => setBotDefaultOrderAmountInput?.(e.target.value)}
                  className={`mt-1 w-full text-xs border border-gray-200 dark:border-[#334155] dark:bg-[#1E293B] rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] disabled:opacity-60 ${syncControlClass}`}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleSaveBotExecutionConfig?.()}
              disabled={isInteractionLocked || isBotExecutionConfigSaving || !handleSaveBotExecutionConfig}
              className={`mt-3 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-60 dark:border-[#334155] dark:bg-[#111827] dark:text-[#CBD5E1] dark:hover:bg-[#162033] ${syncControlClass}`}
            >
              {isBotExecutionConfigSaving ? 'Salvando configuração do bot...' : 'Salvar configuração do bot'}
            </button>
          </div>
          <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[11px] text-gray-500 dark:border-[#334155] dark:bg-[#0F172A] dark:text-[#94A3B8]">
            {`Minha Conta: ${linkedBrokersCount || 0} corretora(s) vinculada(s). Configurações define qual delas fica ativa no AutoTrader (Lista).`}
          </div>
          <div className={`mt-3 rounded-xl border px-3 py-2 text-[11px] leading-5 ${
            isExecutionAutomatic
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300'
              : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300'
          }`}>
            {executionModeHint}
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
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                  Worker externo
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-[#94A3B8]">
                  Lease, heartbeat, runtime e comandos recentes.
                </div>
              </div>
              <span className="text-[10px] text-gray-400">
                {isWorkerRuntimeLoading ? (t.loading || '...') : ''}
              </span>
            </div>

            {isWorkerBlueprintAvailable ? (
              <>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleRefreshRuntime?.()}
                    disabled={!handleRefreshRuntime || isRefreshingRuntime}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[11px] font-bold text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-60 dark:border-[#1F2A3A] dark:bg-[#111827] dark:text-[#CBD5E1] dark:hover:bg-[#162033]"
                  >
                    {isRefreshingRuntime ? 'Enviando refresh...' : 'Refresh runtime'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!window.confirm('Enviar comando para forçar a liberação do lease deste bot?')) return;
                      handleForceReleaseLease?.();
                    }}
                    disabled={!handleForceReleaseLease || isForcingLeaseRelease}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-60 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300"
                  >
                    {isForcingLeaseRelease ? 'Enviando release...' : 'Force release lease'}
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className={`sm:col-span-2 rounded-xl border px-3 py-3 ${healthMeta.cls}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-70">
                          Health operacional
                        </div>
                        <div className="mt-1 text-sm font-black">
                          {healthMeta.label}
                        </div>
                      </div>
                      {isBotStuck ? (
                        <span className="inline-flex rounded-full bg-white/60 px-2 py-1 text-[10px] font-bold dark:bg-black/10">
                          Ação recomendada
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 text-[11px] leading-5">
                      {healthMeta.hint}
                    </div>
                  </div>
                  <div className={`sm:col-span-2 rounded-xl border px-3 py-3 ${brokerOperationalMeta.cls}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-70">
                          Sessao da corretora
                        </div>
                        <div className="mt-1 text-sm font-black">
                          {brokerOperationalMeta.label}
                        </div>
                      </div>
                      <span className={`inline-flex rounded px-2 py-1 text-[10px] font-bold ${brokerSessionStatus.cls}`}>
                        {brokerSessionStatus.label}
                      </span>
                    </div>
                    <div className="mt-2 text-[11px] leading-5">
                      {brokerOperationalMeta.hint}
                    </div>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] opacity-80">
                      <div>
                        Referencia: <span className="font-bold">{selectedBrokerItem?.emailMasked || brokerSessionSync?.credential_email_masked || '-'}</span>
                      </div>
                      <div>
                        Auth mode: <span className="font-bold">{selectedBrokerItem?.authMode === 'email_password' ? 'Email + senha' : (brokerSessionSync?.auth_mode || '-')}</span>
                      </div>
                      <div>
                        Ref segura: <span className="font-bold">{selectedBrokerItem?.credentialReference || brokerSessionSync?.credential_reference || '-'}</span>
                      </div>
                      <div>
                        Ultima checagem: <span className="font-bold">{formatRelativeTime(brokerSessionSync?.checked_at || selectedBrokerItem?.credentialsUpdatedAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-[#1F2A3A] dark:bg-[#111827]">
                    <div className="text-gray-400">Status do worker</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`inline-flex rounded px-2 py-1 text-[10px] font-bold ${workerStatusMeta.cls}`}>
                        {workerStatusMeta.label}
                      </span>
                      <span className="font-bold text-gray-700 dark:text-[#E2E8F0]">
                        {workerNode?.worker_key || 'Aguardando vínculo'}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-[#1F2A3A] dark:bg-[#111827]">
                    <div className="text-gray-400">Lease do bot</div>
                    <div className="mt-1 font-bold text-gray-700 dark:text-[#E2E8F0]">
                      {isLeaseActive ? `Ativo por ${leaseDiffSeconds}s` : (selectedBotInstance?.lease_token ? 'Expirado / pendente' : 'Sem lease')}
                    </div>
                    <div className="mt-1 text-[10px] text-gray-400">
                      idade {leaseAgeSeconds !== null ? `${leaseAgeSeconds}s` : 'sem registro'}
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-[#1F2A3A] dark:bg-[#111827]">
                    <div className="text-gray-400">Runtime do bot</div>
                    <div className="mt-1 font-bold text-gray-700 dark:text-[#E2E8F0]">
                      {selectedBotInstance?.runtime_status || 'idle'} • desejo {selectedBotInstance?.desired_status || botStatus}
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-[#1F2A3A] dark:bg-[#111827]">
                    <div className="text-gray-400">Heartbeat</div>
                    <div className="mt-1 font-bold text-gray-700 dark:text-[#E2E8F0]">
                      {formatRelativeTime(lastHeartbeatAt)}
                    </div>
                    <div className="mt-1 text-[10px] text-gray-400">
                      idade {heartbeatAgeSeconds !== null ? `${heartbeatAgeSeconds}s` : 'sem registro'}
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-[#1F2A3A] dark:bg-[#111827]">
                    <div className="text-gray-400">Worker designado</div>
                    <div className="mt-1 font-bold text-gray-700 dark:text-[#E2E8F0] truncate">
                      {workerNode?.worker_key || selectedBotInstance?.assigned_worker_id || 'Nenhum worker'}
                    </div>
                    <div className="mt-1 text-[10px] text-gray-400">
                      {selectedBotInstance?.assigned_worker_id ? 'slot com lease associado' : 'aguardando claim'}
                    </div>
                  </div>
                </div>

                {isBotStuck ? (
                  <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
                    O bot parece preso: worker sem heartbeat recente, lease expirado ou runtime degradado. Use `Refresh runtime` e, se necessário, `Force release lease`.
                  </div>
                ) : null}

                <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 dark:border-[#1F2A3A] dark:bg-[#111827]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                        Histórico de health
                      </div>
                      <div className="mt-1 text-[11px] text-gray-500 dark:text-[#94A3B8]">
                        Registra quando o bot degradou, recuperou, travou ou ficou sem worker.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearWorkerHealthHistory}
                      className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[10px] font-bold text-gray-600 transition-colors hover:bg-gray-100 dark:border-[#334155] dark:bg-[#0B1220] dark:text-[#CBD5E1] dark:hover:bg-[#162033]"
                    >
                      Limpar
                    </button>
                  </div>

                  <div className="mt-3 max-h-[220px] space-y-2 overflow-auto pr-1 custom-scrollbar">
                    {workerHealthHistory.length ? (
                      workerHealthHistory.map((entry) => {
                        const tone =
                          entry.statusKey === 'healthy'
                            ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20'
                            : entry.statusKey === 'degraded'
                              ? 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20'
                              : entry.statusKey === 'stuck'
                                ? 'border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/20'
                                : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40';

                        return (
                          <div
                            key={entry.id}
                            className={`rounded-xl border px-3 py-2 text-[11px] ${tone}`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-black text-gray-800 dark:text-[#F8FAFC]">
                                {entry.label}
                              </div>
                              <div className="text-[10px] text-gray-400">
                                {formatEventTime(entry.createdAt)}
                              </div>
                            </div>
                            <div className="mt-1 text-gray-600 dark:text-[#CBD5E1]">
                              {entry.hint}
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-gray-500 dark:text-[#94A3B8]">
                              <div>Worker: <span className="font-bold">{entry.workerKey}</span></div>
                              <div>Runtime: <span className="font-bold">{entry.runtimeStatus}</span></div>
                              <div>Heartbeat: <span className="font-bold">{entry.heartbeatAgeSeconds ?? '-'}s</span></div>
                              <div>Lease: <span className="font-bold">{entry.leaseDiffSeconds ?? '-'}s</span></div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-200 px-3 py-4 text-[11px] text-gray-400 dark:border-[#334155] dark:text-[#64748B]">
                        Assim que o estado do worker mudar, as transições de saúde vão aparecer aqui.
                      </div>
                    )}
                  </div>
                </div>

                {selectedBotInstance?.last_runtime_error ? (
                  <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
                    Último erro de runtime: {selectedBotInstance.last_runtime_error}
                  </div>
                ) : null}

                <div className="mt-3">
                  <div className="mb-2 text-[11px] text-gray-500 dark:text-[#94A3B8]">
                    `Start` e `Stop` são enviados pelo botão principal da automação. Aqui você controla os comandos técnicos do runtime.
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-[11px]">
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-2 dark:border-amber-900/40 dark:bg-amber-950/20">
                      <div className="text-amber-700 dark:text-amber-300">Pending</div>
                      <div className="font-black text-amber-700 dark:text-amber-300">{commandStatusSummary.pending}</div>
                    </div>
                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-2 dark:border-blue-900/40 dark:bg-blue-950/20">
                      <div className="text-blue-700 dark:text-blue-300">Acknowledged</div>
                      <div className="font-black text-blue-700 dark:text-blue-300">{commandStatusSummary.acknowledged}</div>
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-2 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                      <div className="text-emerald-700 dark:text-emerald-300">Completed</div>
                      <div className="font-black text-emerald-700 dark:text-emerald-300">{commandStatusSummary.completed}</div>
                    </div>
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-2 dark:border-rose-900/40 dark:bg-rose-950/20">
                      <div className="text-rose-700 dark:text-rose-300">Failed</div>
                      <div className="font-black text-rose-700 dark:text-rose-300">{commandStatusSummary.failed}</div>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                    Comandos recentes
                  </div>
                  <div className="mt-2 space-y-1">
                    {(workerCommands || []).length ? (
                      workerCommands.slice(0, 4).map((command) => {
                        const meta = renderCommandStatus(command.status);
                        return (
                          <div
                            key={command.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-[#1F2A3A] bg-gray-50 dark:bg-[#111827] px-2 py-2"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-[11px] font-bold text-gray-800 dark:text-[#F8FAFC]">
                                {String(command.command_type || '').replaceAll('_', ' ')}
                              </div>
                              <div className="text-[10px] text-gray-400">
                                criado {formatRelativeTime(command.created_at)}
                              </div>
                              <div className="mt-1 text-[10px] text-gray-500 dark:text-[#94A3B8]">
                                {command.status === 'acknowledged' && `ACK em ${formatDateTime(command.acknowledged_at)}`}
                                {command.status === 'completed' && `Concluído em ${formatDateTime(command.completed_at)}`}
                                {command.status === 'failed' && `Falhou em ${formatDateTime(command.completed_at)}`}
                                {command.status === 'pending' && 'Aguardando consumo do worker'}
                                {command.status === 'cancelled' && `Cancelado em ${formatDateTime(command.completed_at)}`}
                              </div>
                              {command.result_payload && Object.keys(command.result_payload).length ? (
                                <div className="mt-1 text-[10px] text-gray-400 truncate">
                                  {JSON.stringify(command.result_payload)}
                                </div>
                              ) : null}
                            </div>
                            <span className={`inline-flex rounded px-2 py-1 text-[10px] font-bold ${meta.cls}`}>
                              {meta.label}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-lg border border-dashed border-gray-200 px-3 py-3 text-[11px] text-gray-400 dark:border-[#334155] dark:text-[#64748B]">
                        Nenhum comando recente para este bot.
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-gray-200 px-3 py-4 text-[11px] text-gray-400 dark:border-[#334155] dark:text-[#64748B]">
                O blueprint do worker externo ainda não apareceu neste workspace. Depois de aplicar a migração no Supabase, este painel passa a mostrar worker, lease, comandos e runtime.
              </div>
            )}
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
                    const jobAccount = getJobEffectiveAccountType(job);
                    const jobAmount = getJobEffectiveAmount(job);
                    const latestAttempt = latestAttemptByJobId[job.id] || null;
                    const latestAttemptMeta = latestAttempt ? renderAttemptStatus(latestAttempt.status) : null;
                    const latestAttemptPayload = latestAttempt?.result_payload || {};
                    const latestAttemptAccount = latestAttemptPayload.account_type || latestAttemptPayload.accountType || '-';
                    const latestAttemptAmount = latestAttemptPayload.configured_amount ?? latestAttemptPayload.amount ?? null;
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
                          <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-gray-500 dark:text-[#94A3B8]">
                            <div>
                              Conta: <span className="font-bold text-gray-700 dark:text-[#E2E8F0]">{jobAccount.value}</span>
                              <span className="text-gray-400"> ({getSourceLabel(jobAccount.source, 'account')})</span>
                            </div>
                            <div>
                              Valor: <span className="font-bold text-gray-700 dark:text-[#E2E8F0]">{formatMoneyValue(jobAmount.value)}</span>
                              <span className="text-gray-400"> ({getSourceLabel(jobAmount.source, 'amount')})</span>
                            </div>
                          </div>
                          <div className="mt-2 rounded-lg border border-dashed border-gray-200 px-2 py-2 text-[10px] dark:border-[#334155]">
                            {latestAttempt ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-700 dark:text-[#E2E8F0]">
                                    Última attempt
                                  </span>
                                  <span className={`inline-flex rounded px-2 py-0.5 text-[10px] font-bold ${latestAttemptMeta?.cls || 'bg-gray-100 text-gray-700'}`}>
                                    {latestAttemptMeta?.label || 'Sem status'}
                                  </span>
                                  <span className="text-gray-400">
                                    {formatRelativeTime(latestAttempt.started_at)}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-gray-500 dark:text-[#94A3B8]">
                                  <div>
                                    Conta exec.: <span className="font-bold text-gray-700 dark:text-[#E2E8F0]">{String(latestAttemptAccount)}</span>
                                  </div>
                                  <div>
                                    Valor exec.: <span className="font-bold text-gray-700 dark:text-[#E2E8F0]">{formatMoneyValue(latestAttemptAmount)}</span>
                                  </div>
                                  <div>
                                    Latência: <span className="font-bold text-gray-700 dark:text-[#E2E8F0]">{latestAttempt?.latency_ms ? `${latestAttempt.latency_ms} ms` : '-'}</span>
                                  </div>
                                  <div>
                                    Ref: <span className="font-bold text-gray-700 dark:text-[#E2E8F0]">{latestAttempt?.broker_order_ref || '-'}</span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-gray-400 dark:text-[#64748B]">
                                Ainda sem attempt recente carregada para este job.
                              </div>
                            )}
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
            <div className={`mt-3 rounded-xl border px-3 py-2 text-[11px] leading-5 ${
              isLocked || sourceMode === 'published' || isSyncLocked || !canEditSignals
                ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300'
            }`}>
              {editorLockMessage}
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

          <div className="mb-4 grid grid-cols-1 2xl:grid-cols-3 gap-4">
            <div className="2xl:col-span-2 rounded-2xl border border-gray-200 dark:border-[#1F2A3A] bg-gray-50 dark:bg-[#111827] p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                    Proxima ordem monitorada
                  </div>
                  {nextExecutionSignal ? (
                    <>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-white px-3 py-1 text-sm font-black text-gray-900 dark:bg-[#0B1220] dark:text-white">
                          {nextExecutionSignal.asset}
                        </span>
                        <span className="rounded-lg bg-white px-3 py-1 text-xs font-bold text-gray-700 dark:bg-[#0B1220] dark:text-[#CBD5E1]">
                          {nextExecutionSignal.timeframe}
                        </span>
                        <span className="rounded-lg bg-white px-3 py-1 text-xs font-bold text-gray-700 dark:bg-[#0B1220] dark:text-[#CBD5E1]">
                          {nextExecutionSignal.timeOrRate}
                        </span>
                        <span className={`rounded-lg px-3 py-1 text-xs font-bold ${
                          nextExecutionSignal.action === 'CALL'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                        }`}>
                          {nextExecutionSignal.action}
                        </span>
                      </div>
                      <div className="mt-3 text-xs text-gray-500 dark:text-[#94A3B8]">
                        Estado atual: <span className="font-bold text-gray-700 dark:text-[#E2E8F0]">{nextExecutionSignal.runtimeLabel}</span>
                      </div>
                    </>
                  ) : (
                    <div className="mt-2 text-sm text-gray-500 dark:text-[#94A3B8]">
                      Nenhuma ordem agendada no momento.
                    </div>
                  )}
                </div>

                <div className="min-w-[180px] rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-300">
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-70">
                    Contagem regressiva
                  </div>
                  <div className="mt-1 text-2xl font-black">
                    {formatCountdown(nextExecutionSignal?.secondsToSignal ?? null)}
                  </div>
                  <div className="mt-1 text-[11px] leading-5">
                    Antecipacao ativa: {leadWindowSeconds || 10}s. Modo atual: {isSimulationMode ? 'Simulacao / Paper' : 'Assistido'}.
                  </div>
                </div>
              </div>

              {nextExecutionSignal ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenInBroker?.(nextExecutionSignal)}
                    disabled={!nextExecutionSignal.isValid}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:border-[#334155] dark:bg-[#0B1220] dark:text-[#CBD5E1] dark:hover:bg-[#162033]"
                  >
                    <Icons.Link />
                    Abrir corretora agora
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSignalManualResult?.(nextExecutionSignal, 'manual_executed')}
                    disabled={!nextExecutionSignal.isValid}
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
                  >
                    Confirmar executada
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSignalManualResult?.(nextExecutionSignal, 'manual_failed')}
                    disabled={!nextExecutionSignal.isValid}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300"
                  >
                    Registrar falha
                  </button>
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-[#1F2A3A] bg-gray-50 dark:bg-[#111827] p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                  Linha do tempo
                </div>
                <button
                  type="button"
                  onClick={() => clearRuntimeTimeline?.()}
                  className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[10px] font-bold text-gray-600 transition-colors hover:bg-gray-100 dark:border-[#334155] dark:bg-[#0B1220] dark:text-[#CBD5E1] dark:hover:bg-[#162033]"
                >
                  Limpar logs
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-[#334155] dark:bg-[#0B1220]">
                  <div className="text-gray-400">Manuais OK</div>
                  <div className="font-black text-emerald-600">{timelineCounts?.manualExecuted || 0}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-[#334155] dark:bg-[#0B1220]">
                  <div className="text-gray-400">Falhas</div>
                  <div className="font-black text-rose-600">{timelineCounts?.manualFailed || 0}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-[#334155] dark:bg-[#0B1220]">
                  <div className="text-gray-400">Simuladas</div>
                  <div className="font-black text-blue-600">{timelineCounts?.simulated || 0}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-[#334155] dark:bg-[#0B1220]">
                  <div className="text-gray-400">Expiradas</div>
                  <div className="font-black text-amber-600">{timelineCounts?.expired || 0}</div>
                </div>
              </div>
              <div className="mt-3 max-h-[220px] overflow-auto custom-scrollbar space-y-2 pr-1">
                {(runtimeTimeline || []).length ? (
                  runtimeTimeline.slice(0, 12).map((entry) => (
                    <div key={entry.id} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] dark:border-[#334155] dark:bg-[#0B1220]">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold text-gray-800 dark:text-[#E2E8F0]">
                          {entry.asset || 'Sistema'} {entry.timeText ? `• ${entry.timeText}` : ''}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {formatEventTime(entry.createdAt)}
                        </div>
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-gray-400">
                        {String(entry.type || '').replaceAll('_', ' ')}
                      </div>
                      <div className="mt-1 text-gray-500 dark:text-[#94A3B8]">
                        {entry.note || `${entry.asset} ${entry.timeframe} ${entry.action}`}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-200 px-3 py-4 text-xs text-gray-400 dark:border-[#334155] dark:text-[#64748B]">
                    Os logs locais desta sessao aparecem aqui: enfileirada, pronta, aberta, simulada, falha e expirada.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mb-4 rounded-2xl border border-gray-200 dark:border-[#1F2A3A] bg-gray-50 dark:bg-[#111827] p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                  Tentativas recentes do worker
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-[#94A3B8]">
                  Cada claim do job gera uma tentativa operacional separada no Supabase.
                </div>
              </div>
              <div className="text-[10px] text-gray-400">
                {isWorkerRuntimeLoading ? (t.loading || '...') : ''}
              </div>
            </div>

            {(workerAttempts || []).length ? (
              <div className="mt-3 grid grid-cols-1 xl:grid-cols-2 gap-3">
                {workerAttempts.slice(0, 6).map((attempt) => {
                  const meta = renderAttemptStatus(attempt.status);
                  const attemptPayload = attempt?.result_payload || {};
                  const executedAccountType = attemptPayload.account_type || attemptPayload.accountType || '-';
                  const executedAmount = attemptPayload.configured_amount ?? attemptPayload.amount ?? null;
                  const accountSource = attemptPayload.account_type_source || null;
                  const amountSource = attemptPayload.amount_source || null;
                  const executionModeValue = attemptPayload.execution_mode || '-';
                  const brokerAdapterValue = attemptPayload.broker_adapter || '-';
                  return (
                    <div
                      key={attempt.id}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-3 dark:border-[#334155] dark:bg-[#0B1220]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-black text-gray-800 dark:text-[#F8FAFC]">
                            Attempt #{attempt.attempt_no || 1}
                          </div>
                          <div className="mt-1 text-[11px] text-gray-500 dark:text-[#94A3B8]">
                            Job {String(attempt.job_id || '').slice(0, 8)} • {formatRelativeTime(attempt.started_at)}
                          </div>
                        </div>
                        <span className={`inline-flex rounded px-2 py-1 text-[10px] font-bold ${meta.cls}`}>
                          {meta.label}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 dark:border-[#1F2A3A] dark:bg-[#111827]">
                          <div className="text-gray-400">Latência</div>
                          <div className="font-bold text-gray-700 dark:text-[#E2E8F0]">
                            {attempt.latency_ms ? `${attempt.latency_ms} ms` : '-'}
                          </div>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 dark:border-[#1F2A3A] dark:bg-[#111827]">
                          <div className="text-gray-400">Order ref</div>
                          <div className="font-bold text-gray-700 dark:text-[#E2E8F0] truncate">
                            {attempt.broker_order_ref || '-'}
                          </div>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 dark:border-[#1F2A3A] dark:bg-[#111827]">
                          <div className="text-gray-400">Conta executada</div>
                          <div className="font-bold text-gray-700 dark:text-[#E2E8F0]">
                            {String(executedAccountType)}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {getSourceLabel(accountSource, 'account')}
                          </div>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 dark:border-[#1F2A3A] dark:bg-[#111827]">
                          <div className="text-gray-400">Valor executado</div>
                          <div className="font-bold text-gray-700 dark:text-[#E2E8F0]">
                            {formatMoneyValue(executedAmount)}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {getSourceLabel(amountSource, 'amount')}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 dark:border-[#1F2A3A] dark:bg-[#111827]">
                          <div className="text-gray-400">Modo</div>
                          <div className="font-bold text-gray-700 dark:text-[#E2E8F0]">
                            {String(executionModeValue)}
                          </div>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 dark:border-[#1F2A3A] dark:bg-[#111827]">
                          <div className="text-gray-400">Adapter</div>
                          <div className="font-bold text-gray-700 dark:text-[#E2E8F0]">
                            {String(brokerAdapterValue)}
                          </div>
                        </div>
                      </div>

                      {attempt.error_message ? (
                        <div className="mt-2 text-[11px] text-rose-600 dark:text-rose-300">
                          {attempt.error_code ? `${attempt.error_code}: ` : ''}{attempt.error_message}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-gray-200 px-3 py-4 text-[11px] text-gray-400 dark:border-[#334155] dark:text-[#64748B]">
                Nenhuma tentativa operacional recente para este bot.
              </div>
            )}
          </div>

          <ScrollableTableShell minWidthClass="min-w-[980px]" hintLabel={t.swipeHint || 'Swipe'}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="sticky top-0 bg-gray-50 dark:bg-[#111827] text-[10px] font-bold uppercase text-gray-400 dark:text-[#94A3B8]">
                  <th className="px-3 py-3 whitespace-nowrap">{t.ignoreLabel || 'Ignorar'}</th>
                  <th className="px-3 py-3 whitespace-nowrap">{t.status}</th>
                  <th className="px-3 py-3 whitespace-nowrap">TF</th>
                  <th className="px-3 py-3 whitespace-nowrap">{t.asset}</th>
                  <th className="px-3 py-3 whitespace-nowrap">{t.timeRate}</th>
                  <th className="px-3 py-3 whitespace-nowrap">{t.action}</th>
                  <th className="px-3 py-3 whitespace-nowrap">Conta</th>
                  <th className="px-3 py-3 whitespace-nowrap">Valor</th>
                  <th className="px-3 py-3 whitespace-nowrap">{t.open || 'Abrir'}</th>
                  <th className="px-3 py-3 whitespace-nowrap">{t.information}</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-gray-50 dark:divide-[#1F2A3A]">
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
                  (signalRuntimeRows || []).map((sig, i) => (
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
                        {sig.isValid && sig.isScheduledTime ? (
                          <select
                            value={sig.accountTypeOverride || ''}
                            onChange={(e) => setSignalAccountTypeOverride?.(sig.signalKey, e.target.value)}
                            disabled={isLocked || !setSignalAccountTypeOverride}
                            className="min-w-[92px] rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[11px] font-bold text-gray-700 transition-colors disabled:opacity-60 dark:border-[#334155] dark:bg-[#0B1220] dark:text-[#CBD5E1]"
                            title="Override por linha"
                          >
                            <option value="">Auto ({sig.effectiveAccountType})</option>
                            <option value="Demo">Demo</option>
                            <option value="Real">Real</option>
                          </select>
                        ) : (
                          <span className="text-[10px] text-gray-400">
                            {sig.effectiveAccountType || '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
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
                            className="w-[104px] rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[11px] font-bold text-gray-700 transition-colors disabled:opacity-60 dark:border-[#334155] dark:bg-[#0B1220] dark:text-[#CBD5E1]"
                            title="Override de valor por linha"
                          />
                        ) : (
                          <span className="text-[10px] text-gray-400">
                            {sig.effectiveAmount ? sig.effectiveAmount.toFixed(2) : '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            disabled={!sig.isValid || !handleOpenInBroker}
                            onClick={() => handleOpenInBroker?.(sig)}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#1F2A3A] dark:bg-[#0B1220] dark:text-[#CBD5E1] dark:hover:bg-[#111827]"
                          >
                            <Icons.Link />
                            {isExecutionAutomatic ? (t.openBrokerAction || 'Abrir na corretora') : (t.openBrokerActionManual || 'Abrir corretora (manual)')}
                          </button>
                          {sig.isValid && sig.isScheduledTime ? (
                            <div className="flex flex-wrap gap-1">
                              <button
                                type="button"
                                onClick={() => handleSignalManualResult?.(sig, 'manual_executed')}
                                className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
                              >
                                OK manual
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
                      <td className="min-w-[220px] px-3 py-3 text-[10px] text-gray-500 dark:text-[#94A3B8]">
                        <div className="space-y-1">
                          <div className="font-bold text-gray-700 dark:text-[#E2E8F0]">
                            {runtimeByKey[sig.signalKey]?.runtimeLabel || (
                              sig.isIgnored
                                ? (t.ignoredStatus || 'Ignorado')
                                : sig.isValid
                                  ? (
                                    sig.isScheduledTime
                                      ? (
                                        isExecutionAutomatic
                                          ? (t.readyToTrade || 'Pronto para operação')
                                          : (t.readyToTradeManual || 'Pronto para fila e abertura assistida na corretora.')
                                      )
                                      : (t.manualReferenceOnly || 'Válido como referência, mas a fila automática desta aba só agenda sinais com horário HH:MM.')
                                  )
                                  : sig.error
                            )}
                          </div>
                          {sig.isScheduledTime ? (
                            <div>
                              Countdown: <span className="font-mono">{formatCountdown(runtimeByKey[sig.signalKey]?.secondsToSignal ?? null)}</span>
                            </div>
                          ) : null}
                          <div>
                            Conta efetiva: <span className="font-bold text-gray-700 dark:text-[#E2E8F0]">{sig.effectiveAccountType || 'Demo'}</span>
                            {sig.accountTypeOverride ? ' (override da linha)' : ' (padrão do bot)'}
                          </div>
                          <div>
                            Valor efetivo: <span className="font-bold text-gray-700 dark:text-[#E2E8F0]">
                              {sig.effectiveAmount ? sig.effectiveAmount.toFixed(2) : '-'}
                            </span>
                            {sig.effectiveAmountSource === 'line'
                              ? ' (override da linha)'
                              : sig.effectiveAmountSource === 'bot'
                                ? ' (padrão do bot)'
                                : sig.effectiveAmountSource === 'global'
                                  ? ' (valor global)'
                                  : ' (fallback do worker)'}
                          </div>
                          <div>
                            {sig.isScheduledTime
                              ? (isSimulationMode
                                ? 'Modo simulacao acompanha a ordem automaticamente e registra a execucao no papel.'
                                : 'Modo assistido alerta na proximidade, abre a corretora e permite confirmar OK ou falha manualmente.')
                              : (t.manualReferenceOnly || 'Válido como referência, mas a fila automática desta aba só agenda sinais com horário HH:MM.')}
                          </div>
                        </div>
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
