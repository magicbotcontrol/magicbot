import { useEffect, useMemo, useState } from 'react';
import { fetchNowpaymentStatus } from '../payments/nowpaymentsClient';
import { getStatusLabel, getT } from '../i18n/i18n.js';
import NowpaymentsPaymentModal from '../payments/NowpaymentsPaymentModal.jsx';
import {
  getPersistedNowpaymentsStatus,
  getTransactionStatusLabel,
  translateNowpaymentsOperationalMessage,
  translateNowpaymentsReason,
  translateNowpaymentsStatus,
} from '../payments/nowpaymentsPresentation.js';
import { WITHDRAW_FEE_USD } from '../payments/walletEngine';
import { buildUpdatedTransactionMeta, getWithdrawTransactionSummary, mapAdminTransactionRow, safeNum } from '../finance/transactionMeta.js';
import { adminGetUserState, adminListTransactions, adminPostAdjustment, adminSetBlocked, adminSettleNowpaymentsPayment, adminUpsertUserState } from '../supabase/adminRepo.js';

const round2 = (n) => Number(Number(n || 0).toFixed(2));

const formatMoney = (v) => `$${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDateTime = (iso) => {
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return String(iso || '');
  }
};

const isSettledTransactionStatus = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return ['concluído', 'concluido', 'confirmado', 'creditado'].includes(normalized);
};

const lotSourceMatchesPayment = (lot, paymentId = '', depositTxId = '') => {
  const source = lot?.source || {};
  const sourcePaymentId = String(source?.paymentId || '').trim();
  const sourceDepositTxId = String(source?.depositTxId || '').trim();
  return (
    (paymentId && sourcePaymentId === String(paymentId || '').trim()) ||
    (depositTxId && sourceDepositTxId === String(depositTxId || '').trim())
  );
};

const copyToClipboard = async (text) => {
  try {
    const value = String(text || '').trim();
    if (!value) return false;
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {}

  try {
    const value = String(text || '').trim();
    if (!value) return false;
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
};

export default function AdminWalletView() {
  const t = getT('pt');
  const [tab, setTab] = useState('deposit');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [hashByTx, setHashByTx] = useState({});
  const [paymentIdByTx, setPaymentIdByTx] = useState({});
  const [depositRows, setDepositRows] = useState([]);
  const [withdrawRows, setWithdrawRows] = useState([]);
  const [teRows, setTeRows] = useState([]);
  const [residualRows, setResidualRows] = useState([]);
  const [dailyRows, setDailyRows] = useState([]);
  const [adjustUserId, setAdjustUserId] = useState('');
  const [adjustKind, setAdjustKind] = useState('TE');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState('');
  const [nowpaymentsModalOpen, setNowpaymentsModalOpen] = useState(false);
  const [nowpaymentsModalPayment, setNowpaymentsModalPayment] = useState(null);
  const [detailsBusyByTx, setDetailsBusyByTx] = useState({});
  const [withdrawBusyByTx, setWithdrawBusyByTx] = useState({});
  const [copyFeedbackByKey, setCopyFeedbackByKey] = useState({});

  const setCopyFeedback = (key, label) => {
    setCopyFeedbackByKey((s) => ({ ...s, [key]: label }));
    window.setTimeout(() => {
      setCopyFeedbackByKey((s) => {
        if (s[key] !== label) return s;
        const next = { ...s };
        delete next[key];
        return next;
      });
    }, 1600);
  };

  const handleCopy = async (key, text) => {
    const value = String(text || '').trim();
    if (!value) {
      setCopyFeedback(key, 'Vazio!');
      return;
    }
    const ok = await copyToClipboard(value);
    setCopyFeedback(key, ok ? 'Copiado!' : 'Falhou');
  };

  const withWithdrawBusy = async (txId, action) => {
    try {
      setWithdrawBusyByTx((s) => ({ ...s, [txId]: true }));
      await action();
    } finally {
      setWithdrawBusyByTx((s) => ({ ...s, [txId]: false }));
    }
  };

  const loadRows = async () => {
    const q = String(query || '').trim();
    const [dep, wd, te, residual, daily] = await Promise.all([
      adminListTransactions({ kind: 'DEPOSITO', q, maxRows: 300 }),
      adminListTransactions({ kind: 'SAQUE', q, maxRows: 300 }),
      adminListTransactions({ kind: 'TE', q, maxRows: 300 }),
      adminListTransactions({ kind: 'RESIDUAL', q, maxRows: 300 }),
      adminListTransactions({ kind: 'DAILY', q, maxRows: 300 }),
    ]);
    setDepositRows(dep.ok ? dep.rows : []);
    setWithdrawRows(wd.ok ? wd.rows : []);
    setTeRows(te.ok ? te.rows : []);
    setResidualRows(residual.ok ? residual.rows : []);
    setDailyRows(daily.ok ? daily.rows : []);
  };

  useEffect(() => {
    loadRows();
  }, [refresh, query]);

  const deposits = useMemo(() => {
    return depositRows
      .map((r) => {
        const tx = mapAdminTransactionRow(r);
        return {
          ...tx,
          paymentId: tx?.meta?.paymentId || '',
        };
      })
      .sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
  }, [depositRows]);

  const withdrawals = useMemo(() => {
    return withdrawRows.map(getWithdrawTransactionSummary).sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
  }, [withdrawRows]);

  const mapCommRow = (r) => mapAdminTransactionRow(r);

  const teList = useMemo(() => teRows.map(mapCommRow).sort((a, b) => String(b.at || '').localeCompare(String(a.at || ''))), [teRows]);
  const residualList = useMemo(
    () => residualRows.map(mapCommRow).sort((a, b) => String(b.at || '').localeCompare(String(a.at || ''))),
    [residualRows]
  );
  const dailyList = useMemo(() => dailyRows.map(mapCommRow).sort((a, b) => String(b.at || '').localeCompare(String(a.at || ''))), [dailyRows]);

  const submitAdjustment = async () => {
    try {
      if (busy) return;
      setBusy(true);
      const userId = String(adjustUserId || '').trim();
      if (!userId) {
        alert('Informe o profileId (uuid).');
        return;
      }
      const amountUsd = Number(adjustAmount || 0);
      if (!Number.isFinite(amountUsd) || amountUsd === 0) {
        alert('Informe um valor diferente de zero.');
        return;
      }
      const res = await adminPostAdjustment({
        userId,
        kind: String(adjustKind || 'AJUSTE').toUpperCase(),
        amountUsd,
        type: String(adjustType || '').trim() || 'Ajuste (Admin)',
        meta: { reason: 'manual' },
      });
      if (!res.ok) {
        alert(res.error);
        return;
      }
      setAdjustAmount('');
      setAdjustType('');
      setRefresh((s) => s + 1);
      await loadRows();
      alert('Ajuste registrado.');
    } finally {
      setBusy(false);
    }
  };

  const verifyDeposit = async (item) => {
    try {
      if (busy) return;
      if (isSettledTransactionStatus(item?.status)) {
        alert('Este depósito já está concluído.');
        return;
      }
      setBusy(true);
      const paymentId = String(paymentIdByTx[item.id] ?? item.paymentId ?? '').trim();
      if (!paymentId) {
        alert('Informe o paymentId.');
        return;
      }
      const stateRes = await adminGetUserState({ userId: item.profileId, maxTransactions: 800 });
      if (!stateRes.ok || !stateRes.user) {
        alert('Usuário não encontrado.');
        return;
      }
      const u = stateRes.user;
      const existingLots = Array.isArray(u?.quotaLots) ? u.quotaLots : [];
      const alreadyApplied = existingLots.some((lot) => lotSourceMatchesPayment(lot, paymentId, item.id));
      if (alreadyApplied) {
        setRefresh((s) => s + 1);
        await loadRows();
        alert('Este depósito já está concluído.');
        return;
      }
      const txs = Array.isArray(u?.transactions) ? u.transactions : [];
      const nextTxs = txs.map((t) =>
        String(t?.id || '') === String(item.id) ? { ...t, meta: { ...(t?.meta || {}), paymentId } } : t
      );
      const withPid = { ...u, transactions: nextTxs };

      const nowRes = await fetchNowpaymentStatus({ paymentId });
      if (!nowRes.ok) {
        alert(`NOWPayments: ${translateNowpaymentsReason(nowRes.reason, t)}`);
        return;
      }
      const savePidRes = await adminUpsertUserState({ userId: item.profileId, user: withPid });
      if (!savePidRes.ok) {
        alert(savePidRes.error);
        return;
      }

      const settled = await adminSettleNowpaymentsPayment({
        paymentId,
        paymentStatus: nowRes.status,
        rawEvent: nowRes.data || {},
      });
      if (!settled.ok || !settled.data?.ok) {
        alert(translateNowpaymentsOperationalMessage(settled.error || settled.data?.reason || 'Falha ao processar depósito.', t));
        return;
      }
      setRefresh((s) => s + 1);
      await loadRows();
      alert(`Depósito verificado (${translateNowpaymentsStatus(nowRes.status, t)}).`);
    } finally {
      setBusy(false);
    }
  };

  const openDepositDetails = async (item) => {
    const snapshot = item?.meta?.meta?.nowpaymentsSnapshot || item?.meta?.nowpaymentsSnapshot || null;
    if (snapshot) {
      setNowpaymentsModalPayment(snapshot);
      setNowpaymentsModalOpen(true);
      return;
    }

    const paymentId = String(paymentIdByTx[item.id] ?? item.paymentId ?? '').trim();
    if (!paymentId) {
      alert('paymentId ausente.');
      return;
    }

    try {
      setDetailsBusyByTx((s) => ({ ...s, [item.id]: true }));
      const nowRes = await fetchNowpaymentStatus({ paymentId });
      if (!nowRes.ok) {
        alert(`NOWPayments: ${translateNowpaymentsReason(nowRes.reason, t)}`);
        return;
      }
      setNowpaymentsModalPayment(nowRes.data || { paymentId, paymentStatus: nowRes.status });
      setNowpaymentsModalOpen(true);
    } finally {
      setDetailsBusyByTx((s) => ({ ...s, [item.id]: false }));
    }
  };

  const approveWithdraw = async (item) => {
    await withWithdrawBusy(item.id, async () => {
      const stateRes = await adminGetUserState({ userId: item.profileId, maxTransactions: 800 });
      if (!stateRes.ok || !stateRes.user) {
        alert('Usuário não encontrado.');
        return;
      }
      const u = stateRes.user;
      const txs = Array.isArray(u?.transactions) ? u.transactions : [];
      const nextTxs = txs.map((t) =>
        String(t?.id || '') === String(item.id)
          ? {
              ...t,
              status: 'Aprovado',
              meta: buildUpdatedTransactionMeta(t, { status: 'Aprovado' }),
            }
          : t
      );
      const saveRes = await adminUpsertUserState({ userId: item.profileId, user: { ...u, transactions: nextTxs } });
      if (!saveRes.ok) {
        alert(saveRes.error);
        return;
      }
      setRefresh((s) => s + 1);
      await loadRows();
      alert('Saque aprovado.');
    });
  };

  const refuseWithdraw = async (item) => {
    await withWithdrawBusy(item.id, async () => {
      const stateRes = await adminGetUserState({ userId: item.profileId, maxTransactions: 800 });
      if (!stateRes.ok || !stateRes.user) {
        alert('Usuário não encontrado.');
        return;
      }
      const u = stateRes.user;
      const txs = Array.isArray(u?.transactions) ? u.transactions : [];
      const tx = txs.find((t) => String(t?.id || '') === String(item.id));
      if (!tx) {
        alert('Saque não encontrado.');
        return;
      }
      const amount = Math.abs(safeNum(tx?.amount || 0));
      const balances = { ...(u?.balances || {}) };
      balances.available = round2(safeNum(balances.available || 0) + amount);
      const nextTxs = txs.map((t) =>
        String(t?.id || '') === String(item.id)
          ? {
              ...t,
              status: 'Recusado',
              meta: buildUpdatedTransactionMeta(t, { status: 'Recusado' }),
            }
          : t
      );
      const updated = { ...u, balances, transactions: nextTxs };
      const saveRes = await adminUpsertUserState({ userId: item.profileId, user: updated });
      if (!saveRes.ok) {
        alert(saveRes.error);
        return;
      }
      setRefresh((s) => s + 1);
      await loadRows();
      alert('Saque recusado e valor devolvido ao saldo disponível.');
    });
  };

  const blockUser = async (item) => {
    await withWithdrawBusy(item.id, async () => {
      const res = await adminSetBlocked({ userId: item.profileId, blocked: true });
      if (!res.ok) {
        alert(res.error);
        return;
      }
      setRefresh((s) => s + 1);
      await loadRows();
      alert('Usuário bloqueado.');
    });
  };

  const confirmPaid = async (item) => {
    await withWithdrawBusy(item.id, async () => {
      const hash = String(hashByTx[item.id] ?? item.hash ?? '').trim();
      if (!hash) {
        alert('Informe a hash do envio.');
        return;
      }
      const stateRes = await adminGetUserState({ userId: item.profileId, maxTransactions: 800 });
      if (!stateRes.ok || !stateRes.user) {
        alert('Usuário não encontrado.');
        return;
      }
      const u = stateRes.user;
      const txs = Array.isArray(u?.transactions) ? u.transactions : [];
      const paidAt = new Date().toISOString();
      const nextTxs = txs.map((t) =>
        String(t?.id || '') === String(item.id)
          ? {
              ...t,
              status: 'Pago',
              meta: buildUpdatedTransactionMeta(
                t,
                { status: 'Pago', hash, paidAt },
                { hash, paidAt }
              ),
            }
          : t
      );
      const saveRes = await adminUpsertUserState({ userId: item.profileId, user: { ...u, transactions: nextTxs } });
      if (!saveRes.ok) {
        alert(saveRes.error);
        return;
      }
      setRefresh((s) => s + 1);
      await loadRows();
      setHashByTx((s) => ({ ...s, [item.id]: '' }));
      alert('Pagamento confirmado e hash registrada.');
    });
  };

  return (
    <div className="space-y-6">
      <NowpaymentsPaymentModal
        isOpen={nowpaymentsModalOpen}
        payment={nowpaymentsModalPayment}
        onClose={() => {
          setNowpaymentsModalOpen(false);
          setNowpaymentsModalPayment(null);
        }}
        t={t}
      />
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-gray-900">Carteira</h3>
            <p className="text-sm text-gray-500 mt-1">Depósitos (NOWPayments) e Saques (manual com hash).</p>
          </div>
          <div className="w-full lg:w-[420px]">
            <label className="text-xs font-black text-gray-600">Buscar usuário</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="login, e-mail, userId..."
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#00FF00]"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab('deposit')}
            className={`px-4 py-2 rounded-xl text-sm font-black border ${tab === 'deposit' ? 'bg-[#00FF00] text-black border-[#00FF00]' : 'bg-white text-gray-800 border-gray-200 hover:border-[#00FF00]'}`}
          >
            Depósito
          </button>
          <button
            type="button"
            onClick={() => setTab('withdraw')}
            className={`px-4 py-2 rounded-xl text-sm font-black border ${tab === 'withdraw' ? 'bg-[#00FF00] text-black border-[#00FF00]' : 'bg-white text-gray-800 border-gray-200 hover:border-[#00FF00]'}`}
          >
            Saque
          </button>
          <button
            type="button"
            onClick={() => setTab('commissions')}
            className={`px-4 py-2 rounded-xl text-sm font-black border ${tab === 'commissions' ? 'bg-[#00FF00] text-black border-[#00FF00]' : 'bg-white text-gray-800 border-gray-200 hover:border-[#00FF00]'}`}
          >
            TE / Residual
          </button>
          <button
            type="button"
            onClick={() => setTab('daily')}
            className={`px-4 py-2 rounded-xl text-sm font-black border ${tab === 'daily' ? 'bg-[#00FF00] text-black border-[#00FF00]' : 'bg-white text-gray-800 border-gray-200 hover:border-[#00FF00]'}`}
          >
            Diário
          </button>
        </div>
      </div>

      {tab === 'deposit' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <p className="text-sm font-black text-gray-900">Depósitos</p>
            <p className="text-xs text-gray-500 mt-1">Use “Verificar” para forçar consulta na NOWPayments.</p>
          </div>
          <div className="p-5 space-y-3">
            {deposits.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum depósito encontrado.</p>
            ) : (
              deposits.slice(0, 50).map((d) => {
                const persistedNowpaymentsStatus = getPersistedNowpaymentsStatus(d);
                const displayStatus = getTransactionStatusLabel(d, t, getStatusLabel);
                const snapshot = d?.meta?.meta?.nowpaymentsSnapshot || d?.meta?.nowpaymentsSnapshot || null;
                const payAddress = String(snapshot?.payAddress || snapshot?.pay_address || '').trim();
                const resolvedPaymentId = String(paymentIdByTx[d.id] ?? d.paymentId ?? snapshot?.paymentId ?? snapshot?.payment_id ?? '').trim();
                const isDetailsBusy = Boolean(detailsBusyByTx[d.id]);
                return (
                <div key={d.id} className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
                  <div className="flex flex-col min-[540px]:flex-row min-[540px]:items-start min-[540px]:justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-gray-900 truncate">{d.type}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        @{d.username} • {d.userEmail} • {formatDateTime(d.at)}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Valor: <span className="font-black text-gray-800">{formatMoney(d.amount)}</span>
                      </p>
                      {persistedNowpaymentsStatus ? (
                        <p className="mt-1 text-xs text-gray-500">
                          {t.nowpaymentsStatusFieldLabel}: <span className="font-black text-gray-800">{translateNowpaymentsStatus(persistedNowpaymentsStatus, t)}</span>
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-black text-gray-700 whitespace-nowrap">
                      {displayStatus || '—'}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 lg:grid-cols-12 gap-3">
                    <div className="lg:col-span-8 space-y-3">
                      <div>
                        <label className="block text-xs font-black text-gray-600">paymentId</label>
                        <input
                          value={resolvedPaymentId}
                          onChange={(e) => setPaymentIdByTx((s) => ({ ...s, [d.id]: e.target.value }))}
                          placeholder="Cole o paymentId da NOWPayments"
                          className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#00FF00]"
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(resolvedPaymentId)}
                            className="px-3 py-1 rounded-full text-xs font-black border border-gray-200 bg-white text-gray-800"
                          >
                            Copiar paymentId
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-black text-gray-600">Endereço pay-in</label>
                        <input
                          value={payAddress}
                          readOnly
                          placeholder="— (sem endereço salvo; use Verificar)"
                          className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 bg-white text-gray-900 outline-none"
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={!payAddress}
                            onClick={() => copyToClipboard(payAddress)}
                            className={`px-3 py-1 rounded-full text-xs font-black border ${payAddress ? 'border-gray-200 bg-white text-gray-800' : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                          >
                            Copiar pay-in
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="lg:col-span-4 flex items-end gap-2">
                      <button
                        type="button"
                        disabled={busy || isSettledTransactionStatus(d?.status)}
                        onClick={() => verifyDeposit(d)}
                        className={`w-full px-4 py-3 rounded-xl font-black ${busy || isSettledTransactionStatus(d?.status) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#00FF00] text-black hover:bg-green-400'}`}
                      >
                        Verificar
                      </button>
                      <button
                        type="button"
                        disabled={isDetailsBusy}
                        onClick={() => openDepositDetails(d)}
                        className={`w-full px-4 py-3 rounded-xl font-black border ${isDetailsBusy ? 'bg-gray-200 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-800 border-gray-200 hover:border-[#00FF00]'}`}
                      >
                        Detalhes
                      </button>
                    </div>
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {tab === 'withdraw' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <p className="text-sm font-black text-gray-900">Saques</p>
            <p className="text-xs text-gray-500 mt-1">Taxa padrão: ${WITHDRAW_FEE_USD}. Quarta-feira: $0. Aprovação manual com hash.</p>
          </div>
          <div className="p-5 space-y-3">
            {withdrawals.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum saque encontrado.</p>
            ) : (
              withdrawals.slice(0, 50).map((w) => {
                const copyAddressLabel = copyFeedbackByKey[`address:${w.id}`] || 'Copiar carteira';
                const copyAmountLabel = copyFeedbackByKey[`amount:${w.id}`] || 'Copiar valor';
                const isBusy = Boolean(withdrawBusyByTx[w.id]);
                return (
                  <div key={w.id} className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
                    <div className="flex flex-col min-[540px]:flex-row min-[540px]:items-start min-[540px]:justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-gray-900 truncate">{w.type}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          @{w.username} • {w.userEmail} • {formatDateTime(w.at)}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">Pagamento: <span className="font-black text-gray-800">{w.payment || '—'}</span></p>
                        <p className="mt-1 text-xs text-gray-500">
                          Valor: <span className="font-black text-gray-800">{formatMoney(w.amount)}</span> • Taxa: {formatMoney(w.feeUsd)} • Enviar:{' '}
                          <span className="font-black text-gray-900">{formatMoney(w.netUsd)}</span>
                        </p>
                        {w.feeUsd === 0 ? (
                          <p className="mt-1 text-xs font-black text-emerald-700">Quarta-feira sem taxa neste saque.</p>
                        ) : null}
                        <div className="mt-3">
                          <label className="block text-xs font-black text-gray-600">Carteira do usuário</label>
                          <input
                            value={w.address}
                            readOnly
                            placeholder="Carteira não encontrada no saque."
                            className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 bg-white text-gray-900 outline-none"
                          />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void handleCopy(`address:${w.id}`, w.address, 'Carteira não encontrada neste saque.')}
                            className={`px-3 py-1 rounded-full text-xs font-black border ${copyAddressLabel === 'Copiado!' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-800'}`}
                          >
                            {copyAddressLabel}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleCopy(`amount:${w.id}`, String(w.netUsd), 'Valor líquido não encontrado.')}
                            className={`px-3 py-1 rounded-full text-xs font-black border ${copyAmountLabel === 'Copiado!' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-800'}`}
                          >
                            {copyAmountLabel}
                          </button>
                          {w.blocked && (
                            <span className="px-3 py-1 rounded-full text-xs font-black border border-red-200 bg-red-50 text-red-700">
                              Usuário bloqueado
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-black whitespace-nowrap ${String(w.status || '').trim().toLowerCase() === 'aprovado' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-700'}`}>
                        {w.status || '—'}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-3">
                      <div className="lg:col-span-7">
                        <label className="block text-xs font-black text-gray-600">Hash do envio (após pagar)</label>
                        <input
                          value={String(hashByTx[w.id] ?? w.hash ?? '')}
                          onChange={(e) => setHashByTx((s) => ({ ...s, [w.id]: e.target.value }))}
                          placeholder="Cole a hash da transação"
                          className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#00FF00]"
                        />
                      </div>
                      <div className="lg:col-span-5 flex items-end gap-2">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void approveWithdraw(w)}
                          className={`w-full px-4 py-3 rounded-xl font-black border ${isBusy ? 'bg-gray-200 border-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white border-gray-200 text-gray-800 hover:border-[#00FF00]'}`}
                        >
                          {isBusy ? 'Processando...' : 'Aprovar'}
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void refuseWithdraw(w)}
                          className={`w-full px-4 py-3 rounded-xl font-black border ${isBusy ? 'bg-gray-200 border-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white border-gray-200 text-gray-800 hover:border-red-400'}`}
                        >
                          {isBusy ? 'Processando...' : 'Recusar'}
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void blockUser(w)}
                          className={`w-full px-4 py-3 rounded-xl font-black ${isBusy ? 'bg-red-200 text-white cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}
                        >
                          {isBusy ? 'Processando...' : 'Bloquear'}
                        </button>
                      </div>
                    </div>

                    <div className="mt-3">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void confirmPaid(w)}
                        className={`w-full px-4 py-3 rounded-xl font-black ${isBusy ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#8A2BE2] text-white hover:bg-purple-600'}`}
                      >
                        {isBusy ? 'Processando...' : 'Confirmar pago (registrar hash)'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {tab === 'commissions' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <p className="text-sm font-black text-gray-900">TE e Residual</p>
            <p className="text-xs text-gray-500 mt-1">Listagem e ajuste manual (crédito/débito) por usuário.</p>
          </div>
          <div className="p-5 space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
              <p className="text-sm font-black text-gray-900">Ajuste rápido</p>
              <div className="mt-3 grid grid-cols-1 lg:grid-cols-12 gap-3">
                <div className="lg:col-span-5">
                  <label className="block text-xs font-black text-gray-600">profileId (uuid)</label>
                  <input
                    value={adjustUserId}
                    onChange={(e) => setAdjustUserId(e.target.value)}
                    placeholder="Cole o uuid do usuário"
                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#00FF00]"
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-xs font-black text-gray-600">Tipo</label>
                  <select
                    value={adjustKind}
                    onChange={(e) => setAdjustKind(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#00FF00]"
                  >
                    <option value="TE">TE</option>
                    <option value="RESIDUAL">RESIDUAL</option>
                    <option value="AJUSTE">AJUSTE</option>
                  </select>
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-xs font-black text-gray-600">Valor (USD)</label>
                  <input
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    placeholder="ex.: 12.50"
                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#00FF00]"
                  />
                </div>
                <div className="lg:col-span-3">
                  <label className="block text-xs font-black text-gray-600">Descrição</label>
                  <input
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value)}
                    placeholder="Motivo do ajuste"
                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#00FF00]"
                  />
                </div>
              </div>
              <div className="mt-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={submitAdjustment}
                  className={`w-full px-4 py-3 rounded-xl font-black ${busy ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#8A2BE2] text-white hover:bg-purple-600'}`}
                >
                  Registrar ajuste
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
                <p className="text-sm font-black text-gray-900">TE</p>
                <div className="mt-3 space-y-2">
                  {teList.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhum TE encontrado.</p>
                  ) : (
                    teList.slice(0, 30).map((x) => (
                      <div key={x.id} className="rounded-2xl border border-gray-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-black text-gray-900 truncate">{x.type || 'TE'}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              @{x.username} • {x.userEmail} • {formatDateTime(x.at)}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              Valor: <span className="font-black text-gray-800">{formatMoney(x.amount)}</span>
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAdjustUserId(String(x.profileId || ''))}
                            className="shrink-0 px-3 py-1 rounded-full text-xs font-black border border-gray-200 bg-white text-gray-800"
                          >
                            Ajustar usuário
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
                <p className="text-sm font-black text-gray-900">Residual</p>
                <div className="mt-3 space-y-2">
                  {residualList.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhum residual encontrado.</p>
                  ) : (
                    residualList.slice(0, 30).map((x) => (
                      <div key={x.id} className="rounded-2xl border border-gray-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-black text-gray-900 truncate">{x.type || 'RESIDUAL'}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              @{x.username} • {x.userEmail} • {formatDateTime(x.at)}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              Valor: <span className="font-black text-gray-800">{formatMoney(x.amount)}</span>
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAdjustUserId(String(x.profileId || ''))}
                            className="shrink-0 px-3 py-1 rounded-full text-xs font-black border border-gray-200 bg-white text-gray-800"
                          >
                            Ajustar usuário
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'daily' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <p className="text-sm font-black text-gray-900">Ganhos diários</p>
            <p className="text-xs text-gray-500 mt-1">Créditos diários gerados pela rotina server-side.</p>
          </div>
          <div className="p-5 space-y-3">
            {dailyList.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum ganho diário encontrado.</p>
            ) : (
              dailyList.slice(0, 50).map((x) => (
                <div key={x.id} className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
                  <div className="flex flex-col min-[540px]:flex-row min-[540px]:items-start min-[540px]:justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-gray-900 truncate">{x.type}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        @{x.username} • {x.userEmail} • {formatDateTime(x.at)}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Valor: <span className="font-black text-gray-800">{formatMoney(x.amount)}</span>
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {x.meta?.bankName || 'Banca legada'} • {String(x.meta?.quotaKey || '—').toUpperCase()} • taxa aplicada{' '}
                        <span className="font-black text-gray-800">
                          {Number(x.meta?.effectiveDailyPct || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 4 })}%
                        </span>
                        {x.meta?.overrideApplied ? ' • exceção do dia' : ' • taxa fixa'}
                      </p>
                      {x.meta?.overrideId && (
                        <p className="mt-1 text-xs text-emerald-700">
                          Override {String(x.meta.overrideId)} • base {Number(x.meta?.baseDailyPct || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 4 })}%
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-black text-gray-700 whitespace-nowrap">
                      {x.status || '—'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
