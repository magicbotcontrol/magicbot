import { normalizeTransactionRow } from '../finance/transactionMeta.js';

const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const normalizeText = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const COMPLETED_STATUSES = new Set(['approved', 'completed', 'confirmado', 'concluido', 'paid', 'success']);

const isDepositLike = (tx) => {
  const kind = normalizeText(tx?.kind);
  const type = normalizeText(tx?.type);
  return kind.includes('deposit') || type.includes('deposito');
};

export const isPendingDepositTransaction = (tx) => {
  if (!isDepositLike(tx)) return false;

  const type = normalizeText(tx?.type);
  const status = normalizeText(tx?.status);
  if (type.includes('deposito em processamento')) return true;
  if (!status) return true;
  return !COMPLETED_STATUSES.has(status);
};

const createBucket = () => ({ count: 0, total: 0 });

export const buildReportFinancialSummary = (transactions) => {
  const summary = {
    earnings: createBucket(),
    pendingDeposits: createBucket(),
    debits: createBucket(),
    net: 0,
  };

  for (const tx of Array.isArray(transactions) ? transactions : []) {
    const normalizedTx = normalizeTransactionRow(tx);
    const amount = round2(normalizedTx?.amount || 0);
    if (amount > 0 && isPendingDepositTransaction(normalizedTx)) {
      summary.pendingDeposits.count += 1;
      summary.pendingDeposits.total = round2(summary.pendingDeposits.total + amount);
      continue;
    }

    if (amount > 0) {
      summary.earnings.count += 1;
      summary.earnings.total = round2(summary.earnings.total + amount);
      continue;
    }

    if (amount < 0) {
      summary.debits.count += 1;
      summary.debits.total = round2(summary.debits.total + Math.abs(amount));
    }
  }

  summary.net = round2(summary.earnings.total - summary.debits.total);
  return summary;
};
