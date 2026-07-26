import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';

const CURRENCY_LABELS = {
  usdttrc20: 'USDT TRC20',
  usdtbsc: 'USDT BEP20',
  usdcbsc: 'USDC BEP20'
};

function formatCurrencyLabel(currency) {
  const normalized = String(currency || '').trim().toLowerCase();
  return CURRENCY_LABELS[normalized] || String(currency || '').toUpperCase();
}

function getStatusMeta(paymentOrder) {
  const status = String(paymentOrder?.paymentStatus || 'pending').toLowerCase();

  if (paymentOrder?.activationStatus === 'fulfilled') {
    return {
      label: 'Pago e liberado',
      className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
    };
  }

  if (status === 'finished') {
    return {
      label: 'Pago, finalizando liberacao',
      className: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300'
    };
  }

  if (status === 'waiting' || status === 'pending') {
    return {
      label: 'Aguardando pagamento',
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
    };
  }

  if (status === 'confirming' || status === 'confirmed' || status === 'sending' || status === 'partially_paid') {
    return {
      label: 'Pagamento em processamento',
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
    };
  }

  if (status === 'failed' || status === 'expired' || status === 'refunded') {
    return {
      label: 'Pagamento nao concluido',
      className: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
    };
  }

  return {
    label: 'Aguardando geracao',
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
  };
}

function CopyButton({ value, label }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-600 transition-colors hover:bg-gray-100 dark:border-[#334155] dark:text-[#CBD5E1] dark:hover:bg-[#0F172A]"
    >
      {copied ? 'Copiado' : label}
    </button>
  );
}

export function NowPaymentsModal({
  isOpen,
  offer,
  paymentOrder,
  currencies,
  selectedCurrency,
  setSelectedCurrency,
  onCreatePayment,
  onRefreshStatus,
  onClose,
  isCreating,
  isRefreshing,
  errorMessage,
  formatMoney
}) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const qrValue = useMemo(() => paymentOrder?.paymentUri || paymentOrder?.paymentAddress || '', [paymentOrder]);

  useEffect(() => {
    let cancelled = false;

    if (!isOpen || !qrValue) {
      setQrDataUrl('');
      return undefined;
    }

    QRCode.toDataURL(qrValue, {
      margin: 1,
      width: 240,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF'
      }
    })
      .then((nextUrl) => {
        if (!cancelled) setQrDataUrl(nextUrl);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('');
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, qrValue]);

  if (!isOpen || !offer) {
    return null;
  }

  const statusMeta = getStatusMeta(paymentOrder);
  const hasGeneratedPayment = Boolean(paymentOrder?.providerPaymentId);
  const isPaid = paymentOrder?.activationStatus === 'fulfilled';
  const canRefresh = hasGeneratedPayment && !isPaid;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl dark:bg-[#1E293B]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#FF6B00]">NowPayments</p>
            <h3 className="mt-2 text-xl font-black text-gray-900 dark:text-white">{offer.title || 'Pagamento em cripto'}</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Gere a cobranca, copie o endereco ou escaneie o QR Code para concluir o pagamento.
            </p>
          </div>
          <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] ${statusMeta.className}`}>
            {statusMeta.label}
          </span>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#334155] dark:bg-[#0B1220]">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gray-400">Valor em USD</p>
            <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{formatMoney(Number(offer.amount || 0), 'USD')}</p>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{offer.description || 'Pagamento da Loja de Planos.'}</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#334155] dark:bg-[#0B1220]">
            <label className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gray-400">Cripto para pagar</label>
            <select
              value={selectedCurrency}
              onChange={(event) => setSelectedCurrency(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition-colors focus:border-[#FF6B00] dark:border-[#334155] dark:bg-[#111827] dark:text-white"
            >
              {currencies.map((currency) => (
                <option key={currency} value={currency}>
                  {formatCurrencyLabel(currency)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onCreatePayment}
              disabled={isCreating || !selectedCurrency}
              className="mt-4 w-full rounded-2xl bg-[#FF6B00] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#FF7F1F] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreating ? 'Gerando cobranca...' : hasGeneratedPayment ? 'Gerar nova cobranca' : 'Gerar cobranca'}
            </button>
          </div>
        </div>

        {errorMessage ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/15 dark:text-rose-300">
            {errorMessage}
          </div>
        ) : null}

        {hasGeneratedPayment ? (
          <div className="mt-5 rounded-[24px] border border-gray-200 bg-gray-50 p-5 dark:border-[#334155] dark:bg-[#0B1220]">
            <div className="grid gap-5 md:grid-cols-[220px,1fr]">
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-4 dark:border-[#334155] dark:bg-[#111827]">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code do pagamento" className="mx-auto h-[220px] w-[220px] rounded-xl bg-white p-2" />
                ) : (
                  <div className="flex h-[220px] items-center justify-center rounded-xl bg-gray-100 text-xs font-semibold text-gray-400 dark:bg-[#0F172A]">
                    QR indisponivel
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gray-400">Valor cripto</p>
                  <p className="mt-1 text-xl font-black text-gray-900 dark:text-white">
                    {paymentOrder.paymentAmount ? `${paymentOrder.paymentAmount} ${formatCurrencyLabel(paymentOrder.paymentCurrency)}` : '-'}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gray-400">Endereco</p>
                  <p className="mt-1 break-all rounded-2xl border border-gray-200 bg-white px-3 py-3 text-xs font-semibold text-gray-700 dark:border-[#334155] dark:bg-[#111827] dark:text-[#E2E8F0]">
                    {paymentOrder.paymentAddress || '-'}
                  </p>
                </div>

                {paymentOrder.paymentExtraId ? (
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gray-400">Memo / Tag</p>
                    <p className="mt-1 break-all rounded-2xl border border-gray-200 bg-white px-3 py-3 text-xs font-semibold text-gray-700 dark:border-[#334155] dark:bg-[#111827] dark:text-[#E2E8F0]">
                      {paymentOrder.paymentExtraId}
                    </p>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <CopyButton value={paymentOrder.paymentAddress} label="Copiar endereco" />
                  {paymentOrder.paymentExtraId ? <CopyButton value={paymentOrder.paymentExtraId} label="Copiar memo" /> : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 md:flex-row">
          <button
            type="button"
            onClick={onRefreshStatus}
            disabled={!canRefresh || isRefreshing}
            className="w-full rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-900/40 dark:bg-emerald-950/15 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
          >
            {isRefreshing ? 'Verificando...' : 'Ja paguei, verificar agora'}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-100 dark:border-[#334155] dark:text-[#CBD5E1] dark:hover:bg-[#0F172A]"
          >
            Fechar
          </button>
        </div>

        {paymentOrder?.activationStatus === 'failed' && paymentOrder.activationError ? (
          <p className="mt-4 text-xs font-semibold text-rose-600 dark:text-rose-300">
            Pagamento identificado, mas houve falha na liberacao automatica: {paymentOrder.activationError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
