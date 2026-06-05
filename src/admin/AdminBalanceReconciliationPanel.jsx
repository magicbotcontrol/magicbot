import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import InlineFeedbackCard from '../components/ui/InlineFeedbackCard.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { adminBalanceReconciliationMonitor } from '../supabase/adminRepo.js';

const MIN_DIFF_USD = 0.1;
const MAX_ROWS = 200;

const formatMoney = (value) =>
  `$${Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDateTime = (iso) => {
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return String(iso || '');
  }
};

const getSeverityBadge = (severity) => {
  const key = String(severity || '').toUpperCase();
  if (key === 'CRITICO') return { variant: 'danger', label: 'Crítico' };
  if (key === 'ALTO') return { variant: 'warning', label: 'Alto' };
  if (key === 'MODERADO') return { variant: 'neutral', label: 'Moderado' };
  return { variant: 'success', label: 'Ok' };
};

const getReconciliationErrorMessage = (error) => {
  const raw = String(error || '').trim();
  if (raw === 'not_admin') {
    return 'Acesso restrito a administradores. Entre novamente com uma conta admin para auditar a reconciliação.';
  }
  return raw || 'Não foi possível auditar os saldos agora.';
};

function ReconciliationStatCard({ label, value, helper }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-gray-900">{value}</p>
      {helper ? <p className="mt-1 text-xs text-gray-500">{helper}</p> : null}
    </div>
  );
}

export default function AdminBalanceReconciliationPanel({ refreshNonce = 0 }) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [snapshot, setSnapshot] = useState(null);

  const loadSnapshot = async () => {
    try {
      setBusy(true);
      const res = await adminBalanceReconciliationMonitor({ minDiffUsd: MIN_DIFF_USD, maxRows: MAX_ROWS });
      if (!res.ok) {
        setFeedback({
          variant: 'danger',
          title: 'Falha ao carregar a reconciliação',
          message: getReconciliationErrorMessage(res.error),
        });
        return;
      }

      setSnapshot(res.data || null);
      setFeedback(null);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void loadSnapshot();
  }, [refreshNonce]);

  const items = Array.isArray(snapshot?.items) ? snapshot.items : [];

  const stats = useMemo(() => {
    const checkedUsers = Number(snapshot?.checkedUsers || 0);
    const divergentUsers = Number(snapshot?.divergentUsers || 0);
    const largestDiffUsd = Number(snapshot?.largestDiffUsd || 0);
    const missingUsd = Number(snapshot?.missingUsd || 0);
    const excessUsd = Number(snapshot?.excessUsd || 0);

    return [
      {
        label: 'Usuários auditados',
        value: String(checkedUsers),
        helper: 'Perfis com saldo atual ou ledger diferente de zero.',
      },
      {
        label: 'Divergentes',
        value: String(divergentUsers),
        helper: `Alerta acima de ${formatMoney(snapshot?.minDiffUsd || MIN_DIFF_USD)}.`,
      },
      {
        label: 'Maior diferença',
        value: formatMoney(largestDiffUsd),
        helper: 'Maior desvio absoluto encontrado na varredura.',
      },
      {
        label: 'Saldo faltante',
        value: formatMoney(missingUsd),
        helper: `Excesso registrado: ${formatMoney(excessUsd)}.`,
      },
    ];
  }, [snapshot]);

  const summaryCard =
    Number(snapshot?.divergentUsers || 0) > 0
      ? {
          variant: 'warning',
          title: 'Divergências detectadas',
          message: `Foram encontrados ${Number(snapshot?.divergentUsers || 0)} usuários com desvio acima de ${formatMoney(snapshot?.minDiffUsd || MIN_DIFF_USD)} entre o ledger e o saldo disponível.`,
        }
      : {
          variant: 'success',
          title: 'Nenhuma divergência relevante',
          message: `A reconciliação não encontrou desvios acima de ${formatMoney(snapshot?.minDiffUsd || MIN_DIFF_USD)} nesta leitura.`,
        };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h4 className="text-base font-black text-gray-800">Reconciliação de saldo disponível</h4>
          <p className="text-sm text-gray-500 mt-1">
            Auditoria preventiva entre o ledger de `transactions` e `balances.available`, sem corrigir dados automaticamente.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadSnapshot()}
          disabled={busy}
          className={`px-4 py-2 rounded-xl font-black inline-flex items-center justify-center gap-2 ${busy ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#111827] text-white hover:bg-black'}`}
        >
          <RefreshCw size={16} className={busy ? 'animate-spin' : ''} />
          {busy ? 'Auditando...' : 'Atualizar auditoria'}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <StatusBadge variant="neutral">Tolerância: {formatMoney(snapshot?.minDiffUsd || MIN_DIFF_USD)}</StatusBadge>
        {snapshot?.generatedAt ? <StatusBadge>Gerado em {formatDateTime(snapshot.generatedAt)}</StatusBadge> : null}
        {snapshot?.hasMore ? <StatusBadge variant="warning">Lista parcial</StatusBadge> : null}
      </div>

      {feedback ? (
        <div className="mt-5">
          <InlineFeedbackCard variant={feedback.variant} title={feedback.title} message={feedback.message} />
        </div>
      ) : null}

      {!feedback ? (
        <div className="mt-5">
          <InlineFeedbackCard variant={summaryCard.variant} title={summaryCard.title} message={summaryCard.message} />
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-1 min-[540px]:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((card) => (
          <ReconciliationStatCard key={card.label} label={card.label} value={card.value} helper={card.helper} />
        ))}
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-[0.18em] text-gray-500">
              <th className="py-3 pr-4">Usuário</th>
              <th className="py-3 pr-4">Saldo atual</th>
              <th className="py-3 pr-4">Ledger</th>
              <th className="py-3 pr-4">Diferença</th>
              <th className="py-3 pr-4">Transações</th>
              <th className="py-3 pr-4">Última mov.</th>
              <th className="py-3">Risco</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-5 text-sm text-gray-500">
                  Nenhum usuário divergente acima do limiar configurado nesta leitura.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const badge = getSeverityBadge(item.severity);
                return (
                  <tr key={item.id} className="border-b border-gray-100 align-top">
                    <td className="py-4 pr-4">
                      <p className="font-black text-gray-900">{item.username || item.email || 'Usuário sem identificação'}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.email || 'Sem e-mail'}</p>
                    </td>
                    <td className="py-4 pr-4 font-bold text-gray-800">{formatMoney(item.current_available)}</td>
                    <td className="py-4 pr-4 font-bold text-gray-800">{formatMoney(item.ledger_available)}</td>
                    <td className="py-4 pr-4 font-black text-red-600">{formatMoney(item.diff_usd)}</td>
                    <td className="py-4 pr-4 text-gray-700">{Number(item.tx_count || 0)}</td>
                    <td className="py-4 pr-4 text-gray-700">{item.last_transaction_at ? formatDateTime(item.last_transaction_at) : '—'}</td>
                    <td className="py-4">
                      <StatusBadge variant={badge.variant}>{badge.label}</StatusBadge>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
