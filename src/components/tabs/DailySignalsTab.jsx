import { useEffect, useMemo, useState } from 'react';
import { getDailySignalFeedByDate } from '../../services/supabaseSignalFeed';
import { parseSignalsText } from '../../utils/signalParser';

export function DailySignalsTab({ t, canViewDailyList, showToast }) {
  const initialDate = new Date().toLocaleDateString('en-CA');
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [signalsText, setSignalsText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!canViewDailyList) {
      setSignalsText('');
      setIsLoading(false);
      return undefined;
    }

    setIsLoading(true);
    getDailySignalFeedByDate(selectedDate)
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
  }, [canViewDailyList, selectedDate, showToast, t.supabaseSyncError]);

  const parsedSignals = useMemo(() => parseSignalsText(signalsText, t), [signalsText, t]);
  const validCount = parsedSignals.filter((signal) => signal.isValid).length;
  const totalCount = parsedSignals.length;

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
    link.download = `magicbot_daily_signals_${selectedDate}.txt`;
    link.click();
    showToast(t.exportedTxt);
  };

  if (!canViewDailyList) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm font-semibold text-gray-600 dark:border-[#334155] dark:bg-[#0B1220] dark:text-[#CBD5E1]">
        {t.dailySignalsBlocked || 'Conteúdo disponível apenas para assinantes de Sinais Diários Premium.'}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 animate-fade-in">
      <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1E293B] lg:col-span-1">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-gray-900 dark:text-white">{t.dailySignalsTitle || 'Sinais Diários Premium'}</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {isLoading ? t.loadingSignals : `${validCount} ${t.valid.toLowerCase()} • ${totalCount} ${t.total.toLowerCase()}`}
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="rounded-2xl bg-[#FF6B00] px-4 py-2 text-xs font-black text-white transition-colors hover:bg-[#FF7F1F]"
          >
            {t.export}
          </button>
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
      </div>

      <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1E293B] lg:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Lista do dia</h3>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{selectedDate}</span>
        </div>

        <div className="mt-4 h-[520px] rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#334155] dark:bg-[#0B1220]">
          <textarea
            value={signalsText}
            readOnly
            className="h-full w-full resize-none bg-transparent font-mono text-xs text-gray-800 outline-none dark:text-slate-100 custom-scrollbar"
            placeholder={t.waitingDailyList || 'Aguardando lista diária publicada pelo admin para esta data.'}
          />
        </div>
      </div>
    </div>
  );
}
