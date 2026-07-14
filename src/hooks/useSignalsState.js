import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSignalsByDate, saveSignalList } from '../services/supabaseSignals';
import { getDailySignalFeed, listDailySignalFeedsByDate } from '../services/supabaseSignalFeed';
import { listWorkspaceSignalExclusions, setWorkspaceSignalIgnored } from '../services/supabaseSignalExclusions';
import { clearExpiredTradeJobs, createAutomationCommand, enqueueTradeJobs, ensureBotInstances, getAutomationWorkerNode, getTradeJobsSummary, listAutomationCommands, listBotInstances, listTradeJobAttempts, listTradeJobEvents, listTradeJobs, requeueFailedTradeJobs, stopWorkspaceBot, updateBotInstanceExecutionConfig, updateBotInstanceTolerance } from '../services/supabaseTradeJobs';
import { getWorkspaceBootstrap, updateWorkspaceRuntime } from '../services/supabaseWorkspace';
import { parseSignalsText } from '../utils/signalParser';

function buildScheduledAt(selectedDate, timeText) {
  const raw = String(timeText || '').trim();
  if (!selectedDate || !/^\d{2}:\d{2}$/.test(raw)) return null;
  const iso = `${selectedDate}T${raw}:00`;
  const scheduledAt = new Date(iso);
  if (Number.isNaN(scheduledAt.getTime())) return null;
  return scheduledAt;
}

function describeRuntimeStatus(status, secondsToSignal) {
  switch (status) {
    case 'queued':
      return 'Enfileirada';
    case 'ready':
      return secondsToSignal > 0 ? `Prepara em ${secondsToSignal}s` : 'Janela aberta para executar';
    case 'manual_opened':
      return 'Corretora aberta';
    case 'manual_executed':
      return 'Executada manualmente';
    case 'manual_failed':
      return 'Falha manual registrada';
    case 'simulated_executed':
      return 'Executada em simulacao';
    case 'expired':
      return 'Expirada';
    case 'reference':
      return 'Referencia manual';
    case 'ignored':
      return 'Ignorada';
    case 'invalid':
      return 'Invalida';
    case 'paused':
      return 'Fila pausada';
    default:
      return 'Aguardando';
  }
}

