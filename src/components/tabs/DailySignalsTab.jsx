import { useEffect, useMemo, useState } from 'react';
import { getDailySignalFeed, listDailySignalFeedsByDate } from '../../services/supabaseSignalFeed';
import { parseSignalsText } from '../../utils/signalParser';

function isValidTime(value) {
  return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(String(value || '').trim());
}

function buildSignalDateTime(selectedDate, timeText) {
  const [y, m, d] = String(selectedDate).split('-').map(Number);
  const [hh, mm] = String(timeText).split(':').map(Number);
  if (!y || !m || !d) return null;
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

function isSignalPast(selectedDate, timeText) {
  if (!isValidTime(timeText)) return false;
  const dt = buildSignalDateTime(selectedDate, timeText);
  if (!dt) return false;
  return dt.getTime() < Date.now();
}

export function DailySignalsTab({ t, canViewDailyList, showToast, marketCode, title }) {
  const initialDate = new Date().toLocaleDateString('en-CA');
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [availableFeeds, setAvailableFeeds] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState('');
  const [signalsText, setSignalsText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!canViewDailyList) {
      setAvailableFeeds([]);
      setSelectedAsset('');
      setSignalsText('');
      setIsLoading(false);
      return undefined;
    }

    setIsLoading(true);
    listDailySignalFeedsByDate(selectedDate, marketCode)
      .then((feeds) => {
        if (!mounted) return;
        setAvailableFeeds(feeds || []);
        const nextAsset = feeds?.find((feed) => feed.asset === selectedAsset)?.asset || feeds?.[0]?.asset || '';
        setSelectedAsset(nextAsset);
      })
      .catch(() => {
        if (!mounted) return;
        showToast(t.supabaseSyncError);
        setAvailableFeeds([]);
        setSelectedAsset('');
      });

    return () => {
      mounted = false;
    };
  }, [canViewDailyList, selectedDate, marketCode, selectedAsset, showToast, t.supabaseSyncError]);

  useEffect(() => {
    let mounted = true;
    if (!canViewDailyList || !selectedAsset) {
      setSignalsText('');
      setIsLoading(false);
      return undefined;
    }

    setIsLoading(true);
    getDailySignalFeed(selectedDate, marketCode, selectedAsset)
      .then((result) => {
        if (!mounted) return;
        setSignalsText((result.items || []).map((item) => item.raw).join('\n'));
      })
      .catch(() => {
        if (!mounted) return;
        showToast(t.supabaseSyncError);
        setSignalsText('');
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [canViewDailyList, selectedDate, marketCode, selectedAsset, showToast, t.supabaseSyncError]);

  const parsedSignals = useMemo(() => parseSignalsText(signalsText, t), [signalsText, t]);
  const validCount = parsedSignals.filter((signal) => signal.isValid).length;
  const totalCount = parsedSignals.length;

  const copySignals = async (mode) => {
    if (parsedSignals.length === 0) {
      showToast(t.emptySignalsList);
      return;
    }

    // #region debug-point C:copy-daily-signals
    fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "broker-balance-signals", runId: "pre", hypothesisId: "C", location: "DailySignalsTab.jsx:copySignals", msg: "[DEBUG] copy daily signals requested", data: { marketCode, selectedDate, selectedAsset, mode, parsedCount: parsedSignals.length, secureContext: Boolean(window.isSecureContext), clipboard: Boolean(navigator.clipboard) }, ts: Date.now() }) }).catch(() => {});
    // #endregion

    const includeOpenOnly = mode === 'open';
    const lines = parsedSignals
      .filter((signal) => signal.isValid)
      .filter((signal) => (!includeOpenOnly ? true : !isSignalPast(selectedDate, signal.timeOrRate)))
      .map((signal) => signal.raw)
      .join('\n');

    if (!lines) {
      showToast(t.noValidSignalsExport);
      return;
    }

    try {
      await navigator.clipboard.writeText(lines);
      showToast(t.copiedToClipboard || 'Copiado!');
    } catch {
      // #region debug-point C:copy-daily-signals-failed
      fetch("http://127.0.0.1:7777/event", { method: "POST", body: JSON.stringify({ sessionId: "broker-balance-signals", runId: "pre", hypothesisId: "C", location: "DailySignalsTab.jsx:copySignals", msg: "[DEBUG] copy daily signals failed", data: { marketCode, selectedDate, selectedAsset, mode }, ts: Date.now() }) }).catch(() => {});
      // #endregion
      showToast(t.supabaseSyncError);
    }
  };

  if (!canViewDailyList) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm font-semibold text-gray-600 dark:border-[#334155] dark:bg-[#0B1220] dark:text-[#CBD5E1]">
        {t.dailySignalsBlocked || 'Conteúdo disponível apenas para assinantes.'}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 animate-fade-in">
      <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1E293B] lg:col-span-1">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-gray-900 dark:text-white">{title}</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {isLoading ? t.loadingSignals : `${validCount} ${t.valid.toLowerCase()} • ${totalCount} ${t.total.toLowerCase()}`}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <label className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">
            {t.selectDate || 'Data'}
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] dark:border-[#334155] dark:bg-[#0B1220] dark:text-white"
          />
        </div>

        <div className="mt-5">
          <label className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">
            {t.assetLabel || 'Ativo'}
          </label>
          <select
            value={selectedAsset}
            onChange={(e) => setSelectedAsset(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] dark:border-[#334155] dark:bg-[#0B1220] dark:text-white"
          >
            {availableFeeds.length ? availableFeeds.map((feed) => (
              <option key={feed.id} value={feed.asset}>{feed.asset}</option>
            )) : (
              <option value="">-</option>
            )}
          </select>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => copySignals('open')}
            className="rounded-2xl bg-[#FF6B00] px-4 py-3 text-xs font-black text-white transition-colors hover:bg-[#FF7F1F]"
          >
            {t.copyOpenSignals || 'Copiar abertas'}
          </button>
          <button
            type="button"
            onClick={() => copySignals('all')}
            className="rounded-2xl bg-gray-100 px-4 py-3 text-xs font-black text-gray-900 transition-colors hover:bg-gray-200 dark:bg-[#0B1220] dark:text-white dark:hover:bg-[#111827]"
          >
            {t.copyAllSignals || 'Copiar tudo'}
          </button>
        </div>
      </div>

      <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1E293B] lg:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">{t.dailyListTitle || 'Lista do dia'}</h3>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{selectedAsset || selectedDate}</span>
        </div>

        <div className="mt-4 h-[520px] rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#334155] dark:bg-[#0B1220] overflow-y-auto custom-scrollbar">
          {parsedSignals.length ? (
            <div className="space-y-2">
              {parsedSignals.map((signal, idx) => {
                const past = signal.isValid && isSignalPast(selectedDate, signal.timeOrRate);
                return (
                  <div
                    key={`${signal.raw}-${idx}`}
                    className={`rounded-xl border px-3 py-2 text-xs font-mono ${
                      !signal.isValid
                        ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300'
                        : past
                          ? 'border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-900/40 dark:bg-pink-950/20 dark:text-pink-200'
                          : 'border-gray-200 bg-white text-gray-800 dark:border-[#334155] dark:bg-[#111827] dark:text-slate-100'
                    }`}
                  >
                    {signal.raw}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-sm font-semibold text-gray-400 dark:text-[#94A3B8] text-center px-6">
              {t.waitingDailyList || 'Aguardando lista diária publicada pelo admin para esta data.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
