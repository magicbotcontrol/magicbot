import { normalizeNowpaymentsPayment } from './nowpaymentsPresentation.js';

export const buildNowpaymentsOrderId = (...parts) => {
  const base = parts
    .map((part) => String(part || '').trim().toLowerCase())
    .filter(Boolean)
    .join('-')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${base || 'rm'}-${Date.now()}`;
};

export const buildNowpaymentsSnapshot = (payment) => {
  const current = normalizeNowpaymentsPayment(payment);
  return {
    paymentId: current.paymentId || null,
    invoiceId: current.invoiceId || null,
    orderId: current.orderId || null,
    checkoutUrl: current.checkoutUrl || null,
    qrCodeUrl: current.qrCodeUrl || null,
    payAddress: current.payAddress || null,
    payAmount: current.payAmount ?? null,
    payCurrency: current.payCurrency || null,
    paymentStatus: current.paymentStatus || null,
    warnings: Array.isArray(current.warnings) ? current.warnings : [],
  };
};

export const isNowpaymentsConflictError = (message) =>
  /no unique or exclusion constraint matching the on conflict specification/i.test(String(message || ''));

export const lotSourceMatchesDeposit = (lot, refs = {}, depositTxId = '') => {
  const source = lot?.source || {};
  const sourceDepositTxId = String(source?.depositTxId || '').trim();
  const sourcePaymentId = String(source?.paymentId || '').trim();
  const sourceInvoiceId = String(source?.invoiceId || '').trim();
  const sourceOrderId = String(source?.orderId || '').trim();

  return (
    (depositTxId && sourceDepositTxId === String(depositTxId || '').trim()) ||
    (refs.paymentId && sourcePaymentId === String(refs.paymentId || '').trim()) ||
    (refs.invoiceId && sourceInvoiceId === String(refs.invoiceId || '').trim()) ||
    (refs.orderId && sourceOrderId === String(refs.orderId || '').trim())
  );
};