export function useSignalsState({ workspaceId, isLoggedIn, hasAutomatorAccess, hasDailyListAccess, t, showToast, playAlertSound, setActiveTab, entryValue, executionMode, preExecutionLeadSeconds, browserAlertsEnabled }) {
  const initialDate = new Date().toLocaleDateString('en-CA');
  const [botStatus, setBotStatus] = useState('offline');
  const [botSlot, setBotSlot] = useState(1);
  const [botInstances, setBotInstances] = useState([]);
  const [isBotInstancesLoading, setIsBotInstancesLoading] = useState(false);
  const [signalsText, setSignalsText] = useState('');
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [liveSignals, setLiveSignals] = useState([]);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isSignalsLoading, setIsSignalsLoading] = useState(false);
  const [isSignalsSaving, setIsSignalsSaving] = useState(false);
  const fileInputRef = useRef(null);
  const canEditSignals = Boolean(hasAutomatorAccess);
  const canUseSignals = Boolean(hasAutomatorAccess);
  const sourceTouchedRef = useRef(false);
  const [sourceMode, setSourceModeState] = useState(() => (hasDailyListAccess ? 'published' : 'workspace'));
  const [selectedMarket, setSelectedMarket] = useState('ob');
  const [availableFeeds, setAvailableFeeds] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState('');
  const [workspaceListText, setWorkspaceListText] = useState('');
  const [workspaceHasList, setWorkspaceHasList] = useState(false);
  const [workspaceLiveOperations, setWorkspaceLiveOperations] = useState([]);
  const [ignoredSignals, setIgnoredSignals] = useState({});
  const [isExclusionsLoading, setIsExclusionsLoading] = useState(false);
  const [isExclusionsSaving, setIsExclusionsSaving] = useState(false);
  const [botQueueSummary, setBotQueueSummary] = useState(null);
  const [botRecentEvents, setBotRecentEvents] = useState([]);
  const [isBotQueueLoading, setIsBotQueueLoading] = useState(false);
  const [botDayJobs, setBotDayJobs] = useState([]);
  const [isBotDayJobsLoading, setIsBotDayJobsLoading] = useState(false);
  const [workerNode, setWorkerNode] = useState(null);
  const [workerCommands, setWorkerCommands] = useState([]);
  const [workerAttempts, setWorkerAttempts] = useState([]);
  const [isWorkerRuntimeLoading, setIsWorkerRuntimeLoading] = useState(false);
  const [isWorkerBlueprintAvailable, setIsWorkerBlueprintAvailable] = useState(false);
  const [workerCommandPendingType, setWorkerCommandPendingType] = useState('');
  const [isBotActionLoading, setIsBotActionLoading] = useState(false);
  const [botToleranceSeconds, setBotToleranceSeconds] = useState(5);
  const [isBotToleranceSaving, setIsBotToleranceSaving] = useState(false);
  const [botExecutionAccountType, setBotExecutionAccountType] = useState('Demo');
  const [botDefaultOrderAmountInput, setBotDefaultOrderAmountInput] = useState('2');
  const [isBotExecutionConfigSaving, setIsBotExecutionConfigSaving] = useState(false);
  const [isBotStatusSyncing, setIsBotStatusSyncing] = useState(false);
  const [runtimeNow, setRuntimeNow] = useState(Date.now());
  const [signalExecutionState, setSignalExecutionState] = useState({});
  const [runtimeTimeline, setRuntimeTimeline] = useState([]);
  const [signalAccountTypeOverrides, setSignalAccountTypeOverrides] = useState({});
  const [signalAmountOverrides, setSignalAmountOverrides] = useState({});
  const signalExecutionFlagsRef = useRef({});
  const executionModeKey = String(executionMode || 'Assisted').toLowerCase();
  const isSimulationMode = executionModeKey.includes('sim');
  const leadWindowSeconds = Number(preExecutionLeadSeconds) === 15 ? 15 : 10;
  const runtimeStorageKey = workspaceId ? `magicbot_autotrader_runtime_${workspaceId}_${selectedDate}` : null;
  const selectedBotInstance = useMemo(
    () => (botInstances || []).find((item) => Number(item.slot) === Number(botSlot)) || null,
    [botInstances, botSlot]
  );

  const appendRuntimeEvent = useCallback((type, signal, extra = {}) => {
    const entry = {
      id: `${type}_${signal?.signalKey || 'system'}_${Date.now()}`,
      type,
      signalKey: signal?.signalKey || null,
      asset: signal?.asset || extra.asset || '',
      timeframe: signal?.timeframe || extra.timeframe || '',
      timeText: signal?.timeOrRate || extra.timeText || '',
      action: signal?.action || extra.action || '',
      createdAt: new Date().toISOString(),
      note: extra.note || ''
    };
    setRuntimeTimeline((prev) => [entry, ...prev].slice(0, 80));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setRuntimeNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!runtimeStorageKey || typeof window === 'undefined') {
      setRuntimeTimeline([]);
      return undefined;
    }
    try {
      const stored = window.localStorage.getItem(runtimeStorageKey);
      setRuntimeTimeline(stored ? JSON.parse(stored) : []);
    } catch {
      setRuntimeTimeline([]);
    }
    return undefined;
  }, [runtimeStorageKey]);

  useEffect(() => {
    if (!runtimeStorageKey || typeof window === 'undefined') {
      return undefined;
    }
    try {
      window.localStorage.setItem(runtimeStorageKey, JSON.stringify(runtimeTimeline));
    } catch {
      // Ignore local persistence failures.
    }
    return undefined;
  }, [runtimeStorageKey, runtimeTimeline]);

  useEffect(() => {
    signalExecutionFlagsRef.current = {};
    setSignalExecutionState({});
    setSignalAccountTypeOverrides({});
    setSignalAmountOverrides({});
  }, [selectedDate, selectedMarket, selectedAsset, sourceMode]);

  const syncBotInstances = useCallback(async ({ withLoading = false, showSyncIndicator = false } = {}) => {
    if (!workspaceId || !isLoggedIn) {
      setBotInstances([]);
      setBotStatus('offline');
      if (showSyncIndicator) {
        setIsBotStatusSyncing(false);
      }
      if (withLoading) {
        setIsBotInstancesLoading(false);
      }
      return [];
    }

    if (withLoading) {
      setIsBotInstancesLoading(true);
    }
    if (showSyncIndicator) {
      setIsBotStatusSyncing(true);
    }

    try {
      await ensureBotInstances(workspaceId);
      const rows = await listBotInstances(workspaceId);
      setBotInstances(rows || []);

      const slotItem = (rows || []).find((item) => Number(item.slot) === Number(botSlot));
      setBotStatus(slotItem?.status || 'offline');

      if (typeof slotItem?.execution_tolerance_seconds === 'number') {
        setBotToleranceSeconds(slotItem.execution_tolerance_seconds);
      } else {
        setBotToleranceSeconds(5);
      }

      setBotExecutionAccountType(slotItem?.account_type === 'Real' ? 'Real' : 'Demo');
      setBotDefaultOrderAmountInput(
        Number(slotItem?.default_order_amount) > 0
          ? String(Number(slotItem.default_order_amount))
          : String(Number(entryValue || 0) || 2)
      );

      return rows || [];
    } finally {
      if (showSyncIndicator) {
        setIsBotStatusSyncing(false);
      }
      if (withLoading) {
        setIsBotInstancesLoading(false);
      }
    }
  }, [workspaceId, isLoggedIn, botSlot, entryValue]);

  useEffect(() => {
    let mounted = true;
    if (!workspaceId || !isLoggedIn) {
      return undefined;
    }

    setIsSignalsLoading(true);

    Promise.all([
      getWorkspaceBootstrap(workspaceId),
      getSignalsByDate(workspaceId, selectedDate)
    ])
      .then(async ([workspaceData, signalsData]) => {
        if (!mounted) return;
        const legacyStatus = workspaceData.runtime?.bot_status || 'offline';
        setBotStatus(legacyStatus);
        const raw = signalsData.signalList?.raw_text || '';
        const hasList = Boolean(raw && raw.trim());
        setWorkspaceListText(raw);
        setWorkspaceHasList(hasList);
        setWorkspaceLiveOperations(signalsData.liveOperations || []);

        if (!sourceTouchedRef.current) {
          const nextSource = hasDailyListAccess ? 'published' : 'workspace';
          setSourceModeState(nextSource);
        }
      })
      .catch(() => {
        if (!mounted) return;
        showToast(t.supabaseSyncError);
      })
      .finally(() => {
        if (!mounted) return;
        setIsSignalsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [workspaceId, isLoggedIn, selectedDate, showToast, t, hasDailyListAccess, canEditSignals]);

  useEffect(() => {
    if (!workspaceId || !isLoggedIn) {
      setBotInstances([]);
      setBotStatus('offline');
      setIsBotInstancesLoading(false);
      return undefined;
    }

    syncBotInstances({ withLoading: true, showSyncIndicator: true }).catch(() => {});

    return undefined;
  }, [workspaceId, isLoggedIn, botSlot, syncBotInstances]);

  useEffect(() => {
    if (!workspaceId || !isLoggedIn) {
      return undefined;
    }

    const timer = setInterval(() => {
      syncBotInstances().catch(() => {});
    }, botStatus === 'running' ? 5000 : 15000);

    return () => clearInterval(timer);
  }, [workspaceId, isLoggedIn, botStatus, syncBotInstances]);

  const handleSetBotToleranceSeconds = async (nextSeconds) => {
    if (!workspaceId) return;
    const normalized = Math.max(Math.min(Number(nextSeconds || 0) || 0, 30), 0);
    setBotToleranceSeconds(normalized);
    setIsBotToleranceSaving(true);
    try {
      const updated = await updateBotInstanceTolerance({
        workspaceId,
        slot: botSlot,
        executionToleranceSeconds: normalized
      });
      setBotInstances((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    } catch {
      showToast(t.supabaseSaveError);
    } finally {
      setIsBotToleranceSaving(false);
    }
  };

  const handleSaveBotExecutionConfig = async () => {
    if (!workspaceId) return;
    setIsBotExecutionConfigSaving(true);
    try {
      const updated = await updateBotInstanceExecutionConfig({
        workspaceId,
        slot: botSlot,
        accountType: botExecutionAccountType,
        defaultOrderAmount: botDefaultOrderAmountInput
      });
      setBotInstances((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      setBotExecutionAccountType(updated?.account_type === 'Real' ? 'Real' : 'Demo');
      setBotDefaultOrderAmountInput(
        Number(updated?.default_order_amount) > 0
          ? String(Number(updated.default_order_amount))
          : ''
      );
      showToast('Configuração operacional do bot salva.');
    } catch {
      showToast(t.supabaseSaveError);
    } finally {
      setIsBotExecutionConfigSaving(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    if (!workspaceId || !isLoggedIn || !hasDailyListAccess) {
      setAvailableFeeds([]);
      setSelectedAsset((current) => current);
      return undefined;
    }

    listDailySignalFeedsByDate(selectedDate, selectedMarket)
      .then((feeds) => {
        if (!mounted) return;
        const list = feeds || [];
        setAvailableFeeds(list);
        setSelectedAsset((current) => (current ? current : (list[0]?.asset || '')));
      })
      .catch(() => {
        if (!mounted) return;
        setAvailableFeeds([]);
        setSelectedAsset((current) => current);
      });

    return () => {
      mounted = false;
    };
  }, [workspaceId, isLoggedIn, hasDailyListAccess, selectedDate, selectedMarket, selectedAsset]);

  useEffect(() => {
    let mounted = true;
    if (!workspaceId || !isLoggedIn || !selectedDate || !selectedAsset) {
      setIgnoredSignals({});
      setIsExclusionsLoading(false);
      return undefined;
    }

    setIsExclusionsLoading(true);
    listWorkspaceSignalExclusions({
      workspaceId,
      listDate: selectedDate,
      marketCode: selectedMarket,
      asset: selectedAsset
    })
      .then((rows) => {
        if (!mounted) return;
        const next = {};
        (rows || []).forEach((row) => {
          next[String(row.signal_key || '').trim().toUpperCase()] = Boolean(row.is_ignored);
        });
        setIgnoredSignals(next);
      })
      .catch(() => {
        if (!mounted) return;
        setIgnoredSignals({});
      })
      .finally(() => {
        if (!mounted) return;
        setIsExclusionsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [workspaceId, isLoggedIn, selectedDate, selectedMarket, selectedAsset]);

  useEffect(() => {
    let mounted = true;
    if (!workspaceId || !isLoggedIn) {
      return undefined;
    }

    if (sourceMode === 'workspace') {
      setSignalsText(workspaceHasList ? workspaceListText : '');
      setLiveSignals(canEditSignals ? workspaceLiveOperations : []);
      setIsReadOnly(!canEditSignals);
      return undefined;
    }

    if (!hasDailyListAccess || !selectedAsset) {
      setSignalsText('');
      setLiveSignals([]);
      setIsReadOnly(true);
      return undefined;
    }

    setIsSignalsLoading(true);
    getDailySignalFeed(selectedDate, selectedMarket, selectedAsset)
      .then((feed) => {
        if (!mounted) return;
        if (feed.items?.length) {
          setSignalsText(feed.items.map((item) => item.raw).join('\n'));
        } else {
          setSignalsText('');
        }
        setLiveSignals([]);
        setIsReadOnly(true);
      })
      .catch(() => {
        if (!mounted) return;
        setSignalsText('');
        setLiveSignals([]);
        setIsReadOnly(true);
      })
      .finally(() => {
        if (!mounted) return;
        setIsSignalsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [workspaceId, isLoggedIn, sourceMode, workspaceHasList, workspaceListText, workspaceLiveOperations, canEditSignals, hasDailyListAccess, selectedDate, selectedMarket, selectedAsset]);

  useEffect(() => {
    let mounted = true;
    if (!workspaceId || !isLoggedIn) {
      setBotQueueSummary(null);
      setBotRecentEvents([]);
      setIsBotQueueLoading(false);
      setWorkerNode(null);
      setWorkerCommands([]);
      setWorkerAttempts([]);
      setIsWorkerRuntimeLoading(false);
      setIsWorkerBlueprintAvailable(false);
      return undefined;
    }

    const load = async () => {
      setIsBotQueueLoading(true);
      setIsBotDayJobsLoading(true);
      setIsWorkerRuntimeLoading(true);
      try {
        const [summaryResult, eventsResult, jobsResult, commandsResult, attemptsResult, workerResult] = await Promise.allSettled([
          getTradeJobsSummary({
            workspaceId,
            slot: botSlot,
            listDate: selectedDate,
            marketCode: selectedMarket,
            asset: selectedAsset || 'MIXED'
          }),
          listTradeJobEvents({ workspaceId, slot: botSlot, limit: 12 }),
          listTradeJobs({
            workspaceId,
            slot: botSlot,
            listDate: selectedDate,
            marketCode: selectedMarket,
            asset: selectedAsset || 'MIXED',
            limit: 80
          }),
          selectedBotInstance?.id
            ? listAutomationCommands({ workspaceId, botInstanceId: selectedBotInstance.id, limit: 8 })
            : Promise.resolve([]),
          selectedBotInstance?.id
            ? listTradeJobAttempts({ workspaceId, botInstanceId: selectedBotInstance.id, limit: 10 })
            : Promise.resolve([]),
          selectedBotInstance?.assigned_worker_id
            ? getAutomationWorkerNode(selectedBotInstance.assigned_worker_id)
            : Promise.resolve(null)
        ]);
        if (!mounted) return;
        setBotQueueSummary(summaryResult.status === 'fulfilled' ? summaryResult.value : null);
        setBotRecentEvents(eventsResult.status === 'fulfilled' ? (eventsResult.value || []) : []);
        setBotDayJobs(jobsResult.status === 'fulfilled' ? (jobsResult.value || []) : []);

        const nextCommands = commandsResult.status === 'fulfilled' ? (commandsResult.value || []) : [];
        const nextAttempts = attemptsResult.status === 'fulfilled' ? (attemptsResult.value || []) : [];
        const nextWorker = workerResult.status === 'fulfilled' ? (workerResult.value || null) : null;

        setWorkerCommands(nextCommands);
        setWorkerAttempts(nextAttempts);
        setWorkerNode(nextWorker);
        setIsWorkerBlueprintAvailable(Boolean(
          nextCommands.length
          || nextAttempts.length
          || nextWorker
          || selectedBotInstance?.assigned_worker_id
          || selectedBotInstance?.lease_token
          || selectedBotInstance?.desired_status
          || selectedBotInstance?.runtime_status
        ));
      } catch {
        if (!mounted) return;
        setBotQueueSummary(null);
        setBotRecentEvents([]);
        setBotDayJobs([]);
        setWorkerNode(null);
        setWorkerCommands([]);
        setWorkerAttempts([]);
        setIsWorkerBlueprintAvailable(false);
      } finally {
        if (!mounted) return;
        setIsBotQueueLoading(false);
        setIsBotDayJobsLoading(false);
        setIsWorkerRuntimeLoading(false);
      }
    };

    load();
    const timer = setInterval(load, botStatus === 'running' ? 5000 : 15000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [workspaceId, isLoggedIn, botSlot, botStatus, selectedDate, selectedMarket, selectedAsset, selectedBotInstance?.id, selectedBotInstance?.assigned_worker_id, selectedBotInstance?.lease_token, selectedBotInstance?.desired_status, selectedBotInstance?.runtime_status]);

  const handleRequeueFailedJobs = async (minMinutesLeft = 0) => {
    if (!workspaceId) return;
    setIsBotActionLoading(true);
    try {
      const count = await requeueFailedTradeJobs({
        workspaceId,
        slot: botSlot,
        listDate: selectedDate,
        marketCode: selectedMarket,
        asset: selectedAsset || 'MIXED',
        reason: 'retry_manual',
        minMinutesLeft
      });
      showToast((t.requeuedFailedToast || 'Falhas reenfileiradas: {count}').replace('{count}', String(count)));
    } catch {
      showToast(t.supabaseSaveError);
    } finally {
      setIsBotActionLoading(false);
    }
  };

  const handleClearExpiredJobs = async () => {
    if (!workspaceId) return;
    setIsBotActionLoading(true);
    try {
      const count = await clearExpiredTradeJobs({
        workspaceId,
        slot: botSlot,
        listDate: selectedDate,
        marketCode: selectedMarket,
        asset: selectedAsset || 'MIXED'
      });
      showToast((t.clearedExpiredToast || 'Expirados limpos: {count}').replace('{count}', String(count)));
    } catch {
      showToast(t.supabaseSaveError);
    } finally {
      setIsBotActionLoading(false);
    }
  };

  useEffect(() => {
    if (!workspaceId || !isLoggedIn) return undefined;
    if (sourceMode !== 'published') return undefined;
    if (!hasDailyListAccess || !selectedAsset) return undefined;

    const today = new Date().toLocaleDateString('en-CA');
    if (selectedDate !== today) return undefined;

    const timer = setInterval(() => {
      getDailySignalFeed(selectedDate, selectedMarket, selectedAsset)
        .then((feed) => {
          if (!feed?.items) return;
          setSignalsText(feed.items.map((item) => item.raw).join('\n'));
        })
        .catch(() => {});
    }, 60_000);

    return () => clearInterval(timer);
  }, [workspaceId, isLoggedIn, sourceMode, hasDailyListAccess, selectedDate, selectedMarket, selectedAsset]);

  const parsedSignals = useMemo(() => parseSignalsText(signalsText, t), [signalsText, t]);

  const pushWorkerCommand = useCallback((command) => {
    if (!command?.id) return;
    setWorkerCommands((prev) => {
      const next = [command, ...prev.filter((item) => item.id !== command.id)];
      return next.slice(0, 8);
    });
    setIsWorkerBlueprintAvailable(true);
  }, []);
  const signalsWithMeta = useMemo(() => (
    parsedSignals.map((signal, index) => {
      const key = `${String(signal.timeframe || '').trim().toUpperCase()}|${String(signal.asset || '').trim().toUpperCase()}|${String(signal.timeOrRate || '').trim()}|${String(signal.action || '').trim().toUpperCase()}`;
      const legacyKey = `LINE|${index + 1}`;
      return {
        ...signal,
        lineNumber: index + 1,
        signalKey: key,
        isIgnored: Boolean(ignoredSignals[key] || ignoredSignals[legacyKey])
      };
    })
  ), [parsedSignals, ignoredSignals]);

  const validCount = signalsWithMeta.filter((signal) => signal.isValid && !signal.isIgnored).length;
  const ignoredCount = signalsWithMeta.filter((signal) => signal.isIgnored).length;
  const executableSignalsCount = signalsWithMeta.filter((signal) => signal.isValid && !signal.isIgnored && signal.isScheduledTime).length;
  const signalRuntimeRows = useMemo(() => (
    signalsWithMeta.map((signal) => {
      const scheduledAt = signal.isScheduledTime ? buildScheduledAt(selectedDate, signal.timeOrRate) : null;
      const secondsToSignal = scheduledAt ? Math.round((scheduledAt.getTime() - runtimeNow) / 1000) : null;
      const persisted = signalExecutionState[signal.signalKey];
      let runtimeStatus = persisted?.status || 'idle';

      if (signal.isIgnored) {
        runtimeStatus = 'ignored';
      } else if (!signal.isValid) {
        runtimeStatus = 'invalid';
      } else if (!scheduledAt) {
        runtimeStatus = 'reference';
      } else if (!persisted?.status) {
        if (botStatus !== 'running') {
          runtimeStatus = 'paused';
        } else if (secondsToSignal > leadWindowSeconds) {
          runtimeStatus = 'queued';
        } else if (secondsToSignal >= 0) {
          runtimeStatus = 'ready';
        } else if (Math.abs(secondsToSignal) <= Number(botToleranceSeconds || 0)) {
          runtimeStatus = isSimulationMode ? 'simulated_executed' : 'ready';
        } else {
          runtimeStatus = 'expired';
        }
      }

      const accountTypeOverride = signalAccountTypeOverrides[signal.signalKey] || '';
      const effectiveAccountType = accountTypeOverride || botExecutionAccountType || 'Demo';
      const amountOverrideRaw = signalAmountOverrides[signal.signalKey] || '';
      const parsedAmountOverride = Number(amountOverrideRaw);
      const amountOverride = Number.isFinite(parsedAmountOverride) && parsedAmountOverride > 0
        ? Number(parsedAmountOverride.toFixed(2))
        : null;
      const botDefaultAmount = Number(selectedBotInstance?.default_order_amount);
      const settingsEntryAmount = Number(entryValue || 0);
      const effectiveAmount = amountOverride
        || (Number.isFinite(botDefaultAmount) && botDefaultAmount > 0 ? Number(botDefaultAmount.toFixed(2)) : null)
        || (Number.isFinite(settingsEntryAmount) && settingsEntryAmount > 0 ? Number(settingsEntryAmount.toFixed(2)) : null)
        || null;
      const effectiveAmountSource = amountOverride
        ? 'line'
        : (Number.isFinite(botDefaultAmount) && botDefaultAmount > 0)
          ? 'bot'
          : (Number.isFinite(settingsEntryAmount) && settingsEntryAmount > 0)
            ? 'global'
            : 'worker';

      return {
        ...signal,
        scheduledAt,
        scheduledAtIso: scheduledAt ? scheduledAt.toISOString() : null,
        accountTypeOverride,
        effectiveAccountType,
        amountOverride: amountOverrideRaw,
        effectiveAmount,
        effectiveAmountSource,
        secondsToSignal,
        runtimeStatus,
        runtimeLabel: describeRuntimeStatus(runtimeStatus, secondsToSignal)
      };
    })
  ), [signalsWithMeta, selectedDate, runtimeNow, signalExecutionState, botStatus, leadWindowSeconds, botToleranceSeconds, isSimulationMode, signalAccountTypeOverrides, botExecutionAccountType, signalAmountOverrides, selectedBotInstance?.default_order_amount, entryValue]);

  const nextExecutionSignal = useMemo(() => {
    const candidates = signalRuntimeRows
      .filter((signal) => signal.isValid && !signal.isIgnored && signal.scheduledAt)
      .filter((signal) => !['manual_executed', 'manual_failed', 'simulated_executed', 'expired'].includes(signal.runtimeStatus))
      .sort((a, b) => (a.scheduledAt?.getTime() || 0) - (b.scheduledAt?.getTime() || 0));

    const future = candidates.find((signal) => (signal.secondsToSignal ?? Number.MAX_SAFE_INTEGER) >= -Number(botToleranceSeconds || 0));
    return future || candidates[0] || null;
  }, [signalRuntimeRows, botToleranceSeconds]);

  const timelineCounts = useMemo(() => ({
    manualExecuted: runtimeTimeline.filter((entry) => entry.type === 'manual_executed').length,
    manualFailed: runtimeTimeline.filter((entry) => entry.type === 'manual_failed').length,
    simulated: runtimeTimeline.filter((entry) => entry.type === 'simulated_executed').length,
    expired: runtimeTimeline.filter((entry) => entry.type === 'expired').length
  }), [runtimeTimeline]);

  const notifySignalWindow = useCallback((signal, secondsToSignal) => {
    playAlertSound(secondsToSignal > 3 ? 880 : 660, 0.25);
    if (!browserAlertsEnabled || typeof window === 'undefined' || typeof Notification === 'undefined') {
      return;
    }
    const title = secondsToSignal > 0 ? 'Sinal quase na hora' : 'Janela de execucao aberta';
    const body = `${signal.asset} ${signal.timeframe} ${signal.timeOrRate} ${signal.action}`;
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
      return;
    }
    if (Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification(title, { body });
        }
      }).catch(() => {});
    }
  }, [browserAlertsEnabled, playAlertSound]);

  useEffect(() => {
    if (botStatus !== 'running') {
      return undefined;
    }

    const toleranceWindow = Number(botToleranceSeconds || 0);
    const updates = {};

    signalRuntimeRows.forEach((signal) => {
      if (!signal.scheduledAt || !signal.isValid || signal.isIgnored) return;
      if (['manual_executed', 'manual_failed', 'simulated_executed', 'expired'].includes(signal.runtimeStatus)) return;

      const flags = signalExecutionFlagsRef.current[signal.signalKey] || {};

      if (!flags.ready && signal.secondsToSignal <= leadWindowSeconds && signal.secondsToSignal >= 0) {
        flags.ready = true;
        signalExecutionFlagsRef.current[signal.signalKey] = flags;
        updates[signal.signalKey] = { status: 'ready', updatedAt: new Date().toISOString() };
        appendRuntimeEvent('ready', signal, { note: `Janela de alerta aberta com ${Math.max(signal.secondsToSignal, 0)}s restantes.` });
        notifySignalWindow(signal, signal.secondsToSignal);
      }

      if (isSimulationMode && !flags.simulated && signal.secondsToSignal < 0 && Math.abs(signal.secondsToSignal) <= toleranceWindow) {
        flags.simulated = true;
        signalExecutionFlagsRef.current[signal.signalKey] = flags;
        updates[signal.signalKey] = { status: 'simulated_executed', updatedAt: new Date().toISOString() };
        appendRuntimeEvent('simulated_executed', signal, { note: 'Execucao registrada em modo simulacao.' });
      }

      if (!flags.expired && signal.secondsToSignal < -toleranceWindow) {
        flags.expired = true;
        signalExecutionFlagsRef.current[signal.signalKey] = flags;
        updates[signal.signalKey] = { status: 'expired', updatedAt: new Date().toISOString() };
        appendRuntimeEvent('expired', signal, { note: 'Janela ultrapassada sem confirmacao de execucao.' });
      }
    });

    if (Object.keys(updates).length > 0) {
      setSignalExecutionState((prev) => ({ ...prev, ...updates }));
    }

    return undefined;
  }, [botStatus, signalRuntimeRows, leadWindowSeconds, botToleranceSeconds, isSimulationMode, appendRuntimeEvent, notifySignalWindow]);

  const handleSignalBrokerOpen = useCallback((signal) => {
    if (!signal?.signalKey) return;
    setSignalExecutionState((prev) => ({
      ...prev,
      [signal.signalKey]: { status: 'manual_opened', updatedAt: new Date().toISOString() }
    }));
    appendRuntimeEvent('manual_opened', signal, { note: 'Corretora aberta para conferencia assistida.' });
  }, [appendRuntimeEvent]);

  const handleSignalManualResult = useCallback((signal, outcome = 'manual_executed') => {
    if (!signal?.signalKey) return;
    const nextStatus = outcome === 'manual_failed' ? 'manual_failed' : 'manual_executed';
    setSignalExecutionState((prev) => ({
      ...prev,
      [signal.signalKey]: { status: nextStatus, updatedAt: new Date().toISOString() }
    }));
    appendRuntimeEvent(nextStatus, signal, {
      note: nextStatus === 'manual_failed'
        ? 'Falha registrada manualmente pelo operador.'
        : 'Execucao manual confirmada pelo operador.'
    });
  }, [appendRuntimeEvent]);

  const clearRuntimeTimeline = useCallback(() => {
    setRuntimeTimeline([]);
  }, []);

  const setSignalAccountTypeOverride = useCallback((signalKey, accountType) => {
    const normalizedKey = String(signalKey || '').trim();
    if (!normalizedKey) return;
    const normalizedValue = accountType === 'Real' || accountType === 'Demo' ? accountType : '';
    setSignalAccountTypeOverrides((prev) => ({
      ...prev,
      [normalizedKey]: normalizedValue
    }));
  }, []);

  const setSignalAmountOverride = useCallback((signalKey, amount) => {
    const normalizedKey = String(signalKey || '').trim();
    if (!normalizedKey) return;

    const rawValue = String(amount ?? '').replace(',', '.').trim();
    if (!rawValue) {
      setSignalAmountOverrides((prev) => ({
        ...prev,
        [normalizedKey]: ''
      }));
      return;
    }

    const parsed = Number(rawValue);
    const normalizedValue = Number.isFinite(parsed) && parsed > 0
      ? parsed.toFixed(2)
      : rawValue;

    setSignalAmountOverrides((prev) => ({
      ...prev,
      [normalizedKey]: normalizedValue
    }));
  }, []);

  const canStartBot = Boolean(hasAutomatorAccess) && (
    Boolean(signalsText.trim())
      && executableSignalsCount > 0
      && (sourceMode !== 'published' ? true : Boolean(selectedAsset))
  );

  const handleStartBot = async () => {
    const nextStatus = botStatus === 'offline' ? 'running' : 'offline';

    if (nextStatus === 'running' && !canStartBot) {
      if (!hasAutomatorAccess) {
        showToast(t.avisoExpirado);
        setActiveTab('shop');
        return;
      }

      if (sourceMode === 'published' && (!selectedAsset || !signalsText.trim() || executableSignalsCount === 0)) {
        showToast(t.waitingDailyList || 'Aguardando lista diária publicada pelo admin para esta data.');
        return;
      }

      showToast(t.addValidSignals);
      return;
    }

    if (nextStatus === 'running' && executableSignalsCount === 0) {
      showToast(t.noTimedSignalsToQueue || 'Adicione pelo menos um sinal com horário no formato HH:MM para automatizar a lista.');
      return;
    }

    if (!workspaceId) {
      showToast(t.supabaseConnectionError);
      return;
    }

    setIsBotStatusSyncing(true);

    try {
      if (nextStatus === 'running') {
        const jobs = signalsWithMeta
          .filter((s) => s.isValid && !s.isIgnored && s.isScheduledTime)
          .map((s) => {
            const rawAmountOverride = signalAmountOverrides[s.signalKey];
            const parsedAmountOverride = Number(rawAmountOverride);
            const hasLineAmountOverride = Number.isFinite(parsedAmountOverride) && parsedAmountOverride > 0;

            return {
              signal_key: s.signalKey,
              line_number: s.lineNumber,
              timeframe: s.timeframe,
              time_text: String(s.timeOrRate || '').trim(),
              action: s.action,
              entry_amount: hasLineAmountOverride
                ? Number(parsedAmountOverride.toFixed(2))
                : (Number(selectedBotInstance?.default_order_amount) > 0 ? 0 : (Number(entryValue || 0) || 0)),
              ...(signalAccountTypeOverrides[s.signalKey]
                ? { account_type_override: signalAccountTypeOverrides[s.signalKey] }
                : {})
            };
          });

        if (!jobs.length) {
          showToast(t.addValidSignals);
          return;
        }

        const nextExecutionState = {};
        signalExecutionFlagsRef.current = {};
        signalsWithMeta
          .filter((s) => s.isValid && !s.isIgnored && s.isScheduledTime)
          .forEach((signal) => {
            nextExecutionState[signal.signalKey] = { status: 'queued', updatedAt: new Date().toISOString() };
            signalExecutionFlagsRef.current[signal.signalKey] = { enqueued: true };
            appendRuntimeEvent('queued', signal, { note: 'Sinal enviado para a fila operacional.' });
          });
        setSignalExecutionState(nextExecutionState);

        await enqueueTradeJobs({
          workspaceId,
          slot: botSlot,
          sourceMode,
          listDate: selectedDate,
          marketCode: selectedMarket,
          asset: selectedAsset || 'MIXED',
          jobs
        });

        await updateWorkspaceRuntime(workspaceId, 'running');
        setBotStatus('running');
        setBotInstances((prev) => prev.map((b) => (Number(b.slot) === Number(botSlot) ? { ...b, status: 'running' } : b)));
        const startCommand = await createAutomationCommand({
          workspaceId,
          botInstanceId: selectedBotInstance?.id || null,
          commandType: 'start_bot',
          payload: {
            slot: Number(botSlot),
            source_mode: sourceMode,
            list_date: selectedDate,
            market_code: selectedMarket,
            asset: selectedAsset || 'MIXED',
            jobs_count: jobs.length,
            execution_mode: executionModeKey,
            lead_seconds: leadWindowSeconds,
            tolerance_seconds: Number(botToleranceSeconds || 0),
            entry_value: Number(entryValue || 0) || 0,
            bot_default_order_amount: Number(selectedBotInstance?.default_order_amount || 0) || null,
            bot_account_type: selectedBotInstance?.account_type || botExecutionAccountType,
            job_account_type_overrides: jobs.filter((job) => job.account_type_override).length,
            job_amount_overrides: jobs.filter((job) => Number(job.entry_amount || 0) > 0).length
          }
        });
        pushWorkerCommand(startCommand);
        await syncBotInstances({ showSyncIndicator: true });
        playAlertSound(880, 0.3);
        showToast(t.botRunningToast);
      } else {
        try {
          await stopWorkspaceBot({ workspaceId, slot: botSlot });
        } finally {
          await updateWorkspaceRuntime(workspaceId, 'offline');
        }
        setBotStatus('offline');
        setBotInstances((prev) => prev.map((b) => (Number(b.slot) === Number(botSlot) ? { ...b, status: 'offline' } : b)));
        const stopCommand = await createAutomationCommand({
          workspaceId,
          botInstanceId: selectedBotInstance?.id || null,
          commandType: 'stop_bot',
          payload: {
            slot: Number(botSlot),
            reason: 'ui_toggle_stop'
          }
        });
        pushWorkerCommand(stopCommand);
        await syncBotInstances({ showSyncIndicator: true });
        playAlertSound(440, 0.3);
        showToast(t.botPausedToast);
      }
    } catch {
      showToast(t.supabaseSaveError);
    } finally {
      setIsBotStatusSyncing(false);
    }
  };

  const queueBotCommand = useCallback(async (commandType, payload = {}) => {
    if (!workspaceId || !selectedBotInstance?.id) {
      showToast(t.supabaseConnectionError);
      return null;
    }

    setWorkerCommandPendingType(commandType);
    try {
      const command = await createAutomationCommand({
        workspaceId,
        botInstanceId: selectedBotInstance.id,
        commandType,
        payload: {
          slot: Number(botSlot),
          ...payload
        }
      });
      pushWorkerCommand(command);
      await syncBotInstances({ showSyncIndicator: commandType === 'force_release_lease' });
      return command;
    } catch {
      showToast(t.supabaseSaveError);
      return null;
    } finally {
      setWorkerCommandPendingType('');
    }
  }, [workspaceId, selectedBotInstance?.id, botSlot, pushWorkerCommand, showToast, syncBotInstances, t.supabaseConnectionError, t.supabaseSaveError]);

  const handleRefreshRuntime = useCallback(async () => {
    const command = await queueBotCommand('refresh_runtime', { reason: 'ui_refresh_runtime' });
    if (command) {
      showToast('Comando de refresh do runtime enviado ao worker.');
    }
  }, [queueBotCommand, showToast]);

  const handleForceReleaseLease = useCallback(async () => {
    const command = await queueBotCommand('force_release_lease', {
      assigned_worker_id: selectedBotInstance?.assigned_worker_id || null,
      lease_token: selectedBotInstance?.lease_token || null,
      reason: 'ui_force_release'
    });
    if (command) {
      showToast('Comando de liberação forçada do lease enviado.');
    }
  }, [queueBotCommand, selectedBotInstance?.assigned_worker_id, selectedBotInstance?.lease_token, showToast]);

  const handleSaveSignals = async () => {
    if (!canUseSignals) {
      showToast(t.automatorRequired || t.avisoExpirado);
      setActiveTab('shop');
      return;
    }

    if (isReadOnly) {
      showToast('Esta lista é publicada pelo admin e não pode ser sobrescrita aqui.');
      return;
    }

    if (!workspaceId) {
      showToast(t.supabaseConnectionError);
      return;
    }

    setIsSignalsSaving(true);

    try {
      // #region debug-point B:ui-save-signals
      fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "broker-balance-signals", runId: "pre", hypothesisId: "B", location: "useSignalsState.js:handleSaveSignals", msg: "[DEBUG] UI save signals clicked", data: { workspaceId, selectedDate, selectedMarket, selectedAsset, sourceMode, isReadOnly, signalsLength: String(signalsText || "").length, parsedCount: signalsWithMeta.length, canUseSignals }, ts: Date.now() }) }).catch(() => {});
      // #endregion
      const result = await saveSignalList({
        workspaceId,
        listDate: selectedDate,
        signalsText,
        parsedSignals: signalsWithMeta,
        entryValue
      });

      setSignalsText(result.signalList.raw_text || '');
      setLiveSignals(result.liveOperations);
      showToast(t.saveListSuccess);
    } catch {
      // #region debug-point B:ui-save-signals-error
      fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "broker-balance-signals", runId: "pre", hypothesisId: "B", location: "useSignalsState.js:handleSaveSignals", msg: "[DEBUG] UI save signals failed", data: { workspaceId, selectedDate, selectedMarket, selectedAsset }, ts: Date.now() }) }).catch(() => {});
      // #endregion
      showToast(t.supabaseSaveError);
    } finally {
      setIsSignalsSaving(false);
    }
  };

  const handleClearSignals = () => {
    if (!canUseSignals) {
      showToast(t.automatorRequired || t.avisoExpirado);
      setActiveTab('shop');
      return;
    }
    if (isReadOnly) {
      showToast('Esta lista é protegida.');
      return;
    }
    setSignalsText('');
    setLiveSignals([]);
  };

  const loadSignalsByDate = (date) => {
    setSelectedDate(date);
  };

  const setSourceMode = (nextMode) => {
    sourceTouchedRef.current = true;
    setSourceModeState(nextMode);
  };

  const copyPublishedListToWorkspace = () => {
    if (sourceMode !== 'published') return;
    if (!canEditSignals) return;
    sourceTouchedRef.current = true;
    const draft = String(signalsText || '');
    // #region debug-point C:copy-published-to-workspace
    fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "broker-balance-signals", runId: "pre", hypothesisId: "C", location: "useSignalsState.js:copyPublishedListToWorkspace", msg: "[DEBUG] copy published list to workspace", data: { selectedDate, selectedMarket, selectedAsset, draftLength: draft.length }, ts: Date.now() }) }).catch(() => {});
    // #endregion
    setWorkspaceListText(draft);
    setWorkspaceHasList(Boolean(draft.trim()));
    setWorkspaceLiveOperations([]);
    setSourceModeState('workspace');
  };

  const handleExport = () => {
    if (signalsWithMeta.length === 0) {
      showToast(t.emptySignalsList);
      return;
    }

    const validText = signalsWithMeta
      .filter((signal) => signal.isValid && !signal.isIgnored)
      .map((signal) => signal.raw)
      .join('\n');

    if (!validText) {
      showToast(t.noValidSignalsExport);
      return;
    }

    const blob = new Blob([validText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `magicbot_signals_${selectedDate}.txt`;
    link.click();
    showToast(t.exportedTxt);
  };

  const toggleSignalIgnored = async (signalKey, lineNumber, nextIgnored) => {
    if (!workspaceId || !selectedDate || !selectedAsset) {
      return;
    }

    const normalizedKey = String(signalKey || '').trim().toUpperCase();
    if (!normalizedKey) return;
    const normalizedLine = Number(lineNumber);

    setIgnoredSignals((prev) => ({ ...prev, [normalizedKey]: Boolean(nextIgnored) }));
    setIsExclusionsSaving(true);

    try {
      await setWorkspaceSignalIgnored({
        workspaceId,
        listDate: selectedDate,
        marketCode: selectedMarket,
        asset: selectedAsset,
        signalKey: normalizedKey,
        lineNumber: normalizedLine || null,
        ignored: Boolean(nextIgnored)
      });
    } catch {
      showToast(t.supabaseSaveError);
      setIgnoredSignals((prev) => ({ ...prev, [normalizedKey]: Boolean(!nextIgnored) }));
    } finally {
      setIsExclusionsSaving(false);
    }
  };

  const handleFileUpload = (e) => {
    if (!canUseSignals) {
      showToast(t.automatorRequired || t.avisoExpirado);
      setActiveTab('shop');
      e.target.value = null;
      return;
    }

    if (isReadOnly) {
      showToast('Esta lista é protegida.');
      e.target.value = null;
      return;
    }

    const file = e.target.files[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      setSignalsText((prev) => (prev.trim() ? `${prev}\n${evt.target.result}` : evt.target.result));
      showToast(t.importedListSuccess);
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  return {
    botStatus,
    botSlot,
    setBotSlot,
    botInstances,
    selectedBotInstance,
    isBotInstancesLoading,
    botToleranceSeconds,
    isBotToleranceSaving,
    botExecutionAccountType,
    setBotExecutionAccountType,
    botDefaultOrderAmountInput,
    setBotDefaultOrderAmountInput,
    isBotExecutionConfigSaving,
    handleSaveBotExecutionConfig,
    isBotStatusSyncing,
    setBotToleranceSeconds: handleSetBotToleranceSeconds,
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
    signalsText,
    setSignalsText,
    selectedDate,
    setSelectedDate: loadSignalsByDate,
    canUsePublished: Boolean(hasDailyListAccess),
    sourceMode,
    setSourceMode,
    selectedMarket,
    setSelectedMarket,
    availableFeeds,
    selectedAsset,
    setSelectedAsset,
    copyPublishedListToWorkspace,
    liveSignals,
    isSignalsReadOnly: isReadOnly || !canEditSignals,
    canEditSignals,
    canStartBot,
    isSignalsLoading,
    isSignalsSaving,
    fileInputRef,
    parsedSignals: signalsWithMeta,
    validCount,
    executableSignalsCount,
    ignoredCount,
    isExclusionsLoading,
    isExclusionsSaving,
    toggleSignalIgnored,
    handleStartBot,
    handleSignalBrokerOpen,
    handleSignalManualResult,
    signalAccountTypeOverrides,
    setSignalAccountTypeOverride,
    signalAmountOverrides,
    setSignalAmountOverride,
    handleSaveSignals,
    handleClearSignals,
    handleExport,
    handleFileUpload,
    signalRuntimeRows,
    nextExecutionSignal,
    runtimeTimeline,
    clearRuntimeTimeline,
    isSimulationMode,
    leadWindowSeconds,
    timelineCounts
  };
}
