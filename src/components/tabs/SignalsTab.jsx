import { useMemo, useState } from 'react';
import { Icons } from '../../constants/icons';

function formatWhen(value) {
  if (!value) return '--';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function statusLabel(status) {
  return status === 'closed' ? 'Encerrado' : 'Aberto';
}

function resultLabel(result) {
  if (result === 'win') return 'Positivo';
  if (result === 'loss') return 'Negativo';
  if (result === 'void') return 'Anulado';
  return 'Em aberto';
}

export function SignalsTab({
  signals,
  signalPlans,
  formatMoney,
  isMembershipActive,
  onBuyPlan
}) {
  const [statusFilter, setStatusFilter] = useState('all');
  const visibleSignals = useMemo(() => {
    if (statusFilter === 'all') return signals || [];
    return (signals || []).filter((item) => item.status === statusFilter);
  }, [signals, statusFilter]);
  const openCount = (signals || []).filter((item) => item.status === 'open').length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
      <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#FF6B00]">Area de sinais</p>
        <h2 className="mt-2 text-2xl font-black text-gray-900 dark:text-white">Sinais independentes da mensalidade</h2>
        <p className="mt-2 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
          A compra de sinais nao substitui a mensalidade do BOT. Os planos e valores sao definidos pela operacao e podem ser avulsos ou recorrentes.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold">
          <span className="rounded-full bg-orange-50 px-3 py-1 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300">{openCount} abertos</span>
          <span className={`rounded-full px-3 py-1 ${isMembershipActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
            Mensalidade BOT {isMembershipActive ? 'ativa' : 'independente deste produto'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {(signalPlans || []).filter((plan) => plan.active).map((plan) => (
          <div key={plan.code} className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gray-400">{plan.billing === 'subscription' ? 'Assinatura' : 'Compra avulsa'}</p>
            <h3 className="mt-2 text-xl font-black text-gray-900 dark:text-white">{plan.name}</h3>
            <p className="mt-4 text-3xl font-black text-orange-500">{plan.amountUsd > 0 ? formatMoney(plan.amountUsd, 'USD') : 'Valor a definir'}</p>
            <button
              type="button"
              onClick={() => onBuyPlan(plan)}
              className="mt-6 rounded-2xl bg-[#FF6B00] px-5 py-3 text-sm font-bold text-white"
            >
              Contratar este plano
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-black text-gray-900 dark:text-white">Historico</h3>
          <div className="flex gap-2">
            {[
              ['all', 'Todos'],
              ['open', 'Abertos'],
              ['closed', 'Encerrados']
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={`rounded-xl px-3 py-2 text-xs font-bold ${statusFilter === value ? 'bg-[#FF6B00] text-white' : 'bg-gray-100 text-gray-600 dark:bg-[#0B1220] dark:text-gray-300'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {visibleSignals.length ? visibleSignals.map((signal) => (
            <div key={signal.id} className="grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 px-4 py-4 text-sm dark:border-[#334155] md:grid-cols-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">Ativo</p>
                <p className="mt-1 font-black text-gray-900 dark:text-white">{signal.asset}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">Operacao</p>
                <p className="mt-1 text-gray-700 dark:text-gray-300">{signal.operation || '--'}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">Status</p>
                <p className="mt-1 font-bold text-gray-900 dark:text-white">{statusLabel(signal.status)}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">Resultado</p>
                <p className="mt-1 font-bold text-gray-900 dark:text-white">{resultLabel(signal.result)}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">Data</p>
                <p className="mt-1 text-gray-700 dark:text-gray-300">{formatWhen(signal.openedAt)}</p>
              </div>
            </div>
          )) : (
            <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500 dark:border-[#334155]">
              <Icons.Signals />
              <p className="mt-2">Nenhum sinal publicado nesta filtro.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
