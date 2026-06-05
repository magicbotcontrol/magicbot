import { getWithdrawFeeUsd } from '../payments/walletEngine.js';

export const safeNum = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

export const isSettledTransactionStatus = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return ['concluído', 'concluido', 'confirmado', 'creditado'].includes(normalized);
};

export const getTransactionMeta = (tx) => (tx?.meta && typeof tx.meta === 'object' ? tx.meta : {});

export const getTransactionNestedMeta = (tx) => {
  const meta = getTransactionMeta(tx);
  return meta?.meta && typeof meta.meta === 'object' ? meta.meta : {};
};

export const normalizeTransactionRow = (row) => {
  const meta = getTransactionMeta(row);
  return {
    id: String(row?.external_id || meta?.id || row?.id || ''),
    at: String(meta?.at || row?.at || row?.created_at || new Date().toISOString()),
    kind: String(meta?.kind || row?.kind || ''),
    type: String(meta?.type || row?.type || ''),
    amount: safeNum(meta?.amount ?? row?.amount_usd ?? 0),
    payment: meta?.payment || row?.payment || null,
    status: meta?.status || row?.status || null,
    meta,
  };
};

export const mapAdminTransactionRow = (row) => {
  const tx = normalizeTransactionRow(row);
  return {
    ...tx,
    userEmail: String(row?.email || '').toLowerCase(),
    username: String(row?.username || row?.email || '—'),
    profileId: row?.profile_id || null,
    blocked: Boolean(row?.blocked),
    createdAt: row?.created_at || null,
    userWallets: row?.user_wallets || null,
  };
};

export const buildUpdatedTransactionMeta = (tx, patch = {}, nestedPatch = {}) => {
  const currentMeta = getTransactionMeta(tx);
  const currentNestedMeta = getTransactionNestedMeta(tx);
  return {
    ...currentMeta,
    ...patch,
    meta: {
      ...currentNestedMeta,
      ...nestedPatch,
    },
  };
};

export const getWithdrawTransactionSummary = (row) => {
  const tx = mapAdminTransactionRow(row);
  const meta = getTransactionMeta(tx);
  const nestedMeta = getTransactionNestedMeta(tx);
  const amount = Math.abs(safeNum(tx.amount));
  const refDate = tx.at ? new Date(tx.at) : new Date();
  const fallbackFeeUsd = getWithdrawFeeUsd({ now: refDate });
  const feeUsd = safeNum(nestedMeta?.feeUsd ?? meta?.feeUsd ?? fallbackFeeUsd);
  const netUsd = safeNum(nestedMeta?.netUsd ?? meta?.netUsd ?? Math.max(0, amount - feeUsd));

  let address = String(nestedMeta?.address || meta?.address || '').trim();
  
  if (!address && tx.userWallets) {
    const paymentLower = String(tx.payment || '').toLowerCase();
    if (paymentLower.includes('bep20')) address = String(tx.userWallets.usdt_bep20 || '').trim();
    else if (paymentLower.includes('trc20')) address = String(tx.userWallets.usdt_trc20 || '').trim();
    else if (paymentLower.includes('arbitrum')) address = String(tx.userWallets.usdc_arbitrum || '').trim();
  }

  return {
    ...tx,
    amount,
    feeUsd,
    netUsd,
    address,
    hash: String(meta?.hash || nestedMeta?.hash || '').trim(),
  };
};
