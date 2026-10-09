import { useEffect, useState } from 'react';
import { networkSharePercent } from '../../constants/commercialModel';

const EMPTY_SIGNAL = {
  asset: '',
  operation: '',
  status: 'open',
  result: 'pending',
  openedAt: '',
  priceUsd: 0,
  planCode: '',
  note: ''
};

export function AdminCommercialPanel({
  config,
  signals,
  formatMoney,
  showToast,
  onSaveConfig,
  onPublishSignal,
  onDeleteSignal
}) {
  const [draft, setDraft] = useState(config);

  useEffect(() => {
    setDraft(config);
  }, [config]);
  const [signalDraft, setSignalDraft] = useState(EMPTY_SIGNAL);
  const [isSaving, setIsSaving] = useState(false);
  const share = networkSharePercent(draft);

  const updateLevel = (level, percent) => {
    setDraft((current) => ({
      ...current,
      levels: current.levels.map((item) => (item.level === level ? { ...item, percent: Number(percent) } : item))
    }));
  };

  const updatePlan = (code, patch) => {
    setDraft((current) => ({
      ...current,
      signalPlans: current.signalPlans.map((item) => (item.code === code ? { ...item, ...patch } : item))
    }));
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      await onSaveConfig(draft);
      showToast?.('Regras comerciais salvas.');
    } catch (error) {
      showToast?.(error instanceof Error ? error.message : 'Nao foi possivel salvar as regras.');
    } finally {
      setIsSaving(false);
    }
  };

  const publish = async () => {
    setIsSaving(true);
    try {
      await onPublishSignal({
        ...signalDraft,
        openedAt: signalDraft.openedAt ? new Date(signalDraft.openedAt).toISOString() : new Date().toISOString()
      });
      setSignalDraft(EMPTY_SIGNAL);
      showToast?.('Sinal publicado.');
    } catch (error) {
      showToast?.(error instanceof Error ? error.message : 'Nao foi possivel publicar o sinal.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
        <h3 className="text-lg font-black text-gray-900 dark:text-white">BOT e bonificacao</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Os percentuais ficam nesta configuracao. A soma atual da rede e {share}% da mensalidade.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="text-xs font-bold text-gray-500">
            Mensalidade (USD)
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.monthlyUsd}
              onChange={(event) => setDraft((current) => ({ ...current, monthlyUsd: Number(event.target.value) }))}
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-[#334155] dark:bg-[#0B1220] dark:text-white"
            />
          </label>
          <label className="text-xs font-bold text-gray-500">
            Capital minimo recomendado (USD)
            <input
              type="number"
              min="0"
              step="1"
              value={draft.minCapitalUsd}
              onChange={(event) => setDraft((current) => ({ ...current, minCapitalUsd: Number(event.target.value) }))}
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-[#334155] dark:bg-[#0B1220] dark:text-white"
            />
          </label>
          <label className="text-xs font-bold text-gray-500 md:col-span-1">
            Aviso de risco
            <input
              value={draft.riskDisclaimer}
              onChange={(event) => setDraft((current) => ({ ...current, riskDisclaimer: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-[#334155] dark:bg-[#0B1220] dark:text-white"
            />
          </label>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {draft.levels.map((level) => (
            <label key={level.level} className="text-xs font-bold text-gray-500">
              Nivel {level.level} (%)
              <input
                type="number"
                min="0"
                step="0.1"
                value={level.percent}
                onChange={(event) => updateLevel(level.level, event.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-[#334155] dark:bg-[#0B1220] dark:text-white"
              />
              <span className="mt-1 block font-semibold text-gray-400">
                {formatMoney((Number(draft.monthlyUsd) || 0) * (Number(level.percent) || 0) / 100, 'USD')} por mensalidade
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
        <h3 className="text-lg font-black text-gray-900 dark:text-white">Planos de sinais</h3>
        <div className="mt-4 space-y-3">
          {draft.signalPlans.map((plan) => (
            <div key={plan.code} className="grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 p-4 dark:border-[#334155] md:grid-cols-4">
              <label className="text-xs font-bold text-gray-500">
                Nome
                <input
                  value={plan.name}
                  onChange={(event) => updatePlan(plan.code, { name: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-[#334155] dark:bg-[#0B1220] dark:text-white"
                />
              </label>
              <label className="text-xs font-bold text-gray-500">
                Valor USD
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={plan.amountUsd}
                  onChange={(event) => updatePlan(plan.code, { amountUsd: Number(event.target.value) })}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-[#334155] dark:bg-[#0B1220] dark:text-white"
                />
              </label>
              <label className="text-xs font-bold text-gray-500">
                Cobranca
                <select
                  value={plan.billing}
                  onChange={(event) => updatePlan(plan.code, { billing: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-[#334155] dark:bg-[#0B1220] dark:text-white"
                >
                  <option value="one_time">Avulsa</option>
                  <option value="subscription">Assinatura</option>
                </select>
              </label>
              <label className="flex items-end gap-2 text-xs font-bold text-gray-500">
                <input
                  type="checkbox"
                  checked={plan.active}
                  onChange={(event) => updatePlan(plan.code, { active: event.target.checked })}
                />
                Plano ativo
              </label>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={saveConfig}
          disabled={isSaving}
          className="mt-5 rounded-2xl bg-[#FF6B00] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          Salvar regras
        </button>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
        <h3 className="text-lg font-black text-gray-900 dark:text-white">Publicar sinal</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <input placeholder="Ativo" value={signalDraft.asset} onChange={(event) => setSignalDraft((current) => ({ ...current, asset: event.target.value }))} className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-[#334155] dark:bg-[#0B1220] dark:text-white" />
          <input placeholder="Operacao" value={signalDraft.operation} onChange={(event) => setSignalDraft((current) => ({ ...current, operation: event.target.value }))} className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-[#334155] dark:bg-[#0B1220] dark:text-white" />
          <select value={signalDraft.status} onChange={(event) => setSignalDraft((current) => ({ ...current, status: event.target.value }))} className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-[#334155] dark:bg-[#0B1220] dark:text-white">
            <option value="open">Aberto</option>
            <option value="closed">Encerrado</option>
          </select>
          <select value={signalDraft.result} onChange={(event) => setSignalDraft((current) => ({ ...current, result: event.target.value }))} className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-[#334155] dark:bg-[#0B1220] dark:text-white">
            <option value="pending">Em aberto</option>
            <option value="win">Positivo</option>
            <option value="loss">Negativo</option>
            <option value="void">Anulado</option>
          </select>
          <input type="datetime-local" value={signalDraft.openedAt} onChange={(event) => setSignalDraft((current) => ({ ...current, openedAt: event.target.value }))} className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-[#334155] dark:bg-[#0B1220] dark:text-white" />
          <input placeholder="Observacao" value={signalDraft.note} onChange={(event) => setSignalDraft((current) => ({ ...current, note: event.target.value }))} className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-[#334155] dark:bg-[#0B1220] dark:text-white" />
        </div>
        <button type="button" onClick={publish} disabled={isSaving} className="mt-4 rounded-2xl bg-gray-900 px-5 py-3 text-sm font-bold text-white dark:bg-white dark:text-gray-900">
          Publicar sinal
        </button>
        <div className="mt-5 space-y-2">
          {(signals || []).map((signal) => (
            <div key={signal.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-[#334155]">
              <span className="font-bold text-gray-900 dark:text-white">{signal.asset}</span>
              <span className="text-gray-500">{signal.status === 'closed' ? 'Encerrado' : 'Aberto'} · {signal.result}</span>
              <button type="button" onClick={() => onDeleteSignal(signal.id)} className="text-xs font-bold text-rose-600">Remover</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
