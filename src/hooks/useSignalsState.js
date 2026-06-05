import { useEffect, useMemo, useRef, useState } from 'react';
import { getSignalsByDate, saveSignalList } from '../services/supabaseSignals';
import { getDailySignalFeedByDate } from '../services/supabaseSignalFeed';
import { getWorkspaceBootstrap, updateWorkspaceRuntime } from '../services/supabaseWorkspace';
import { parseSignalsText } from '../utils/signalParser';

export function useSignalsState({ workspaceId, isLoggedIn, hasAutomatorAccess, hasDailyListAccess, t, showToast, playAlertSound, setActiveTab, entryValue }) {
  const initialDate = new Date().toLocaleDateString('en-CA');
  const [botStatus, setBotStatus] = useState('offline');
  const [signalsText, setSignalsText] = useState('');
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [liveSignals, setLiveSignals] = useState([]);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isSignalsLoading, setIsSignalsLoading] = useState(false);
  const [isSignalsSaving, setIsSignalsSaving] = useState(false);
  const fileInputRef = useRef(null);
  const canEditSignals = Boolean(hasAutomatorAccess);
  const canUseSignals = Boolean(hasAutomatorAccess);
  const canStartBot = Boolean(hasAutomatorAccess);

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
        setBotStatus(workspaceData.runtime?.bot_status || 'offline');
        if (signalsData.signalList?.raw_text) {
          setSignalsText(signalsData.signalList.raw_text || '');
          setLiveSignals(signalsData.liveOperations || []);
          setIsReadOnly(false);
          return;
        }

        if (hasDailyListAccess) {
          try {
            const feed = await getDailySignalFeedByDate(selectedDate);
            if (!mounted) return;
            if (feed.items?.length) {
              setSignalsText(feed.items.map((item) => item.raw).join('\n'));
              setLiveSignals([]);
              setIsReadOnly(true);
              return;
            }
          } catch {
          }
        }

        setSignalsText('');
        setLiveSignals(canEditSignals ? (signalsData.liveOperations || []) : []);
        setIsReadOnly(!canEditSignals);
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

  const parsedSignals = useMemo(() => parseSignalsText(signalsText, t), [signalsText, t]);

  const validCount = parsedSignals.filter((signal) => signal.isValid).length;

  const handleStartBot = async () => {
    if (!canStartBot) {
      showToast(t.avisoExpirado);
      setActiveTab('shop');
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
      await updateWorkspaceRuntime(workspaceId, nextStatus);
      setBotStatus(nextStatus);
      playAlertSound(nextStatus === 'running' ? 880 : 440, 0.3);
      showToast(nextStatus === 'running' ? t.botRunningToast : t.botPausedToast);
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
      const result = await saveSignalList({
        workspaceId,
        listDate: selectedDate,
        signalsText,
        parsedSignals,
        entryValue
      });

      setSignalsText(result.signalList.raw_text || '');
      setLiveSignals(result.liveOperations);
      showToast(t.saveListSuccess);
    } catch {
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

  const handleExport = () => {
    if (parsedSignals.length === 0) {
      showToast(t.emptySignalsList);
      return;
    }

    const validText = parsedSignals
      .filter((signal) => signal.isValid)
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
    signalsText,
    setSignalsText,
    selectedDate,
    setSelectedDate: loadSignalsByDate,
    liveSignals,
    isSignalsReadOnly: isReadOnly || !canEditSignals,
    canEditSignals,
    canStartBot,
    isSignalsLoading,
    isSignalsSaving,
    fileInputRef,
    parsedSignals,
    validCount,
    handleStartBot,
    handleSaveSignals,
    handleClearSignals,
    handleExport,
    handleFileUpload
  };
}
