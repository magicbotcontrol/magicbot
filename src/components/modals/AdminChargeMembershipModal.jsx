import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_MONTHLY_AMOUNT } from '../../utils/monthlyPricing';

function formatUsd(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(Number(value || 0));
}

export function AdminChargeMembershipModal({
  isOpen,
  user,
  preview,
  isPreviewLoading,
  isSubmitting,
  onClose,
  onConfirm,
  t
}) {
  const [amountInput, setAmountInput] = useState('');
  const [note, setNote] = useState('');

  const suggestedAmount = Number(preview?.suggestedAmount || DEFAULT_MONTHLY_AMOUNT);
  const currentAmount = Number(amountInput || suggestedAmount);
  const hasManualOverride = Math.abs(currentAmount - suggestedAmount) > 0.009;
  const bankrollLabel = preview?.hasDetectedBankroll
    ? formatUsd(preview?.bankrollUsd || 0)
    : t.adminChargeNoBankroll;
  const helperText = useMemo(() => {
    if (preview?.hasDetectedBankroll) {
      return t.adminChargeDetectedBankroll
        .replace('{bankroll}', bankrollLabel)
        .replace('{tier}', preview?.tier?.label || 'US$ 0 a 250');
    }

    return t.adminChargeFallbackHint.replace('{amount}', formatUsd(suggestedAmount));
  }, [bankrollLabel, preview?.hasDetectedBankroll, preview?.tier?.label, suggestedAmount, t.adminChargeDetectedBankroll, t.adminChargeFallbackHint]);

  useEffect(() => {
    if (isOpen) {
      setAmountInput(String(suggestedAmount));
      setNote('');
    }
  }, [isOpen, suggestedAmount, user?.id]);

  if (!isOpen || !user) {
    return null;
  }

  const handleConfirm = async () => {
    await onConfirm({
      amount: Number(amountInput || suggestedAmount),
      note: note.trim()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-[#334155] dark:bg-[#0B1220]">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute right-4 top-4 text-lg font-bold text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:text-gray-200"
        >
          ✕
        </button>

        <div className="space-y-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD7B5] bg-[#FFF7F0] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#B45309] dark:border-[#7C2D12] dark:bg-[#3A1E12] dark:text-[#FDBA74]">
              <span>{t.adminChargeBadge}</span>
            </div>
            <h3 className="mt-3 text-lg font-bold text-gray-900 dark:text-white">{t.adminChargeTitle}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-[#94A3B8]">{t.adminChargeSubtitle}</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#334155] dark:bg-[#111827]">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.email}</p>
            <p className="mt-2 text-base font-bold text-gray-900 dark:text-white">{user.email}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-[#94A3B8]">
              {t.adminWaiverCurrentStatus}: {user.licenseAccessType} / {user.licenseStatus} / {t.adminDaysLeftCompact.replace('{days}', user.remainingDays)}
            </p>
            <p className="mt-2 text-xs text-gray-500 dark:text-[#94A3B8]">
              {preview?.workspaceName
                ? t.adminChargeWorkspaceHint.replace('{workspace}', preview.workspaceName)
                : t.adminChargeWorkspaceMissing}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#334155] dark:bg-[#111827]">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.adminChargeDetectedBankrollLabel}</p>
              <p className="mt-2 text-lg font-black text-gray-900 dark:text-white">{isPreviewLoading ? '...' : bankrollLabel}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#334155] dark:bg-[#111827]">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.adminChargeSuggestedLabel}</p>
              <p className="mt-2 text-lg font-black text-gray-900 dark:text-white">{isPreviewLoading ? '...' : formatUsd(suggestedAmount)}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#334155] dark:bg-[#111827]">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.adminChargeTierLabel}</p>
              <p className="mt-2 text-sm font-bold text-gray-900 dark:text-white">{isPreviewLoading ? '...' : (preview?.tier?.label || 'US$ 0 a 250')}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-xs font-semibold text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/15 dark:text-orange-300">
            {isPreviewLoading ? t.loadingSignals : helperText}
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.adminChargeAmountLabel}</label>
              <button
                type="button"
                onClick={() => setAmountInput(String(suggestedAmount))}
                disabled={isSubmitting || isPreviewLoading}
                className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#B45309] transition-colors hover:text-[#92400E] disabled:cursor-not-allowed disabled:opacity-40 dark:text-[#FDBA74] dark:hover:text-[#FED7AA]"
              >
                {t.adminChargeResetAction}
              </button>
            </div>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
              placeholder={String(DEFAULT_MONTHLY_AMOUNT.toFixed(2))}
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] dark:border-[#334155] dark:bg-[#111827] dark:text-white"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-[#94A3B8]">
              {hasManualOverride
                ? t.adminChargeOverrideHint.replace('{amount}', formatUsd(currentAmount))
                : t.adminChargeDefaultHint.replace('{amount}', formatUsd(suggestedAmount))}
            </p>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{t.adminWaiverNote}</label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              placeholder={t.adminChargeNotePlaceholder}
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] dark:border-[#334155] dark:bg-[#111827] dark:text-white"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#334155] dark:text-[#E2E8F0] dark:hover:bg-[#111827]"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting || isPreviewLoading || !Number.isFinite(currentAmount) || currentAmount <= 0}
              className="rounded-2xl bg-[#FF6B00] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#FF7F1F] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSubmitting ? t.loadingSignals : t.adminChargeConfirm}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
