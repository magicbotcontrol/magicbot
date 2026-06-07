import { useEffect, useMemo, useRef, useState } from 'react';
import { getSignalsByDate, saveSignalList } from '../services/supabaseSignals';
import { getDailySignalFeed, listDailySignalFeedsByDate } from '../services/supabaseSignalFeed';
import { listWorkspaceSignalExclusions, setWorkspaceSignalIgnored } from '../services/supabaseSignalExclusions';
import { clearExpiredTradeJobs, enqueueTradeJobs, ensureBotInstances, getTradeJobsSummary, listBotInstances, listTradeJobEvents, listTradeJobs, requeueFailedTradeJobs, stopWorkspaceBot, updateBotInstanceTolerance } from '../services/supabaseTradeJobs';
import { getWorkspaceBootstrap, updateWorkspaceRuntime } from '../services/supabaseWorkspace';
import { parseSignalsText } from '../utils/signalParser';

export function useSignalsState({ workspaceId, isLoggedIn, hasAutomatorAccess, hasDailyListAccess, t, showToast, playAlertSound, setActiveTab, entryValue }) {
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
  const [isBotActionLoading, setIsBotActionLoading] = useState(false);
  const [botToleranceSeconds, setBotToleranceSeconds] = useState(5);
  const [isBotToleranceSaving, setIsBotToleranceSaving] = useState(false);

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
        setBotStatus((current) => (current === 'running' || legacyStatus === 'running' ? current : legacyStatus));
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
    let mounted = true;
    if (!workspaceId || !isLoggedIn) {
      setBotInstances([]);
      setIsBotInstancesLoading(false);
      return undefined;
    }

    setIsBotInstancesLoading(true);
    ensureBotInstances(workspaceId)
      .then(() => listBotInstances(workspaceId))
      .then((rows) => {
        if (!mounted) return;
        setBotInstances(rows || []);
        const slotItem = (rows || []).find((item) => Number(item.slot) === Number(botSlot));
        if (slotItem?.status) {
          setBotStatus(slotItem.status);
        }
        if (typeof slotItem?.execution_tolerance_seconds === 'number') {
          setBotToleranceSeconds(slotItem.execution_tolerance_seconds);
        } else {
          setBotToleranceSeconds(5);
        }
      })
      .catch(() => {
        if (!mounted) return;
      })
      .finally(() => {
        if (!mounted) return;
        setIsBotInstancesLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [workspaceId, isLoggedIn, botSlot]);

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
      return undefined;
    }

    const load = async () => {
      setIsBotQueueLoading(true);
      setIsBotDayJobsLoading(true);
      try {
        const [summary, events, jobs] = await Promise.all([
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
          })
        ]);
        if (!mounted) return;
        setBotQueueSummary(summary);
        setBotRecentEvents(events || []);
        setBotDayJobs(jobs || []);
      } catch {
        if (!mounted) return;
        setBotQueueSummary(null);
        setBotRecentEvents([]);
        setBotDayJobs([]);
      } finally {
        if (!mounted) return;
        setIsBotQueueLoading(false);
        setIsBotDayJobsLoading(false);
      }
    };

    load();
    const timer = setInterval(load, botStatus === 'running' ? 5000 : 15000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [workspaceId, isLoggedIn, botSlot, botStatus, selectedDate, selectedMarket, selectedAsset]);

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

  const canStartBot = Boolean(hasAutomatorAccess) && (
    Boolean(signalsText.trim())
      && validCount > 0
      && (sourceMode !== 'published' ? true : Boolean(selectedAsset))
  );

  const handleStartBot = async () => {
    if (!canStartBot) {
      if (!hasAutomatorAccess) {
        showToast(t.avisoExpirado);
        setActiveTab('shop');
        return;
      }

      if (sourceMode === 'published' && (!selectedAsset || !signalsText.trim() || validCount === 0)) {
        showToast(t.waitingDailyList || 'Aguardando lista diária publicada pelo admin para esta data.');
        return;
      }

      showToast(t.addValidSignals);
      return;
    }

    if (validCount === 0) {
      showToast(t.addValidSignals);
      return;
    }

    if (!workspaceId) {
      showToast(t.supabaseConnectionError);
      return;
    }

    const nextStatus = botStatus === 'offline' ? 'running' : 'offline';

    try {
      if (nextStatus === 'running') {
        const jobs = signalsWithMeta
          .filter((s) => s.isValid && !s.isIgnored)
          .filter((s) => /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(String(s.timeOrRate || '').trim()))
          .map((s) => ({
            signal_key: s.signalKey,
            line_number: s.lineNumber,
            timeframe: s.timeframe,
            time_text: String(s.timeOrRate || '').trim(),
            action: s.action,
            entry_amount: Number(entryValue || 0) || 0
          }));

        if (!jobs.length) {
          showToast(t.addValidSignals);
          return;
        }

        await enqueueTradeJobs({
          workspaceId,
          slot: botSlot,
          sourceMode,
          listDate: selectedDate,
          marketCode: selectedMarket,
          asset: selectedAsset || 'MIXED',
          jobs
        });

        setBotStatus('running');
        setBotInstances((prev) => prev.map((b) => (Number(b.slot) === Number(botSlot) ? { ...b, status: 'running' } : b)));
        playAlertSound(880, 0.3);
        showToast(t.botRunningToast);
      } else {
        try {
          await stopWorkspaceBot({ workspaceId, slot: botSlot });
        } catch {
          await updateWorkspaceRuntime(workspaceId, 'offline');
        }
        setBotStatus('offline');
        setBotInstances((prev) => prev.map((b) => (Number(b.slot) === Number(botSlot) ? { ...b, status: 'offline' } : b)));
        playAlertSound(440, 0.3);
        showToast(t.botPausedToast);
      }
    } catch {
      showToast(t.supabaseSaveError);
    }
  };

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
    isBotInstancesLoading,
    botToleranceSeconds,
    isBotToleranceSaving,
    setBotToleranceSeconds: handleSetBotToleranceSeconds,
    botQueueSummary,
    botRecentEvents,
    isBotQueueLoading,
    botDayJobs,
    isBotDayJobsLoading,
    isBotActionLoading,
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
    ignoredCount,
    isExclusionsLoading,
    isExclusionsSaving,
    toggleSignalIgnored,
    handleStartBot,
    handleSaveSignals,
    handleClearSignals,
    handleExport,
    handleFileUpload
  };
}
