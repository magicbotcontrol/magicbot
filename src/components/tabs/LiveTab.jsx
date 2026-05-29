import { useMemo, useState } from 'react';
import { Icons } from '../../constants/icons';
import { ScrollableTableShell } from '../ScrollableTableShell';

export function LiveTab({ liveSignals, t, botStatus, handleStartBot, formatMoney, baseBalance, baseBalanceCurrency }) {
  const [hideCancelled, setHideCancelled] = useState(false);

  const visibleSignals = useMemo(() => {
    if (!hideCancelled) return liveSignals;
    return liveSignals.filter((sig) => !sig.cancelled && sig.status !== 'cancelled');
  }, [hideCancelled, liveSignals]);

  const initialBalance = Number(baseBalance || 0);

  const finishedSignals = useMemo(
    () => visibleSignals.filter((sig) => sig.status === 'ended' && typeof sig.pl === 'number'),
    [visibleSignals]
  );

  const totalPL = useMemo(() => finishedSignals.reduce((acc, s) => acc + (Number(s.pl) || 0), 0), [finishedSignals]);
  const currentBalance = initialBalance + totalPL;
  const wins = finishedSignals.filter((s) => (Number(s.pl) || 0) > 0).length;
  const losses = finishedSignals.filter((s) => (Number(s.pl) || 0) < 0).length;
  const accuracy = wins + losses ? Math.round((wins / (wins + losses)) * 1000) / 10 : 0;
  const formattedTotalPL = totalPL >= 0 ? `+${formatMoney(totalPL, 'USD')}` : formatMoney(totalPL, 'USD');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 dark:text-[#F8FAFC]">{t.operationsTitle}</h2>
            <p className="text-xs text-gray-500 dark:text-[#94A3B8]">{t.operationsSubtitle}</p>
          </div>
          <button
            onClick={handleStartBot}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition-colors ${
              botStatus === 'running'
                ? 'bg-pink-600 hover:bg-pink-700 text-white'
                : 'bg-[#FF6B00] hover:bg-[#FF7F1F] text-white'
            }`}
          >
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/15">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d={botStatus === 'running' ? 'M6 6h12v12H6z' : 'M8 5v14l11-7z'}
                />
              </svg>
            </span>
            {botStatus === 'running' ? t.stopNow : t.startNow}
          </button>
        </div>

        <div className="bg-white dark:bg-[#0B1220] rounded-2xl border border-gray-200 dark:border-[#1F2A3A] shadow-sm dark:shadow-[0_18px_50px_rgba(3,7,18,0.45)] px-4 py-3 flex items-center justify-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${botStatus === 'running' ? 'bg-green-400 animate-pulse' : 'bg-gray-300 dark:bg-[#334155]'}`} />
          <span className="text-[10px] font-extrabold tracking-[0.2em] text-gray-500 dark:text-[#94A3B8]">
            {botStatus === 'running' ? t.magicbotExecuting : t.magicbotPaused}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-[#0B1220] rounded-2xl border border-gray-200 dark:border-[#1F2A3A] shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-[0.18em] text-gray-400 dark:text-[#94A3B8]">{t.initialBalance}</p>
                <p className="text-lg font-extrabold text-gray-900 dark:text-[#F8FAFC]">{formatMoney(initialBalance, baseBalanceCurrency)}</p>
              </div>
              <div className="h-9 w-9 rounded-xl border border-gray-100 dark:border-[#1F2A3A] bg-gray-50 dark:bg-[#111827] flex items-center justify-center text-gray-400 dark:text-[#94A3B8]">
                <Icons.Wallet />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0B1220] rounded-2xl border border-gray-200 dark:border-[#1F2A3A] shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-[0.18em] text-gray-400 dark:text-[#94A3B8]">{t.currentBalance}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-lg font-extrabold text-gray-900 dark:text-[#F8FAFC]">{formatMoney(currentBalance, baseBalanceCurrency)}</p>
                  <span className={`text-[10px] font-bold ${totalPL >= 0 ? 'text-green-600' : 'text-pink-600'}`}>
                    {formattedTotalPL}
                  </span>
                </div>
              </div>
              <div className="h-9 w-9 rounded-xl border border-gray-100 dark:border-[#1F2A3A] bg-gray-50 dark:bg-[#111827] flex items-center justify-center text-gray-400 dark:text-[#94A3B8]">
                <Icons.Activity />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0B1220] rounded-2xl border border-gray-200 dark:border-[#1F2A3A] shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-[0.18em] text-gray-400 dark:text-[#94A3B8]">{t.scoreboard}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-extrabold text-green-600">{wins}</span>
                  <span className="text-lg font-extrabold text-gray-400 dark:text-[#64748B]">x</span>
                  <span className="text-lg font-extrabold text-pink-600">{losses}</span>
                </div>
                <p className="text-[10px] text-gray-400 dark:text-[#94A3B8]">
                  {accuracy}% {t.accuracyLabel}
                </p>
              </div>
              <div className="h-9 w-9 rounded-xl border border-gray-100 dark:border-[#1F2A3A] bg-gray-50 dark:bg-[#111827] flex items-center justify-center text-gray-400 dark:text-[#94A3B8]">
                <Icons.Target />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setHideCancelled((v) => !v)}
            className="flex items-center gap-2 text-xs text-gray-500 dark:text-[#94A3B8]"
            type="button"
          >
            <span
              className={`relative h-5 w-9 rounded-full border transition-colors ${
                hideCancelled ? 'bg-[#FF6B00] border-[#FF6B00]' : 'bg-gray-200 border-gray-200 dark:bg-[#111827] dark:border-[#1F2A3A]'
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  hideCancelled ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </span>
            <span className="font-semibold">{t.hideCancelled}</span>
          </button>
        </div>
      </div>

      <ScrollableTableShell minWidthClass="min-w-[980px]" hintLabel={t.swipeHint || 'Swipe'}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-[#111827] text-gray-400 dark:text-[#94A3B8] text-[10px] uppercase font-bold">
              <th className="px-3 py-4 sm:px-4 whitespace-nowrap">{t.opTime}</th>
              <th className="px-3 py-4 sm:px-4 whitespace-nowrap">{t.asset}</th>
              <th className="px-3 py-4 sm:px-4 whitespace-nowrap">{t.opDirection}</th>
              <th className="px-3 py-4 sm:px-4 whitespace-nowrap">{t.opDuration}</th>
              <th className="px-3 py-4 sm:px-4 whitespace-nowrap">{t.opRecovery}</th>
              <th className="px-3 py-4 sm:px-4 whitespace-nowrap">{t.opEntry}</th>
              <th className="px-3 py-4 sm:px-4 whitespace-nowrap">{t.opOption}</th>
              <th className="px-3 py-4 sm:px-4 whitespace-nowrap">{t.opStatus}</th>
            </tr>
          </thead>
          <tbody className="text-xs divide-y divide-gray-50 dark:divide-[#1F2A3A]">
            {visibleSignals.map((sig, i) => {
              const pl = Number(sig.pl) || 0;
              const ended = sig.status === 'ended';
              const cancelled = sig.status === 'cancelled' || sig.cancelled;
              const isLoss = ended && pl < 0;
              const isWin = ended && pl > 0;

              let statusLabel = '';
              if (cancelled) statusLabel = t.statusCancelled;
              else if (sig.status === 'active') statusLabel = t.statusPosterior;
              else if (sig.status === 'new') statusLabel = t.statusPending;
              else if (ended) statusLabel = `${pl >= 0 ? 'WIN' : 'LOSS'} ${pl >= 0 ? '+' : ''}${formatMoney(pl, 'USD')}`;

              const rowClass = cancelled
                ? 'bg-gray-50/60 dark:bg-[#0B1220]'
                : isLoss
                  ? 'bg-pink-50/60 dark:bg-pink-950/10'
                  : isWin
                    ? 'bg-green-50/60 dark:bg-green-950/10'
                    : '';

              return (
                <tr key={i} className={`transition-colors hover:bg-gray-50/60 dark:hover:bg-[#101826] ${rowClass}`}>
                  <td className="px-3 py-4 sm:px-4 font-mono text-gray-500 dark:text-[#94A3B8] whitespace-nowrap">{sig.time}</td>
                  <td className="px-3 py-4 sm:px-4 font-bold text-gray-800 dark:text-[#F8FAFC] whitespace-nowrap">{sig.asset}</td>
                  <td className="px-3 py-4 sm:px-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 font-bold">
                      <span className={`inline-flex min-w-[58px] justify-center rounded px-2 py-1 ${sig.dir === 'CALL' ? 'text-green-700 bg-green-100 dark:bg-green-950/60 dark:text-green-300' : 'text-pink-700 bg-pink-100 dark:bg-pink-950/50 dark:text-pink-300'}`}>
                        {sig.dir}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-4 sm:px-4 font-mono font-bold text-gray-700 dark:text-[#CBD5E1] whitespace-nowrap">{sig.tf}</td>
                  <td className="px-3 py-4 sm:px-4 text-gray-600 dark:text-[#94A3B8] whitespace-nowrap">{sig.recovery || '-'}</td>
                  <td className="px-3 py-4 sm:px-4 font-mono font-bold text-gray-800 dark:text-[#F8FAFC] whitespace-nowrap">{formatMoney(sig.entry || 0, 'USD')}</td>
                  <td className="px-3 py-4 sm:px-4 font-bold text-gray-600 dark:text-[#94A3B8] whitespace-nowrap">{sig.option || '-'}</td>
                  <td className="px-3 py-4 sm:px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-extrabold ${
                        cancelled
                          ? 'bg-gray-100 text-gray-500 dark:bg-[#111827] dark:text-[#64748B]'
                          : isLoss
                            ? 'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300'
                            : isWin
                              ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-sky-950/40 dark:text-sky-300'
                      }`}
                    >
                      {statusLabel}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ScrollableTableShell>
    </div>
  );
}
